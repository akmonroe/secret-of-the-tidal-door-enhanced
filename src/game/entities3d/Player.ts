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
  legL: THREE.Group;
  legR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  head: THREE.Mesh;
  torso: THREE.Mesh;
  shadow: THREE.Mesh;
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
   * (matches the red warning band / yellow curb kids should notice).
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

    this.inWater = isWaterAt(this.position.x, this.position.z, maze) || this.scuba;

    // Splash pulse when entering water
    if (this.inWater && !this.wasInWater) {
      this.animT = 0;
      this.spawnSplash();
    }
    this.wasInWater = this.inWater;

    if (!dodging && !stunned) {
      const mv = input.moveVector();
      const speed = this.inWater || this.scuba ? this.swimSpeed : this.walkSpeed;
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

  private animate(dt: number): void {
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

    // Invuln blink + hit red flash (vent burns / animal bumps)
    const flashing = this.time < this.hitFlashUntil;
    const matVisible =
      this.time < this.invulnUntil ? Math.sin(this.time * 30) > 0 : true;
    this.group.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh || o === shadow) return;
      const mesh = o as THREE.Mesh;
      mesh.visible = matVisible;
      const m = mesh.material as THREE.MeshToonMaterial | undefined;
      if (!m || !m.isMeshToonMaterial || !m.emissive) return;
      if (m.userData.baseHitEmissive === undefined) {
        m.userData.baseHitEmissive = m.emissive.getHex();
        m.userData.baseHitEmissiveIntensity = m.emissiveIntensity ?? 0;
      }
      if (flashing) {
        m.emissive.setHex(0xff2200);
        m.emissiveIntensity = 0.85 + Math.sin(this.time * 40) * 0.2;
      } else {
        m.emissive.setHex(m.userData.baseHitEmissive as number);
        m.emissiveIntensity = m.userData.baseHitEmissiveIntensity as number;
      }
    });
  }

  /** Land walk / idle */
  private animateWalk(dt: number, moving: boolean, parts: LimbParts): void {
    const { legL, legR, armL, armR, hips } = parts;

    // Reset swim-only arm spreads
    armL.rotation.z *= 0.85;
    armR.rotation.z *= 0.85;
    armL.rotation.y *= 0.85;
    armR.rotation.y *= 0.85;

    if (moving) {
      this.animT += dt * 12 * Math.min(1.4, 0.5 + Math.hypot(this.velocity.x, this.velocity.z) / this.walkSpeed);
      const s = Math.sin(this.animT);
      legL.rotation.x = s * 0.75;
      legR.rotation.x = -s * 0.75;
      armL.rotation.x = -s * 0.55;
      armR.rotation.x = s * 0.55;
      hips.position.y = 0.55 + Math.abs(s) * 0.05;
    } else {
      legL.rotation.x *= 0.78;
      legR.rotation.x *= 0.78;
      armL.rotation.x *= 0.78;
      armR.rotation.x *= 0.78;
      hips.position.y = 0.55 + Math.sin(this.time * 2.2) * 0.02;
    }
  }

  /**
   * Water swim:
   * - Flutter kick on legs (opposite phase, larger)
   * - Alternating crawl stroke on arms (forward reach + pull)
   * - Body bob + float idle when still
   */
  private animateSwim(dt: number, moving: boolean, parts: LimbParts): void {
    const { legL, legR, armL, armR, hips } = parts;

    if (moving) {
      // Crawl cycle
      this.animT += dt * 9 * Math.min(1.3, 0.4 + Math.hypot(this.velocity.x, this.velocity.z) / this.swimSpeed);
      const s = Math.sin(this.animT);
      const c = Math.cos(this.animT);
      const s2 = Math.sin(this.animT * 2); // double-time kick

      // Flutter kick (fast vertical-ish kick while body is leaned)
      legL.rotation.x = 0.35 + s2 * 0.85;
      legR.rotation.x = 0.35 - s2 * 0.85;
      legL.rotation.z = s2 * 0.12;
      legR.rotation.z = -s2 * 0.12;

      // Freestyle-ish arm stroke: opposite arms
      // phase: reach forward (neg X) → out (Z) → pull back
      armL.rotation.x = -0.2 + s * 1.15;
      armR.rotation.x = -0.2 - s * 1.15;
      armL.rotation.z = 0.55 + c * 0.65; // open out then in
      armR.rotation.z = -0.55 - c * 0.65;
      armL.rotation.y = s * 0.35;
      armR.rotation.y = -s * 0.35;

      // Bob through the stroke
      hips.position.y = 0.42 + Math.abs(s) * 0.06;

      // Bubbles while stroking
      this.bubbleAcc += dt;
      if (this.bubbleAcc > 0.12) {
        this.bubbleAcc = 0;
        this.spawnBubble();
      }
    } else {
      // Float idle — gentle scull + treading water
      this.animT += dt * 3.2;
      const s = Math.sin(this.animT);
      const s2 = Math.sin(this.animT * 2.1);

      legL.rotation.x = 0.5 + s2 * 0.25;
      legR.rotation.x = 0.5 - s2 * 0.25;
      legL.rotation.z = s * 0.08;
      legR.rotation.z = -s * 0.08;

      armL.rotation.x = 0.15 + s * 0.2;
      armR.rotation.x = 0.15 - s * 0.2;
      armL.rotation.z = 0.75 + s * 0.15;
      armR.rotation.z = -0.75 - s * 0.15;
      armL.rotation.y *= 0.9;
      armR.rotation.y *= 0.9;

      hips.position.y = 0.4 + Math.sin(this.time * 1.8) * 0.05;

      this.bubbleAcc += dt;
      if (this.bubbleAcc > 0.45) {
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
