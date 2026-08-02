import Phaser from "phaser";
import { Player } from "../entities/Player";
import { TouchControls } from "../input/TouchControls";
import { Hud } from "../ui/Hud";

/** World: beach south, ocean north/west/east, secret house far NE on water. */
const WORLD_W = 4200;
const WORLD_H = 3200;
const BEACH_Y = 2400; // sand starts below this line (higher y = south)

export class Level1Scene extends Phaser.Scene {
  private player!: Player;
  private hud!: Hud;
  private touch!: TouchControls;
  private hazards!: Phaser.Physics.Arcade.Group;
  private houseDoor!: Phaser.GameObjects.Zone;
  private houseSprite!: Phaser.GameObjects.Image;
  private won = false;

  constructor() {
    super("Level1");
  }

  create(): void {
    this.won = false;
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBackgroundColor("#1a6b8a");

    this.buildTerrain();
    this.placeDecor();
    this.spawnHazards();

    // Start on beach, south-center
    this.player = new Player(this, WORLD_W * 0.35, WORLD_H - 280);
    this.player.grantInvulnerability(800);
    this.touch = new TouchControls(this);
    this.player.attachTouch(this.touch);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);

    // House door hit zone
    this.houseDoor = this.add.zone(3520, 620, 40, 48);
    this.physics.add.existing(this.houseDoor, true);

    this.physics.add.overlap(
      this.player,
      this.houseDoor,
      () => this.completeLevel(),
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.hazards,
      this.onHazardHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.hud = new Hud(
      this,
      "Level 1: Find the secret house out on the water",
    );
    this.time.delayedCall(800, () =>
      this.hud.showHint("Swim north-east… something sits on stilts in the waves."),
    );
    this.time.delayedCall(12000, () =>
      this.hud.showHint("Avoid sharks, jellies, and rays. Hearts are your strength!"),
    );

    this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => this.spawnBubble(),
    });

    // Gentle water shimmer on camera
    this.tweens.addCounter({
      from: 0,
      to: 100,
      duration: 4000,
      yoyo: true,
      repeat: -1,
    });
  }

  private buildTerrain(): void {
    // Tile sand / shallow / deep water
    const tile = 64;
    const hasSandVariants =
      this.textures.exists("sand_b") && this.textures.exists("sand_c");
    for (let y = 0; y < WORLD_H; y += tile) {
      for (let x = 0; x < WORLD_W; x += tile) {
        let key = "water";
        if (y >= BEACH_Y + 80) {
          if (hasSandVariants) {
            const h = ((x * 13 + y * 7) >>> 0) % 3;
            key = h === 0 ? "sand" : h === 1 ? "sand_b" : "sand_c";
          } else {
            key = "sand";
          }
        } else if (y >= BEACH_Y - 40) key = "shallow";
        else if (y >= BEACH_Y - 200) key = "shallow";
        // lagoon pockets near house stay deep
        this.add.image(x + tile / 2, y + tile / 2, key).setDepth(0);
      }
    }
  }

  private placeDecor(): void {
    // Palms along beach
    const palmSpots = [
      [400, 2680],
      [700, 2750],
      [1100, 2620],
      [1500, 2800],
      [1900, 2700],
      [2300, 2780],
      [900, 2900],
      [1700, 2950],
    ];
    const palmKey = (i: number) =>
      this.textures.exists("palm_b") && i % 2 === 1 ? "palm_b" : "palm";
    palmSpots.forEach(([x, y], i) => {
      this.add
        .image(x, y, palmKey(i))
        .setDepth(5)
        .setScale(0.9 + Math.random() * 0.3);
    });

    // Rocks in shallows
    const rockKey = (i: number) =>
      this.textures.exists("rock_b") && i % 2 === 1 ? "rock_b" : "rock";
    for (let i = 0; i < 24; i++) {
      const x = 200 + Math.random() * (WORLD_W - 400);
      const y = BEACH_Y - 100 + Math.random() * 180;
      this.add
        .image(x, y, rockKey(i))
        .setDepth(4)
        .setScale(0.7 + Math.random() * 0.5);
    }

    // Shells / driftwood breadcrumbs leading NE
    const path = [
      [1400, 2500],
      [1600, 2300],
      [1850, 2050],
      [2100, 1800],
      [2400, 1550],
      [2700, 1300],
      [3000, 1050],
      [3200, 850],
      [3400, 700],
    ];
    for (const [x, y] of path) {
      this.add.image(x, y, "shell").setDepth(3).setScale(1.2);
      this.add.image(x + 40, y + 20, "driftwood").setDepth(3).setAngle(-20 + Math.random() * 40);
    }

    // Secret house
    this.houseSprite = this.add.image(3500, 600, "house").setDepth(15).setScale(1.35);
    this.add
      .text(3500, 520, "Secret House", {
        fontSize: "14px",
        color: "#ffd166",
        fontFamily: "system-ui, sans-serif",
        backgroundColor: "#00000066",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(16);

    // Small islands / sandbars as rest spots
    for (const [ix, iy] of [
      [900, 1600],
      [1800, 1200],
      [2600, 900],
      [1200, 900],
    ] as [number, number][]) {
      for (let dy = -40; dy <= 40; dy += 32) {
        for (let dx = -60; dx <= 60; dx += 32) {
          if (dx * dx + dy * dy < 55 * 55) {
            this.add.image(ix + dx, iy + dy, "sand").setDepth(1).setAlpha(0.95);
          }
        }
      }
      this.add.image(ix, iy - 10, "palm").setDepth(5).setScale(0.7);
    }

    // Soft fog of distance: darken far water with semi tiles near house approach
    this.add
      .rectangle(WORLD_W / 2, 400, WORLD_W, 900, 0x0d3b4c, 0.12)
      .setDepth(2);
  }

  private spawnHazards(): void {
    this.hazards = this.physics.add.group({ runChildUpdate: false });

    const sharks: [number, number, number, number][] = [
      [800, 2000, 600, 0],
      [1600, 1700, 500, 80],
      [2400, 1400, 700, -40],
      [3000, 1000, 450, 60],
      [2000, 800, 550, 0],
      [1000, 1200, 400, 100],
      [2800, 1800, 500, -70],
    ];
    for (const [x, y, range, angleOff] of sharks) {
      this.addPatrol("shark", x, y, range, 70 + Math.random() * 30, angleOff, 1.1);
    }

    const jellies: [number, number][] = [
      [600, 1900],
      [1300, 1500],
      [2100, 1100],
      [2900, 750],
      [1700, 600],
      [2500, 1600],
      [900, 1000],
      [3200, 1300],
      [1500, 2000],
      [2700, 500],
    ];
    for (const [x, y] of jellies) {
      this.addDrift("jelly", x, y, 40 + Math.random() * 30);
    }

    const rays: [number, number, number][] = [
      [1100, 1800, 400],
      [2200, 1300, 350],
      [3100, 900, 300],
      [1900, 950, 420],
      [1400, 700, 280],
    ];
    for (const [x, y, range] of rays) {
      this.addPatrol("ray", x, y, range, 55, 90, 0.95);
    }
  }

  private addPatrol(
    key: string,
    x: number,
    y: number,
    range: number,
    speed: number,
    angleDeg: number,
    scale: number,
  ): void {
    const sprite = this.hazards.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    sprite.setScale(scale);
    sprite.setDepth(12);
    sprite.setData("kind", "patrol");
    sprite.setData("ox", x);
    sprite.setData("oy", y);
    sprite.setData("range", range);
    sprite.setData("speed", speed);
    sprite.setData("angle", Phaser.Math.DegToRad(angleDeg));
    sprite.setData("t", Math.random() * Math.PI * 2);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setCircle(Math.min(sprite.width, sprite.height) * 0.28 * scale);
  }

  private addDrift(key: string, x: number, y: number, speed: number): void {
    const sprite = this.hazards.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    sprite.setDepth(11);
    sprite.setData("kind", "drift");
    sprite.setData("speed", speed);
    sprite.setData("t", Math.random() * 100);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setCircle(12);
  }

  private onHazardHit(
    _playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    hazardObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ): void {
    if (this.won) return;
    const hazard = hazardObj as Phaser.Physics.Arcade.Sprite;
    this.player.hit(1, new Phaser.Math.Vector2(hazard.x, hazard.y));
    if (this.player.hp <= 0) {
      this.playerDied();
    }
  }

  private playerDied(): void {
    this.cameras.main.fade(400, 10, 20, 40);
    this.time.delayedCall(450, () => {
      this.scene.restart();
    });
  }

  private completeLevel(): void {
    if (this.won) return;
    // Must be close enough to door (overlap is enough)
    const dist = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.houseSprite.x,
      this.houseSprite.y + 30,
    );
    if (dist > 90) return;

    this.won = true;
    this.player.setVelocity(0, 0);
    this.hud.showHint("You reached the secret house!", 5000);
    this.cameras.main.flash(400, 255, 220, 120);
    this.time.delayedCall(1200, () => {
      this.scene.start("Story", { chapter: 2 });
    });
  }

  private spawnBubble(): void {
    if (!this.player.inWater) return;
    // Soft ambient bubbles while swimming (player also pulses on water enter)
    const moving = this.player.body
      ? (this.player.body as Phaser.Physics.Arcade.Body).velocity.length() > 20
      : false;
    const b = this.add
      .image(
        this.player.x + Phaser.Math.Between(-18, 18),
        this.player.y + Phaser.Math.Between(4, 14),
        "bubble",
      )
      .setDepth(10)
      .setAlpha(moving ? 0.75 : 0.45)
      .setScale(0.6 + Math.random() * 0.5);
    this.tweens.add({
      targets: b,
      y: b.y - (moving ? 50 : 32),
      x: b.x + Phaser.Math.Between(-12, 12),
      alpha: 0,
      duration: moving ? 900 : 1400,
      onComplete: () => b.destroy(),
    });
  }

  update(_time: number, delta: number): void {
    if (this.won) return;

    // Water vs beach
    this.player.inWater = this.player.y < BEACH_Y + 20;
    // Sandbar rest spots (approx)
    for (const [ix, iy] of [
      [900, 1600],
      [1800, 1200],
      [2600, 900],
      [1200, 900],
    ] as [number, number][]) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, ix, iy) < 70) {
        this.player.inWater = false;
      }
    }

    // House deck is walkable
    if (
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.houseSprite.x,
        this.houseSprite.y + 20,
      ) < 70
    ) {
      this.player.inWater = false;
    }

    this.updateHazards(delta);
    this.hud.update(this.player);

    // Proximity hints
    const dHouse = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.houseSprite.x,
      this.houseSprite.y,
    );
    if (dHouse < 400 && dHouse > 120 && Math.random() < 0.002) {
      this.hud.showHint("The house on stilts is close!", 2500);
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
        const angle = s.getData("angle") as number;
        const ox = s.getData("ox") as number;
        const oy = s.getData("oy") as number;
        const nx = ox + Math.cos(t) * range * Math.cos(angle);
        const ny = oy + Math.sin(t) * range * Math.sin(angle) + Math.sin(t) * range * 0.35;
        const body = s.body as Phaser.Physics.Arcade.Body;
        const vx = nx - s.x;
        const vy = ny - s.y;
        s.setPosition(nx, ny);
        if (Math.abs(vx) + Math.abs(vy) > 0.1) {
          s.setRotation(Math.atan2(vy, vx));
        }
        body.reset(nx, ny);
      } else if (kind === "drift") {
        const t = (s.getData("t") as number) + dt;
        s.setData("t", t);
        const speed = s.getData("speed") as number;
        s.x += Math.sin(t * 0.7) * speed * dt * 0.4;
        s.y += Math.cos(t * 0.5) * speed * dt * 0.35;
        if (s.x < 40) s.x = WORLD_W - 40;
        if (s.x > WORLD_W - 40) s.x = 40;
        if (s.y < 40) s.y = BEACH_Y - 40;
        if (s.y > BEACH_Y) s.y = 80;
        s.setScale(1 + Math.sin(t * 2) * 0.08);
        (s.body as Phaser.Physics.Arcade.Body).reset(s.x, s.y);
      }
    }
  }
}
