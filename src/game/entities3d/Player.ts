import * as THREE from "three";
import type { Input } from "../core/input";
import type { CharacterId } from "../progress/state";
import { makePlayerCharacter } from "../world/meshes";
import {
  type MazeBuild,
  isWaterAt,
  resolveCollision,
} from "../world/MazeBuilder";

type LimbParts = {
  hips: THREE.Group;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  head: THREE.Object3D;
  torso: THREE.Object3D;
  shadow: THREE.Mesh;
  scubaGear?: THREE.Group;
  /** Rest hips.position.y — procedural kit 0.55, hierarchical GLB 0 */
  hipsBaseY?: number;
  glbLimbMode?: boolean;
};

export class Player {
  group: THREE.Group;
  position = new THREE.Vector3();
  velocity = new THREE.Vector3();
  facing = new THREE.Vector3(0, 0, -1);
  hp = 5;
  maxHp = 5;
  inWater = false;
  /** True while plummeting off the world edge */
  falling = false;
  private scuba: boolean;
  private invulnUntil = 0;
  private dodgeUntil = 0;
  private dodgeReadyAt = 0;
  private stunnedUntil = 0;
  private walkSpeed = 6.5;
  private swimSpeed = 4.2;
  private dodgeSpeed = 16;
  private radius = 0.4;
  private animT = 0;
  private time = 0;
  /** 0 = land pose, 1 = full swim lean */
  private swimBlend = 0;
  private wasInWater = false;
  private bubbleAcc = 0;
  private bubbles: { mesh: THREE.Mesh; life: number; vy: number }[] = [];
  private sceneRef: THREE.Object3D | null = null;
  private fallVy = 0;
  private fallSpin = 0;
  /** Brief red flash after damage (vents / animals) for kid-readable feedback */
  private hitFlashUntil = 0;

  constructor(character: CharacterId, scuba: boolean) {
    this.scuba = scuba;
    this.group = makePlayerCharacter(character, scuba);
  }

  /** Call once after adding player to the scene so bubbles can attach. */
  attachToScene(scene: THREE.Object3D): void {
    this.sceneRef = scene;
  }

  spawnAt(x: number, z: number): void {
    this.position.set(x, 0, z);
    this.velocity.set(0, 0, 0);
    this.syncMesh();
  }

  grantInvuln(ms: number): void {
    this.invulnUntil = Math.max(this.invulnUntil, this.time + ms / 1000);
  }

  /**
   * Take damage. Lethal hits (boss monsters) drop HP to 0 in one strike.
   * Vents/animals use amount=1 with generous i-frames for kids.
   */
  hit(
    from: THREE.Vector3,
    opts?: { damage?: number; lethal?: boolean; invuln?: number },
  ): void {
    if (this.time < this.invulnUntil) return;
    if (opts?.lethal) {
      this.hp = 0;
    } else {
      const dmg = opts?.damage ?? 1;
      this.hp = Math.max(0, this.hp - dmg);
    }
    // Generous i-frames so denser patrols don't chain-kill kids mid-dodge
    const iframes = opts?.invuln ?? (opts?.lethal ? 0.5 : 1.4);
    this.invulnUntil = this.time + iframes;
    this.stunnedUntil = this.time + (opts?.lethal ? 0.35 : 0.18);
    // Solid red hit pop (blink alone is easy to miss mid-swim)
    this.hitFlashUntil = this.time + (opts?.lethal ? 0.45 : 0.28);
    const dir = this.position.clone().sub(from).setY(0);
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1);
    // Soft knockback — enough to leave the hit volume, not pin into walls
    dir.normalize().multiplyScalar(opts?.lethal ? 10 : 7.5);
    this.velocity.x = dir.x;
    this.velocity.z = dir.z;
  }

  /** External velocity shove (currents). */
  applyForce(fx: number, fz: number, dt: number): void {
    this.velocity.x += fx * dt;
    this.velocity.z += fz * dt;
  }

  canDodge(): boolean {
    return (
      this.time >= this.dodgeReadyAt &&
      this.time >= this.stunnedUntil &&
      this.time >= this.dodgeUntil
    );
  }

  private tryDodge(input: Input): void {
    if (!input.consumeDodge() || !this.canDodge()) return;
    let fx = this.facing.x;
    let fz = this.facing.z;
    const mv = input.moveVector();
    if (mv.x !== 0 || mv.z !== 0) {
      const len = Math.hypot(mv.x, mv.z) || 1;
      fx = mv.x / len;
      fz = mv.z / len;
      this.facing.set(fx, 0, fz);
    }
    this.dodgeUntil = this.time + 0.24;
    this.dodgeReadyAt = this.time + 0.7;
    // I-frames cover the dash + a hair after so gate/animal timing feels fair
    this.invulnUntil = Math.max(this.invulnUntil, this.time + 0.4);
    this.velocity.x = fx * this.dodgeSpeed;
    this.velocity.z = fz * this.dodgeSpeed;
  }

  /** True if past the playable maze grid (falls off the world). */
  isOutsideWorld(maze: MazeBuild): boolean {
    const margin = 0.35;
    const minX = maze.originX - margin;
    const maxX = maze.originX + maze.cols * maze.cellSize + margin;
    const minZ = maze.originZ - margin;
    const maxZ = maze.originZ + maze.rows * maze.cellSize + margin;
    return (
      this.position.x < minX ||
      this.position.x > maxX ||
      this.position.z < minZ ||
      this.position.z > maxZ
    );
  }

  /**
   * True when inside the map but within `dist` of the fall line
   * (matches the red warning band / stone curb at the world rim).
   */
  isNearWorldEdge(maze: MazeBuild, dist = 2.2): boolean {
    if (this.isOutsideWorld(maze)) return false;
    const minX = maze.originX;
    const maxX = maze.originX + maze.cols * maze.cellSize;
    const minZ = maze.originZ;
    const maxZ = maze.originZ + maze.rows * maze.cellSize;
    const dx = Math.min(this.position.x - minX, maxX - this.position.x);
    const dz = Math.min(this.position.z - minZ, maxZ - this.position.z);
    return dx < dist || dz < dist;
  }

  /** Begin the fall-off-the-world death animation. */
  startFall(): void {
    if (this.falling) return;
    this.falling = true;
    this.fallVy = 0.5;
    this.fallSpin = (Math.random() > 0.5 ? 1 : -1) * 4;
    this.velocity.x *= 0.4;
    this.velocity.z *= 0.4;
  }

  /** Fall finished far below the map. */
  hasFallenAway(): boolean {
    return this.falling && this.group.position.y < -12;
  }

  update(dt: number, input: Input, maze: MazeBuild): void {
    this.time += dt;

    // Falling: ignore input, tumble down
    if (this.falling) {
      this.fallVy -= 18 * dt;
      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;
      this.group.position.x = this.position.x;
      this.group.position.z = this.position.z;
      this.group.position.y += this.fallVy * dt;
      this.group.rotation.x += this.fallSpin * dt;
      this.group.rotation.z += this.fallSpin * 0.6 * dt;
      this.updateBubbles(dt);
      return;
    }

    this.tryDodge(input);

    const dodging = this.time < this.dodgeUntil;
    const stunned = this.time < this.stunnedUntil;

    // Water = actual water tiles only (do NOT force swim just because scuba is unlocked)
    this.inWater = isWaterAt(this.position.x, this.position.z, maze);

    // Splash pulse when entering water
    if (this.inWater && !this.wasInWater) {
      this.animT = 0;
      this.spawnSplash();
    }
    this.wasInWater = this.inWater;

    // Walk on dry land; swim in water. Scuba gear only while swimming underwater with tank.
    this.applyLocomotionVisuals();

    if (!dodging && !stunned) {
      const mv = input.moveVector();
      const speed = this.inWater ? this.swimSpeed : this.walkSpeed;
      if (mv.x !== 0 || mv.z !== 0) {
        const len = Math.hypot(mv.x, mv.z) || 1;
        const nx = mv.x / len;
        const nz = mv.z / len;
        this.facing.set(nx, 0, nz);
        const accel = this.inWater ? 12 : 28;
        this.velocity.x += (nx * speed - this.velocity.x) * Math.min(1, accel * dt);
        this.velocity.z += (nz * speed - this.velocity.z) * Math.min(1, accel * dt);
      } else {
        const decel = this.inWater ? 6 : 18;
        this.velocity.x *= Math.max(0, 1 - decel * dt);
        this.velocity.z *= Math.max(0, 1 - decel * dt);
      }
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // Only collide with walls while still on the playable board
    if (!this.isOutsideWorld(maze)) {
      const resolved = resolveCollision(
        this.position.x,
        this.position.z,
        this.radius,
        maze.blockers,
      );
      this.position.x = resolved.x;
      this.position.z = resolved.z;
    }

    this.animate(dt);
    this.updateBubbles(dt);
    this.syncMesh();
    input.setDodgeReady(this.canDodge());
  }

  /**
   * Land outfit vs wetsuit + scuba tank/mask/flippers.
   * - Dry tiles → walk clothes, no gear
   * - Water without scuba (beach) → freestyle swim clothes
   * - Water with scuba unlocked → wetsuit + tank + flippers
   */
  private applyLocomotionVisuals(): void {
    const ud = this.group.userData as {
      scubaGear?: THREE.Group;
      landMeshes?: THREE.Object3D[];
      suitMeshes?: THREE.Object3D[];
      hasScuba?: boolean;
    };
    const underwaterScuba = this.scuba && this.inWater;
    if (ud.scubaGear) ud.scubaGear.visible = underwaterScuba;

    // Wetsuit when scuba-swimming; land clothes otherwise (including freestyle beach swim)
    if (ud.landMeshes && ud.suitMeshes) {
      for (const m of ud.landMeshes) m.visible = !underwaterScuba;
      for (const m of ud.suitMeshes) m.visible = underwaterScuba;
    }
  }

  private animate(dt: number): void {
    // Legacy billboard mode (should not apply — player is always 3D now)
    if (this.group.userData.imagineMode) {
      this.animateImagineSprite(dt);
      return;
    }

    // Joined GLB body only — hierarchical limb GLBs use walk/swim below
    if (this.group.userData.glbMode && !this.group.userData.glbLimbMode) {
      this.animateGlbBody(dt);
      return;
    }

    const parts = this.group.userData as LimbParts;
    const { hips, head, torso, shadow } = parts;

    const spd = Math.hypot(this.velocity.x, this.velocity.z);
    const moving = spd > 0.35;

    // Blend into swim lean when in water
    const swimTarget = this.inWater ? 1 : 0;
    this.swimBlend += (swimTarget - this.swimBlend) * Math.min(1, 6 * dt);

    if (this.inWater) {
      this.animateSwim(dt, moving, parts);
    } else {
      this.animateWalk(dt, moving, parts);
    }

    // Face movement
    if (this.facing.lengthSq() > 0.01) {
      const target = Math.atan2(this.facing.x, this.facing.z);
      let yaw = this.group.rotation.y;
      let diff = target - yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.group.rotation.y = yaw + diff * Math.min(1, 10 * dt);
    }

    // Body pitch: upright on land, nose-down swim lean in water
    const lean = this.swimBlend * (moving ? 0.55 : 0.28);
    hips.rotation.x = lean;
    // Counter-tilt head slightly so face still reads from high camera
    head.rotation.x = -lean * 0.45;

    // Slight torso scale pulse while stroking
    if (this.inWater && moving) {
      const pulse = 1 + Math.sin(this.animT * 2) * 0.03;
      torso.scale.set(pulse, 1, 1 / pulse);
    } else {
      torso.scale.set(1, 1, 1);
    }

    // Shadow shrinks / softens in water
    shadow.scale.setScalar(THREE.MathUtils.lerp(1, 0.55, this.swimBlend));
    const shadowMat = shadow.material as THREE.MeshBasicMaterial;
    shadowMat.opacity = THREE.MathUtils.lerp(0.28, 0.12, this.swimBlend);

    this.applyHitFlashVisuals(shadow);
  }

  /**
   * Joined GLB body: face travel, walk bob / swim lean, no limb IK.
   * Keeps walk/swim/scuba tile logic on the root (applyLocomotionVisuals).
   */
  private animateGlbBody(dt: number): void {
    const hips = this.group.userData.hips as THREE.Group | undefined;
    const shadow = this.group.userData.shadow as THREE.Mesh | undefined;
    const spd = Math.hypot(this.velocity.x, this.velocity.z);
    const moving = spd > 0.35;

    const swimTarget = this.inWater ? 1 : 0;
    this.swimBlend += (swimTarget - this.swimBlend) * Math.min(1, 6 * dt);

    if (this.facing.lengthSq() > 0.01) {
      const target = Math.atan2(this.facing.x, this.facing.z);
      let yaw = this.group.rotation.y;
      let diff = target - yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.group.rotation.y = yaw + diff * Math.min(1, 10 * dt);
    }

    if (hips) {
      if (this.inWater) {
        this.animT += dt * (moving ? 9 : 3.2);
        const s = Math.sin(this.animT);
        hips.position.y = (moving ? 0.06 : 0.02) + Math.abs(s) * (moving ? 0.05 : 0.03);
        const lean = this.swimBlend * (moving ? 0.45 : 0.22);
        hips.rotation.x = lean;
        if (moving) {
          this.bubbleAcc += dt;
          if (this.bubbleAcc > 0.12) {
            this.bubbleAcc = 0;
            this.spawnBubble();
          }
        } else {
          this.bubbleAcc += dt;
          if (this.bubbleAcc > 0.45) {
            this.bubbleAcc = 0;
            this.spawnBubble();
          }
        }
      } else if (moving) {
        this.animT +=
          dt *
          12 *
          Math.min(
            1.4,
            0.5 + Math.hypot(this.velocity.x, this.velocity.z) / this.walkSpeed,
          );
        const s = Math.sin(this.animT);
        hips.position.y = Math.abs(s) * 0.06;
        hips.rotation.x *= 0.85;
        // Subtle stride sway
        hips.rotation.z = s * 0.04;
      } else {
        hips.position.y = Math.sin(this.time * 2.2) * 0.015;
        hips.rotation.x *= 0.85;
        hips.rotation.z *= 0.85;
      }
    }

    if (shadow) {
      shadow.scale.setScalar(THREE.MathUtils.lerp(1, 0.55, this.swimBlend));
      const shadowMat = shadow.material as THREE.MeshBasicMaterial;
      shadowMat.opacity = THREE.MathUtils.lerp(0.28, 0.12, this.swimBlend);
    }

    this.applyHitFlashVisuals(shadow);
  }

  /** Soft-realism player: face travel dir, bounce while moving, invuln blink. */
  private animateImagineSprite(dt: number): void {
    const shadow = this.group.userData.shadow as THREE.Mesh | undefined;
    const billboard = this.group.userData.billboard as THREE.Mesh | undefined;
    const spd = Math.hypot(this.velocity.x, this.velocity.z);
    const moving = spd > 0.35;

    if (this.facing.lengthSq() > 0.01) {
      const target = Math.atan2(this.facing.x, this.facing.z);
      let yaw = this.group.rotation.y;
      let diff = target - yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.group.rotation.y = yaw + diff * Math.min(1, 10 * dt);
    }

    if (moving) {
      this.animT += dt * 10;
      const bob = 1 + Math.abs(Math.sin(this.animT)) * 0.06;
      if (billboard) {
        billboard.scale.x = bob;
        billboard.scale.y = bob;
      }
    } else if (billboard) {
      const idle = 1 + Math.sin(this.time * 2) * 0.02;
      billboard.scale.x = idle;
      billboard.scale.y = idle;
    }

    // Keep the card flat on the water/sand (top-down).
    if (billboard) {
      billboard.rotation.x = -Math.PI / 2;
      billboard.position.y = 0.14;
    }

    if (shadow) {
      shadow.scale.setScalar(THREE.MathUtils.lerp(1, 0.55, this.swimBlend));
      const shadowMat = shadow.material as THREE.MeshBasicMaterial;
      shadowMat.opacity = THREE.MathUtils.lerp(0.3, 0.12, this.swimBlend);
    }

    this.applyHitFlashVisuals(shadow);
  }

  private applyHitFlashVisuals(shadow?: THREE.Mesh): void {
    const flashing = this.time < this.hitFlashUntil;
    const matVisible =
      this.time < this.invulnUntil ? Math.sin(this.time * 30) > 0 : true;
    this.group.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh || o === shadow) return;
      const mesh = o as THREE.Mesh;
      mesh.visible = matVisible;
      const m = mesh.material as THREE.Material;
      if (!m) return;
      // Toon materials: emissive pulse
      if ((m as THREE.MeshToonMaterial).isMeshToonMaterial) {
        const tm = m as THREE.MeshToonMaterial;
        if (!tm.emissive) return;
        if (tm.userData.baseHitEmissive === undefined) {
          tm.userData.baseHitEmissive = tm.emissive.getHex();
          tm.userData.baseHitEmissiveIntensity = tm.emissiveIntensity ?? 0;
        }
        if (flashing) {
          tm.emissive.setHex(0xff2200);
          tm.emissiveIntensity = 0.85 + Math.sin(this.time * 40) * 0.2;
        } else {
          tm.emissive.setHex(tm.userData.baseHitEmissive as number);
          tm.emissiveIntensity = tm.userData.baseHitEmissiveIntensity as number;
        }
      } else if ((m as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
        // Billboard: tint red on hit without killing alpha cutout
        const bm = m as THREE.MeshBasicMaterial;
        bm.color.setHex(flashing ? 0xff6644 : 0xffffff);
      } else if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
        // GLB PBR materials from Blender
        const sm = m as THREE.MeshStandardMaterial;
        if (sm.userData.baseHitEmissive === undefined) {
          sm.userData.baseHitEmissive = sm.emissive.getHex();
          sm.userData.baseHitEmissiveIntensity = sm.emissiveIntensity ?? 0;
          sm.userData.baseHitColor = sm.color.getHex();
        }
        if (flashing) {
          sm.emissive.setHex(0xff2200);
          sm.emissiveIntensity = 0.75 + Math.sin(this.time * 40) * 0.2;
          sm.color.setHex(0xff8866);
        } else {
          sm.emissive.setHex(sm.userData.baseHitEmissive as number);
          sm.emissiveIntensity = sm.userData.baseHitEmissiveIntensity as number;
          sm.color.setHex(sm.userData.baseHitColor as number);
        }
      }
    });
  }

  /** Rest hips Y: procedural limb kit 0.55, hierarchical / joined GLB 0. */
  private hipsBaseY(parts: LimbParts): number {
    return parts.hipsBaseY ?? 0.55;
  }

  /** Land walk / idle — gentle stride; arms stay near sides (kids found big swings creepy). */
  private animateWalk(dt: number, moving: boolean, parts: LimbParts): void {
    const { legL, legR, armL, armR, hips } = parts;
    const baseY = this.hipsBaseY(parts);

    // Softly settle any swim spreads / windmill axes
    armL.rotation.z *= 0.72;
    armR.rotation.z *= 0.72;
    armL.rotation.y *= 0.72;
    armR.rotation.y *= 0.72;

    if (moving) {
      this.animT +=
        dt *
        9 *
        Math.min(
          1.25,
          0.5 + Math.hypot(this.velocity.x, this.velocity.z) / this.walkSpeed,
        );
      const s = Math.sin(this.animT);
      // Legs do the readable work; arms barely counter-swing
      legL.rotation.x = s * 0.42;
      legR.rotation.x = -s * 0.42;
      armL.rotation.x = -s * 0.12;
      armR.rotation.x = s * 0.12;
      hips.position.y = baseY + Math.abs(s) * 0.035;
    } else {
      legL.rotation.x *= 0.7;
      legR.rotation.x *= 0.7;
      // Arms return to rest at sides quickly
      armL.rotation.x *= 0.65;
      armR.rotation.x *= 0.65;
      hips.position.y = baseY + Math.sin(this.time * 2.2) * 0.015;
    }
  }

  /**
   * Water swim:
   * - Flutter kick on legs (opposite phase, larger; stronger with scuba flippers)
   * - Alternating crawl stroke on arms (forward reach + pull)
   * - Body bob + float idle when still
   */
  private animateSwim(dt: number, moving: boolean, parts: LimbParts): void {
    const { legL, legR, armL, armR, hips } = parts;
    const baseY = this.hipsBaseY(parts);
    // Flippers on → slightly stronger leg kick (scubaGear.visible while scuba && inWater)
    const flipperKick = parts.scubaGear?.visible ? 1.35 : 1;

    if (moving) {
      // Soft paddle + flutter kick (not big freestyle windmills)
      this.animT +=
        dt *
        7 *
        Math.min(
          1.2,
          0.4 + Math.hypot(this.velocity.x, this.velocity.z) / this.swimSpeed,
        );
      const s = Math.sin(this.animT);
      const s2 = Math.sin(this.animT * 2);

      legL.rotation.x = 0.28 + s2 * 0.45 * flipperKick;
      legR.rotation.x = 0.28 - s2 * 0.45 * flipperKick;
      legL.rotation.z = s2 * 0.06 * flipperKick;
      legR.rotation.z = -s2 * 0.06 * flipperKick;

      // Arms mostly forward/out a little — readable swim, not creepy thrash
      armL.rotation.x = 0.05 + s * 0.28;
      armR.rotation.x = 0.05 - s * 0.28;
      armL.rotation.z = 0.28 + s * 0.12;
      armR.rotation.z = -0.28 - s * 0.12;
      armL.rotation.y = s * 0.08;
      armR.rotation.y = -s * 0.08;

      hips.position.y = baseY - 0.1 + Math.abs(s) * 0.04;

      this.bubbleAcc += dt;
      if (this.bubbleAcc > 0.14) {
        this.bubbleAcc = 0;
        this.spawnBubble();
      }
    } else {
      // Float idle — tiny treading, arms relaxed outward
      this.animT += dt * 2.6;
      const s = Math.sin(this.animT);
      const s2 = Math.sin(this.animT * 2.1);

      legL.rotation.x = 0.4 + s2 * 0.15 * flipperKick;
      legR.rotation.x = 0.4 - s2 * 0.15 * flipperKick;
      legL.rotation.z = s * 0.05;
      legR.rotation.z = -s * 0.05;

      armL.rotation.x = 0.08 + s * 0.08;
      armR.rotation.x = 0.08 - s * 0.08;
      armL.rotation.z = 0.32 + s * 0.06;
      armR.rotation.z = -0.32 - s * 0.06;
      armL.rotation.y *= 0.85;
      armR.rotation.y *= 0.85;

      hips.position.y = baseY - 0.12 + Math.sin(this.time * 1.8) * 0.035;

      this.bubbleAcc += dt;
      if (this.bubbleAcc > 0.5) {
        this.bubbleAcc = 0;
        this.spawnBubble();
      }
    }
  }

  private spawnBubble(): void {
    if (!this.sceneRef) return;
    const geo = new THREE.SphereGeometry(0.06 + Math.random() * 0.05, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xc8f0ff,
      transparent: true,
      opacity: 0.65,
    });
    const mesh = new THREE.Mesh(geo, mat);
    // Behind/above shoulders, slight random
    const side = Math.random() > 0.5 ? 0.2 : -0.2;
    mesh.position.set(
      this.position.x + side + (Math.random() - 0.5) * 0.2,
      0.35 + Math.random() * 0.25,
      this.position.z + (Math.random() - 0.5) * 0.2,
    );
    this.sceneRef.add(mesh);
    this.bubbles.push({ mesh, life: 0.7 + Math.random() * 0.4, vy: 0.8 + Math.random() * 0.6 });
  }

  private spawnSplash(): void {
    if (!this.sceneRef) return;
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.SphereGeometry(0.05, 5, 5);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xa8e6ff,
        transparent: true,
        opacity: 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const a = (i / 6) * Math.PI * 2;
      mesh.position.set(
        this.position.x + Math.cos(a) * 0.2,
        0.2,
        this.position.z + Math.sin(a) * 0.2,
      );
      this.sceneRef.add(mesh);
      this.bubbles.push({
        mesh,
        life: 0.45,
        vy: 1.2 + Math.random() * 0.5,
      });
    }
  }

  private updateBubbles(dt: number): void {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.life -= dt;
      b.mesh.position.y += b.vy * dt;
      b.mesh.position.x += Math.sin(this.time * 4 + i) * dt * 0.15;
      const mat = b.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, b.life * 1.2);
      b.mesh.scale.multiplyScalar(1 + dt * 0.8);
      if (b.life <= 0) {
        b.mesh.removeFromParent();
        b.mesh.geometry.dispose();
        mat.dispose();
        this.bubbles.splice(i, 1);
      }
    }
  }

  private syncMesh(): void {
    this.group.position.x = this.position.x;
    this.group.position.z = this.position.z;
    // Sink slightly in water; bob applied via hips
    const baseY = THREE.MathUtils.lerp(0, -0.22, this.swimBlend);
    this.group.position.y = baseY;
  }

  isAlive(): boolean {
    return this.hp > 0;
  }
}
