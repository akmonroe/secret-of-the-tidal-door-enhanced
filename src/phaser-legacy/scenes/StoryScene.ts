import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";
import { setScuba } from "../progress";

const CHAPTERS: Record<
  number,
  { title: string; body: string; next: string; scuba?: boolean }
> = {
  1: {
    title: "Level 1 — The Secret House",
    body:
      "You wake on a warm beach. Locals whisper about a doorway into the ocean — " +
      "hidden inside a secret house built far out on the water.\n\n" +
      "Swim carefully. Sharks, jellies, and rays patrol the deep.\n" +
      "Find the house on the stilts. Reach its front door.",
    next: "Level1",
  },
  2: {
    title: "Level 2 — Birds of the Hidden Door",
    body:
      "Inside the house, salt air and creaking wood fill the rooms.\n\n" +
      "Pelicans and gulls nest in the rafters — they guard the true secret: " +
      "a glowing door that opens into the undersea world.\n\n" +
      "Slip past the birds. Find the tidal door.",
    next: "Level2",
  },
  3: {
    title: "Level 3 — Scuba Under the Sea",
    body:
      "The Tidal Door opens onto a rack of ready scuba gear!\n\n" +
      "You strap on a tank, mask, and wetsuit. Now you can breathe under the waves " +
      "and explore the blue world below.\n\n" +
      "Dive carefully. Find the sunken treasure chest among the coral.",
    next: "Level3",
    scuba: true,
  },
  4: {
    title: "Adventure Complete!",
    body:
      "With your scuba tank humming and bubbles rising, you open the sunken chest.\n" +
      "Gold coins, sea glass, and a map to even deeper reefs spill into the sand.\n\n" +
      "You made it from the beach, through the secret house, and under the sea.\n" +
      "What a dive!",
    next: "Menu",
  },
};

export class StoryScene extends Phaser.Scene {
  constructor() {
    super("Story");
  }

  create(data: { chapter?: number }): void {
    const chapter = data.chapter ?? 1;
    const info = CHAPTERS[chapter] ?? CHAPTERS[1];

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a1628, 1).setOrigin(0);

    for (let x = 0; x < GAME_WIDTH; x += 64) {
      this.add.image(x + 32, GAME_HEIGHT - 32, chapter >= 3 ? "seafloor" : "water").setAlpha(0.55);
    }

    if (chapter === 3 && this.textures.exists("player_boy_scuba")) {
      this.add.image(GAME_WIDTH / 2, 400, "player_girl_scuba").setScale(1.8).setAlpha(0.9);
    }

    this.add
      .text(GAME_WIDTH / 2, 70, info.title, {
        fontSize: "28px",
        color: "#ffd166",
        fontFamily: "Georgia, serif",
        align: "center",
        wordWrap: { width: 800 },
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 230, info.body, {
        fontSize: "17px",
        color: "#f1faee",
        fontFamily: "system-ui, sans-serif",
        align: "center",
        lineSpacing: 8,
        wordWrap: { width: 720 },
      })
      .setOrigin(0.5);

    const label = chapter === 4 ? "Back to Menu" : "Continue";
    const btn = this.add
      .rectangle(GAME_WIDTH / 2, 440, 200, 48, 0x457b9d, 1)
      .setStrokeStyle(2, 0xffffff, 0.35)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(GAME_WIDTH / 2, 440, label, {
        fontSize: "18px",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5);

    const go = () => {
      if (info.scuba) setScuba(this, true);
      if (info.next === "Menu") {
        setScuba(this, false);
        this.scene.start("Menu");
      } else {
        this.scene.start(info.next);
      }
    };

    btn.on("pointerdown", go);
    this.input.keyboard?.once("keydown-ENTER", go);
    this.input.keyboard?.once("keydown-SPACE", go);
    this.time.delayedCall(400, () => {
      this.input.once("pointerdown", go);
    });
  }
}
