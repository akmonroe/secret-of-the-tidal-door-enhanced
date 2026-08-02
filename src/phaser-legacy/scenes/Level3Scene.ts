import Phaser from "phaser";
import { Player } from "../entities/Player";
import { TouchControls } from "../input/TouchControls";
import { Hud } from "../ui/Hud";
import { setScuba } from "../progress";

/** Underwater level — player wears scuba tank. */
const WORLD_W = 3600;
const WORLD_H = 2600;

export class Level3Scene extends Phaser.Scene {
  private player!: Player;
  private hud!: Hud;
  private touch!: TouchControls;
  private hazards!: Phaser.Physics.Arcade.Group;
  private treasure!: Phaser.Physics.Arcade.Image;
  private won = false;

  constructor() {
    super("Level3");
  }

  create(): void {
    this.won = false;
    setScuba(this, true);

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBackgroundColor("#0a3d5c");

    this.buildSeafloor();
    this.spawnHazards();

    // Enter near airlock / portal residue (south)
    this.player = new Player(this, WORLD_W * 0.2, WORLD_H - 300, { scuba: true });
    this.player.inWater = true;
    // Deliberate undersea pace with a bit of glide (see Player scuba accel)
    this.player.scubaSpeed = 118;
    this.player.swimSpeed = 118;
    this.player.grantInvulnerability(1500);
    this.touch = new TouchControls(this);
    this.player.attachTouch(this.touch);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    // Cool underwater tint
    this.cameras.main.setBackgroundColor("#0b4f6c");

    this.treasure = this.physics.add.staticImage(WORLD_W - 420, 380, "treasure");
    this.treasure.setScale(1.6).setDepth(8);
    this.treasure.refreshBody();

    this.add
      .text(WORLD_W - 420, 330, "Sunken Chest", {
        fontSize: "14px",
        color: "#ffd166",
        fontFamily: "system-ui, sans-serif",
        backgroundColor: "#00000066",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(9);

    this.physics.add.overlap(this.player, this.treasure, () => this.completeLevel(), undefined, this);
    this.physics.add.overlap(
      this.player,
      this.hazards,
      this.onHazardHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.hud = new Hud(
      this,
      "Level 3: Scuba dive! Reach the sunken chest.",
    );
    this.time.delayedCall(600, () =>
      this.hud.showHint("Your scuba tank lets you breathe under the sea. Watch for sea creatures!"),
    );
    this.time.delayedCall(14000, () =>
      this.hud.showHint("The glowing chest lies to the north-east…"),
    );

    // Continuous scuba bubbles from tank
    this.time.addEvent({
      delay: 280,
      loop: true,
      callback: () => this.scubaBubbles(),
    });
  }

  private buildSeafloor(): void {
    const tile = 64;
    for (let y = 0; y < WORLD_H; y += tile) {
      for (let x = 0; x < WORLD_W; x += tile) {
        // Deeper water look using seafloor + dark water blend
        const key = (x + y) % 128 < 64 ? "seafloor" : "water";
        this.add.image(x + tile / 2, y + tile / 2, key).setDepth(0).setAlpha(key === "water" ? 0.55 : 0.95);
      }
    }
    // Blue overlay for depth
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x0077b6, 0.18).setDepth(1);

    // Coral gardens + rocks
    for (let i = 0; i < 40; i++) {
      const x = 150 + Math.random() * (WORLD_W - 300);
      const y = 150 + Math.random() * (WORLD_H - 300);
      const key = Math.random() > 0.5 ? "coral" : "coral_b";
      this.add.image(x, y, key).setDepth(4).setScale(0.8 + Math.random() * 0.7).setAlpha(0.95);
    }
    for (let i = 0; i < 20; i++) {
      this.add
        .image(200 + Math.random() * (WORLD_W - 400), 200 + Math.random() * (WORLD_H - 400), "rock")
        .setDepth(4)
        .setScale(0.8 + Math.random() * 0.6);
    }

    // Breadcrumb shells toward treasure
    const path = [
      [800, 2200],
      [1200, 1900],
      [1600, 1500],
      [2100, 1100],
      [2600, 800],
      [3000, 500],
    ];
    for (const [x, y] of path) {
      this.add.image(x, y, "shell").setDepth(3).setScale(1.4);
      this.add.image(x + 30, y - 20, "fish").setDepth(5).setScale(1.1).setAlpha(0.7);
    }
  }

  private spawnHazards(): void {
    this.hazards = this.physics.add.group();

    const sharks: [number, number, number][] = [
      [900, 2000, 500],
      [1500, 1600, 450],
      [2200, 1200, 520],
      [2800, 700, 400],
      [1800, 900, 380],
      [1100, 1300, 420],
      [2500, 1800, 480],
    ];
    for (const [x, y, range] of sharks) {
      this.addPatrol("shark", x, y, range, 65 + Math.random() * 25);
    }

    const jellies: [number, number][] = [
      [700, 2100],
      [1400, 1700],
      [2000, 1300],
      [2700, 900],
      [3200, 500],
      [1600, 600],
      [1000, 1000],
      [2400, 400],
      [1900, 2000],
      [3000, 1400],
    ];
    for (const [x, y] of jellies) {
      this.addDrift("jelly", x, y, 35 + Math.random() * 25);
    }

    // Friendly fish (no damage) as decoration group handled separately via images in path
  }

  private addPatrol(key: string, x: number, y: number, range: number, speed: number): void {
    const sprite = this.hazards.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    sprite.setDepth(12);
    sprite.setData("kind", "patrol");
    sprite.setData("ox", x);
    sprite.setData("oy", y);
    sprite.setData("range", range);
    sprite.setData("speed", speed);
    sprite.setData("t", Math.random() * Math.PI * 2);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setCircle(Math.min(sprite.width, sprite.height) * 0.28);
  }

  private addDrift(key: string, x: number, y: number, speed: number): void {
    const sprite = this.hazards.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    sprite.setDepth(11);
    sprite.setData("kind", "drift");
    sprite.setData("speed", speed);
    sprite.setData("t", Math.random() * 100);
    (sprite.body as Phaser.Physics.Arcade.Body).setCircle(12);
  }

  private onHazardHit(
    _p: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    hazardObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ): void {
    if (this.won) return;
    const hazard = hazardObj as Phaser.Physics.Arcade.Sprite;
    this.player.hit(1, new Phaser.Math.Vector2(hazard.x, hazard.y));
    if (this.player.hp <= 0) {
      this.cameras.main.fade(400, 5, 20, 40);
      this.time.delayedCall(450, () => this.scene.restart());
    }
  }

  private completeLevel(): void {
    if (this.won) return;
    this.won = true;
    this.player.setVelocity(0, 0);
    this.hud.showHint("You found the sunken treasure!", 5000);
    this.cameras.main.flash(500, 255, 220, 100);
    this.time.delayedCall(1400, () => {
      this.scene.start("Story", { chapter: 4 });
    });
  }

  private scubaBubbles(): void {
    if (!this.player?.active) return;
    // Bubbles stream upward from tank (behind-right of player)
    const ang = this.player.rotation - Math.PI / 2;
    const bx = this.player.x - Math.cos(ang) * 10 + Math.sin(ang) * 12;
    const by = this.player.y - Math.sin(ang) * 10 - Math.cos(ang) * 12;
    const b = this.add.image(bx, by, "bubble").setDepth(15).setAlpha(0.75).setScale(0.8 + Math.random() * 0.5);
    this.tweens.add({
      targets: b,
      y: by - 50 - Math.random() * 30,
      x: bx + Phaser.Math.Between(-15, 15),
      alpha: 0,
      duration: 900 + Math.random() * 400,
      onComplete: () => b.destroy(),
    });
  }

  update(_time: number, delta: number): void {
    if (this.won) return;
    this.player.inWater = true; // always swimming with scuba
    this.updateHazards(delta);
    this.hud.update(this.player);

    const d = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.treasure.x,
      this.treasure.y,
    );
    if (d < 450 && d > 100 && Math.random() < 0.003) {
      this.hud.showHint("The chest is close — your tank still has air!", 2200);
    }
  }

  private updateHazards(delta: number): void {
    const dt = delta / 1000;
    for (const obj of this.hazards.getChildren()) {
      const s = obj as Phaser.Physics.Arcade.Sprite;
      const kind = s.getData("kind") as string;
      if (kind === "patrol") {
        const t = (s.getData("t") as number) + dt * (s.getData("speed") as number) * 0.01;
        s.setData("t", t);
        const range = s.getData("range") as number;
        const ox = s.getData("ox") as number;
        const oy = s.getData("oy") as number;
        const nx = ox + Math.cos(t) * range;
        const ny = oy + Math.sin(t * 0.85) * range * 0.55;
        const vx = nx - s.x;
        const vy = ny - s.y;
        s.setPosition(nx, ny);
        if (Math.abs(vx) + Math.abs(vy) > 0.1) s.setRotation(Math.atan2(vy, vx));
        (s.body as Phaser.Physics.Arcade.Body).reset(nx, ny);
      } else if (kind === "drift") {
        const t = (s.getData("t") as number) + dt;
        s.setData("t", t);
        const speed = s.getData("speed") as number;
        s.x += Math.sin(t * 0.7) * speed * dt * 0.45;
        s.y += Math.cos(t * 0.5) * speed * dt * 0.4;
        if (s.x < 40) s.x = WORLD_W - 40;
        if (s.x > WORLD_W - 40) s.x = 40;
        if (s.y < 40) s.y = WORLD_H - 40;
        if (s.y > WORLD_H - 40) s.y = 40;
        (s.body as Phaser.Physics.Arcade.Body).reset(s.x, s.y);
      }
    }
  }
}
