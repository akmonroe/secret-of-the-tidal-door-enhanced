"""
Build fuller-body kid-friendly 3D characters in Blender, map Imagine textures,
export GLB for Three.js.

Usage (GUI MCP blender or headless):
  blender -b -P tools/blender/build_character_glb.py -- \
    --name adventurer_girl \
    --texture src/assets/imagine/characters/adventurer_girl.png \
    --out src/assets/models3d/characters/adventurer_girl.glb

Or without CLI (defaults from env):
  CHAR_NAME=shark TEXTURE=... OUT=... blender -b -P this_script.py

Human exports include a textured body plus optional scuba accessories
(scuba_tank, scuba_mask, flipper_L, flipper_R) as separate named meshes
parented under the character root for show/hide in the game.
"""
from __future__ import annotations

import argparse
import math
import os
import sys
from pathlib import Path

import bpy


def parse_args():
    # Blender passes args after --
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    p = argparse.ArgumentParser()
    p.add_argument("--name", default=os.environ.get("CHAR_NAME", "adventurer_girl"))
    p.add_argument("--texture", default=os.environ.get("TEXTURE", ""))
    p.add_argument("--out", default=os.environ.get("OUT", ""))
    p.add_argument("--kind", default=os.environ.get("KIND", "human"))  # human|creature
    p.add_argument("--scale", type=float, default=1.0)
    return p.parse_args(argv)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes:
        bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        bpy.data.materials.remove(block)
    for block in bpy.data.images:
        bpy.data.images.remove(block)
    for block in bpy.data.objects:
        bpy.data.objects.remove(block, do_unlink=True)


def mat_solid(name: str, color, roughness=0.55, metallic=0.0, alpha=1.0):
    """Simple Principled material without texture."""
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    links = m.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    r, g, b = color[0], color[1], color[2]
    a = color[3] if len(color) > 3 else alpha
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = metallic
    if a < 0.999:
        bsdf.inputs["Alpha"].default_value = a
        m.blend_method = "BLEND"
        if hasattr(m, "shadow_method"):
            m.shadow_method = "NONE"
    return m


def mat_with_texture(name: str, tex_path: str | None, color=(0.8, 0.7, 0.6, 1.0)):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    links = m.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    if tex_path and Path(tex_path).is_file():
        img = bpy.data.images.load(str(Path(tex_path).resolve()))
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = img
        # Alpha clip for magenta-keyed sprites used as albedo
        links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        if img.channels == 4:
            links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
            m.blend_method = "CLIP"
            if hasattr(m, "shadow_method"):
                m.shadow_method = "CLIP"
    else:
        bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = 0.55
    return m


def add_uv_project(obj, island_margin=0.06):
    """Smart UV project with generous island margin for cleaner texture edges."""
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    # Larger margin reduces bleeding; moderate angle keeps islands coherent
    bpy.ops.uv.smart_project(angle_limit=66, island_margin=island_margin)
    bpy.ops.object.mode_set(mode="OBJECT")


def _apply_scale(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)


def _join_parts(parts, active_name: str):
    bpy.ops.object.select_all(action="DESELECT")
    active = None
    for o in parts:
        o.select_set(True)
        if o.name == active_name or active is None:
            active = o
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    return bpy.context.active_object


def make_human(name: str, tex: str | None, scale: float):
    """
    Kid-friendly (~age 10) humanoid with fuller proportions.

    Body: single textured mesh (Imagine albedo + smart UV).
    Scuba: separate named meshes parented to root empty for optional show/hide:
      scuba_tank, scuba_mask, flipper_L, flipper_R
    """
    is_girl = "girl" in name.lower()

    # Root empty — all exports hang under this so hierarchy is stable in GLB
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = name

    # ------------------------------------------------------------------
    # Kid proportions (~1:5 head:body). Total height ≈ 1.50 units.
    # Head diameter ~0.52 → head ~1/5 of height (cartoony kid).
    # Shorter legs, roomier torso/shoulders.
    # ------------------------------------------------------------------
    body_parts = []

    # Hips / pelvis (wider, shorter)
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=20, ring_count=12, radius=0.20, location=(0, 0, 0.72)
    )
    hips = bpy.context.active_object
    hips.name = f"{name}_hips"
    hips.scale = (1.15, 0.78, 0.55)
    _apply_scale(hips)
    body_parts.append(hips)

    # Torso (slightly tapered cylinder → kid chest)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=18, radius=0.24, depth=0.48, location=(0, 0, 1.05)
    )
    torso = bpy.context.active_object
    torso.name = f"{name}_torso"
    torso.scale = (1.05, 0.85, 1.0)
    _apply_scale(torso)
    body_parts.append(torso)

    # Soft shoulder pad (upper chest)
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=16, ring_count=10, radius=0.22, location=(0, 0, 1.24)
    )
    shoulders = bpy.context.active_object
    shoulders.name = f"{name}_shoulders"
    shoulders.scale = (1.25, 0.75, 0.55)
    _apply_scale(shoulders)
    body_parts.append(shoulders)

    # Neck stub
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12, radius=0.08, depth=0.10, location=(0, 0, 1.36)
    )
    neck = bpy.context.active_object
    neck.name = f"{name}_neck"
    body_parts.append(neck)

    # Head — large for kid ~1:5
    head_r = 0.26
    head_z = 1.36 + head_r * 0.95  # sits on neck
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=28, ring_count=18, radius=head_r, location=(0, 0, head_z)
    )
    head = bpy.context.active_object
    head.name = f"{name}_head"
    # Slightly flatter top / fuller cheeks
    head.scale = (1.02, 0.96, 1.05)
    _apply_scale(head)
    body_parts.append(head)

    # Hair cap (joined into body so Imagine texture can tint it; solid hair mat
    # would fight the single albedo — keep as geometry volume only)
    hair_r = head_r * (1.08 if is_girl else 1.05)
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=20,
        ring_count=12,
        radius=hair_r,
        location=(0, -0.02, head_z + (0.04 if is_girl else 0.06)),
    )
    hair = bpy.context.active_object
    hair.name = f"{name}_hair"
    hair.scale = (1.05, 1.0, 0.78 if is_girl else 0.55)
    _apply_scale(hair)
    body_parts.append(hair)

    if is_girl:
        # Side braid volume
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=10, radius=0.06, depth=0.32, location=(0.22, -0.04, head_z - 0.18)
        )
        braid = bpy.context.active_object
        braid.rotation_euler[1] = math.radians(28)
        braid.rotation_euler[2] = math.radians(-18)
        bpy.ops.object.transform_apply(rotation=True)
        braid.name = f"{name}_braid"
        body_parts.append(braid)

    # Legs — shorter kid legs (upper + lower as one segment each side)
    for sx, side in ((-1, "L"), (1, "R")):
        # Upper leg
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=12, radius=0.085, depth=0.28, location=(sx * 0.12, 0, 0.52)
        )
        thigh = bpy.context.active_object
        thigh.name = f"{name}_thigh_{side}"
        body_parts.append(thigh)
        # Lower leg
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=12, radius=0.07, depth=0.26, location=(sx * 0.12, 0, 0.26)
        )
        shin = bpy.context.active_object
        shin.name = f"{name}_shin_{side}"
        body_parts.append(shin)
        # Foot
        bpy.ops.mesh.primitive_cube_add(size=0.12, location=(sx * 0.12, 0.05, 0.06))
        foot = bpy.context.active_object
        foot.scale = (1.05, 1.7, 0.45)
        _apply_scale(foot)
        foot.name = f"{name}_foot_{side}"
        body_parts.append(foot)

    # Arms — kid-length, slightly shorter than adult
    for sx, side in ((-1, "L"), (1, "R")):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=12, radius=0.065, depth=0.42, location=(sx * 0.36, 0, 1.08)
        )
        arm = bpy.context.active_object
        arm.rotation_euler[1] = math.radians(sx * 14)
        bpy.ops.object.transform_apply(rotation=True)
        arm.name = f"{name}_arm_{side}"
        body_parts.append(arm)
        # Hand blob
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=10, ring_count=8, radius=0.06, location=(sx * 0.40, 0, 0.86)
        )
        hand = bpy.context.active_object
        hand.name = f"{name}_hand_{side}"
        body_parts.append(hand)

    # Join body into one mesh for clean UV + single albedo
    body = _join_parts(body_parts, f"{name}_torso")
    body.name = f"{name}_body"
    body.scale = (scale, scale, scale)
    _apply_scale(body)
    add_uv_project(body, island_margin=0.06)

    body_mat = mat_with_texture(f"{name}_mat", tex, color=(0.95, 0.78, 0.58, 1))
    if body.data.materials:
        body.data.materials[0] = body_mat
    else:
        body.data.materials.append(body_mat)

    body.parent = root

    # ------------------------------------------------------------------
    # Scuba accessories — separate named meshes, parented to root.
    # Game can show/hide by name: scuba_tank, scuba_mask, flipper_L, flipper_R
    # ------------------------------------------------------------------
    scuba_objects = _make_scuba_accessories(name, scale)
    for obj in scuba_objects:
        obj.parent = root

    return root


def _make_scuba_accessories(name: str, scale: float):
    """Create scuba_tank, scuba_mask, flipper_L, flipper_R as separate meshes."""
    out = []

    # Materials
    mat_tank = mat_solid(f"{name}_scuba_tank_mat", (0.29, 0.56, 0.78, 1), roughness=0.35, metallic=0.15)
    mat_band = mat_solid(f"{name}_scuba_band_mat", (1.0, 0.88, 0.35, 1), roughness=0.45)
    mat_mask = mat_solid(f"{name}_scuba_mask_mat", (0.22, 0.72, 1.0, 1), roughness=0.3)
    mat_lens = mat_solid(f"{name}_scuba_lens_mat", (0.55, 0.88, 1.0, 0.45), roughness=0.1, alpha=0.45)
    mat_flip = mat_solid(f"{name}_scuba_flip_mat", (1.0, 0.56, 0.25, 1), roughness=0.5)

    # --- Tank (back of torso) ---
    tank_parts = []
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=14, radius=0.11, depth=0.48, location=(0, -0.30, 1.08)
    )
    tank = bpy.context.active_object
    tank.rotation_euler[0] = math.radians(8)
    bpy.ops.object.transform_apply(rotation=True)
    tank_parts.append(tank)

    # Valve knob
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=10, ring_count=8, radius=0.06, location=(0, -0.30, 1.34)
    )
    tank_parts.append(bpy.context.active_object)

    # Band ring (visual strap)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.12, minor_radius=0.025, location=(0, -0.30, 1.18)
    )
    ring = bpy.context.active_object
    ring.rotation_euler[0] = math.radians(90)
    bpy.ops.object.transform_apply(rotation=True)
    tank_parts.append(ring)

    scuba_tank = _join_parts(tank_parts, tank_parts[0].name)
    scuba_tank.name = "scuba_tank"
    scuba_tank.scale = (scale, scale, scale)
    _apply_scale(scuba_tank)
    scuba_tank.data.materials.append(mat_tank)
    # Second slot for band color is skipped after join — solid tank blue is fine
    out.append(scuba_tank)

    # --- Mask (face) ---
    mask_parts = []
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.14, minor_radius=0.035, location=(0, 0.24, 1.58)
    )
    frame = bpy.context.active_object
    frame.rotation_euler[0] = math.radians(90)
    bpy.ops.object.transform_apply(rotation=True)
    mask_parts.append(frame)

    bpy.ops.mesh.primitive_cylinder_add(
        vertices=16, radius=0.12, depth=0.03, location=(0, 0.26, 1.58)
    )
    lens = bpy.context.active_object
    lens.rotation_euler[0] = math.radians(90)
    bpy.ops.object.transform_apply(rotation=True)
    mask_parts.append(lens)

    # Soft strap behind head
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.22, minor_radius=0.015, location=(0, 0, 1.58)
    )
    strap = bpy.context.active_object
    strap.rotation_euler[0] = math.radians(90)
    strap.scale = (1.0, 0.55, 1.0)
    _apply_scale(strap)
    mask_parts.append(strap)

    scuba_mask = _join_parts(mask_parts, mask_parts[0].name)
    scuba_mask.name = "scuba_mask"
    scuba_mask.scale = (scale, scale, scale)
    _apply_scale(scuba_mask)
    scuba_mask.data.materials.append(mat_mask)
    out.append(scuba_mask)

    # --- Flippers ---
    for sx, side in ((-1, "L"), (1, "R")):
        bpy.ops.mesh.primitive_cube_add(size=0.1, location=(sx * 0.12, 0.14, 0.04))
        flip = bpy.context.active_object
        # Long blade forward, thin height
        flip.scale = (1.4, 2.6, 0.35)
        _apply_scale(flip)
        # Slight outer flare
        flip.rotation_euler[2] = math.radians(sx * -8)
        bpy.ops.object.transform_apply(rotation=True)
        # Toe taper via second box joined
        bpy.ops.mesh.primitive_cube_add(size=0.08, location=(sx * 0.12, 0.28, 0.04))
        tip = bpy.context.active_object
        tip.scale = (1.6, 1.2, 0.3)
        _apply_scale(tip)
        joined = _join_parts([flip, tip], flip.name)
        joined.name = f"flipper_{side}"
        joined.scale = (scale, scale, scale)
        _apply_scale(joined)
        joined.data.materials.append(mat_flip)
        out.append(joined)

    # Silence unused mat_band / mat_lens warnings by assigning if needed
    # (band/lens joined into tank/mask — keep materials in blend for reuse)
    _ = (mat_band, mat_lens)

    return out


def make_creature(name: str, tex: str | None, scale: float, kind: str):
    """Simple fuller creature bodies (shark-like elongated, jelly, bird, etc.)."""
    k = kind.lower()
    if k in ("jelly", "jellyfish"):
        # Domed bell
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=28, ring_count=14, radius=0.48, location=(0, 0, 0.55)
        )
        body = bpy.context.active_object
        body.scale = (1.05, 1.05, 0.72)
        _apply_scale(body)
        # Flatten underside a touch with a second sphere ring volume
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=20, ring_count=10, radius=0.36, location=(0, 0, 0.42)
        )
        rim = bpy.context.active_object
        rim.scale = (1.15, 1.15, 0.35)
        _apply_scale(rim)
        # Oral arms / tentacles
        tentacles = [body, rim]
        for i in range(6):
            a = i * (2 * math.pi / 6)
            r = 0.16
            bpy.ops.mesh.primitive_cylinder_add(
                vertices=8,
                radius=0.035,
                depth=0.62,
                location=(math.cos(a) * r, math.sin(a) * r, 0.12),
            )
            t = bpy.context.active_object
            # Slight outward lean
            t.rotation_euler[1] = math.radians(math.cos(a) * 12)
            t.rotation_euler[0] = math.radians(-math.sin(a) * 12)
            bpy.ops.object.transform_apply(rotation=True)
            tentacles.append(t)
        body = _join_parts(tentacles, body.name)
    elif k in ("gull", "pelican", "bird"):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.28, location=(0, 0, 0.4))
        body = bpy.context.active_object
        bpy.ops.mesh.primitive_cube_add(size=0.2, location=(0.35, 0, 0.4))
        bpy.context.active_object.scale = (1.4, 0.4, 0.4)
        _apply_scale(bpy.context.active_object)
        for sx in (-1, 1):
            bpy.ops.mesh.primitive_cube_add(size=0.15, location=(0, sx * 0.45, 0.45))
            bpy.context.active_object.scale = (1.2, 2.2, 0.15)
            _apply_scale(bpy.context.active_object)
        bpy.ops.object.select_all(action="SELECT")
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.join()
        body = bpy.context.active_object
    elif k in ("shark",):
        # Fuller shark: elongated body + dorsal + pectoral + tail fin
        parts = []
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=28, ring_count=16, radius=0.32, location=(0, 0, 0.35)
        )
        body = bpy.context.active_object
        body.scale = (2.4, 0.72, 0.78)
        _apply_scale(body)
        parts.append(body)

        # Snout
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=16, ring_count=10, radius=0.18, location=(0.72, 0, 0.32)
        )
        snout = bpy.context.active_object
        snout.scale = (1.4, 0.7, 0.65)
        _apply_scale(snout)
        parts.append(snout)

        # Dorsal fin
        bpy.ops.mesh.primitive_cone_add(
            vertices=8, radius1=0.14, radius2=0.01, depth=0.32, location=(0.05, 0, 0.72)
        )
        dorsal = bpy.context.active_object
        dorsal.scale = (1.3, 0.25, 1.0)
        _apply_scale(dorsal)
        parts.append(dorsal)

        # Pectoral fins
        for sx in (-1, 1):
            bpy.ops.mesh.primitive_cube_add(size=0.2, location=(-0.05, sx * 0.32, 0.28))
            fin = bpy.context.active_object
            fin.scale = (1.3, 1.8, 0.15)
            fin.rotation_euler[0] = math.radians(sx * -25)
            fin.rotation_euler[2] = math.radians(sx * 15)
            bpy.ops.object.transform_apply(rotation=True, scale=True)
            parts.append(fin)

        # Caudal tail (vertical crescent approx)
        bpy.ops.mesh.primitive_cone_add(
            vertices=8, radius1=0.18, radius2=0.01, depth=0.42, location=(-0.78, 0, 0.38)
        )
        tail = bpy.context.active_object
        tail.rotation_euler[1] = math.radians(-90)
        tail.scale = (1.6, 0.2, 1.0)
        bpy.ops.object.transform_apply(rotation=True, scale=True)
        parts.append(tail)

        body = _join_parts(parts, parts[0].name)
    else:
        # elongated swimmer (ray/marlin/sealion/angler)
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=24, ring_count=16, radius=0.35, location=(0, 0, 0.35)
        )
        body = bpy.context.active_object
        body.scale = (2.2, 0.7, 0.75)
        _apply_scale(body)
        bpy.ops.mesh.primitive_cone_add(radius1=0.12, depth=0.5, location=(0.7, 0, 0.35))
        bpy.context.active_object.rotation_euler[1] = math.radians(90)
        bpy.ops.object.transform_apply(rotation=True)
        bpy.ops.object.select_all(action="SELECT")
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.join()
        body = bpy.context.active_object

    body = bpy.context.active_object
    body.name = name
    body.scale = (scale, scale, scale)
    _apply_scale(body)
    add_uv_project(body, island_margin=0.06)
    m = mat_with_texture(f"{name}_mat", tex, color=(0.4, 0.55, 0.7, 1))
    if not body.data.materials:
        body.data.materials.append(m)
    else:
        body.data.materials[0] = m
    return body


def export_glb(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    # Prefer modern glTF export kwargs; fall back for older Blender builds
    kwargs = dict(
        filepath=str(path),
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
    )
    # Hierarchy / extras help consumers find scuba_* by name
    try:
        bpy.ops.export_scene.gltf(**kwargs, export_extras=True)
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)
    print("EXPORTED", path, "size", path.stat().st_size if path.exists() else 0)


def main():
    args = parse_args()
    clear_scene()
    tex = args.texture if args.texture else None
    out = Path(args.out) if args.out else Path(f"/tmp/{args.name}.glb")
    if args.kind == "human":
        make_human(args.name, tex, args.scale)
    else:
        make_creature(args.name, tex, args.scale, args.kind)
    export_glb(out)
    print("DONE", args.name)


if __name__ == "__main__":
    main()
