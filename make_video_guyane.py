#!/usr/bin/env python3
"""
Monte la vidéo d'accueil « images réelles » à partir de prises de vue aériennes
tournées en Guyane.

Source : « La Guyane au drone », FL Production / Lionel Fauré,
         Wikimedia Commons, licence CC BY 3.0.

Cinq plans, enchaînés en fondu, ramenés à l'étalonnage du site (même courbe que
les photos : désaturation légère, courbe en S, noirs mats, hautes lumières
chaudes) pour rester dans les mêmes tons que le reste des pages.

Le recadrage écarte le logo du vidéaste (haut droite) et le cartouche de légende
(bas gauche) : la source ne peut pas être reprise telle quelle sur un site.
L'attribution figure dans mentions.html, comme l'exige la licence.

Prérequis : pip3 install --user imageio imageio-ffmpeg
            et le fichier source dans vid/drone.webm
"""
import os, subprocess, numpy as np
import imageio.v2 as imageio
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
ICI = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ICI, "vid", "drone.webm")
OUT = os.path.join(ICI, "assets", "video")
TMP = os.path.join(ICI, "seg")
os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True)

# (début, durée, libellé) — calés pour ne contenir aucun raccord
PLANS = [
    (58.6, 4.3, "Petit-Saut, l'île au couchant"),
    (68.2, 4.3, "Cocotiers, sentier des Salines"),
    (103.5, 4.6, "Lac de Rorota"),
    (131.5, 4.3, "Route des plages"),
    (156.0, 4.0, "Estran, rochers et reflets"),
]
FPS, FONDU = 25, 25          # fondu d'une seconde

# hors du logo (haut droite) et du cartouche (bas gauche), puis 16/9 centré
CROP = "crop=1262:710:329:130"

# même courbe colorimétrique que les photos du site
GRADE = (
    "eq=saturation=0.90:contrast=1.03,"
    "curves="
    "r='0/0.040 0.25/0.262 0.5/0.531 0.75/0.796 1/1':"
    "g='0/0.030 0.25/0.245 0.5/0.515 0.75/0.785 1/1':"
    "b='0/0.039 0.25/0.238 0.5/0.508 0.75/0.786 1/1'"
)

def ease(t):
    return t * t * (3 - 2 * t)

def coupe(largeur, hauteur):
    """Extrait chaque plan dans un fichier propre à cadence fixe."""
    chemins = []
    for i, (debut, duree, nom) in enumerate(PLANS):
        p = os.path.join(TMP, f"g{i}_{largeur}.mp4")
        subprocess.run(
            [FF, "-y", "-loglevel", "error", "-ss", str(debut), "-t", str(duree), "-i", SRC,
             "-vf", f"{CROP},scale={largeur}:{hauteur},{GRADE},fps={FPS}",
             "-vsync", "cfr", "-r", str(FPS),
             "-c:v", "libx264", "-crf", "17", "-preset", "fast",
             "-pix_fmt", "yuv420p", "-an", p], check=True)
        chemins.append(p)
        print(f"   plan {i + 1}/{len(PLANS)} — {nom}", flush=True)
    return chemins

def monte(chemins, crf, sortie):
    """Enchaîne les plans en fondu.

    Les fondus sont calculés ici plutôt qu'avec le filtre xfade de ffmpeg :
    enchaîné, celui-ci perd l'information de cadence et refuse de se configurer.
    """
    plans = []
    for p in chemins:
        r = imageio.get_reader(p)
        plans.append([im for im in r])
        r.close()

    w = imageio.get_writer(
        sortie, fps=FPS, codec="libx264", quality=None, macro_block_size=1,
        ffmpeg_params=["-crf", str(crf), "-preset", "veryslow", "-pix_fmt", "yuv420p",
                       "-profile:v", "high", "-movflags", "+faststart", "-an"])
    n = 0
    for i, f in enumerate(plans):
        fin = len(f) if i == len(plans) - 1 else len(f) - FONDU
        for k in range(fin):
            img = f[k]
            if i > 0 and k < FONDU:
                prec = plans[i - 1][len(plans[i - 1]) - FONDU + k]
                a = ease((k + 1) / FONDU)
                img = (prec.astype(np.float32) * (1 - a) + img.astype(np.float32) * a).astype(np.uint8)
            w.append_data(img); n += 1
    w.close()
    print(f"→ {os.path.basename(sortie)} : {os.path.getsize(sortie) / 1e6:.2f} Mo, "
          f"{n} images ({n / FPS:.1f} s)", flush=True)

print("plans 1440…", flush=True)
monte(coupe(1440, 810), 30, os.path.join(OUT, "hero-guyane-1440.mp4"))
print("plans 960…", flush=True)
monte(coupe(960, 540), 31, os.path.join(OUT, "hero-guyane-960.mp4"))

# image d'affiche : première image du montage
subprocess.run([FF, "-y", "-loglevel", "error",
                "-i", os.path.join(OUT, "hero-guyane-1440.mp4"),
                "-frames:v", "1", "-q:v", "3",
                os.path.join(ICI, "assets", "img", "hero-guyane.jpg")], check=True)
print("affiche : assets/img/hero-guyane.jpg")
