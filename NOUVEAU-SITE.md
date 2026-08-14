# Décliner ce gabarit pour un nouveau client

Comptez **deux à trois heures** si vous avez les photos et les textes.

```bash
cp -R "hotel guyanne" "client-untel"
cd "client-untel"
rm -rf .git && git init
```

---

## 1. La configuration — `config/site.json`

C'est le seul fichier à modifier pour tout ce qui est **répété ou chiffré**.

| Section | Ce qu'elle pilote |
|---|---|
| `marque` | Nom, lieu, résumé — en-tête et pied de page des 10 pages |
| `contact` | Adresse, téléphone, courriel — partout, y compris les liens `tel:` |
| `palette` | Les 15 couleurs du site |
| `polices` | Les deux familles typographiques |
| `navigation` | Le menu principal et le menu mobile |
| `sejour` | Heures d'arrivée/départ, taxe, remises, bornes de saison |
| `unites` | Les chambres : nom, surface, capacité, stock, prix, photos, équipements |
| `options` | Les suppléments du moteur de réservation |
| `vedettes` | Les trois unités mises en avant sur l'accueil |
| `piedDePage` | Les colonnes de liens du pied de page |

Puis :

```bash
python3 build.py
```

Le générateur régénère l'en-tête, le menu, le pied de page, la palette, les fiches
de chambres, la grille tarifaire, les cartes de l'accueil et les données du moteur
de réservation. **Une seule source de vérité** : un prix ne s'écrit qu'à un endroit.

Pour contrôler sans rien écrire : `python3 build.py --verifie`

---

## 2. Les textes propres au client

Ils restent en HTML, écrits à la main — c'est de la prose, elle change de toute
façon complètement d'un client à l'autre.

| Fichier | À réécrire |
|---|---|
| `index.html` | Le hero, la présentation, les chiffres clés, les avis |
| `restaurant.html` | La carte entière |
| `bien-etre.html` | Les soins, le bassin, la plage |
| `decouverte.html` | Les excursions, la faune, les saisons |
| `sejour.html` | Formalités, santé, valise, règlement, FAQ |
| `mentions.html` | **Obligatoire** : éditeur, hébergeur, crédits photo |

Si le client n'a pas de restaurant ou de spa, supprimez la page et retirez sa ligne
de `navigation` et de `piedDePage` dans la configuration.

---

## 3. Les photos

Remplacez le contenu de `assets/img/` en **gardant les mêmes noms de fichiers**.
Formats attendus :

| Usage | Nom | Format |
|---|---|---|
| Hero de page | `hero-*.jpg` | 2000 px, 16/9 |
| Photo de chambre | `room-*.jpg`, `suite-*.jpg` | 1200–1400 px |
| Plein écran | `*-lg.jpg` | 1700 px sur le grand côté |
| Vignette de détail | `d-*.jpg` | 800 px, carré |
| Galerie | `gal-*.jpg` | 1000–1200 px |

**Gardez un étalonnage unique sur toutes les photos.** C'est ce qui donne
l'impression d'un seul lieu, et c'est le point le plus important visuellement.
La courbe utilisée ici est dans `make_video.py` (fonction `grade`) : désaturation
légère, courbe en S, noirs relevés en mat, hautes lumières réchauffées.

Pour la vidéo d'accueil, `make_video.py` fabrique un travelling à partir des photos
du client — garantie d'être exactement dans les mêmes tons.

---

## 4. Avant la mise en ligne

- [ ] `python3 build.py` a bien tourné
- [ ] Photos remplacées par celles du client
- [ ] `mentions.html` : éditeur, hébergeur, crédits à jour
- [ ] Formulaires branchés (voir plus bas) ou avertissement retiré
- [ ] Numéro de version `?v=` incrémenté dans les pages
- [ ] Testé à 375 px et 1440 px de large

### Brancher les formulaires

Ils sont inertes par défaut. Trois options, de la plus simple à la plus complète :

1. **Netlify Forms** — ajoutez `netlify` sur la balise `<form>`, rien d'autre à faire.
2. **Formspree** — `action="https://formspree.io/f/xxxx"` sur le formulaire.
3. **Vraie réservation** — remplacez `occupation()` et `stock()` dans
   `js/reservation.js` par des appels à un PMS (Mews, Cloudbeds, Availpro).

### Le paiement

Le bloc carte de `reservation.html` est **une maquette inerte**. Pour du réel,
il doit être remplacé par les champs hébergés d'un prestataire (Stripe Elements,
Adyen). Un site ne doit jamais manipuler lui-même un numéro de carte : c'est la
condition de la conformité PCI DSS.

---

## 5. Déployer

**Netlify** — *Add new site → Import an existing project → GitHub*, puis laissez
les deux champs de build **vides**. C'est un site statique, il n'y a rien à compiler.

Si vous préférez que Netlify lance le générateur à chaque envoi :

| Build command | `python3 build.py` |
|---|---|
| Publish directory | `.` |
