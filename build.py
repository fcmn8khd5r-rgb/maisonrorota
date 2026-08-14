#!/usr/bin/env python3
"""
Générateur du site — Maison Rorota.

Lit config/site.json et régénère tout ce qui se répète ou se duplique :

  · l'en-tête, le menu mobile et le pied de page des 10 pages
  · la palette de couleurs dans css/style.css
  · js/reservation-data.js (catalogue et tarifs du moteur de réservation)
  · les fiches de chambres et la grille tarifaire de chambres.html
  · les trois cartes de l'accueil

Le reste (textes de la table, des excursions, du séjour) reste en HTML,
écrit à la main : c'est de la prose, elle change de toute façon à chaque client.

    python3 build.py            régénère tout
    python3 build.py --verifie  contrôle sans écrire
"""
import json, os, re, sys, textwrap

ICI = os.path.dirname(os.path.abspath(__file__))
CFG = os.path.join(ICI, "config", "site.json")
PAGES = ["index.html", "chambres.html", "restaurant.html", "bien-etre.html",
         "decouverte.html", "sejour.html", "galerie.html", "contact.html",
         "reservation.html", "mentions.html"]

VERIFIE = "--verifie" in sys.argv
modifies, inchanges = [], []


def lire(p):
    return open(os.path.join(ICI, p), encoding="utf-8").read()


def ecrire(p, contenu):
    chemin = os.path.join(ICI, p)
    if os.path.exists(chemin) and lire(p) == contenu:
        inchanges.append(p); return
    modifies.append(p)
    if not VERIFIE:
        open(chemin, "w", encoding="utf-8").write(contenu)


def euros(n):
    return f"{n:,}".replace(",", "\u00a0") + "\u00a0€"


# ---------------------------------------------------------------- en-tête
def entete(c, page):
    m, nav = c["marque"], c["navigation"]
    liens = "\n".join(
        '      <a href="%s"%s>%s</a>' % (n["url"], ' aria-current="page"' if n["url"] == page else "", n["libelle"])
        for n in nav)
    # la page de réservation renvoie vers le contact, les autres vers la réservation
    cta = ('<a class="btn" href="contact.html">Nous écrire</a>'
           if page == "reservation.html" else
           '<a class="btn" href="reservation.html">Réserver</a>')
    solide = " is-solid" if page in ("reservation.html", "mentions.html") else ""

    entrees = "\n".join(
        '    <li><a href="%s">%s</a></li>' % (n["url"], n["libelle"])
        for n in [{"url": "index.html", "libelle": "Accueil"}] + nav +
                 [{"url": "reservation.html", "libelle": "Réserver"}])

    return f'''
<header class="header{solide}">
  <div class="header__inner">
    <a class="brand" href="index.html" aria-label="{m['nom']}, accueil">
      <span class="brand__name">{m['nom']}</span>
      <span class="brand__sub">{m['lieu']}</span>
    </a>
    <nav class="nav" aria-label="Navigation principale">
{liens}
    </nav>
    <div class="header__cta">{cta}</div>
    <button class="burger" type="button" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="menu-mobile">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>

<div class="mobile-nav" id="menu-mobile">
  <ul>
{entrees}
  </ul>
  <div class="mobile-nav__foot">
    <span>{c['contact']['adresseCourte']}</span>
    <span>{c['contact']['telephone']}</span>
  </div>
</div>

'''


# ------------------------------------------------------------ pied de page
def pied(c):
    m, ct = c["marque"], c["contact"]
    cols = ""
    for col in c["piedDePage"]["colonnes"]:
        liens = "\n".join('          <li><a href="%s">%s</a></li>' % (l["url"], l["libelle"])
                          for l in col["liens"])
        cols += f'''      <div>
        <h4>{col['titre']}</h4>
        <ul>
{liens}
        </ul>
      </div>
'''
    adresse = "<br>\n          ".join(ct["adresse"])
    return f'''<footer class="footer">
  <div class="wrap">
    <div class="footer__grid">
      <div class="footer__brand">
        <span class="brand__name">{m['nom']}</span>
        <p>
          {m['resume']}<br>
          {adresse}
        </p>
        <p style="margin-top:1.2rem">
          <a href="tel:{ct['telephoneLien']}">{ct['telephone']}</a><br>
          <a href="mailto:{ct['courriel']}">{ct['courriel']}</a>
        </p>
      </div>
{cols}    </div>
    <div class="footer__bottom">
      <span>© <span data-year>2026</span> {m['nom']} — {m['piedDePage']}</span>
      <span>{c['sejour']['mentionPied']}</span>
    </div>
  </div>
</footer>'''


# ---------------------------------------------------------- fiches chambres
def fiches(c):
    out = []
    for i, u in enumerate(c["unites"]):
        vign = "\n".join(
            '          <div class="ph ratio-1-1 ph--zoom" data-reveal-img style="--d:.%ss" '
            'data-lightbox="assets/img/%s-lg.jpg" data-caption="%s" role="button" tabindex="0" '
            'aria-label="Agrandir : %s"><img src="assets/img/%s.jpg" alt="%s" loading="lazy"></div>'
            % (d, v["slot"], v["legende"], v["legende"], v["slot"], v["legende"])
            for d, v in zip(("1", "16", "22"), u["vignettes"]))
        equip = "\n".join("          <li>%s</li>" % e for e in u["equipements"])
        specs = "".join("<span>%s</span>" % s for s in u["specs"])
        p = u["photo"]
        out.append(f'''    <article class="room{' room--reverse' if u['inverse'] else ''}" id="{u['id']}">
      <div class="room__media">
        <div class="ph ratio-4-3 ph--zoom" data-reveal-img data-lightbox="assets/img/{p['slot']}-lg.jpg" data-caption="{p['legende']}" role="button" tabindex="0" aria-label="Agrandir : {p['legende']}"><img src="assets/img/{p['slot']}.jpg" alt="{p['legende']}" loading="lazy"></div>
        <div class="room__thumbs">
{vign}
        </div>
      </div>

      <div class="room__body" data-reveal>
        <p class="room__no">{u['rang']}</p>
        <h2 class="h2">{u['nom']}</h2>
        <p class="room__specs">
          {specs}
        </p>
        <p>
          {textwrap.fill(u['description'], 92, initial_indent='', subsequent_indent='          ',
                        break_on_hyphens=False, break_long_words=False)}
        </p>
        <ul class="ticks ticks--2">
{equip}
        </ul>
        <p class="room__price"><b>{euros(u['prixBasse'])}</b> <span>{u['prixMention']}</span></p>
        <a class="btn" href="reservation.html?cat={u['id']}">{u.get("cta", "Réserver")}</a>
      </div>
    </article>''')
    return "\n\n".join(out)


# --------------------------------------------------------- grille tarifaire
def grille(c):
    s = c["sejour"]
    lignes = "\n".join(f'''          <tr>
            <th scope="row">{u['nom']}</th>
            <td>{u['nombre']}</td><td>{u['surface']} m²</td>
            <td class="num">{euros(u['prixBasse'])}</td><td class="num">{euros(u['prixHaute'])}</td>
          </tr>''' for u in c["unites"])
    return f'''<table class="tbl">
        <caption class="sr-only">Tarifs par catégorie et par saison</caption>
        <thead>
          <tr>
            <th scope="col">Catégorie</th>
            <th scope="col">Clés</th>
            <th scope="col">Surface</th>
            <th scope="col">Basse saison<br>{s['basseSaison']['libelle']}</th>
            <th scope="col">Haute saison<br>{s['hauteSaison']['libelle']}</th>
          </tr>
        </thead>
        <tbody>
{lignes}
        </tbody>
      </table>'''


# ------------------------------------------------------ cartes de l'accueil
def cartes(c):
    choisies = [u for u in c["unites"] if u["id"] in c.get("vedettes", ["wapa", "awara", "maripa"])]
    out = []
    for u in choisies:
        etiquette = f"{u['nombre']} chambres" if u["nombre"] > 4 else (
            f"{u['nombre']} suites" if u["nombre"] > 1 else "Signature")
        out.append(f'''      <article class="card" data-reveal>
        <div class="ph card__media ratio-4-5" data-reveal-img>
          <span class="card__tag">{etiquette}</span>
          <img src="assets/img/{u['photo']['slot']}.jpg" alt="{u['photo']['legende']}" loading="lazy">
        </div>
        <h3 class="h3 card__title">{u['nom']}</h3>
        <p class="card__meta">{u['surface']} m² · {u['specs'][-1]}</p>
        <p class="card__desc">{u['resume']}</p>
        <div class="card__foot">
          <span class="card__price">{euros(u['prixBasse'])}<small>La nuit, dès</small></span>
          <a class="link-u" href="chambres.html#{u['id']}">Voir <span class="arw">&rarr;</span></a>
        </div>
      </article>''')
    return "\n\n".join(out)


# -------------------------------------- données du moteur de réservation
def donnees_reservation(c):
    s = c["sejour"]
    unites = ",\n".join(
        '    { id: "%s", nom: "%s", surface: %d, capacite: %d, stock: %d,\n'
        '      img: "%s", basse: %d, haute: %d,\n      desc: "%s" }'
        % (u["id"], u["nom"], u["surface"], u["capacite"], u["nombre"],
           u["photo"]["slot"], u["prixBasse"], u["prixHaute"], u["resume"])
        for u in c["unites"])
    options = ",\n".join(
        '    { id: "%s", nom: "%s", desc: "%s",\n      prix: %d, unite: "%s"%s }'
        % (o["id"], o["nom"], o["desc"], o["prix"], o["unite"],
           ', exclut: "%s"' % o["exclut"] if "exclut" in o else "")
        for o in c["options"])
    remises = ", ".join("{ nuits: %d, taux: %s }" % (r["nuits"], r["taux"])
                        for r in s["remisesSejourLong"])
    return f'''/* ==========================================================================
   Données du moteur de réservation — FICHIER GÉNÉRÉ
   Ne pas modifier à la main : éditez config/site.json puis lancez build.py
   ========================================================================== */
window.ROROTA = {{
  CATS: [
{unites}
  ],
  OPTIONS: [
{options}
  ],
  TAXE: {s['taxeSejour']},
  REMISE_PREPAIEMENT: {s['remisePrepaiement']},
  REMISES: [{remises}],
  BASSE_SAISON: {{ moisDebut: {s['basseSaison']['moisDebut']}, moisFin: {s['basseSaison']['moisFin']} }}
}};
'''


# ------------------------------------------------------------------ palette
def palette(c, css):
    for cle, val in c["palette"].items():
        css = re.sub(r"(--%s:\s*)#[0-9A-Fa-f]{3,8}" % re.escape(cle), r"\g<1>" + val, css, count=1)
    css = re.sub(r"(--font-display:\s*)[^;]+", r"\g<1>" + c["polices"]["titre"], css, count=1)
    css = re.sub(r"(--font-sans:\s*)[^;]+", r"\g<1>" + c["polices"]["texte"], css, count=1)
    return css


# ==================================================================== BUILD
def main():
    c = json.load(open(CFG, encoding="utf-8"))

    # 1. chrome commun à toutes les pages
    for page in PAGES:
        s = lire(page)
        # entre la fin du lien d'évitement et <main
        s = re.sub(r'(<a class="skip-link"[^>]*>[^<]*</a>\n).*?(<main)',
                   lambda m: m.group(1) + entete(c, page) + m.group(2), s, flags=re.S)
        s = re.sub(r"<footer class=\"footer\">.*?</footer>", lambda _: pied(c), s, flags=re.S)
        # coordonnées et marque dans les balises meta
        s = s.replace("{{MARQUE}}", c["marque"]["nom"])
        ecrire(page, s)

    # 2. palette
    ecrire("css/style.css", palette(c, lire("css/style.css")))

    # 3. données du moteur
    ecrire("js/reservation-data.js", donnees_reservation(c))

    # 4. fiches + grille tarifaire
    s = lire("chambres.html")
    motif = (r'(<section class="section section--flush-top" id="categories">\n'
             r'  <div class="wrap">\n\n).*?(\n\n  </div>\n</section>)')
    s, n = re.subn(motif, lambda m: m.group(1) + fiches(c) + m.group(2), s, flags=re.S)
    if n != 1:
        raise SystemExit("chambres.html : section #categories introuvable — "
                         "le générateur ne peut pas placer les fiches.")
    s = re.sub(r"<table class=\"tbl\">.*?</table>", lambda _: grille(c), s, flags=re.S, count=1)
    ecrire("chambres.html", s)

    # 5. cartes de l'accueil
    s = lire("index.html")
    s = re.sub(r'(<div class="grid grid-3" data-stagger="\.1">\n).*?(\n    </div>\n\n    <p class="center")',
               lambda m: m.group(1) + cartes(c) + m.group(2), s, flags=re.S)
    ecrire("index.html", s)

    # bilan
    if VERIFIE:
        print("VÉRIFICATION — aucun fichier écrit")
    print(f"régénérés : {len(modifies)}")
    for p in modifies:
        print("   ·", p)
    print(f"inchangés : {len(inchanges)}")


if __name__ == "__main__":
    main()
