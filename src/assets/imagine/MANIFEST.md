# Imagine Asset Manifest — Enhanced Tidal Door

**Style:** Soft photorealism / nature-doc materials + friendly colors for ~age 10.  
**Engine flag:** `USE_IMAGINE_ASSETS` (default on) in `src/game/world/imagineTextures.ts`  
**Toggle:** `localStorage.setItem("useImagineAssets", "0")` then reload for procedural fallback.

Sprites were chroma-keyed from hot-pink / magenta backgrounds to RGBA alpha.

---

## Style

| File | Size | Purpose | Status |
|------|------|---------|--------|
| `style/style_board.png` | 1280×720 | Material + silhouette reference board | OK — mixed photo swatches + flat icons; labels present (artist ref only, not loaded by game) |

---

## Tiles (seamless, RGB)

| File | Size | Used as | Notes / defects |
|------|------|---------|-----------------|
| `tiles/sand.png` | 512² | `sandTexture()` ground | Soft golden dunes + shell flecks. Mild directional lighting — seams usually OK at maze scale |
| `tiles/water_surface.png` | 512² | `waterTexture()` | Turquoise waves; UV-scroll friendly enough |
| `tiles/seafloor.png` | 512² | `grassSeafloorTexture()` | Mint seagrass seafloor |
| `tiles/wood_plank.png` | 512² | `woodTexture()` | Honey oak planks (house interior) |
| `tiles/ice.png` | 512² | `iceTexture()` | Pale blue-white ice; ice biome ground/walls |
| `tiles/rock_wall.png` | 512² | `rockTexture()` | Grey-beige cobble wall |
| `tiles/coral_wall.png` | 512² | `coralWallTexture()` | Pink porous coral |
| `tiles/basalt_vent.png` | 512² | `basaltTexture()` | Charcoal basalt + warm ember flecks; vent biome |

### Not yet generated (brief optional)

- `sand_wet`, `shallow_water`, `deep_water` (water_surface covers main water plane)
- `metal_grate`, `hull_wood` (still procedural in `textures.ts`)

---

## Creatures (RGBA sprites)

| File | Size | Notes / defects |
|------|------|-----------------|
| `creatures/shark.png` | 1024² | Friendly slate-blue toy-safe shark; 3/4 view. Good silhouette |
| `creatures/jelly.png` | 1024² | Cute purple jelly; slightly more cartoon than photoreal — still on-brief for age 10 |
| `creatures/ray.png` | 1024² | Manta ray; clean silhouette |
| `creatures/sealion.png` | 1024² | Friendly sea lion |
| `creatures/angler.png` | 1024² | **Cute-safe** angler with lantern lure — not horror |
| `creatures/marlin.png` | 1024² | Blue marlin billfish |
| `creatures/pelican.png` | 1024² | White pelican, open beak (playful) |
| `creatures/gull.png` | 1024² | Seagull mid-flap |

> Runtime: 3D mesh creatures in `meshes.ts` remain default. Sprites load via `tryImagineSprite` / `makeImagineBillboard` for FX overlays or future billboard mode.

---

## Props (RGBA)

| File | Size | Notes |
|------|------|-------|
| `props/palm.png` | 1024² | Tropical palm, high-angle |
| `props/stilt_house.png` | 1024² | Cozy stilt cottage |
| `props/crate.png` | 1024² | Wood crate |
| `props/clue_shell.png` | 1024² | Golden glowing clue shell |
| `props/rock.png` | 1024² | Beach boulder pile |

---

## Characters (RGBA)

| File | Size | Notes |
|------|------|-------|
| `characters/adventurer_girl.png` | 1024² | Coral dress, braid, backpack — chibi-lite soft realism |
| `characters/adventurer_boy.png` | 1024² | Teal shirt, blue shorts |

### Not yet

- Scuba variants for girl/boy

---

## FX (RGBA)

| File | Size | Notes |
|------|------|-------|
| `fx/bubble.png` | 512² | Clear water bubble |
| `fx/vent_plume.png` | 1024² | Warm vent smoke + bubbles |
| `fx/current_arrow.png` | 512² | Cyan water chevron |

### Not yet

- heart, clue_stamp UI icons

---

## Integration map

| Game API | Imagine key |
|----------|-------------|
| `sandTexture()` | `tiles/sand.png` |
| `waterTexture()` | `tiles/water_surface.png` |
| `grassSeafloorTexture()` | `tiles/seafloor.png` |
| `woodTexture()` | `tiles/wood_plank.png` |
| `rockTexture()` | `tiles/rock_wall.png` |
| `coralWallTexture()` | `tiles/coral_wall.png` |
| `iceTexture()` | `tiles/ice.png` |
| `basaltTexture()` | `tiles/basalt_vent.png` |

Biomes: **ice** → ice ground/walls; **vent** → basalt ground/walls (see `MazeBuilder.ts`).

---

## Blind QA (honest)

| Asset | Verdict |
|-------|---------|
| Sand | Excellent soft-real beach; slight lighting direction |
| Water | Good turquoise; not fully seamless at extreme zoom |
| Style board | Useful artist ref; text labels OK for non-runtime |
| Shark | Impressive but toy-safe smile — on brief |
| Angler | Successfully non-scary |
| Jelly | Cute cartoon lean; still kid-appropriate |
| Girl/Boy | Strong character read; 3/4 not pure top-down |
| Magenta key | Hot-pink BGs keyed to alpha; soft fringes may remain on glows |

---

## Regenerating

See `PROMPTS.md` for ready-to-run Grok Imagine prompts. Drop new PNGs into the folders above; keep filenames stable so Vite imports resolve. Re-run chroma key if backgrounds are pink:

```bash
# example: re-export after manual regen
# python tools/chroma_key.py src/assets/imagine/creatures/shark.png
```
