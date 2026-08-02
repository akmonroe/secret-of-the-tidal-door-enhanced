import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create(): void {
    // Beachy backdrop
    for (let y = 0; y < GAME_HEIGHT; y += 64) {
      for (let x = 0; x < GAME_WIDTH; x += 64) {
        const key = y < GAME_HEIGHT * 0.45 ? "water" : y < GAME_HEIGHT * 0.55 ? "shallow" : "sand";
        this.add.image(x + 32, y + 32, key).setAlpha(0.95);
      }
    }

    this.add.image(140, 380, "palm").setScale(1.4);
    this.add.image(820, 400, "palm").setScale(1.2).setFlipX(true);
    this.add.image(700, 180, "house").setScale(0.85);

    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 620, 280, 0x0a1628, 0.72)
      .setStrokeStyle(2, 0xffd166, 0.5);

    this.add
      .text(GAME_WIDTH / 2, 160, "Secret of the Tidal Door", {
        fontSize: "36px",
        color: "#f1faee",
        fontFamily: "Georgia, serif",
        align: "center",
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        220,
        "A beach adventure for explorers.\nFind the secret house on the water,\nthen the door that leads under the sea.",
        {
          fontSize: "16px",
          color: "#a8dadc",
          fontFamily: "system-ui, sans-serif",
          align: "center",
          lineSpacing: 6,
        },
      )
      .setOrigin(0.5);

    const btn = this.add
      .rectangle(GAME_WIDTH / 2, 320, 220, 52, 0x2a9d8f, 1)
      .setStrokeStyle(2, 0xffffff, 0.4)
      .setInteractive({ useHandCursor: true });

    const btnLabel = this.add
      .text(GAME_WIDTH / 2, 320, "Start Adventure", {
        fontSize: "20px",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5);

    const start = () => {
      this.scene.start("CharacterSelect");
    };

    btn.on("pointerover", () => btn.setFillStyle(0x3cb8a8));
    btn.on("pointerout", () => btn.setFillStyle(0x2a9d8f));
    btn.on("pointerdown", start);
    btnLabel.setInteractive({ useHandCursor: true }).on("pointerdown", start);

    this.add
      .text(
        GAME_WIDTH / 2,
        400,
        "Move: WASD / Arrows  ·  Dodge jump: Space / Shift  ·  Touch: stick + JUMP DODGE",
        {
          fontSize: "13px",
          color: "#e9c46a",
          fontFamily: "system-ui, sans-serif",
        },
      )
      .setOrigin(0.5);

    this.input.keyboard?.once("keydown-ENTER", start);
    this.input.keyboard?.once("keydown-SPACE", start);
  }
}
