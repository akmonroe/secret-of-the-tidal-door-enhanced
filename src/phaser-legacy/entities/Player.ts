import Phaser from "phaser";
import type { TouchControls } from "../input/TouchControls";
import {
  getCharacter,
  getScuba,
  playerTextureKey,
  type CharacterId,
} from "../progress";

export type PlayerOptions = {
  scuba?: boolean;
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private wasd: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  } | null = null;
  private dodgeKey: Phaser.Input.Keyboard.Key | null = null;
  private dodgeKeyAlt: Phaser.Input.Keyboard.Key | null = null;
  private touch: TouchControls | null = null;
  private invulnUntil = 0;
  private facing = new Phaser.Math.Vector2(0, -1);
  private dodgeUntil = 0;
  private dodgeReadyAt = 0;
  private character: CharacterId;
  private scuba: boolean;
  private wasInWater = false;
  private targetAngle = -Math.PI / 2;
  /** 0 = idle, 1 = full input strength (eased). */
  private moveBlend = 0;
  /** Phase for procedural bob / plant when anims unavailable. */
  private gaitPhase = 0;
  private scubaBubbleAt = 0;
  /** Suppress scale fights while dodge tween runs. */
  private scaleLockedUntil = 0;

  maxHp = 5;
  hp = 5;
  walkSpeed = 175;
  swimSpeed = 115;
  /** Scuba is a bit more deliberate than free-swim. */
  scubaSpeed = 100;
  dodgeSpeed = 420;
  dodgeDuration = 220;
  dodgeCooldown = 650;
  dodgeIFrames = 320;
  inWater = false;
  stunnedUntil = 0;

  /** Land: snappy; water: heavy push then glide. */
  private readonly walkAccel = 1600;
  private readonly walkDecel = 2200;
  private readonly swimAccel = 720;
  private readonly swimDecel = 480;
  private readonly scubaAccel = 580;
  private readonly scubaDecel = 420;
  private readonly turnRate = 11; // rad/s toward facing

  constructor(scene: Phaser.Scene, x: number, y: number, opts: PlayerOptions = {}) {
    const character = getCharacter(scene);
    const scuba = opts.scuba ?? getScuba(scene);
    const tex = playerTextureKey(character, scuba);
    const startKey = scene.textures.exists(tex) ? tex : "player";

    super(scene, x, y, startKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.character = character;
    this.scuba = scuba;

    this.setDepth(20);
    this.setCollideWorldBounds(true);
    this.fitBodyToTexture();

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setDrag(0, 0);
    body.setMaxSpeed(this.walkSpeed + 40);

    this.showIdleTexture();

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasd = {
        up: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
      this.dodgeKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.dodgeKeyAlt = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    }
  }

  attachTouch(touch: TouchControls): void {
    this.touch = touch;
  }

  setScubaMode(on: boolean): void {
    if (this.scuba === on) return;
    this.scuba = on;
    this.anims.stop();
    this.showIdleTexture();
    this.fitBodyToTexture();
  }

  isScuba(): boolean {
    return this.scuba;
  }

  hit(damage = 1, knockFrom?: Phaser.Math.Vector2): void {
    if (this.scene.time.now < this.invulnUntil) return;
    this.hp = Math.max(0, this.hp - damage);
    this.invulnUntil = this.scene.time.now + 1200;
    this.stunnedUntil = this.scene.time.now + 280;
    this.setTint(0xff6666);
    this.scene.time.delayedCall(200, () => {
      if (this.active) this.clearTint();
    });
    if (knockFrom) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      const dir = new Phaser.Math.Vector2(this.x - knockFrom.x, this.y - knockFrom.y)
        .normalize()
        .scale(280);
      body.setVelocity(dir.x, dir.y);
    }
    this.scene.cameras.main.shake(120, 0.006);
  }

  isInvulnerable(): boolean {
    return this.scene.time.now < this.invulnUntil;
  }

  isDodging(): boolean {
    return this.scene.time.now < this.dodgeUntil;
  }

  canDodge(): boolean {
    const now = this.scene.time.now;
    return now >= this.dodgeReadyAt && now >= this.stunnedUntil && !this.isDodging();
  }

  grantInvulnerability(ms: number): void {
    this.invulnUntil = Math.max(this.invulnUntil, this.scene.time.now + ms);
  }

  tryDodge(): boolean {
    if (!this.canDodge()) return false;

    let dx = this.facing.x;
    let dy = this.facing.y;
    const input = this.readMoveInput();
    if (input.x !== 0 || input.y !== 0) {
      const len = Math.hypot(input.x, input.y) || 1;
      dx = input.x / len;
      dy = input.y / len;
      this.facing.set(dx, dy);
    } else {
      const fl = Math.hypot(dx, dy) || 1;
      dx /= fl;
      dy /= fl;
    }

    const inFluid = this.inWater || this.scuba;
    // Water dodge: longer glide, slightly lower peak; land: punchy hop
    const duration = inFluid ? 280 : this.dodgeDuration;
    const burst = inFluid ? this.dodgeSpeed * 0.82 : this.dodgeSpeed;
    const now = this.scene.time.now;
    this.dodgeUntil = now + duration;
    this.dodgeReadyAt = now + this.dodgeCooldown;
    this.invulnUntil = Math.max(this.invulnUntil, now + this.dodgeIFrames);
    this.scaleLockedUntil = now + duration + 40;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setMaxSpeed(burst + 40);
    body.setAcceleration(0, 0);
    body.setDrag(0, 0);
    body.setVelocity(dx * burst, dy * burst);

    this.targetAngle = Math.atan2(dy, dx);
    this.rotation = this.targetAngle + Math.PI / 2;
    this.moveBlend = 1;

    this.anims.stop();
    this.scene.tweens.killTweensOf(this);

    if (inFluid) {
      // Horizontal dash stretch + wake
      this.setScale(1.2, 0.82);
      this.scene.tweens.add({
        targets: this,
        scaleX: 0.95,
        scaleY: 1.05,
        duration: duration * 0.55,
        yoyo: true,
        ease: "Sine.easeOut",
        onComplete: () => {
          if (this.active) this.setScale(1, 1);
        },
      });
      for (let i = 0; i < 4; i++) {
        const drop = this.scene.add
          .circle(
            this.x - dx * 8 + Phaser.Math.Between(-6, 6),
            this.y - dy * 8 + Phaser.Math.Between(-6, 6),
            3 + i,
            0xa8dadc,
            0.45,
          )
          .setDepth(19);
        this.scene.tweens.add({
          targets: drop,
          x: drop.x - dx * 18,
          y: drop.y - dy * 18,
          scale: 2.2,
          alpha: 0,
          duration: 320 + i * 40,
          onComplete: () => drop.destroy(),
        });
      }
    } else {
      // Jump-forward squash / stretch
      this.setScale(1.08, 0.82);
      this.scene.tweens.add({
        targets: this,
        scaleX: 0.88,
        scaleY: 1.28,
        duration: duration * 0.42,
        yoyo: true,
        ease: "Quad.easeOut",
        onComplete: () => {
          if (this.active) this.setScale(1, 1);
        },
      });
      const puff = this.scene.add.circle(this.x, this.y + 10, 6, 0xe9c46a, 0.4).setDepth(19);
      this.scene.tweens.add({
        targets: puff,
        scale: 3.2,
        alpha: 0,
        duration: 260,
        onComplete: () => puff.destroy(),
      });
    }

    if (this.touch) this.touch.notifyDodgeUsed();
    return true;
  }

  private fitBodyToTexture(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const fw = this.frame?.width || this.width || 48;
    const fh = this.frame?.height || this.height || 48;
    const bw = 28;
    const bh = 28;
    body.setSize(bw, bh);
    body.setOffset((fw - bw) / 2, (fh - bh) / 2 + 4);
  }

  private readMoveInput(): { x: number; y: number } {
    let ix = 0;
    let iy = 0;

    if (this.cursors) {
      if (this.cursors.left.isDown || this.wasd?.left.isDown) ix -= 1;
      if (this.cursors.right.isDown || this.wasd?.right.isDown) ix += 1;
      if (this.cursors.up.isDown || this.wasd?.up.isDown) iy -= 1;
      if (this.cursors.down.isDown || this.wasd?.down.isDown) iy += 1;
    }

    if (this.touch && this.touch.vector.lengthSq() > 0) {
      ix = this.touch.vector.x;
      iy = this.touch.vector.y;
    }

    // Clamp so diagonal keys don't exceed unit length, stick keeps analog range
    const len = Math.hypot(ix, iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
    }
    return { x: ix, y: iy };
  }

  private wantsDodge(): boolean {
    if (this.dodgeKey && Phaser.Input.Keyboard.JustDown(this.dodgeKey)) return true;
    if (this.dodgeKeyAlt && Phaser.Input.Keyboard.JustDown(this.dodgeKeyAlt)) return true;
    if (this.touch?.consumeDodgeRequest()) return true;
    return false;
  }

  private topSpeed(): number {
    if (this.scuba) return this.scubaSpeed;
    if (this.inWater) return this.swimSpeed;
    return this.walkSpeed;
  }

  private accelRates(): { accel: number; decel: number } {
    if (this.scuba) return { accel: this.scubaAccel, decel: this.scubaDecel };
    if (this.inWater) return { accel: this.swimAccel, decel: this.swimDecel };
    return { accel: this.walkAccel, decel: this.walkDecel };
  }

  private animKeyForMove(): string | null {
    const c = this.character;
    if (this.scuba) return `${c}_scuba_swim`;
    if (this.inWater) return `${c}_swim`;
    return `${c}_walk`;
  }

  private showIdleTexture(): void {
    const tex = playerTextureKey(this.character, this.scuba);
    const key = this.scene.textures.exists(tex) ? tex : "player";
    if (this.texture.key !== key) {
      this.setTexture(key);
      this.fitBodyToTexture();
    }
  }

  private updateAnimation(moving: boolean): void {
    if (!moving) {
      if (this.anims.isPlaying) this.anims.stop();
      this.showIdleTexture();
      return;
    }

    const anim = this.animKeyForMove();
    if (!anim || !this.scene.anims.exists(anim)) {
      this.showIdleTexture();
      return;
    }

    if (this.anims.currentAnim?.key !== anim) {
      this.play(anim, true);
      this.fitBodyToTexture();
    }

    // Speed-linked rate: walk snappier when faster; swim stroke scales gently
    const body = this.body as Phaser.Physics.Arcade.Body;
    const spd = body.velocity.length();
    const top = this.topSpeed();
    const ratio = Phaser.Math.Clamp(spd / Math.max(40, top), 0.4, 1.4);
    this.anims.timeScale = ratio;
  }

  private updateMotionFeel(time: number, moving: boolean): void {
    if (time < this.scaleLockedUntil) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const spd = body.velocity.length();
    const top = this.topSpeed();
    const speed01 = Phaser.Math.Clamp(spd / Math.max(1, top), 0, 1.2);

    if (!moving || speed01 < 0.08) {
      // Idle breathing — distinct from walk bob
      const breath = Math.sin(time * 0.0038) * 0.018;
      this.setScale(1 + breath * 0.35, 1 + breath);
      return;
    }

    if (this.inWater || this.scuba) {
      // Stroke stretch + soft undulation (not a leg bob)
      this.gaitPhase += 0.011 * (this.scuba ? 0.75 : 1) * Math.max(0.4, speed01);
      const stroke = Math.sin(this.gaitPhase);
      const undulate = Math.sin(this.gaitPhase * 2) * 0.015;
      const stretch = stroke * 0.07 * speed01;
      this.setScale(1 + stretch + undulate, 1 - Math.abs(stretch) * 0.55 + undulate * 0.5);
      // Tiny heading wiggle for fluid feel (on top of smoothed facing)
      this.rotation += Math.sin(this.gaitPhase * 1.5) * 0.012 * speed01;
    } else {
      // Walk: body bob + foot-plant squash, slight lateral sway via scaleX
      this.gaitPhase += 0.018 * Math.max(0.45, speed01);
      // Prefer anim frame for plant timing when available
      const frameIdx = this.anims.currentFrame?.index ?? -1;
      let plant: number;
      if (frameIdx >= 0) {
        // Even frames are plants in our sheet
        plant = frameIdx % 2 === 0 ? 1 : 0.15;
      } else {
        plant = Math.pow(Math.abs(Math.sin(this.gaitPhase)), 1.6);
      }
      const bob = Math.sin(this.gaitPhase) * 0.03 * speed01;
      const squash = plant * 0.055 * speed01;
      const sway = Math.sin(this.gaitPhase) * 0.025 * speed01;
      this.setScale(1 + squash + sway, 1 - squash - bob);
    }
  }

  private onWaterTransition(entering: boolean): void {
    const color = entering ? 0x48cae4 : 0xe9c46a;
    const ring = this.scene.add.circle(this.x, this.y + 6, 10, color, 0.45).setDepth(18);
    this.scene.tweens.add({
      targets: ring,
      scale: 4.2,
      alpha: 0,
      duration: 380,
      ease: "Quad.easeOut",
      onComplete: () => ring.destroy(),
    });
    // Secondary splash drops
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.random();
      const drop = this.scene.add
        .circle(this.x, this.y + 4, 3, color, 0.55)
        .setDepth(18);
      this.scene.tweens.add({
        targets: drop,
        x: this.x + Math.cos(a) * (18 + Math.random() * 14),
        y: this.y + Math.sin(a) * (12 + Math.random() * 10),
        alpha: 0,
        scale: 0.4,
        duration: 280 + Math.random() * 120,
        onComplete: () => drop.destroy(),
      });
    }
    this.scaleLockedUntil = this.scene.time.now + 180;
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scaleX: entering ? 1.14 : 1.08,
      scaleY: entering ? 0.88 : 0.92,
      duration: 90,
      yoyo: true,
      ease: "Quad.easeOut",
      onComplete: () => {
        if (this.active) this.setScale(1, 1);
      },
    });
  }

  private spawnScubaBubble(): void {
    if (!this.scene.textures.exists("bubble")) return;
    // Bubbles rise from tank (slightly behind facing)
    const backX = -this.facing.x * 10 + Phaser.Math.Between(-4, 4);
    const backY = -this.facing.y * 10 + Phaser.Math.Between(-3, 3);
    const b = this.scene.add
      .image(this.x + backX, this.y + backY, "bubble")
      .setDepth(19)
      .setAlpha(0.75)
      .setScale(0.7 + Math.random() * 0.5);
    this.scene.tweens.add({
      targets: b,
      y: b.y - 28 - Math.random() * 18,
      x: b.x + Phaser.Math.Between(-8, 8),
      alpha: 0,
      duration: 700 + Math.random() * 400,
      onComplete: () => b.destroy(),
    });
  }

  /**
   * Ease velocity toward a target (accel when speeding up / turning, decel when stopping).
   * Works well for both digital keys and analog stick magnitude.
   */
  private approachVelocity(tx: number, ty: number, rate: number, dt: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    const dx = tx - vx;
    const dy = ty - vy;
    const dist = Math.hypot(dx, dy);
    const maxStep = rate * dt;
    if (dist <= maxStep || dist < 0.001) {
      body.setVelocity(tx, ty);
      return;
    }
    body.setVelocity(vx + (dx / dist) * maxStep, vy + (dy / dist) * maxStep);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const dt = Math.min(0.05, delta / 1000);

    // Sync scuba flag from registry if parent / scene toggles it
    const regScuba = getScuba(this.scene);
    if (regScuba !== this.scuba) {
      this.setScubaMode(regScuba);
    }

    if (time < this.invulnUntil) {
      const flash = this.isDodging() ? 0.82 : Math.sin(time / 40) > 0 ? 1 : 0.45;
      this.setAlpha(flash);
    } else {
      this.setAlpha(1);
    }

    if (this.wantsDodge()) {
      this.tryDodge();
    }

    if (time < this.dodgeUntil) {
      this.touch?.setDodgeReady(this.canDodge());
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAcceleration(0, 0);
    body.setDrag(0, 0);

    if (time < this.stunnedUntil) {
      this.approachVelocity(0, 0, this.walkDecel, dt);
      this.touch?.setDodgeReady(this.canDodge());
      return;
    }

    // Water enter / leave splash
    if (this.inWater !== this.wasInWater) {
      this.onWaterTransition(this.inWater);
      this.wasInWater = this.inWater;
    }

    const { x: ix, y: iy } = this.readMoveInput();
    const inputLen = Math.hypot(ix, iy);
    const wantMove = inputLen > 0.06;

    // Blend for anim thresholds (separate from physics accel)
    const blendTarget = wantMove ? Math.min(1, inputLen) : 0;
    const blendRate = wantMove ? 8 : 10;
    this.moveBlend += (blendTarget - this.moveBlend) * Math.min(1, blendRate * dt);
    if (Math.abs(this.moveBlend - blendTarget) < 0.001) this.moveBlend = blendTarget;

    const top = this.topSpeed();
    const { accel, decel } = this.accelRates();
    body.setMaxSpeed(top + 30);

    if (wantMove) {
      const nx = ix / inputLen;
      const ny = iy / inputLen;
      this.facing.set(nx, ny);
      this.targetAngle = Math.atan2(ny, nx);

      // Ease-out into speed so kids feel a little punch at the start of a push
      const mag = Math.min(1, inputLen);
      const eased = Phaser.Math.Easing.Cubic.Out(mag * 0.85 + 0.15 * this.moveBlend);
      const speed = top * eased;
      this.approachVelocity(nx * speed, ny * speed, accel, dt);
    } else {
      this.approachVelocity(0, 0, decel, dt);
    }

    // Smooth facing — never snap (except dodge sets instantly)
    const desired = this.targetAngle + Math.PI / 2;
    this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, desired, this.turnRate * dt);

    const moving = this.moveBlend > 0.12 && body.velocity.length() > 12;
    this.updateAnimation(moving);
    this.updateMotionFeel(time, moving);

    // Scuba tank bubble stream (scene may add ambient bubbles too)
    if (this.scuba && time >= this.scubaBubbleAt) {
      this.scubaBubbleAt = time + (moving ? 220 : 480);
      this.spawnScubaBubble();
    }

    this.touch?.setDodgeReady(this.canDodge());
  }
}
