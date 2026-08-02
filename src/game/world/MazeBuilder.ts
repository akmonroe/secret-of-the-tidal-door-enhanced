import * as THREE from "three";
import type { BiomePalette } from "./biomes";
import type { Blocker } from "./collision";
import { resolveCircle } from "./collision";
import {
  makeCoralProp,
  makeCrate,
  makeFloorTile,
  makeGround,
  makeHouse,
  makePalm,
  makeRock,
  makeWallBox,
  makeWater,
  type GroundStyle,
  type WallStyle,
} from "./meshes";
import { waterTexture } from "./textures";

/** Half the old edge length (was 2) → double map resolution for finer paths. */
export const CELL = 1;
export type { Blocker };

/**
 * Grid legend:
 * # wall
 * . walkable floor / sand (dry)
 * ~ water (swimmable)
 * P player spawn (dry unless on ~)
 * H decorative house prop + dry deck ring
 * C clue pedestal (walkable, inherits water only if cell is ~ — use . path to C indoors)
 * T palm (blocks)
 * R rock (blocks)
 * F furniture/crate (blocks)
 * O coral prop (blocks, decorative)
 * space = water outdoors / void
 */
export type MazeBuild = {
  group: THREE.Group;
  blockers: Blocker[];
  waterSet: Set<string>;
  spawn: THREE.Vector3;
  housePos: THREE.Vector3 | null;
  cluePos: THREE.Vector3 | null;
  cols: number;
  rows: number;
  originX: number;
  originZ: number;
  /** Grid cell edge length in world units (same as CELL). */
  cellSize: number;
};

function key(c: number, r: number): string {
  return `${c},${r}`;
}

export function cellToWorld(
  c: number,
  r: number,
  originX: number,
  originZ: number,
): { x: number; z: number } {
  return {
    x: originX + c * CELL + CELL / 2,
    z: originZ + r * CELL + CELL / 2,
  };
}

export function worldToCell(
  x: number,
  z: number,
  originX: number,
  originZ: number,
): { c: number; r: number } {
  return {
    c: Math.floor((x - originX) / CELL),
    r: Math.floor((z - originZ) / CELL),
  };
}

export function buildMazeFromRows(rows: string[], biome: BiomePalette): MazeBuild {
  const rowCount = rows.length;
  const colCount = Math.max(...rows.map((r) => r.length));
  const originX = -(colCount * CELL) / 2;
  const originZ = -(rowCount * CELL) / 2;

  const group = new THREE.Group();
  const blockers: MazeBuild["blockers"] = [];
  const waterSet = new Set<string>();
  let spawn = new THREE.Vector3(0, 0, 0);
  let housePos: THREE.Vector3 | null = null;
  let cluePos: THREE.Vector3 | null = null;

  const indoor = biome.id === "house";
  const undersea =
    biome.id === "reef" ||
    biome.id === "wreck" ||
    biome.id === "kelp" ||
    biome.id === "ice" ||
    biome.id === "vent" ||
    biome.id === "current" ||
    biome.id === "coral_city" ||
    biome.id === "storm" ||
    biome.id === "mirror" ||
    biome.id === "lagoon";

  // Footprint matches the playable grid so solid ground doesn't invite walking into the void
  const worldW = colCount * CELL + 2;
  const worldD = rowCount * CELL + 2;

  let groundStyle: GroundStyle = "sand";
  let wallStyle: WallStyle = "rock";
  let floorStyle: GroundStyle = "sand";
  if (indoor) {
    groundStyle = "wood";
    wallStyle = "stucco";
    floorStyle = "wood";
  } else if (biome.id === "kelp") {
    // Emerald kelp trunks — coral texture tinted green for wall read
    groundStyle = "seafloor";
    wallStyle = "coral";
    floorStyle = "seafloor";
  } else if (biome.id === "reef" || biome.id === "coral_city" || biome.id === "lagoon") {
    groundStyle = "seafloor";
    wallStyle = "coral";
    floorStyle = "seafloor";
  } else if (biome.id === "wreck") {
    // Hull plate far-field + brick bulkheads + metal-grate catwalks
    groundStyle = "hull";
    wallStyle = "brick";
    floorStyle = "grate";
  } else if (biome.id === "vent") {
    // Volcanic vents — dark hull plates, rock pillars (not brick bulkheads)
    groundStyle = "hull";
    wallStyle = "rock";
    floorStyle = "hull";
  } else if (biome.id === "ice") {
    // Bright ice shelves — smooth rock walls tinted white via palette
    groundStyle = "sand";
    wallStyle = "rock";
    floorStyle = "sand";
  } else if (biome.id === "mirror") {
    // Looking-glass — cool metal sheen underfoot
    groundStyle = "grate";
    wallStyle = "stucco";
    floorStyle = "grate";
  } else if (biome.id === "current") {
    // Raceway lanes — seafloor + rock cliffs
    groundStyle = "seafloor";
    wallStyle = "rock";
    floorStyle = "seafloor";
  } else if (biome.id === "storm") {
    // Storm-tossed sand bars + rock
    groundStyle = "sand";
    wallStyle = "rock";
    floorStyle = "sand";
  }

  const ground = makeGround(Math.max(worldW, worldD), biome.ground, groundStyle);
  ground.position.y = 0;
  group.add(ground);

  if (!indoor) {
    // Water only under the map — not a huge plate that looks safe past the edge
    const water = makeWater(Math.max(worldW, worldD) * 1.02, biome.water);
    water.position.y = undersea ? 0.08 : 0.02;
    if (undersea) {
      (water.material as THREE.MeshToonMaterial).opacity = 0.4;
    }
    group.add(water);
  }

  const wallH = indoor ? 1.9 : undersea ? 1.35 : 1.2;
  const walkableDry = new Set([".", "P", "T", "C", "F", "O"]);

  for (let r = 0; r < rowCount; r++) {
    const line = rows[r].padEnd(colCount, indoor ? "#" : " ");
    for (let c = 0; c < colCount; c++) {
      const ch = line[c];
      const { x, z } = cellToWorld(c, r, originX, originZ);

      // Floors
      if (walkableDry.has(ch) || (indoor && ch !== "#") || ch === "H") {
        if (ch !== "#" && ch !== " ") {
          const tile = makeFloorTile(
            CELL * 0.98,
            biome.groundB,
            floorStyle,
            indoor ? 0.16 : 0.1,
          );
          tile.position.set(x, indoor ? 0.08 : 0.05, z);
          group.add(tile);
        }
      }

      // Water cells
      if (ch === "~" || ch === " " || (ch === "H" && !indoor)) {
        waterSet.add(key(c, r));
      }
      // Undersea: almost everything is "in water" for swim anim except walls
      if (undersea && ch !== "#") {
        waterSet.add(key(c, r));
      }

      if (ch === "#") {
        const wall = makeWallBox(CELL * 0.95, wallH, CELL * 0.95, biome.wall, wallStyle);
        wall.position.x = x;
        wall.position.z = z;
        group.add(wall);
        blockers.push(block(x, z, CELL * 0.42));
      }

      if (ch === "R") {
        const rock = makeRock(biome.wall);
        rock.position.set(x, 0, z);
        rock.scale.setScalar(0.55 + ((c + r) % 3) * 0.08);
        group.add(rock);
        blockers.push(block(x, z, CELL * 0.38));
      }

      if (ch === "T") {
        const palm = makePalm();
        palm.position.set(x, 0, z);
        palm.scale.setScalar(0.65);
        group.add(palm);
        blockers.push(block(x, z, 0.35));
      }

      if (ch === "F") {
        const crate = makeCrate();
        crate.position.set(x, 0, z);
        crate.scale.setScalar(0.7);
        group.add(crate);
        blockers.push(block(x, z, 0.4));
      }

      if (ch === "O") {
        const coral = makeCoralProp(biome.accent);
        coral.position.set(x, 0, z);
        coral.scale.setScalar(0.65);
        group.add(coral);
        blockers.push(block(x, z, 0.45));
      }

      if (ch === "P") {
        spawn = new THREE.Vector3(x, 0, z);
      }
      if (ch === "H") {
        housePos = new THREE.Vector3(x, 0, z);
        if (!indoor) {
          const house = makeHouse();
          house.position.set(x, 0, z);
          group.add(house);
          blockers.push({
            minX: x - 2.2,
            maxX: x + 2.2,
            minZ: z - 1.4,
            maxZ: z + 0.6,
          });
        }
      }
      if (ch === "C") {
        cluePos = new THREE.Vector3(x, 0, z);
        // Indoor clue is dry; outdoor C on water stays swimmable if water-marked above
        if (indoor) waterSet.delete(key(c, r));
      }
    }
  }

  // Bold fall-edge: kids must see where the world ends before they die
  group.add(buildWorldEdgeGuard(originX, originZ, colCount, rowCount));

  return {
    group,
    blockers,
    waterSet,
    spawn,
    housePos,
    cluePos,
    cols: colCount,
    rows: rowCount,
    originX,
    originZ,
    cellSize: CELL,
  };
}

/**
 * Super-clear map boundary: the edge of the world.
 * - Dark abyss under the island (no fake ground past the rim)
 * - Waterfall sheets pouring off every side (animated UV)
 * - Stepped earth/rock ledges crumbling into the void
 * - Mist + foam at the lip; yellow/black hazard curb; corner posts
 */
function buildWorldEdgeGuard(
  originX: number,
  originZ: number,
  cols: number,
  rows: number,
): THREE.Group {
  const g = new THREE.Group();
  g.name = "world-edge-guard";

  const minX = originX;
  const maxX = originX + cols * CELL;
  const minZ = originZ;
  const maxZ = originZ + rows * CELL;
  const midX = (minX + maxX) / 2;
  const midZ = (minZ + maxZ) / 2;
  const mapW = maxX - minX;
  const mapD = maxZ - minZ;

  // ── Abyss: deep void under the floating world ──
  const voidSize = Math.max(mapW, mapD) + 100;
  const voidPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(voidSize, voidSize),
    new THREE.MeshBasicMaterial({ color: 0x05060c, depthWrite: true }),
  );
  voidPlane.rotation.x = -Math.PI / 2;
  voidPlane.position.set(midX, -14, midZ);
  voidPlane.renderOrder = -3;
  g.add(voidPlane);

  // Concentric abyss rings — “depth rings” falling away from the island
  const ringColors = [0x12182a, 0x0c1020, 0x080c18, 0x050810];
  const baseR = Math.hypot(mapW, mapD) * 0.52;
  for (let i = 0; i < 4; i++) {
    const inner = baseR + i * 5.5;
    const outer = inner + 5.2;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 64),
      new THREE.MeshBasicMaterial({
        color: ringColors[i],
        transparent: true,
        opacity: 0.92 - i * 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(midX, -0.8 - i * 2.8, midZ);
    g.add(ring);
  }

  // Soft purple “bottomless” glow in the far void
  const glowCore = new THREE.Mesh(
    new THREE.CircleGeometry(baseR * 0.35, 32),
    new THREE.MeshBasicMaterial({
      color: 0x2a1050,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  );
  glowCore.rotation.x = -Math.PI / 2;
  glowCore.position.set(midX, -12, midZ);
  g.add(glowCore);

  const STRIPE_YEL = 0xffdd33;
  const STRIPE_BLK = 0x1a1410;
  const WARN_RED = 0xff3344;
  const CLIFF = 0x4a4038;
  const CLIFF_DARK = 0x2a2420;

  /**
   * Full edge treatment for one side:
   * outward = unit vector pointing off the map (where water falls).
   */
  const addWaterfallEdge = (
    cx: number,
    cz: number,
    length: number,
    alongX: boolean,
    outX: number,
    outZ: number,
  ): void => {
    // Hazard curb on the rim
    const curbW = alongX ? length + 0.8 : 0.9;
    const curbD = alongX ? 0.9 : length + 0.8;
    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(curbW, 0.5, curbD),
      new THREE.MeshToonMaterial({ color: STRIPE_BLK }),
    );
    curb.position.set(cx, 0.2, cz);
    curb.castShadow = true;
    g.add(curb);

    const segs = Math.max(4, Math.floor(length / 1.35));
    for (let i = 0; i < segs; i++) {
      if (i % 2 !== 0) continue;
      const t = (i + 0.5) / segs - 0.5;
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(
          alongX ? length / segs + 0.02 : 0.75,
          0.12,
          alongX ? 0.75 : length / segs + 0.02,
        ),
        new THREE.MeshToonMaterial({
          color: STRIPE_YEL,
          emissive: STRIPE_YEL,
          emissiveIntensity: 0.4,
        }),
      );
      stripe.position.set(
        alongX ? cx + t * length : cx,
        0.5,
        alongX ? cz : cz + t * length,
      );
      g.add(stripe);
    }

    // Stepped earth ledges — “edge of the world” crumbling outward & down
    for (let step = 0; step < 4; step++) {
      const out = 0.55 + step * 1.15;
      const y = -0.35 - step * 1.65;
      const h = 1.4 + step * 0.35;
      const thick = 0.85 + step * 0.2;
      const ledge = new THREE.Mesh(
        new THREE.BoxGeometry(
          alongX ? length + 1.2 + step * 0.4 : thick,
          h,
          alongX ? thick : length + 1.2 + step * 0.4,
        ),
        new THREE.MeshToonMaterial({
          color: step % 2 === 0 ? CLIFF : CLIFF_DARK,
        }),
      );
      ledge.position.set(cx + outX * out, y, cz + outZ * out);
      ledge.castShadow = true;
      g.add(ledge);

      // Red danger face on the outermost steps
      if (step >= 2) {
        const face = new THREE.Mesh(
          new THREE.BoxGeometry(
            alongX ? length + 0.5 : 0.2,
            h * 0.9,
            alongX ? 0.2 : length + 0.5,
          ),
          new THREE.MeshToonMaterial({
            color: WARN_RED,
            emissive: 0x880011,
            emissiveIntensity: 0.35,
          }),
        );
        face.position.set(
          cx + outX * (out + thick * 0.45),
          y,
          cz + outZ * (out + thick * 0.45),
        );
        g.add(face);
      }
    }

    // Waterfall sheet — hangs vertically off the rim into the abyss
    const fallH = 11;
    const fallW = length + 1.5;
    const map = waterTexture().clone();
    map.needsUpdate = true;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(Math.max(3, Math.floor(length / 6)), 4.5);

    const fallMat = new THREE.MeshToonMaterial({
      color: 0x6ad4ff,
      map,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
      emissive: 0x33aadd,
      emissiveIntensity: 0.3,
    });
    const sheet = new THREE.Mesh(
      new THREE.PlaneGeometry(fallW, fallH, 1, 8),
      fallMat,
    );
    // Orient sheet to face outward
    if (alongX) {
      // north/south: plane in X-Y, rotate to face ±Z
      sheet.rotation.y = outZ < 0 ? 0 : Math.PI;
    } else {
      // west/east: rotate to face ±X
      sheet.rotation.y = outX < 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    const sheetOut = 1.15;
    sheet.position.set(
      cx + outX * sheetOut,
      -fallH * 0.42,
      cz + outZ * sheetOut,
    );
    sheet.userData.animateWaterfall = true;
    sheet.userData.waterfallMap = map;
    sheet.userData.waterfallSpeed = 1.15 + Math.random() * 0.25;
    sheet.renderOrder = 2;
    g.add(sheet);

    // Second translucent layer (offset) for thicker cascade
    const map2 = waterTexture().clone();
    map2.needsUpdate = true;
    map2.wrapS = map2.wrapT = THREE.RepeatWrapping;
    map2.repeat.set(Math.max(3, Math.floor(length / 7)), 3.8);
    map2.offset.x = 0.3;
    const fallMat2 = new THREE.MeshToonMaterial({
      color: 0xa8ecff,
      map: map2,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
      emissive: 0x66ccff,
      emissiveIntensity: 0.2,
    });
    const sheet2 = new THREE.Mesh(
      new THREE.PlaneGeometry(fallW * 0.96, fallH * 0.92, 1, 6),
      fallMat2,
    );
    sheet2.rotation.copy(sheet.rotation);
    sheet2.position.set(
      cx + outX * (sheetOut + 0.35),
      -fallH * 0.4,
      cz + outZ * (sheetOut + 0.35),
    );
    sheet2.userData.animateWaterfall = true;
    sheet2.userData.waterfallMap = map2;
    sheet2.userData.waterfallSpeed = 0.85;
    sheet2.renderOrder = 3;
    g.add(sheet2);

    // Foam lip at the top of the falls
    const foam = new THREE.Mesh(
      new THREE.BoxGeometry(
        alongX ? fallW : 0.55,
        0.28,
        alongX ? 0.55 : fallW,
      ),
      new THREE.MeshToonMaterial({
        color: 0xe8f8ff,
        transparent: true,
        opacity: 0.85,
        emissive: 0xaaddff,
        emissiveIntensity: 0.4,
      }),
    );
    foam.position.set(cx + outX * 0.55, 0.35, cz + outZ * 0.55);
    g.add(foam);

    // Mist columns drifting off the edge (soft billboards)
    const mistN = Math.max(3, Math.floor(length / 14));
    for (let i = 0; i < mistN; i++) {
      const t = (i + 0.5) / mistN - 0.5;
      const mist = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2 + (i % 3) * 0.4, 3.5 + (i % 2)),
        new THREE.MeshBasicMaterial({
          color: 0xc8e8ff,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      mist.position.set(
        alongX ? cx + t * length : cx + outX * 2.2,
        -1.2 - (i % 3) * 0.8,
        alongX ? cz + outZ * 2.2 : cz + t * length,
      );
      mist.userData.animateMist = true;
      mist.userData.mistPhase = i * 1.3;
      mist.renderOrder = 4;
      g.add(mist);
    }

    // Falling droplet streaks (static chevrons that read as spray from high cam)
    const drops = Math.max(5, Math.floor(length / 5));
    for (let i = 0; i < drops; i++) {
      const t = (i + 0.5) / drops - 0.5;
      const drop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.12, 1.1 + (i % 3) * 0.35, 5),
        new THREE.MeshToonMaterial({
          color: 0xb0e8ff,
          transparent: true,
          opacity: 0.55,
          emissive: 0x66ccee,
          emissiveIntensity: 0.3,
        }),
      );
      drop.position.set(
        alongX ? cx + t * length : cx + outX * (1.6 + (i % 2) * 0.5),
        -1.5 - (i % 4) * 1.8,
        alongX ? cz + outZ * (1.6 + (i % 2) * 0.5) : cz + t * length,
      );
      drop.userData.animateDrop = true;
      drop.userData.dropBaseY = drop.position.y;
      drop.userData.dropSpeed = 2.5 + (i % 5) * 0.4;
      drop.userData.dropPhase = i * 0.7;
      g.add(drop);
    }
  };

  const lip = 0.08;
  addWaterfallEdge(midX, minZ - lip, mapW, true, 0, -1); // north
  addWaterfallEdge(midX, maxZ + lip, mapW, true, 0, 1); // south
  addWaterfallEdge(minX - lip, midZ, mapD, false, -1, 0); // west
  addWaterfallEdge(maxX + lip, midZ, mapD, false, 1, 0); // east

  // Inner warning band on the last safe floor
  const warnMat = new THREE.MeshBasicMaterial({
    color: 0xff2244,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const band = 1.2;
  const bands: Array<[number, number, number, number]> = [
    [midX, minZ + band * 0.5, mapW - 1.2, band],
    [midX, maxZ - band * 0.5, mapW - 1.2, band],
    [minX + band * 0.5, midZ, band, mapD - 1.2],
    [maxX - band * 0.5, midZ, band, mapD - 1.2],
  ];
  for (const [bx, bz, bw, bd] of bands) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(bw, bd), warnMat.clone());
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(bx, 0.12, bz);
    strip.renderOrder = 1;
    g.add(strip);
  }

  // Corner posts
  const corners: Array<[number, number]> = [
    [minX - lip, minZ - lip],
    [maxX + lip, minZ - lip],
    [minX - lip, maxZ + lip],
    [maxX + lip, maxZ + lip],
  ];
  for (const [px, pz] of corners) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 2.4, 8),
      new THREE.MeshToonMaterial({ color: STRIPE_BLK }),
    );
    post.position.set(px, 1.15, pz);
    post.castShadow = true;
    g.add(post);
    for (let k = 0; k < 3; k++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.07, 6, 12),
        new THREE.MeshToonMaterial({
          color: STRIPE_YEL,
          emissive: STRIPE_YEL,
          emissiveIntensity: 0.5,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(px, 0.5 + k * 0.55, pz);
      g.add(ring);
    }
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 10, 8),
      new THREE.MeshToonMaterial({
        color: WARN_RED,
        emissive: 0xff0022,
        emissiveIntensity: 0.7,
      }),
    );
    cap.position.set(px, 2.5, pz);
    g.add(cap);

    // Extra waterfall spray at corners (diagonal)
    const cornerFall = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 8, 8, 1, true),
      new THREE.MeshToonMaterial({
        color: 0x88d8ff,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
        emissive: 0x44aadd,
        emissiveIntensity: 0.2,
      }),
    );
    cornerFall.position.set(px, -3.5, pz);
    cornerFall.rotation.x = Math.PI; // point down
    g.add(cornerFall);
  }

  return g;
}

function block(x: number, z: number, half: number) {
  return {
    minX: x - half,
    maxX: x + half,
    minZ: z - half,
    maxZ: z + half,
  };
}

export function isWaterAt(x: number, z: number, maze: MazeBuild): boolean {
  const { c, r } = worldToCell(x, z, maze.originX, maze.originZ);
  if (c < 0 || r < 0 || c >= maze.cols || r >= maze.rows) return true;
  return maze.waterSet.has(key(c, r));
}

export function resolveCollision(
  x: number,
  z: number,
  radius: number,
  blockers: Blocker[],
): { x: number; z: number } {
  return resolveCircle(x, z, radius, blockers);
}
