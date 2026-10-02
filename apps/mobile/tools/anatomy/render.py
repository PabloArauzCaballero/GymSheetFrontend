"""Render del mapa muscular: imágenes fotorrealistas y máscaras de identificadores.

Se ejecuta con Blender sin interfaz:

    blender -b --python tools/anatomy/render.py -- --out tools/anatomy/.out \
        --width 2048 --height 4096 --samples 96

Por cada capa (superficial, profunda) y cada vista (frente, espalda) genera dos
imágenes con LA MISMA cámara, de modo que coinciden al píxel:

  * `<capa>-<vista>-beauty.png`  render Cycles con transparencia.
  * `<capa>-<vista>-ids.png`     máscara plana sin antialiasing: cada músculo
                                 tiene un color único (ver `palette.json`).

`trace.py` convierte las máscaras en las regiones táctiles que usa la app.
Modelo: Z-Anatomy (CC BY-SA 4.0), descargado con `download-models.sh`.
"""

import argparse
import json
import math
import os
import re
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
# Objetos creados por este script (cámara y luces). El importador de FBX usa
# empties como padres de las mallas —llevan la escala y la rotación—, así que
# la limpieza entre vistas NO puede borrar «todos los empties».
OWN = []
CACHE = os.path.join(HERE, ".cache")


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--out", default=os.path.join(HERE, ".out"))
    p.add_argument("--width", type=int, default=2048)
    p.add_argument("--height", type=int, default=4096)
    p.add_argument("--samples", type=int, default=96)
    p.add_argument("--layers", default="surface,deep")
    p.add_argument("--views", default="front,back")
    p.add_argument("--only", default="both", choices=["both", "beauty", "ids"])
    return p.parse_args(argv)


# Z-Anatomy mezcla con la anatomía geometría de anotación: líneas guía (.i) y pines
# (.j) de etiquetas, y marcas de origen/inserción sobre el hueso (.ol .or .el .er).
# No son anatomía visible y se ven como pelos finos alrededor del cuerpo.
ANNOTATION = re.compile(r"\.(i|j|t|ol|or|el|er)$")


def base_name(name):
    """«Biceps brachii.l» -> «Biceps brachii» (quita el lado y el .001 de Blender)."""
    name = re.sub(r"\.\d{3}$", "", name)
    return re.sub(r"\.[lr]$", "", name)


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


# --------------------------------------------------------------------------- escena


def import_models():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=os.path.join(CACHE, "MuscularSystem100.fbx"))
    muscles = {o.name for o in bpy.data.objects}
    bpy.ops.import_scene.fbx(filepath=os.path.join(CACHE, "SkeletalSystem100.fbx"))
    bones = {o.name for o in bpy.data.objects} - muscles
    return muscles, bones


def world_bbox(obj):
    pts = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    return (
        Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))),
        Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))),
    )


def facing_sign(by_base):
    """+1 si el frente del cuerpo mira a +Y, -1 si mira a -Y.

    El recto abdominal está delante y los erectores de la columna detrás.
    """
    def center_y(base):
        lo, hi = world_bbox(by_base[base][0])
        return (lo.y + hi.y) / 2

    front = center_y("Rectus abdominis muscle")
    back = center_y("Longissimus thoracis muscle")
    return 1.0 if front > back else -1.0


def make_muscle_material(name="musculo"):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    info = nt.nodes.new("ShaderNodeObjectInfo")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    fibre = nt.nodes.new("ShaderNodeTexNoise")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    vary = nt.nodes.new("ShaderNodeMath")
    bump = nt.nodes.new("ShaderNodeBump")
    mapping = nt.nodes.new("ShaderNodeMapping")

    noise.inputs["Scale"].default_value = 9.0
    noise.inputs["Detail"].default_value = 6.0
    noise.inputs["Roughness"].default_value = 0.6
    ramp.color_ramp.elements[0].position = 0.30
    ramp.color_ramp.elements[0].color = (0.16, 0.010, 0.009, 1)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (0.46, 0.050, 0.036, 1)

    # Variación por músculo: ±15 % de desplazamiento sobre la rampa.
    vary.operation = "MULTIPLY_ADD"
    vary.inputs[1].default_value = 0.30
    vary.inputs[2].default_value = 0.35

    mapping.inputs["Scale"].default_value = (1.0, 1.0, 1.0)
    fibre.inputs["Scale"].default_value = 140.0
    fibre.inputs["Detail"].default_value = 10.0
    fibre.inputs["Roughness"].default_value = 0.65
    bump.inputs["Strength"].default_value = 0.35
    bump.inputs["Distance"].default_value = 0.0015

    bsdf.inputs["Roughness"].default_value = 0.47
    bsdf.inputs["Subsurface Weight"].default_value = 0.30
    bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.25, 0.12)
    bsdf.inputs["Subsurface Scale"].default_value = 0.006
    bsdf.inputs["Coat Weight"].default_value = 0.22
    bsdf.inputs["Coat Roughness"].default_value = 0.12

    nt.links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], fibre.inputs["Vector"])
    nt.links.new(info.outputs["Random"], vary.inputs[0])
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(fibre.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def make_bone_material():
    mat = bpy.data.materials.new("hueso")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.78, 0.70, 0.55, 1)
    bsdf.inputs["Roughness"].default_value = 0.55
    bsdf.inputs["Subsurface Weight"].default_value = 0.15
    return mat


def setup_cycles(scene, args):
    scene.render.engine = "CYCLES"
    cy = scene.cycles
    cy.samples = args.samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.01
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.max_bounces = 8
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = d.type != "CPU"
        cy.device = "GPU"
    except Exception as err:  # sin GPU disponible: CPU
        print("CYCLES_GPU_UNAVAILABLE", err)
        cy.device = "CPU"
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.7


def setup_camera(scene, width, height, facing, view):
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 1.95  # alto visible en metros (cuerpo 1,79 m + margen)
    cam_data.clip_start, cam_data.clip_end = 0.1, 40.0
    cam = bpy.data.objects.new("cam", cam_data)
    scene.collection.objects.link(cam)
    OWN.append(cam)
    side = facing if view == "front" else -facing
    cam.location = Vector((0.0, side * 8.0, 0.90))
    cam.rotation_euler = (math.radians(90), 0, 0 if side < 0 else math.radians(180))
    scene.camera = cam
    return cam


def setup_lights(scene, side):
    """Tres puntos suaves: principal arriba-izquierda, relleno y contraluz."""
    def area(name, loc, energy, size, color=(1, 1, 1)):
        data = bpy.data.lights.new(name, "AREA")
        data.energy, data.size, data.color = energy, size, color
        obj = bpy.data.objects.new(name, data)
        obj.location = Vector(loc)
        scene.collection.objects.link(obj)
        OWN.append(obj)
        track = obj.constraints.new("TRACK_TO")
        target = bpy.data.objects.new(name + "_t", None)
        target.location = Vector((0, 0, 0.9))
        scene.collection.objects.link(target)
        OWN.append(target)
        track.target = target
        track.track_axis, track.up_axis = "TRACK_NEGATIVE_Z", "UP_Y"
        return obj

    return [
        area("key", (-1.8, side * 3.0, 2.6), 650, 2.4, (1.0, 0.95, 0.90)),
        area("fill", (2.2, side * 2.8, 1.2), 160, 3.0, (0.90, 0.95, 1.0)),
        area("rim", (0.0, -side * 2.6, 2.4), 450, 2.0, (1.0, 1.0, 1.0)),
    ]


def setup_world(scene):
    world = bpy.data.worlds.new("estudio")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.03, 0.03, 0.035, 1)
    bg.inputs["Strength"].default_value = 1.0
    scene.world = world


# --------------------------------------------------------------------------- capas


def classify(mapping, by_base):
    """Devuelve, por capa, el conjunto de bases visibles y el código de cada una."""
    surface = mapping["layers"]["surface"]
    deep = mapping["layers"]["deep"]
    code_of = {"surface": {}, "deep": {}}
    for layer, table in (("surface", surface), ("deep", deep)):
        for code, names in table.items():
            for n in names:
                if n not in by_base:
                    raise SystemExit(f"Objeto inexistente en el modelo: {n!r} ({code}, {layer})")
                code_of[layer][n] = code
    deep_names = set(code_of["deep"])
    hidden_deep = (set(code_of["surface"]) - deep_names) | set(mapping["hiddenInDeepLayer"]["extra"])
    return code_of, hidden_deep


def build_palette(codes):
    """Un color saturado y bien separado por código.

    Nada cercano al negro: (0,0,0) es «sin mapear» y un color oscuro se
    confundiría con él al decodificar.
    """
    import colorsys

    palette = {}
    for i, code in enumerate(sorted(codes), start=1):
        hue = (i * 0.38196601125) % 1.0
        sat = 0.60 + 0.40 * (((i * 7) % 5) / 4)
        val = 0.70 + 0.30 * (((i * 3) % 4) / 3)
        r, g, b = colorsys.hsv_to_rgb(hue, sat, val)
        palette[code] = [round(r * 255), round(g * 255), round(b * 255)]
    values = list(palette.values())
    for a in range(len(values)):
        for b in range(a + 1, len(values)):
            dist = sum((values[a][k] - values[b][k]) ** 2 for k in range(3)) ** 0.5
            assert dist > 30, f"colores de paleta demasiado cercanos ({dist:.0f})"
    return palette


def apply_layer(layer, objects, by_base, code_of, hidden_deep, exclude, bone_names):
    """Visibilidad de render para una capa."""
    is_deep = layer == "deep"
    for o in objects:
        base = base_name(o.name)
        hide = bool(exclude.search(base)) or bool(ANNOTATION.search(o.name))
        if is_deep and base in hidden_deep:
            hide = True
        o.hide_render = hide
        o.hide_viewport = hide


def render_beauty(scene, path):
    setup_world(scene)
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def render_ids(scene, path, objects, code_of, palette, layer, priority=(), push=0.0):
    scene.render.engine = "BLENDER_WORKBENCH"
    sh = scene.display.shading
    sh.light, sh.color_type = "FLAT", "OBJECT"
    sh.show_object_outline = False
    sh.show_specular_highlight = False
    sh.show_shadows = False
    sh.show_cavity = False
    sh.show_xray = False
    scene.display.render_aa = "OFF"
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0
    scene.display_settings.display_device = "sRGB"
    for o in objects:
        base = base_name(o.name)
        code = code_of[layer].get(base)
        rgb = palette[code] if code else (0, 0, 0)
        o.color = (*(srgb_to_linear(c / 255.0) for c in rgb), 1.0)
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.filepath = path
    moved = []
    for o in priority:
        moved.append((o, o.matrix_world.copy()))
        m = o.matrix_world.copy()
        m.translation.y += push
        o.matrix_world = m
    bpy.context.view_layer.update()
    bpy.ops.render.render(write_still=True)
    for o, m in moved:
        o.matrix_world = m
    bpy.context.view_layer.update()


def main():
    args = parse_args()
    os.makedirs(args.out, exist_ok=True)
    mapping = json.load(open(os.path.join(HERE, "muscle-map.json")))
    exclude = re.compile(mapping["excludePattern"], re.I)

    muscle_names, bone_names = import_models()
    objects = [o for o in bpy.data.objects if o.type == "MESH"]
    by_base = {}
    for o in objects:
        by_base.setdefault(base_name(o.name), []).append(o)

    code_of, hidden_deep = classify(mapping, by_base)
    all_codes = set(code_of["surface"].values()) | set(code_of["deep"].values())
    palette = build_palette(all_codes)
    facing = facing_sign(by_base)
    print("FACING", facing, "CODES", len(all_codes), "OBJECTS", len(objects))

    mat_muscle, mat_bone = make_muscle_material(), make_bone_material()
    for o in objects:
        o.data.materials.clear()
        o.data.materials.append(mat_bone if o.name in bone_names else mat_muscle)

    scene = bpy.context.scene
    meta = {"facing": facing, "width": args.width, "height": args.height, "orthoScale": 1.95, "centerZ": 0.90}
    for layer in args.layers.split(","):
        for view in args.views.split(","):
            for ob in OWN:
                bpy.data.objects.remove(ob, do_unlink=True)
            OWN.clear()
            apply_layer(layer, objects, by_base, code_of, hidden_deep, exclude, bone_names)
            side = facing if view == "front" else -facing
            setup_camera(scene, args.width, args.height, facing, view)
            tag = f"{layer}-{view}"
            if args.only in ("both", "beauty"):
                setup_cycles(scene, args)
                setup_lights(scene, side)
                render_beauty(scene, os.path.join(args.out, f"{tag}-beauty.png"))
                print("DONE", tag, "beauty")
            if args.only in ("both", "ids"):
                names = mapping["idPriority"].get(layer, {}).get(view, [])
                prio = [o for n in names for o in by_base[n]]
                push = side * mapping["idPriority"]["offsetMeters"]
                render_ids(scene, os.path.join(args.out, f"{tag}-ids.png"), objects, code_of, palette, layer, prio, push)
                print("DONE", tag, "ids")

    json.dump(palette, open(os.path.join(args.out, "palette.json"), "w"), indent=2)
    json.dump(meta, open(os.path.join(args.out, "meta.json"), "w"), indent=2)


main()
