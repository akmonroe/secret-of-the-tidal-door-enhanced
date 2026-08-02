# 3D models (Blender → GLB)

**Soft-realism** (pre-Simpsons) low-poly assets via Blender MCP /  
`tools/blender/build_softreal_lowpoly.py`:
kid proportions + Imagine 512² albedo + Smart UV + light decimate.

| Path | Source texture | Notes |
|------|----------------|-------|
| `characters/adventurer_girl.glb` | `imagine/characters/adventurer_girl.png` | Soft-real hierarchical kid (~700 faces); braid; limb pivots; scuba; fit height 1.8 |
| `characters/adventurer_boy.glb` | `imagine/characters/adventurer_boy.png` | Soft-real hierarchical kid (~700 faces); walk/swim/scuba via limbs |
| `characters/simpsons_kid.glb` | — | Legacy prototype; **not loaded** |
| `creatures/shark.glb` | `imagine/creatures/shark.png` | Body + snout + dorsal/pectoral/tail fins |
| `creatures/jelly.glb` | `imagine/creatures/jelly.png` | Domed bell + 6 tentacles |
| `creatures/*.glb` | `imagine/creatures/*.png` | Other elongated / bird primitives |
| `props/*.glb` | `imagine/props/*.png` | Placeholder fuller meshes for props |

### Human hierarchy (Simpsons-style)

Root empty named `adventurer_boy` / `adventurer_girl`. Game detects limb pivots by flexible names (`arm_L` / `armL` / `Arm_L`) and uses procedural walk/swim; if only a joined body is present, falls back to bob/lean (`glbMode`).

| Node | Role |
|------|------|
| `hips` | Empty pivot; children are body parts. Game bob/lean uses outer pivot at y=0 |
| `torso` | Mesh (under hips) |
| `head` | Mesh (under hips) |
| `arm_L` / `arm_R` | Empty pivots at shoulders; mesh children OK |
| `leg_L` / `leg_R` | Empty pivots at hip joints; mesh children OK |
| `scuba_tank` | Back tank + valve (show/hide via `scubaGear`) |
| `scuba_mask` | Face mask frame + lens + strap |
| `flipper_L` / `flipper_R` | Foot fins (stronger kick while visible underwater) |

Legacy joined export used `{name}_body` only — still supported as bob/lean fallback.

Rebuild one-liners: see `docs/BLENDER_MCP.md`.

```bash
export PATH="$HOME/apps/blender-4.2.9-linux-x64:$HOME/.local/bin:$PATH"
cd ~/ai-coding/secret-of-the-tidal-door-enhanced
# Soft-real low-poly humans + creatures + props (Blender MCP or headless)
blender -b -P tools/blender/build_softreal_lowpoly.py -- --who all
```
