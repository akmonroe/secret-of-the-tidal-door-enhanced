# 3D models (Blender → GLB)

Built with `tools/blender/build_character_glb.py` + Imagine textures UV-mapped via Smart UV Project (`island_margin=0.06`).

| Path | Source texture | Notes |
|------|----------------|-------|
| `characters/adventurer_girl.glb` | `imagine/characters/adventurer_girl.png` | Kid body (~1:5 head), hair/braid volume, Imagine albedo |
| `characters/adventurer_boy.glb` | `imagine/characters/adventurer_boy.png` | Same (no braid) |
| `creatures/shark.glb` | `imagine/creatures/shark.png` | Body + snout + dorsal/pectoral/tail fins |
| `creatures/jelly.glb` | `imagine/creatures/jelly.png` | Domed bell + 6 tentacles |
| `creatures/*.glb` | `imagine/creatures/*.png` | Other elongated / bird primitives |
| `props/*.glb` | `imagine/props/*.png` | Placeholder fuller meshes for props |

### Human hierarchy

Root empty named after the character; children:

| Node | Role |
|------|------|
| `{name}_body` | Joined textured mesh (torso/head/limbs/hair) |
| `scuba_tank` | Back tank + valve (show/hide) |
| `scuba_mask` | Face mask frame + lens + strap |
| `flipper_L` / `flipper_R` | Foot fins |

Rebuild one-liners: see `docs/BLENDER_MCP.md`.

```bash
export PATH="$HOME/.local/bin:$PATH"
cd ~/ai-coding/secret-of-the-tidal-door-enhanced
for n in adventurer_girl adventurer_boy; do
  blender -b -P tools/blender/build_character_glb.py -- \
    --name $n --kind human \
    --texture src/assets/imagine/characters/$n.png \
    --out src/assets/models3d/characters/$n.glb
done
```
