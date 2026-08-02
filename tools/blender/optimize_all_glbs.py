"""
Optimize all game GLBs: lower poly + rich UV-mapped Imagine textures.

For each GLB under src/assets/models3d/{characters,creatures,props}:
  1. Import
  2. For every mesh: Smart UV Project (generous island margin)
  3. Assign Principled BSDF + Imagine PNG albedo when available
  4. Decimate toward target face budgets (mobile-friendly)
  5. Shade smooth + re-export GLB (apply modifiers)

Preserves object hierarchy/names (arm_L, scuba_tank, etc.) for runtime anim.

Usage:
  blender -b -P tools/blender/optimize_all_glbs.py
  blender -b -P tools/blender/optimize_all_glbs.py -- --only shark,jelly
  blender -b -P tools/blender/optimize_all_glbs.py -- --target-faces 800
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT / "src/assets/models3d"
IMAGINE = ROOT / "src/assets/imagine"

# Target triangle budgets after decimate (hero characters slightly higher)
FACE_BUDGET = {
    "adventurer_boy": 2200,
    "adventurer_girl": 2200,
    "simpsons_kid": 1800,
    "shark": 900,
    "jelly": 700,
    "ray": 700,
    "sealion": 800,
    "angler": 800,
    "marlin": 800,
    "pelican": 700,
    "gull": 600,
    "palm": 900,
    "stilt_house": 1200,
    "crate": 400,
    "clue_shell": 500,
    "rock": 500,
}

# Map model stem → texture path
TEX_MAP = {
    "adventurer_boy": IMAGINE / "characters/adventurer_boy.png",
    "adventurer_girl": IMAGINE / "characters/adventurer_girl.png",
    "shark": IMAGINE / "creatures/shark.png",
    "jelly": IMAGINE / "creatures/jelly.png",
    "ray": IMAGINE / "creatures/ray.png",
    "sealion": IMAGINE / "creatures/sealion.png",
    "angler": IMAGINE / "creatures/angler.png",
    "marlin": IMAGINE / "creatures/marlin.png",
    "pelican": IMAGINE / "creatures/pelican.png",
    "gull": IMAGINE / "creatures/gull.png",
    "palm": IMAGINE / "props/palm.png",
    "stilt_house": IMAGINE / "props/stilt_house.png",
    "crate": IMAGINE / "props/crate.png",
    "clue_shell": IMAGINE / "props/clue_shell.png",
    "rock": IMAGINE / "props/rock.png",
}


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--only", default="", help="Comma list of stems, empty = all")
    p.add_argument("--target-faces", type=int, default=0, help="Override all budgets")
    p.add_argument("--skip-tex", action="store_true")
    return p.parse_args(argv)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for coll in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.armatures,
        bpy.data.curves,
    ):
        for b in list(coll):
            coll.remove(b)


def mesh_objects():
    return [o for o in bpy.data.objects if o.type == "MESH"]


def total_faces():
    return sum(len(o.data.polygons) for o in mesh_objects())


def total_verts():
    return sum(len(o.data.vertices) for o in mesh_objects())


def ensure_active(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def smart_uv(obj, island_margin=0.04):
    ensure_active(obj)
    if obj.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    try:
        bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=island_margin)
    except Exception as e:
        print("  UV fail", obj.name, e)
    bpy.ops.object.mode_set(mode="OBJECT")


def make_textured_mat(name: str, tex_path: Path | None, fallback=(0.7, 0.7, 0.75, 1.0)):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    links = m.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.inputs["Roughness"].default_value = 0.62
    if tex_path and tex_path.is_file():
        img = bpy.data.images.load(str(tex_path.resolve()))
        # Mobile budget: 512² albedo keeps look rich on low-poly shells
        w, h = img.size
        if w > 512 or h > 512:
            img.scale(512, 512)
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = img
        tex.interpolation = "Linear"
        links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    else:
        bsdf.inputs["Base Color"].default_value = fallback
    return m


def assign_mat(obj, mat):
    ensure_active(obj)
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def decimate_obj(obj, ratio: float):
    if ratio >= 0.999 or ratio <= 0.01:
        return
    ensure_active(obj)
    mod = obj.modifiers.new("DecimateOpt", "DECIMATE")
    mod.ratio = max(0.02, min(1.0, ratio))
    try:
        bpy.ops.object.modifier_apply(modifier=mod.name)
    except Exception as e:
        print("  decimate fail", obj.name, e)
        obj.modifiers.remove(mod)


def shade_smooth(obj):
    ensure_active(obj)
    bpy.ops.object.shade_smooth()
    if hasattr(obj.data, "use_auto_smooth"):
        obj.data.use_auto_smooth = True
        obj.data.auto_smooth_angle = 0.85


def optimize_file(glb_path: Path, target_faces: int, skip_tex: bool):
    stem = glb_path.stem
    print(f"\n=== {stem} target_faces={target_faces} ===")
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(glb_path))

    before_f = total_faces()
    before_v = total_verts()
    print(f"  import faces={before_f} verts={before_v} meshes={len(mesh_objects())}")

    tex = None if skip_tex else TEX_MAP.get(stem)
    mat = make_textured_mat(f"{stem}_mat", tex)

    meshes = mesh_objects()
    if not meshes:
        print("  NO MESHES — skip")
        return

    # UV + material per mesh (preserve multi-mat hierarchy by replacing slot 0)
    for o in meshes:
        smart_uv(o)
        # Keep multiple material slots if present — put textured mat in all slots
        # for weight savings, but for multi-color characters prefer first slot only
        if stem.startswith("adventurer") or stem == "simpsons_kid":
            # Don't wipe multi-color cel slots entirely — add texture as emission mix? 
            # For mobile: single rich albedo from Imagine sheet is better than 8 solid mats.
            assign_mat(o, mat)
        else:
            assign_mat(o, mat)
        shade_smooth(o)

    # Decimate proportionally across meshes
    faces_now = total_faces()
    if faces_now > target_faces and faces_now > 0:
        ratio = target_faces / faces_now
        # Slightly higher ratio (less aggressive) to keep silhouette
        ratio = min(1.0, ratio * 1.05)
        print(f"  decimate ratio={ratio:.3f}")
        for o in mesh_objects():
            # Skip tiny meshes (pupils, etc.)
            if len(o.data.polygons) < 24:
                continue
            decimate_obj(o, ratio)
            shade_smooth(o)

    after_f = total_faces()
    after_v = total_verts()
    print(f"  after faces={after_f} verts={after_v}")

    # Export overwrite
    bpy.ops.object.select_all(action="SELECT")
    kwargs = dict(
        filepath=str(glb_path),
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_yup=True,
        export_animations=False,
    )
    # Prefer smaller textures in GLB
    try:
        kwargs["export_image_quality"] = 80
    except Exception:
        pass
    try:
        bpy.ops.export_scene.gltf(**kwargs)
    except TypeError:
        # Older Blender: drop unknown kwargs
        for k in list(kwargs.keys()):
            if k.startswith("export_image"):
                kwargs.pop(k, None)
        bpy.ops.export_scene.gltf(**kwargs)

    size = glb_path.stat().st_size
    print(f"  wrote {glb_path.name} ({size // 1024} KB)  {before_f}->{after_f} faces")


def main():
    args = parse_args()
    only = {s.strip() for s in args.only.split(",") if s.strip()}
    glbs = sorted(MODELS.glob("*/*.glb"))
    if only:
        glbs = [g for g in glbs if g.stem in only]
    print(f"Optimizing {len(glbs)} GLBs under {MODELS}")

    for glb in glbs:
        budget = args.target_faces or FACE_BUDGET.get(glb.stem, 800)
        try:
            optimize_file(glb, budget, args.skip_tex)
        except Exception as e:
            print(f"FAILED {glb.stem}: {e}")
            import traceback

            traceback.print_exc()

    print("\nALL DONE")


if __name__ == "__main__":
    main()
