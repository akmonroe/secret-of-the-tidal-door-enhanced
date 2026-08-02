"""
Soft-realism (pre-Simpsons) kid adventurers + creatures — low poly, rich UV albedo.

Style: Imagine soft-real / nature-doc friendly kids (warm skin, teal/coral clothes),
NOT yellow cel Simpsons. Targets mobile load: low segs + 512 albedo + light decimate.

Hierarchy for humans (walk/swim/scuba):
  {name}/ hips/ torso,head,arm_L,arm_R,leg_L,leg_R + scuba_* flipper_*

Usage:
  blender -b -P tools/blender/build_softreal_lowpoly.py -- --who all
  blender -b -P tools/blender/build_softreal_lowpoly.py -- --who humans
  blender -b -P tools/blender/build_softreal_lowpoly.py -- --who creatures
"""
from __future__ import annotations

import argparse
import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT_CHARS = ROOT / "src/assets/models3d/characters"
OUT_CREATURES = ROOT / "src/assets/models3d/creatures"
OUT_PROPS = ROOT / "src/assets/models3d/props"
IMAGINE = ROOT / "src/assets/imagine"


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--who", choices=("all", "humans", "creatures", "props"), default="all")
    return p.parse_args(argv)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.curves):
        for b in list(coll):
            coll.remove(b)


def apply_scale(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)


def smooth(obj):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth()


def mat_tex(name: str, tex: Path | None, color=(0.8, 0.65, 0.5, 1.0), size=512):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    links = m.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.inputs["Roughness"].default_value = 0.58
    if tex and tex.is_file():
        img = bpy.data.images.load(str(tex.resolve()))
        if max(img.size) > size:
            img.scale(size, size)
        t = nodes.new("ShaderNodeTexImage")
        t.image = img
        t.interpolation = "Linear"
        links.new(t.outputs["Color"], bsdf.inputs["Base Color"])
    else:
        bsdf.inputs["Base Color"].default_value = color
    return m


def mat_solid(name: str, color, rough=0.5):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color[:3], 1.0)
        bsdf.inputs["Roughness"].default_value = rough
    return m


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def smart_uv(obj, margin=0.05):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=margin)
    bpy.ops.object.mode_set(mode="OBJECT")


def decimate(obj, target_faces: int):
    f = len(obj.data.polygons)
    if f <= target_faces or f < 8:
        return
    ratio = max(0.05, target_faces / f)
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new("Dec", "DECIMATE")
    mod.ratio = min(1.0, ratio * 1.05)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    smooth(obj)


def empty(name, loc, parent=None):
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=loc)
    o = bpy.context.active_object
    o.name = name
    o.empty_display_size = 0.06
    if parent:
        o.parent = parent
        o.matrix_parent_inverse = parent.matrix_world.inverted()
    return o


def sphere(name, r, loc, mat, scale=None, parent=None, segs=12):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segs, ring_count=max(6, segs // 2), radius=r, location=loc
    )
    o = bpy.context.active_object
    o.name = name
    if scale:
        o.scale = scale
        apply_scale(o)
    assign(o, mat)
    smooth(o)
    if parent:
        o.parent = parent
        o.matrix_parent_inverse = parent.matrix_world.inverted()
    return o


def cyl(name, r, depth, loc, mat, scale=None, parent=None, verts=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc)
    o = bpy.context.active_object
    o.name = name
    if scale:
        o.scale = scale
        apply_scale(o)
    assign(o, mat)
    smooth(o)
    if parent:
        o.parent = parent
        o.matrix_parent_inverse = parent.matrix_world.inverted()
    return o


def plant_and_scale(root, target_h=1.5):
    bpy.context.view_layer.update()
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
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            mins = Vector((min(mins.x, w.x), min(mins.y, w.y), min(mins.z, w.z)))
            maxs = Vector((max(maxs.x, w.x), max(maxs.y, w.y), max(maxs.z, w.z)))
    h = maxs.z - mins.z
    if h > 1e-4:
        s = target_h / h
        root.scale = (s, s, s)
        bpy.context.view_layer.update()
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
            for c in o.bound_box:
                w = o.matrix_world @ Vector(c)
                mins = Vector((min(mins.x, w.x), min(mins.y, w.y), min(mins.z, w.z)))
                maxs = Vector((max(maxs.x, w.x), max(maxs.y, w.y), max(maxs.z, w.z)))
    root.location.z -= mins.z
    root.location.x -= (mins.x + maxs.x) * 0.5
    root.location.y -= (mins.y + maxs.y) * 0.5


def export_glb(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    kwargs = dict(
        filepath=str(path),
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_yup=True,
        export_animations=False,
    )
    try:
        bpy.ops.export_scene.gltf(**kwargs)
    except TypeError:
        bpy.ops.export_scene.gltf(
            filepath=str(path),
            export_format="GLB",
            use_selection=False,
            export_apply=True,
            export_texcoords=True,
            export_normals=True,
            export_materials="EXPORT",
            export_yup=True,
        )
    print("Exported", path, path.stat().st_size // 1024, "KB")


def join_named(parts, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    return o


# ── Humans (soft-real kid, hierarchical, low poly) ───────────────────────────

def make_human(name: str, is_girl: bool):
    clear_scene()
    tex = IMAGINE / "characters" / f"{name}.png"
    body_mat = mat_tex(f"{name}_body", tex, color=(0.85, 0.65, 0.48, 1), size=512)
    tank_mat = mat_solid(f"{name}_tank", (0.25, 0.5, 0.72), 0.35)
    mask_mat = mat_solid(f"{name}_mask", (0.2, 0.7, 0.95), 0.3)
    flip_mat = mat_solid(f"{name}_flip", (1.0, 0.55, 0.25), 0.5)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = name

    hips = empty("hips", (0, 0, 0.55), parent=root)

    # Soft torso (capsule-ish via scaled sphere + cylinder) — natural kid proportions
    torso = cyl("torso", 0.17, 0.34, (0, 0, 0.22), body_mat, scale=(1.05, 0.82, 1), parent=hips, verts=10)
    shoulders = sphere("shoulders", 0.16, (0, 0, 0.38), body_mat, scale=(1.25, 0.7, 0.55), parent=hips, segs=10)
    neck = cyl("neck", 0.06, 0.07, (0, 0, 0.48), body_mat, parent=hips, verts=8)

    head_z = 0.72
    head = sphere("head", 0.22, (0, 0, head_z), body_mat, scale=(1.02, 0.95, 1.05), parent=hips, segs=14)

    # Hair volume (soft, not spikes)
    if is_girl:
        hair = sphere("hair", 0.24, (0, -0.02, head_z + 0.04), body_mat, scale=(1.08, 1.0, 0.85), parent=hips, segs=12)
        braid = cyl("braid", 0.045, 0.28, (0.18, -0.04, head_z - 0.2), body_mat, parent=hips, verts=8)
        braid.rotation_euler[1] = math.radians(22)
        braid.rotation_euler[2] = math.radians(-15)
        bpy.context.view_layer.objects.active = braid
        bpy.ops.object.transform_apply(rotation=True)
    else:
        hair = sphere("hair", 0.23, (0, -0.01, head_z + 0.06), body_mat, scale=(1.05, 1.0, 0.55), parent=hips, segs=10)

    # Pants / shorts blob under hips
    shorts = cyl("shorts", 0.15, 0.14, (0, 0, 0.02), body_mat, scale=(1.1, 0.9, 1), parent=hips, verts=10)

    # Arms
    for sx, side in ((1, "L"), (-1, "R")):
        arm = empty(f"arm_{side}", (sx * 0.24, 0, 0.34), parent=hips)
        cyl(f"arm_{side}_u", 0.045, 0.18, (sx * 0.03, 0, -0.1), body_mat, parent=arm, verts=8)
        cyl(f"arm_{side}_l", 0.04, 0.16, (sx * 0.04, 0.01, -0.26), body_mat, parent=arm, verts=8)
        sphere(f"hand_{side}", 0.045, (sx * 0.05, 0.02, -0.38), body_mat, parent=arm, segs=8)

    # Legs
    for sx, side in ((1, "L"), (-1, "R")):
        leg = empty(f"leg_{side}", (sx * 0.09, 0, -0.02), parent=hips)
        cyl(f"thigh_{side}", 0.055, 0.18, (0, 0, -0.12), body_mat, parent=leg, verts=8)
        cyl(f"shin_{side}", 0.045, 0.16, (0, 0.01, -0.28), body_mat, parent=leg, verts=8)
        sphere(f"foot_{side}", 0.055, (0, -0.03, -0.42), body_mat, scale=(0.9, 1.4, 0.5), parent=leg, segs=8)

    # Scuba (root-level names for game toggle)
    tank = cyl("scuba_tank", 0.07, 0.26, (0, 0.2, 0.85), tank_mat, parent=root, verts=10)
    sphere("scuba_valve", 0.035, (0, 0.2, 1.0), tank_mat, parent=root, segs=8)
    bpy.ops.object.select_all(action="DESELECT")
    tank.select_set(True)
    bpy.data.objects["scuba_valve"].select_set(True)
    bpy.context.view_layer.objects.active = tank
    bpy.ops.object.join()
    tank = bpy.context.active_object
    tank.name = "scuba_tank"
    tank.parent = root

    cyl("scuba_mask", 0.09, 0.035, (0, -0.24, 1.2), mask_mat, scale=(1.15, 0.45, 0.7), parent=root, verts=10)

    for sx, side in ((1, "L"), (-1, "R")):
        sphere(
            f"flipper_{side}",
            0.07,
            (sx * 0.09, -0.1, 0.04),
            flip_mat,
            scale=(0.85, 1.7, 0.3),
            parent=root,
            segs=8,
        )

    # UV + light decimate on each mesh
    for o in list(bpy.data.objects):
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
        smart_uv(o)
        # keep total under ~2k faces across all parts
        decimate(o, 120 if "hand" in o.name or "foot" in o.name else 200)
        assign(o, body_mat if o.name not in ("scuba_tank", "scuba_mask") and not o.name.startswith("flipper") else (
            tank_mat if o.name == "scuba_tank" else mask_mat if o.name == "scuba_mask" else flip_mat
        ))

    plant_and_scale(root, 1.5)
    export_glb(OUT_CHARS / f"{name}.glb")
    print(f"{name} faces", sum(len(o.data.polygons) for o in bpy.data.objects if o.type == "MESH"))


# ── Creatures (soft-real, low poly) ──────────────────────────────────────────

def make_creature(name: str, kind: str):
    clear_scene()
    tex = IMAGINE / "creatures" / f"{name}.png"
    mat = mat_tex(f"{name}_mat", tex, color=(0.4, 0.55, 0.65, 1), size=512)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = name
    parts = []

    k = kind.lower()
    if k == "shark":
        body = sphere("body", 0.28, (0, 0, 0.32), mat, scale=(2.2, 0.65, 0.72), segs=12)
        snout = sphere("snout", 0.14, (0.55, 0, 0.3), mat, scale=(1.3, 0.65, 0.6), segs=8)
        dorsal = sphere("dorsal", 0.12, (0.05, 0, 0.58), mat, scale=(1.2, 0.2, 1.1), segs=8)
        for sx in (-1, 1):
            parts.append(sphere(f"pec_{sx}", 0.1, (-0.05, sx * 0.28, 0.26), mat, scale=(1.2, 1.5, 0.15), segs=8))
        tail = sphere("tail", 0.14, (-0.65, 0, 0.35), mat, scale=(0.9, 0.2, 1.4), segs=8)
        parts += [body, snout, dorsal, tail]
    elif k == "jelly":
        bell = sphere("bell", 0.38, (0, 0, 0.5), mat, scale=(1.05, 1.05, 0.7), segs=12)
        parts = [bell]
        for i in range(5):
            a = i * (2 * math.pi / 5)
            parts.append(
                cyl(
                    f"tent_{i}",
                    0.025,
                    0.5,
                    (math.cos(a) * 0.12, math.sin(a) * 0.12, 0.15),
                    mat,
                    verts=6,
                )
            )
    elif k in ("gull", "pelican", "bird"):
        body = sphere("body", 0.22, (0, 0, 0.35), mat, scale=(1.3, 0.85, 0.9), segs=10)
        head = sphere("head", 0.12, (0.28, 0, 0.45), mat, segs=8)
        beak = cyl("beak", 0.03, 0.18, (0.42, 0, 0.42), mat, scale=(1, 0.6, 0.5), verts=6)
        beak.rotation_euler[1] = math.radians(90)
        bpy.context.view_layer.objects.active = beak
        bpy.ops.object.transform_apply(rotation=True)
        parts = [body, head, beak]
        for sx in (-1, 1):
            parts.append(sphere(f"wing_{sx}", 0.14, (0, sx * 0.35, 0.38), mat, scale=(1.0, 1.8, 0.15), segs=8))
    else:
        # elongated swimmer: ray / marlin / sealion / angler
        body = sphere("body", 0.28, (0, 0, 0.32), mat, scale=(2.0, 0.65, 0.7), segs=12)
        nose = sphere("nose", 0.12, (0.55, 0, 0.32), mat, scale=(1.4, 0.6, 0.55), segs=8)
        tail = sphere("tail", 0.12, (-0.55, 0, 0.32), mat, scale=(1.0, 0.25, 1.2), segs=8)
        parts = [body, nose, tail]
        if k == "ray":
            for sx in (-1, 1):
                parts.append(sphere(f"wing_{sx}", 0.2, (0, sx * 0.4, 0.28), mat, scale=(1.3, 1.6, 0.12), segs=8))

    # Parent all under root then join into single mesh for weight
    for o in parts:
        o.parent = root
        o.matrix_parent_inverse = root.matrix_world.inverted()

    body = join_named(parts, f"{name}_body")
    body.parent = root
    smart_uv(body)
    assign(body, mat)
    decimate(body, 700)
    smooth(body)

    plant_and_scale(root, 1.2 if k != "jelly" else 1.0)
    export_glb(OUT_CREATURES / f"{name}.glb")
    print(f"{name} faces", len(body.data.polygons))


def make_prop(name: str, kind: str):
    clear_scene()
    tex = IMAGINE / "props" / f"{name}.png"
    mat = mat_tex(f"{name}_mat", tex, color=(0.55, 0.5, 0.4, 1), size=512)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = name
    parts = []

    if kind == "palm":
        trunk = cyl("trunk", 0.12, 1.4, (0, 0, 0.7), mat, verts=8)
        parts = [trunk]
        for i in range(5):
            a = i * (2 * math.pi / 5)
            leaf = sphere(
                f"leaf_{i}",
                0.35,
                (math.cos(a) * 0.35, math.sin(a) * 0.35, 1.45),
                mat,
                scale=(1.4, 0.35, 0.2),
                segs=8,
            )
            parts.append(leaf)
    elif kind == "stilt_house":
        base = cyl("base", 0.55, 0.35, (0, 0, 1.1), mat, scale=(1.2, 1.0, 1), verts=8)
        roof = sphere("roof", 0.55, (0, 0, 1.45), mat, scale=(1.3, 1.1, 0.45), segs=10)
        parts = [base, roof]
        for i, (x, y) in enumerate([(-0.45, -0.35), (0.45, -0.35), (-0.45, 0.35), (0.45, 0.35)]):
            parts.append(cyl(f"stilt_{i}", 0.06, 1.0, (x, y, 0.5), mat, verts=6))
    elif kind == "crate":
        parts = [sphere("crate", 0.4, (0, 0, 0.35), mat, scale=(1.1, 0.9, 0.85), segs=8)]
        # boxier
        bpy.ops.mesh.primitive_cube_add(size=0.7, location=(0, 0, 0.35))
        box = bpy.context.active_object
        box.name = "crate_box"
        assign(box, mat)
        parts = [box]
    elif kind == "clue_shell":
        parts = [sphere("shell", 0.28, (0, 0, 0.2), mat, scale=(1.2, 0.9, 0.7), segs=12)]
    else:  # rock
        parts = [sphere("rock", 0.4, (0, 0, 0.28), mat, scale=(1.2, 0.95, 0.75), segs=10)]

    for o in parts:
        o.parent = root
        o.matrix_parent_inverse = root.matrix_world.inverted()
    body = join_named(parts, f"{name}_body")
    body.parent = root
    smart_uv(body)
    assign(body, mat)
    decimate(body, 500 if kind != "stilt_house" else 800)
    smooth(body)
    plant_and_scale(root, 2.2 if kind == "palm" else (4.5 if kind == "stilt_house" else 0.9))
    export_glb(OUT_PROPS / f"{name}.glb")
    print(f"{name} faces", len(body.data.polygons))


def main():
    args = parse_args()
    who = args.who
    if who in ("all", "humans"):
        make_human("adventurer_boy", False)
        make_human("adventurer_girl", True)
    if who in ("all", "creatures"):
        for n, k in [
            ("shark", "shark"),
            ("jelly", "jelly"),
            ("ray", "ray"),
            ("sealion", "creature"),
            ("angler", "creature"),
            ("marlin", "creature"),
            ("pelican", "pelican"),
            ("gull", "gull"),
        ]:
            make_creature(n, k)
    if who in ("all", "props"):
        for n, k in [
            ("palm", "palm"),
            ("stilt_house", "stilt_house"),
            ("crate", "crate"),
            ("clue_shell", "clue_shell"),
            ("rock", "rock"),
        ]:
            make_prop(n, k)
    print("DONE soft-real lowpoly build")


if __name__ == "__main__":
    main()
