# Blender MCP setup (Enhanced Tidal Door)

## What was installed

| Piece | Location |
|-------|----------|
| Blender 4.2.9 LTS (portable) | `~/apps/blender-4.2.9-linux-x64/` → `~/.local/bin/blender` |
| blender-mcp (ahujasid) | `~/apps/blender-mcp/` |
| Addon | `~/.config/blender/4.2/scripts/addons/blender_mcp_addon.py` |
| Grok MCP config | `~/.grok/config.toml` → `[mcp_servers.blender]` |
| Project MCP config | `.grok/config.toml` |
| Character GLB builder | `tools/blender/build_character_glb.py` |
| Exported models | `src/assets/models3d/` |

## How Blender MCP works

1. **Blender GUI** runs with the addon listening on **localhost:9876**
2. **MCP server** (`uvx blender-mcp`) is started by Grok and talks to that socket
3. AI tools can create meshes, assign textures, export scenes

### Start Blender with MCP socket

```bash
export PATH="$HOME/.local/bin:$PATH"
# If not already listening on 9876:
blender --python ~/apps/blender-mcp/scripts/start_mcp_server.py &
# Verify:
ss -tlnp | grep 9876
```

### Restart Grok after config change

MCP servers load at session start. Fully quit and reopen Grok (or open a new session in this project) so `[mcp_servers.blender]` is picked up.

Then check:

```bash
grok mcp list
grok mcp doctor blender
```

## Headless batch (no MCP required)

Always invoke as `blender -b -P script.py -- args` (background + Python).

### Humans + creatures — soft-real low poly (preferred)

Soft-realism Imagine albedos (pre-Simpsons), hierarchical limb pivots for walk/swim/scuba, mobile face budgets.

```bash
export PATH="$HOME/apps/blender-4.2.9-linux-x64:$HOME/.local/bin:$PATH"
cd ~/ai-coding/secret-of-the-tidal-door-enhanced

# All: humans + creatures + props
blender -b -P tools/blender/build_softreal_lowpoly.py -- --who all
# Or: --who humans | creatures | props
```

### Creatures (shark / jelly / others)

```bash
# Shark (elongated body + dorsal / pectorals / tail)
blender -b -P tools/blender/build_character_glb.py -- \
  --name shark --kind shark \
  --texture src/assets/imagine/creatures/shark.png \
  --out src/assets/models3d/creatures/shark.glb

# Jelly (domed bell + tentacles)
blender -b -P tools/blender/build_character_glb.py -- \
  --name jelly --kind jelly \
  --texture src/assets/imagine/creatures/jelly.png \
  --out src/assets/models3d/creatures/jelly.glb

# Generic elongated swimmer (ray / marlin / sealion / angler)
blender -b -P tools/blender/build_character_glb.py -- \
  --name ray --kind creature \
  --texture src/assets/imagine/creatures/ray.png \
  --out src/assets/models3d/creatures/ray.glb
```

### Props (same script, creature-style primitives)

Use `--kind creature` (or a named kind) and point `--texture` / `--out` at prop paths under `src/assets/imagine/props/` and `src/assets/models3d/props/`.

## Limits

- **Imagine** still only produces 2D textures/sprites.
- **Blender** builds the 3D mesh + UVs and maps those textures.
- MCP needs a **GUI Blender** process (display `:0` works on this machine).
- For pure automation, prefer `blender -b -P` scripts; use MCP for interactive modeling sessions.
