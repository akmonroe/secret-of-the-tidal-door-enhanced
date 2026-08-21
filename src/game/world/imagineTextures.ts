/**
 * Grok Imagine asset loader for the enhanced Tidal Door fork.
 *
 * Assets are hashed WebP URLs. Tiles preload first (needed for the maze);
 * sprites load on demand so boot is not blocked by creature/prop art.
 */
import * as THREE from "three";

import sandUrl from "../../assets/imagine/tiles/sand.webp";
import waterSurfaceUrl from "../../assets/imagine/tiles/water_surface.webp";
import seafloorUrl from "../../assets/imagine/tiles/seafloor.webp";
import woodPlankUrl from "../../assets/imagine/tiles/wood_plank.webp";
import iceUrl from "../../assets/imagine/tiles/ice.webp";
import rockWallUrl from "../../assets/imagine/tiles/rock_wall.webp";
import coralWallUrl from "../../assets/imagine/tiles/coral_wall.webp";
import basaltVentUrl from "../../assets/imagine/tiles/basalt_vent.webp";

import sharkUrl from "../../assets/imagine/creatures/shark.webp";
import jellyUrl from "../../assets/imagine/creatures/jelly.webp";
import rayUrl from "../../assets/imagine/creatures/ray.webp";
import sealionUrl from "../../assets/imagine/creatures/sealion.webp";
import anglerUrl from "../../assets/imagine/creatures/angler.webp";
import marlinUrl from "../../assets/imagine/creatures/marlin.webp";
import pelicanUrl from "../../assets/imagine/creatures/pelican.webp";
import gullUrl from "../../assets/imagine/creatures/gull.webp";

import palmUrl from "../../assets/imagine/props/palm.webp";
import stiltHouseUrl from "../../assets/imagine/props/stilt_house.webp";
import crateUrl from "../../assets/imagine/props/crate.webp";
import clueShellUrl from "../../assets/imagine/props/clue_shell.webp";
import rockUrl from "../../assets/imagine/props/rock.webp";

import adventurerGirlUrl from "../../assets/imagine/characters/adventurer_girl.webp";
import adventurerBoyUrl from "../../assets/imagine/characters/adventurer_boy.webp";
import adventurerGirlFaceUrl from "../../assets/imagine/characters/adventurer_girl_face.webp";
import adventurerBoyFaceUrl from "../../assets/imagine/characters/adventurer_boy_face.webp";
import adventurerGirlTopUrl from "../../assets/imagine/characters/adventurer_girl_top.webp";
import adventurerBoyTopUrl from "../../assets/imagine/characters/adventurer_boy_top.webp";

import bubbleUrl from "../../assets/imagine/fx/bubble.webp";
import ventPlumeUrl from "../../assets/imagine/fx/vent_plume.webp";
import currentArrowUrl from "../../assets/imagine/fx/current_arrow.webp";

export type ImagineTileKey =
  | "sand"
  | "water_surface"
  | "seafloor"
  | "wood_plank"
  | "ice"
  | "rock_wall"
  | "coral_wall"
  | "basalt_vent";

export type ImagineSpriteKey =
  | "shark"
  | "jelly"
  | "ray"
  | "sealion"
  | "angler"
  | "marlin"
  | "pelican"
  | "gull"
  | "palm"
  | "stilt_house"
  | "crate"
  | "clue_shell"
  | "rock"
  | "adventurer_girl"
  | "adventurer_boy"
  | "adventurer_girl_face"
  | "adventurer_boy_face"
  | "adventurer_girl_top"
  | "adventurer_boy_top"
  | "bubble"
  | "vent_plume"
  | "current_arrow";

const TILE_URLS: Record<ImagineTileKey, string> = {
  sand: sandUrl,
  water_surface: waterSurfaceUrl,
  seafloor: seafloorUrl,
  wood_plank: woodPlankUrl,
  ice: iceUrl,
  rock_wall: rockWallUrl,
  coral_wall: coralWallUrl,
  basalt_vent: basaltVentUrl,
};

const SPRITE_URLS: Record<ImagineSpriteKey, string> = {
  shark: sharkUrl,
  jelly: jellyUrl,
  ray: rayUrl,
  sealion: sealionUrl,
  angler: anglerUrl,
  marlin: marlinUrl,
  pelican: pelicanUrl,
  gull: gullUrl,
  palm: palmUrl,
  stilt_house: stiltHouseUrl,
  crate: crateUrl,
  clue_shell: clueShellUrl,
  rock: rockUrl,
  adventurer_girl: adventurerGirlUrl,
  adventurer_boy: adventurerBoyUrl,
  adventurer_girl_face: adventurerGirlFaceUrl,
  adventurer_boy_face: adventurerBoyFaceUrl,
  adventurer_girl_top: adventurerGirlTopUrl,
  adventurer_boy_top: adventurerBoyTopUrl,
  bubble: bubbleUrl,
  vent_plume: ventPlumeUrl,
  current_arrow: currentArrowUrl,
};

function readFlag(): boolean {
  try {
    if (typeof localStorage === "undefined") return true;
    const v = localStorage.getItem("useImagineAssets");
    if (v === "0" || v === "false") return false;
    if (v === "1" || v === "true") return true;
  } catch {
    /* private mode */
  }
  return true;
}

export let USE_IMAGINE_ASSETS = readFlag();

export function setUseImagineAssets(on: boolean): void {
  USE_IMAGINE_ASSETS = on;
  try {
    localStorage.setItem("useImagineAssets", on ? "1" : "0");
  } catch {
    /* ignore */
  }
  tileCache.clear();
  spriteCache.clear();
}

const tileCache = new Map<string, THREE.Texture>();
const spriteCache = new Map<string, THREE.Texture>();
const htmlImages = new Map<string, HTMLImageElement>();
const loader = new THREE.TextureLoader();
const MAX_ANISO = 8;

function configureTile(tex: THREE.Texture): THREE.Texture {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = MAX_ANISO;
  tex.needsUpdate = true;
  return tex;
}

function configureSprite(tex: THREE.Texture): THREE.Texture {
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

function textureFromUrl(
  cacheKey: string,
  url: string,
  cache: Map<string, THREE.Texture>,
  configure: (t: THREE.Texture) => THREE.Texture,
): THREE.Texture {
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const pre = htmlImages.get(url);
  if (pre && pre.complete && pre.naturalWidth > 0) {
    const tex = configure(new THREE.Texture(pre));
    cache.set(cacheKey, tex);
    return tex;
  }
  const tex = configure(loader.load(url));
  cache.set(cacheKey, tex);
  return tex;
}

export function tryImagineTile(key: ImagineTileKey): THREE.Texture | null {
  if (!USE_IMAGINE_ASSETS) return null;
  const url = TILE_URLS[key];
  if (!url) return null;
  return textureFromUrl(key, url, tileCache, configureTile);
}

export function tryImagineSprite(key: ImagineSpriteKey): THREE.Texture | null {
  if (!USE_IMAGINE_ASSETS) return null;
  const url = SPRITE_URLS[key];
  if (!url) return null;
  return textureFromUrl(key, url, spriteCache, configureSprite);
}

export function imagineTileUrl(key: ImagineTileKey): string | null {
  return TILE_URLS[key] ?? null;
}

export function imagineSpriteUrl(key: ImagineSpriteKey): string | null {
  return SPRITE_URLS[key] ?? null;
}

function loadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    if (htmlImages.has(url)) {
      resolve();
      return;
    }
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      htmlImages.set(url, img);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

/** Tiles only — enough to paint the first maze without waiting on sprites. */
export function preloadImagineTiles(): Promise<void> {
  if (!USE_IMAGINE_ASSETS) return Promise.resolve();
  return Promise.all(Object.values(TILE_URLS).map(loadImage)).then(() => undefined);
}

const CHARACTER_KEYS: ImagineSpriteKey[] = [
  "adventurer_girl",
  "adventurer_boy",
  "adventurer_girl_face",
  "adventurer_boy_face",
  "adventurer_girl_top",
  "adventurer_boy_top",
];

/** Portraits + face cards so character select / player mesh never wait on fish. */
export function preloadImagineCharacters(): Promise<void> {
  if (!USE_IMAGINE_ASSETS) return Promise.resolve();
  return Promise.all(CHARACTER_KEYS.map((k) => loadImage(SPRITE_URLS[k]))).then(
    () => undefined,
  );
}

/** Optional: sprites for billboards / FX. Safe to run in the background. */
export function preloadImagineSprites(): Promise<void> {
  if (!USE_IMAGINE_ASSETS) return Promise.resolve();
  return Promise.all(Object.values(SPRITE_URLS).map(loadImage)).then(() => undefined);
}

/** Back-compat: tiles first, then sprites. */
export function preloadImagineAssets(): Promise<void> {
  return preloadImagineTiles().then(() => preloadImagineSprites());
}

export function makeImagineBillboard(
  key: ImagineSpriteKey,
  width = 1.4,
  height = 1.4,
): THREE.Mesh | null {
  const map = tryImagineSprite(key);
  if (!map) return null;
  const mat = new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    alphaTest: 0.12,
    depthWrite: false,
    side: THREE.DoubleSide,
    roughness: 0.55,
    metalness: 0.0,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  mesh.position.y = height * 0.5;
  mesh.userData.imagineSprite = key;
  mesh.userData.billboard = true;
  return mesh;
}

/**
 * Top-down animal stamped onto the water/sand. Image must be nose-at-top;
 * after rotateX(-90) the nose points +Z so Hazard.faceVelocity matches.
 */
export function makeImagineGroundDecal(
  key: ImagineSpriteKey,
  width: number,
  length: number,
): THREE.Mesh | null {
  const map = tryImagineSprite(key);
  if (!map) return null;
  const mat = new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    alphaTest: 0.14,
    depthWrite: true,
    side: THREE.DoubleSide,
    roughness: 0.4,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.1;
  mesh.castShadow = true;
  mesh.userData.imagineSprite = key;
  mesh.userData.groundDecal = true;
  return mesh;
}

const _spritePos = new THREE.Vector3();

/**
 * Keep vertical art cards facing the camera so they never read as paper edges.
 * Optional vx/vz flips left-facing sprites so the nose follows on-screen motion.
 */
export function orientStandSprite(
  group: THREE.Object3D,
  camera: THREE.Camera,
  vx = 0,
  vz = 0,
): void {
  if (group.userData?.spriteLayout !== "stand") return;
  const billboard = group.userData?.billboard as THREE.Object3D | undefined;
  if (!billboard) return;

  group.getWorldPosition(_spritePos);
  const dx = camera.position.x - _spritePos.x;
  const dz = camera.position.z - _spritePos.z;
  group.rotation.y = Math.atan2(dx, dz);

  const dist = Math.hypot(dx, dz) || 1;
  const elev = Math.atan2(camera.position.y - _spritePos.y, dist);
  billboard.rotation.x = -elev * 0.4;

  const rx = camera.matrixWorld.elements[0];
  const rz = camera.matrixWorld.elements[2];
  const alongRight = vx * rx + vz * rz;
  if (Math.abs(alongRight) > 0.22) {
    group.userData.flipSign = alongRight > 0 ? -1 : 1;
  }
  const sign = (group.userData.flipSign as number) ?? 1;
  const mag = Math.abs(billboard.scale.x) || 1;
  billboard.scale.x = mag * sign;
}
