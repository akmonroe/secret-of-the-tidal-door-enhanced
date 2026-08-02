# Game asset pack

PNG replacements for procedural textures in `src/game/textures.ts`.

## Keys (loaded in Boot)

| Key | Path | Notes |
|-----|------|--------|
| sand, sand_b, sand_c | tiles/ | 64×64 seamless beach fill variants |
| shallow, water | tiles/ | 64×64 seamless |
| floor | interior/ | 64×64 wood planks |
| player | characters/ | 64×64 top-down kid explorer |
| shark, jelly, ray | creatures/ | Face +X for Level1 rotation |
| pelican, seagull | creatures/ | Side view for flipX |
| house, palm, palm_b, rock, rock_b | props/ | Landmarks / decor |
| shell, driftwood, portal | props/ | Path crumbs + L2 door |
| bubble | fx/ | Swim VFX |

## Loading

`BootScene` preloads via `assetPack.ts`. `generateTextures()` still runs and **only fills keys that are missing**, so incomplete packs stay playable.

## Reference

`reference/style-board.png` and `*_2x2.png` are for artists only — not loaded by the game.
