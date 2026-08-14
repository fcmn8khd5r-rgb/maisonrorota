#!/usr/bin/env python3
"""
Génère la vidéo du hero d'accueil à partir des photos déjà étalonnées.

Même source, même étalonnage que les images du site : la vidéo reste donc
exactement dans les mêmes tons. Travelling lent (Ken Burns) + fondus enchaînés.
Sortie 1600x900 : le cadrage descend toujours (jamais d'agrandissement),
donc l'image reste nette pour un poids contenu.
"""
import os, math
import numpy as np
import imageio.v2 as imageio
from PIL import Image, ImageEnhance

SCRATCH = "/private/tmp/claude-501/-Users-mathysbocage-hotel-guyanne/46d88501-54a1-4c93-be5d-cf5de47684a7/scratchpad"
SRC = os.path.join(SCRATCH, "wm")
OUT = "/Users/mathysbocage/hotel guyanne/assets/video"
os.makedirs(OUT, exist_ok=True)

W, H = 1600, 900
FPS = 25
SHOT = 4.6          # secondes par plan
FADE = 1.15         # durée du fondu enchaîné

# (fichier, zoom départ, zoom arrivée, panoramique x, panoramique y)
SHOTS = [
    ("hotel_16.jpg", 1.00, 1.10,  0.00,  0.02),   # entrée à l'heure bleue
    ("hotel_12.jpg", 1.09, 1.00, -0.02,  0.00),   # bassin et bâtiment
    ("hotel_13.jpg", 1.00, 1.09,  0.02, -0.01),   # lit à baldaquin
    ("hotel_29.jpg", 1.08, 1.00,  0.02,  0.00),   # galerie du restaurant
    ("hotel_20.jpg", 1.00, 1.10, -0.02,  0.01),   # bassin, toits rouges
    ("hotel_15.jpg", 1.09, 1.00,  0.00, -0.02),   # entrée de nuit
]

# ---- même courbe colorimétrique que les photos du site -------------------
def _luts():
    r, g, b = [], [], []
    for i in range(256):
        x = i / 255.0
        s = x * x * (3 - 2 * x)
        y = x * 0.70 + s * 0.30
        y = 0.030 + y * (1 - 0.030)
        r.append(max(0, min(255, int(255 * (y ** 0.965) + 1))))
        g.append(max(0, min(255, int(255 * (y ** 1.000)))))
        b.append(max(0, min(255, int(255 * (y ** 1.075) + 4))))
    return r + g + b
LUT = _luts()

def grade(im):
    im = ImageEnhance.Color(im.convert("RGB")).enhance(0.90)
    im = im.point(LUT)
    return ImageEnhance.Contrast(im).enhance(1.03)

def ease(t):                      # accélération/décélération douce
    return t * t * (3 - 2 * t)

def load(name):
    im = Image.open(os.path.join(SRC, name)).convert("RGB")
    # cadre 16/9 le plus large possible dans la source
    w, h = im.size
    if w / h > W / H:
        nw = int(h * W / H); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = int(w * H / W); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    return grade(im)

print("chargement des plans…", flush=True)
BASE = [load(s[0]) for s in SHOTS]

def frame(idx, t):
    """Une image du plan `idx`, à l'instant relatif t (0→1)."""
    im = BASE[idx]
    _, z0, z1, px, py = SHOTS[idx]
    e = ease(t)
    z = z0 + (z1 - z0) * e
    bw, bh = im.size
    cw, ch = bw / z, bh / z
    # panoramique : on déplace le centre de la fenêtre
    cx = bw / 2 + px * bw * (e - 0.5)
    cy = bh / 2 + py * bh * (e - 0.5)
    cx = min(max(cx, cw / 2), bw - cw / 2)
    cy = min(max(cy, ch / 2), bh - ch / 2)
    box = (cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2)
    return im.resize((W, H), Image.LANCZOS, box=box)

n_shot = int(SHOT * FPS)
n_fade = int(FADE * FPS)
total = len(SHOTS) * (n_shot - n_fade) + n_fade
print(f"rendu de {total} images ({total/FPS:.1f} s)…", flush=True)

path = os.path.join(OUT, "hero.mp4")
writer = imageio.get_writer(
    path, fps=FPS, codec="libx264", quality=None,
    macro_block_size=1,
    ffmpeg_params=["-crf", "29", "-preset", "slow", "-pix_fmt", "yuv420p",
                   "-profile:v", "high", "-movflags", "+faststart", "-an"],
)

written = 0
for i in range(len(SHOTS)):
    for f in range(n_shot):
        t = f / (n_shot - 1)
        cur = frame(i, t)
        # fondu entrant depuis le plan précédent
        if f < n_fade and i > 0:
            a = f / n_fade
            prev_t = (n_shot - n_fade + f) / (n_shot - 1)
            cur = Image.blend(frame(i - 1, min(prev_t, 1.0)), cur, ease(a))
        elif f >= n_shot - n_fade and i < len(SHOTS) - 1:
            continue          # ces images sont produites par le plan suivant
        writer.append_data(np.asarray(cur))
        written += 1
        if written % 50 == 0:
            print(f"  {written} images", flush=True)

writer.close()
print("écrit :", path, f"{os.path.getsize(path)/1e6:.2f} Mo", f"{written} images")
