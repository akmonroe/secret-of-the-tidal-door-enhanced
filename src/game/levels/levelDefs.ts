import type { ClueId } from "../progress/state";
import type { HazardKind } from "../entities3d/Hazard";
import type { MovingObstacleDef } from "../entities3d/MovingObstacle";
import type { ZoneDef } from "../world/zones";
import { LEVEL1_MAP } from "./level1Map";
import { LEVEL2_MAP } from "./level2Map";
import { LEVEL3_MAP } from "./level3Map";
import { LEVEL4_MAP } from "./level4Map";
import { refineMap } from "./mapRefine";
import { LEVELS_5_TO_12 } from "./levels5to12";

export type HazardSpawn = {
  kind: HazardKind;
  c: number;
  r: number;
  /** World units per second */
  speed?: number;
  axis?: "x" | "z" | "diag";
  /** One-hit defeat (late-game hunters) */
  lethal?: boolean;
  hunts?: boolean;
  chaseRange?: number;
};

export type LevelDef = {
  id: number;
  key: string;
  title: string;
  biome: string;
  storyBefore: { title: string; body: string };
  map: string[];
  clue: ClueId;
  clueText: string;
  scuba: boolean;
  hazards: HazardSpawn[];
  /** Sliding gates — timing challenges (place on OPEN cells, not walls) */
  movers?: MovingObstacleDef[];
  /** Currents and thermal vents */
  zones?: ZoneDef[];
  objective: string;
  hint: string;
};

/**
 * Wide maps + varied compass directions (kid-friendly complexity):
 * - L1 EAST:  west beach → east stilt house
 * - L2 WEST:  east halls → west secret chamber
 * - L3 SOUTH: north reef edge → south BREATH clue
 * - L4 NE:    south-west wreck deck → north-east captain cabin
 *
 * Coords are on the refined (2×) grid — place on OPEN cells only.
 * doubleHazards / doubleMovers still applied at the bottom.
 */
export const LEVELS: LevelDef[] = [
  {
    id: 1,
    key: "level1",
    title: "Sunset Beach",
    biome: "beach",
    storyBefore: {
      title: "Level 1 — Sunset Beach",
      body:
        "Locals whisper about the Rainbow Coral — found only by gathering clues from every sea.\n\n" +
        "You wash up on the WEST shore. The stilt house waits far to the EAST across a wide rock maze.\n" +
        "Head east, swim the channels, dodge sharks — and watch for drifting debris gates.",
    },
    map: refineMap(LEVEL1_MAP, 1),
    clue: "SUN",
    clueText: "Begin where light first touches sand.",
    scuba: false,
    objective: "Head EAST to the stilt house · Clue SUN",
    hint: "Travel EAST. Stay inside the yellow/black edge — past it you fall and restart the whole game!",
    hazards: [
      { kind: "shark", c: 28, r: 63, speed: 1.76, axis: "x" },
      { kind: "shark", c: 43, r: 61, speed: 1.81, axis: "z" },
      { kind: "shark", c: 62, r: 67, speed: 1.87, axis: "x" },
      { kind: "jelly", c: 52, r: 22, speed: 1.09, axis: "z" },
      { kind: "jelly", c: 95, r: 71, speed: 1.13, axis: "x" },
      { kind: "jelly", c: 98, r: 49, speed: 1.16, axis: "diag" },
      { kind: "ray", c: 118, r: 57, speed: 1.52, axis: "x" },
      { kind: "ray", c: 119, r: 30, speed: 1.57, axis: "z" },
    ],
    movers: [
      { c: 36, r: 68, axis: "x", travel: 4.5, speed: 1.65, phase: 0.0, color: 0x8b7355, width: 2.0, depth: 1.3 },
      { c: 38, r: 37, axis: "z", travel: 4.9, speed: 1.77, phase: 0.17, color: 0x6b705c, width: 1.35, depth: 2.0 },
      { c: 73, r: 64, axis: "x", travel: 5.3, speed: 1.89, phase: 0.34, color: 0x5c4033, width: 2.0, depth: 1.3 },
      { c: 93, r: 65, axis: "z", travel: 4.5, speed: 2.01, phase: 0.51, color: 0x8b5a2b, width: 1.35, depth: 2.0 },
      { c: 96, r: 36, axis: "x", travel: 4.9, speed: 1.65, phase: 0.68, color: 0x4a6741, width: 2.0, depth: 1.3 },
    ],
  },
  {
    id: 2,
    key: "level2",
    title: "Stilt House Aviary",
    biome: "house",
    storyBefore: {
      title: "Level 2 — Birds of the Hidden Door",
      body:
        "Inside the house, salt air fills LONG halls stretching west.\n\n" +
        "You enter from the EAST wing. The SALT clue hides in a chamber to the WEST.\n" +
        "Pelicans and gulls patrol. Sliding crates block passages on a rhythm — time your dash.",
    },
    map: refineMap(LEVEL2_MAP, 2),
    clue: "SALT",
    clueText: "Cross the house that walks on water.",
    scuba: false,
    objective: "Travel WEST through the halls · Clue SALT",
    hint: "You start on the EAST side — keep heading WEST. Time crate gaps, then dash.",
    hazards: [
      { kind: "pelican", c: 135, r: 73, speed: 1.8, axis: "x" },
      { kind: "pelican", c: 120, r: 54, speed: 1.86, axis: "z" },
      { kind: "pelican", c: 105, r: 47, speed: 1.92, axis: "x" },
      { kind: "pelican", c: 90, r: 72, speed: 1.8, axis: "z" },
      { kind: "gull", c: 75, r: 33, speed: 2.3, axis: "x" },
      { kind: "gull", c: 60, r: 14, speed: 2.37, axis: "z" },
      { kind: "gull", c: 45, r: 5, speed: 2.23, axis: "z" },
      { kind: "gull", c: 30, r: 67, speed: 2.3, axis: "x" },
      { kind: "gull", c: 15, r: 59, speed: 2.37, axis: "diag" },
    ],
    movers: [
      { c: 128, r: 43, axis: "x", travel: 4.5, speed: 1.65, phase: 0.0, color: 0x8b5a2b, width: 1.7, depth: 1.15, height: 1.2 },
      { c: 107, r: 3, axis: "z", travel: 4.9, speed: 1.77, phase: 0.17, color: 0xa67c52, width: 1.35, depth: 2.0, height: 1.2 },
      { c: 86, r: 19, axis: "x", travel: 5.3, speed: 1.89, phase: 0.34, color: 0x8b5a2b, width: 1.8, depth: 1.15, height: 1.2 },
      { c: 65, r: 26, axis: "z", travel: 4.5, speed: 2.01, phase: 0.51, color: 0xa67c52, width: 1.35, depth: 2.0, height: 1.2 },
      { c: 44, r: 32, axis: "x", travel: 4.9, speed: 1.65, phase: 0.68, color: 0x8b5a2b, width: 1.7, depth: 1.15, height: 1.2 },
    ],
  },
  {
    id: 3,
    key: "level3",
    title: "First Descent",
    biome: "reef",
    storyBefore: {
      title: "Level 3 — Scuba Under the Sea",
      body:
        "The Tidal Door opens onto racks of scuba gear!\n\n" +
        "You drop in at the NORTH edge of a huge reef. The BREATH clue lies SOUTH through coral canyons.\n" +
        "Stone slabs drift on a rhythm. Sea creatures patrol the lanes.",
    },
    map: refineMap(LEVEL3_MAP, 1),
    clue: "BREATH",
    clueText: "Wear the tank that drinks the deep.",
    scuba: true,
    objective: "Dive SOUTH through the reef · Clue BREATH",
    hint: "You start at the NORTH reef — keep swimming SOUTH. Use gate timing in the canyons.",
    hazards: [
      { kind: "shark", c: 25, r: 28, speed: 1.76, axis: "x" },
      { kind: "shark", c: 43, r: 28, speed: 1.81, axis: "z" },
      { kind: "shark", c: 72, r: 9, speed: 1.87, axis: "x" },
      { kind: "shark", c: 71, r: 27, speed: 1.76, axis: "z" },
      { kind: "jelly", c: 49, r: 71, speed: 1.13, axis: "diag" },
      { kind: "jelly", c: 113, r: 7, speed: 1.16, axis: "x" },
      { kind: "jelly", c: 102, r: 37, speed: 1.09, axis: "z" },
      { kind: "ray", c: 79, r: 82, speed: 1.57, axis: "z" },
      { kind: "ray", c: 120, r: 48, speed: 1.62, axis: "x" },
      { kind: "ray", c: 124, r: 66, speed: 1.52, axis: "z" },
    ],
    movers: [
      { c: 35, r: 25, axis: "x", travel: 4.5, speed: 1.65, phase: 0.1, color: 0x4a6741, width: 1.9, depth: 1.25, height: 1.5 },
      { c: 58, r: 22, axis: "z", travel: 4.9, speed: 1.77, phase: 0.17, color: 0x5c4033, width: 1.25, depth: 1.9, height: 1.55 },
      { c: 45, r: 61, axis: "x", travel: 5.3, speed: 1.89, phase: 0.34, color: 0x4a6741, width: 1.9, depth: 1.25, height: 1.5 },
      { c: 85, r: 33, axis: "z", travel: 4.5, speed: 2.01, phase: 0.51, color: 0x5c4033, width: 1.25, depth: 1.9, height: 1.55 },
      { c: 124, r: 6, axis: "x", travel: 4.9, speed: 1.65, phase: 0.68, color: 0x6b4226, width: 1.9, depth: 1.25, height: 1.5 },
      { c: 104, r: 53, axis: "z", travel: 5.3, speed: 1.77, phase: 0.85, color: 0x4a6741, width: 1.25, depth: 1.9, height: 1.5 },
    ],
  },
  {
    id: 4,
    key: "level4",
    title: "Wreck of the Amber Gull",
    biome: "wreck",
    storyBefore: {
      title: "Level 4 — Wreck of the Amber Gull",
      body:
        "A wooden ship rests on its side in the gloom — the Amber Gull.\n\n" +
        "You board at the SOUTH-WEST. The GOLD clue waits in the captain's cabin to the NORTH-EAST.\n" +
        "Sliding bulkheads and prowling creatures make every deck a timing puzzle.",
    },
    map: refineMap(LEVEL4_MAP, 2),
    clue: "GOLD",
    clueText: "Past the coins the wreck still keeps.",
    scuba: true,
    objective: "Weave NORTH-EAST to the cabin · Clue GOLD",
    hint: "Start SOUTH-WEST — work your way NORTH and EAST. Side channels save you from bulkheads.",
    hazards: [
      { kind: "shark", c: 20, r: 61, speed: 1.76, axis: "x" },
      { kind: "shark", c: 43, r: 70, speed: 1.81, axis: "x" },
      { kind: "shark", c: 14, r: 5, speed: 1.87, axis: "x" },
      { kind: "jelly", c: 75, r: 76, speed: 1.09, axis: "x" },
      { kind: "jelly", c: 42, r: 5, speed: 1.13, axis: "x" },
      { kind: "jelly", c: 93, r: 61, speed: 1.16, axis: "x" },
      { kind: "ray", c: 74, r: 11, speed: 1.52, axis: "x" },
      { kind: "ray", c: 133, r: 79, speed: 1.57, axis: "x" },
      { kind: "ray", c: 138, r: 65, speed: 1.62, axis: "x" },
      { kind: "ray", c: 119, r: 9, speed: 1.52, axis: "x" },
    ],
    movers: [
      { c: 19, r: 53, axis: "x", travel: 4.5, speed: 1.65, phase: 0.0, color: 0x5c4033, width: 2.2, depth: 1.15, height: 1.7 },
      { c: 18, r: 23, axis: "z", travel: 4.9, speed: 1.77, phase: 0.17, color: 0x6b4226, width: 1.35, depth: 2.0, height: 1.7 },
      { c: 42, r: 34, axis: "x", travel: 5.3, speed: 1.89, phase: 0.34, color: 0x5c4033, width: 2.2, depth: 1.15, height: 1.75 },
      { c: 88, r: 78, axis: "z", travel: 4.5, speed: 2.01, phase: 0.51, color: 0x6b4226, width: 1.35, depth: 2.0, height: 1.7 },
      { c: 116, r: 95, axis: "x", travel: 4.9, speed: 1.65, phase: 0.68, color: 0x5c4033, width: 2.1, depth: 1.15, height: 1.7 },
      { c: 127, r: 86, axis: "z", travel: 5.3, speed: 1.77, phase: 0.85, color: 0x8b5a2b, width: 1.35, depth: 2.0, height: 1.65 },
      { c: 95, r: 12, axis: "x", travel: 4.5, speed: 1.89, phase: 0.02, color: 0x5c4033, width: 2.0, depth: 1.15, height: 1.6 },
    ],
  },
];

/** Duplicate every spawn with a small offset so density doubles without stacking. */
function doubleHazards(list: HazardSpawn[]): HazardSpawn[] {
  const extra: HazardSpawn[] = list.map((h, i) => ({
    ...h,
    c: h.c + (i % 2 === 0 ? 4 : -4),
    r: h.r + (i % 3 === 0 ? 3 : -3),
    axis:
      h.axis === "x" ? "z" : h.axis === "z" ? "x" : h.axis === "diag" ? "x" : "diag",
    speed: h.speed !== undefined ? h.speed * (0.92 + (i % 3) * 0.04) : h.speed,
  }));
  return [...list, ...extra];
}

function doubleMovers(list: MovingObstacleDef[] | undefined): MovingObstacleDef[] | undefined {
  if (!list?.length) return list;
  const extra: MovingObstacleDef[] = list.map((m, i) => ({
    ...m,
    c: m.c + (i % 2 === 0 ? 5 : -5),
    r: m.r + (i % 2 === 0 ? -4 : 4),
    axis: m.axis === "x" ? "z" : "x",
    phase: ((m.phase ?? 0) + 0.5) % 1,
    speed: m.speed * 0.95,
    travel: m.travel * 0.9,
  }));
  return [...list, ...extra];
}

// Append seas 5–12 (growing maps, currents, vents, lethal hunters)
LEVELS.push(...LEVELS_5_TO_12);

// Apply double density to all levels
for (const level of LEVELS) {
  level.hazards = doubleHazards(level.hazards);
  level.movers = doubleMovers(level.movers);
}

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function getNextLevel(id: number): LevelDef | undefined {
  return getLevel(id + 1);
}

export function totalLevelsBuilt(): number {
  return LEVELS.length;
}
