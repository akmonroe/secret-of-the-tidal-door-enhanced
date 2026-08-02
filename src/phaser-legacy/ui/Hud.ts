import Phaser from "phaser";
import type { Player } from "../entities/Player";

export class Hud {
  private hearts: Phaser.GameObjects.Text;
  private objective: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text;
  private startTime: number;

  constructor(scene: Phaser.Scene, objective: string) {
    this.startTime = scene.time.now;

    scene.add
      .rectangle(8, 8, 360, 78, 0x0a1628, 0.55)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(900)
      .setStrokeStyle(1, 0xffffff, 0.15);

    this.hearts = scene.add
      .text(18, 16, "", {
        fontSize: "18px",
        color: "#ff6b6b",
        fontFamily: "system-ui, sans-serif",
      })
      .setScrollFactor(0)
      .setDepth(901);

    this.objective = scene.add
      .text(18, 40, objective, {
        fontSize: "14px",
        color: "#f1faee",
        fontFamily: "system-ui, sans-serif",
        wordWrap: { width: 340 },
      })
      .setScrollFactor(0)
      .setDepth(901);

    this.hint = scene.add
      .text(scene.cameras.main.width / 2, 16, "", {
        fontSize: "13px",
        color: "#ffd166",
        fontFamily: "system-ui, sans-serif",
        backgroundColor: "#00000088",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(901)
      .setAlpha(0);

    this.timerText = scene.add
      .text(scene.cameras.main.width - 16, 16, "0:00", {
        fontSize: "16px",
        color: "#a8dadc",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(901);
  }

  setObjective(text: string): void {
    this.objective.setText(text);
  }

  showHint(text: string, durationMs = 3500): void {
    this.hint.setText(text);
    this.hint.setAlpha(1);
    this.hint.scene.tweens.add({
      targets: this.hint,
      alpha: 0,
      delay: durationMs,
      duration: 600,
    });
  }

  update(player: Player): void {
    const full = "♥".repeat(player.hp);
    const empty = "♡".repeat(Math.max(0, player.maxHp - player.hp));
    this.hearts.setText(full + empty);

    const elapsed = Math.floor((player.scene.time.now - this.startTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    this.timerText.setText(`${m}:${s.toString().padStart(2, "0")}`);
  }

  elapsedSeconds(scene: Phaser.Scene): number {
    return Math.floor((scene.time.now - this.startTime) / 1000);
  }
}
