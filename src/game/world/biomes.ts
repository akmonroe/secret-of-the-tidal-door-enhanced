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
  // Overhead map: saturated sky vs gold sand vs deep teal water
  beach: {
    id: "beach",
    fog: 0x3a88b0,
    sky: 0x1a6aaa,
    ground: 0xc49a4a,
    groundB: 0xd4aa58,
    water: 0x1a7a94,
    wall: 0x6a5c50,
    accent: 0x2d9a4a,
    hemiSky: 0xb4cce0,
    hemiGround: 0x8a6e38,
  },
  house: {
    // Cozy indoor — warm, not muddy brown cave
    id: "house",
    fog: 0xc8a888,
    sky: 0xc8a070,
    ground: 0xb07a48,
    groundB: 0xc49058,
    water: 0x2a8a7a,
    wall: 0xe8d4bc,
    accent: 0xe07030,
    hemiSky: 0xf0dcc0,
    hemiGround: 0xa07040,
  },
  reef: {
    // Deep aquarium — green seafloor vs teal water vs coral walls
    id: "reef",
    fog: 0x2a7088,
    sky: 0x185870,
    ground: 0x2a8a52,
    groundB: 0x3aa868,
    water: 0x1a88a8,
    wall: 0xe05068,
    accent: 0xc080f0,
    hemiSky: 0x88c8e0,
    hemiGround: 0x1a6040,
  },
  wreck: {
    // Sunlit wreck — teal water, warm wood
    id: "wreck",
    fog: 0x3a7088,
    sky: 0x1e5070,
    ground: 0x7a4a22,
    groundB: 0x9a5c2c,
    water: 0x1a7a98,
    wall: 0xb06028,
    accent: 0xf0c040,
    hemiSky: 0x80c0d8,
    hemiGround: 0x5a3018,
  },
  kelp: {
    // Emerald forest — darker olive walls for path contrast
    id: "kelp",
    fog: 0x2a8860,
    sky: 0x187850,
    ground: 0x2a7a48,
    groundB: 0x3a9258,
    water: 0x1aa888,
    wall: 0x104828,
    accent: 0x70e888,
    hemiSky: 0x88d8b8,
    hemiGround: 0x1a5038,
  },
  ice: {
    // Ice shelf — cool blue, not blown-out white
    id: "ice",
    fog: 0x88c0e0,
    sky: 0x5aa8d0,
    ground: 0xc8e0f0,
    groundB: 0xb0d0e4,
    water: 0x2a98c8,
    wall: 0xd8ecf8,
    accent: 0x38a8e8,
    hemiSky: 0xd8eef8,
    hemiGround: 0x88b0c8,
  },
  vent: {
    // Toy midnight — dark but readable; warm orange accent
    id: "vent",
    fog: 0x3a2848,
    sky: 0x1c1428,
    ground: 0x3a2c38,
    groundB: 0x4c3848,
    water: 0x284858,
    wall: 0x584048,
    accent: 0xff5520,
    hemiSky: 0xb05858,
    hemiGround: 0x2a1828,
  },
  current: {
    // Raceway blue — saturated so current pads pop
    id: "current",
    fog: 0x2a88b0,
    sky: 0x1a70a0,
    ground: 0x1a6078,
    groundB: 0x2a7890,
    water: 0x20a8d0,
    wall: 0x3a8098,
    accent: 0xb8ecf8,
    hemiSky: 0x88d0e8,
    hemiGround: 0x124858,
  },
  coral_city: {
    // Pink city aquarium — candy walls vs teal water
    id: "coral_city",
    fog: 0x4890b0,
    sky: 0x2878a0,
    ground: 0xd06088,
    groundB: 0xe878a0,
    water: 0x20a0c8,
    wall: 0xc050d8,
    accent: 0xf0c040,
    hemiSky: 0xb8dcec,
    hemiGround: 0x904060,
  },
  storm: {
    // Stormy sea — cool slate sky, warm sand
    id: "storm",
    fog: 0x486878,
    sky: 0x2a4058,
    ground: 0xc8b070,
    groundB: 0xb49a58,
    water: 0x2a6880,
    wall: 0x506070,
    accent: 0xf0d878,
    hemiSky: 0x88a0b8,
    hemiGround: 0x5a5840,
  },
  mirror: {
    // Looking-glass sea — cool silver-lilac
    id: "mirror",
    fog: 0x8898c0,
    sky: 0x5060a0,
    ground: 0xb0b8d0,
    groundB: 0x98a0c0,
    water: 0x58a0c8,
    wall: 0xd8d0f0,
    accent: 0xa880e8,
    hemiSky: 0xd0c8f0,
    hemiGround: 0x506090,
  },
  lagoon: {
    // Coral lagoon — gold sand, deep teal, candy walls
    id: "lagoon",
    fog: 0x48b0a8,
    sky: 0x20a0c8,
    ground: 0xe0c070,
    groundB: 0xf0d080,
    water: 0x18b8a8,
    wall: 0xe07098,
    accent: 0xe040b0,
    hemiSky: 0xc8ece8,
    hemiGround: 0x70b088,
  },
};

export function getBiome(id: string): BiomePalette {
  return BIOMES[id] ?? BIOMES.beach;
}
