export type CharacterId = "boy" | "girl";

export type ClueId =
  | "SUN"
  | "SALT"
  | "BREATH"
  | "GOLD"
  | "GREEN"
  | "WHITE"
  | "BLACK"
  | "SILVER"
  | "PURPLE"
  | "STORM"
  | "MIRROR"
  | "RAINBOW";

const STORAGE_KEY = "tidal-door-save-v1";

export type SaveData = {
  character: CharacterId;
  scuba: boolean;
  clues: ClueId[];
  maxLevelUnlocked: number;
};

const defaultSave = (): SaveData => ({
  character: "girl",
  scuba: false,
  clues: [],
  maxLevelUnlocked: 1,
});

let save: SaveData = load();

function load(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();
    return { ...defaultSave(), ...JSON.parse(raw) };
  } catch {
    return defaultSave();
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    /* ignore quota */
  }
}

export function getSave(): SaveData {
  return save;
}

export function setCharacter(id: CharacterId): void {
  save.character = id;
  persist();
}

export function setScuba(on: boolean): void {
  save.scuba = on;
  persist();
}

export function hasClue(id: ClueId): boolean {
  return save.clues.includes(id);
}

export function collectClue(id: ClueId): void {
  if (!save.clues.includes(id)) {
    save.clues.push(id);
    persist();
  }
}

export function clueCount(): number {
  return save.clues.length;
}

export function unlockLevel(n: number): void {
  if (n > save.maxLevelUnlocked) {
    save.maxLevelUnlocked = n;
    persist();
  }
}

export function resetProgress(): void {
  save = defaultSave();
  persist();
}
