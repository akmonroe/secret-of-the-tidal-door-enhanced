/** Shared AABB helpers for maze walls, moving gates, and creatures. */

export type Blocker = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export function circleHitsBlocker(
  x: number,
  z: number,
  radius: number,
  b: Blocker,
): boolean {
  const nearestX = Math.max(b.minX, Math.min(x, b.maxX));
  const nearestZ = Math.max(b.minZ, Math.min(z, b.maxZ));
  const dx = x - nearestX;
  const dz = z - nearestZ;
  return dx * dx + dz * dz < radius * radius;
}

export function circleHitsAny(
  x: number,
  z: number,
  radius: number,
  blockers: Blocker[],
): boolean {
  for (const b of blockers) {
    if (circleHitsBlocker(x, z, radius, b)) return true;
  }
  return false;
}

/**
 * Resolve circle out of blockers.
 * Multi-pass so stacked walls / moving gates can't leave the body overlapping.
 */
export function resolveCircle(
  x: number,
  z: number,
  radius: number,
  blockers: Blocker[],
  passes = 4,
): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (let pass = 0; pass < passes; pass++) {
    let moved = false;
    for (const b of blockers) {
      const nearestX = Math.max(b.minX, Math.min(px, b.maxX));
      const nearestZ = Math.max(b.minZ, Math.min(pz, b.maxZ));
      const dx = px - nearestX;
      const dz = pz - nearestZ;
      const dist = Math.hypot(dx, dz);
      if (dist < radius && dist > 1e-6) {
        const push = (radius - dist) / dist;
        px += dx * push;
        pz += dz * push;
        moved = true;
      } else if (
        dist <= 1e-6 &&
        px >= b.minX &&
        px <= b.maxX &&
        pz >= b.minZ &&
        pz <= b.maxZ
      ) {
        const left = px - b.minX;
        const right = b.maxX - px;
        const up = pz - b.minZ;
        const down = b.maxZ - pz;
        const m = Math.min(left, right, up, down);
        if (m === left) px = b.minX - radius;
        else if (m === right) px = b.maxX + radius;
        else if (m === up) pz = b.minZ - radius;
        else pz = b.maxZ + radius;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return { x: px, z: pz };
}
