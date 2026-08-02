# Secret of the Tidal Door — Enhanced Assets Fork

Fork of the kids beach adventure game with a **Grok Imagine** pipeline for soft-realistic textures and sprites (kid-safe, ~age 10).

## Play original live
https://akmonroe.github.io/secret-of-the-tidal-door/

## This fork
- Game code: same core (Vite + Three.js + 12 levels)
- New art: `src/assets/imagine/` (tiles, creatures, props, characters, FX)
- Brief: `docs/IMAGINE_ASSET_BRIEF.md`
- Graphics camera notes: `docs/GRAPHICS_BIBLE.md`
- Manifest (files + QA): `src/assets/imagine/MANIFEST.md`
- Regen prompts: `src/assets/imagine/PROMPTS.md`

## Style
Realistic ocean materials and light, friendly shapes and colors for grade-school players — never scary or gory. Soft photorealism + nature-doc feel, readable from the high Switch-style camera.

## Dev
```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
cd ~/ai-coding/secret-of-the-tidal-door-enhanced
npm install
npm run dev
```

Build check:
```bash
npm run build
```

## Imagine assets

| Folder | Contents |
|--------|----------|
| `src/assets/imagine/tiles/` | Seamless 512² ground/wall maps |
| `src/assets/imagine/creatures/` | Shark, jelly, ray, sealion, angler, marlin, pelican, gull |
| `src/assets/imagine/props/` | Palm, stilt house, crate, clue shell, rock |
| `src/assets/imagine/characters/` | Adventurer girl / boy |
| `src/assets/imagine/fx/` | Bubble, vent plume, current arrow |
| `src/assets/imagine/style/` | Style board (artist ref) |

### How the game loads them
- Loader: `src/game/world/imagineTextures.ts`
- Wired into: `src/game/world/textures.ts` (tiles) and biome styles in `meshes.ts` / `MazeBuilder.ts`
- **Default ON.** Procedural canvas textures are the fallback when the flag is off or a map is missing.

Toggle in the browser console:
```js
localStorage.setItem("useImagineAssets", "0"); // procedural toy look
location.reload();
// restore:
localStorage.setItem("useImagineAssets", "1");
location.reload();
```

Sprites are available via `tryImagineSprite(key)` and `makeImagineBillboard(key)` for overlays; gameplay creatures still use the 3D mesh groups in `meshes.ts`.

### Regenerating art
1. Use prompts in `src/assets/imagine/PROMPTS.md` with Grok Imagine (or any image model).
2. Save PNGs with the **exact filenames** listed in `MANIFEST.md`.
3. Sprites should use a solid magenta `#FF00FF` (or hot-pink) background; re-key to alpha if needed.
4. Tiles should be seamless 512 or 1024 square, no text/logos.
5. `npm run build` to verify Vite resolves imports.

## Do not
- Do not edit the original game at `~/ai-coding/ipad-game-development` from this fork’s pipeline work.
