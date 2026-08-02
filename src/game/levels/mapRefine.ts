/**
 * Double map resolution (each cell → 2×2) and widen corridors
 * so hallways feel less tight at CELL = 1.
 */

const BLOCK = new Set(["#", "R", "F", "O", "T"]);
const SPECIAL = new Set(["P", "C", "H"]);

function isWalk(ch: string): boolean {
  return !BLOCK.has(ch) && ch !== undefined;
}

/** Expand each character to a 2×2 block of cells. */
export function expandMap2x(rows: string[]): string[] {
  const colCount = Math.max(...rows.map((r) => r.length));
  const padded = rows.map((r) => r.padEnd(colCount, rows[0]?.[0] === "#" ? "#" : " "));
  const out: string[] = [];

  for (const row of padded) {
    let top = "";
    for (const ch of row) {
      if (SPECIAL.has(ch)) {
        // Special only in top-left of the 2×2; rest walkable
        const fill = ch === "H" ? "~" : ".";
        top += ch + fill;
      } else {
        top += ch + ch;
      }
    }
    let bot = "";
    for (const ch of row) {
      if (SPECIAL.has(ch)) {
        const fill = ch === "H" ? "~" : ".";
        bot += fill + fill;
      } else {
        bot += ch + ch;
      }
    }
    out.push(top, bot);
  }
  return dedupeSpecials(out);
}

/** Ensure a single P, C, H remain. */
function dedupeSpecials(rows: string[]): string[] {
  const grid = rows.map((r) => r.split(""));
  const seen = { P: false, C: false, H: false };
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const ch = grid[r][c];
      if (ch === "P" || ch === "C" || ch === "H") {
        if (seen[ch]) {
          grid[r][c] = ch === "H" ? "~" : ".";
        } else {
          seen[ch] = true;
        }
      }
    }
  }
  return grid.map((r) => r.join(""));
}

/** Count consecutive walkable cells starting at (r,c) stepping (dr,dc). */
function walkRun(
  grid: string[][],
  r: number,
  c: number,
  dr: number,
  dc: number,
  h: number,
  w: number,
): number {
  let n = 0;
  let rr = r;
  let cc = c;
  while (rr >= 0 && rr < h && cc >= 0 && cc < w && isWalk(grid[rr][cc])) {
    n++;
    rr += dr;
    cc += dc;
    if (n > 24) break;
  }
  return n;
}

/**
 * Dilate walkable cells into thin walls once or more.
 * - Junctions (2+ walk neighbors) and thin partitions (sandwich) always open.
 * - Corridor flanks (exactly 1 walk neighbor) peel only when the hall is still
 *   narrow (≤ maxNarrowWidth), so rooms don't dissolve but 2-cell halls widen.
 */
export function dilateWalkable(
  rows: string[],
  passes = 1,
  maxNarrowWidth = 2,
): string[] {
  let grid = rows.map((r) => r.split(""));
  const h = grid.length;
  const w = Math.max(...grid.map((r) => r.length));
  grid = grid.map((r) => {
    while (r.length < w) r.push("#");
    return r;
  });

  for (let p = 0; p < passes; p++) {
    const next = grid.map((r) => r.slice());
    for (let r = 1; r < h - 1; r++) {
      for (let c = 1; c < w - 1; c++) {
        if (grid[r][c] !== "#") continue;

        const up = isWalk(grid[r - 1][c]);
        const down = isWalk(grid[r + 1][c]);
        const left = isWalk(grid[r][c - 1]);
        const right = isWalk(grid[r][c + 1]);
        let n = 0;
        if (up) n++;
        if (down) n++;
        if (left) n++;
        if (right) n++;

        const sandwich = (up && down) || (left && right);
        let carve = sandwich || n >= 2;

        // Flank peel: only into still-narrow corridors (kids need dodge room)
        if (!carve && n === 1) {
          let width = 0;
          if (up) width = walkRun(grid, r - 1, c, -1, 0, h, w);
          else if (down) width = walkRun(grid, r + 1, c, 1, 0, h, w);
          else if (left) width = walkRun(grid, r, c - 1, 0, -1, h, w);
          else if (right) width = walkRun(grid, r, c + 1, 0, 1, h, w);
          if (width > 0 && width <= maxNarrowWidth) carve = true;
        }

        if (carve) {
          const neigh = [
            grid[r - 1][c],
            grid[r + 1][c],
            grid[r][c - 1],
            grid[r][c + 1],
          ];
          next[r][c] =
            neigh.includes("~") || neigh.includes(" ") ? "~" : ".";
        }
      }
    }
    grid = next;
  }
  return dedupeSpecials(grid.map((r) => r.join("")));
}

/**
 * Chew irregular bays / peninsulas into the outer rim so maps don't feel like
 * a perfect rectangle. Seeded by map size so results are stable per layout.
 * Never overwrites P / C / H.
 */
export function irregularizeOutline(rows: string[], seed = 1): string[] {
  const grid = rows.map((r) => r.split(""));
  const h = grid.length;
  const w = Math.max(...grid.map((r) => r.length));
  for (const row of grid) {
    while (row.length < w) row.push(row[row.length - 1] ?? "~");
  }

  let s = (seed * 1103515245 + 12345) >>> 0;
  const rnd = (): number => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };

  // Large corner bites — cut diagonal-ish chunks to water
  const bites = [
    { r0: 0, c0: 0, rr: 0.22 + rnd() * 0.12, cr: 0.18 + rnd() * 0.14 },
    { r0: 0, c0: w - 1, rr: 0.18 + rnd() * 0.12, cr: 0.2 + rnd() * 0.12 },
    { r0: h - 1, c0: 0, rr: 0.2 + rnd() * 0.1, cr: 0.16 + rnd() * 0.12 },
    { r0: h - 1, c0: w - 1, rr: 0.16 + rnd() * 0.12, cr: 0.2 + rnd() * 0.1 },
  ];
  for (const b of bites) {
    const rMax = Math.floor(h * b.rr);
    const cMax = Math.floor(w * b.cr);
    for (let dr = 0; dr < rMax; dr++) {
      for (let dc = 0; dc < cMax; dc++) {
        // Diagonal falloff so the bite isn't a rectangle
        if (dr / (rMax + 0.01) + dc / (cMax + 0.01) > 0.95 + rnd() * 0.25) continue;
        const r = b.r0 === 0 ? dr : h - 1 - dr;
        const c = b.c0 === 0 ? dc : w - 1 - dc;
        if (r < 0 || r >= h || c < 0 || c >= w) continue;
        const ch = grid[r][c];
        if (SPECIAL.has(ch)) continue;
        if (rnd() < 0.82) grid[r][c] = "~";
      }
    }
  }

  // Edge nibble — meandering coast along all four sides
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const edgeDist = Math.min(r, c, h - 1 - r, w - 1 - c);
      if (edgeDist > 5) continue;
      const ch = grid[r][c];
      if (SPECIAL.has(ch)) continue;
      if (ch !== "." && ch !== "#" && ch !== "R" && ch !== "F" && ch !== "O" && ch !== "T")
        continue;
      const chance = (1 - edgeDist / 6) * 0.22;
      // Slight wave so the coast is wavy, not salt-and-pepper noise
      const wave = Math.sin(r * 0.35 + seed) * Math.cos(c * 0.28 + seed * 0.7);
      if (rnd() < chance + wave * 0.06) {
        grid[r][c] = "~";
      }
    }
  }

  // Occasional mid-edge fjords (inward water channels)
  const fjords = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < fjords; i++) {
    const side = Math.floor(rnd() * 4);
    let r = side === 0 ? 1 : side === 1 ? h - 2 : Math.floor(rnd() * (h - 4)) + 2;
    let c = side === 2 ? 1 : side === 3 ? w - 2 : Math.floor(rnd() * (w - 4)) + 2;
    const len = 4 + Math.floor(rnd() * 8);
    const dr = side === 0 ? 1 : side === 1 ? -1 : 0;
    const dc = side === 2 ? 1 : side === 3 ? -1 : 0;
    for (let k = 0; k < len; k++) {
      if (r <= 0 || r >= h - 1 || c <= 0 || c >= w - 1) break;
      if (!SPECIAL.has(grid[r][c])) {
        grid[r][c] = "~";
        // widen fjord 1 cell sideways
        if (dr !== 0) {
          if (c + 1 < w && !SPECIAL.has(grid[r][c + 1])) grid[r][c + 1] = "~";
        } else {
          if (r + 1 < h && !SPECIAL.has(grid[r + 1][c])) grid[r + 1][c] = "~";
        }
      }
      r += dr;
      c += dc;
      // slight meander
      if (dr !== 0 && rnd() < 0.35) c += rnd() < 0.5 ? -1 : 1;
      if (dc !== 0 && rnd() < 0.35) r += rnd() < 0.5 ? -1 : 1;
    }
  }

  return dedupeSpecials(grid.map((row) => row.join("")));
}

/** Full refine: 2× resolution + corridor widen + irregular coastline. */
export function refineMap(rows: string[], dilatePasses = 1): string[] {
  const seed = rows.length * 31 + (rows[0]?.length ?? 0) * 17 + dilatePasses * 3;
  return irregularizeOutline(dilateWalkable(expandMap2x(rows), dilatePasses), seed);
}

/** Scale grid coordinates after 2× expand. */
export function scaleCoord(c: number): number {
  return c * 2;
}
