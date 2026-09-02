/* ==========================================================================
   MAISON ROROTA — comportements & animations
   Vanille, sans dépendance. Respecte prefers-reduced-motion.
   ========================================================================== */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------- utils */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  function throttleRAF(fn) {
    var busy = false;
    return function () {
      if (busy) return;
      busy = true;
      requestAnimationFrame(function () { fn(); busy = false; });
    };
  }

  /* ------------------------------------------------- 1. écran de chargement */
  var loader = $(".loader");
  if (loader) {
    var hide = function () {
      loader.classList.add("is-done");
      document.body.classList.remove("is-locked");
      setTimeout(function () { loader.setAttribute("hidden", ""); }, 1600);
    };
    // on laisse l'animation se jouer, sans bloquer si les images traînent
    window.addEventListener("load", function () { setTimeout(hide, reduced ? 0 : 700); });
    setTimeout(hide, 3200); // filet de sécurité
  }

  /* ------------------------------------------------ 1 bis. vidéo du hero
     L'affiche s'affiche tout de suite ; la vidéo se pose par-dessus dès
     qu'elle joue pour de bon.

     Deux défauts ont été corrigés ici, dans cet ordre.

     Le premier : le déclenchement était conditionné à
     navigator.connection.effectiveType, qui n'est pas une mesure mais une
     estimation faite par Chrome à partir des échanges récents. À la première
     visite il n'y en a pas et l'API répond « 3g » — elle le fait même contre
     un serveur local, en annonçant 650 ms d'aller-retour. La connexion était
     donc déclarée lente et la vidéo n'obtenait jamais de source. Au
     rechargement l'estimation passait à « 4g » et tout fonctionnait : un
     défaut invisible en développement, présent chez chaque visiteur.

     Le second, plus tenace : même la garde levée, la source était posée PAR
     LE SCRIPT — heroVideo.src = … — une fois le document chargé. WebKit
     traite ce cas différemment d'un élément déclaré dans la page : il accorde
     volontiers la lecture automatique au second et la refuse au premier. Sur
     Mac tout allait ; sur téléphone il fallait toucher l'écran. Les <source>
     sont désormais dans le HTML, avec leur attribut « media » — c'est le
     navigateur qui choisit la définition et qui démarre. Le script ne fait
     plus que deux choses : révéler la vidéo quand elle joue vraiment, et
     relancer si le premier essai a été refusé.

     Le mouvement réduit est passé dans « media » lui aussi. Reste ici
     l'économiseur de données, qu'aucune requête média n'exprime de façon
     portable : c'est un choix explicite de la personne, on le respecte en
     relâchant les sources. */
  var heroVideo = $(".hero__video");
  if (heroVideo) {
    var ATTENTE_MAX = 10000;          // au-delà, on rend la bande passante
    var abandonne = false, minuteur = null;

    var relacher = function () {
      while (heroVideo.firstChild) heroVideo.removeChild(heroVideo.firstChild);
      heroVideo.load();               // coupe le téléchargement en cours
    };

    /* On ne révèle la vidéo que lorsqu'elle joue POUR DE BON.

       La classe is-on fait deux choses : elle affiche la vidéo, et elle
       arrête le Ken Burns de l'affiche. Attachée à « canplay » — « assez de
       données pour démarrer », et non « démarré » — elle remplaçait, sur un
       téléphone qui refuse la lecture, une affiche qui dérive par une image
       figée : l'accueil devenait complètement immobile. Sur « playing », le
       fondu ne se déclenche que si le mouvement est là ; sinon l'affiche
       continue de dériver et personne ne voit de différence.

       Ce guet est posé AVANT tout le reste. Les sources étant maintenant
       déclarées, la lecture peut avoir commencé pendant l'analyse du
       document, donc avant l'exécution de ce script : l'événement serait
       passé sans personne pour l'entendre, et la vidéo resterait invisible
       en jouant derrière l'affiche. D'où aussi le rattrapage immédiat. */
    var montrer = function () {
      clearTimeout(minuteur);
      if (abandonne) return;
      heroVideo.classList.add("is-on");
    };
    heroVideo.addEventListener("playing", montrer, { once: true });
    if (!heroVideo.paused && heroVideo.readyState >= 3) montrer();

    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && conn.saveData) {
      relacher();
    } else {
      var jouer = function () {
        var p = heroVideo.play();
        if (p && p.catch) p.catch(function () {
          /* Refusée. Sur téléphone c'est un cas ordinaire, pas l'exception :
             économie d'énergie, onglet ouvert en arrière-plan. On ne montre
             rien, et l'on retentera. */
        });
      };

      /* Plusieurs occasions de partir plutôt qu'une seule : un refus au
         premier appel n'est pas définitif, l'élément devient éligible à
         mesure que les données arrivent. */
      ["loadedmetadata", "loadeddata", "canplay"].forEach(function (evt) {
        heroVideo.addEventListener(evt, jouer);
      });
      jouer();

      minuteur = setTimeout(function () {
        if (heroVideo.readyState >= 3) return;   // arrivée entre-temps
        abandonne = true;
        relacher();
      }, ATTENTE_MAX);

      var rattrape = function () {
        if (!abandonne && heroVideo.paused && heroVideo.querySelector("source")) jouer();
      };
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) rattrape();
      });
      ["pointerdown", "keydown", "scroll"].forEach(function (evt) {
        window.addEventListener(evt, rattrape, { once: true, passive: true });
      });
    }
  }

  /* ------------------------------------------------------------ 2. en-tête */
  var header = $(".header");
  if (header && !header.classList.contains("is-solid")) {
    var onScrollHeader = throttleRAF(function () {
      header.classList.toggle("is-stuck", window.scrollY > 60);
    });
    window.addEventListener("scroll", onScrollHeader, { passive: true });
    onScrollHeader();
  }

  /* ------------------------------------------------ 3. navigation mobile */
  var burger = $(".burger");
  var mnav = $(".mobile-nav");
  if (burger && mnav) {
    burger.addEventListener("click", function () {
      var open = mnav.classList.toggle("is-open");
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("is-locked", open);
    });
    $$("a", mnav).forEach(function (a) {
      a.addEventListener("click", function () {
        mnav.classList.remove("is-open");
        burger.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
        document.body.classList.remove("is-locked");
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mnav.classList.contains("is-open")) burger.click();
    });
  }

  /* ------------------------------------ 4. révélations au défilement (IO) */
  var revealTargets = $$("[data-reveal], [data-reveal-img], .line-mask");
  if (revealTargets.length) {
    if (!("IntersectionObserver" in window) || reduced) {
      revealTargets.forEach(function (el) { el.classList.add("is-in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
      revealTargets.forEach(function (el) { io.observe(el); });
    }
  }

  /* Décalage automatique des enfants d'un groupe [data-stagger] */
  $$("[data-stagger]").forEach(function (group) {
    var step = parseFloat(group.getAttribute("data-stagger")) || 0.09;
    $$("[data-reveal], [data-reveal-img]", group).forEach(function (el, i) {
      el.style.setProperty("--d", (i * step).toFixed(2) + "s");
    });
  });

  /* --------------------------------------------------------- 5. compteurs */
  var counters = $$("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        cio.unobserve(el);
        var target = parseFloat(el.getAttribute("data-count"));
        var suffix = el.getAttribute("data-suffix") || "";
        if (reduced) { el.textContent = target + suffix; return; }
        var dur = 1500, t0 = null;
        // Démarrage via rAF : le premier appel reçoit ainsi un horodatage valide.
        requestAnimationFrame(function step(ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(step);
        });
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* -------------------------------------------------------- 6. parallaxe */
  var parallax = $$("[data-parallax]");
  if (parallax.length && !reduced) {
    var onScrollPara = throttleRAF(function () {
      var vh = window.innerHeight;
      parallax.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.14;
        var offset = (r.top + r.height / 2 - vh / 2) * speed;
        el.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0)";
      });
    });
    window.addEventListener("scroll", onScrollPara, { passive: true });
    window.addEventListener("resize", onScrollPara);
    onScrollPara();
  }

  /* ------------------------------------------- 7. barre de progression */
  var bar = $(".progress");
  if (bar) {
    var onScrollBar = throttleRAF(function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
    });
    window.addEventListener("scroll", onScrollBar, { passive: true });
    onScrollBar();
  }

  /* ------------------------------------------------------- 8. accordéons */
  $$(".acc__btn").forEach(function (btn) {
    var panel = btn.nextElementSibling;
    if (!panel) return;
    btn.setAttribute("aria-expanded", "false");
    panel.style.height = "0px";
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      // referme les autres du même groupe
      var group = btn.closest(".acc");
      if (group && !open) {
        $$(".acc__btn", group).forEach(function (other) {
          if (other !== btn && other.getAttribute("aria-expanded") === "true") {
            other.setAttribute("aria-expanded", "false");
            other.nextElementSibling.style.height = "0px";
          }
        });
      }
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      panel.style.height = open ? "0px" : panel.scrollHeight + "px";
    });
  });
  window.addEventListener("resize", throttleRAF(function () {
    $$('.acc__btn[aria-expanded="true"]').forEach(function (btn) {
      btn.nextElementSibling.style.height = btn.nextElementSibling.scrollHeight + "px";
    });
  }));

  /* ------------------------------------------------- 9. avis (carrousel) */
  var quotesBox = $(".quotes");
  if (quotesBox) {
    var quotes = $$(".quote", quotesBox);
    var dotsBox = $(".quotes__dots");
    var idx = 0, timer = null;
    if (quotes.length > 1 && dotsBox) {
      quotes.forEach(function (_, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "Avis " + (i + 1));
        b.addEventListener("click", function () { go(i); restart(); });
        dotsBox.appendChild(b);
      });
      var dots = $$("button", dotsBox);
      var go = function (i) {
        idx = (i + quotes.length) % quotes.length;
        quotes.forEach(function (q, k) { q.classList.toggle("is-active", k === idx); });
        dots.forEach(function (d, k) { d.classList.toggle("is-active", k === idx); });
      };
      var restart = function () {
        if (timer) clearInterval(timer);
        if (!reduced) timer = setInterval(function () { go(idx + 1); }, 6500);
      };
      go(0); restart();
      quotesBox.addEventListener("mouseenter", function () { if (timer) clearInterval(timer); });
      quotesBox.addEventListener("mouseleave", restart);
    }
  }

  /* ------------------------------------------------ 10. visionneuse photo */
  var galItems = $$("[data-lightbox]");
  if (galItems.length) {
    var lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Galerie photo");
    lb.innerHTML =
      '<button class="lightbox__x" type="button" aria-label="Fermer">&#10005;</button>' +
      '<button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Photo précédente">&#8249;</button>' +
      '<button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Photo suivante">&#8250;</button>' +
      '<div class="lightbox__box"><img alt=""><p class="lightbox__cap"></p></div>';
    document.body.appendChild(lb);

    var lbImg = $("img", lb), lbCap = $(".lightbox__cap", lb), cur = 0, lastFocus = null;

    function show(i) {
      cur = (i + galItems.length) % galItems.length;
      var src = galItems[cur].getAttribute("data-lightbox");
      var cap = galItems[cur].getAttribute("data-caption") || "";
      lbImg.setAttribute("src", src);
      lbImg.setAttribute("alt", cap);
      lbCap.textContent = cap;
    }
    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      lb.classList.add("is-open");
      document.body.classList.add("is-locked");
      $(".lightbox__x", lb).focus();
    }
    function close() {
      lb.classList.remove("is-open");
      document.body.classList.remove("is-locked");
      if (lastFocus) lastFocus.focus();
    }

    galItems.forEach(function (el, i) {
      el.addEventListener("click", function (e) { e.preventDefault(); open(i); });
      // les vignettes qui ne sont pas des <button> doivent rester utilisables au clavier
      if (el.tagName !== "BUTTON") {
        el.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); }
        });
      }
    });
    $(".lightbox__x", lb).addEventListener("click", close);
    $(".lightbox__nav--prev", lb).addEventListener("click", function () { show(cur - 1); });
    $(".lightbox__nav--next", lb).addEventListener("click", function () { show(cur + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(cur - 1);
      if (e.key === "ArrowRight") show(cur + 1);
    });
  }

  /* ------------------------------------ 11. défilement doux vers un ancrage */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (!id || id === "#" || id.length < 2) return;
      var target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: top, behavior: reduced ? "auto" : "smooth" });
    });
  });

  /* --------------------------------------- 12. formulaires (démonstration) */
  $$("form[data-demo]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var box = $(".form-status", form);
      if (!box) return;
      var name = (form.querySelector('[name="prenom"]') || {}).value || "";
      box.textContent = (name ? name + ", v" : "V") +
        "otre demande a bien été enregistrée. Notre conciergerie vous répond sous 24 heures." +
        " (Démonstration : aucune donnée n’est réellement transmise.)";
      box.removeAttribute("hidden");
      form.reset();
      box.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    });
  });

  /* ------------------------ 13. dates minimales sur les champs d'arrivée */
  var today = new Date().toISOString().split("T")[0];
  $$('input[type="date"]').forEach(function (i) {
    if (!i.getAttribute("min")) i.setAttribute("min", today);
  });
  // le départ suit l'arrivée
  $$('[data-arrivee]').forEach(function (a) {
    var d = document.querySelector(a.getAttribute("data-arrivee"));
    if (!d) return;
    a.addEventListener("change", function () {
      d.setAttribute("min", a.value);
      if (d.value && d.value <= a.value) d.value = "";
    });
  });

  /* --------------------------------------- 14. année courante (pied de page) */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* --------------------------------- 15. filtres de la page « découverte » */
  var filterBar = $("[data-filters]");
  if (filterBar) {
    var cards = $$("[data-cat]");
    $$("button", filterBar).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var f = btn.getAttribute("data-filter");
        $$("button", filterBar).forEach(function (b) { b.classList.toggle("is-active", b === btn); });
        cards.forEach(function (c) {
          var show = f === "all" || c.getAttribute("data-cat").indexOf(f) > -1;
          c.style.display = show ? "" : "none";
        });
      });
    });
  }
})();
