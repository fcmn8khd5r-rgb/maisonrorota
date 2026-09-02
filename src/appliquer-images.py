#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Réécrit les balises <img> en <picture> responsives.

Chaque image devient un aiguillage : AVIF d'abord, WebP ensuite, le JPEG
d'origine en dernier recours. Le navigateur choisit la largeur qui lui
convient grâce à srcset et à sizes — et sizes n'est pas deviné, il vient des
largeurs réellement mesurées à l'écran (src/largeurs-affichage.json). Sans
lui, le navigateur suppose que l'image occupe toute la fenêtre et télécharge
une variante bien trop grande.

Deux attributs valent autant que le reste : width et height. Ils ne
redimensionnent rien — le CSS s'en charge — mais ils donnent le rapport de
forme AVANT que l'image arrive. La place est donc réservée, et le texte ne
saute plus quand la photo se pose. C'est ce saut que l'on prenait pour un
défaut de chargement.

    python3 src/appliquer-images.py           # écrit
    python3 src/appliquer-images.py --verifie # contrôle sans écrire
"""
import json, os, re, sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAN = json.load(open(os.path.join(RACINE, "src/manifeste-images.json"), encoding="utf-8"))
LARG = json.load(open(os.path.join(RACINE, "src/largeurs-affichage.json"), encoding="utf-8"))

IMG = re.compile(r'<img\b([^>]*?)\s*/?>', re.S)
ATTR = re.compile(r'([a-zA-Z-]+)(?:\s*=\s*"([^"]*)")?')


def attributs(s):
    out = []
    for m in ATTR.finditer(s):
        out.append((m.group(1), m.group(2)))
    return out


def sizes_de(cle):
    """L'attribut sizes, écrit à partir des largeurs mesurées.

    Les images qui suivent la fenêtre sont déclarées en 100vw : un écran plus
    large que ceux mesurés doit recevoir plus grand, pas la dernière valeur."""
    l = LARG.get(cle)
    if not l:
        return "100vw"
    p, t, d = l
    pleine = abs(p - 390) <= 40 and abs(d - 1440) <= 60
    if pleine:
        return "100vw"
    return "(max-width:600px) %dpx, (max-width:1024px) %dpx, %dpx" % (p, t, d)


def srcset(cle, ext):
    v = MAN[cle]["variantes"]
    return ", ".join("assets/img/%s-%s.%s %sw" % (cle, l, ext, l)
                     for l in sorted(v, key=int))


def remplacer(m):
    brut = m.group(1)
    att = dict(attributs(brut))
    src = att.get("src", "")
    cle = os.path.basename(src).rsplit(".", 1)[0]
    if not src.startswith("assets/img/") or cle not in MAN:
        return m.group(0)
    f = MAN[cle]

    # On conserve tout ce que la page avait posé, et l'on complète.
    garde = []
    for nom, val in attributs(brut):
        if nom in ("width", "height", "decoding"):
            continue
        if nom == "style":
            continue                      # remplacé par l'image d'attente
        garde.append('%s="%s"' % (nom, val) if val is not None else nom)
    garde.append('width="%d"' % f["l"])
    garde.append('height="%d"' % f["h"])
    garde.append('decoding="async"')
    garde.append('style="background:url(%s) center/cover"' % f["attente"])

    s = sizes_de(cle)
    return ('<picture>'
            '<source type="image/avif" srcset="%s" sizes="%s">'
            '<source type="image/webp" srcset="%s" sizes="%s">'
            '<img %s></picture>'
            % (srcset(cle, "avif"), s, srcset(cle, "webp"), s, " ".join(garde)))


def main():
    verifie = "--verifie" in sys.argv
    total = touchees = 0
    for f in sorted(x for x in os.listdir(RACINE) if x.endswith(".html")):
        chemin = os.path.join(RACINE, f)
        s = ancien = open(chemin, encoding="utf-8").read()
        # on ne retouche pas ce qui est déjà enveloppé
        if "<picture>" in s:
            deja = s.count("<picture>")
            print("  %-22s déjà réécrit (%d images)" % (f, deja))
            total += deja
            continue
        s, n = IMG.subn(remplacer, s)
        total += n
        if s != ancien:
            touchees += 1
            if not verifie:
                open(chemin, "w", encoding="utf-8").write(s)
            print("  %-22s %d image(s) réécrite(s)" % (f, n))
    print("\n%d images sur %d page(s)." % (total, touchees))


if __name__ == "__main__":
    main()
