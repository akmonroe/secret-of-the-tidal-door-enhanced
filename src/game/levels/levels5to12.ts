import type { LevelDef } from "./levelDefs";
import { LEVEL5_MAP } from "./level5Map";
import { LEVEL6_MAP } from "./level6Map";
import { LEVEL7_MAP } from "./level7Map";
import { LEVEL8_MAP } from "./level8Map";
import { LEVEL9_MAP } from "./level9Map";
import { LEVEL10_MAP } from "./level10Map";
import { LEVEL11_MAP } from "./level11Map";
import { LEVEL12_MAP } from "./level12Map";
import { refineMap } from "./mapRefine";

/**
 * Levels 5–12: growing seas, currents, vents, and late lethal hunters.
 * Imported by levelDefs (type-only cycle is fine for LevelDef).
 */
export const LEVELS_5_TO_12: LevelDef[] = [

  {
    id: 5,
    key: "level5",
    title: "Emerald Kelp Forest",
    biome: "kelp",
    storyBefore: {
      title: "Level 5 — Emerald Kelp Forest",
      body:
        "Green towers of kelp blot out the sun.\n\n" +
        "You enter from the WEST. The GREEN clue waits EAST in a light-shaft clearing.\n" +
        "Sea lions charge the lanes. Currents tug you off the path — watch the blue arrows!",
    },
    map: refineMap(LEVEL5_MAP, 1),
    clue: "GREEN",
    clueText: "Through forests that never need the sky.",
    scuba: true,
    objective: "Travel EAST through the kelp · Clue GREEN",
    hint: "WEST → EAST. Blue arrows are currents. Dodge sea lions in the lanes.",
    hazards: [

      { kind: "sealion", c: 14, r: 16, speed: 2.1, axis: "x" },
      { kind: "sealion", c: 23, r: 43, speed: 2.12, axis: "z" },
      { kind: "sealion", c: 31, r: 86, speed: 2.14, axis: "x" },
      { kind: "jelly", c: 38, r: 81, speed: 1.21, axis: "z" },
      { kind: "jelly", c: 47, r: 20, speed: 1.23, axis: "x" },
      { kind: "jelly", c: 55, r: 71, speed: 1.25, axis: "diag" },
      { kind: "ray", c: 64, r: 28, speed: 1.72, axis: "z" },
      { kind: "ray", c: 72, r: 61, speed: 1.74, axis: "x" },
      { kind: "shark", c: 79, r: 56, speed: 2.01, axis: "z" },
      { kind: "sealion", c: 88, r: 15, speed: 2.28, axis: "x" },
    ],
    movers: [

      { c: 31, r: 86, axis: "x", travel: 4.5, speed: 1.7, phase: 0.0, color: 0x1a5c38, width: 1.9, depth: 1.25, height: 1.6 },
      { c: 38, r: 81, axis: "z", travel: 4.7, speed: 1.75, phase: 0.15, color: 0x1a5c38, width: 1.9, depth: 1.25, height: 1.6 },
      { c: 47, r: 20, axis: "x", travel: 4.9, speed: 1.8, phase: 0.3, color: 0x1a5c38, width: 1.9, depth: 1.25, height: 1.6 },
      { c: 55, r: 71, axis: "z", travel: 5.1, speed: 1.85, phase: 0.45, color: 0x1a5c38, width: 1.9, depth: 1.25, height: 1.6 },
      { c: 64, r: 28, axis: "x", travel: 5.3, speed: 1.9, phase: 0.6, color: 0x1a5c38, width: 1.9, depth: 1.25, height: 1.6 },
      { c: 72, r: 61, axis: "z", travel: 5.5, speed: 1.95, phase: 0.75, color: 0x1a5c38, width: 1.9, depth: 1.25, height: 1.6 },
    ],
    zones: [

      { kind: "current", c: 37, r: 80, w: 5, h: 3, forceX: 3.2, forceZ: 0 },
      { kind: "current", c: 63, r: 27, w: 5, h: 3, forceX: 3.2, forceZ: 0 },
      { kind: "current", c: 87, r: 14, w: 5, h: 3, forceX: 3.2, forceZ: 0 },
    ],
  },

  {
    id: 6,
    key: "level6",
    title: "Ice Shelf Labyrinth",
    biome: "ice",
    storyBefore: {
      title: "Level 6 — Ice Shelf Labyrinth",
      body:
        "Blue ice groans above a frozen maze.\n\n" +
        "Enter from the EAST. The WHITE clue freezes in an alcove to the WEST.\n" +
        "Sliding ice gates and cold currents test your footing.",
    },
    map: refineMap(LEVEL6_MAP, 2),
    clue: "WHITE",
    clueText: "Where ice remembers winter's bite.",
    scuba: true,
    objective: "Travel WEST across the ice · Clue WHITE",
    hint: "EAST → WEST. Currents can shove you into walls — plan your lanes.",
    hazards: [

      { kind: "shark", c: 152, r: 20, speed: 1.95, axis: "x" },
      { kind: "shark", c: 145, r: 68, speed: 1.95, axis: "z" },
      { kind: "jelly", c: 135, r: 22, speed: 1.2, axis: "x" },
      { kind: "jelly", c: 126, r: 10, speed: 1.2, axis: "z" },
      { kind: "ray", c: 117, r: 26, speed: 1.65, axis: "x" },
      { kind: "ray", c: 110, r: 74, speed: 1.65, axis: "z" },
      { kind: "sealion", c: 101, r: 82, speed: 2.15, axis: "x" },
      { kind: "shark", c: 91, r: 20, speed: 1.95, axis: "z" },
      { kind: "jelly", c: 84, r: 38, speed: 1.2, axis: "diag" },
      { kind: "ray", c: 75, r: 88, speed: 1.65, axis: "x" },
    ],
    movers: [

      { c: 145, r: 68, axis: "x", travel: 5.0, speed: 1.85, phase: 0.0, color: 0xa0d4f0, width: 2.0, depth: 1.2, height: 1.5 },
      { c: 135, r: 22, axis: "z", travel: 5.0, speed: 1.8900000000000001, phase: 0.12, color: 0xa0d4f0, width: 2.0, depth: 1.2, height: 1.5 },
      { c: 126, r: 10, axis: "x", travel: 5.0, speed: 1.9300000000000002, phase: 0.24, color: 0xa0d4f0, width: 2.0, depth: 1.2, height: 1.5 },
      { c: 117, r: 26, axis: "z", travel: 5.0, speed: 1.9700000000000002, phase: 0.36, color: 0xa0d4f0, width: 2.0, depth: 1.2, height: 1.5 },
      { c: 110, r: 74, axis: "x", travel: 5.0, speed: 2.0100000000000002, phase: 0.48, color: 0xa0d4f0, width: 2.0, depth: 1.2, height: 1.5 },
      { c: 101, r: 82, axis: "z", travel: 5.0, speed: 2.0500000000000003, phase: 0.6, color: 0xa0d4f0, width: 2.0, depth: 1.2, height: 1.5 },
      { c: 91, r: 20, axis: "x", travel: 5.0, speed: 2.09, phase: 0.72, color: 0xa0d4f0, width: 2.0, depth: 1.2, height: 1.5 },
    ],
    zones: [

      { kind: "current", c: 134, r: 21, w: 4, h: 3, forceX: -3.5, forceZ: 0 },
      { kind: "current", c: 109, r: 73, w: 4, h: 3, forceX: -3.5, forceZ: 0 },
      { kind: "current", c: 83, r: 37, w: 4, h: 3, forceX: -3.5, forceZ: 0 },
    ],
  },

  {
    id: 7,
    key: "level7",
    title: "Midnight Vent Gardens",
    biome: "vent",
    storyBefore: {
      title: "Level 7 — Midnight Vent Gardens",
      body:
        "Black rock and glowing heat fill the deep.\n\n" +
        "You drop in from the NORTH. The BLACK clue waits SOUTH past pulsing thermal vents.\n" +
        "When a vent glows bright orange — stay out or get burned!",
    },
    map: refineMap(LEVEL7_MAP, 1),
    clue: "BLACK",
    clueText: "Follow warmth where night is bright.",
    scuba: true,
    objective: "Dive SOUTH past the vents · Clue BLACK",
    hint: "NORTH → SOUTH. Orange vents pulse — cross only when dim.",
    hazards: [

      { kind: "shark", c: 29, r: 25, speed: 2.0, axis: "x" },
      { kind: "shark", c: 46, r: 23, speed: 2.0, axis: "z" },
      { kind: "shark", c: 37, r: 49, speed: 2.0, axis: "x" },
      { kind: "jelly", c: 40, r: 58, speed: 1.2, axis: "z" },
      { kind: "jelly", c: 46, r: 62, speed: 1.2, axis: "diag" },
      { kind: "ray", c: 65, r: 50, speed: 1.7, axis: "x" },
      { kind: "ray", c: 102, r: 16, speed: 1.7, axis: "z" },
      { kind: "sealion", c: 117, r: 9, speed: 2.2, axis: "x" },
      { kind: "shark", c: 123, r: 13, speed: 2.0, axis: "z" },
      { kind: "jelly", c: 124, r: 23, speed: 1.2, axis: "x" },
    ],
    movers: [

      { c: 37, r: 49, axis: "x", travel: 4.8, speed: 1.9, phase: 0.0, color: 0x5c3030, width: 2.0, depth: 1.3, height: 1.55 },
      { c: 40, r: 58, axis: "z", travel: 4.8, speed: 1.9, phase: 0.13, color: 0x5c3030, width: 2.0, depth: 1.3, height: 1.55 },
      { c: 46, r: 62, axis: "x", travel: 4.8, speed: 1.9, phase: 0.26, color: 0x5c3030, width: 2.0, depth: 1.3, height: 1.55 },
      { c: 65, r: 50, axis: "z", travel: 4.8, speed: 1.9, phase: 0.39, color: 0x5c3030, width: 2.0, depth: 1.3, height: 1.55 },
      { c: 102, r: 16, axis: "x", travel: 4.8, speed: 1.9, phase: 0.52, color: 0x5c3030, width: 2.0, depth: 1.3, height: 1.55 },
      { c: 117, r: 9, axis: "z", travel: 4.8, speed: 1.9, phase: 0.65, color: 0x5c3030, width: 2.0, depth: 1.3, height: 1.55 },
      { c: 123, r: 13, axis: "x", travel: 4.8, speed: 1.9, phase: 0.78, color: 0x5c3030, width: 2.0, depth: 1.3, height: 1.55 },
    ],
    zones: [

      { kind: "vent", c: 45, r: 22, w: 3, h: 3, damage: 1, period: 2.2 },
      { kind: "vent", c: 45, r: 61, w: 3, h: 3, damage: 1, period: 2.35 },
      { kind: "vent", c: 116, r: 8, w: 3, h: 3, damage: 1, period: 2.5 },
      { kind: "vent", c: 93, r: 70, w: 3, h: 3, damage: 1, period: 2.6500000000000004 },
      { kind: "vent", c: 126, r: 52, w: 3, h: 3, damage: 1, period: 2.8000000000000003 },
      { kind: "current", c: 101, r: 15, w: 4, h: 3, forceX: 0, forceZ: 3.0 },
    ],
  },

  {
    id: 8,
    key: "level8",
    title: "Silver Current Raceway",
    biome: "current",
    storyBefore: {
      title: "Level 8 — Silver Current Raceway",
      body:
        "Highways of blue water race through the open sea.\n\n" +
        "Start SOUTH and race NORTH to the still-water eye for SILVER.\n" +
        "Currents shove hard — and a silver marlin can end your run in one strike!",
    },
    map: refineMap(LEVEL8_MAP, 1),
    clue: "SILVER",
    clueText: "Race the fish that flash like knives.",
    scuba: true,
    objective: "Race NORTH with the currents · Clue SILVER",
    hint: "SOUTH → NORTH. Ride blue currents carefully. RED-eyed marlin = one-hit danger!",
    hazards: [

      { kind: "marlin", c: 54, r: 105, speed: 2.5, axis: "z", lethal: true },
      { kind: "shark", c: 164, r: 99, speed: 2.05, axis: "x" },
      { kind: "shark", c: 161, r: 93, speed: 2.05, axis: "z" },
      { kind: "ray", c: 102, r: 87, speed: 1.7, axis: "x" },
      { kind: "ray", c: 123, r: 81, speed: 1.7, axis: "z" },
      { kind: "jelly", c: 56, r: 75, speed: 1.2, axis: "x" },
      { kind: "jelly", c: 25, r: 69, speed: 1.2, axis: "z" },
      { kind: "shark", c: 30, r: 63, speed: 2.05, axis: "x" },
      { kind: "marlin", c: 139, r: 58, speed: 2.5, axis: "z", lethal: true },
      { kind: "sealion", c: 150, r: 52, speed: 2.2, axis: "x" },
    ],
    movers: [

      { c: 164, r: 99, axis: "x", travel: 5.2, speed: 2.0, phase: 0.0, color: 0x4a90a8, width: 2.1, depth: 1.25, height: 1.5 },
      { c: 161, r: 93, axis: "z", travel: 5.2, speed: 2.0, phase: 0.11, color: 0x4a90a8, width: 2.1, depth: 1.25, height: 1.5 },
      { c: 102, r: 87, axis: "x", travel: 5.2, speed: 2.0, phase: 0.22, color: 0x4a90a8, width: 2.1, depth: 1.25, height: 1.5 },
      { c: 123, r: 81, axis: "z", travel: 5.2, speed: 2.0, phase: 0.33, color: 0x4a90a8, width: 2.1, depth: 1.25, height: 1.5 },
      { c: 56, r: 75, axis: "x", travel: 5.2, speed: 2.0, phase: 0.44, color: 0x4a90a8, width: 2.1, depth: 1.25, height: 1.5 },
      { c: 25, r: 69, axis: "z", travel: 5.2, speed: 2.0, phase: 0.55, color: 0x4a90a8, width: 2.1, depth: 1.25, height: 1.5 },
      { c: 30, r: 63, axis: "x", travel: 5.2, speed: 2.0, phase: 0.66, color: 0x4a90a8, width: 2.1, depth: 1.25, height: 1.5 },
      { c: 139, r: 58, axis: "z", travel: 5.2, speed: 2.0, phase: 0.77, color: 0x4a90a8, width: 2.1, depth: 1.25, height: 1.5 },
    ],
    zones: [

      { kind: "current", c: 159, r: 91, w: 5, h: 4, forceX: 0, forceZ: -4.0 },
      { kind: "current", c: 54, r: 73, w: 5, h: 4, forceX: 0, forceZ: -4.0 },
      { kind: "current", c: 137, r: 56, w: 5, h: 4, forceX: 0, forceZ: -4.0 },
      { kind: "current", c: 96, r: 38, w: 5, h: 4, forceX: 0, forceZ: -4.0 },
    ],
  },

  {
    id: 9,
    key: "level9",
    title: "Coral Stair City",
    biome: "coral_city",
    storyBefore: {
      title: "Level 9 — Coral Stair City",
      body:
        "Coral terraces stack like underwater stairs.\n\n" +
        "Start on the EAST outer ring and work WEST to the plaza pillar for PURPLE.\n" +
        "Anglerfish lurk in the rings — one touch and the hunt is over.",
    },
    map: refineMap(LEVEL9_MAP, 2),
    clue: "PURPLE",
    clueText: "Climb the stairs the coral builds.",
    scuba: true,
    objective: "Travel WEST into the plaza · Clue PURPLE",
    hint: "EAST → WEST. Avoid the glowing lure of anglerfish — they are lethal!",
    hazards: [

      { kind: "angler", c: 175, r: 43, speed: 1.6, axis: "x", lethal: true },
      { kind: "shark", c: 164, r: 18, speed: 2.05, axis: "z" },
      { kind: "shark", c: 154, r: 60, speed: 2.05, axis: "x" },
      { kind: "jelly", c: 144, r: 48, speed: 1.25, axis: "z" },
      { kind: "jelly", c: 134, r: 36, speed: 1.25, axis: "x" },
      { kind: "ray", c: 125, r: 94, speed: 1.75, axis: "z" },
      { kind: "ray", c: 115, r: 80, speed: 1.75, axis: "x" },
      { kind: "sealion", c: 105, r: 68, speed: 2.2, axis: "z" },
      { kind: "angler", c: 96, r: 104, speed: 1.6, axis: "diag", lethal: true },
      { kind: "shark", c: 86, r: 64, speed: 2.05, axis: "x" },
    ],
    movers: [

      { c: 164, r: 18, axis: "x", travel: 5.0, speed: 2.05, phase: 0.0, color: 0xc060d0, width: 2.0, depth: 1.2, height: 1.55 },
      { c: 154, r: 60, axis: "z", travel: 5.0, speed: 2.05, phase: 0.12, color: 0xc060d0, width: 2.0, depth: 1.2, height: 1.55 },
      { c: 144, r: 48, axis: "x", travel: 5.0, speed: 2.05, phase: 0.24, color: 0xc060d0, width: 2.0, depth: 1.2, height: 1.55 },
      { c: 134, r: 36, axis: "z", travel: 5.0, speed: 2.05, phase: 0.36, color: 0xc060d0, width: 2.0, depth: 1.2, height: 1.55 },
      { c: 125, r: 94, axis: "x", travel: 5.0, speed: 2.05, phase: 0.48, color: 0xc060d0, width: 2.0, depth: 1.2, height: 1.55 },
      { c: 115, r: 80, axis: "z", travel: 5.0, speed: 2.05, phase: 0.6, color: 0xc060d0, width: 2.0, depth: 1.2, height: 1.55 },
      { c: 105, r: 68, axis: "x", travel: 5.0, speed: 2.05, phase: 0.72, color: 0xc060d0, width: 2.0, depth: 1.2, height: 1.55 },
      { c: 96, r: 104, axis: "z", travel: 5.0, speed: 2.05, phase: 0.84, color: 0xc060d0, width: 2.0, depth: 1.2, height: 1.55 },
    ],
    zones: [

      { kind: "current", c: 143, r: 47, w: 4, h: 3, forceX: -2.8, forceZ: 0 },
      { kind: "current", c: 104, r: 67, w: 4, h: 3, forceX: -2.8, forceZ: 0 },
      { kind: "vent", c: 124, r: 93, w: 3, h: 3, damage: 1, period: 2.0 },
      { kind: "vent", c: 75, r: 51, w: 3, h: 3, damage: 1, period: 2.0 },
    ],
  },

  {
    id: 10,
    key: "level10",
    title: "Storm-Churn Shoals",
    biome: "storm",
    storyBefore: {
      title: "Level 10 — Storm-Churn Shoals",
      body:
        "Rain shafts stab the shallows. Sandbars shift like living walls.\n\n" +
        "Start NORTH-WEST and push SOUTH-EAST to the lighthouse foundation for STORM.\n" +
        "Wave currents, vents of lightning-hot water, and marlins on the hunt.",
    },
    map: refineMap(LEVEL10_MAP, 1),
    clue: "STORM",
    clueText: "Hold steady when the sky falls in.",
    scuba: true,
    objective: "Cross SE through the storm · Clue STORM",
    hint: "NW → SE. Hold steady in currents. Lethal marlins patrol the churn!",
    hazards: [

      { kind: "marlin", c: 40, r: 14, speed: 2.6, axis: "x", lethal: true },
      { kind: "marlin", c: 10, r: 83, speed: 2.6, axis: "z", lethal: true },
      { kind: "shark", c: 60, r: 26, speed: 2.1, axis: "x" },
      { kind: "shark", c: 66, r: 33, speed: 2.1, axis: "z" },
      { kind: "sealion", c: 44, r: 82, speed: 2.25, axis: "x" },
      { kind: "jelly", c: 87, r: 33, speed: 1.25, axis: "diag" },
      { kind: "jelly", c: 55, r: 97, speed: 1.25, axis: "z" },
      { kind: "ray", c: 92, r: 57, speed: 1.8, axis: "x" },
      { kind: "ray", c: 72, r: 103, speed: 1.8, axis: "z" },
      { kind: "shark", c: 111, r: 60, speed: 2.1, axis: "x" },
      { kind: "marlin", c: 140, r: 32, speed: 2.6, axis: "z", lethal: true },
    ],
    movers: [

      { c: 40, r: 14, axis: "x", travel: 5.5, speed: 2.1, phase: 0.0, color: 0x5a6058, width: 2.2, depth: 1.3, height: 1.6 },
      { c: 10, r: 83, axis: "z", travel: 5.5, speed: 2.1, phase: 0.1, color: 0x5a6058, width: 2.2, depth: 1.3, height: 1.6 },
      { c: 60, r: 26, axis: "x", travel: 5.5, speed: 2.1, phase: 0.2, color: 0x5a6058, width: 2.2, depth: 1.3, height: 1.6 },
      { c: 66, r: 33, axis: "z", travel: 5.5, speed: 2.1, phase: 0.3, color: 0x5a6058, width: 2.2, depth: 1.3, height: 1.6 },
      { c: 44, r: 82, axis: "x", travel: 5.5, speed: 2.1, phase: 0.4, color: 0x5a6058, width: 2.2, depth: 1.3, height: 1.6 },
      { c: 87, r: 33, axis: "z", travel: 5.5, speed: 2.1, phase: 0.5, color: 0x5a6058, width: 2.2, depth: 1.3, height: 1.6 },
      { c: 55, r: 97, axis: "x", travel: 5.5, speed: 2.1, phase: 0.6, color: 0x5a6058, width: 2.2, depth: 1.3, height: 1.6 },
      { c: 92, r: 57, axis: "z", travel: 5.5, speed: 2.1, phase: 0.7, color: 0x5a6058, width: 2.2, depth: 1.3, height: 1.6 },
      { c: 72, r: 103, axis: "x", travel: 5.5, speed: 2.1, phase: 0.8, color: 0x5a6058, width: 2.2, depth: 1.3, height: 1.6 },
    ],
    zones: [

      { kind: "current", c: 9, r: 82, w: 5, h: 4, forceX: 2.5, forceZ: 3.0 },
      { kind: "current", c: 43, r: 81, w: 5, h: 4, forceX: 2.5, forceZ: 3.0 },
      { kind: "current", c: 71, r: 102, w: 5, h: 4, forceX: 2.5, forceZ: 3.0 },
      { kind: "vent", c: 65, r: 32, w: 3, h: 3, damage: 1, period: 1.9 },
      { kind: "vent", c: 54, r: 96, w: 3, h: 3, damage: 1, period: 1.9 },
      { kind: "vent", c: 135, r: 53, w: 3, h: 3, damage: 1, period: 1.9 },
    ],
  },

  {
    id: 11,
    key: "level11",
    title: "Mirror Grotto",
    biome: "mirror",
    storyBefore: {
      title: "Level 11 — Mirror Grotto",
      body:
        "Crystal walls copy every path — but only one side is true.\n\n" +
        "Start SOUTH on the true (east) path and climb NORTH to the altar for MIRROR.\n" +
        "Anglers guard the reflections. One touch ends the run.",
    },
    map: refineMap(LEVEL11_MAP, 2),
    clue: "MIRROR",
    clueText: "Find the cave that copies you.",
    scuba: true,
    objective: "Climb NORTH on the true path · Clue MIRROR",
    hint: "SOUTH → NORTH on the east spine. West half is a false mirror. Lethal anglers!",
    hazards: [

      { kind: "angler", c: 93, r: 117, speed: 1.65, axis: "z", lethal: true },
      { kind: "angler", c: 161, r: 110, speed: 1.65, axis: "x", lethal: true },
      { kind: "shark", c: 118, r: 103, speed: 2.1, axis: "z" },
      { kind: "jelly", c: 28, r: 96, speed: 1.25, axis: "x" },
      { kind: "jelly", c: 134, r: 90, speed: 1.25, axis: "z" },
      { kind: "ray", c: 124, r: 83, speed: 1.8, axis: "x" },
      { kind: "ray", c: 192, r: 77, speed: 1.8, axis: "z" },
      { kind: "shark", c: 144, r: 70, speed: 2.1, axis: "x" },
      { kind: "angler", c: 128, r: 63, speed: 1.65, axis: "z", lethal: true },
      { kind: "sealion", c: 180, r: 57, speed: 2.2, axis: "x" },
    ],
    movers: [

      { c: 161, r: 110, axis: "x", travel: 4.8, speed: 2.0, phase: 0.0, color: 0xa0c8e0, width: 1.9, depth: 1.2, height: 1.5 },
      { c: 118, r: 103, axis: "z", travel: 4.8, speed: 2.0, phase: 0.12, color: 0xa0c8e0, width: 1.9, depth: 1.2, height: 1.5 },
      { c: 28, r: 96, axis: "x", travel: 4.8, speed: 2.0, phase: 0.24, color: 0xa0c8e0, width: 1.9, depth: 1.2, height: 1.5 },
      { c: 134, r: 90, axis: "z", travel: 4.8, speed: 2.0, phase: 0.36, color: 0xa0c8e0, width: 1.9, depth: 1.2, height: 1.5 },
      { c: 124, r: 83, axis: "x", travel: 4.8, speed: 2.0, phase: 0.48, color: 0xa0c8e0, width: 1.9, depth: 1.2, height: 1.5 },
      { c: 192, r: 77, axis: "z", travel: 4.8, speed: 2.0, phase: 0.6, color: 0xa0c8e0, width: 1.9, depth: 1.2, height: 1.5 },
      { c: 144, r: 70, axis: "x", travel: 4.8, speed: 2.0, phase: 0.72, color: 0xa0c8e0, width: 1.9, depth: 1.2, height: 1.5 },
      { c: 128, r: 63, axis: "z", travel: 4.8, speed: 2.0, phase: 0.84, color: 0xa0c8e0, width: 1.9, depth: 1.2, height: 1.5 },
    ],
    zones: [

      { kind: "current", c: 117, r: 102, w: 3, h: 5, forceX: 0, forceZ: -3.2 },
      { kind: "current", c: 191, r: 76, w: 3, h: 5, forceX: 0, forceZ: -3.2 },
      { kind: "vent", c: 133, r: 89, w: 3, h: 3, damage: 1, period: 2.1 },
      { kind: "vent", c: 179, r: 56, w: 3, h: 3, damage: 1, period: 2.1 },
    ],
  },

  {
    id: 12,
    key: "level12",
    title: "Eye of the Lagoon",
    biome: "lagoon",
    storyBefore: {
      title: "Level 12 — Eye of the Lagoon",
      body:
        "The quiet eye of the tide. Seven colors meet in the sand.\n\n" +
        "Board from the SOUTH-WEST outer ring and spiral to the center for the Rainbow Coral.\n" +
        "Guardians still hunt — marlins and anglers will not let the prize go cheaply.",
    },
    map: refineMap(LEVEL12_MAP, 1),
    clue: "RAINBOW",
    clueText: "All colors join where currents rest.",
    scuba: true,
    objective: "Spiral to the center · Rainbow Coral",
    hint: "SW → center. Ride currents carefully. Final hunters can end the quest in one hit!",
    hazards: [

      { kind: "marlin", c: 10, r: 69, speed: 2.55, axis: "x", lethal: true },
      { kind: "angler", c: 48, r: 112, speed: 1.7, axis: "z", lethal: true },
      { kind: "shark", c: 55, r: 105, speed: 2.1, axis: "x" },
      { kind: "shark", c: 19, r: 24, speed: 2.1, axis: "z" },
      { kind: "ray", c: 45, r: 50, speed: 1.75, axis: "x" },
      { kind: "jelly", c: 94, r: 115, speed: 1.2, axis: "diag" },
      { kind: "sealion", c: 64, r: 39, speed: 2.2, axis: "z" },
      { kind: "marlin", c: 79, r: 42, speed: 2.55, axis: "x", lethal: true },
      { kind: "angler", c: 73, r: 5, speed: 1.7, axis: "z", lethal: true },
      { kind: "shark", c: 143, r: 102, speed: 2.1, axis: "x" },
      { kind: "ray", c: 157, r: 101, speed: 1.75, axis: "z" },
    ],
    movers: [

      { c: 10, r: 69, axis: "x", travel: 5.0, speed: 1.95, phase: 0.0, color: 0xff90b0, width: 2.0, depth: 1.25, height: 1.5 },
      { c: 48, r: 112, axis: "z", travel: 5.0, speed: 1.95, phase: 0.11, color: 0xff90b0, width: 2.0, depth: 1.25, height: 1.5 },
      { c: 55, r: 105, axis: "x", travel: 5.0, speed: 1.95, phase: 0.22, color: 0xff90b0, width: 2.0, depth: 1.25, height: 1.5 },
      { c: 19, r: 24, axis: "z", travel: 5.0, speed: 1.95, phase: 0.33, color: 0xff90b0, width: 2.0, depth: 1.25, height: 1.5 },
      { c: 45, r: 50, axis: "x", travel: 5.0, speed: 1.95, phase: 0.44, color: 0xff90b0, width: 2.0, depth: 1.25, height: 1.5 },
      { c: 94, r: 115, axis: "z", travel: 5.0, speed: 1.95, phase: 0.55, color: 0xff90b0, width: 2.0, depth: 1.25, height: 1.5 },
      { c: 64, r: 39, axis: "x", travel: 5.0, speed: 1.95, phase: 0.66, color: 0xff90b0, width: 2.0, depth: 1.25, height: 1.5 },
      { c: 79, r: 42, axis: "z", travel: 5.0, speed: 1.95, phase: 0.77, color: 0xff90b0, width: 2.0, depth: 1.25, height: 1.5 },
      { c: 73, r: 5, axis: "x", travel: 5.0, speed: 1.95, phase: 0.88, color: 0xff90b0, width: 2.0, depth: 1.25, height: 1.5 },
    ],
    zones: [

      { kind: "current", c: 54, r: 104, w: 4, h: 4, forceX: 1.5, forceZ: -2.5 },
      { kind: "current", c: 93, r: 114, w: 4, h: 4, forceX: 1.5, forceZ: -2.5 },
      { kind: "current", c: 72, r: 4, w: 4, h: 4, forceX: 1.5, forceZ: -2.5 },
      { kind: "vent", c: 44, r: 49, w: 3, h: 3, damage: 1, period: 2.3 },
      { kind: "vent", c: 156, r: 100, w: 3, h: 3, damage: 1, period: 2.3 },
    ],
  },
];
