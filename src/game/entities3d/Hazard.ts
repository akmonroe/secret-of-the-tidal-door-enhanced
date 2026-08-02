import * as THREE from "three";
import {
  makeAngler,
  makeGull,
  makeJelly,
  makeMarlin,
  makePelican,
  makeRay,
  makeSeaLion,
  makeShark,
} from "../world/meshes";
import {
  type Blocker,
  circleHitsAny,
  resolveCircle,
} from "../world/collision";

export type HazardKind =
  | "shark"
  | "jelly"
  | "ray"
  | "pelican"
  | "gull"
  | "sealion"
  | "angler"
  | "marlin";

export type HazardOptions = {
  kind: HazardKind;
  x: number;
  z: number;
  speed?: number;
  axis?: "x" | "z" | "diag";
  /** If true (default for sharks/pelicans/gulls), chase player when close */
  hunts?: boolean;
  /** Distance at which hunting starts */
  chaseRange?: number;
  /** One-hit defeat (late levels only) */
  lethal?: boolean;
};

/**
 * Animals patrol with varied paths, bounce off walls/gates,
 * and some pursue the player at short range (Crossy-style pressure).
 *
 * Kid-friendly chase: short range, barely-faster than patrol, brief burst
 * with cooldown, and multi-sample LOS so they never hunt through walls.
 */
export class Hazard {
  group: THREE.Group;
  kind: HazardKind;
  radius: number;
  /** One contact = full defeat (late-game bosses) */
  lethal: boolean;
  private vx = 0;
  private vz = 0;
  private speed: number;
  private patrolSpeed: number;
  private t = 0;
  private mode: "swim" | "fly" | "drift";
  private blockers: Blocker[] = [];
  private baseY: number;
  private bounceLock = 0;
  private hunts: boolean;
  private chaseRange: number;
  private wanderTimer = 0;
  private homeX: number;
  private homeZ: number;
  private leash: number;
  /** Seconds remaining of an active chase burst */
  private chaseBurst = 0;
  /** Cooldown before another chase can start */
  private chaseCooldown = 0;
  /** Stuck detection — free animals wedged in corners */
  private stuckTimer = 0;
  private lastX = 0;
  private lastZ = 0;

  constructor(opts: HazardOptions) {
    const { kind, x, z } = opts;
    this.kind = kind;
    this.lethal = opts.lethal ?? (kind === "angler" || kind === "marlin");
    const defaultSpeed =
      kind === "gull"
        ? 2.35
        : kind === "jelly"
          ? 1.15
          : kind === "marlin"
            ? 2.55
            : kind === "angler"
              ? 1.55
              : kind === "sealion"
                ? 2.15
                : 1.9;
    this.patrolSpeed = opts.speed ?? defaultSpeed;
    this.speed = this.patrolSpeed;
    this.t = Math.random() * Math.PI * 2;
    this.homeX = x;
    this.homeZ = z;
    // Stay near spawn corridor so wide maps don't empty of patrols
    this.leash =
      kind === "marlin" || kind === "angler"
        ? 10 + Math.random() * 5
        : 7 + Math.random() * 4;

    // Who hunts: predators yes; jellies no
    if (opts.hunts !== undefined) this.hunts = opts.hunts;
    else
      this.hunts =
        kind === "shark" ||
        kind === "pelican" ||
        kind === "gull" ||
        kind === "ray" ||
        kind === "sealion" ||
        kind === "angler" ||
        kind === "marlin";

    // Mild chase radii (world units, CELL=1) — bosses a bit farther
    this.chaseRange =
      opts.chaseRange ??
      (kind === "gull"
        ? 3.4
        : kind === "shark"
          ? 4.0
          : kind === "pelican"
            ? 3.6
            : kind === "ray"
              ? 2.6
              : kind === "sealion"
                ? 3.8
                : kind === "marlin"
                  ? 5.2
                  : kind === "angler"
                    ? 4.6
                    : 0);

    if (kind === "jelly") {
      this.mode = "drift";
      this.hunts = false;
    } else if (kind === "pelican" || kind === "gull") this.mode = "fly";
    else this.mode = "swim";

    this.radius =
      kind === "gull"
        ? 0.4
        : kind === "jelly"
          ? 0.42
          : kind === "marlin"
            ? 0.58
            : kind === "angler"
              ? 0.55
              : 0.5;
    this.baseY = this.mode === "fly" ? 0.85 : this.mode === "drift" ? 0.22 : 0.05;

    this.pickNewDirection(opts.axis);

    switch (kind) {
      case "shark":
        this.group = makeShark();
        break;
      case "ray":
        this.group = makeRay();
        break;
      case "pelican":
        this.group = makePelican();
        break;
      case "gull":
        this.group = makeGull();
        break;
      case "sealion":
        this.group = makeSeaLion();
        break;
      case "angler":
        this.group = makeAngler();
        break;
      case "marlin":
        this.group = makeMarlin();
        break;
      default:
        this.group = makeJelly();
    }
    this.group.scale.setScalar(kind === "marlin" || kind === "angler" ? 1.05 : 0.85);
    this.group.position.set(x, this.baseY, z);
    this.lastX = x;
    this.lastZ = z;
    if (Math.abs(this.vx) + Math.abs(this.vz) >= 0.01) {
      this.group.rotation.y = Math.atan2(this.vx, this.vz);
    }
    this.wanderTimer = 1.5 + Math.random() * 2.5;
  }

  setBlockers(blockers: Blocker[]): void {
    this.blockers = blockers;
  }

  /** Multi-sample LOS — no chase through walls or sliding gates. */
  private hasLineOfSight(
    fromX: number,
    fromZ: number,
    toX: number,
    toZ: number,
  ): boolean {
    const samples = 6;
    const probeR = this.radius * 0.35;
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const x = fromX + (toX - fromX) * t;
      const z = fromZ + (toZ - fromZ) * t;
      if (circleHitsAny(x, z, probeR, this.blockers)) return false;
    }
    return true;
  }

  private endChase(cooldown: number): void {
    this.chaseBurst = 0;
    this.chaseCooldown = Math.max(this.chaseCooldown, cooldown);
    this.speed = this.patrolSpeed;
  }

  /**
   * @param playerX/playerZ — for chase; omit to patrol only
   */
  update(dt: number, playerX?: number, playerZ?: number): void {
    this.t += dt;
    if (this.bounceLock > 0) this.bounceLock = Math.max(0, this.bounceLock - dt);
    if (this.chaseCooldown > 0) this.chaseCooldown = Math.max(0, this.chaseCooldown - dt);

    const wasChasing = this.chaseBurst > 0;
    if (this.chaseBurst > 0) this.chaseBurst = Math.max(0, this.chaseBurst - dt);

    // --- Steering ---
    let chasing = false;
    if (
      this.hunts &&
      this.chaseRange > 0 &&
      playerX !== undefined &&
      playerZ !== undefined &&
      this.chaseCooldown <= 0
    ) {
      const dx = playerX - this.group.position.x;
      const dz = playerZ - this.group.position.z;
      const dist = Math.hypot(dx, dz);
      const inRange = dist < this.chaseRange && dist > 0.35;
      const canSee =
        inRange &&
        this.hasLineOfSight(
          this.group.position.x,
          this.group.position.z,
          playerX,
          playerZ,
        );

      if (canSee) {
        if (this.chaseBurst <= 0 && !wasChasing) {
          // Fresh brief burst — rays shortest; bosses hold longer
          this.chaseBurst =
            this.kind === "ray"
              ? 0.65 + Math.random() * 0.35
              : this.kind === "gull"
                ? 0.85 + Math.random() * 0.45
                : this.kind === "marlin"
                  ? 1.35 + Math.random() * 0.55
                  : this.kind === "angler"
                    ? 1.2 + Math.random() * 0.5
                    : 0.95 + Math.random() * 0.5;
        }
        if (this.chaseBurst > 0) {
          chasing = true;
          const mult =
            this.kind === "gull"
              ? 1.1
              : this.kind === "ray"
                ? 1.04
                : this.kind === "marlin"
                  ? 1.18
                  : this.kind === "angler"
                    ? 1.12
                    : 1.08;
          const chaseSp = this.patrolSpeed * mult;
          this.vx += (dx / dist) * chaseSp * 2.2 * dt;
          this.vz += (dz / dist) * chaseSp * 2.2 * dt;
          this.speed = chaseSp;
        }
      } else if (wasChasing || this.chaseBurst > 0) {
        // Lost LOS or left range mid-chase — fair drop-off, not wall-hunting
        this.endChase(1.1 + Math.random() * 0.7);
      }
    }

    // Burst timer expired → cool down so kids get a readable safe window
    if (wasChasing && this.chaseBurst <= 0 && !chasing) {
      this.endChase(1.4 + Math.random() * 0.9);
    }

    if (!chasing) {
      this.speed = this.patrolSpeed;
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 1.4 + Math.random() * 3.0;
        this.pickNewDirection();
      }
      const hx = this.homeX - this.group.position.x;
      const hz = this.homeZ - this.group.position.z;
      const hd = Math.hypot(hx, hz);
      if (hd > this.leash) {
        this.vx += (hx / hd) * this.speed * 2.4 * dt;
        this.vz += (hz / hd) * this.speed * 2.4 * dt;
      }
      if (this.mode === "drift") {
        this.vx += Math.sin(this.t * 1.7) * dt * 0.8;
        this.vz += Math.cos(this.t * 1.3) * dt * 0.8;
      }
    }

    this.renormalizeSpeed(
      this.speed *
        (this.mode === "drift" ? 1 + Math.sin(this.t * 1.5) * 0.1 : 1),
    );

    const oldX = this.group.position.x;
    const oldZ = this.group.position.z;
    let x = oldX + this.vx * dt;
    let z = oldZ + this.vz * dt;
    let bounced = false;

    if (circleHitsAny(x, oldZ, this.radius, this.blockers)) {
      if (this.bounceLock <= 0) {
        this.vx *= -1;
        bounced = true;
      }
      x = oldX + this.vx * dt;
      if (circleHitsAny(x, oldZ, this.radius, this.blockers)) x = oldX;
    }

    if (circleHitsAny(x, z, this.radius, this.blockers)) {
      if (this.bounceLock <= 0) {
        this.vz *= -1;
        bounced = true;
      }
      z = oldZ + this.vz * dt;
      if (circleHitsAny(x, z, this.radius, this.blockers)) z = oldZ;
    }

    const resolved = resolveCircle(x, z, this.radius, this.blockers, 5);
    const pdx = resolved.x - x;
    const pdz = resolved.z - z;
    const pushLen = Math.hypot(pdx, pdz);

    if (pushLen > 1e-4) {
      const nx = pdx / pushLen;
      const nz = pdz / pushLen;
      const vn = this.vx * nx + this.vz * nz;
      if (vn < 0) {
        this.vx -= 2 * vn * nx;
        this.vz -= 2 * vn * nz;
        bounced = true;
      }
    }

    if (circleHitsAny(resolved.x, resolved.z, this.radius * 0.98, this.blockers)) {
      const hard = resolveCircle(
        resolved.x,
        resolved.z,
        this.radius,
        this.blockers,
        6,
      );
      this.group.position.x = hard.x;
      this.group.position.z = hard.z;
      if (this.bounceLock <= 0) {
        this.pickNewDirection();
        bounced = true;
      }
    } else {
      this.group.position.x = resolved.x;
      this.group.position.z = resolved.z;
    }

    if (bounced) {
      this.bounceLock = 0.1;
      if (Math.random() < 0.45) this.pickNewDirection();
      // Don't keep pressing into geometry while "chasing"
      if (chasing) {
        this.endChase(0.8 + Math.random() * 0.5);
        chasing = false;
      }
    }

    // Stuck recovery: barely moved → reorient + nudge toward home
    const moved = Math.hypot(
      this.group.position.x - this.lastX,
      this.group.position.z - this.lastZ,
    );
    const expected = Math.max(0.015, this.speed * dt * 0.25);
    if (moved < expected) this.stuckTimer += dt;
    else this.stuckTimer = 0;
    this.lastX = this.group.position.x;
    this.lastZ = this.group.position.z;

    if (this.stuckTimer > 0.55) {
      this.stuckTimer = 0;
      this.pickNewDirection();
      const hx = this.homeX - this.group.position.x;
      const hz = this.homeZ - this.group.position.z;
      const hd = Math.hypot(hx, hz) || 1;
      const nx = this.group.position.x + (hx / hd) * 0.4;
      const nz = this.group.position.z + (hz / hd) * 0.4;
      const freed = resolveCircle(nx, nz, this.radius, this.blockers, 6);
      if (!circleHitsAny(freed.x, freed.z, this.radius * 0.95, this.blockers)) {
        this.group.position.x = freed.x;
        this.group.position.z = freed.z;
      }
      this.endChase(0.5);
      this.bounceLock = 0.12;
    }

    this.renormalizeSpeed(this.speed);

    // Vertical / decorative motion
    if (this.mode === "fly") {
      this.group.position.y = this.baseY + Math.sin(this.t * 3) * 0.22;
      const wings = this.group.userData.wings as THREE.Object3D[] | undefined;
      if (wings && wings.length >= 2) {
        const flap = Math.sin(this.t * (chasing ? 14 : 12)) * 0.55;
        wings[0].rotation.z = flap;
        wings[1].rotation.z = -flap;
      }
    } else if (this.mode === "drift") {
      this.group.position.y = this.baseY + Math.sin(this.t * 2.2) * 0.12;
      const tents = this.group.userData.tentacles as THREE.Object3D[] | undefined;
      if (tents) {
        for (let i = 0; i < tents.length; i++) {
          tents[i].rotation.x = Math.sin(this.t * 3 + i) * 0.25;
          tents[i].rotation.z = Math.cos(this.t * 2.5 + i * 0.8) * 0.15;
        }
      }
    } else {
      this.group.position.y = this.baseY + Math.sin(this.t * 4) * 0.04;
    }

    // Subtle red tint when chasing — preserve authored glows (lure, eyes, stripe)
    this.group.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshToonMaterial | undefined;
      if (!m || !m.isMeshToonMaterial || !m.emissive) return;
      if (m.userData.baseEmissive === undefined) {
        m.userData.baseEmissive = m.emissive.getHex();
        m.userData.baseEmissiveIntensity = m.emissiveIntensity ?? 0;
      }
      const baseE = m.userData.baseEmissive as number;
      const baseI = m.userData.baseEmissiveIntensity as number;
      if (baseI > 0.12) {
        // Authored glow — keep color, pulse harder while hunting
        m.emissive.setHex(baseE);
        m.emissiveIntensity = baseI * (chasing ? 1.45 : 1);
        return;
      }
      m.emissive.setHex(chasing ? 0x441818 : 0x000000);
      m.emissiveIntensity = chasing ? 0.4 : 0;
    });

    this.faceVelocity(dt);
  }

  private pickNewDirection(bias?: "x" | "z" | "diag"): void {
    const axis =
      bias ??
      (["x", "z", "diag", "diag"] as const)[Math.floor(Math.random() * 4)];
    if (axis === "x") {
      this.vx = this.patrolSpeed * (Math.random() > 0.5 ? 1 : -1);
      this.vz = (Math.random() - 0.5) * this.patrolSpeed * 0.35;
    } else if (axis === "z") {
      this.vz = this.patrolSpeed * (Math.random() > 0.5 ? 1 : -1);
      this.vx = (Math.random() - 0.5) * this.patrolSpeed * 0.35;
    } else {
      const a = Math.random() * Math.PI * 2;
      this.vx = Math.cos(a) * this.patrolSpeed;
      this.vz = Math.sin(a) * this.patrolSpeed;
    }
  }

  private renormalizeSpeed(targetSp: number): void {
    const len = Math.hypot(this.vx, this.vz);
    if (len < 1e-4) {
      this.pickNewDirection();
      return;
    }
    this.vx = (this.vx / len) * targetSp;
    this.vz = (this.vz / len) * targetSp;
  }

  private faceVelocity(dt = 1 / 60): void {
    if (Math.abs(this.vx) + Math.abs(this.vz) < 0.01) return;
    const target = Math.atan2(this.vx, this.vz);
    let yaw = this.group.rotation.y;
    let diff = target - yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turnSpeed = Math.abs(diff) > 1.2 ? 16 : 9;
    this.group.rotation.y = yaw + diff * Math.min(1, turnSpeed * dt);
  }

  collides(px: number, pz: number, pr: number): boolean {
    const hitR = this.radius * 0.82;
    const dx = px - this.group.position.x;
    const dz = pz - this.group.position.z;
    return Math.hypot(dx, dz) < hitR + pr;
  }
}
