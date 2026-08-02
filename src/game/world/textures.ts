import * as THREE from "three";

/**
 * Crossy Castle / Crossy Road inspired textures:
 * bright, chunky, readable, soft noise — not photoreal.
 * Distinct per-biome surfaces; toy / diorama scale detail.
 *
 * Bases are intentionally high-key so MeshToonMaterial color multiplies
 * stay candy-bright instead of muddy.
 */

const cache = new Map<string, THREE.Texture>();

function canvasTexture(
  key: string,
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  cache.set(key, tex);
  return tex;
}

/** Soft film grain so flat fills read as painted toys, not plastic slabs. */
function noise(ctx: CanvasRenderingContext2D, size: number, alpha: number, scale = 1): void {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * alpha * scale;
    d[i] = Math.min(255, Math.max(0, d[i] + n));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

/** Deterministic-ish blob (no seed needed; rebuilds are rare). */
function softBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Beach ───────────────────────────────────────────────────────────

/** Warm sand: soft dunes, shell flecks, chunky grains — sunny toy beach. */
export function sandTexture(): THREE.Texture {
  return canvasTexture("sand", 128, (ctx, s) => {
    // High-key base so biome ground tint stays bright after multiply
    const base = ctx.createLinearGradient(0, 0, s, s);
    base.addColorStop(0, "#fff8ec");
    base.addColorStop(0.45, "#ffe8c4");
    base.addColorStop(1, "#f5d9a8");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);

    // Soft dune ribbons (read as contour, not photo sand)
    for (let i = 0; i < 28; i++) {
      softBlob(
        ctx,
        Math.random() * s,
        Math.random() * s,
        10 + Math.random() * 22,
        5 + Math.random() * 10,
        `rgba(240, 210, 160, ${0.12 + Math.random() * 0.2})`,
      );
    }
    for (let i = 0; i < 12; i++) {
      softBlob(
        ctx,
        Math.random() * s,
        Math.random() * s,
        6 + Math.random() * 14,
        3 + Math.random() * 6,
        `rgba(255, 248, 230, ${0.12 + Math.random() * 0.18})`,
      );
    }

    // Tiny shell / pebble accents
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,252,245,0.65)" : "rgba(210,170,120,0.3)";
      ctx.beginPath();
      ctx.ellipse(x, y, 1.5 + Math.random() * 2.5, 1 + Math.random() * 1.5, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Chunky sparkle grains
    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = Math.random() > 0.55 ? "#fffef5" : "#e8c89a";
      const sz = Math.random() > 0.85 ? 3 : 2;
      ctx.fillRect(Math.random() * s, Math.random() * s, sz, sz);
    }
    noise(ctx, s, 0.05);
  });
}

/** Beach rock walls: chunky cobble blocks, soft mortar — not photoreal stone. */
export function rockTexture(): THREE.Texture {
  return canvasTexture("rock", 128, (ctx, s) => {
    // Warm pastel mortar so walls stay toy-bright when tinted
    ctx.fillStyle = "#d8d2c8";
    ctx.fillRect(0, 0, s, s);

    const palette = ["#e8e2d8", "#cfc8be", "#f0ebe4", "#c0b8ae", "#ddd6cc"];
    const rows = 4; // 128/4 = 32 — cleaner tile period
    const cols = 4;
    const cellH = s / rows;
    const cellW = s / cols;

    for (let row = 0; row < rows; row++) {
      const offset = (row % 2) * (cellW * 0.5);
      for (let col = -1; col <= cols; col++) {
        const x = col * cellW + offset + 2;
        const y = row * cellH + 2;
        const w = cellW - 5;
        const h = cellH - 5;
        ctx.fillStyle = palette[Math.abs(row * cols + col) % palette.length];
        roundRect(ctx, x, y, w, h, 5);
        ctx.fill();
        // highlight edge
        ctx.strokeStyle = "rgba(255,255,255,0.28)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // soft shadow corner
        ctx.fillStyle = "rgba(80,70,60,0.1)";
        ctx.fillRect(x + w * 0.55, y + h * 0.55, w * 0.4, h * 0.35);
      }
    }
    noise(ctx, s, 0.04);
  });
}

// ─── Water ───────────────────────────────────────────────────────────

/** Toy water: bold wave ribbons + foam dots; UV-scroll friendly. */
export function waterTexture(): THREE.Texture {
  return canvasTexture("water", 128, (ctx, s) => {
    // Bright cyan — multiplies cleanly with biome water color
    const g = ctx.createLinearGradient(0, 0, s * 0.3, s);
    g.addColorStop(0, "#a8ecff");
    g.addColorStop(0.35, "#7ad8f5");
    g.addColorStop(0.7, "#5ecfe8");
    g.addColorStop(1, "#4ab8d8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);

    // Soft deeper bands (period 16 → seamless on 128)
    for (let y = 0; y < s; y += 16) {
      ctx.fillStyle = "rgba(40, 140, 180, 0.1)";
      ctx.beginPath();
      ctx.moveTo(0, y + 6);
      for (let x = 0; x <= s; x += 6) {
        ctx.lineTo(x, y + 6 + Math.sin(x * 0.12 + y * 0.08) * 4);
      }
      ctx.lineTo(s, y + 14);
      ctx.lineTo(0, y + 14);
      ctx.closePath();
      ctx.fill();
    }

    // Bright wave ribbons
    ctx.lineCap = "round";
    ctx.lineWidth = 3.5;
    for (let y = 8; y < s; y += 16) {
      ctx.strokeStyle = `rgba(255,255,255,${0.22 + (y % 32 === 8 ? 0.14 : 0)})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= s; x += 6) {
        ctx.lineTo(x, y + Math.sin(x * 0.18 + y * 0.1) * 4);
      }
      ctx.stroke();
    }

    // Secondary thinner crests
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(220, 250, 255, 0.35)";
    for (let y = 16; y < s; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= s; x += 8) {
        ctx.lineTo(x, y + Math.sin(x * 0.22 + 1.5) * 2.5);
      }
      ctx.stroke();
    }

    // Foam sparkles
    for (let i = 0; i < 35; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    noise(ctx, s, 0.04);
  });
}

// ─── House ───────────────────────────────────────────────────────────

/** Indoor floorboards: warm planks, grain ticks, nail dots. */
export function woodTexture(): THREE.Texture {
  return canvasTexture("wood", 128, (ctx, s) => {
    ctx.fillStyle = "#f2e0c4";
    ctx.fillRect(0, 0, s, s);

    const plank = 16; // seamless on 128
    const lights = ["#f6e8d0", "#f0e0c4", "#edd8b8"];
    const darks = ["#e0c8a0", "#d4b890", "#dcc0a0"];

    for (let y = 0; y < s; y += plank) {
      const even = (y / plank) % 2 === 0;
      const idx = (y / plank) % lights.length;
      ctx.fillStyle = even ? lights[idx] : darks[idx];
      ctx.fillRect(0, y, s, plank - 1);

      // Vertical grain ticks
      ctx.strokeStyle = "rgba(140, 95, 55, 0.12)";
      ctx.lineWidth = 1;
      for (let x = 4 + ((y / plank) % 3) * 7; x < s; x += 18) {
        ctx.beginPath();
        ctx.moveTo(x, y + 2);
        ctx.lineTo(x + ((x * 3) % 3) - 1, y + plank - 3);
        ctx.stroke();
      }

      // Seam between planks
      ctx.strokeStyle = "rgba(120, 80, 50, 0.28)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, y + plank - 1);
      ctx.lineTo(s, y + plank - 1);
      ctx.stroke();

      // Nail / peg dots
      ctx.fillStyle = "rgba(100, 70, 45, 0.28)";
      for (const nx of [10, s / 2, s - 10]) {
        ctx.beginPath();
        ctx.arc(nx + ((y / plank) % 2) * 4, y + plank / 2, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Occasional knot
      if ((y / plank) % 3 === 1) {
        const kx = 30 + ((y / plank) * 17) % (s - 40);
        ctx.fillStyle = "rgba(140, 90, 50, 0.2)";
        ctx.beginPath();
        ctx.ellipse(kx, y + plank / 2, 4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(120, 80, 45, 0.28)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(kx, y + plank / 2, 2.5, 1.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    noise(ctx, s, 0.04);
  });
}

/** Cream stucco with soft brick undertones — sunny cottage walls. */
export function wallStuccoTexture(): THREE.Texture {
  return canvasTexture("stucco", 128, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, "#fffaf2");
    g.addColorStop(1, "#f5e8d4");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);

    // Soft plaster mottling
    for (let i = 0; i < 140; i++) {
      ctx.fillStyle = `rgba(230, 210, 180, ${Math.random() * 0.16})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 3 + Math.random() * 5, 3 + Math.random() * 5);
    }

    // Faint brick courses — period 16 tiles cleanly
    const brickH = 16;
    ctx.strokeStyle = "rgba(200, 175, 145, 0.32)";
    ctx.lineWidth = 1.5;
    for (let y = 0; y < s; y += brickH) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y);
      ctx.stroke();
      const offset = (y / brickH) % 2 === 0 ? 0 : 16;
      for (let x = offset; x < s; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + brickH);
        ctx.stroke();
      }
    }

    // Warm corner highlights
    for (let i = 0; i < 20; i++) {
      softBlob(
        ctx,
        Math.random() * s,
        Math.random() * s,
        4 + Math.random() * 8,
        3 + Math.random() * 5,
        "rgba(255, 252, 245, 0.22)",
      );
    }
    noise(ctx, s, 0.04);
  });
}

// ─── Reef ────────────────────────────────────────────────────────────

/** Seafloor sand + grass tufts + pebbles — bright Crossy underwater. */
export function grassSeafloorTexture(): THREE.Texture {
  return canvasTexture("seafloor", 128, (ctx, s) => {
    // Mint high-key base — biome green multiplies to candy seagrass
    const g = ctx.createRadialGradient(s * 0.4, s * 0.4, 10, s * 0.5, s * 0.5, s * 0.8);
    g.addColorStop(0, "#c8f8d8");
    g.addColorStop(0.55, "#98e8b8");
    g.addColorStop(1, "#78d8a0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);

    // Sand patches
    for (let i = 0; i < 14; i++) {
      softBlob(
        ctx,
        Math.random() * s,
        Math.random() * s,
        8 + Math.random() * 16,
        5 + Math.random() * 10,
        `rgba(240, 230, 180, ${0.12 + Math.random() * 0.14})`,
      );
    }

    // Chunky grass / seagrass tufts
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const h = 6 + Math.random() * 8;
      const col = Math.random() > 0.5 ? "#5fd49a" : "#3db87a";
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3.5, y - h);
      ctx.lineTo(x + 1, y - h * 0.55);
      ctx.lineTo(x + 3.5, y - h * 0.9);
      ctx.closePath();
      ctx.fill();
    }

    // Coral grit / colorful flecks
    const flecks = ["#ff8fab", "#90e0ef", "#d4a0ff", "#ffe066"];
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = flecks[i % flecks.length];
      ctx.globalAlpha = 0.4 + Math.random() * 0.35;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 1.2 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Pebbles
    for (let i = 0; i < 28; i++) {
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 2 + Math.random() * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    noise(ctx, s, 0.05);
  });
}

/** Coral reef walls: porous sponge-y blobs, saturated toy coral. */
export function coralWallTexture(): THREE.Texture {
  return canvasTexture("coralWall", 128, (ctx, s) => {
    ctx.fillStyle = "#ff8a9a";
    ctx.fillRect(0, 0, s, s);

    const tones = [
      "rgba(255, 170, 170, 0.55)",
      "rgba(255, 100, 120, 0.4)",
      "rgba(255, 200, 180, 0.45)",
      "rgba(240, 80, 110, 0.3)",
      "rgba(255, 130, 140, 0.5)",
    ];
    for (let i = 0; i < 55; i++) {
      softBlob(
        ctx,
        Math.random() * s,
        Math.random() * s,
        6 + Math.random() * 16,
        5 + Math.random() * 14,
        tones[i % tones.length],
      );
    }

    // Pore holes (sponge look) — lighter so walls don't go muddy
    for (let i = 0; i < 36; i++) {
      ctx.fillStyle = "rgba(140, 40, 60, 0.18)";
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 1.5 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bright tips
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = "rgba(255, 240, 220, 0.4)";
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 2 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    noise(ctx, s, 0.045);
  });
}

// ─── Wreck ───────────────────────────────────────────────────────────

/** Ship hull planks: warm wood bands + brass rivets + barnacle flecks. */
export function hullTexture(): THREE.Texture {
  return canvasTexture("hull", 128, (ctx, s) => {
    // Warm chocolate (not near-black) so wreck ground stays readable
    ctx.fillStyle = "#c4895a";
    ctx.fillRect(0, 0, s, s);

    const band = 16; // seamless
    for (let y = 0; y < s; y += band) {
      const even = (y / band) % 2 === 0;
      ctx.fillStyle = even ? "#d49a68" : "#b87a48";
      ctx.fillRect(0, y, s, band - 1);
      // subtle wear streak
      ctx.fillStyle = even ? "rgba(255, 200, 140, 0.18)" : "rgba(80, 45, 22, 0.12)";
      ctx.fillRect(0, y + 2, s, 4);

      ctx.strokeStyle = "rgba(60, 35, 18, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, y + band - 0.5);
      ctx.lineTo(s, y + band - 0.5);
      ctx.stroke();
    }

    // Brass rivets
    for (let y = 8; y < s; y += band) {
      for (let x = 12; x < s; x += 20) {
        ctx.fillStyle = "#ffd76a";
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 245, 180, 0.55)";
        ctx.beginPath();
        ctx.arc(x - 0.5, y - 0.5, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Barnacles / salt crust
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = `rgba(230, 225, 210, ${0.18 + Math.random() * 0.25})`;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 1.5 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft rust blooms
    for (let i = 0; i < 8; i++) {
      softBlob(
        ctx,
        Math.random() * s,
        Math.random() * s,
        5 + Math.random() * 10,
        3 + Math.random() * 6,
        "rgba(200, 100, 50, 0.16)",
      );
    }
    noise(ctx, s, 0.04);
  });
}

/** Chunked brick for wreck masonry / chimney accents. */
export function brickTexture(): THREE.Texture {
  return canvasTexture("brick", 128, (ctx, s) => {
    // Warm mortar bed
    ctx.fillStyle = "#c4b4a4";
    ctx.fillRect(0, 0, s, s);

    const brickH = 16;
    const brickW = 32; // 128/32 = 4 — cleaner tile
    const reds = ["#e07858", "#f08a68", "#d06848", "#e89070", "#c86048"];

    let row = 0;
    for (let y = 0; y < s; y += brickH) {
      const offset = row % 2 === 0 ? 0 : brickW / 2;
      for (let x = -brickW; x < s + brickW; x += brickW) {
        const bx = x + offset + 1;
        const by = y + 1;
        const bw = brickW - 3;
        const bh = brickH - 3;
        ctx.fillStyle = reds[Math.abs(row * 7 + Math.floor(x / brickW)) % reds.length];
        roundRect(ctx, bx, by, bw, bh, 2);
        ctx.fill();
        // top highlight
        ctx.fillStyle = "rgba(255, 220, 190, 0.28)";
        ctx.fillRect(bx + 1, by + 1, bw - 2, 3);
        // bottom shade
        ctx.fillStyle = "rgba(80, 30, 20, 0.15)";
        ctx.fillRect(bx + 1, by + bh - 4, bw - 2, 3);
      }
      row++;
    }
    noise(ctx, s, 0.04);
  });
}

/** Metal grate walkways — mid-value grid with warm edge highlights. */
export function metalGrateTexture(): THREE.Texture {
  return canvasTexture("grate", 128, (ctx, s) => {
    // Mid steel (not near-black) so walkways read under high-key light
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, "#8a96a4");
    g.addColorStop(0.5, "#6e7a88");
    g.addColorStop(1, "#98a4b0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);

    const cell = 16;
    // Recessed holes
    for (let y = 2; y < s; y += cell) {
      for (let x = 2; x < s; x += cell) {
        ctx.fillStyle = "#3a4450";
        roundRect(ctx, x + 2, y + 2, cell - 6, cell - 6, 2);
        ctx.fill();
        // inner shine ring
        ctx.strokeStyle = "rgba(200, 220, 240, 0.3)";
        ctx.lineWidth = 1;
        roundRect(ctx, x + 3, y + 3, cell - 8, cell - 8, 1.5);
        ctx.stroke();
      }
    }

    // Grid bars
    ctx.strokeStyle = "rgba(220, 230, 240, 0.4)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= s; i += cell) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(s, i);
      ctx.stroke();
    }

    // Corner bolts
    ctx.fillStyle = "#ffd76a";
    for (let y = 0; y <= s; y += cell) {
      for (let x = 0; x <= s; x += cell) {
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Soft rust wash
    for (let i = 0; i < 10; i++) {
      softBlob(
        ctx,
        Math.random() * s,
        Math.random() * s,
        6 + Math.random() * 12,
        4 + Math.random() * 8,
        "rgba(200, 100, 50, 0.12)",
      );
    }
    noise(ctx, s, 0.04);
  });
}

/** Painted toy crate boards — warm stripes for furniture props. */
export function crateTexture(): THREE.Texture {
  return canvasTexture("crate", 64, (ctx, s) => {
    ctx.fillStyle = "#f0c878";
    ctx.fillRect(0, 0, s, s);
    // Diagonal candy stripe
    ctx.strokeStyle = "#ffe0a0";
    ctx.lineWidth = 7;
    for (let i = -s; i < s * 2; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + s, s);
      ctx.stroke();
    }
    // Frame
    ctx.strokeStyle = "rgba(140, 80, 30, 0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, s - 4, s - 4);
    // Corner rivets
    ctx.fillStyle = "#ffd76a";
    for (const [x, y] of [
      [6, 6],
      [s - 6, 6],
      [6, s - 6],
      [s - 6, s - 6],
    ] as [number, number][]) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    noise(ctx, s, 0.04);
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

export function toonMap(
  color: number,
  map: THREE.Texture | null,
  opts?: { transparent?: boolean; opacity?: number; roughness?: number },
): THREE.MeshToonMaterial {
  const mat = new THREE.MeshToonMaterial({
    color,
    map: map ?? undefined,
    transparent: opts?.transparent ?? false,
    opacity: opts?.opacity ?? 1,
  });
  return mat;
}
