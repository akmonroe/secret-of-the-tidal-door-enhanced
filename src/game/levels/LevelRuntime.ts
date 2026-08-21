import * as THREE from "three";
import type { Input } from "../core/input";
import { Player } from "../entities3d/Player";
import { Hazard } from "../entities3d/Hazard";
import { MovingObstacle } from "../entities3d/MovingObstacle";
import { getBiome } from "../world/biomes";
import { type Blocker, circleHitsAny } from "../world/collision";
import {
  buildMazeFromRows,
  cellToWorld,
  CELL,
  type MazeBuild,
  resolveCollision,
} from "../world/MazeBuilder";
import { makeCluePedestal } from "../world/meshes";
import {
  buildZones,
  type LiveZone,
  updateZoneVisuals,
  ventIsHot,
  zoneContains,
} from "../world/zones";
import type { LevelDef } from "./levelDefs";
import { collectClue, getSave, unlockLevel } from "../progress/state";

export type LevelCallbacks = {
  onHud: (hp: number, maxHp: number, objective: string, clues: number) => void;
  onHint: (text: string) => void;
  onComplete: (clueId: string, clueText: string) => void;
  /** Lost all HP — restart current level */
  onDeath: () => void;
  /** Fell off the world — full game over */
  onFallDeath: () => void;
};

export class LevelRuntime {
  scene = new THREE.Scene();
  envMap: THREE.Texture | null = null;
  private maze!: MazeBuild;
  private player!: Player;
  private hazards: Hazard[] = [];
  private movers: MovingObstacle[] = [];
  private zones: LiveZone[] = [];
  private clueMesh: THREE.Group | null = null;
  private def: LevelDef;
  private callbacks: LevelCallbacks;
  private won = false;
  private dead = false;
  private clock = 0;
  private camHeight = 36;
  /** Static + dynamic blockers refreshed each frame for animals & player */
  private liveBlockers: Blocker[] = [];
  /** Water surface maps for cheap UV scroll (from makeWater userData). */
  private waterMaps: THREE.Texture[] = [];
  private waterMaterials: { userData: { shader?: { uniforms: { uTime: { value: number } } } } }[] =
    [];
  /** Waterfall edge sheets (UV scroll downward). */
  private waterfallAnims: {
    map: THREE.Texture;
    speed: number;
  }[] = [];
  /** Mist planes + droplet streaks on the world rim */
  private edgeFx: THREE.Object3D[] = [];
  /** Throttle “danger edge” hints so they don't spam */
  private edgeWarnAt = 0;

  constructor(def: LevelDef, callbacks: LevelCallbacks) {
    this.def = def;
    this.callbacks = callbacks;
  }

  start(): void {
    const biome = getBiome(this.def.biome);
    this.scene.clear();
    this.scene.background = new THREE.Color(biome.sky);
    this.scene.fog = new THREE.Fog(biome.fog, 90, 180);
    // Flat map: no IBL, so water/sand don't pick up a 3D sky reflection
    this.scene.environment = null;

    const hemi = new THREE.HemisphereLight(biome.hemiSky, biome.hemiGround, 1.35);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff6e8, 1.55);
    sun.position.set(2, 80, 1);
    sun.castShadow = false;
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(biome.hemiSky, 0.45));

    this.maze = buildMazeFromRows(this.def.map, biome);
    this.scene.add(this.maze.group);
    this.waterMaps = [];
    this.waterMaterials = [];
    this.waterfallAnims = [];
    this.edgeFx = [];
    this.maze.group.traverse((obj) => {
      if (obj.userData?.animateWater && obj.userData.waterMap) {
        this.waterMaps.push(obj.userData.waterMap as THREE.Texture);
        const mat = (obj as THREE.Mesh).material as THREE.Material;
        if (mat) this.waterMaterials.push(mat);
      }
      if (obj.userData?.animateWaterfall && obj.userData.waterfallMap) {
        this.waterfallAnims.push({
          map: obj.userData.waterfallMap as THREE.Texture,
          speed: (obj.userData.waterfallSpeed as number) ?? 1,
        });
      }
      if (obj.userData?.animateMist || obj.userData?.animateDrop) {
        this.edgeFx.push(obj);
      }
    });

    // Moving gates
    this.movers = [];
    for (const m of this.def.movers ?? []) {
      const { x, z } = cellToWorld(m.c, m.r, this.maze.originX, this.maze.originZ);
      const mover = new MovingObstacle(x, z, m);
      this.movers.push(mover);
      this.scene.add(mover.mesh);
    }

    // Currents + thermal vents
    this.zones = buildZones(this.def.zones, this.maze.originX, this.maze.originZ);
    for (const z of this.zones) this.scene.add(z.mesh);

    this.refreshBlockers();

    const save = getSave();
    this.player = new Player(save.character, this.def.scuba || save.scuba);
    this.player.spawnAt(this.maze.spawn.x, this.maze.spawn.z);
    // Brief spawn shield while the first gate rhythm is readable
    this.player.grantInvuln(1400);
    this.scene.add(this.player.group);
    this.player.attachToScene(this.scene);

    this.hazards = [];
    for (const h of this.def.hazards) {
      const { x, z } = cellToWorld(h.c, h.r, this.maze.originX, this.maze.originZ);
      // Open-cell search so animals never spawn vibrating inside walls/gates
      const safe = this.findOpenSpawn(x, z, 0.65);
      const hazard = new Hazard({
        kind: h.kind,
        x: safe.x,
        z: safe.z,
        speed: h.speed,
        axis: h.axis,
        lethal: h.lethal,
        hunts: h.hunts,
        chaseRange: h.chaseRange,
      });
      hazard.setBlockers(this.liveBlockers);
      this.hazards.push(hazard);
      this.scene.add(hazard.group);
    }

    const clueAt =
      this.maze.cluePos ??
      (this.maze.housePos
        ? this.maze.housePos.clone().add(new THREE.Vector3(0, 0, 3))
        : this.maze.spawn.clone());
    this.clueMesh = makeCluePedestal();
    this.clueMesh.position.set(clueAt.x, 0, clueAt.z);
    this.scene.add(this.clueMesh);

    this.won = false;
    this.dead = false;
    this.clock = 0;
    this.callbacks.onHud(
      this.player.hp,
      this.player.maxHp,
      this.def.objective,
      getSave().clues.length,
    );
    this.callbacks.onHint(this.def.hint);
  }

  private refreshBlockers(): void {
    this.liveBlockers = [
      ...this.maze.blockers,
      ...this.movers.map((m) => m.getBlocker()),
    ];
  }

  /** Resolve out of solids; if still overlapping, search nearby open spots. */
  private findOpenSpawn(
    x: number,
    z: number,
    radius: number,
  ): { x: number; z: number } {
    let p = resolveCollision(x, z, radius, this.liveBlockers);
    if (!circleHitsAny(p.x, p.z, radius, this.liveBlockers)) return p;

    for (let ring = 1; ring <= 8; ring++) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const tx = x + Math.cos(a) * ring * CELL * 0.55;
        const tz = z + Math.sin(a) * ring * CELL * 0.55;
        p = resolveCollision(tx, tz, radius, this.liveBlockers);
        if (!circleHitsAny(p.x, p.z, radius, this.liveBlockers)) return p;
      }
    }
    return p;
  }

  update(dt: number, input: Input, camera: THREE.Camera): void {
    if (this.won) {
      if (this.player) this.followTopDown(camera, 0.08);
      return;
    }

    // Fall death: keep animating until below the world, then game over
    if (this.dead && this.player?.falling) {
      this.player.update(dt, input, this.maze);
      this.followTopDown(camera, 0.06, 8);
      if (this.player.hasFallenAway()) {
        this.callbacks.onFallDeath();
      }
      return;
    }

    if (this.dead) return;

    this.clock += dt;

    // Subtle water UV drift — cheap, keeps toy water alive
    for (const map of this.waterMaps) {
      map.offset.x = (this.clock * 0.045) % 1;
      map.offset.y = (this.clock * 0.028) % 1;
    }
    for (const mat of this.waterMaterials) {
      const shader = mat.userData?.shader;
      if (shader?.uniforms?.uTime) shader.uniforms.uTime.value = this.clock;
    }
    // Edge waterfalls pour into the abyss
    for (const w of this.waterfallAnims) {
      w.map.offset.y = (this.clock * w.speed * 0.55) % 1;
      w.map.offset.x = (this.clock * w.speed * 0.08) % 1;
    }
    // Mist bob + droplet streaks recycle downward
    for (const fx of this.edgeFx) {
      const ud = fx.userData;
      if (ud.animateMist) {
        const phase = (ud.mistPhase as number) ?? 0;
        fx.position.y = -1.2 + Math.sin(this.clock * 1.2 + phase) * 0.35;
        const mat = (fx as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat?.opacity !== undefined) {
          mat.opacity = 0.16 + Math.sin(this.clock * 0.9 + phase) * 0.08;
        }
      }
      if (ud.animateDrop) {
        const base = (ud.dropBaseY as number) ?? -2;
        const speed = (ud.dropSpeed as number) ?? 3;
        const phase = (ud.dropPhase as number) ?? 0;
        const cycle = ((this.clock * speed + phase) % 6);
        fx.position.y = base - cycle * 1.4;
        const mat = (fx as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat?.opacity !== undefined) {
          mat.opacity = 0.55 * (1 - cycle / 6);
        }
      }
    }

    // Movers first so animals & player see current gates
    for (const m of this.movers) m.update(dt);
    this.refreshBlockers();
    updateZoneVisuals(this.zones, this.clock);

    // Currents shove the traveler before movement resolves
    for (const z of this.zones) {
      if (
        z.kind === "current" &&
        zoneContains(z, this.player.position.x, this.player.position.z)
      ) {
        this.player.applyForce(z.forceX, z.forceZ, dt);
      }
    }

    // Patch maze blockers for player collision to include movers
    const staticBlockers = this.maze.blockers;
    this.maze.blockers = this.liveBlockers;
    this.player.update(dt, input, this.maze);
    this.maze.blockers = staticBlockers;

    // Near world rim — warn before the fall
    if (!this.player.falling && this.player.isNearWorldEdge(this.maze, 2.4)) {
      if (this.clock >= this.edgeWarnAt) {
        this.edgeWarnAt = this.clock + 2.8;
        this.callbacks.onHint("⚠ DANGER — world edge! Stay inside or you will fall!");
      }
    }

    // Edge of the world → fall and full game over
    if (!this.player.falling && this.player.isOutsideWorld(this.maze)) {
      this.player.startFall();
      this.dead = true;
      this.callbacks.onHint("You stepped off the edge of the world…");
      return;
    }

    // Thermal vents — damage when the plume is hot (glow bright)
    for (const z of this.zones) {
      if (
        z.kind === "vent" &&
        ventIsHot(z, this.clock) &&
        zoneContains(z, this.player.position.x, this.player.position.z)
      ) {
        this.player.hit(
          new THREE.Vector3(
            (z.minX + z.maxX) / 2,
            0,
            (z.minZ + z.maxZ) / 2,
          ),
          { damage: z.damage, invuln: 0.9 },
        );
      }
    }

    for (const h of this.hazards) {
      h.setBlockers(this.liveBlockers);
      h.update(dt, this.player.position.x, this.player.position.z);
      if (h.collides(this.player.position.x, this.player.position.z, 0.4)) {
        this.player.hit(h.group.position, {
          lethal: h.lethal,
          damage: h.lethal ? 99 : 1,
        });
        if (h.lethal) {
          this.callbacks.onHint("A deep-sea hunter got you!");
        }
      }
    }

    if (!this.player.isAlive()) {
      this.dead = true;
      this.callbacks.onDeath();
      return;
    }

    if (this.clueMesh) {
      const shell = this.clueMesh.userData.shell as THREE.Mesh | undefined;
      if (shell) {
        shell.position.y = 0.08 + Math.sin(this.clock * 3) * 0.02;
        shell.rotation.y += dt * 1.5;
      }
      const dx = this.player.position.x - this.clueMesh.position.x;
      const dz = this.player.position.z - this.clueMesh.position.z;
      if (Math.hypot(dx, dz) < 1.4) {
        this.complete();
      }
    }

    this.followTopDown(camera, 1 - Math.exp(-5 * dt));
    camera.updateMatrixWorld();

    this.callbacks.onHud(
      this.player.hp,
      this.player.maxHp,
      this.def.objective,
      getSave().clues.length,
    );
  }

  /**
   * Pure overhead follow: camera sits on +Y, screen-up is world −Z (W walks up).
   */
  private followTopDown(camera: THREE.Camera, _lerp: number, extraY = 0): void {
    if (!this.player) return;
    const px = this.player.position.x;
    const pz = this.player.position.z;
    const y = this.camHeight + extraY;
    camera.up.set(0, 0, -1);
    camera.position.set(px, y, pz);
    camera.rotation.set(-Math.PI / 2, 0, 0);
  }

  /** Test helper: stand the traveler just behind an animal so we can see it. */
  snapPlayerNear(kind?: string): boolean {
    const h =
      (kind ? this.hazards.find((x) => x.kind === kind) : undefined) ??
      this.hazards[0];
    if (!h || !this.player) return false;
    this.player.spawnAt(h.group.position.x + 2.5, h.group.position.z + 3.4);
    return true;
  }

  private complete(): void {
    if (this.won) return;
    this.won = true;
    collectClue(this.def.clue);
    unlockLevel(this.def.id + 1);
    this.callbacks.onComplete(this.def.clue, this.def.clueText);
  }

  /**
   * Compass bearing for the HUD (world-fixed).
   * Returns degrees for CSS rotate() so the needle always points at the
   * clue on a dial where up = North (−Z), right = East (+X) — independent
   * of which way the player is facing.
   * null when there is no active target (already collected / missing).
   */
  getCompassBearingDeg(): number | null {
    if (this.won || !this.clueMesh || !this.player) return null;
    const dx = this.clueMesh.position.x - this.player.position.x;
    const dz = this.clueMesh.position.z - this.player.position.z;
    if (dx * dx + dz * dz < 1e-6) return 0;
    // 0° = north (−Z), clockwise positive (matches CSS rotate + NESW marks)
    const angle = Math.atan2(dx, -dz);
    return (angle * 180) / Math.PI;
  }

  /** True after the level clue was collected this run. */
  isClueCollected(): boolean {
    return this.won;
  }

  dispose(): void {
    this.waterMaps = [];
    this.waterMaterials = [];
    this.waterfallAnims = [];
    this.edgeFx = [];
    this.scene.clear();
  }
}
