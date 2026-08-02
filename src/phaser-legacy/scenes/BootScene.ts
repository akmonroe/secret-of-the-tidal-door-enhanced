import Phaser from "phaser";
import { generateTextures } from "../textures";
import { preloadAssetPack } from "../assetPack";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    // Real PNG pack first (same keys as procedural textures).
    preloadAssetPack(this);
  }

  create(): void {
    // Fills any keys that failed to load or were never packed.
    generateTextures(this);
    this.scene.start("Menu");
  }
}
