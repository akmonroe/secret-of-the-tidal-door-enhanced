import Phaser from "phaser";
import { Player } from "../entities/Player";
import { TouchControls } from "../input/TouchControls";
import { Hud } from "../ui/Hud";

const WORLD_W = 2400;
const WORLD_H = 1800;

type Rect = { x: number; y: number; w: number; h: number };

export class Level2Scene extends Phaser.Scene {
  private player!: Player;
  private hud!: Hud;
  private touch!: TouchControls;
  private birds!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private portal!: Phaser.Physics.Arcade.Image;
  private won = false;
  private rooms: Rect[] = [];

  constructor() {
    super("Level2");
  }

  create(): void {
    this.won = false;
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBackgroundColor("#2b2118");

    this.buildHouse();
    this.spawnBirds();

    // Enter near front of house (south-west of first room — clear of bird loops)
    this.player = new Player(this, 300, 1620);
    this.player.walkSpeed = 165;
    this.player.grantInvulnerability(1500);
    this.touch = new TouchControls(this);
    this.player.attachTouch(this.touch);

    this.physics.add.collider(this.player, this.walls);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.portal = this.physics.add.staticImage(2000, 280, "portal");
    this.portal.setDepth(8);
    this.portal.setCircle(18);
    this.portal.refreshBody();

    this.physics.add.overlap(this.player, this.portal, () => this.completeLevel(), undefined, this);
    this.physics.add.overlap(
      this.player,
      this.birds,
      this.onBirdHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.hud = new Hud(
      this,
      "Level 2: Avoid the birds. Find the secret ocean door.",
    );
    this.time.delayedCall(600, () =>
      this.hud.showHint("Pelicans and gulls guard the house. Stay quiet and quick."),
    );
    this.time.delayedCall(14000, () =>
      this.hud.showHint("Look for a glowing blue door — the Tidal Door."),
    );

    // Ambient wing flutter labels
    this.add
      .text(400, 1480, "Front Hall", {
        fontSize: "14px",
        color: "#e9c46a",
        fontFamily: "system-ui, sans-serif",
      })
      .setDepth(6)
      .setAlpha(0.7);
  }

  private buildHouse(): void {
    this.walls = this.physics.add.staticGroup();

    // Floor rooms that abut / overlap so the player can walk start → portal.
    // (Previous layout left gaps between rooms and full wall seals — soft-lock.)
    this.rooms = [
      { x: 200, y: 1280, w: 520, h: 420 }, // front hall
      { x: 680, y: 1160, w: 500, h: 400 }, // parlor
      { x: 1140, y: 820, w: 440, h: 520 }, // corridor north
      { x: 380, y: 780, w: 580, h: 400 }, // west wing
      { x: 880, y: 460, w: 640, h: 400 }, // upper hall
      { x: 1480, y: 360, w: 640, h: 500 }, // nest loft
      { x: 1680, y: 120, w: 540, h: 300 }, // secret chamber (portal)
      { x: 200, y: 980, w: 220, h: 320 }, // side nook
      { x: 1540, y: 860, w: 380, h: 300 }, // east gallery
    ];

    for (const r of this.rooms) {
      for (let y = r.y; y < r.y + r.h; y += 64) {
        for (let x = r.x; x < r.x + r.w; x += 64) {
          this.add.image(x + 32, y + 32, "floor").setDepth(0);
        }
      }
    }

    // Wall strips with intentional doorway gaps along the main route:
    // front hall → parlor → corridor → nest loft → secret chamber / tidal door
    const wallRects: Rect[] = [
      // Front hall shell
      { x: 180, y: 1260, w: 20, h: 440 },
      { x: 180, y: 1680, w: 560, h: 20 },
      { x: 200, y: 1260, w: 280, h: 20 },
      { x: 700, y: 1260, w: 20, h: 80 }, // partial; doorway south into parlor

      // Parlor
      { x: 680, y: 1140, w: 200, h: 20 },
      { x: 1160, y: 1300, w: 20, h: 260 }, // doorway north into corridor

      // Corridor
      { x: 1120, y: 820, w: 20, h: 300 },
      { x: 1560, y: 820, w: 20, h: 180 },
      { x: 1140, y: 800, w: 180, h: 20 }, // gap east into upper / nest

      // Side nook
      { x: 180, y: 980, w: 20, h: 280 },
      { x: 180, y: 960, w: 40, h: 20 },

      // West wing
      { x: 360, y: 760, w: 20, h: 300 },
      { x: 380, y: 760, w: 280, h: 20 },
      { x: 940, y: 780, w: 20, h: 120 },

      // Upper hall
      { x: 860, y: 440, w: 20, h: 200 },
      { x: 1500, y: 440, w: 20, h: 120 },
      { x: 880, y: 440, w: 320, h: 20 },

      // Nest loft
      { x: 1460, y: 360, w: 20, h: 200 },
      { x: 2100, y: 360, w: 20, h: 500 },
      { x: 1480, y: 340, w: 220, h: 20 }, // gap into secret chamber
      { x: 1480, y: 840, w: 280, h: 20 },

      // Secret chamber
      { x: 1660, y: 120, w: 20, h: 260 },
      { x: 2200, y: 120, w: 20, h: 300 },
      { x: 1680, y: 100, w: 540, h: 20 },
      { x: 1680, y: 400, w: 120, h: 20 }, // doorway from nest loft

      // East gallery
      { x: 1900, y: 860, w: 20, h: 300 },
      { x: 1540, y: 1140, w: 380, h: 20 },

      // Furniture blockers (kept off the main doorway lanes)
      { x: 500, y: 1480, w: 70, h: 35 },
      { x: 900, y: 1380, w: 80, h: 40 },
      { x: 620, y: 980, w: 50, h: 50 },
      { x: 1080, y: 680, w: 70, h: 35 },
      { x: 1780, y: 620, w: 100, h: 40 },
      { x: 1920, y: 360, w: 50, h: 50 },
    ];

    for (const w of wallRects) {
      this.addWall(w.x, w.y, w.w, w.h);
    }

    // Decorative rugs / labels
    this.add
      .rectangle(950, 1350, 200, 120, 0x9b2226, 0.35)
      .setDepth(1);
    this.add
      .text(1800, 700, "Nest Loft — careful!", {
        fontSize: "13px",
        color: "#ffb703",
        fontFamily: "system-ui, sans-serif",
      })
      .setDepth(6)
      .setAlpha(0.75);

    this.add
      .text(1950, 200, "Tidal Door", {
        fontSize: "14px",
        color: "#90e0ef",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5)
      .setDepth(9);

    // Windows light pools
    for (const [x, y] of [
      [500, 1400],
      [1000, 1300],
      [1300, 1100],
      [700, 950],
      [1100, 600],
      [1800, 500],
    ] as [number, number][]) {
      this.add.circle(x, y, 50, 0xffe8a3, 0.08).setDepth(2);
    }
  }

  private addWall(x: number, y: number, w: number, h: number): void {
    // Visual
    const g = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xcbb89d, 1).setDepth(5);
    g.setStrokeStyle(1, 0x8b7355, 0.6);
    // Physics
    const wall = this.walls.create(x + w / 2, y + h / 2, "wall") as Phaser.Physics.Arcade.Sprite;
    wall.setVisible(false);
    wall.setDisplaySize(w, h);
    wall.refreshBody();
    const body = wall.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(w, h);
  }

  private spawnBirds(): void {
    this.birds = this.physics.add.group();

    // Pelicans — larger patrol loops in big rooms (kept off the spawn corner)
    const pelicans: [number, number, number, number][] = [
      [560, 1420, 140, 70],
      [900, 1320, 180, 70],
      [1300, 1100, 140, 160],
      [700, 950, 200, 80],
      [1100, 650, 150, 100],
      [1750, 600, 220, 120],
      [1850, 450, 160, 90],
      [1600, 1000, 120, 70],
    ];
    for (const [x, y, rx, ry] of pelicans) {
      this.addBird("pelican", x, y, rx, ry, 55 + Math.random() * 25, 1.15);
    }

    // Seagulls — faster, tighter (none centered on the entry tile)
    const gulls: [number, number, number, number][] = [
      [520, 1500, 90, 50],
      [1000, 1400, 120, 50],
      [1250, 1000, 90, 140],
      [550, 900, 110, 70],
      [1000, 700, 130, 60],
      [1900, 700, 100, 100],
      [2000, 400, 90, 50],
      [800, 1100, 80, 80],
      [1500, 550, 140, 40],
      [640, 1480, 60, 70],
      [1700, 300, 60, 40],
      [1400, 1200, 100, 50],
    ];
    for (const [x, y, rx, ry] of gulls) {
      this.addBird("seagull", x, y, rx, ry, 75 + Math.random() * 35, 1);
    }
  }

  private addBird(
    key: string,
    x: number,
    y: number,
    rx: number,
    ry: number,
    speed: number,
    scale: number,
  ): void {
    const bird = this.birds.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    bird.setScale(scale);
    bird.setDepth(12);
    bird.setData("ox", x);
    bird.setData("oy", y);
    bird.setData("rx", rx);
    bird.setData("ry", ry);
    bird.setData("speed", speed);
    bird.setData("t", Math.random() * Math.PI * 2);
    bird.setData("phase", Math.random() * Math.PI * 2);
    const body = bird.body as Phaser.Physics.Arcade.Body;
    body.setCircle(key === "pelican" ? 16 : 12);
  }

  private onBirdHit(
    _playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    birdObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ): void {
    if (this.won) return;
    const bird = birdObj as Phaser.Physics.Arcade.Sprite;
    this.player.hit(1, new Phaser.Math.Vector2(bird.x, bird.y));
    // Scare flutter
    this.tweens.add({
      targets: bird,
      scale: bird.scale * 1.2,
      yoyo: true,
      duration: 120,
    });
    if (this.player.hp <= 0) {
      this.cameras.main.fade(400, 20, 10, 10);
      this.time.delayedCall(450, () => this.scene.restart());
    }
  }

  private completeLevel(): void {
    if (this.won) return;
    this.won = true;
    this.player.setVelocity(0, 0);
    this.hud.showHint("The Tidal Door opens… under the sea awaits!", 5000);
    this.cameras.main.flash(500, 100, 200, 255);
    this.tweens.add({
      targets: this.portal,
      scale: 1.4,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
    });
    this.time.delayedCall(1400, () => {
      this.scene.start("Story", { chapter: 3 });
    });
  }

  update(_time: number, delta: number): void {
    if (this.won) return;
    this.player.inWater = false;
    this.updateBirds(delta);
    this.hud.update(this.player);

    const d = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.portal.x,
      this.portal.y,
    );
    if (d < 280 && d > 80 && Math.random() < 0.003) {
      this.hud.showHint("A cool blue glow… the ocean door is near!", 2200);
    }
  }

  private updateBirds(delta: number): void {
    const dt = delta / 1000;
    for (const obj of this.birds.getChildren()) {
      const b = obj as Phaser.Physics.Arcade.Sprite;
      const t = (b.getData("t") as number) + dt * (b.getData("speed") as number) * 0.012;
      b.setData("t", t);
      const ox = b.getData("ox") as number;
      const oy = b.getData("oy") as number;
      const rx = b.getData("rx") as number;
      const ry = b.getData("ry") as number;
      const phase = b.getData("phase") as number;
      const nx = ox + Math.cos(t + phase) * rx;
      const ny = oy + Math.sin(t * 1.15 + phase) * ry;
      const vx = nx - b.x;
      const base = b.texture.key === "pelican" ? 1.15 : 1;
      b.setPosition(nx, ny);
      b.setFlipX(vx < 0);
      b.setScale(base * (1 + Math.sin(t * 8) * 0.06));
      (b.body as Phaser.Physics.Arcade.Body).reset(nx, ny);
    }
  }
}
