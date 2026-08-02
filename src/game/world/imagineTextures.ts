/**
 * Grok Imagine asset loader for the enhanced Tidal Door fork.
 *
 * When USE_IMAGINE_ASSETS is true and a PNG exists under src/assets/imagine/,
 * these loaders return THREE textures. Callers fall back to procedural canvas
 * textures in textures.ts when a key is missing or the flag is off.
 *
 * Toggle at runtime:
 *   localStorage.setItem("useImagineAssets", "0")  // force procedural
 *   localStorage.setItem("useImagineAssets", "1")  // force imagine (default)
 */
import * as THREE from "three";

// ─── Vite URL imports (build fails only if a listed file is deleted) ─
import sandUrl from "../../assets/imagine/tiles/sand.png";
import waterSurfaceUrl from "../../assets/imagine/tiles/water_surface.png";
import seafloorUrl from "../../assets/imagine/tiles/seafloor.png";
import woodPlankUrl from "../../assets/imagine/tiles/wood_plank.png";
import iceUrl from "../../assets/imagine/tiles/ice.png";
import rockWallUrl from "../../assets/imagine/tiles/rock_wall.png";
import coralWallUrl from "../../assets/imagine/tiles/coral_wall.png";
import basaltVentUrl from "../../assets/imagine/tiles/basalt_vent.png";

import sharkUrl from "../../assets/imagine/creatures/shark.png";
import jellyUrl from "../../assets/imagine/creatures/jelly.png";
import rayUrl from "../../assets/imagine/creatures/ray.png";
import sealionUrl from "../../assets/imagine/creatures/sealion.png";
import anglerUrl from "../../assets/imagine/creatures/angler.png";
import marlinUrl from "../../assets/imagine/creatures/marlin.png";
import pelicanUrl from "../../assets/imagine/creatures/pelican.png";
import gullUrl from "../../assets/imagine/creatures/gull.png";

import palmUrl from "../../assets/imagine/props/palm.png";
import stiltHouseUrl from "../../assets/imagine/props/stilt_house.png";
import crateUrl from "../../assets/imagine/props/crate.png";
import clueShellUrl from "../../assets/imagine/props/clue_shell.png";
import rockUrl from "../../assets/imagine/props/rock.png";

import adventurerGirlUrl from "../../assets/imagine/characters/adventurer_girl.png";
import adventurerBoyUrl from "../../assets/imagine/characters/adventurer_boy.png";

import bubbleUrl from "../../assets/imagine/fx/bubble.png";
import ventPlumeUrl from "../../assets/imagine/fx/vent_plume.png";
import currentArrowUrl from "../../assets/imagine/fx/current_arrow.png";

/** Tile keys used by textures.ts / meshes.ts */
export type ImagineTileKey =
  | "sand"
  | "water_surface"
  | "seafloor"
  | "wood_plank"
  | "ice"
  | "rock_wall"
  | "coral_wall"
  | "basalt_vent";

/** Isolated sprite keys (alpha already keyed from magenta). */
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
  // Enhanced fork defaults ON
  return true;
}

/** Feature flag — default true in this fork. */
export let USE_IMAGINE_ASSETS = readFlag();

export function setUseImagineAssets(on: boolean): void {
  USE_IMAGINE_ASSETS = on;
  try {
    localStorage.setItem("useImagineAssets", on ? "1" : "0");
  } catch {
    /* ignore */
  }
  // Clear caches so next request rebuilds
  tileCache.clear();
  spriteCache.clear();
}

const tileCache = new Map<string, THREE.Texture>();
const spriteCache = new Map<string, THREE.Texture>();
/** Decoded HTML images after preload (enables sync Texture construction). */
const htmlImages = new Map<string, HTMLImageElement>();
const loader = new THREE.TextureLoader();

function configureTile(tex: THREE.Texture): THREE.Texture {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
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

/**
 * Returns an Imagine seamless tile texture, or null if disabled / unknown key.
 * Prefer calling preloadImagineAssets() first so maps are ready to clone.
 */
export function tryImagineTile(key: ImagineTileKey): THREE.Texture | null {
  if (!USE_IMAGINE_ASSETS) return null;
  const url = TILE_URLS[key];
  if (!url) return null;
  return textureFromUrl(key, url, tileCache, configureTile);
}

/**
 * Returns an Imagine sprite texture (transparent PNG), or null.
 */
export function tryImagineSprite(key: ImagineSpriteKey): THREE.Texture | null {
  if (!USE_IMAGINE_ASSETS) return null;
  const url = SPRITE_URLS[key];
  if (!url) return null;
  return textureFromUrl(key, url, spriteCache, configureSprite);
}

/** URL map for UI / debugging / external loaders. */
export function imagineTileUrl(key: ImagineTileKey): string | null {
  return TILE_URLS[key] ?? null;
}

export function imagineSpriteUrl(key: ImagineSpriteKey): string | null {
  return SPRITE_URLS[key] ?? null;
}

/**
 * Preload all Imagine assets into HTMLImageElement cache so Texture clones
 * have valid images immediately (no pink/blank flash on first level).
 */
export function preloadImagineAssets(): Promise<void> {
  if (!USE_IMAGINE_ASSETS) return Promise.resolve();
  const urls = [...Object.values(TILE_URLS), ...Object.values(SPRITE_URLS)];
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          if (htmlImages.has(url)) {
            resolve();
            return;
          }
          const img = new Image();
          img.onload = () => {
            htmlImages.set(url, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = url;
        }),
    ),
  ).then(() => undefined);
}

/**
 * Y-up billboard plane with an Imagine sprite (alpha transparent).
 * Useful for props / FX overlays; creatures still use mesh groups by default.
 */
export function makeImagineBillboard(
  key: ImagineSpriteKey,
  width = 1.4,
  height = 1.4,
): THREE.Mesh | null {
  const map = tryImagineSprite(key);
  if (!map) return null;
  const mat = new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    alphaTest: 0.12,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  mesh.position.y = height * 0.5;
  mesh.userData.imagineSprite = key;
  mesh.userData.billboard = true;
  return mesh;
}
