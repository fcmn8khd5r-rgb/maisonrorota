#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dérive chaque photo en plusieurs largeurs, en AVIF et en WebP.

Pourquoi. Les 101 photos étaient livrées en JPEG seul, 27,9 Mo au total, en
une seule taille — et cette taille n'était pas celle où elles s'affichent.
Mesuré : 31 images sur 83 sont servies au moins 25 % plus grandes que
nécessaire, certaines six fois trop (1400 px livrés pour 419 px affichés).
Sur un téléphone, cela fait des mégaoctets tirés pour rien, et des photos qui
arrivent longtemps après le texte.

S'y ajoutait un défaut plus sournois : aucune balise <img> ne déclarait ses
dimensions. La place n'était donc pas réservée, et chaque photo qui arrivait
poussait le texte vers le bas. C'est ce que l'on voit quand on dit que « les
photos ne chargent pas » : elles chargent, mais en faisant sauter la page.

Ce script produit, pour chaque photo, un jeu de largeurs en AVIF et en WebP,
et un manifeste : dimensions natives, poids de chaque variante, et une image
d'attente de seize pixels encodée dans le document. Le HTML s'en sert pour
réserver la place exacte et laisser le navigateur choisir la bonne largeur.

    python3 src/images.py            # ne refait que ce qui manque
    python3 src/images.py --tout     # refait tout
"""
import base64, io, json, os, sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOSSIER = os.path.join(RACINE, "assets", "img")
MANIFESTE = os.path.join(RACINE, "src", "manifeste-images.json")

# Quatre paliers suffisent : en dessous de 25 % d'écart, le navigateur choisit
# la même image et les fichiers en trop ne servent qu'à encombrer.
LARGEURS = [480, 800, 1280, 1920]
Q_AVIF, Q_WEBP = 58, 80
LARGEUR_ATTENTE = 16


def attente(im):
    """Vignette de seize pixels encodée dans le document : elle tient la place
    et donne la couleur pendant le téléchargement, plutôt qu'un trou blanc."""
    p = im.resize((LARGEUR_ATTENTE, max(1, round(LARGEUR_ATTENTE * im.height / im.width))))
    t = io.BytesIO(); p.save(t, "WEBP", quality=45, method=6)
    return "data:image/webp;base64," + base64.b64encode(t.getvalue()).decode()


def paliers(largeur_native):
    """Les largeurs à produire, sans jamais agrandir ni dépasser l'original."""
    out = [l for l in LARGEURS if l < largeur_native]
    out.append(largeur_native)          # l'original, pour les grands écrans
    return sorted(set(out))


def main():
    from PIL import Image
    tout = "--tout" in sys.argv
    man = json.load(open(MANIFESTE, encoding="utf-8")) if (
        os.path.exists(MANIFESTE) and not tout) else {}

    fichiers = sorted(f for f in os.listdir(DOSSIER) if f.lower().endswith((".jpg", ".jpeg")))
    avant = apres_min = 0
    for i, f in enumerate(fichiers, 1):
        cle = os.path.splitext(f)[0]
        src = os.path.join(DOSSIER, f)
        im = Image.open(src).convert("RGB")
        variantes = {}
        for l in paliers(im.width):
            h = max(1, round(im.height * l / im.width))
            petite = im if l == im.width else im.resize((l, h), Image.LANCZOS)
            for ext, fmt, q in (("avif", "AVIF", Q_AVIF), ("webp", "WEBP", Q_WEBP)):
                nom = "%s-%d.%s" % (cle, l, ext)
                chemin = os.path.join(DOSSIER, nom)
                if tout or not os.path.exists(chemin):
                    if fmt == "WEBP":
                        petite.save(chemin, fmt, quality=q, method=6)
                    else:
                        petite.save(chemin, fmt, quality=q)
                variantes.setdefault(str(l), {})[ext] = os.path.getsize(chemin)
        man[cle] = {"l": im.width, "h": im.height,
                    "jpg": os.path.getsize(src),
                    "variantes": variantes,
                    "attente": man.get(cle, {}).get("attente") or attente(im)}
        pl = paliers(im.width)
        avant += man[cle]["jpg"]
        apres_min += variantes[str(pl[0])]["avif"]
        print("  %3d/%d  %-30s %4dx%-4d  %s"
              % (i, len(fichiers), f, im.width, im.height,
                 " ".join("%d:%dKo" % (l, variantes[str(l)]["avif"] // 1024) for l in pl)),
              flush=True)

    json.dump(man, open(MANIFESTE, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1, sort_keys=True)
    print("\n%d images, %d fichiers dérivés."
          % (len(fichiers), sum(len(v["variantes"]) * 2 for v in man.values())))
    print("Un téléphone recevra %.1f Mo là où il en recevait %.1f."
          % (apres_min / 1e6, avant / 1e6))


if __name__ == "__main__":
    main()
