import * as THREE from "three";
import { cellToWorld, CELL } from "./MazeBuilder";

/** Grid-space danger / push volumes (coords on refined map). */
export type ZoneDef = {
  kind: "current" | "vent";
  /** Top-left cell of the zone AABB */
  c: number;
  r: number;
  /** Size in cells (default 3×3) */
  w?: number;
  h?: number;
  /** Current force (world units / sec) — only for kind "current" */
  forceX?: number;
  forceZ?: number;
  /** Vent damage per tick when active (default 1) */
  damage?: number;
  /** Vent pulse period seconds (default 2.4) */
  period?: number;
  /** Fraction of period that is "hot" (default 0.45) */
  activeRatio?: number;
};

export type LiveZone = {
  kind: "current" | "vent";
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  forceX: number;
  forceZ: number;
  damage: number;
  period: number;
  activeRatio: number;
  mesh: THREE.Group;
  glow?: THREE.Mesh;
};

export function buildZones(
  defs: ZoneDef[] | undefined,
  originX: number,
  originZ: number,
): LiveZone[] {
  if (!defs?.length) return [];
  const out: LiveZone[] = [];
  for (const d of defs) {
    const w = d.w ?? 3;
    const h = d.h ?? 3;
    const { x: x0, z: z0 } = cellToWorld(d.c, d.r, originX, originZ);
    const { x: x1, z: z1 } = cellToWorld(
      d.c + w - 1,
      d.r + h - 1,
      originX,
      originZ,
    );
    const minX = Math.min(x0, x1) - CELL * 0.4;
    const maxX = Math.max(x0, x1) + CELL * 0.4;
    const minZ = Math.min(z0, z1) - CELL * 0.4;
    const maxZ = Math.max(z0, z1) + CELL * 0.4;
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const bw = maxX - minX;
    const bd = maxZ - minZ;

    const mesh = new THREE.Group();
    mesh.position.set(cx, 0.02, cz);

    if (d.kind === "current") {
      // Bright raceway pad — readable on ice white and kelp green
      const pad = new THREE.Mesh(
        new THREE.PlaneGeometry(bw, bd),
        new THREE.MeshBasicMaterial({
          color: 0x20c8ff,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
        }),
      );
      pad.rotation.x = -Math.PI / 2;
      mesh.add(pad);
      // White outline rim so pad edge reads against similar blues
      const rim = new THREE.Mesh(
        new THREE.PlaneGeometry(bw * 1.06, bd * 1.06),
        new THREE.MeshBasicMaterial({
          color: 0xe8ffff,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        }),
      );
      rim.rotation.x = -Math.PI / 2;
      rim.position.y = -0.005;
      mesh.add(rim);
      // Direction chevrons — chunky cones for high top-down cam
      const fx = d.forceX ?? 0;
      const fz = d.forceZ ?? 0;
      const ang = Math.atan2(fx, fz);
      for (let i = -1; i <= 1; i++) {
        const arrow = new THREE.Mesh(
          new THREE.ConeGeometry(0.28, 0.72, 6),
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.95,
          }),
        );
        arrow.rotation.x = Math.PI / 2;
        arrow.rotation.z = ang;
        arrow.position.set(
          Math.sin(ang + Math.PI / 2) * i * 0.65,
          0.16,
          Math.cos(ang + Math.PI / 2) * i * 0.65,
        );
        mesh.add(arrow);
      }
      out.push({
        kind: "current",
        minX,
        maxX,
        minZ,
        maxZ,
        forceX: fx,
        forceZ: fz,
        damage: 0,
        period: 1,
        activeRatio: 1,
        mesh,
      });
    } else {
      // Thermal vent — charcoal rock (still darker than toy vent biome) + hot plume
      const rockR = Math.min(bw, bd);
      const rock = new THREE.Mesh(
        new THREE.CylinderGeometry(rockR * 0.35, rockR * 0.42, 0.4, 8),
        new THREE.MeshToonMaterial({ color: 0x3a3038 }),
      );
      rock.position.y = 0.18;
      mesh.add(rock);
      // Pale rim so rock edge never disappears on dark ground
      const rockRim = new THREE.Mesh(
        new THREE.CylinderGeometry(rockR * 0.43, rockR * 0.46, 0.12, 10),
        new THREE.MeshToonMaterial({ color: 0x8a6870 }),
      );
      rockRim.position.y = 0.06;
      mesh.add(rockRim);
      const glow = new THREE.Mesh(
        new THREE.CylinderGeometry(rockR * 0.24, rockR * 0.3, 0.65, 8),
        new THREE.MeshToonMaterial({
          color: 0xff8833,
          emissive: 0xff4400,
          emissiveIntensity: 0.85,
          transparent: true,
          opacity: 0.9,
        }),
      );
      glow.position.y = 0.5;
      mesh.add(glow);
      // Danger floor disc — stronger so kids see the hot zone
      const pad = new THREE.Mesh(
        new THREE.CircleGeometry(rockR * 0.52, 18),
        new THREE.MeshBasicMaterial({
          color: 0xff5520,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        }),
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.y = 0.03;
      mesh.add(pad);
      // Outer warning ring (opacity driven in updateZoneVisuals)
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(rockR * 0.5, rockR * 0.58, 24),
        new THREE.MeshBasicMaterial({
          color: 0xffee66,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;
      mesh.add(ring);
      mesh.userData.ventPad = pad;
      mesh.userData.ventRing = ring;
      out.push({
        kind: "vent",
        minX,
        maxX,
        minZ,
        maxZ,
        forceX: 0,
        forceZ: 0,
        damage: d.damage ?? 1,
        period: d.period ?? 2.4,
        activeRatio: d.activeRatio ?? 0.45,
        mesh,
        glow,
      });
    }
  }
  return out;
}

export function zoneContains(z: LiveZone, x: number, zz: number): boolean {
  return x >= z.minX && x <= z.maxX && zz >= z.minZ && zz <= z.maxZ;
}

export function ventIsHot(z: LiveZone, time: number): boolean {
  if (z.kind !== "vent") return false;
  const phase = (time % z.period) / z.period;
  return phase < z.activeRatio;
}

export function updateZoneVisuals(zones: LiveZone[], time: number): void {
  for (const z of zones) {
    if (z.kind === "vent" && z.glow) {
      const hot = ventIsHot(z, time);
      // Near-hot telegraph: last 18% of cool phase ramps warning
      const phase = (time % z.period) / z.period;
      const coolEnd = z.activeRatio;
      const warnStart = coolEnd + (1 - coolEnd) * 0.82;
      const warning = !hot && phase >= warnStart;
      const mat = z.glow.material as THREE.MeshToonMaterial;
      mat.emissiveIntensity = hot
        ? 1.35 + Math.sin(time * 14) * 0.3
        : warning
          ? 0.55 + Math.sin(time * 18) * 0.2
          : 0.22;
      mat.opacity = hot ? 0.98 : warning ? 0.65 : 0.42;
      mat.color.setHex(hot ? 0xff8833 : warning ? 0xffaa44 : 0xff9944);
      z.glow.scale.y = hot ? 1.35 + Math.sin(time * 10) * 0.18 : warning ? 0.85 : 0.55;
      z.glow.scale.x = hot ? 1.08 : 1;
      z.glow.scale.z = hot ? 1.08 : 1;
      const pad = z.mesh.userData.ventPad as THREE.Mesh | undefined;
      if (pad) {
        const pMat = pad.material as THREE.MeshBasicMaterial;
        pMat.opacity = hot ? 0.55 + Math.sin(time * 12) * 0.08 : warning ? 0.38 : 0.28;
        pMat.color.setHex(hot ? 0xff3300 : 0xff6622);
      }
      const ring = z.mesh.userData.ventRing as THREE.Mesh | undefined;
      if (ring) {
        const rMat = ring.material as THREE.MeshBasicMaterial;
        rMat.opacity = hot ? 0.85 : warning ? 0.7 + Math.sin(time * 16) * 0.15 : 0.35;
        rMat.color.setHex(hot ? 0xffee44 : warning ? 0xffcc33 : 0xffaa66);
        ring.scale.setScalar(hot ? 1.08 + Math.sin(time * 8) * 0.04 : 1);
      }
    }
    if (z.kind === "current") {
      // Subtle bob + scroll-like chevron pulse so flow direction feels alive
      z.mesh.position.y = 0.02 + Math.sin(time * 3.5) * 0.015;
      let i = 0;
      z.mesh.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !(m.geometry instanceof THREE.ConeGeometry)) return;
        // March chevrons along flow
        const bob = Math.sin(time * 6 + i * 1.2) * 0.04;
        m.position.y = 0.16 + bob;
        const mat = m.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.75 + Math.sin(time * 5 + i) * 0.2;
        i++;
      });
    }
  }
}
