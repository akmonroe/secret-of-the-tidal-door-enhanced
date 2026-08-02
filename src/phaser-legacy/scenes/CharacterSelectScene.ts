import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";
import { setCharacter, type CharacterId } from "../progress";

export class CharacterSelectScene extends Phaser.Scene {
  private selected: CharacterId = "girl";
  private boyCard!: Phaser.GameObjects.Container;
  private girlCard!: Phaser.GameObjects.Container;

  constructor() {
    super("CharacterSelect");
  }

  create(): void {
    // Backdrop
    for (let y = 0; y < GAME_HEIGHT; y += 64) {
      for (let x = 0; x < GAME_WIDTH; x += 64) {
        const key =
          y < GAME_HEIGHT * 0.4 ? "water" : y < GAME_HEIGHT * 0.52 ? "shallow" : "sand";
        this.add.image(x + 32, y + 32, key).setAlpha(0.9);
      }
    }
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a1628, 0.45).setOrigin(0);

    this.add
      .text(GAME_WIDTH / 2, 48, "Who is exploring today?", {
        fontSize: "30px",
        color: "#f1faee",
        fontFamily: "Georgia, serif",
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 88, "Pick a girl or a boy adventurer", {
        fontSize: "15px",
        color: "#a8dadc",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5);

    this.girlCard = this.makeCard(GAME_WIDTH / 2 - 160, 280, "girl", "Girl");
    this.boyCard = this.makeCard(GAME_WIDTH / 2 + 160, 280, "boy", "Boy");

    this.selected = "girl";
    this.refreshSelection();

    const startBtn = this.add
      .rectangle(GAME_WIDTH / 2, 460, 240, 50, 0x2a9d8f, 1)
      .setStrokeStyle(2, 0xffffff, 0.4)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(GAME_WIDTH / 2, 460, "Start Adventure", {
        fontSize: "18px",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5);

    const go = () => {
      setCharacter(this, this.selected);
      this.registry.set("scuba", false);
      this.scene.start("Story", { chapter: 1 });
    };

    startBtn.on("pointerover", () => startBtn.setFillStyle(0x3cb8a8));
    startBtn.on("pointerout", () => startBtn.setFillStyle(0x2a9d8f));
    startBtn.on("pointerdown", go);
    this.input.keyboard?.once("keydown-ENTER", go);
  }

  private makeCard(
    x: number,
    y: number,
    id: CharacterId,
    label: string,
  ): Phaser.GameObjects.Container {
    const bg = this.add
      .rectangle(0, 0, 200, 240, 0x0a1628, 0.8)
      .setStrokeStyle(3, 0xffffff, 0.25);

    const tex = `player_${id}`;
    const preview = this.add.image(0, -20, tex).setScale(2.4);

    // Gentle idle bob for preview
    this.tweens.add({
      targets: preview,
      y: -28,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const name = this.add
      .text(0, 90, label, {
        fontSize: "22px",
        color: "#ffd166",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5);

    const hint = this.add
      .text(0, 118, id === "girl" ? "Teal dress · braid" : "Ocean tee · short hair", {
        fontSize: "12px",
        color: "#a8dadc",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5);

    const card = this.add.container(x, y, [bg, preview, name, hint]);
    card.setSize(200, 240);
    card.setInteractive(
      new Phaser.Geom.Rectangle(-100, -120, 200, 240),
      Phaser.Geom.Rectangle.Contains,
    );
    card.on("pointerdown", () => {
      this.selected = id;
      this.refreshSelection();
    });
    card.on("pointerover", () => {
      this.tweens.add({ targets: card, scale: 1.04, duration: 100 });
    });
    card.on("pointerout", () => {
      this.tweens.add({ targets: card, scale: 1, duration: 100 });
    });
    return card;
  }

  private refreshSelection(): void {
    const style = (
      card: Phaser.GameObjects.Container,
      id: CharacterId,
    ) => {
      const bg = card.list[0] as Phaser.GameObjects.Rectangle;
      const on = this.selected === id;
      bg.setStrokeStyle(3, on ? 0xffd166 : 0xffffff, on ? 0.95 : 0.25);
      bg.setFillStyle(0x0a1628, on ? 0.92 : 0.75);
    };
    style(this.girlCard, "girl");
    style(this.boyCard, "boy");
  }
}
