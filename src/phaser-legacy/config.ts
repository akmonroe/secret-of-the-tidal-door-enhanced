import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { CharacterSelectScene } from "./scenes/CharacterSelectScene";
import { Level1Scene } from "./scenes/Level1Scene";
import { Level2Scene } from "./scenes/Level2Scene";
import { Level3Scene } from "./scenes/Level3Scene";
import { StoryScene } from "./scenes/StoryScene";

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: "game-container",
    backgroundColor: "#1a3a52",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    input: {
      activePointers: 3,
    },
    scene: [
      BootScene,
      MenuScene,
      CharacterSelectScene,
      StoryScene,
      Level1Scene,
      Level2Scene,
      Level3Scene,
    ],
    banner: false,
  };
}
