#!/usr/bin/env python3
"""Erzeugt die PNG-Icons für die PWA aus der Vektor-Vorlage.

Die Icons werden aus der Bolt-Silhouette (ursprünglich 512x512 SVG) gerendert,
damit sie exakt zu public/icons/icon-512x512.svg passen.

Aufruf:  python3 scripts/generate-pwa-icons.py
Benötigt: Pillow (pip install Pillow)
"""
import os
from PIL import Image, ImageDraw

BRAND = (0x8A, 0x5F, 0xFF, 255)  # #8A5FFF
WHITE = (255, 255, 255, 255)
SS = 4  # Supersampling für weiche Kanten

# Bolt-Polygon aus dem 512er SVG, Koordinaten im 512er Raster.
BOLT_512 = [
    (236.736, 290.912),
    (122.176, 290.912),
    (331.648, 64.0),
    (275.264, 221.088),
    (389.824, 221.088),
    (188.352, 448.0),
    (236.736, 290.912),
]


def _bolt_points(size, scale=1.0):
    """Skaliert das Bolt-Polygon auf `size` (mit optionalem Faktor) und zentriert es."""
    f = (size / 512.0) * scale
    cx = cy = 256.0
    return [((x - cx) * f + size / 2.0, (y - cy) * f + size / 2.0) for x, y in BOLT_512]


def render(size, maskable=False, rounded=True, scale=1.0):
    big = size * SS
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if rounded:
        draw.rounded_rectangle((0, 0, big - 1, big - 1), radius=0.1875 * big, fill=BRAND)
    else:
        # Vollflächiger Hintergrund, der Maskierung/Apple-Rundung übernimmt.
        draw.rectangle((0, 0, big, big), fill=BRAND)

    draw.polygon(_bolt_points(big, scale), fill=WHITE)
    return img.resize((size, size), Image.LANCZOS)


def main():
    out = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
    os.makedirs(out, exist_ok=True)

    targets = {
        # "any"-Icons: abgerundetes Quadrat passend zum App-Logo.
        'icon-192.png': render(192),
        'icon-512.png': render(512),
        # Maskierbare Icons: voller Hintergrund, Motiv in der Safe-Zone (80 %).
        'icon-192-maskable.png': render(192, maskable=True, rounded=False, scale=0.72),
        'icon-512-maskable.png': render(512, maskable=True, rounded=False, scale=0.72),
        # iOS blendet selbst ab -> volles Quadrat.
        'apple-touch-icon.png': render(180, rounded=False, scale=0.86),
    }

    for name, image in targets.items():
        path = os.path.normpath(os.path.join(out, name))
        image.save(path, 'PNG')
        print(f'  ✓ {path} ({image.width}x{image.height})')


if __name__ == '__main__':
    main()
