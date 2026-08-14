/* ==========================================================================
   Données du moteur de réservation — FICHIER GÉNÉRÉ
   Ne pas modifier à la main : éditez config/site.json puis lancez build.py
   ========================================================================== */
window.ROROTA = {
  CATS: [
    { id: "wapa", nom: "Chambre Deluxe Wapa", surface: 42, capacite: 2, stock: 8,
      img: "room-wapa", basse: 390, haute: 470,
      desc: "Plain-pied sur le jardin, terrasse privative et hamac." },
    { id: "atlantique", nom: "Chambre Prestige Atlantique", surface: 55, capacite: 2, stock: 6,
      img: "room-atlantique", basse: 540, haute: 650,
      desc: "À l'étage, galerie couverte de 16 m² face à l'océan." },
    { id: "awara", nom: "Suite Junior Awara", surface: 78, capacite: 3, stock: 4,
      img: "suite-awara", basse: 820, haute: 980,
      desc: "Salon séparé, terrasse d'angle et baignoire extérieure en pierre." },
    { id: "canopee", nom: "Suite Canopée", surface: 120, capacite: 4, stock: 1,
      img: "suite-canopee", basse: 1450, haute: 1690,
      desc: "Tout le dernier niveau, toit-terrasse de 45 m² et bain à remous." },
    { id: "maripa", nom: "Villa Maripa", surface: 140, capacite: 4, stock: 1,
      img: "villa-maripa", basse: 1850, haute: 2200,
      desc: "Villa indépendante, deux chambres et bassin de nage privé." }
  ],
  OPTIONS: [
    { id: "demi", nom: "Demi-pension", desc: "Petit-déjeuner et dîner à La Table, hors boissons.",
      prix: 75, unite: "parJourParPersonne", exclut: "pension" },
    { id: "pension", nom: "Pension complète", desc: "Les trois repas, hors boissons.",
      prix: 130, unite: "parJourParPersonne", exclut: "demi" },
    { id: "transfert", nom: "Transfert aéroport aller-retour", desc: "Accueil à la sortie des bagages, véhicule privé.",
      prix: 130, unite: "forfait" },
    { id: "lit", nom: "Lit d'appoint", desc: "À partir de 3 ans. Lit bébé gratuit sur demande.",
      prix: 95, unite: "parNuit" },
    { id: "spa", nom: "Parcours Wassaï pour deux", desc: "Hammam, gommage, massage 60 min et déjeuner au bassin.",
      prix: 590, unite: "forfait" },
    { id: "salut", nom: "Journée aux Îles du Salut", desc: "Catamaran depuis Kourou, déjeuner sur l'île Royale.",
      prix: 195, unite: "parPersonne" }
  ],
  TAXE: 3.3,
  REMISE_PREPAIEMENT: 0.15,
  REMISES: [{ nuits: 10, taux: 0.15 }, { nuits: 5, taux: 0.1 }],
  BASSE_SAISON: { moisDebut: 4, moisFin: 6 }
};
