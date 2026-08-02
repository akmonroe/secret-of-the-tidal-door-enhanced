/**
 * Blender-exported GLB models (Imagine textures UV-mapped onto fuller 3D bodies).
 * Fail soft: missing / failed loads return null so callers keep billboard/lowpoly paths.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Vite URL imports — hashed assets in production
import adventurerGirlUrl from "../../assets/models3d/characters/adventurer_girl.glb?url";
import adventurerBoyUrl from "../../assets/models3d/characters/adventurer_boy.glb?url";
import sharkUrl from "../../assets/models3d/creatures/shark.glb?url";
import jellyUrl from "../../assets/models3d/creatures/jelly.glb?url";
import rayUrl from "../../assets/models3d/creatures/ray.glb?url";
import sealionUrl from "../../assets/models3d/creatures/sealion.glb?url";
import anglerUrl from "../../assets/models3d/creatures/angler.glb?url";
import marlinUrl from "../../assets/models3d/creatures/marlin.glb?url";
import pelicanUrl from "../../assets/models3d/creatures/pelican.glb?url";
import gullUrl from "../../assets/models3d/creatures/gull.glb?url";
import palmUrl from "../../assets/models3d/props/palm.glb?url";
import stiltHouseUrl from "../../assets/models3d/props/stilt_house.glb?url";
import crateUrl from "../../assets/models3d/props/crate.glb?url";
import clueShellUrl from "../../assets/models3d/props/clue_shell.glb?url";
import rockUrl from "../../assets/models3d/props/rock.glb?url";

export type Model3dKey =
  | "adventurer_girl"
  | "adventurer_boy"
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
  | "rock";

const MODEL_URLS: Record<Model3dKey, string> = {
  adventurer_girl: adventurerGirlUrl,
  adventurer_boy: adventurerBoyUrl,
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
};

/**
 * Target size after normalize:
 * - humans: height ≈ current capsule kid (~1.75–1.85)
 * - creatures: longest axis matches old billboard footprint
 * - props: height-ish for placement
 */
type FitSpec = {
  /** Fit by bounding-box height (Y) */
  height?: number;
  /** Fit by max of X/Y/Z extents */
  maxDim?: number;
  /**
   * Extra yaw (rad) applied after load.
   * Blender creature builders elongate along +X with nose at +X;
   * game convention is facing +Z (Hazard.faceVelocity / player facing).
   */
  yaw?: number;
};

const FIT: Record<Model3dKey, FitSpec> = {
  adventurer_girl: { height: 1.8 },
  adventurer_boy: { height: 1.8 },
  // Swimmers: Blender nose +X → rotate to +Z
  shark: { maxDim: 1.55, yaw: -Math.PI / 2 },
  ray: { maxDim: 1.7, yaw: -Math.PI / 2 },
  sealion: { maxDim: 1.5, yaw: -Math.PI / 2 },
  angler: { maxDim: 1.55, yaw: -Math.PI / 2 },
  marlin: { maxDim: 1.95, yaw: -Math.PI / 2 },
  jelly: { height: 1.05 },
  // Birds: body + wing layout from blender; small yaw so beak leans +Z
  pelican: { maxDim: 1.45, yaw: -Math.PI / 2 },
  gull: { maxDim: 1.2, yaw: -Math.PI / 2 },
  palm: { height: 2.4 },
  stilt_house: { height: 5.2 },
  crate: { maxDim: 0.95 },
  clue_shell: { maxDim: 0.7 },
  rock: { maxDim: 1.1 },
};

type CacheEntry = {
  scene: THREE.Group;
  /** Ready for clone */
  ok: boolean;
};

const cache = new Map<Model3dKey, CacheEntry>();
let preloadPromise: Promise<void> | null = null;

const loader = new GLTFLoader();

function prepareLoadedRoot(root: THREE.Object3D, key: Model3dKey): void {
  const spec = FIT[key];
  if (spec.yaw) root.rotation.y += spec.yaw;

  // Shadows + double-sided cutout if alpha materials are present
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m) continue;
      // glTF from Blender often uses MeshStandardMaterial
      const std = m as THREE.MeshStandardMaterial;
      if ("map" in std && std.map) {
        std.map.colorSpace = THREE.SRGBColorSpace;
        std.map.needsUpdate = true;
      }
      if ("transparent" in std && std.transparent) {
        std.side = THREE.DoubleSide;
        std.depthWrite = true;
      }
      std.needsUpdate = true;
    }
  });

  // Measure then uniform-scale so authored Blender size matches game units
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  let scale = 1;
  if (spec.height && size.y > 1e-4) {
    scale = spec.height / size.y;
  } else if (spec.maxDim) {
    const m = Math.max(size.x, size.y, size.z);
    if (m > 1e-4) scale = spec.maxDim / m;
  }
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);

  // Plant feet / body so min Y sits at 0 (group origin on ground)
  const box2 = new THREE.Box3().setFromObject(root);
  root.position.y -= box2.min.y;
  // Center XZ on origin so spawn position is the footprint center
  const center = new THREE.Vector3();
  box2.getCenter(center);
  root.position.x -= center.x;
  root.position.z -= center.z;
}

function loadOne(key: Model3dKey, url: string): Promise<void> {
  return new Promise((resolve) => {
    loader.load(
      url,
      (gltf) => {
        const scene = gltf.scene;
        prepareLoadedRoot(scene, key);
        cache.set(key, { scene, ok: true });
        resolve();
      },
      undefined,
      (err) => {
        console.warn(`[model3d] failed to load ${key}:`, err);
        cache.set(key, { scene: new THREE.Group(), ok: false });
        resolve();
      },
    );
  });
}

/** Warm all GLB templates. Safe to call multiple times; shares one promise. */
export function preloadModels3d(): Promise<void> {
  if (preloadPromise) return preloadPromise;
  preloadPromise = Promise.all(
    (Object.keys(MODEL_URLS) as Model3dKey[]).map((key) =>
      loadOne(key, MODEL_URLS[key]),
    ),
  ).then(() => undefined);
  return preloadPromise;
}

/**
 * Deep-clone a prepared model template.
 * Returns null if not loaded yet or load failed (callers fall back).
 */
export function cloneModel3d(key: Model3dKey): THREE.Group | null {
  const entry = cache.get(key);
  if (!entry || !entry.ok) return null;

  const clone = entry.scene.clone(true);
  // Materials are shared by default from Object3D.clone — fine for static look.
  // Ensure meshes still cast shadows after clone.
  clone.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });

  const g = new THREE.Group();
  g.name = `model3d_${key}`;
  g.add(clone);
  g.userData.model3dKey = key;
  g.userData.glbMode = true;
  return g;
}

/** True once a key loaded successfully (sync check for makers). */
export function hasModel3d(key: Model3dKey): boolean {
  return cache.get(key)?.ok === true;
}
