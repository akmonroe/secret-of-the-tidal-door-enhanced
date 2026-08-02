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

/** Full refine: 2× resolution + corridor widen. */
export function refineMap(rows: string[], dilatePasses = 1): string[] {
  return dilateWalkable(expandMap2x(rows), dilatePasses);
}

/** Scale grid coordinates after 2× expand. */
export function scaleCoord(c: number): number {
  return c * 2;
}
