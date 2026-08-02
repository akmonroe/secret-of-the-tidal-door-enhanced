"""
Build hierarchical Simpsons-vein kid adventurers for Legends of the Coral Sea /
Secret of the Tidal Door Enhanced.

Exports GLBs with limb pivots for runtime walk/swim animation:
  {name}/
    hips/
      torso, head, arm_L, arm_R, leg_L, leg_R  (+ mesh children)
    scuba_tank, scuba_mask, flipper_L, flipper_R

Usage:
  blender -b -P tools/blender/build_simpsons_adventurers.py -- --who both
  blender -b -P tools/blender/build_simpsons_adventurers.py -- --who boy
  blender -b -P tools/blender/build_simpsons_adventurers.py -- --who girl
"""
from __future__ import annotations

import argparse
import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--who", choices=("boy", "girl", "both"), default="both")
    p.add_argument(
        "--out-dir",
        default=os.environ.get(
            "OUT_DIR",
            str(
                Path(__file__).resolve().parents[2]
                / "src/assets/models3d/characters"
            ),
        ),
    )
    p.add_argument(
        "--tex-dir",
        default=os.environ.get(
            "TEX_DIR",
            str(
                Path(__file__).resolve().parents[2]
                / "src/assets/imagine/characters"
            ),
        ),
    )
    return p.parse_args(argv)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.curves):
        for block in list(coll):
            coll.remove(block)


def mat(name: str, color, rough=0.55):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name=name)
        m.use_nodes = True
        bsdf = m.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            r, g, b = color[:3]
            bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
            bsdf.inputs["Roughness"].default_value = rough
    return m


def assign(obj, material):
    obj.data.materials.clear()
    obj.data.materials.append(material)


def smooth(obj):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth()


def apply_scale(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)


def empty(name: str, loc=(0, 0, 0), parent=None):
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=loc)
    o = bpy.context.active_object
    o.name = name
    o.empty_display_size = 0.08
    if parent:
        o.parent = parent
        # keep world location: parent inverse
        o.matrix_parent_inverse = parent.matrix_world.inverted()
    return o


def sphere(name, r, loc, material, scale=None, parent=None, segs=20):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segs, ring_count=max(10, segs // 2), radius=r, location=loc
    )
    o = bpy.context.active_object
    o.name = name
    if scale:
        o.scale = scale
        apply_scale(o)
    assign(o, material)
    smooth(o)
    if parent:
        o.parent = parent
        o.matrix_parent_inverse = parent.matrix_world.inverted()
    return o


def cyl(name, radius, depth, loc, material, scale=None, parent=None, verts=14):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=verts, radius=radius, depth=depth, location=loc
    )
    o = bpy.context.active_object
    o.name = name
    if scale:
        o.scale = scale
        apply_scale(o)
    assign(o, material)
    smooth(o)
    if parent:
        o.parent = parent
        o.matrix_parent_inverse = parent.matrix_world.inverted()
    return o


def cone(name, r1, depth, loc, material, scale=None, parent=None, rot=None):
    bpy.ops.mesh.primitive_cone_add(
        vertices=8, radius1=r1, radius2=0.01, depth=depth, location=loc
    )
    o = bpy.context.active_object
    o.name = name
    if rot:
        o.rotation_euler = rot
        bpy.ops.object.transform_apply(rotation=True)
    if scale:
        o.scale = scale
        apply_scale(o)
    assign(o, material)
    smooth(o)
    if parent:
        o.parent = parent
        o.matrix_parent_inverse = parent.matrix_world.inverted()
    return o


def subdiv_light(obj, levels=1):
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new("Subdiv", "SUBSURF")
    mod.levels = levels
    mod.render_levels = levels
    bpy.ops.object.modifier_apply(modifier="Subdiv")
    smooth(obj)


def make_character(name: str, is_girl: bool, tex_path: Path | None):
    """
    Authored height ≈ 1.50 (game normalizes to 1.8).
    Coordinate: Z-up, feet at Z=0, facing -Y (Blender front).
    """
    # Palette
    skin_c = (1.0, 0.85, 0.08)
    shirt_c = (0.18, 0.78, 0.62) if not is_girl else (1.0, 0.42, 0.38)  # teal / coral
    pants_c = (0.22, 0.45, 0.85) if not is_girl else (1.0, 0.72, 0.35)
    shoe_c = (0.12, 0.25, 0.65) if not is_girl else (0.95, 0.45, 0.55)
    hair_c = skin_c  # Simpsons yellow hair
    bow_c = (1.0, 0.35, 0.55)

    m_skin = mat(f"{name}_skin", skin_c, 0.6)
    m_shirt = mat(f"{name}_shirt", shirt_c, 0.55)
    m_pants = mat(f"{name}_pants", pants_c, 0.55)
    m_shoe = mat(f"{name}_shoe", shoe_c, 0.5)
    m_sock = mat(f"{name}_sock", (0.95, 0.95, 0.95), 0.5)
    m_eye = mat(f"{name}_eye", (1, 1, 1), 0.35)
    m_pupil = mat(f"{name}_pupil", (0.05, 0.05, 0.05), 0.25)
    m_mouth = mat(f"{name}_mouth", (0.2, 0.1, 0.08), 0.5)
    m_hair = mat(f"{name}_hair", hair_c, 0.55)
    m_bow = mat(f"{name}_bow", bow_c, 0.5)
    m_tank = mat(f"{name}_tank", (0.29, 0.56, 0.78), 0.35)
    m_mask = mat(f"{name}_mask", (0.22, 0.72, 1.0), 0.3)
    m_flip = mat(f"{name}_flip", (1.0, 0.56, 0.25), 0.5)

    # Optional albedo override on body materials via image texture
    if tex_path and tex_path.is_file():
        try:
            img = bpy.data.images.load(str(tex_path.resolve()))
            for m in (m_skin, m_shirt):
                nt = m.node_tree
                bsdf = nt.nodes.get("Principled BSDF")
                tex = nt.nodes.new("ShaderNodeTexImage")
                tex.image = img
                # Mix: keep solid base mostly; light map tint for variety
                # Simpler: don't override solids — Simpsons look is solid colors.
                # Attach for future UV use but disconnect for cel look.
                _ = (tex, bsdf)
        except Exception as e:
            print("tex load skip", e)

    # Root
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = name

    # Hips pivot (pelvis height ~0.55 of 1.5 unit kid)
    hips = empty("hips", (0, 0, 0.55), parent=root)

    # --- Torso (shirt) relative to hips ---
    torso = cyl(
        "torso",
        0.16,
        0.32,
        (0, 0, 0.22),
        m_shirt,
        scale=(1.05, 0.85, 1.0),
        parent=hips,
    )
    subdiv_light(torso, 1)

    # Shorts / dress base at hips
    if is_girl:
        dress = cyl(
            "dress",
            0.18,
            0.22,
            (0, 0, 0.02),
            m_shirt,
            scale=(1.15, 0.95, 1.0),
            parent=hips,
        )
        # Flare bottom slightly
        bpy.context.view_layer.objects.active = dress
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="DESELECT")
        bpy.ops.object.mode_set(mode="OBJECT")
        # bottom ring verts roughly lower half — skip complex edit; add skirt flare sphere
        skirt = sphere(
            "skirt",
            0.2,
            (0, 0, -0.06),
            m_shirt,
            scale=(1.2, 1.0, 0.45),
            parent=hips,
        )
    else:
        shorts = cyl(
            "shorts",
            0.17,
            0.16,
            (0, 0, 0.0),
            m_pants,
            scale=(1.1, 0.9, 1.0),
            parent=hips,
        )

    # Neck + head (head large, ~1:5)
    neck = cyl("neck", 0.07, 0.08, (0, 0, 0.42), m_skin, parent=hips)
    head_z = 0.68
    head = sphere("head", 0.28, (0, 0, head_z), m_skin, scale=(1.0, 0.92, 1.05), parent=hips, segs=28)
    subdiv_light(head, 1)

    jaw = sphere("jaw", 0.12, (0, -0.16, head_z - 0.16), m_skin, scale=(1.15, 0.9, 0.65), parent=hips)

    # Eyes
    for sx, side in ((-1, "R"), (1, "L")):
        eye = sphere(
            f"eye_{side}",
            0.09,
            (sx * 0.09, -0.22, head_z + 0.02),
            m_eye,
            scale=(0.95, 0.55, 1.1),
            parent=hips,
            segs=16,
        )
        pupil = sphere(
            f"pupil_{side}",
            0.035,
            (sx * 0.09, -0.26, head_z + 0.02),
            m_pupil,
            scale=(1.0, 0.35, 1.0),
            parent=hips,
            segs=12,
        )

    # Smile curve
    curve_data = bpy.data.curves.new(f"{name}_smile_c", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.bevel_depth = 0.008
    curve_data.bevel_resolution = 2
    spline = curve_data.splines.new("BEZIER")
    spline.bezier_points.add(2)
    pts = [(-0.07, -0.26, head_z - 0.12), (0, -0.27, head_z - 0.15), (0.07, -0.26, head_z - 0.12)]
    for i, co in enumerate(pts):
        bp = spline.bezier_points[i]
        bp.co = co
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"
    smile = bpy.data.objects.new("smile", curve_data)
    bpy.context.collection.objects.link(smile)
    smile.data.materials.append(m_mouth)
    smile.parent = hips
    smile.matrix_parent_inverse = hips.matrix_world.inverted()
    bpy.context.view_layer.objects.active = smile
    smile.select_set(True)
    bpy.ops.object.convert(target="MESH")

    # Hair spikes
    if is_girl:
        # Taller star-ish spikes + side volume
        spikes = [
            (0.0, 0.02, head_z + 0.32, 0.2),
            (0.12, 0.0, head_z + 0.28, 0.18),
            (-0.12, 0.0, head_z + 0.28, 0.18),
            (0.22, -0.02, head_z + 0.22, 0.15),
            (-0.22, -0.02, head_z + 0.22, 0.15),
            (0.08, 0.12, head_z + 0.26, 0.14),
            (-0.08, 0.12, head_z + 0.26, 0.14),
            (0.0, -0.1, head_z + 0.24, 0.14),
        ]
        for i, (x, y, z, d) in enumerate(spikes):
            cone(f"hair_{i}", 0.06, d, (x, y, z), m_hair, parent=hips)
        # Bow
        sphere("bow_L", 0.05, (0.14, -0.05, head_z + 0.22), m_bow, scale=(1.2, 0.5, 0.8), parent=hips)
        sphere("bow_R", 0.05, (0.22, -0.05, head_z + 0.22), m_bow, scale=(1.2, 0.5, 0.8), parent=hips)
        sphere("bow_knot", 0.03, (0.18, -0.06, head_z + 0.22), m_bow, parent=hips)
    else:
        spikes = [
            (0.0, 0.02, head_z + 0.28, 0.16),
            (0.1, 0.0, head_z + 0.26, 0.15),
            (-0.1, 0.0, head_z + 0.26, 0.15),
            (0.2, -0.02, head_z + 0.22, 0.13),
            (-0.2, -0.02, head_z + 0.22, 0.13),
            (0.28, -0.04, head_z + 0.16, 0.11),
            (-0.28, -0.04, head_z + 0.16, 0.11),
            (0.0, 0.12, head_z + 0.22, 0.12),
            (0.0, -0.12, head_z + 0.2, 0.11),
        ]
        for i, (x, y, z, d) in enumerate(spikes):
            cone(f"hair_{i}", 0.055, d, (x, y, z), m_hair, parent=hips)

    # --- Arms (pivots at shoulders) ---
    for sx, side in ((-1, "R"), (1, "L")):
        # Note: L is +X in Blender character space
        shoulder = (sx * 0.22, 0, 0.32)
        arm = empty(f"arm_{side}", shoulder, parent=hips)
        # upper arm hangs down (-Z from shoulder in rest)
        upper = cyl(
            f"arm_{side}_upper",
            0.045,
            0.2,
            (sx * 0.04, 0.0, -0.1),
            m_skin,
            parent=arm,
        )
        lower = cyl(
            f"arm_{side}_lower",
            0.04,
            0.18,
            (sx * 0.06, 0.02, -0.28),
            m_skin,
            parent=arm,
        )
        hand = sphere(
            f"hand_{side}",
            0.05,
            (sx * 0.07, 0.03, -0.4),
            m_skin,
            scale=(0.9, 0.7, 1.1),
            parent=arm,
            segs=12,
        )
        for fi in range(4):
            cyl(
                f"finger_{side}_{fi}",
                0.012,
                0.05,
                (sx * 0.09, 0.02 + fi * 0.015 - 0.03, -0.46),
                m_skin,
                parent=arm,
                verts=6,
            )

    # --- Legs (pivots at hip joints) ---
    for sx, side in ((-1, "R"), (1, "L")):
        hip_j = (sx * 0.09, 0, -0.02)
        leg = empty(f"leg_{side}", hip_j, parent=hips)
        thigh = cyl(f"thigh_{side}", 0.055, 0.2, (0, 0, -0.12), m_skin, parent=leg)
        shin = cyl(f"shin_{side}", 0.045, 0.18, (0, 0.01, -0.3), m_skin, parent=leg)
        sock = cyl(f"sock_{side}", 0.048, 0.06, (0, 0.01, -0.42), m_sock, parent=leg)
        shoe = sphere(
            f"shoe_{side}",
            0.06,
            (0, -0.03, -0.5),
            m_shoe,
            scale=(0.85, 1.35, 0.55),
            parent=leg,
            segs=12,
        )

    # --- Scuba accessories (world-ish positions parented to root for show/hide) ---
    tank = cyl("scuba_tank", 0.07, 0.28, (0, 0.18, 0.85), m_tank, parent=root)
    tank.rotation_euler[0] = math.radians(8)
    bpy.context.view_layer.objects.active = tank
    tank.select_set(True)
    bpy.ops.object.transform_apply(rotation=True)

    valve = sphere("scuba_valve", 0.04, (0, 0.18, 1.02), m_tank, parent=root)
    # Rename valve into tank mesh by joining
    bpy.ops.object.select_all(action="DESELECT")
    tank.select_set(True)
    valve.select_set(True)
    bpy.context.view_layer.objects.active = tank
    bpy.ops.object.join()
    tank = bpy.context.active_object
    tank.name = "scuba_tank"
    tank.parent = root

    # Mask
    mask = cyl("scuba_mask", 0.1, 0.04, (0, -0.28, 1.22), m_mask, scale=(1.1, 0.5, 0.7), parent=root)
    mask.name = "scuba_mask"

    # Flippers at feet
    for sx, side in ((-1, "R"), (1, "L")):
        flip = sphere(
            f"flipper_{side}",
            0.08,
            (sx * 0.09, -0.12, 0.04),
            m_flip,
            scale=(0.9, 1.8, 0.35),
            parent=root,
            segs=12,
        )
        flip.name = f"flipper_{side}"

    # Soften key body meshes
    for o in list(bpy.data.objects):
        if o.type == "MESH" and o.name in ("torso", "head", "shorts", "dress", "skirt"):
            try:
                subdiv_light(o, 1)
            except Exception:
                pass

    # Ensure feet near z=0 after hierarchy: measure and scale root
    bpy.context.view_layer.update()
    mins = Vector((1e9, 1e9, 1e9))
    maxs = Vector((-1e9, -1e9, -1e9))
    for o in bpy.data.objects:
        if o.type != "MESH":
            continue
        # only under this root
        p = o
        under = False
        while p:
            if p == root:
                under = True
                break
            p = p.parent
        if not under:
            continue
        for corner in o.bound_box:
            w = o.matrix_world @ Vector(corner)
            mins = Vector((min(mins.x, w.x), min(mins.y, w.y), min(mins.z, w.z)))
            maxs = Vector((max(maxs.x, w.x), max(maxs.y, w.y), max(maxs.z, w.z)))

    height = maxs.z - mins.z
    target = 1.50
    if height > 1e-4:
        s = target / height
        root.scale = (s, s, s)
        bpy.context.view_layer.update()

    # Plant feet
    mins = Vector((1e9, 1e9, 1e9))
    maxs = Vector((-1e9, -1e9, -1e9))
    for o in bpy.data.objects:
        if o.type != "MESH":
            continue
        p = o
        under = False
        while p:
            if p == root:
                under = True
                break
            p = p.parent
        if not under:
            continue
        for corner in o.bound_box:
            w = o.matrix_world @ Vector(corner)
            mins = Vector((min(mins.x, w.x), min(mins.y, w.y), min(mins.z, w.z)))
            maxs = Vector((max(maxs.x, w.x), max(maxs.y, w.y), max(maxs.z, w.z)))

    root.location.z -= mins.z
    root.location.x -= (mins.x + maxs.x) / 2
    root.location.y -= (mins.y + maxs.y) / 2
    bpy.context.view_layer.update()

    # Apply root location into children so root sits at origin
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    bpy.context.view_layer.objects.active = root
    # Don't apply scale on empty with children carelessly — leave scale on root for export apply

    print(
        f"{name}: height~{target}, is_girl={is_girl}, children hips={len(hips.children)}"
    )
    return root


def export_glb(root, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")

    def select_hierarchy(obj):
        obj.select_set(True)
        for c in obj.children:
            select_hierarchy(c)

    select_hierarchy(root)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        use_selection=True,
        export_format="GLB",
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_yup=True,
        export_animations=False,
    )
    print("Exported", path, "bytes", path.stat().st_size if path.exists() else 0)


def main():
    args = parse_args()
    out_dir = Path(args.out_dir)
    tex_dir = Path(args.tex_dir)
    who = args.who

    jobs = []
    if who in ("boy", "both"):
        jobs.append(("adventurer_boy", False, tex_dir / "adventurer_boy.png"))
    if who in ("girl", "both"):
        jobs.append(("adventurer_girl", True, tex_dir / "adventurer_girl.png"))

    for name, is_girl, tex in jobs:
        clear_scene()
        root = make_character(name, is_girl, tex if tex.is_file() else None)
        export_glb(root, out_dir / f"{name}.glb")

    print("DONE", [j[0] for j in jobs])


if __name__ == "__main__":
    main()
