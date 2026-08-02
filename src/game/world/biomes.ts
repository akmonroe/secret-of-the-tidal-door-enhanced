export type BiomeId =
  | "beach"
  | "house"
  | "reef"
  | "wreck"
  | "kelp"
  | "ice"
  | "vent"
  | "current"
  | "coral_city"
  | "storm"
  | "mirror"
  | "lagoon";

export type BiomePalette = {
  id: BiomeId;
  fog: number;
  sky: number;
  ground: number;
  groundB: number;
  water: number;
  wall: number;
  accent: number;
  hemiSky: number;
  hemiGround: number;
};

export const BIOMES: Record<string, BiomePalette> = {
  // Crossy Castle–bright: saturated skies, soft fog, toy colors
  beach: {
    id: "beach",
    fog: 0xd4f4fc,
    sky: 0x7ad4ff,
    ground: 0xffe4b5,
    groundB: 0xffd89a,
    water: 0x4ecfff,
    wall: 0xc4b8b0,
    accent: 0x3dd68c,
    hemiSky: 0xfff8ec,
    hemiGround: 0xffe0a8,
  },
  house: {
    // Cozy indoor — warm, not muddy brown cave
    id: "house",
    fog: 0xf0dcc4,
    sky: 0xe8c9a0,
    ground: 0xd4a574,
    groundB: 0xe8bc88,
    water: 0x4ecbb5,
    wall: 0xfff5e8,
    accent: 0xf08a4b,
    hemiSky: 0xfff0d8,
    hemiGround: 0xd4a06a,
  },
  reef: {
    // Bright aqua underwater — toy aquarium, not murky deep
    id: "reef",
    fog: 0x5eb8d8,
    sky: 0x3a9ec4,
    ground: 0x3db87a,
    groundB: 0x55d094,
    water: 0x5ad4f0,
    wall: 0xff7a8a,
    accent: 0xd4a0ff,
    hemiSky: 0xb8f0ff,
    hemiGround: 0x2a8a60,
  },
  wreck: {
    // Sunlit wreck — teal water, warm wood, not grey sludge
    id: "wreck",
    fog: 0x5a9ab8,
    sky: 0x2f6f90,
    ground: 0x8b5a30,
    groundB: 0xb07040,
    water: 0x3a9ec0,
    wall: 0xc4783a,
    accent: 0xffe066,
    hemiSky: 0xa0dff5,
    hemiGround: 0x6b4020,
  },
  kelp: {
    // Emerald forest — bright green water, darker olive walls for path contrast
    id: "kelp",
    fog: 0x58c898,
    sky: 0x2a9a70,
    ground: 0x3a9a62,
    groundB: 0x52b87a,
    water: 0x3ad4b0,
    wall: 0x145530,
    accent: 0x9dffb0,
    hemiSky: 0xb0f8d8,
    hemiGround: 0x2a6a48,
  },
  ice: {
    // Bright ice shelf — white-blue, not grey
    id: "ice",
    fog: 0xc8f0ff,
    sky: 0x9ad8f8,
    ground: 0xe8f8ff,
    groundB: 0xd0ecfc,
    water: 0x6ad0f8,
    wall: 0xffffff,
    accent: 0x5ec8ff,
    hemiSky: 0xf4fcff,
    hemiGround: 0xb0d8f0,
  },
  vent: {
    // Toy midnight — dark but readable; warm orange accent, never pure black
    id: "vent",
    fog: 0x4a3858,
    sky: 0x2a2040,
    ground: 0x4a3a48,
    groundB: 0x5c4858,
    water: 0x3a5870,
    wall: 0x6a5058,
    accent: 0xff6633,
    hemiSky: 0xc07070,
    hemiGround: 0x3a2838,
  },
  current: {
    // Raceway blue — saturated so current pads pop
    id: "current",
    fog: 0x58c0e8,
    sky: 0x38a0d0,
    ground: 0x2a8098,
    groundB: 0x3a98b0,
    water: 0x48d8ff,
    wall: 0x58a0b8,
    accent: 0xd0f8ff,
    hemiSky: 0xb0f0ff,
    hemiGround: 0x1a6078,
  },
  coral_city: {
    // Pink city aquarium — candy walls vs aqua water
    id: "coral_city",
    fog: 0x78c8e0,
    sky: 0x50a8c8,
    ground: 0xf088a8,
    groundB: 0xffa0c0,
    water: 0x58d8f8,
    wall: 0xd070e8,
    accent: 0xffe066,
    hemiSky: 0xd8f4ff,
    hemiGround: 0xb06080,
  },
  storm: {
    // Stormy sea — cool slate sky, warm sand so it isn't grey mush
    id: "storm",
    fog: 0x7090a8,
    sky: 0x4a6080,
    ground: 0xe0d0a0,
    groundB: 0xc8b888,
    water: 0x4a88a0,
    wall: 0x708090,
    accent: 0xfff0a0,
    hemiSky: 0xa8c0d8,
    hemiGround: 0x6a6850,
  },
  mirror: {
    // Looking-glass sea — cool silver-lilac (distinct from ice white)
    id: "mirror",
    fog: 0xc0d0f0,
    sky: 0x7888c0,
    ground: 0xd0d8f0,
    groundB: 0xb8c0e0,
    water: 0x88c8f0,
    wall: 0xf0e8ff,
    accent: 0xc0a0ff,
    hemiSky: 0xe8e0ff,
    hemiGround: 0x7080b0,
  },
  lagoon: {
    // Rainbow coral lagoon — beach candy colors
    id: "lagoon",
    fog: 0xd0f8f0,
    sky: 0x78e0f8,
    ground: 0xfff0c0,
    groundB: 0xffe0a0,
    water: 0x58f0e0,
    wall: 0xff98b8,
    accent: 0xff66cc,
    hemiSky: 0xf0fff8,
    hemiGround: 0xa0d8b0,
  },
};

export function getBiome(id: string): BiomePalette {
  return BIOMES[id] ?? BIOMES.beach;
}
