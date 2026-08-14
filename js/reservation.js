/* ==========================================================================
   MAISON ROROTA — Moteur de réservation
   Calendrier, disponibilités, tarification et parcours de paiement.

   ⚠ Démonstration : les disponibilités sont simulées (de façon déterministe,
   pour rester cohérentes d'une visite à l'autre) et aucun paiement n'est
   traité. Voir LISEZMOI.md pour brancher un vrai moteur de réservation.
   ========================================================================== */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* ------------------------------------------------------------ catalogue
     Les données viennent de js/reservation-data.js, lui-même généré depuis
     config/site.json par build.py. Rien de tarifaire n'est écrit ici. */
  var D = window.ROROTA || {};
  var CATS = D.CATS || [];
  var CAT = {};
  CATS.forEach(function (c) { CAT[c.id] = c; });

  var OPTIONS = D.OPTIONS || [];
  var TAXE = D.TAXE || 0;                        // par adulte et par nuit
  var REMISE_PREPAIEMENT = D.REMISE_PREPAIEMENT || 0;
  var REMISES = D.REMISES || [];
  var SAISON = D.BASSE_SAISON || { moisDebut: 4, moisFin: 6 };

  /* ------------------------------------------------------------ état */
  var S = {
    etape: 1,
    arrivee: null,
    depart: null,
    adultes: 2,
    enfants: 0,
    cat: null,
    options: {},
    paiement: "flexible",
    curseurMois: null
  };

  /* ------------------------------------------------------- outils dates */
  function jour(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function ymd(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") +
           "-" + String(d.getDate()).padStart(2, "0");
  }
  function plus(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function nuits(a, b) { return Math.round((b - a) / 86400000); }
  var AUJ = jour(new Date());
  var MAX = plus(AUJ, 540);

  var MOIS = ["janvier", "février", "mars", "avril", "mai", "juin",
              "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  var JOURS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

  function joli(d) {
    return d.getDate() + " " + MOIS[d.getMonth()] + " " + d.getFullYear();
  }
  function euros(n) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " €";
  }

  /* La grande saison des pluies (avril → juin) est la basse saison. */
  function estBasseSaison(d) {
    var m = d.getMonth() + 1;                     // getMonth() est indexé à 0
    return m >= SAISON.moisDebut && m <= SAISON.moisFin;
  }

  /* ------------------------------------------- disponibilités simulées */
  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  /* Taux d'occupation d'une catégorie pour une nuit.
     Volontairement corrélé à la semaine : un hôtel se remplit par blocs, et des
     tirages indépendants nuit par nuit rendraient tout séjour long impossible. */
  var ORIGINE = new Date(2026, 0, 1);
  function occupation(catId, d) {
    var semaine = Math.floor((d - ORIGINE) / 604800000);
    var base = (hash(catId + "|s" + semaine) % 1000) / 1000;          // stable sur la semaine
    var jour = ((hash(catId + "|j" + ymd(d)) % 1000) / 1000 - 0.5) * 0.12;
    var saison = estBasseSaison(d) ? 0.40 : 0.60;
    var weekend = (d.getDay() === 5 || d.getDay() === 6) ? 0.08 : 0;
    return Math.min(0.99, Math.max(0.12, saison + base * 0.32 + jour + weekend));
  }
  /* Nombre de clés restantes pour une catégorie, une nuit donnée. */
  function stock(catId, d) {
    var c = CAT[catId];
    var occ = occupation(catId, d);
    if (c.stock === 1) return occ > 0.88 ? 0 : 1;                    // unités signature
    return Math.max(0, c.stock - Math.round(c.stock * occ));
  }
  /* Disponible sur toute la période = min sur chaque nuit. */
  function dispoPeriode(catId, a, b) {
    var n = nuits(a, b), min = 99;
    for (var i = 0; i < n; i++) min = Math.min(min, stock(catId, plus(a, i)));
    return min;
  }
  /* Total de clés libres pour une nuit, toutes catégories. */
  function libresNuit(d) {
    return CATS.reduce(function (t, c) { return t + stock(c.id, d); }, 0);
  }

  /* ------------------------------------------------------- tarification */
  function prixNuit(cat, d) { return estBasseSaison(d) ? cat.basse : cat.haute; }

  function sousTotalChambre() {
    if (!S.cat || !S.arrivee || !S.depart) return 0;
    var c = CAT[S.cat], n = nuits(S.arrivee, S.depart), t = 0;
    for (var i = 0; i < n; i++) t += prixNuit(c, plus(S.arrivee, i));
    return t;
  }
  function tauxRemise() {
    var n = nbNuits(), t = 0;
    REMISES.forEach(function (r) { if (n >= r.nuits) t = Math.max(t, r.taux); });
    return t;
  }
  function nbNuits() {
    return (S.arrivee && S.depart) ? nuits(S.arrivee, S.depart) : 0;
  }
  function prixOption(o) {
    var n = nbNuits(), pers = S.adultes + S.enfants;
    switch (o.unite) {
      case "parJourParPersonne": return o.prix * pers * n;
      case "parNuit":            return o.prix * n;
      case "parPersonne":        return o.prix * pers;
      default:                   return o.prix;
    }
  }
  function totalOptions() {
    return OPTIONS.reduce(function (t, o) { return S.options[o.id] ? t + prixOption(o) : t; }, 0);
  }
  function taxeSejour() { return TAXE * S.adultes * nbNuits(); }

  function facture() {
    var chambre = sousTotalChambre();
    var remise = Math.round(chambre * tauxRemise());
    var opts = totalOptions();
    var taxe = taxeSejour();
    var avantPaiement = chambre - remise + opts;
    var remisePre = S.paiement === "prepaye" ? Math.round(avantPaiement * REMISE_PREPAIEMENT) : 0;
    return {
      chambre: chambre, remise: remise, options: opts, taxe: taxe,
      remisePre: remisePre,
      total: avantPaiement - remisePre + taxe
    };
  }

  /* ============================================================ CALENDRIER */
  var calMonths = $("#cal-months");
  var calPrev = $("#cal-prev"), calNext = $("#cal-next");

  function moisDebut() {
    return new Date(S.curseurMois.getFullYear(), S.curseurMois.getMonth(), 1);
  }

  function dessineCalendrier() {
    if (!calMonths) return;
    calMonths.innerHTML = "";
    for (var m = 0; m < 2; m++) {
      var d0 = new Date(S.curseurMois.getFullYear(), S.curseurMois.getMonth() + m, 1);
      calMonths.appendChild(dessineMois(d0));
    }
    var limiteBasse = new Date(AUJ.getFullYear(), AUJ.getMonth(), 1);
    calPrev.disabled = moisDebut() <= limiteBasse;
    calNext.disabled = new Date(S.curseurMois.getFullYear(), S.curseurMois.getMonth() + 2, 1) > MAX;
  }

  function dessineMois(d0) {
    var wrap = document.createElement("div");
    wrap.className = "cal__month";

    var titre = document.createElement("p");
    titre.className = "cal__name";
    titre.textContent = MOIS[d0.getMonth()] + " " + d0.getFullYear();
    wrap.appendChild(titre);

    var dows = document.createElement("div");
    dows.className = "cal__dows";
    dows.setAttribute("aria-hidden", "true");
    JOURS.forEach(function (j) {
      var s = document.createElement("span"); s.textContent = j; dows.appendChild(s);
    });
    wrap.appendChild(dows);

    var grille = document.createElement("div");
    grille.className = "cal__grid";
    grille.setAttribute("role", "grid");

    var premier = new Date(d0.getFullYear(), d0.getMonth(), 1);
    var decalage = (premier.getDay() + 6) % 7;          // semaine commençant lundi
    var nbJours = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate();

    for (var p = 0; p < decalage; p++) {
      var vide = document.createElement("button");
      vide.className = "day day--pad";
      vide.type = "button";
      vide.tabIndex = -1;
      vide.setAttribute("aria-hidden", "true");
      grille.appendChild(vide);
    }

    for (var i = 1; i <= nbJours; i++) {
      grille.appendChild(dessineJour(new Date(d0.getFullYear(), d0.getMonth(), i)));
    }
    wrap.appendChild(grille);
    return wrap;
  }

  function dessineJour(d) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "day";
    b.textContent = d.getDate();
    b.dataset.d = ymd(d);

    var passe = d < AUJ || d > MAX;
    var libres = passe ? 0 : libresNuit(d);
    var complet = !passe && libres === 0;

    if (passe || complet) {
      b.disabled = true;
      if (complet) { b.classList.add("day--full"); b.title = "Complet"; }
    } else {
      if (libres <= 3) { b.classList.add("day--tight"); b.title = libres + " clé(s) restante(s)"; }
      else b.title = libres + " clés disponibles";
    }

    // état de sélection
    if (S.arrivee && d.getTime() === S.arrivee.getTime()) b.classList.add("day--edge", "day--start");
    if (S.depart && d.getTime() === S.depart.getTime()) b.classList.add("day--edge", "day--end");
    if (S.arrivee && S.depart && d > S.arrivee && d < S.depart) b.classList.add("day--range");

    b.addEventListener("click", function () { choisitJour(d); });
    return b;
  }

  function nuitCompleteDans(a, b) {
    var n = nuits(a, b);
    for (var i = 0; i < n; i++) if (libresNuit(plus(a, i)) === 0) return true;
    return false;
  }

  function choisitJour(d) {
    if (!S.arrivee || S.depart || d <= S.arrivee) {
      S.arrivee = d; S.depart = null;
    } else {
      if (nuitCompleteDans(S.arrivee, d)) {
        alerte("Une nuit de cette période est complète. Choisissez d'autres dates.");
        S.arrivee = d; S.depart = null;
      } else {
        S.depart = d;
      }
    }
    S.cat = null;                       // la sélection de chambre redevient caduque
    dessineCalendrier();
    majDates();
    majRecap();
    majBoutons();
  }

  function alerte(msg) {
    var e = $("#cal-err");
    if (!e) return;
    e.textContent = msg;
    e.removeAttribute("hidden");
    clearTimeout(alerte._t);
    alerte._t = setTimeout(function () { e.setAttribute("hidden", ""); }, 5000);
  }

  function majDates() {
    var el = $("#dates-resume");
    if (!el) return;
    if (S.arrivee && S.depart) {
      var n = nbNuits();
      el.innerHTML = "<strong>" + joli(S.arrivee) + "</strong> → <strong>" + joli(S.depart) +
        "</strong> · " + n + " nuit" + (n > 1 ? "s" : "") +
        " · " + (estBasseSaison(S.arrivee) ? "basse saison" : "haute saison");
    } else if (S.arrivee) {
      el.innerHTML = "Arrivée le <strong>" + joli(S.arrivee) + "</strong> — choisissez la date de départ.";
    } else {
      el.textContent = "Choisissez votre date d'arrivée dans le calendrier.";
    }
  }

  /* ========================================================= CHOIX CHAMBRE */
  function dessineChambres() {
    var box = $("#liste-chambres");
    if (!box || !S.arrivee || !S.depart) return;
    box.innerHTML = "";
    var n = nbNuits(), pers = S.adultes + S.enfants, auMoinsUne = false;

    CATS.forEach(function (c) {
      var restant = dispoPeriode(c.id, S.arrivee, S.depart);
      var tropDeMonde = pers > c.capacite;
      var indispo = restant === 0 || tropDeMonde;
      if (!indispo) auMoinsUne = true;

      var total = 0;
      for (var i = 0; i < n; i++) total += prixNuit(c, plus(S.arrivee, i));

      var el = document.createElement("div");
      el.className = "roomopt" + (indispo ? " is-full" : "") + (S.cat === c.id ? " is-picked" : "");
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", indispo ? "-1" : "0");
      el.setAttribute("aria-pressed", S.cat === c.id ? "true" : "false");
      el.innerHTML =
        '<div class="ph roomopt__media ratio-4-3"><img src="assets/img/' + c.img +
          '.jpg" alt="' + c.nom + '" loading="lazy"></div>' +
        '<div>' +
          '<p class="roomopt__name">' + c.nom + '</p>' +
          '<p class="roomopt__meta">' + c.surface + ' m² · jusqu\'à ' + c.capacite + ' personnes</p>' +
          '<p class="roomopt__desc">' + c.desc + '</p>' +
          (tropDeMonde
            ? '<p class="roomopt__stock">Capacité insuffisante pour ' + pers + ' personnes</p>'
            : restant === 0
              ? '<p class="roomopt__stock">Complet sur ces dates</p>'
              : restant <= 2
                ? '<p class="roomopt__stock">Plus que ' + restant + ' ' +
                  (c.stock === 1 ? 'exemplaire' : 'chambre' + (restant > 1 ? 's' : '')) + '</p>'
                : '') +
        '</div>' +
        '<div class="roomopt__price">' +
          '<span class="roomopt__amount">' + euros(total) + '</span>' +
          '<span class="roomopt__unit">' + n + ' nuit' + (n > 1 ? 's' : '') + ' · soit ' +
            euros(Math.round(total / n)) + '/nuit</span>' +
        '</div>';

      if (!indispo) {
        var pick = function () {
          S.cat = c.id;
          dessineChambres();
          majRecap();
          majBoutons();
        };
        el.addEventListener("click", pick);
        el.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
        });
      }
      box.appendChild(el);
    });

    var vide = $("#aucune-chambre");
    if (vide) vide.hidden = auMoinsUne;
  }

  /* ============================================================== OPTIONS */
  function dessineOptions() {
    var box = $("#liste-options");
    if (!box) return;
    box.innerHTML = "";
    OPTIONS.forEach(function (o) {
      var actif = !!S.options[o.id];
      var lab = document.createElement("label");
      lab.className = "opt" + (actif ? " is-on" : "");
      var unite = o.unite === "parJourParPersonne" ? "par personne et par jour"
                : o.unite === "parNuit" ? "par nuit"
                : o.unite === "parPersonne" ? "par personne" : "forfait";
      lab.innerHTML =
        '<input type="checkbox"' + (actif ? " checked" : "") + '>' +
        '<span class="opt__body">' +
          '<span class="opt__name">' + o.nom + '</span>' +
          '<span class="opt__desc">' + o.desc + ' — ' + euros(o.prix) + ' ' + unite + '</span>' +
        '</span>' +
        '<span class="opt__price">' + (actif ? euros(prixOption(o)) : "+ " + euros(o.prix)) + '</span>';
      lab.querySelector("input").addEventListener("change", function (e) {
        S.options[o.id] = e.target.checked;
        if (e.target.checked && o.exclut) S.options[o.exclut] = false;
        dessineOptions();
        majRecap();
      });
      box.appendChild(lab);
    });
  }

  /* ========================================================= RÉCAPITULATIF */
  function majRecap() {
    var box = $("#recap-corps");
    if (!box) return;
    var f = facture();

    if (!S.arrivee || !S.depart) {
      box.innerHTML = '<p class="summary__empty">Sélectionnez vos dates pour voir le détail du prix.</p>';
      majTotal(0);
      return;
    }

    var n = nbNuits();
    var html = "";
    html += ligne("Séjour", n + " nuit" + (n > 1 ? "s" : ""));
    html += ligne("Voyageurs", S.adultes + " adulte" + (S.adultes > 1 ? "s" : "") +
                  (S.enfants ? " · " + S.enfants + " enfant" + (S.enfants > 1 ? "s" : "") : ""));
    html += '<div class="summary__sep"></div>';

    if (S.cat) {
      html += ligne(CAT[S.cat].nom, euros(f.chambre));
      if (f.remise) html += ligne("Remise séjour long (−" + Math.round(tauxRemise() * 100) + " %)", "− " + euros(f.remise));
    } else {
      html += '<p class="summary__empty">Choisissez une chambre.</p>';
    }

    OPTIONS.forEach(function (o) {
      if (S.options[o.id]) html += ligne(o.nom, euros(prixOption(o)));
    });

    if (f.remisePre) html += ligne("Tarif prépayé (−15 %)", "− " + euros(f.remisePre));
    html += ligne("Taxe de séjour", euros(f.taxe));
    html += '<p class="summary__line summary__line--sub"><span>' + TAXE.toFixed(2).replace(".", ",") +
            ' € par adulte et par nuit</span></p>';

    box.innerHTML = html;
    majTotal(f.total);
  }
  function ligne(a, b) {
    return '<p class="summary__line"><span>' + a + '</span><span>' + (b || "") + '</span></p>';
  }
  function majTotal(v) {
    var t = $("#recap-total");
    if (t) t.textContent = euros(v);
  }

  /* ================================================================ ÉTAPES */
  var NB_ETAPES = 4;

  function vaEtape(n) {
    if (n > S.etape && !peutAvancer()) return;
    S.etape = Math.max(1, Math.min(NB_ETAPES + 1, n));
    $$(".panel-step").forEach(function (p) {
      p.classList.toggle("is-active", Number(p.dataset.step) === S.etape);
    });
    $$(".step").forEach(function (s) {
      var i = Number(s.dataset.goto);
      s.classList.toggle("is-current", i === S.etape);
      s.classList.toggle("is-done", i < S.etape);
    });
    if (S.etape === 2) dessineChambres();
    if (S.etape === 3) dessineOptions();
    if (S.etape === 4) majPaiement();
    majBoutons();
    majRecap();
    var top = $(".book").getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: top, behavior: reduced ? "auto" : "smooth" });
  }

  function peutAvancer() {
    if (S.etape === 1) return !!(S.arrivee && S.depart);
    if (S.etape === 2) return !!S.cat;
    if (S.etape === 3) return champsContactOk();
    return true;
  }
  function champsContactOk() {
    var f = $("#form-contact");
    return f ? f.checkValidity() : true;
  }

  function majBoutons() {
    $$("[data-suivant]").forEach(function (b) { b.disabled = !peutAvancer(); });
    var cta = $("#recap-cta");
    if (cta) {
      cta.disabled = !peutAvancer();
      cta.textContent = S.etape >= 4 ? "Confirmer et payer"
                      : S.etape === 3 ? "Aller au paiement"
                      : S.etape === 2 ? "Continuer" : "Choisir une chambre";
    }
  }

  /* ============================================================= PAIEMENT */
  function majPaiement() {
    var f = facture();
    var el = $("#pay-total");
    if (el) el.textContent = euros(f.total);
    $$("[name=pay-mode]").forEach(function (r) {
      r.closest(".pay-opt").classList.toggle("is-on", r.checked);
    });
    var eco = $("#pay-eco");
    if (eco) {
      var avant = f.chambre - f.remise + f.options;
      eco.textContent = "− " + euros(Math.round(avant * REMISE_PREPAIEMENT));
    }
  }

  function reference() {
    var a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "";
    for (var i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)];
    return "RRT-" + s;
  }

  function confirme() {
    var form = $("#form-paiement");
    if (form && !form.checkValidity()) { form.reportValidity(); return; }

    var f = facture();
    var ref = reference();
    $("#done-ref").textContent = ref;
    $("#done-recap").innerHTML =
      ligneRecap("Référence", ref) +
      ligneRecap("Chambre", CAT[S.cat].nom) +
      ligneRecap("Arrivée", joli(S.arrivee) + " à partir de 15 h") +
      ligneRecap("Départ", joli(S.depart) + " avant 12 h") +
      ligneRecap("Voyageurs", S.adultes + " adulte" + (S.adultes > 1 ? "s" : "") +
                 (S.enfants ? " et " + S.enfants + " enfant" + (S.enfants > 1 ? "s" : "") : "")) +
      ligneRecap("Formule", S.paiement === "prepaye"
        ? "Prépayé, non remboursable" : "Flexible, annulable sans frais") +
      ligneRecap("Total", euros(f.total));

    S.etape = 5;
    $$(".panel-step").forEach(function (p) {
      p.classList.toggle("is-active", Number(p.dataset.step) === 5);
    });
    $$(".step").forEach(function (s) { s.classList.add("is-done"); s.classList.remove("is-current"); });
    var col = $("#col-recap");
    if (col) col.hidden = true;
    window.scrollTo({ top: $(".book").offsetTop - 90, behavior: reduced ? "auto" : "smooth" });
  }
  function ligneRecap(a, b) {
    return '<p class="summary__line" style="border-bottom:1px solid var(--ivory-300)">' +
           '<span>' + a + '</span><strong>' + b + '</strong></p>';
  }

  /* ================================================================ INIT */
  function init() {
    if (!$(".book")) return;

    S.curseurMois = new Date(AUJ.getFullYear(), AUJ.getMonth(), 1);

    // dates éventuellement transmises par la barre de l'accueil
    var q = new URLSearchParams(location.search);
    if (q.get("arrivee")) {
      var a = new Date(q.get("arrivee") + "T00:00:00");
      if (!isNaN(a) && a >= AUJ) {
        S.arrivee = jour(a);
        S.curseurMois = new Date(a.getFullYear(), a.getMonth(), 1);
      }
    }
    if (q.get("depart") && S.arrivee) {
      var b = new Date(q.get("depart") + "T00:00:00");
      if (!isNaN(b) && b > S.arrivee && !nuitCompleteDans(S.arrivee, jour(b))) S.depart = jour(b);
    }
    if (q.get("cat") && CAT[q.get("cat")]) S.cat = q.get("cat");
    if (q.get("adultes")) S.adultes = Math.min(6, Math.max(1, parseInt(q.get("adultes"), 10) || 2));

    $("#sel-adultes").value = S.adultes;
    $("#sel-enfants").value = S.enfants;

    calPrev.addEventListener("click", function () {
      S.curseurMois = new Date(S.curseurMois.getFullYear(), S.curseurMois.getMonth() - 1, 1);
      dessineCalendrier();
    });
    calNext.addEventListener("click", function () {
      S.curseurMois = new Date(S.curseurMois.getFullYear(), S.curseurMois.getMonth() + 1, 1);
      dessineCalendrier();
    });

    $("#sel-adultes").addEventListener("change", function (e) {
      S.adultes = parseInt(e.target.value, 10); S.cat = null; majRecap(); majBoutons();
    });
    $("#sel-enfants").addEventListener("change", function (e) {
      S.enfants = parseInt(e.target.value, 10); S.cat = null; majRecap(); majBoutons();
    });

    $$("[data-suivant]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (S.etape === 4) confirme(); else vaEtape(S.etape + 1);
      });
    });
    $$("[data-precedent]").forEach(function (b) {
      b.addEventListener("click", function () { vaEtape(S.etape - 1); });
    });
    $$(".step").forEach(function (s) {
      s.addEventListener("click", function () {
        var i = Number(s.dataset.goto);
        if (i < S.etape) vaEtape(i);
      });
    });
    var cta = $("#recap-cta");
    if (cta) cta.addEventListener("click", function () {
      if (S.etape === 4) confirme(); else vaEtape(S.etape + 1);
    });

    $$("[name=pay-mode]").forEach(function (r) {
      r.addEventListener("change", function () {
        S.paiement = r.value; majPaiement(); majRecap();
      });
    });

    var fc = $("#form-contact");
    if (fc) fc.addEventListener("input", majBoutons);

    // mise en forme du numéro de carte (démonstration)
    var cn = $("#c-num");
    if (cn) cn.addEventListener("input", function () {
      var v = cn.value.replace(/\D/g, "").slice(0, 16);
      cn.value = v.replace(/(.{4})/g, "$1 ").trim();
    });
    var ce = $("#c-exp");
    if (ce) ce.addEventListener("input", function () {
      var v = ce.value.replace(/\D/g, "").slice(0, 4);
      ce.value = v.length > 2 ? v.slice(0, 2) + "/" + v.slice(2) : v;
    });

    dessineCalendrier();
    majDates();
    majRecap();
    majBoutons();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
