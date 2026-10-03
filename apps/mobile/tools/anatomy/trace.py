"""Vectoriza las máscaras de identificadores y empaqueta las imágenes.

    python tools/anatomy/trace.py --src tools/anatomy/.out \
        --assets assets/anatomy --ts ../../packages/anatomy/src/regions.generated.ts

Entrada (la deja `render.py`): `<capa>-<vista>-ids.png`, `-beauty.png`,
`palette.json`, `meta.json`.

Salida:
  * `assets/anatomy/<capa>-<vista>.webp`   imagen fotorrealista con alfa.
  * `regions.generated.ts`                 contornos por músculo en un viewBox
                                           fijo de 1000 x 2000.
  * `coverage.json`                        área por músculo y vista, y los
                                           códigos que no aparecen en ninguna.

Los contornos sirven para dibujar el resaltado Y para decidir qué músculo se
tocó (regla par-impar, la misma que `fill-rule: evenodd` de SVG), así que lo
que se ve resaltado y lo que se detecta coinciden por construcción.
"""

import argparse
import json
import os

import cv2
import numpy as np
from PIL import Image
from contour_corrections import fill_pectoral_notches

VIEWBOX_W, VIEWBOX_H = 1000, 2000
LAYERS = ("surface", "deep")
VIEWS = ("front", "back")
# Un músculo cuyo trozo visible sea menor que esto no es tocable con el dedo.
MIN_AREA_FRACTION = 0.00012  # de la imagen entera (~1 000 px a 2048x4096)
MATCH_TOLERANCE = 24.0


def load_labels(path, palette_rgb):
    """Matriz de etiquetas: 0 = fondo o sin mapear, i = codes[i-1]."""
    im = np.array(Image.open(path).convert("RGBA"))
    rgb = im[..., :3].reshape(-1, 3).astype(np.int32)
    alpha = im[..., 3].reshape(-1)
    colors, inverse = np.unique(rgb, axis=0, return_inverse=True)
    inverse = inverse.reshape(-1)
    dist = np.sqrt(((colors[:, None, :] - palette_rgb[None, :, :]) ** 2).sum(-1))
    nearest = dist.argmin(1)
    ok = dist.min(1) <= MATCH_TOLERANCE
    lut = np.where(ok, nearest + 1, 0)
    labels = lut[inverse]
    labels[alpha < 128] = 0
    return labels.reshape(im.shape[0], im.shape[1])


def contours_of(mask, scale_x, scale_y, min_area):
    """Anillos (exterior y huecos) de una máscara binaria, ya en el viewBox."""
    # Suavizado de escalones: desenfoque y umbral. Sigma pequeña para no comer
    # el borde entre dos músculos contiguos.
    smooth = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 1.6)
    binary = (smooth > 0.5).astype(np.uint8)
    found, hierarchy = cv2.findContours(binary, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    if hierarchy is None:
        return []
    rings = []
    for idx, contour in enumerate(found):
        parent = hierarchy[0][idx][3]
        area = cv2.contourArea(contour)
        if parent < 0 and area < min_area:
            continue
        if parent >= 0:
            # Un hueco solo se conserva si su padre se conservó y es relevante.
            if area < min_area * 0.5 or cv2.contourArea(found[parent]) < min_area:
                continue
        approx = cv2.approxPolyDP(contour, 1.4, True).reshape(-1, 2)
        if len(approx) < 3:
            continue
        flat = []
        for x, y in approx:
            flat.extend((round(float(x) * scale_x, 1), round(float(y) * scale_y, 1)))
        rings.append(flat)
    return rings


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--assets", required=True)
    ap.add_argument("--ts", required=True)
    ap.add_argument("--webp-quality", type=int, default=88)
    args = ap.parse_args()

    palette = json.load(open(os.path.join(args.src, "palette.json")))
    meta = json.load(open(os.path.join(args.src, "meta.json")))
    codes = sorted(palette)
    palette_rgb = np.array([palette[c] for c in codes], dtype=np.int32)
    os.makedirs(args.assets, exist_ok=True)

    regions = {}
    coverage = {}
    for layer in LAYERS:
        for view in VIEWS:
            tag = f"{layer}-{view}"
            ids_path = os.path.join(args.src, f"{tag}-ids.png")
            beauty_path = os.path.join(args.src, f"{tag}-beauty.png")
            if not os.path.exists(ids_path):
                continue
            labels = load_labels(ids_path, palette_rgb)
            h, w = labels.shape
            sx, sy = VIEWBOX_W / w, VIEWBOX_H / h
            min_area = MIN_AREA_FRACTION * w * h
            body = int((labels >= 0).sum())
            entries = []
            for i, code in enumerate(codes, start=1):
                mask = labels == i
                px = int(mask.sum())
                if px == 0:
                    continue
                rings = contours_of(mask, sx, sy, min_area)
                if code == "PECTORALIS_MAJOR" and tag == "surface-front" and rings:
                    rings = fill_pectoral_notches(rings)
                coverage.setdefault(code, {})[tag] = round(100.0 * px / body, 3)
                if rings:
                    entries.append({"code": code, "rings": rings})
            regions[tag] = entries
            if os.path.exists(beauty_path):
                img = Image.open(beauty_path).convert("RGBA")
                out = os.path.join(args.assets, f"{tag}.webp")
                img.save(out, "WEBP", quality=args.webp_quality, method=6, alpha_quality=95)
                print(f"{tag}: {len(entries)} músculos tocables, {os.path.getsize(out)/1024:.0f} KB")

    missing = [c for c in codes if not any(coverage.get(c, {}).values())]
    json.dump({"coverage": coverage, "missing": missing}, open(os.path.join(args.src, "coverage.json"), "w"), indent=2)

    with open(args.ts, "w") as f:
        f.write("// Generado por tools/anatomy/trace.py. NO EDITAR A MANO.\n")
        f.write("// Modelo anatómico: Z-Anatomy (CC BY-SA 4.0).\n")
        f.write("import type { BodyRegion } from './types';\n\n")
        f.write(f"export const REGION_VIEWBOX = {{ width: {VIEWBOX_W}, height: {VIEWBOX_H} }} as const;\n\n")
        f.write(f"export const IMAGE_ASPECT = {meta['width'] / meta['height']};\n\n")
        f.write("export const REGIONS: Record<string, readonly BodyRegion[]> = ")
        f.write(json.dumps(regions, separators=(",", ":")))
        f.write(";\n")
    print("regiones ->", args.ts, f"{os.path.getsize(args.ts)/1024:.0f} KB")
    print("sin región en ninguna vista:", missing or "ninguno")


if __name__ == "__main__":
    main()
