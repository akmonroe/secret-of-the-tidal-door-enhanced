import * as THREE from "three";
import type { Blocker } from "../world/collision";

export type MovingObstacleDef = {
  /** Grid cell for the center of the travel segment */
  c: number;
  r: number;
  axis: "x" | "z";
  /** Half-travel distance in world units (full span = 2 * travel) */
  travel: number;
  /** Units per second along the axis */
  speed: number;
  /** Starting phase 0..1 along the path */
  phase?: number;
  width?: number;
  depth?: number;
  height?: number;
  /** Visual color */
  color?: number;
};

/** Hazard yellow — reads from high Switch-style camera */
const STRIPE_YELLOW = 0xffd166;
const STRIPE_DARK = 0x1e1b18;
const STRIPE_BRIGHT = 0xffe08a;

/**
 * Sliding gate / log that blocks the player and animals.
 * Moves back and forth at constant speed (timing challenge).
 *
 * Visual: toy hazard block with bold top chevrons, side bands, end bumpers,
 * floor path trail, and a light bob so kids can read the rhythm.
 * Collision half-extents match width/depth (decorative extras don't expand hitbox).
 */
export class MovingObstacle {
  /** Root group (scene-addable; name kept as mesh for LevelRuntime) */
  mesh: THREE.Group;
  private ox: number;
  private oz: number;
  private axis: "x" | "z";
  private travel: number;
  private speed: number;
  /** Position along axis relative to origin, -travel..travel */
  private pos = 0;
  private dir = 1;
  private halfW: number;
  private halfD: number;
  private height: number;
  private t = 0;
  private bodyRoot: THREE.Group;
  private stripeMats: THREE.MeshToonMaterial[] = [];
  private trailMat: THREE.MeshBasicMaterial | null = null;
  private baseY: number;

  constructor(worldX: number, worldZ: number, def: MovingObstacleDef) {
    this.ox = worldX;
    this.oz = worldZ;
    this.axis = def.axis;
    this.travel = Math.max(1, def.travel);
    this.speed = Math.max(0.5, def.speed);
    this.halfW = (def.width ?? 1.6) / 2;
    this.halfD = (def.depth ?? 1.6) / 2;
    this.height = def.height ?? 1.5;
    this.baseY = this.height / 2;

    const phase = ((def.phase ?? 0) % 1 + 1) % 1;
    // Map phase 0..1 onto the ping-pong path so spaced phases create clear staggered gaps
    this.pos = (phase * 2 - 1) * this.travel;
    this.dir = phase > 0.5 ? -1 : 1;

    const bodyColor = def.color ?? 0x5a5248;
    const w = this.halfW * 2;
    const d = this.halfD * 2;
    const h = this.height;

    this.mesh = new THREE.Group();
    this.bodyRoot = new THREE.Group();
    this.mesh.add(this.bodyRoot);

    // --- Main body (collision silhouette) ---
    const bodyMat = new THREE.MeshToonMaterial({ color: bodyColor });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    this.bodyRoot.add(body);

    // Slightly darker inset face for depth (high-cam readability)
    const inset = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.92, h * 0.55, d * 0.92),
      new THREE.MeshToonMaterial({ color: darken(bodyColor, 0.78) }),
    );
    inset.position.y = h * 0.05;
    this.bodyRoot.add(inset);

    // --- End bumpers (reads as a sliding bar, not a wall tile) ---
    const bumperMat = new THREE.MeshToonMaterial({ color: darken(bodyColor, 0.55) });
    if (w >= d) {
      const bw = Math.min(0.18, w * 0.12);
      for (const sx of [-1, 1] as const) {
        const bumper = new THREE.Mesh(
          new THREE.BoxGeometry(bw, h * 1.08, d * 1.06),
          bumperMat,
        );
        bumper.position.set(sx * (w / 2 - bw / 2), 0, 0);
        bumper.castShadow = true;
        this.bodyRoot.add(bumper);
      }
    } else {
      const bd = Math.min(0.18, d * 0.12);
      for (const sz of [-1, 1] as const) {
        const bumper = new THREE.Mesh(
          new THREE.BoxGeometry(w * 1.06, h * 1.08, bd),
          bumperMat,
        );
        bumper.position.set(0, 0, sz * (d / 2 - bd / 2));
        bumper.castShadow = true;
        this.bodyRoot.add(bumper);
      }
    }

    this.addHazardBand(w, d, h);
    this.addTopChevrons(w, d, h);

    // Corner pips for silhouette pop against walls
    const pipMat = new THREE.MeshToonMaterial({ color: STRIPE_YELLOW });
    const pipGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    for (const sx of [-1, 1] as const) {
      for (const sz of [-1, 1] as const) {
        const pip = new THREE.Mesh(pipGeo, pipMat);
        pip.position.set(sx * (w / 2 - 0.08), h / 2 + 0.02, sz * (d / 2 - 0.08));
        this.bodyRoot.add(pip);
      }
    }

    // Soft ground blob so the gate doesn't blend into floor
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(Math.max(w, d) * 0.55, 14),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = -h / 2 + 0.04;
    this.bodyRoot.add(blob);

    this.addPathTrail(w, d);
    this.syncMesh();
  }

  private addHazardBand(w: number, d: number, h: number): void {
    const bandH = Math.min(0.28, h * 0.22);
    const segments = 4;
    if (w >= d) {
      const segW = (w * 0.94) / segments;
      for (let i = 0; i < segments; i++) {
        const yellow = i % 2 === 0;
        const mat = new THREE.MeshToonMaterial({
          color: yellow ? STRIPE_YELLOW : STRIPE_DARK,
          emissive: yellow ? STRIPE_YELLOW : 0x000000,
          emissiveIntensity: yellow ? 0.18 : 0,
        });
        if (yellow) this.stripeMats.push(mat);
        for (const face of [-1, 1] as const) {
          const strip = new THREE.Mesh(
            new THREE.BoxGeometry(segW * 0.92, bandH, 0.06),
            mat,
          );
          strip.position.set(
            -w * 0.47 + segW * (i + 0.5),
            0,
            face * (d / 2 + 0.02),
          );
          this.bodyRoot.add(strip);
        }
      }
    } else {
      const segD = (d * 0.94) / segments;
      for (let i = 0; i < segments; i++) {
        const yellow = i % 2 === 0;
        const mat = new THREE.MeshToonMaterial({
          color: yellow ? STRIPE_YELLOW : STRIPE_DARK,
          emissive: yellow ? STRIPE_YELLOW : 0x000000,
          emissiveIntensity: yellow ? 0.18 : 0,
        });
        if (yellow) this.stripeMats.push(mat);
        for (const face of [-1, 1] as const) {
          const strip = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, bandH, segD * 0.92),
            mat,
          );
          strip.position.set(
            face * (w / 2 + 0.02),
            0,
            -d * 0.47 + segD * (i + 0.5),
          );
          this.bodyRoot.add(strip);
        }
      }
    }
  }

  private addTopChevrons(w: number, d: number, h: number): void {
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.94, 0.07, d * 0.94),
      new THREE.MeshToonMaterial({ color: STRIPE_DARK }),
    );
    plate.position.y = h / 2 + 0.04;
    this.bodyRoot.add(plate);

    // Chevron bars on top — primary high-angle read for timing
    const n = 5;
    const alongX = w >= d;
    for (let i = 0; i < n; i++) {
      const yellow = i % 2 === 0;
      const mat = new THREE.MeshToonMaterial({
        color: yellow ? STRIPE_BRIGHT : STRIPE_YELLOW,
        emissive: yellow ? STRIPE_YELLOW : 0x000000,
        emissiveIntensity: yellow ? 0.28 : 0.08,
      });
      this.stripeMats.push(mat);
      if (alongX) {
        const segW = (w * 0.88) / n;
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(segW * 0.88, 0.05, d * 0.72),
          mat,
        );
        bar.position.set(-w * 0.44 + segW * (i + 0.5), h / 2 + 0.09, 0);
        this.bodyRoot.add(bar);
      } else {
        const segD = (d * 0.88) / n;
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.72, 0.05, segD * 0.88),
          mat,
        );
        bar.position.set(0, h / 2 + 0.09, -d * 0.44 + segD * (i + 0.5));
        this.bodyRoot.add(bar);
      }
    }
  }

  private addPathTrail(w: number, d: number): void {
    // Subtle lane on the floor so kids see where the gate will go
    const span = this.travel * 2 + (this.axis === "x" ? w : d);
    const thick = (this.axis === "x" ? d : w) * 0.55;
    this.trailMat = new THREE.MeshBasicMaterial({
      color: STRIPE_YELLOW,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    });
    const trail = new THREE.Mesh(
      this.axis === "x"
        ? new THREE.PlaneGeometry(span, thick)
        : new THREE.PlaneGeometry(thick, span),
      this.trailMat,
    );
    trail.rotation.x = -Math.PI / 2;
    trail.name = "pathTrail";
    this.mesh.add(trail);
  }

  update(dt: number): void {
    this.t += dt;
    // Clamp dt so a long frame can't tunnel the gate through the player without a step
    const step = Math.min(dt, 0.05);
    this.pos += this.dir * this.speed * step;
    if (this.pos >= this.travel) {
      this.pos = this.travel;
      this.dir = -1;
    } else if (this.pos <= -this.travel) {
      this.pos = -this.travel;
      this.dir = 1;
    }
    this.syncMesh();

    // Near either end of travel = max open gap on the opposite side → "go now" cue
    const endNear = 1 - Math.min(1, Math.abs(Math.abs(this.pos) - this.travel) / Math.max(0.5, this.travel * 0.35));
    const goWindow = endNear * endNear;

    // Rhythm feedback: soft bob + stripe glow pulse (mobile-cheap)
    const bob = Math.sin(this.t * 6 + this.pos * 0.4) * 0.04;
    this.bodyRoot.position.y = bob;
    const pulse = 0.16 + 0.12 * (0.5 + 0.5 * Math.sin(this.t * 5)) + goWindow * 0.35;
    for (const m of this.stripeMats) {
      m.emissiveIntensity = pulse;
    }
    if (this.trailMat) {
      this.trailMat.opacity = 0.12 + goWindow * 0.28;
    }
  }

  private syncMesh(): void {
    const x = this.axis === "x" ? this.ox + this.pos : this.ox;
    const z = this.axis === "z" ? this.oz + this.pos : this.oz;
    this.mesh.position.set(x, this.baseY, z);

    // Keep path trail fixed on the travel corridor (counter-move body offset)
    const trail = this.mesh.getObjectByName("pathTrail");
    if (trail) {
      if (this.axis === "x") {
        trail.position.set(-this.pos, -this.baseY + 0.06, 0);
      } else {
        trail.position.set(0, -this.baseY + 0.06, -this.pos);
      }
    }
  }

  getBlocker(): Blocker {
    const x = this.mesh.position.x;
    const z = this.mesh.position.z;
    // Match body half-extents exactly — no padded unfair hitbox
    return {
      minX: x - this.halfW,
      maxX: x + this.halfW,
      minZ: z - this.halfD,
      maxZ: z + this.halfD,
    };
  }
}

function darken(hex: number, factor: number): number {
  const r = Math.floor(((hex >> 16) & 0xff) * factor);
  const g = Math.floor(((hex >> 8) & 0xff) * factor);
  const b = Math.floor((hex & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}
