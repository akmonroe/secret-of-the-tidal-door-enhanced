import type Phaser from "phaser";

/** Generate top-down, semi-realistic beach adventure textures. */
export function generateTextures(scene: Phaser.Scene): void {
  makeSand(scene);
  makeWater(scene);
  makeShallow(scene);
  makeWood(scene);
  makeCharacters(scene);
  makeShark(scene);
  makeJelly(scene);
  makeRay(scene);
  makePelican(scene);
  makeSeagull(scene);
  makeHouse(scene);
  makeDoor(scene);
  makeRock(scene);
  makePalm(scene);
  makeBubble(scene);
  makeInteriorFloor(scene);
  makeInteriorWall(scene);
  makeOceanPortal(scene);
  makeDriftwood(scene);
  makeShell(scene);
  makeCoral(scene);
  makeFish(scene);
  makeSeafloor(scene);
  makeTreasure(scene);
  createPlayerAnims(scene);
}

function tex(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (g: Phaser.GameObjects.Graphics) => void,
): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function makeSand(scene: Phaser.Scene): void {
  tex(scene, "sand", 64, 64, (g) => {
    g.fillStyle(0xd4b896, 1);
    g.fillRect(0, 0, 64, 64);
    // grain
    for (let i = 0; i < 40; i++) {
      const x = (i * 17 + 3) % 64;
      const y = (i * 29 + 11) % 64;
      g.fillStyle(i % 3 === 0 ? 0xc9a87a : 0xe0c9a8, 0.55);
      g.fillCircle(x, y, 1 + (i % 2));
    }
    // shell flecks
    g.fillStyle(0xe8dcc8, 0.7);
    g.fillCircle(12, 40, 2);
    g.fillCircle(48, 18, 1.5);
  });
}

function makeWater(scene: Phaser.Scene): void {
  tex(scene, "water", 64, 64, (g) => {
    g.fillStyle(0x1a6b8a, 1);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x2288aa, 0.45);
    g.fillEllipse(20, 24, 28, 10);
    g.fillEllipse(48, 44, 24, 8);
    g.fillStyle(0x0f4a62, 0.35);
    g.fillEllipse(36, 12, 20, 6);
    g.fillEllipse(10, 52, 18, 7);
  });
}

function makeShallow(scene: Phaser.Scene): void {
  tex(scene, "shallow", 64, 64, (g) => {
    g.fillStyle(0x3a9bb8, 1);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x5bc0d4, 0.4);
    g.fillEllipse(30, 30, 40, 16);
    g.fillStyle(0xc9b48a, 0.15);
    g.fillRect(0, 48, 64, 16);
  });
}

function makeWood(scene: Phaser.Scene): void {
  tex(scene, "wood", 64, 64, (g) => {
    g.fillStyle(0x8b5a2b, 1);
    g.fillRect(0, 0, 64, 64);
    g.lineStyle(2, 0x6b4220, 0.8);
    for (let y = 8; y < 64; y += 16) {
      g.lineBetween(0, y, 64, y + 2);
    }
    g.fillStyle(0xa06b35, 0.4);
    g.fillRect(4, 0, 8, 64);
    g.fillRect(40, 0, 6, 64);
  });
}

type CharStyle = {
  skin: number;
  hair: number;
  shirt: number;
  shorts: number;
  shoes: number;
  girl: boolean;
};

const BOY: CharStyle = {
  skin: 0xc68642,
  hair: 0x3b2f2f,
  shirt: 0x2a9d8f,
  shorts: 0x3d5a80,
  shoes: 0x2b2b2b,
  girl: false,
};

const GIRL: CharStyle = {
  skin: 0xd4a574,
  hair: 0x5c3d2e,
  shirt: 0x2a9d8f, // teal dress (matches character select)
  shorts: 0x1d7874,
  shoes: 0x4a3728,
  girl: true,
};

/**
 * Walk phases 0–3: plant-L → pass → plant-R → pass (clear foot timing).
 * Swim phases 0–3: reach → catch → pull → recover (horizontal stroke).
 */
function drawCharacter(
  g: Phaser.GameObjects.Graphics,
  ox: number,
  oy: number,
  style: CharStyle,
  opts: { frame: number; swim: boolean; scuba: boolean },
): void {
  const { frame, swim, scuba } = opts;
  const phase = frame % 4;

  // Stride: full plant at 0 & 2, mid-pass at 1 & 3
  const stride = swim
    ? ([2, 4, -2, -3][phase] ?? 0)
    : ([5, 1.5, -5, -1.5][phase] ?? 0);
  const armSwing = swim
    ? ([8, 3, -7, -2][phase] ?? 0)
    : ([3.5, -1, -3.5, 1][phase] ?? 0);
  // Body drops on foot-plant (even walk frames); swim undulates gently
  const bobY = swim
    ? ([0, -1.5, 0.5, 1][phase] ?? 0)
    : ([1.8, -1.2, 1.8, -1.2][phase] ?? 0);
  const sway = swim
    ? ([0.5, 0, -0.5, 0][phase] ?? 0)
    : ([1.4, 0.3, -1.4, -0.3][phase] ?? 0);

  // shadow
  g.fillStyle(0x000000, swim ? 0.12 : 0.22);
  g.fillEllipse(ox + 24 + sway, oy + 42 + bobY, swim ? 17 : 22, swim ? 7 : 10);

  // Flippers when scuba-swimming
  if (scuba && swim) {
    g.fillStyle(0x1b4332, 1);
    g.fillEllipse(ox + 17 + stride * 0.15, oy + 43 + bobY, 11, 5);
    g.fillEllipse(ox + 31 - stride * 0.15, oy + 43 + bobY, 11, 5);
  }

  // legs / lower body
  if (swim) {
    g.fillStyle(scuba ? 0x1a365d : style.shorts, 1);
    g.fillRoundedRect(ox + 15 + sway * 0.3, oy + 28 + bobY, 7, 10 + Math.abs(stride) * 0.25, 2);
    g.fillRoundedRect(ox + 26 + sway * 0.3, oy + 28 + bobY, 7, 10 + Math.abs(stride) * 0.25, 2);
    g.fillStyle(style.skin, 1);
    g.fillRoundedRect(ox + 15 + sway * 0.3, oy + 36 + bobY + stride * 0.25, 6, 6, 2);
    g.fillRoundedRect(ox + 27 + sway * 0.3, oy + 36 + bobY - stride * 0.25, 6, 6, 2);
  } else {
    g.fillStyle(style.shorts, 1);
    if (style.girl) {
      // skirt sways with stride
      g.fillTriangle(
        ox + 14 + sway,
        oy + 28 + bobY,
        ox + 34 + sway,
        oy + 28 + bobY,
        ox + 24 + sway + stride * 0.15,
        oy + 41 + bobY,
      );
      g.fillRoundedRect(ox + 16 + sway * 0.5, oy + 26 + bobY, 16, 8, 3);
    } else {
      g.fillRoundedRect(ox + 14 + sway * 0.4, oy + 28 + bobY + stride * 0.2, 8, 12, 2);
      g.fillRoundedRect(ox + 26 + sway * 0.4, oy + 28 + bobY - stride * 0.2, 8, 12, 2);
    }
    g.fillStyle(style.skin, 1);
    g.fillRoundedRect(ox + 15 + sway * 0.4, oy + 36 + bobY + stride, 6, 6, 2);
    g.fillRoundedRect(ox + 27 + sway * 0.4, oy + 36 + bobY - stride, 6, 6, 2);
    g.fillStyle(style.shoes, 1);
    // Planted foot slightly larger for readable contact
    const plantL = phase === 0 ? 1.15 : 1;
    const plantR = phase === 2 ? 1.15 : 1;
    g.fillEllipse(ox + 18 + sway * 0.4, oy + 42 + bobY + stride, 8 * plantL, 4 * plantL);
    g.fillEllipse(ox + 30 + sway * 0.4, oy + 42 + bobY - stride, 8 * plantR, 4 * plantR);
  }

  // scuba tank (behind torso)
  if (scuba) {
    g.fillStyle(0x4a5568, 1);
    g.fillRoundedRect(ox + 30 + sway * 0.2, oy + 14 + bobY, 10, 18, 3);
    g.fillStyle(0x2d3748, 1);
    g.fillRoundedRect(ox + 31 + sway * 0.2, oy + 15 + bobY, 8, 4, 1);
    g.fillStyle(0xe53e3e, 1);
    g.fillCircle(ox + 35 + sway * 0.2, oy + 16 + bobY, 2);
    g.lineStyle(2, 0x718096, 1);
    g.lineBetween(ox + 32 + sway * 0.2, oy + 18 + bobY, ox + 26 + sway * 0.2, oy + 12 + bobY);
  }

  // torso
  g.fillStyle(scuba ? 0x1a365d : style.shirt, 1);
  if (style.girl && !scuba) {
    g.fillRoundedRect(ox + 14 + sway * 0.5, oy + 16 + bobY, 20, 14, 5);
  } else {
    g.fillRoundedRect(ox + 14 + sway * 0.5, oy + 16 + bobY, 20, 16, 4);
  }
  if (scuba) {
    g.fillStyle(0x38b2ac, 1);
    g.fillRect(ox + 14 + sway * 0.5, oy + 22 + bobY, 20, 3);
  }

  // arms
  g.fillStyle(style.skin, 1);
  if (swim) {
    // Horizontal stroke: arms reach forward (toward head) then sweep
    const reach = armSwing;
    g.fillRoundedRect(ox + 6 + sway + reach * 0.15, oy + 14 + bobY - Math.abs(reach) * 0.15, 8, 11, 3);
    g.fillRoundedRect(ox + 34 + sway - reach * 0.15, oy + 14 + bobY - Math.abs(reach) * 0.15, 8, 11, 3);
    g.fillRoundedRect(ox + 3 + reach, oy + 15 + bobY, 11, 6, 3);
    g.fillRoundedRect(ox + 34 - reach, oy + 15 + bobY, 11, 6, 3);
  } else {
    g.fillRoundedRect(ox + 7 + sway + armSwing * 0.15, oy + 18 + bobY + armSwing * 0.25, 7, 12, 3);
    g.fillRoundedRect(ox + 34 + sway - armSwing * 0.15, oy + 18 + bobY - armSwing * 0.25, 7, 12, 3);
  }

  // head
  g.fillStyle(style.skin, 1);
  g.fillCircle(ox + 24 + sway * 0.6, oy + 12 + bobY, 9);

  // hair
  g.fillStyle(style.hair, 1);
  if (style.girl) {
    g.fillEllipse(ox + 24 + sway * 0.6, oy + 8 + bobY, 20, 14);
    g.fillEllipse(ox + 34 + sway * 0.4, oy + 16 + bobY, 8, 12);
    g.fillCircle(ox + 36 + sway * 0.4, oy + 24 + bobY, 4);
    g.fillStyle(style.skin, 1);
    g.fillCircle(ox + 24 + sway * 0.6, oy + 14 + bobY, 6);
  } else {
    g.fillEllipse(ox + 24 + sway * 0.6, oy + 8 + bobY, 18, 12);
    g.fillStyle(style.skin, 1);
    g.fillCircle(ox + 24 + sway * 0.6, oy + 14 + bobY, 6);
  }

  // scuba mask / face
  if (scuba) {
    g.fillStyle(0x2b6cb0, 0.85);
    g.fillEllipse(ox + 24 + sway * 0.6, oy + 13 + bobY, 14, 8);
    g.fillStyle(0x90cdf4, 0.55);
    g.fillEllipse(ox + 24 + sway * 0.6, oy + 13 + bobY, 10, 5);
    g.lineStyle(2, 0x1a365d, 1);
    g.strokeEllipse(ox + 24 + sway * 0.6, oy + 13 + bobY, 14, 8);
  } else {
    g.fillStyle(0x5c4033, 0.5);
    g.fillCircle(ox + 21 + sway * 0.6, oy + 13 + bobY, 1.2);
    g.fillCircle(ox + 27 + sway * 0.6, oy + 13 + bobY, 1.2);
  }
}

function makeCharSheet(
  scene: Phaser.Scene,
  key: string,
  style: CharStyle,
  swim: boolean,
  scuba: boolean,
): void {
  if (scene.textures.exists(key)) return;
  const fw = 48;
  const fh = 48;
  const frames = 4;
  const g = scene.make.graphics({ x: 0, y: 0 });
  for (let i = 0; i < frames; i++) {
    drawCharacter(g, i * fw, 0, style, { frame: i, swim, scuba });
  }
  g.generateTexture(key, fw * frames, fh);
  g.destroy();
  const texture = scene.textures.get(key);
  for (let i = 0; i < frames; i++) {
    if (!texture.has(String(i))) {
      texture.add(i, 0, i * fw, 0, fw, fh);
    }
  }
}

function makeCharacters(scene: Phaser.Scene): void {
  // Idle / single-frame portraits (frame 0 of walk)
  const singles: [string, CharStyle, boolean][] = [
    ["player_boy", BOY, false],
    ["player_girl", GIRL, false],
    ["player_boy_scuba", BOY, true],
    ["player_girl_scuba", GIRL, true],
  ];
  for (const [key, style, scuba] of singles) {
    tex(scene, key, 48, 48, (g) => {
      drawCharacter(g, 0, 0, style, { frame: 0, swim: false, scuba });
    });
  }
  // Back-compat for asset pack / older code
  if (!scene.textures.exists("player")) {
    tex(scene, "player", 48, 48, (g) => {
      drawCharacter(g, 0, 0, BOY, { frame: 0, swim: false, scuba: false });
    });
  }

  // Animation sheets
  makeCharSheet(scene, "boy_walk", BOY, false, false);
  makeCharSheet(scene, "girl_walk", GIRL, false, false);
  makeCharSheet(scene, "boy_swim", BOY, true, false);
  makeCharSheet(scene, "girl_swim", GIRL, true, false);
  makeCharSheet(scene, "boy_scuba_swim", BOY, true, true);
  makeCharSheet(scene, "girl_scuba_swim", GIRL, true, true);
}

function createPlayerAnims(scene: Phaser.Scene): void {
  const mk = (key: string, sheet: string, frameRate: number) => {
    if (scene.anims.exists(key)) return;
    if (!scene.textures.exists(sheet)) return;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(sheet, { start: 0, end: 3 }),
      frameRate,
      repeat: -1,
    });
  };
  // Walk: snappy foot-plant cycle; swim: slower stroke; scuba: slightly slower still
  mk("boy_walk", "boy_walk", 10);
  mk("girl_walk", "girl_walk", 10);
  mk("boy_swim", "boy_swim", 7);
  mk("girl_swim", "girl_swim", 7);
  mk("boy_scuba_swim", "boy_scuba_swim", 5.5);
  mk("girl_scuba_swim", "girl_scuba_swim", 5.5);
}

function makeShark(scene: Phaser.Scene): void {
  tex(scene, "shark", 64, 36, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(32, 22, 40, 12);
    // body
    g.fillStyle(0x5a6a75, 1);
    g.fillEllipse(30, 18, 44, 18);
    g.fillStyle(0x8a9aaa, 1);
    g.fillEllipse(30, 22, 36, 10);
    // snout
    g.fillStyle(0x5a6a75, 1);
    g.fillTriangle(52, 12, 64, 18, 52, 24);
    // dorsal fin
    g.fillTriangle(28, 4, 36, 16, 20, 16);
    // tail
    g.fillTriangle(4, 8, 14, 18, 4, 28);
    // eye
    g.fillStyle(0x111111, 1);
    g.fillCircle(50, 16, 2);
  });
}

function makeJelly(scene: Phaser.Scene): void {
  tex(scene, "jelly", 40, 48, (g) => {
    g.fillStyle(0xc77dff, 0.55);
    g.fillEllipse(20, 16, 28, 22);
    g.fillStyle(0xe0aaff, 0.7);
    g.fillEllipse(20, 14, 18, 14);
    g.lineStyle(2, 0xb14aed, 0.7);
    for (let i = 0; i < 5; i++) {
      const x = 8 + i * 6;
      g.lineBetween(x, 24, x + (i % 2 === 0 ? -2 : 2), 46);
    }
  });
}

function makeRay(scene: Phaser.Scene): void {
  tex(scene, "ray", 56, 40, (g) => {
    g.fillStyle(0x4a5560, 1);
    g.fillTriangle(28, 4, 56, 20, 28, 36);
    g.fillTriangle(28, 4, 0, 20, 28, 36);
    g.fillStyle(0x6a7580, 1);
    g.fillEllipse(28, 20, 16, 12);
    g.fillTriangle(28, 22, 28, 38, 24, 34);
    g.fillStyle(0x111111, 1);
    g.fillCircle(32, 16, 2);
  });
}

function makePelican(scene: Phaser.Scene): void {
  tex(scene, "pelican", 48, 40, (g) => {
    // wings
    g.fillStyle(0xe8e4d9, 1);
    g.fillEllipse(12, 22, 20, 10);
    g.fillEllipse(36, 22, 20, 10);
    // body
    g.fillStyle(0xf5f0e6, 1);
    g.fillEllipse(24, 24, 18, 16);
    // head
    g.fillCircle(24, 12, 8);
    // pouch / beak
    g.fillStyle(0xe09f3e, 1);
    g.fillTriangle(24, 12, 44, 16, 24, 20);
    g.fillStyle(0xc77d1a, 1);
    g.fillEllipse(34, 18, 10, 6);
    // eye
    g.fillStyle(0x222222, 1);
    g.fillCircle(28, 10, 1.5);
  });
}

function makeSeagull(scene: Phaser.Scene): void {
  tex(scene, "seagull", 40, 28, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(20, 16, 14, 10);
    g.fillEllipse(8, 14, 16, 6);
    g.fillEllipse(32, 14, 16, 6);
    g.fillStyle(0xf0f0f0, 1);
    g.fillCircle(26, 10, 5);
    g.fillStyle(0xf4a261, 1);
    g.fillTriangle(28, 10, 38, 12, 28, 14);
    g.fillStyle(0x222222, 1);
    g.fillCircle(28, 9, 1.2);
  });
}

function makeHouse(scene: Phaser.Scene): void {
  tex(scene, "house", 120, 100, (g) => {
    // stilts in water
    g.fillStyle(0x5c4033, 1);
    g.fillRect(20, 70, 8, 28);
    g.fillRect(92, 70, 8, 28);
    g.fillRect(50, 75, 6, 22);
    // deck
    g.fillStyle(0xa67c52, 1);
    g.fillRoundedRect(10, 55, 100, 22, 3);
    g.lineStyle(1, 0x6b4220, 0.6);
    for (let x = 14; x < 108; x += 10) g.lineBetween(x, 55, x, 77);
    // walls
    g.fillStyle(0xe8d5b7, 1);
    g.fillRoundedRect(22, 22, 76, 40, 4);
    // roof
    g.fillStyle(0x8b4513, 1);
    g.fillTriangle(12, 28, 60, 4, 108, 28);
    g.fillStyle(0xa0522d, 1);
    g.fillTriangle(24, 28, 60, 10, 96, 28);
    // windows
    g.fillStyle(0x87ceeb, 0.9);
    g.fillRect(32, 34, 14, 14);
    g.fillRect(74, 34, 14, 14);
    g.lineStyle(2, 0x5c4033, 1);
    g.strokeRect(32, 34, 14, 14);
    g.strokeRect(74, 34, 14, 14);
    // door
    g.fillStyle(0x5c3317, 1);
    g.fillRoundedRect(52, 38, 16, 22, 2);
    g.fillStyle(0xd4af37, 1);
    g.fillCircle(64, 50, 2);
    // lantern
    g.fillStyle(0xffd166, 0.9);
    g.fillCircle(60, 18, 4);
  });
}

function makeDoor(scene: Phaser.Scene): void {
  tex(scene, "door", 28, 40, (g) => {
    g.fillStyle(0x4a2c0a, 1);
    g.fillRoundedRect(2, 2, 24, 36, 3);
    g.lineStyle(2, 0x2b1805, 1);
    g.strokeRoundedRect(2, 2, 24, 36, 3);
    g.fillStyle(0xc9a227, 1);
    g.fillCircle(20, 22, 3);
  });
}

function makeRock(scene: Phaser.Scene): void {
  tex(scene, "rock", 36, 28, (g) => {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(18, 22, 28, 10);
    g.fillStyle(0x6d6a63, 1);
    g.fillEllipse(18, 14, 30, 20);
    g.fillStyle(0x8a8680, 1);
    g.fillEllipse(14, 12, 14, 10);
    g.fillStyle(0x55524c, 1);
    g.fillEllipse(24, 18, 12, 8);
  });
}

function makePalm(scene: Phaser.Scene): void {
  tex(scene, "palm", 64, 80, (g) => {
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(32, 74, 20, 8);
    g.fillStyle(0x8b5a2b, 1);
    g.fillRoundedRect(28, 36, 8, 40, 3);
    g.fillStyle(0x2d6a4f, 1);
    g.fillEllipse(16, 28, 28, 12);
    g.fillEllipse(48, 28, 28, 12);
    g.fillEllipse(32, 16, 14, 24);
    g.fillEllipse(20, 20, 20, 10);
    g.fillEllipse(44, 20, 20, 10);
    g.fillStyle(0x40916c, 0.8);
    g.fillEllipse(32, 22, 10, 14);
  });
}

function makeBubble(scene: Phaser.Scene): void {
  tex(scene, "bubble", 12, 12, (g) => {
    g.fillStyle(0xa8dadc, 0.45);
    g.fillCircle(6, 6, 5);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(4, 4, 1.5);
  });
}

function makeInteriorFloor(scene: Phaser.Scene): void {
  tex(scene, "floor", 64, 64, (g) => {
    g.fillStyle(0xc4a574, 1);
    g.fillRect(0, 0, 64, 64);
    g.lineStyle(1, 0xa67c52, 0.5);
    for (let y = 0; y < 64; y += 16) {
      g.lineBetween(0, y, 64, y);
      for (let x = (y / 16) % 2 === 0 ? 0 : 32; x < 64; x += 32) {
        g.lineBetween(x, y, x, y + 16);
      }
    }
  });
}

function makeInteriorWall(scene: Phaser.Scene): void {
  tex(scene, "wall", 64, 64, (g) => {
    g.fillStyle(0xe6d5b8, 1);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0xd4c4a8, 1);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const ox = (row % 2) * 8;
        g.fillRect(col * 16 + ox, row * 16, 14, 14);
      }
    }
  });
}

function makeOceanPortal(scene: Phaser.Scene): void {
  tex(scene, "portal", 48, 56, (g) => {
    // mysterious door with watery glow
    g.fillStyle(0x1d3557, 1);
    g.fillRoundedRect(4, 4, 40, 48, 4);
    g.fillStyle(0x457b9d, 0.85);
    g.fillRoundedRect(10, 12, 28, 34, 3);
    g.fillStyle(0x00b4d8, 0.55);
    g.fillEllipse(24, 30, 18, 22);
    g.fillStyle(0x90e0ef, 0.7);
    g.fillEllipse(24, 28, 10, 14);
    g.lineStyle(2, 0xffd166, 0.9);
    g.strokeRoundedRect(4, 4, 40, 48, 4);
  });
}

function makeDriftwood(scene: Phaser.Scene): void {
  tex(scene, "driftwood", 48, 16, (g) => {
    g.fillStyle(0x8b7355, 1);
    g.fillRoundedRect(2, 4, 44, 8, 3);
    g.fillStyle(0xa0896a, 0.6);
    g.fillRoundedRect(6, 5, 12, 4, 2);
  });
}

function makeShell(scene: Phaser.Scene): void {
  tex(scene, "shell", 16, 14, (g) => {
    g.fillStyle(0xf8edeb, 1);
    g.fillTriangle(8, 2, 14, 12, 2, 12);
    g.fillStyle(0xffb4a2, 0.7);
    g.fillTriangle(8, 5, 12, 12, 4, 12);
  });
}

function makeCoral(scene: Phaser.Scene): void {
  tex(scene, "coral", 40, 40, (g) => {
    g.fillStyle(0xe63946, 1);
    g.fillCircle(20, 28, 10);
    g.fillCircle(12, 18, 8);
    g.fillCircle(28, 16, 9);
    g.fillCircle(20, 10, 7);
    g.fillStyle(0xffb4a2, 0.7);
    g.fillCircle(18, 12, 4);
  });
  tex(scene, "coral_b", 36, 36, (g) => {
    g.fillStyle(0x9b5de5, 1);
    g.fillTriangle(18, 4, 32, 30, 4, 30);
    g.fillStyle(0xf15bb5, 0.8);
    g.fillCircle(18, 22, 8);
  });
}

function makeFish(scene: Phaser.Scene): void {
  tex(scene, "fish", 32, 20, (g) => {
    g.fillStyle(0xff9f1c, 1);
    g.fillEllipse(16, 10, 22, 12);
    g.fillTriangle(4, 10, 0, 4, 0, 16);
    g.fillStyle(0x111111, 1);
    g.fillCircle(24, 8, 1.5);
    g.fillStyle(0xffffff, 0.5);
    g.fillEllipse(18, 12, 8, 4);
  });
}

function makeSeafloor(scene: Phaser.Scene): void {
  tex(scene, "seafloor", 64, 64, (g) => {
    g.fillStyle(0x1b4332, 1);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x2d6a4f, 0.6);
    g.fillEllipse(20, 30, 30, 16);
    g.fillStyle(0x40916c, 0.4);
    g.fillEllipse(48, 48, 24, 14);
    g.fillStyle(0x95d5b2, 0.25);
    g.fillCircle(12, 50, 3);
    g.fillCircle(40, 20, 2);
  });
}

function makeTreasure(scene: Phaser.Scene): void {
  tex(scene, "treasure", 40, 32, (g) => {
    g.fillStyle(0x6b4220, 1);
    g.fillRoundedRect(4, 12, 32, 16, 3);
    g.fillStyle(0x8b5a2b, 1);
    g.fillRoundedRect(2, 8, 36, 10, 3);
    g.fillStyle(0xffd166, 1);
    g.fillCircle(20, 14, 4);
    g.fillCircle(12, 20, 3);
    g.fillCircle(28, 22, 3);
    g.fillStyle(0xf4a261, 1);
    g.fillRect(8, 10, 24, 3);
  });
}
