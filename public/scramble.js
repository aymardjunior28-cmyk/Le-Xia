/**
 * scramble.js — Animation de "décryptage" (effet hacker / terminal).
 *
 * Chaque élément de texte ciblé s'affiche d'abord sous forme de chiffres qui
 * défilent, puis chaque caractère se résout progressivement (gauche -> droite)
 * jusqu'à révéler le texte final lettre par lettre.
 *
 * - Ciblage automatique par sélecteurs (titres, badges, prix, descriptions,
 *   labels, en-têtes de tableau…) => appliqué à tout le texte notable.
 * - MutationObserver : recâble le contenu injecté après fetch (feed, fiche
 *   produit, dashboard), exactement comme ui.js.
 * - IntersectionObserver : l'animation se déclenche quand le texte entre
 *   dans le viewport (coordonné avec l'effet d'apparition au scroll).
 * - Respecte `prefers-reduced-motion: reduce` : affichage direct, sans animer.
 * - N'entre pas en conflit avec les compteurs `[data-count]` de ui.js.
 */
(function bootScramble() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Jeu de "brouillon" : uniquement des chiffres (identité hacker / décryptage).
  const GLYPHS = '0123456789';

  // Éléments de texte à animer (feuilles de texte uniquement).
  const TARGET_SELECTOR = [
    'h1',
    'h2',
    'h3',
    '.eyebrow',
    '.hero-offer small',
    '.hero-offer p',
    '.brand-name',
    'nav a',
    '.title',
    '.location',
    '.description',
    '.availability',
    '.badge',
    '.pricing',
    '.score-word',
    '.score-box',
    '.metric-label',
    '.panel h2',
    'th',
    '.primary-btn',
    '.search-btn',
    '.back-link',
  ].join(',');

  let observer = null;

  /** True si l'élément est une feuille de texte animable, pas un compteur. */
  function isEligible(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.hasAttribute('data-scrambled')) return false;
    if (el.closest('template')) return false;
    if (el.hasAttribute('data-count') || el.closest('[data-count]')) return false;
    if (el.children.length > 0) return false; // uniquement du texte direct
    return el.textContent.trim().length > 0;
  }

  /** Anime un élément : chiffres -> lettres, révélation gauche -> droite. */
  function scrambleElement(el) {
    const finalText = el.textContent;
    if (!finalText || !finalText.trim()) return;

    // Accessibilité : expose le texte réel aux lecteurs d'écran.
    el.setAttribute('aria-label', finalText);

    if (reduceMotion) {
      el.textContent = finalText;
      el.setAttribute('data-scrambled', '1');
      return;
    }

    const chars = Array.from(finalText);
    const len = chars.length;
    const duration = 520 + Math.min(800, len * 26); // ms, proportionnelle à la longueur
    const start = performance.now();

    // Seuil de révélation (fraction 0..1) par caractère : progression de gauche
    // à droite avec un léger chevauchement pour un effet de "résolution" continu.
    const revealAt = chars.map((_, i) => {
      const base = i / len;
      const jitter = (Math.random() - 0.5) * (2 / len);
      return Math.min(1.02, Math.max(0, base + jitter));
    });

    el.classList.add('is-scrambling');

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      let out = '';
      for (let i = 0; i < chars.length; i += 1) {
        const ch = chars[i];
        if (ch === ' ') {
          out += ' ';
          continue;
        }
        out += t >= revealAt[i] ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = finalText;
        el.classList.remove('is-scrambling');
        el.setAttribute('data-scrambled', '1');
      }
    }
    requestAnimationFrame(frame);
  }

  /** Câble un nœud et ses descendants correspondant aux sélecteurs cibles. */
  function wire(root) {
    if (!root || root.nodeType !== 1) return;
    const nodes = [];
    if (root.matches && root.matches(TARGET_SELECTOR)) nodes.push(root);
    if (root.querySelectorAll) nodes.push(...root.querySelectorAll(TARGET_SELECTOR));

    nodes.forEach((el) => {
      if (!isEligible(el)) return;
      // Marqué avant observation pour éviter tout re-câblage prématuré.
      el.setAttribute('data-scrambled', '1');
      if (observer) observer.observe(el);
      else scrambleElement(el);
    });
  }

  function init() {
    const staticNodes = Array.from(document.querySelectorAll(TARGET_SELECTOR));

    if (reduceMotion || !('IntersectionObserver' in window)) {
      staticNodes.forEach((el) => {
        if (!isEligible(el)) return;
        el.setAttribute('data-scrambled', '1');
        scrambleElement(el);
      });
    } else {
      // Déclenche le décryptage à l'entrée dans le viewport.
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            scrambleElement(entry.target);
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.25, rootMargin: '0px 0px -20px 0px' }
      );
      wire(document.body);
    }

    // Contenu injecté après fetch (cartes, dashboard, fiche produit).
    if ('MutationObserver' in window) {
      const domObserver = new MutationObserver((records) => {
        records.forEach((record) => {
          record.addedNodes.forEach((node) => wire(node));
        });
      });
      domObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
