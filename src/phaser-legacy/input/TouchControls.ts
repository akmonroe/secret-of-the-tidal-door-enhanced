import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";

/**
 * On-screen virtual joystick (left) + dodge button (right).
 * Keyboard still works via cursors/WASD/Space in Player.
 */
export class TouchControls {
  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;
  private dodgeBtn: Phaser.GameObjects.Container;
  private dodgeCircle: Phaser.GameObjects.Arc;
  private dodgeLabel: Phaser.GameObjects.Text;
  private pointerId: number | null = null;
  private originX: number;
  private originY: number;
  private readonly maxRadius = 52;
  private dodgeRequested = false;
  private dodgeReady = true;

  vector = new Phaser.Math.Vector2(0, 0);
  active = false;

  constructor(scene: Phaser.Scene) {
    this.originX = 100;
    this.originY = GAME_HEIGHT - 100;

    this.base = scene.add
      .circle(this.originX, this.originY, 60, 0xffffff, 0.18)
      .setScrollFactor(0)
      .setDepth(1000)
      .setStrokeStyle(3, 0xffffff, 0.35);

    this.thumb = scene.add
      .circle(this.originX, this.originY, 28, 0xffffff, 0.4)
      .setScrollFactor(0)
      .setDepth(1001);

    scene.add
      .text(this.originX, this.originY + 72, "DRAG TO MOVE", {
        fontSize: "11px",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(0.55);

    // Dodge / jump button — right side
    const bx = GAME_WIDTH - 100;
    const by = GAME_HEIGHT - 100;

    this.dodgeCircle = scene.add
      .circle(0, 0, 48, 0xffd166, 0.35)
      .setStrokeStyle(3, 0xffffff, 0.5);

    this.dodgeLabel = scene.add
      .text(0, 0, "JUMP\nDODGE", {
        fontSize: "13px",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
        align: "center",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.dodgeBtn = scene.add
      .container(bx, by, [this.dodgeCircle, this.dodgeLabel])
      .setScrollFactor(0)
      .setDepth(1001)
      .setSize(96, 96)
      .setInteractive(
        new Phaser.Geom.Circle(0, 0, 52),
        Phaser.Geom.Circle.Contains,
      );

    scene.add
      .text(bx, by + 62, "or SPACE", {
        fontSize: "11px",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(0.5);

    this.dodgeBtn.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation?.();
      if (!this.dodgeReady) return;
      this.dodgeRequested = true;
      this.dodgeCircle.setFillStyle(0xffd166, 0.7);
      scene.tweens.add({
        targets: this.dodgeBtn,
        scale: 0.9,
        duration: 80,
        yoyo: true,
      });
    });

    this.dodgeBtn.on("pointerup", () => {
      this.dodgeCircle.setFillStyle(0xffd166, this.dodgeReady ? 0.35 : 0.15);
    });

    scene.input.on("pointerdown", this.onDown, this);
    scene.input.on("pointermove", this.onMove, this);
    scene.input.on("pointerup", this.onUp, this);
    scene.input.on("pointerupoutside", this.onUp, this);
  }

  /** Player calls this each frame / after dodge. */
  setDodgeReady(ready: boolean): void {
    this.dodgeReady = ready;
    this.dodgeCircle.setFillStyle(0xffd166, ready ? 0.35 : 0.12);
    this.dodgeCircle.setStrokeStyle(3, 0xffffff, ready ? 0.5 : 0.2);
    this.dodgeLabel.setAlpha(ready ? 1 : 0.4);
  }

  notifyDodgeUsed(): void {
    this.dodgeRequested = false;
    this.setDodgeReady(false);
  }

  /** One-shot: true if user pressed dodge since last check. */
  consumeDodgeRequest(): boolean {
    if (!this.dodgeRequested) return false;
    this.dodgeRequested = false;
    return true;
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    // Only left half of screen starts the stick (dodge button is on the right)
    if (pointer.x > GAME_WIDTH * 0.45) return;
    if (this.pointerId !== null) return;
    this.pointerId = pointer.id;
    this.active = true;
    this.originX = pointer.x;
    this.originY = pointer.y;
    this.base.setPosition(this.originX, this.originY);
    this.thumb.setPosition(this.originX, this.originY);
    this.updateVector(pointer.x, pointer.y);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    this.updateVector(pointer.x, pointer.y);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.active = false;
    this.vector.set(0, 0);
    this.base.setPosition(100, GAME_HEIGHT - 100);
    this.thumb.setPosition(100, GAME_HEIGHT - 100);
    this.originX = 100;
    this.originY = GAME_HEIGHT - 100;
  }

  private updateVector(px: number, py: number): void {
    const dx = px - this.originX;
    const dy = py - this.originY;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(len, this.maxRadius);
    const nx = (dx / len) * clamped;
    const ny = (dy / len) * clamped;
    this.thumb.setPosition(this.originX + nx, this.originY + ny);
    this.vector.set(nx / this.maxRadius, ny / this.maxRadius);
    if (this.vector.length() < 0.15) this.vector.set(0, 0);
  }

  destroy(scene: Phaser.Scene): void {
    scene.input.off("pointerdown", this.onDown, this);
    scene.input.off("pointermove", this.onMove, this);
    scene.input.off("pointerup", this.onUp, this);
    scene.input.off("pointerupoutside", this.onUp, this);
  }
}
