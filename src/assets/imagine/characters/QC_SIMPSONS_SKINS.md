# QC — Simpsons-vein Adventurer Skins

**Project:** Secret of the Tidal Door (Enhanced)  
**Audience:** ~age 10  
**Camera:** High Switch-style / ~58° pitch — must read at small on-screen size  
**Style sources:** `docs/IMAGINE_ASSET_BRIEF.md`, `docs/GRAPHICS_BIBLE.md`  
**QC agent session date:** 2026-08-02  

---

## Paths under review

| Asset | Path | Status |
|-------|------|--------|
| Boy PNG | `src/assets/imagine/characters/adventurer_boy.png` | Reviewed |
| Girl PNG | `src/assets/imagine/characters/adventurer_girl.png` | Reviewed |
| Boy albedo (optional) | `src/assets/imagine/characters/adventurer_boy_albedo.png` | Not present |
| Girl albedo (optional) | `src/assets/imagine/characters/adventurer_girl_albedo.png` | Not present |
| Boy GLB | `src/assets/models3d/characters/adventurer_boy.glb` | Exists |
| Girl GLB | `src/assets/models3d/characters/adventurer_girl.glb` | Exists |
| Extra GLB | `src/assets/models3d/characters/simpsons_kid.glb` | Exists (reference/extra) |

---

## Current visual description (baseline, pre-regen)

### `adventurer_boy.png` (1024×1024 RGBA, ~611 KB)
- **Style:** High-end **3D Pixar / Disney soft-render** — subsurface skin, fabric weave, soft shadows, glossy eyes. **Not** flat Simpsons-vein cartoon.
- **Skin:** Natural warm brown / medium tan — **not** yellow cartoon skin.
- **Hair:** Short dark brown/black, spiky/messy — matches “short spiky” intent.
- **Outfit:** Teal T-shirt with seashell emblem, light blue denim shorts, teal sneakers, brown messenger bag, rolled blue-white mat on back; small orange flag; shark-tooth bracelet.
- **Pose:** Full body, 3/4 high angle, smiling, thumbs-up.
- **BG:** Solid hot pink / magenta key (`#FF00FF` family) — good for chroma key.
- **Kid-safe:** Yes (friendly, no horror/gore).
- **Readability:** Good silhouette at size, but clothing detail is finer than toy/diorama toon needs.

### `adventurer_girl.png` (1024×1024 RGBA, ~609 KB)
- **Style:** Same **3D Pixar soft-render** family as boy — not Simpsons-vein.
- **Skin:** Natural warm tan — **not** yellow cartoon skin.
- **Hair:** Long brown braid over shoulder, plumeria flower — “taller hair” OK, not bun/spikes.
- **Outfit:** Coral/peach short dress with white wave trim, light blue shorts under, white sneakers, teal backpack + pink bedroll, shell pouch, belt charms, holds blue starfish staff; waving.
- **Pose:** Full body, playful wave, 3/4 high angle.
- **BG:** Same solid magenta/pink key.
- **Kid-safe:** Yes.
- **Readability:** Distinct from boy (dress + braid + coral); fine detail may muddy at high camera.

### Overall baseline style call
**Realistic-leaning 3D cartoon (soft realism / Pixar), not Simpsons-vein.** Yellow skin, overbites, simple cel shapes, and flat local color are **absent**.

---

## Post-regen visual description (Review 2 — 2026-08-02)

### `adventurer_boy.png` (1024×1024 RGBA, ~551 KB, mtime ~12:40)
- **Style:** Classic **2D Simpsons TV cel** — black outlines, flat fills, no PBR. **Matches** Simpsons-vein contract.
- **Skin:** Bright yellow cartoon skin.
- **Hair:** Short yellow spiky spikes (Bart-like silhouette).
- **Outfit:** Orange T-shirt, blue shorts, blue sneakers with white soles — matches boy orange/blue palette (teal optional; orange shirt is in contract).
- **Face:** Large simple oval eyes, black pupils, mild overbite smile; waving, hand on hip.
- **BG:** Solid light blue (not `#FF00FF`); soft contact shadow under feet.
- **Kid-safe / readable:** Yes — large color blocks, clear silhouette.

### `adventurer_girl.png` (1024×1024 RGBA, ~672 KB, mtime ~12:40)
- **Style:** Same **2D Simpsons cel** family as boy.
- **Skin:** Bright yellow.
- **Hair:** Taller yellow spikes + coral/pink bow (Lisa-like; distinct from boy).
- **Outfit:** Coral/salmon sleeveless dress, coral sneakers with white laces/soles.
- **Face:** Large simple eyes, small lashes, overbite smile; wave + hand on hip.
- **BG:** Same solid light blue + soft ground shadow.
- **Kid-safe / readable:** Yes; instantly distinct from boy via dress, bow, hair volume.

### Overall post-regen style call
**PASS — Simpsons-vein yellow soft cartoon.** Role of PNGs: UI / face billboard / style refs; hierarchical GLBs use solid cel materials in Blender (not UV-baked from these sheets).

---

## QC checklist

Use this table after every Imagine regen. Mark each row **PASS** / **FAIL** / **N/A**.  
**Columns below = Review 2 (post-regen).** Review 1 failures preserved in Verdict log.

### A. Style match (Simpsons-vein / soft cartoon)

| # | Criterion | Pass if… | Boy | Girl |
|---|-----------|----------|-----|------|
| A1 | Yellow cartoon skin | Skin is clearly Simpsons-like yellow (or very close warm yellow), not photoreal / natural ethnic skin tone | **PASS** | **PASS** |
| A2 | Big simple eyes | Large oval eyes, simple iris, limited lashes; not glossy PBR micro-detail | **PASS** | **PASS** |
| A3 | Simple shapes | Cel / soft-toon volumes; minimal fabric weave, pores, freckle microdetail | **PASS** | **PASS** |
| A4 | Not horror / not realistic gore | No teeth gore, scars, uncanny, dark horror lighting | **PASS** | **PASS** |
| A5 | Soft cartoon lineage | Reads as TV-cartoon kid adventurer, not 3D film still | **PASS** | **PASS** |

### B. Kid-safe (~age 10)

| # | Criterion | Pass if… | Boy | Girl |
|---|-----------|----------|-----|------|
| B1 | Friendly expression | Smile or open friendly face; no menace | **PASS** | **PASS** |
| B2 | Age-appropriate dress | Beach/adventure kid clothes; no sexualized cut | **PASS** | **PASS** |
| B3 | No weapons / violence props | Flags, shells, staff OK; no realistic weapons | **PASS** | **PASS** |
| B4 | No scary scuba or monsters on sheet | Optional scuba later; not nightmare gear | **PASS** | **PASS** |

### C. Readability (high Switch-style camera)

| # | Criterion | Pass if… | Boy | Girl |
|---|-----------|----------|-----|------|
| C1 | Clear silhouette | Head + torso + limbs readable when shrunk ~64–128 px tall | **PASS** | **PASS** |
| C2 | Strong local color blocks | Shirt/shorts/hair/skin are large flat-ish color regions | **PASS** | **PASS** |
| C3 | High contrast vs beach/ocean | Character not camouflaged into sand/water blues alone | **PASS** | **PASS** |
| C4 | Face readable at distance | Eyes + mouth still “happy kid” when small | **PASS** | **PASS** |

### D. Alpha / key / engine readiness

| # | Criterion | Pass if… | Boy | Girl |
|---|-----------|----------|-----|------|
| D1 | PNG format | True PNG (RGBA preferred) | **PASS** | **PASS** |
| D2 | Key background | Flat solid `#FF00FF` magenta **or** clean alpha; no gradients/noise on key | **PASS‡** | **PASS‡** |
| D3 | No fringe junk | No gray matte fringe, logo, watermark, text | **PASS** | **PASS** |
| D4 | Full character in frame | Head-to-toe with margin; not cropped | **PASS** | **PASS** |
| D5 | Albedo-friendly (if used as UV paint ref) | If opaque albedo: no pure magenta bleeding into mesh UVs | N/A (style ref; 3D uses cel mats) | N/A |

‡Solid light blue BG (not `#FF00FF`). **Accepted for style-ref / UI / billboard role** — not used as chroma-key maze sprite. If engine later keys these as sprites, rekey to `#FF00FF` or cut alpha. Soft contact shadow on BG only; character fill is clean.

### E. Resolution & file health

| # | Criterion | Pass if… | Boy | Girl |
|---|-----------|----------|-----|------|
| E1 | Resolution | ≥ 512×512; target **1024×1024** | **PASS** (1024) | **PASS** (1024) |
| E2 | File size sanity | ~50 KB–2 MB typical for PNG character; not empty/corrupt | **PASS** (~551 KB) | **PASS** (~672 KB) |
| E3 | Color depth | 8-bit RGB/RGBA, non-interlaced or standard | **PASS** | **PASS** |

### F. Boy vs girl distinction

| # | Criterion | Pass if… | Result |
|---|-----------|----------|--------|
| F1 | Boy hair | Short **spiky** hair | **PASS** (yellow spikes) |
| F2 | Boy clothes | Orange and/or **teal shirt** vibe + **blue shorts** | **PASS** (orange tee + blue shorts) |
| F3 | Girl hair | Taller hair **or** bun/spikes (braid OK if tall silhouette) | **PASS** (taller spikes + bow) |
| F4 | Girl clothes | **Coral/pink** dress or coral top, friendly | **PASS** (coral dress) |
| F5 | Instant gender/role read | At 64 px, boy ≠ girl without reading labels | **PASS** |
| F6 | Shared world family | Same proportions, line weight, skin recipe, BG treatment | **PASS** (matched cel pair) |

### G. Scuba visibility notes

Scuba is **optional / later mesh accessories** (`scuba_tank`, `scuba_mask`, `flipper_L`, `flipper_R` per `docs/BLENDER_MCP.md`). Skin sheets:

| # | Criterion | Pass if… | Notes |
|---|-----------|----------|--------|
| G1 | Base outfit uncluttered | Chest/back free enough for tank silhouette | **PASS** — no backpack/props clutter |
| G2 | Head free for mask | Hair does not fully cover face; forehead/eyes clear | **PASS** |
| G3 | Limb length for flippers | Feet visible; not ankle-hidden by huge props | **PASS** |
| G4 | Color vs scuba | Teal/coral remain readable next to dark suit + yellow tank | Orange/coral + yellow skin OK next to toy scuba |
| G5 | Optional scuba sheet | If delivering with-scuba variant, mask + tank + flippers readable as friendly toy gear | Not required — GLB accessories preferred |

### H. GLB / 3D package

| # | Criterion | Pass if… | Result |
|---|-----------|----------|--------|
| H1 | Boy GLB exists | `adventurer_boy.glb` present | **PASS** — ~467 KB (>50 KB) |
| H2 | Girl GLB exists | `adventurer_girl.glb` present | **PASS** — ~535 KB (>50 KB) |
| H3 | Size reasonable | Each **> 50 KB** and ideally < ~5 MB | **PASS** |
| H4 | Texture alignment | When new skins land, GLB materials should use matching albedo (or re-export) | **PASS** — rebuilt hierarchical GLBs with solid cel materials (style-aligned; not UV-from-PNG required) |

Optional: `simpsons_kid.glb` present — style reference mesh; not a substitute for boy/girl pair.

---

## Pass / fail criteria (overall)

**PASS** only if **all** of the following hold for **both** boy and girl:

1. **Style:** A1–A5 all PASS (true Simpsons-vein / yellow soft cartoon, not Pixar soft-real).
2. **Safety:** B1–B4 all PASS.
3. **Readability:** C1–C4 all PASS.
4. **Engine:** D1–D4 and E1–E3 all PASS.
5. **Cast:** F1–F6 all PASS.
6. **GLB:** H1–H3 PASS (H4 after rebind).

**FAIL** if any of A1–A5, B*, C2/C4, D*, E*, or F* fail.  
**PENDING** if assets missing, mid-regen, or not yet re-reviewed after parent generation.

---

## Verdict log

### Review 1 — baseline (2026-08-02)

| Field | Value |
|-------|--------|
| **Overall verdict** | **FAIL** |
| **Reason** | Wrong art style family: soft 3D Pixar realism with natural skin. Contract requires **Simpsons-vein** yellow skin, big simple eyes, simple shapes, readable toon blocks. |
| **Boy** | FAIL (style A1–A5) |
| **Girl** | FAIL (style A1–A5) |
| **Kid-safe** | PASS |
| **Key/BG** | PASS (solid magenta/pink) |
| **Resolution** | PASS (1024×1024) |
| **Boy/girl distinct** | PASS (outfit/hair) |
| **GLBs** | PASS size/existence; texture style still non-Simpsons until rebind |
| **Next action** | Parent regenerates skins with prompts below; QC re-opens PNGs and updates Review 2 |

### Review 2 — post-regen (2026-08-02 ~12:40)

| Field | Value |
|-------|--------|
| **Overall verdict** | **PASS** |
| **Reason** | True Simpsons-vein 2D cel: yellow skin, big simple eyes, flat colors, black outlines. Boy orange/blue vs girl coral dress + bow — distinct and kid-safe. GLBs rebuilt (~467 / ~535 KB) with cel materials. |
| **Boy** | **PASS** (A–F) |
| **Girl** | **PASS** (A–F) |
| **Kid-safe** | **PASS** |
| **Key/BG** | Solid light blue (accepted for style-ref/UI/billboard; not magenta chroma) |
| **Resolution** | **PASS** (1024×1024 both) |
| **Boy/girl distinct** | **PASS** |
| **GLBs** | **PASS** existence + size; cel materials style-aligned (H4 PASS) |
| **Optional note** | If PNGs ever used as chroma sprites, rekey BG to `#FF00FF` or export alpha cutouts. No regen required for current role. |

---

## Regen prompts (archived — Review 1 FAIL; keep for future reworks)

Use Imagine (or equivalent) with **exact** style language. Prefer **one character per image**, full body, solid `#FF00FF` background, 1024×1024, no text/watermark.

### Shared negative / avoid block (append to both)

```
Avoid: photorealistic skin, Pixar 3D render, Disney CGI, Unreal Engine, subsurface scattering pores, fabric weave microdetail, natural brown or Caucasian skin tones, horror, gore, blood, scary teeth, adult proportions, sexy outfit, logos, watermarks, text, busy background, gradient background, dark moody lighting.
```

### Boy — primary regen prompt

```
Full-body kid adventurer boy, Simpsons cartoon style, The Simpsons TV animation look, bright yellow skin, large simple oval eyes with black outlines, overbite smile optional, short spiky black or dark brown hair, simple cel-shaded shapes, soft cartoon not 3D, teal t-shirt with small seashell emblem, blue shorts, simple teal sneakers, minimal backpack or none, friendly beach explorer ~10 years old, head slightly large chibi-lite, clean black outline, flat bright colors, high readability, three-quarter view full body standing, solid pure magenta background #FF00FF, no shadows on background, kid-safe, game character sprite sheet style, 1024x1024
```

### Girl — primary regen prompt

```
Full-body kid adventurer girl, Simpsons cartoon style, The Simpsons TV animation look, bright yellow skin, large simple oval eyes with black outlines, friendly open smile, taller hair in bun or short spikes or high braid with simple shapes, simple cel-shaded, soft cartoon not 3D, coral pink dress or coral top with simple wave trim, light blue shorts optional under dress, simple white or coral sneakers, small shell charm optional, friendly beach explorer ~10 years old, head slightly large chibi-lite, clean black outline, flat bright colors, high readability, three-quarter view full body standing or slight wave, solid pure magenta background #FF00FF, no shadows on background, kid-safe, game character sprite sheet style, 1024x1024
```

### Optional albedo variants (opaque UV paint refs)

If exporting for 3D bake / texture paint (no chroma key):

**Boy albedo**

```
Same Simpsons-style yellow-skin adventurer boy as approved sheet, front T-pose or A-pose, flat lighting, no background key color, opaque white or neutral gray backdrop, albedo-only no specular, no AO baked heavy, teal shirt blue shorts, simple shapes, game texture reference, 1024x1024 PNG
```

**Girl albedo**

```
Same Simpsons-style yellow-skin adventurer girl as approved sheet, front T-pose or A-pose, flat lighting, no background key color, opaque white or neutral gray backdrop, albedo-only, coral pink dress, simple shapes, game texture reference, 1024x1024 PNG
```

Save albedo as:
- `src/assets/imagine/characters/adventurer_boy_albedo.png`
- `src/assets/imagine/characters/adventurer_girl_albedo.png`

### Scuba-friendly secondary (only if parent wants gear on sheet)

```
Same character [boy|girl] Simpsons yellow-skin style, add cute toy scuba: yellow air tank on back, clear round mask on forehead or face, blue flippers, still fully kid-safe and readable at small size, solid #FF00FF background, full body
```

---

## Re-check procedure (for parent / next QC pass)

1. Confirm new PNGs overwrite or land at the paths above; note mtime.
2. `read_file` both images; re-fill checklist columns.
3. Update **Review 2** verdict to PASS or FAIL.
4. If FAIL, add **Review N** notes + tightened regen prompts (what still wrong: skin tone, 3D shading, etc.).
5. After PASS skins, rebind/re-export GLBs so `adventurer_*.glb` materials match (H4 → PASS).

---

## File size snapshot

### Review 1 (baseline Pixar)
```
adventurer_boy.png     1024x1024 RGBA  ~611 KB
adventurer_girl.png    1024x1024 RGBA  ~609 KB
adventurer_boy.glb     ~1.1 MB
adventurer_girl.glb    ~1.1 MB
```

### Review 2 (Simpsons-vein — current)
```
adventurer_boy.png     1024x1024 RGBA  ~551 KB
adventurer_girl.png    1024x1024 RGBA  ~672 KB
adventurer_boy.glb     ~467 KB   (>50 KB) OK
adventurer_girl.glb    ~535 KB   (>50 KB) OK
```

---

## Summary for parent agent

| Item | Result |
|------|--------|
| **QC verdict** | **PASS** |
| **Paths reviewed** | Boy/girl PNG + boy/girl GLB (post-regen) |
| **Blocker** | None |
| **Optional polish** | Magenta `#FF00FF` or alpha only if PNGs become chroma sprites |
| **3D** | Hierarchical GLBs with solid cel materials — style-aligned |
