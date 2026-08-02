/**
 * PNG asset pack for Secret of the Tidal Door.
 * Keys match generateTextures() so drop-in replacement works.
 * Missing files simply won't load; Boot falls back to procedural art.
 */

import type Phaser from "phaser";

import sandUrl from "../assets/game/tiles/sand.png";
import sandBUrl from "../assets/game/tiles/sand_b.png";
import sandCUrl from "../assets/game/tiles/sand_c.png";
import shallowUrl from "../assets/game/tiles/shallow.png";
import waterUrl from "../assets/game/tiles/water.png";
import floorUrl from "../assets/game/interior/floor.png";

import playerUrl from "../assets/game/characters/player.png";

import sharkUrl from "../assets/game/creatures/shark.png";
import jellyUrl from "../assets/game/creatures/jelly.png";
import rayUrl from "../assets/game/creatures/ray.png";
import pelicanUrl from "../assets/game/creatures/pelican.png";
import seagullUrl from "../assets/game/creatures/seagull.png";

import houseUrl from "../assets/game/props/house.png";
import palmUrl from "../assets/game/props/palm.png";
import palmBUrl from "../assets/game/props/palm_b.png";
import rockUrl from "../assets/game/props/rock.png";
import rockBUrl from "../assets/game/props/rock_b.png";
import shellUrl from "../assets/game/props/shell.png";
import driftwoodUrl from "../assets/game/props/driftwood.png";
import portalUrl from "../assets/game/props/portal.png";

import bubbleUrl from "../assets/game/fx/bubble.png";

/** Phaser texture key → module URL */
export const ASSET_PACK: Record<string, string> = {
  sand: sandUrl,
  sand_b: sandBUrl,
  sand_c: sandCUrl,
  shallow: shallowUrl,
  water: waterUrl,
  floor: floorUrl,
  player: playerUrl,
  shark: sharkUrl,
  jelly: jellyUrl,
  ray: rayUrl,
  pelican: pelicanUrl,
  seagull: seagullUrl,
  house: houseUrl,
  palm: palmUrl,
  palm_b: palmBUrl,
  rock: rockUrl,
  rock_b: rockBUrl,
  shell: shellUrl,
  driftwood: driftwoodUrl,
  portal: portalUrl,
  bubble: bubbleUrl,
};

export function preloadAssetPack(scene: Phaser.Scene): void {
  for (const [key, url] of Object.entries(ASSET_PACK)) {
    scene.load.image(key, url);
  }
}
