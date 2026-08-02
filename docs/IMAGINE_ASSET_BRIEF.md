# Imagine Asset Brief — Enhanced Tidal Door

**Fork of:** Secret of the Tidal Door  
**Audience:** ~10 year olds  
**Look:** Soft realism — real materials and ocean light, but friendly, bright, and safe. Think nature-documentary water + Pixar-clear silhouettes. No horror, no gore, no nightmare anglers.

## Style contract
- Soft daylight / clear ocean water; saturated but natural colors
- Readable from high top-down / 3/4 camera
- Isolated sprites: flat solid magenta `#FF00FF` OR pure green-screen key where noted
- Tiles: seamless, no logos, no text, non-directional lighting when possible
- Same world feel across beach → kelp → ice → vents → lagoon

## Deliverables (engine-ready PNG)
### Tiles (seamless 512×512 or 1024×1024)
- sand, sand_wet, shallow_water, deep_water, seafloor, wood_plank, ice, basalt_vent, coral_wall, rock_wall, metal_grate, hull_wood

### Creatures (isolated, top-down or 3/4, ~1024px tall on key bg)
- shark, jelly, ray, pelican, gull, sealion, angler (cute not scary), marlin

### Characters
- adventurer_girl, adventurer_boy (with/optional scuba)

### Props
- palm, stilt_house, crate, coral_cluster, clue_shell, rock

### FX / UI
- bubble, vent_plume, current_chevron, heart, clue_stamp icons

## Integration
Textures go under `src/assets/imagine/`. Manifest: `src/assets/imagine/MANIFEST.md`.
Wire into `src/game/world/textures.ts` and meshes when ready.
