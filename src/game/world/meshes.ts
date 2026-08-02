import * as THREE from "three";
import type { CharacterId } from "../progress/state";
import {
  brickTexture,
  coralWallTexture,
  crateTexture,
  grassSeafloorTexture,
  hullTexture,
  metalGrateTexture,
  rockTexture,
  sandTexture,
  toonMap,
  wallStuccoTexture,
  waterTexture,
  woodTexture,
} from "./textures";

const toon = (color: number, opts?: { transparent?: boolean; opacity?: number }) =>
  new THREE.MeshToonMaterial({
    color,
    transparent: opts?.transparent ?? false,
    opacity: opts?.opacity ?? 1,
  });

function darken(hex: number, factor: number): number {
  const r = Math.min(255, Math.floor(((hex >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.floor(((hex >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.floor((hex & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

function lighten(hex: number, factor: number): number {
  const r = Math.min(255, Math.floor(((hex >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.floor(((hex >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.floor((hex & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

/** Clone a shared canvas texture before setting unique repeat/offset. */
function mapForMesh(src: THREE.Texture, rx: number, ry: number): THREE.Texture {
  const map = src.clone();
  map.needsUpdate = true;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(rx, ry);
  return map;
}

export type GroundStyle = "sand" | "wood" | "seafloor" | "hull" | "grate";

export function makeGround(
  size: number,
  color: number,
  style: GroundStyle = "sand",
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(size, size, 1, 1);
  let src: THREE.Texture | null = null;
  if (style === "sand") src = sandTexture();
  else if (style === "wood") src = woodTexture();
  else if (style === "seafloor") src = grassSeafloorTexture();
  else if (style === "hull") src = hullTexture();
  else if (style === "grate") src = metalGrateTexture();
  const map = src ? mapForMesh(src, size / 6, size / 6) : null;
  const mesh = new THREE.Mesh(geo, toonMap(color, map));
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

export function makeWater(size: number, color: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(size, size);
  // Slightly larger tiles so wave ribbons read chunky from high cam
  const map = mapForMesh(waterTexture(), size / 7, size / 7);
  const mat = toonMap(color, map, { transparent: true, opacity: 0.82 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.05;
  // LevelRuntime scrolls UV via userData.waterMap
  mesh.userData.animateWater = true;
  mesh.userData.waterMap = map;
  return mesh;
}

export type WallStyle = "rock" | "stucco" | "coral" | "hull" | "brick";

export function makeWallBox(
  w: number,
  h: number,
  d: number,
  color: number,
  style: WallStyle = "rock",
): THREE.Mesh {
  let src: THREE.Texture | null = null;
  if (style === "stucco") src = wallStuccoTexture();
  else if (style === "hull") src = hullTexture();
  else if (style === "coral") src = coralWallTexture();
  else if (style === "brick") src = brickTexture();
  else src = rockTexture();
  const map = src ? mapForMesh(src, Math.max(1, w), Math.max(1, h)) : null;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toonMap(color, map));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = h / 2;
  return mesh;
}

export function makeFloorTile(
  size: number,
  color: number,
  style: GroundStyle,
  height = 0.12,
): THREE.Mesh {
  let src: THREE.Texture | null = null;
  if (style === "sand") src = sandTexture();
  else if (style === "wood") src = woodTexture();
  else if (style === "seafloor") src = grassSeafloorTexture();
  else if (style === "grate") src = metalGrateTexture();
  else src = hullTexture();
  const map = src ? mapForMesh(src, 0.9, 0.9) : null;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, height, size),
    toonMap(color, map),
  );
  mesh.receiveShadow = true;
  return mesh;
}

export function makeRock(color = 0xb8b0a8): THREE.Group {
  const g = new THREE.Group();
  // Soft pastel rock pile — toy stone, not granite grey
  const main = color;
  const highlight = lighten(color, 1.18);
  const shadow = darken(color, 0.82);
  const a = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), toon(main));
  a.scale.set(1.2, 0.7, 1);
  a.position.y = 0.35;
  a.castShadow = true;
  const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), toon(shadow));
  b.position.set(0.35, 0.25, 0.1);
  b.castShadow = true;
  const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), toon(highlight));
  c.position.set(-0.28, 0.18, 0.18);
  c.castShadow = true;
  // Tiny moss fleck for color pop
  const moss = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), toon(0x6edc8c));
  moss.position.set(0.1, 0.55, 0.05);
  moss.scale.set(1.2, 0.5, 1);
  g.add(a, b, c, moss);
  return g;
}

export function makePalm(): THREE.Group {
  const g = new THREE.Group();
  // Candy-brown trunk with ring bands
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 2.2, 6),
    toon(0xc4894a),
  );
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.14 + i * 0.01, 0.025, 4, 8),
      toon(0xa86e38),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.5 + i * 0.55;
    g.add(ring);
  }
  // Bright toy greens + a lime accent leaf
  const leafColors = [0x3dd68c, 0x2ecf7a, 0x55e0a0, 0x2bbf70, 0x7aefb0];
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 6, 4),
      toon(leafColors[i]),
    );
    const a = (i / 5) * Math.PI * 2;
    leaf.scale.set(1.45, 0.32, 0.72);
    leaf.position.set(Math.cos(a) * 0.52, 2.2, Math.sin(a) * 0.52);
    leaf.castShadow = true;
    g.add(leaf);
  }
  // Coconut cluster
  for (const [ox, oz] of [
    [0.12, 0.08],
    [-0.1, 0.1],
    [0.02, -0.12],
  ] as [number, number][]) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), toon(0x8b5a2b));
    nut.position.set(ox, 2.05, oz);
    g.add(nut);
  }
  return g;
}

export function makeCrate(): THREE.Group {
  const g = new THREE.Group();
  const map = mapForMesh(crateTexture(), 1, 1);
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.7, 0.9),
    toonMap(0xf0c878, map),
  );
  box.position.y = 0.35;
  box.castShadow = true;
  g.add(box);
  // Bright lid + edge bands
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.95), toon(0xffd89a));
  lid.position.y = 0.75;
  g.add(lid);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.1, 0.12), toon(0xe85d4c));
  band.position.set(0, 0.35, 0.46);
  g.add(band);
  const bandB = band.clone();
  bandB.position.z = -0.46;
  g.add(bandB);
  return g;
}

export function makeCoralProp(color = 0xff6b7a): THREE.Group {
  const g = new THREE.Group();
  // Multi-tone candy coral: stem + brighter tip + accent branch
  const tipColor = lighten(color, 1.25);
  const stemColor = darken(color, 0.88);
  const accents = [0xffe066, 0x7ad4ff, 0xd4a0ff, 0xff9ecd];
  for (let i = 0; i < 4; i++) {
    const h = 0.55 + (i % 3) * 0.18;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.13, h, 5),
      toon(stemColor),
    );
    stem.position.set((i - 1.5) * 0.22, h / 2, ((i % 2) - 0.5) * 0.18);
    stem.castShadow = true;
    g.add(stem);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.16 + (i % 2) * 0.04, 6, 5), toon(tipColor));
    tip.position.copy(stem.position);
    tip.position.y += h * 0.45;
    g.add(tip);
    // Small side bud in a contrasting toy color
    const bud = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 5, 4),
      toon(accents[i % accents.length]),
    );
    bud.position.set(
      stem.position.x + 0.12,
      stem.position.y + 0.1,
      stem.position.z,
    );
    g.add(bud);
  }
  // Soft pink base pad
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.4, 0.08, 8),
    toon(0xffc8d8),
  );
  pad.position.y = 0.04;
  g.add(pad);
  return g;
}

export function makeHouse(): THREE.Group {
  const g = new THREE.Group();
  const postMat = toon(0xc4894a);
  for (const [x, z] of [
    [-2, -1.5],
    [2, -1.5],
    [-2, 1.5],
    [2, 1.5],
  ] as [number, number][]) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 6), postMat);
    s.position.set(x, 1.1, z);
    g.add(s);
  }
  const woodMap = mapForMesh(woodTexture(), 2.5, 2);
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 0.2, 4.2),
    toonMap(0xe8bc88, woodMap),
  );
  deck.position.y = 2.2;
  deck.castShadow = true;
  g.add(deck);
  const stucco = mapForMesh(wallStuccoTexture(), 2, 1.2);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 2.2, 3.2),
    toonMap(0xfff0dc, stucco),
  );
  body.position.y = 3.4;
  body.castShadow = true;
  g.add(body);
  // Coral / terracotta roof — pops against sky
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.4, 4), toon(0xff7a5c));
  roof.position.y = 5.1;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.15), toon(0xc4783a));
  door.position.set(0, 2.9, 1.7);
  g.add(door);
  // Windows
  for (const sx of [-1.1, 1.1] as const) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.08), toon(0x7ad4ff));
    win.position.set(sx, 3.5, 1.62);
    g.add(win);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.06), toon(0xfff8e8));
    frame.position.set(sx, 3.5, 1.58);
    g.add(frame);
  }
  const light = new THREE.PointLight(0xffe08a, 1.35, 14);
  light.position.set(0, 4.5, 0);
  g.add(light);
  return g;
}

export function makeCluePedestal(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.65, 0.4, 8),
    toon(0x6a8aab),
  );
  base.position.y = 0.2;
  g.add(base);
  // Pearl shell — saturated gold
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 12, 10),
    new THREE.MeshToonMaterial({
      color: 0xffe066,
      emissive: 0xffaa33,
      emissiveIntensity: 0.25,
    }),
  );
  shell.scale.set(1, 0.7, 1.1);
  shell.position.y = 0.75;
  g.add(shell);
  // Accent ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.38, 0.04, 6, 16),
    toon(0xff9ecd),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.55;
  g.add(ring);
  const glow = new THREE.PointLight(0xffe066, 1.7, 9);
  glow.position.y = 1;
  g.add(glow);
  g.userData.shell = shell;
  return g;
}

export function makePlayerCharacter(character: CharacterId, scuba: boolean): THREE.Group {
  const g = new THREE.Group();
  // Slightly more saturated Crossy-style palette
  const skin = character === "girl" ? 0xe8b888 : 0xd4955a;
  const hair = character === "girl" ? 0x6b3a28 : 0x3a2820;
  const shirt = scuba ? 0x1e4d8c : character === "girl" ? 0xff6b4a : 0x2ecf9a;
  const pants = scuba ? 0x163a6b : character === "girl" ? 0xffb347 : 0x3d7acc;

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  g.add(shadow);

  const hips = new THREE.Group();
  hips.position.y = 0.55;
  g.add(hips);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.35, 4, 8), toon(shirt));
  torso.position.y = 0.35;
  torso.castShadow = true;
  hips.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), toon(skin));
  head.position.y = 0.85;
  head.castShadow = true;
  hips.add(head);

  const hairMesh = new THREE.Mesh(
    new THREE.SphereGeometry(character === "girl" ? 0.3 : 0.28, 10, 8),
    toon(hair),
  );
  hairMesh.scale.set(1.05, character === "girl" ? 0.85 : 0.65, 1.05);
  hairMesh.position.y = character === "girl" ? 0.95 : 0.98;
  hips.add(hairMesh);

  if (character === "girl") {
    const braid = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.25, 3, 6), toon(hair));
    braid.position.set(0.22, 0.75, -0.05);
    braid.rotation.z = -0.4;
    hips.add(braid);
  }

  const legGeo = new THREE.CapsuleGeometry(0.1, 0.28, 3, 6);
  const legL = new THREE.Group();
  legL.position.set(-0.12, 0.05, 0);
  const legLMesh = new THREE.Mesh(legGeo, toon(pants));
  legLMesh.position.y = -0.28;
  legLMesh.castShadow = true;
  legL.add(legLMesh);

  const legR = new THREE.Group();
  legR.position.set(0.12, 0.05, 0);
  const legRMesh = new THREE.Mesh(legGeo, toon(pants));
  legRMesh.position.y = -0.28;
  legRMesh.castShadow = true;
  legR.add(legRMesh);
  hips.add(legL, legR);

  const armGeo = new THREE.CapsuleGeometry(0.08, 0.28, 3, 6);
  const armL = new THREE.Group();
  armL.position.set(-0.34, 0.48, 0);
  const armLMesh = new THREE.Mesh(armGeo, toon(skin));
  armLMesh.position.y = -0.22;
  armL.add(armLMesh);

  const armR = new THREE.Group();
  armR.position.set(0.34, 0.48, 0);
  const armRMesh = new THREE.Mesh(armGeo, toon(skin));
  armRMesh.position.y = -0.22;
  armR.add(armRMesh);
  hips.add(armL, armR);

  if (scuba) {
    // Bright toy tank + mask accents
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.55, 8),
      toon(0x4a90c8),
    );
    tank.position.set(0, 0.4, -0.32);
    tank.rotation.x = 0.15;
    hips.add(tank);
    const valve = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), toon(0xffe066));
    valve.position.set(0, 0.7, -0.32);
    hips.add(valve);
    const mask = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.04, 6, 12),
      toon(0x3db8ff),
    );
    mask.position.set(0, 0.85, 0.22);
    mask.rotation.x = Math.PI / 2;
    hips.add(mask);
  }

  g.userData = { hips, legL, legR, armL, armR, head, torso, shadow };
  return g;
}

/**
 * All creatures face **+Z** in local space so Hazard.faceVelocity
 * (`atan2(vx, vz)`) matches movement — same convention as the player.
 */
export function makeShark(): THREE.Group {
  const g = new THREE.Group();
  // Cone tip was +Y; rotate to +Z (nose forward) — slate-blue toy shark
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.55, 6), toon(0x6a8aa0));
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.4;
  body.castShadow = true;
  g.add(body);
  // Belly plate — lighter so silhouette reads underwater
  const belly = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1, 5), toon(0xc8d8e4));
  belly.rotation.x = Math.PI / 2;
  belly.position.set(0, 0.22, 0.05);
  belly.scale.set(1, 0.45, 1);
  g.add(belly);
  // Dorsal fin
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 4), toon(0x4a6a80));
  fin.position.set(0, 0.78, -0.05);
  fin.castShadow = true;
  g.add(fin);
  // Tail (points -Z, opposite of nose)
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 4), toon(0x5a7a90));
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0, 0.4, -0.85);
  g.add(tail);
  // Side fins for width when viewed high-angle
  for (const sx of [-1, 1] as const) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.22), toon(0x5a7a90));
    side.position.set(sx * 0.28, 0.32, 0.05);
    side.rotation.z = sx * 0.35;
    g.add(side);
  }
  // Eye dots
  for (const sx of [-1, 1] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), toon(0x1a1a1a));
    eye.position.set(sx * 0.12, 0.48, 0.55);
    g.add(eye);
  }
  addBlobShadow(g, 0.6);
  return g;
}

export function makeJelly(): THREE.Group {
  const g = new THREE.Group();
  const bell = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshToonMaterial({ color: 0xd4a0ff, transparent: true, opacity: 0.78 }),
  );
  bell.position.y = 0.55;
  g.add(bell);
  // Inner glow disc for high-cam pop against bright water
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 6),
    new THREE.MeshToonMaterial({
      color: 0xf0c8ff,
      emissive: 0xd060ff,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.9,
    }),
  );
  core.position.y = 0.48;
  g.add(core);
  const tentacles: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const t = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.015, 0.55, 4),
      new THREE.MeshToonMaterial({ color: 0xc060f0, transparent: true, opacity: 0.7 }),
    );
    const a = (i / 5) * Math.PI * 2;
    t.position.set(Math.cos(a) * 0.15, 0.22, Math.sin(a) * 0.15);
    g.add(t);
    tentacles.push(t);
  }
  g.userData.tentacles = tentacles;
  return g;
}

export function makeRay(): THREE.Group {
  const g = new THREE.Group();
  // Flat diamond body — wider on X so facing (+Z) is obvious from above
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6), toon(0x4a5560));
  body.scale.set(1.55, 0.22, 1.05);
  body.position.y = 0.25;
  body.castShadow = true;
  g.add(body);
  // Wing tips (slightly darker)
  for (const sx of [-1, 1] as const) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 5), toon(0x3a424c));
    wing.scale.set(1.1, 0.18, 0.7);
    wing.position.set(sx * 0.55, 0.24, 0);
    g.add(wing);
  }
  // Nose spike (+Z) and thin tail (-Z) so travel direction reads
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 5), toon(0x5a6570));
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.25, 0.55);
  g.add(nose);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.55, 4), toon(0x3a424c));
  tail.rotation.x = Math.PI / 2;
  tail.position.set(0, 0.22, -0.65);
  g.add(tail);
  // Pale belly strip
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 5), toon(0x8a939c));
  belly.scale.set(0.9, 0.12, 0.7);
  belly.position.set(0, 0.16, 0.05);
  g.add(belly);
  addBlobShadow(g, 0.65);
  return g;
}

export function makePelican(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), toon(0xfff8ee));
  body.scale.set(1.15, 0.9, 1.2);
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);

  // Wing pivots at body so flap rotates from the shoulder (not mid-wing)
  const wingMat = toon(0xf0e8d8);
  const wingLPivot = new THREE.Group();
  wingLPivot.position.set(-0.22, 0.62, 0);
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.07, 0.38), wingMat);
  wingL.position.set(-0.32, 0, 0);
  wingL.castShadow = true;
  wingLPivot.add(wingL);
  // Darker wing tip for contrast against bright body
  const tipL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.28), toon(0x4a5560));
  tipL.position.set(-0.62, 0, 0.02);
  wingLPivot.add(tipL);
  g.add(wingLPivot);

  const wingRPivot = new THREE.Group();
  wingRPivot.position.set(0.22, 0.62, 0);
  const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.07, 0.38), wingMat);
  wingR.position.set(0.32, 0, 0);
  wingR.castShadow = true;
  wingRPivot.add(wingR);
  const tipR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.28), toon(0x4a5560));
  tipR.position.set(0.62, 0, 0.02);
  wingRPivot.add(tipR);
  g.add(wingRPivot);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), toon(0xf5f0e6));
  head.position.set(0, 0.85, 0.28);
  g.add(head);
  // Pouch + long beak facing +Z
  const pouch = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), toon(0xffe0a8));
  pouch.scale.set(0.9, 0.7, 1.3);
  pouch.position.set(0, 0.72, 0.42);
  g.add(pouch);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 5), toon(0xffb040));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.8, 0.58);
  g.add(beak);
  // Eyes
  for (const sx of [-1, 1] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), toon(0x222222));
    eye.position.set(sx * 0.1, 0.9, 0.4);
    g.add(eye);
  }
  addBlobShadow(g, 0.5);
  g.userData.wings = [wingLPivot, wingRPivot];
  return g;
}

export function makeGull(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), toon(0xffffff));
  body.scale.set(1, 0.95, 1.15);
  body.position.y = 0.45;
  body.castShadow = true;
  g.add(body);

  const wingMat = toon(0xf0f0f0);
  const wingLPivot = new THREE.Group();
  wingLPivot.position.set(-0.12, 0.5, 0);
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.24), wingMat);
  wingL.position.set(-0.28, 0, 0);
  wingLPivot.add(wingL);
  const tipL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.18), toon(0x3d4650));
  tipL.position.set(-0.52, 0, 0);
  wingLPivot.add(tipL);
  g.add(wingLPivot);

  const wingRPivot = new THREE.Group();
  wingRPivot.position.set(0.12, 0.5, 0);
  const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.24), wingMat);
  wingR.position.set(0.28, 0, 0);
  wingRPivot.add(wingR);
  const tipR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.18), toon(0x3d4650));
  tipR.position.set(0.52, 0, 0);
  wingRPivot.add(tipR);
  g.add(wingRPivot);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), toon(0xffffff));
  head.position.set(0, 0.58, 0.18);
  g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 4), toon(0xf4a261));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.55, 0.32);
  g.add(beak);
  // Grey back patch for contrast vs floorboards
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), toon(0xc5c8cc));
  back.scale.set(1.1, 0.5, 1);
  back.position.set(0, 0.52, -0.05);
  g.add(back);
  addBlobShadow(g, 0.35);
  g.userData.wings = [wingLPivot, wingRPivot];
  return g;
}

/** Barrel-bodied sea lion for kelp lanes */
export function makeSeaLion(): THREE.Group {
  // Chocolate toy seal — warmer than ray/shark slate so it pops on kelp green
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 7), toon(0x6a5040));
  body.scale.set(0.85, 0.7, 1.45);
  body.position.y = 0.35;
  body.castShadow = true;
  g.add(body);
  // Cream belly plate for high-cam silhouette
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), toon(0xe8d8c0));
  belly.scale.set(0.75, 0.45, 1.15);
  belly.position.set(0, 0.22, 0.05);
  g.add(belly);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), toon(0x7a6050));
  head.position.set(0, 0.42, 0.55);
  g.add(head);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 5), toon(0x3a2a24));
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.38, 0.78);
  g.add(nose);
  // Whisker dots — tiny face read from high cam
  for (const sx of [-1, 1] as const) {
    const whisk = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 3), toon(0xf0e8d8));
    whisk.position.set(sx * 0.12, 0.36, 0.72);
    g.add(whisk);
  }
  for (const sx of [-1, 1] as const) {
    const flipper = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.07, 0.24), toon(0x4a3830));
    flipper.position.set(sx * 0.38, 0.22, 0.05);
    flipper.rotation.z = sx * 0.4;
    g.add(flipper);
  }
  for (const sx of [-1, 1] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 4), toon(0x111111));
    eye.position.set(sx * 0.1, 0.48, 0.68);
    g.add(eye);
  }
  addBlobShadow(g, 0.55);
  return g;
}

/** Deep anglerfish — lethal boss silhouette with glowing lure (toy, not horror) */
export function makeAngler(): THREE.Group {
  const g = new THREE.Group();
  // Plum body — brighter than pure night so it reads on vent/storm floors
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), toon(0x5a3878));
  body.scale.set(1.1, 0.85, 1.25);
  body.position.y = 0.4;
  body.castShadow = true;
  g.add(body);
  // Pale underbelly for top-down outline
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), toon(0xc8a0e0));
  belly.scale.set(0.95, 0.4, 1.0);
  belly.position.set(0, 0.22, 0.05);
  g.add(belly);
  // Huge jaw — dark but not black void
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.35), toon(0x3a2850));
  jaw.position.set(0, 0.22, 0.45);
  g.add(jaw);
  // Toy teeth row (readable danger, not gore)
  for (let i = -2; i <= 2; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 4), toon(0xfff8ee));
    tooth.position.set(i * 0.09, 0.32, 0.58);
    tooth.rotation.x = Math.PI;
    g.add(tooth);
  }
  // Lure stalk + glow bulb
  const stalk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.55, 5),
    toon(0x6a5090),
  );
  stalk.position.set(0, 0.85, 0.25);
  stalk.rotation.x = 0.4;
  g.add(stalk);
  const lure = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 6),
    new THREE.MeshToonMaterial({
      color: 0xfff0a0,
      emissive: 0xffcc33,
      emissiveIntensity: 1.4,
    }),
  );
  lure.position.set(0, 1.05, 0.48);
  g.add(lure);
  g.userData.lure = lure;
  // Angry red eyes — keep glow via Hazard preserve-emissive
  for (const sx of [-1, 1] as const) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 5),
      new THREE.MeshToonMaterial({
        color: 0xff5555,
        emissive: 0xcc1122,
        emissiveIntensity: 0.7,
      }),
    );
    eye.position.set(sx * 0.18, 0.5, 0.52);
    g.add(eye);
  }
  // Fins — wider for high-cam width read
  for (const sx of [-1, 1] as const) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.3), toon(0x4a3070));
    fin.position.set(sx * 0.42, 0.35, -0.1);
    g.add(fin);
  }
  addBlobShadow(g, 0.65);
  return g;
}

/** Fast silver marlin — lethal spear fish for current raceway / late seas */
export function makeMarlin(): THREE.Group {
  const g = new THREE.Group();
  // Steel-blue body — brighter than shark slate for raceway contrast
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.9, 7), toon(0x70b0d0));
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.4;
  body.castShadow = true;
  g.add(body);
  // Spear bill (+Z) — high-contrast white tip
  const bill = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.9, 5), toon(0xf0f8ff));
  bill.rotation.x = Math.PI / 2;
  bill.position.set(0, 0.4, 1.18);
  g.add(bill);
  // Dorsal sail — deep teal for silhouette
  const sail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.75), toon(0x2a6088));
  sail.position.set(0, 0.78, 0.05);
  g.add(sail);
  // Silver flash stripe
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.09, 1.25),
    new THREE.MeshToonMaterial({
      color: 0xf0f8ff,
      emissive: 0xb0e0ff,
      emissiveIntensity: 0.5,
    }),
  );
  stripe.position.set(0, 0.35, 0.1);
  g.add(stripe);
  // Tail
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 5), toon(0x3a7090));
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0, 0.4, -1.0);
  g.add(tail);
  // RED eyes (matches level copy "RED-eyed marlin")
  for (const sx of [-1, 1] as const) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 5, 4),
      new THREE.MeshToonMaterial({
        color: 0xff3333,
        emissive: 0xcc0000,
        emissiveIntensity: 0.65,
      }),
    );
    eye.position.set(sx * 0.11, 0.48, 0.55);
    g.add(eye);
  }
  addBlobShadow(g, 0.7);
  return g;
}

function addBlobShadow(g: THREE.Group, r: number): void {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(r, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  g.add(shadow);
}
