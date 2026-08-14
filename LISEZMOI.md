# Maison Rorota — site vitrine

Site statique pour un hôtel de 20 chambres et suites à **Rémire-Montjoly, Guyane française**
(commune du littoral entre Cayenne et l'aéroport, en bordure de la plage de Montjoly et
de la forêt du Rorota).

Aucune dépendance, aucun build : HTML, CSS et JavaScript natifs.

## Lancer le site

```bash
python3 -m http.server 8137
```

Puis ouvrir <http://localhost:8137>. Un double-clic sur `index.html` fonctionne aussi.

## Pages

| Fichier | Contenu |
|---|---|
| `index.html` | Accueil : hero **vidéo**, présentation, chiffres, aperçu chambres, table, découverte, spa, avis |
| `reservation.html` | **Moteur de réservation** : calendrier, disponibilités, options, paiement, confirmation |
| `chambres.html` | Les 5 catégories détaillées (20 clés au total) + grille tarifaire et prestations |
| `restaurant.html` | La Table de Rorota : parti pris, carte complète, formules, bar |
| `bien-etre.html` | Spa Wassaï, carte des soins, bassin, plage, bibliothèque, salle de sport |
| `decouverte.html` | 12 excursions filtrables, faune, les quatre saisons guyanaises |
| `sejour.html` | Formalités, santé et vaccins, climat, valise, infos pratiques, **règlement intérieur**, annulation, FAQ |
| `galerie.html` | Mosaïque de 22 photos avec visionneuse |
| `contact.html` | Demande de réservation, contacts, accès et transferts, privatisation |
| `mentions.html` | Mentions légales et **crédits photo complets** |

## Les 20 clés

| Catégorie | Nombre | Surface | Basse saison | Haute saison |
|---|---|---|---|---|
| Chambre Deluxe Wapa | 8 | 42 m² | 390 € | 470 € |
| Chambre Prestige Atlantique | 6 | 55 m² | 540 € | 650 € |
| Suite Junior Awara | 4 | 78 m² | 820 € | 980 € |
| Suite Canopée | 1 | 120 m² | 1 450 € | 1 690 € |
| Villa Maripa | 1 | 140 m² | 1 850 € | 2 200 € |

Basse saison = 1<sup>er</sup> avril – 30 juin (grande saison des pluies).
Haute saison = 1<sup>er</sup> juillet – 31 mars.

## Cohérence des photographies

C'est le point qui a demandé le plus de soin. Deux décisions :

1. **Une seule source pour l'hôtel.** Toutes les vues intérieures et extérieures viennent
   d'un même reportage sur un même établissement (l'Amantaka, à Luang Prabang), publié sur
   Wikimedia Commons sous licence Creative Commons. Même photographe, même lumière, même
   architecture coloniale tropicale — d'où l'impression d'un lieu unique.
2. **Un étalonnage unique appliqué à tous les fichiers.** Chaque photo, y compris celles de
   nature prises en Guyane, est passée par la même courbe : légère désaturation, courbe en S,
   noirs relevés en mat, hautes lumières réchauffées, ombres légèrement froides. C'est ce qui
   raccorde les extérieurs guyanais aux intérieurs.

L'étalonnage est **intégré aux fichiers** (`assets/img/`), pas appliqué en CSS : le rendu ne
dépend donc pas du navigateur, et il n'y a pas de double correction.

> **⚠️ Avant toute mise en ligne réelle**
> Ces photographies représentent un établissement existant qui n'est pas celui décrit ici.
> Les licences autorisent la réutilisation commerciale avec attribution — les crédits sont
> dans `mentions.html` — mais présenter un hôtel avec les images d'un autre tromperait les
> clients. Il faut les remplacer par les photos de l'établissement concerné.
> Le reste du site (textes, structure, tarifs) est original.

## Le moteur de réservation

`reservation.html` + `js/reservation.js` + `css/reservation.css`.

Parcours en quatre étapes : **dates → chambre → options → paiement**, puis confirmation
avec référence de dossier. Un récapitulatif collant suit le prix en temps réel.

**Le calcul des prix est complet et exact** : tarif à la nuit selon la saison de chaque nuit,
remise séjour long (−10 % dès 5 nuits, −15 % dès 10), options (demi-pension et pension
calculées par personne et par jour, transfert au forfait, etc.), taxe de séjour à
3,30 € par adulte et par nuit, et remise de 15 % sur le tarif prépayé.

**Les disponibilités sont simulées** de façon *déterministe* : le même jour affiche toujours
le même état, et le remplissage est corrélé à la semaine — un hôtel se remplit par blocs.
Des tirages indépendants nuit par nuit rendraient tout séjour d'une semaine impossible.

### Pour le rendre réel

1. **Disponibilités et tarifs** — remplacer `occupation()`, `stock()` et le catalogue `CATS`
   dans `js/reservation.js` par des appels à votre PMS ou channel manager
   (Mews, Cloudbeds, Opera, Availpro…).
2. **Paiement** — le bloc carte de l'étape 4 est **une maquette inerte**, signalée comme telle
   à l'écran. Il doit être remplacé par les champs hébergés d'un prestataire
   (Stripe Elements, Adyen Drop-in…). Un site ne doit jamais manipuler lui-même un numéro
   de carte : c'est la condition de la conformité PCI DSS.
3. **Confirmation** — brancher l'envoi du courriel et l'écriture de la réservation côté serveur.

## La vidéo d'accueil

**Deux montages sont livrés**, tous deux à l'étalonnage du site. On bascule de l'un
à l'autre en changeant trois lignes dans `index.html` (le commentaire y explique comment).

| Montage | Fichiers | Poids | Contenu |
|---|---|---|---|
| **Images réelles** *(par défaut)* | `hero-guyane-1440.mp4` · `hero-guyane-960.mp4` | 3,4 / 1,4 Mo | 5 plans aériens tournés en Guyane : Petit-Saut au couchant, cocotiers des Salines, **lac de Rorota**, route des plages, estran de Rémire |
| **Travelling sur les photos** | `hero-photos-1440.mp4` · `hero-photos-960.mp4` | 2,3 / 0,9 Mo | 6 plans sur les photographies de la maison |

Les deux sont refabricables : `make_video_guyane.py` (images réelles, demande la source
dans `vid/drone.webm`) et `make_video.py` (photos). Il suffit de
`pip3 install --user imageio imageio-ffmpeg`.

Le chargement est volontairement prudent, pour que le site reste fluide :

- l'image d'affiche s'affiche immédiatement, la vidéo n'arrive qu'ensuite en fondu ;
- la version 960 px est servie sous 900 px de large ;
- **aucun octet de vidéo n'est chargé** en mode économie de données, sur connexion 2G/3G,
  ou si le système demande moins d'animations.

Le fond changeant en permanence, le titre du hero porte un halo sombre très diffus
(`text-shadow`) en plus du voile dégradé : c'est ce qui garantit sa lisibilité aussi
bien sur une canopée sombre que sur un ciel pâle.

> **⚠️ Sur les images réelles**
> Elles proviennent de « La Guyane au drone », de FL Production / Lionel Fauré
> (Wikimedia Commons, CC BY 3.0). Le recadrage écarte le logo du vidéaste, incrusté
> dans l'image d'origine. L'attribution figure dans `mentions.html`, comme l'exige
> la licence — mais un établissement qui publierait ces plans en son nom devrait
> s'entendre directement avec l'auteur, ou tourner les siens.

## Animations

Toutes en CSS et JavaScript natif, dans `js/main.js` :

- écran d'ouverture, vidéo d'accueil, effet Ken Burns sur les hero, parallaxe douce
- titres révélés ligne par ligne, volets qui se lèvent sur les images
- apparitions au défilement en cascade (`IntersectionObserver`)
- compteurs animés, barre de progression de lecture
- en-tête qui se condense, menu mobile plein écran
- carrousel d'avis, accordéon FAQ, visionneuse photo plein écran (clavier et clic)
- bandeau défilant
- filtres d'excursions

`prefers-reduced-motion` est respecté : les animations sont neutralisées pour les personnes
qui l'ont demandé dans leur système.

## Décliner ce site pour un autre client

Tout ce qui se répète ou se chiffre est centralisé dans **`config/site.json`** :
marque, coordonnées, palette, navigation, catalogue des chambres, tarifs, options.

```bash
python3 build.py
```

régénère alors l'en-tête, le menu mobile et le pied de page des 10 pages, la palette
CSS, les fiches de chambres, la grille tarifaire, les cartes de l'accueil et les
données du moteur de réservation (`js/reservation-data.js`).

Concrètement : **un prix ne s'écrit qu'à un seul endroit**. Avant, il fallait le
changer dans `chambres.html` *et* dans `js/reservation.js` — avec le risque que les
deux divergent.

`python3 build.py --verifie` contrôle sans rien écrire.

Le mode d'emploi complet est dans **[NOUVEAU-SITE.md](NOUVEAU-SITE.md)**.

## Structure

```
├── config/site.json               ← tout ce qui change d'un client à l'autre
├── build.py                       générateur : régénère à partir de la config
├── NOUVEAU-SITE.md                mode d'emploi du gabarit
├── index.html … mentions.html     10 pages
├── css/style.css                  feuille commune, commentée par sections
├── css/reservation.css            styles du moteur (chargés sur cette page seule)
├── js/main.js                     comportements communs, sans dépendance
├── js/reservation.js              calendrier, disponibilités, tarification
├── js/reservation-data.js         GÉNÉRÉ — catalogue et tarifs
├── assets/img/                    100 photos étalonnées et recadrées
├── assets/video/                  deux montages d'accueil, deux définitions chacun
├── make_video.py                  refabrique la vidéo « photos »
├── make_video_guyane.py           refabrique la vidéo « images réelles »
└── .claude/launch.json            config du serveur de prévisualisation
```

## Points à savoir

- Les formulaires sont **inertes** : ils affichent une confirmation mais n'envoient rien.
  Pour les rendre fonctionnels, brancher un service de formulaire ou une API sur
  le gestionnaire `form[data-demo]` de `js/main.js`, et voir plus haut pour la réservation.
- Les feuilles de style et scripts portent un `?v=8`. **Incrémentez-le** après chaque
  modification de `css/` ou `js/`, sinon les navigateurs continueront de servir
  l'ancienne version depuis leur cache.
- Les polices sont chargées depuis Google Fonts. Pour un site totalement autonome,
  les héberger localement.
- Coordonnées, tarifs et prestations sont fictifs et cohérents entre les pages :
  une modification doit être répercutée partout (le pied de page est répété dans chaque fichier).
- Les informations sanitaires (vaccination contre la fièvre jaune obligatoire, paludisme
  limité à l'intérieur, dengue sur le littoral) et climatiques (quatre saisons) sont exactes
  pour la Guyane, mais à revérifier avant publication : elles évoluent.
