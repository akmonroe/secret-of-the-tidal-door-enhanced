# 3D models (Blender → GLB)

Built with Blender scripts, then **mobile-optimized** via `tools/blender/optimize_all_glbs.py`:
Smart UV Project + Imagine 512² albedo + decimate to face budgets (~0.4–2.5k tris per asset).

| Path | Source texture | Notes |
|------|----------------|-------|
| `characters/adventurer_girl.glb` | `imagine/characters/adventurer_girl.png` (style ref; solid cel mats in mesh) | Simpsons-vein hierarchical kid; coral dress + bow; limb pivots; scuba kit; height 1.5→fit 1.8 |
| `characters/adventurer_boy.glb` | `imagine/characters/adventurer_boy.png` (style ref; solid cel mats) | Simpsons-vein hierarchical kid; teal shirt + blue shorts; walk/swim/scuba anim via limbs |
| `characters/simpsons_kid.glb` | solid materials | Earlier joined remesh prototype (not loaded by game) |
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
# Hierarchical Simpsons-vein adventurers (boy + girl) with limb pivots + scuba
blender -b -P tools/blender/build_simpsons_adventurers.py -- --who both
```
