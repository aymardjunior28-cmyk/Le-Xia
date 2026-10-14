/**
 * ui.js — Animations et micro-interactions premium.
 * Module commun aux 3 pages (accueil, fiche produit, dashboard).
 *
 * - header  : effet `.scrolled` sur la topbar.
 * - reveal  : apparition en cascade au scroll (IntersectionObserver).
 * - count   : compteurs animés (count-up) sur les métriques.
 * - tilt    : effet 3D léger + spotlight au survol des cartes.
 * - ripple  : onde au clic sur les boutons d'action.
 *
 * Toutes les animations sont désactivées si l'utilisateur demande
 * `prefers-reduced-motion: reduce` (accessibilité).
 */
(function bootUI() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Applique l'effet d'en-tête au scroll. */
  function initHeaderScroll() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;

    const update = () => topbar.classList.toggle('scrolled', window.scrollY > 10);
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  let revealObserver;
  let countObserver;

  /** Observateur partagé : câble les éléments ajoutés après le chargement. */
  function wireDynamic(root) {
    if (!root || root.nodeType !== 1) return;
    const revealNodes = [];
    const countNodes = [];
    const tiltNodes = [];

    if (root.classList && root.classList.contains('reveal')) revealNodes.push(root);
    if (root.hasAttribute && root.hasAttribute('data-count')) countNodes.push(root);
    if (root.hasAttribute && root.hasAttribute('data-tilt')) tiltNodes.push(root);
    if (root.querySelectorAll) {
      revealNodes.push(...root.querySelectorAll('.reveal:not([data-reveal-wired])'));
      countNodes.push(...root.querySelectorAll('[data-count]:not([data-count-wired])'));
      tiltNodes.push(...root.querySelectorAll('[data-tilt]:not([data-tilt-wired])'));
    }

    revealNodes.forEach((el) => {
      if (el.dataset.revealWired) return;
      el.dataset.revealWired = '1';
      if (revealObserver) revealObserver.observe(el);
      else el.classList.add('in-view');
    });

    countNodes.forEach((el) => {
      if (el.dataset.countWired) return;
      el.dataset.countWired = '1';
      if (countObserver) countObserver.observe(el);
      else animateCount(el);
    });

    tiltNodes.forEach(wireTilt);
  }

  /** Fait apparaître les éléments `.reveal` en cascade. */
  function initReveal() {
    const nodes = Array.from(document.querySelectorAll('.reveal'));

    if (reduceMotion || !('IntersectionObserver' in window)) {
      nodes.forEach((node) => node.classList.add('in-view'));
      return;
    }

    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number(entry.target.dataset.revealIndex || 0);
          entry.target.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    nodes.forEach((node) => {
      node.dataset.revealWired = '1';
      revealObserver.observe(node);
    });
  }

  /** Anime un compteur de `0` vers la valeur cible. */
  function animateCount(el) {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;
    const suffix = el.dataset.suffix || '';

    const format = (value) =>
      Number.isInteger(target)
        ? Math.round(value).toLocaleString('fr-CM') + suffix
        : value.toFixed(1) + suffix;

    if (reduceMotion) {
      el.textContent = format(target);
      return;
    }

    const duration = 1100;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      el.textContent = format(target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  /** Déclenche le count-up des éléments `[data-count]` à l'affichage. */
  function initCounters() {
    const nodes = Array.from(document.querySelectorAll('[data-count]'));
    if (nodes.length === 0 && !('IntersectionObserver' in window)) return;

    if (!('IntersectionObserver' in window)) {
      nodes.forEach(animateCount);
      return;
    }

    countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          countObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );

    nodes.forEach((node) => {
      node.dataset.countWired = '1';
      countObserver.observe(node);
    });
  }

  /** Effet 3D (tilt) + spotlight qui suit le curseur sur une carte. */
  function wireTilt(card) {
    if (reduceMotion) return;
    if (!window.matchMedia('(hover: hover)').matches) return;
    if (card.dataset.tiltWired) return;
    card.dataset.tiltWired = '1';

    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;

      const rotateY = (px - 0.5) * 6; // ±3°
      const rotateX = (0.5 - py) * 6;

      card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
    });

    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  }

  /** Onde (ripple) au clic sur les boutons d'action. */
  function initRipple() {
    document.addEventListener('click', (event) => {
      const btn = event.target.closest('.primary-btn, .search-btn');
      if (!btn || reduceMotion) return;

      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = `${size}px`;
      span.style.left = `${event.clientX - rect.left - size / 2}px`;
      span.style.top = `${event.clientY - rect.top - size / 2}px`;
      btn.appendChild(span);
      span.addEventListener('animationend', () => span.remove());
    });
  }

  function init() {
    initHeaderScroll();
    initReveal();
    initCounters();
    initRipple();

    // Cartes présentes au chargement + tilt statique.
    document.querySelectorAll('[data-tilt]').forEach(wireTilt);

    // Les pages injectent le contenu après fetch : on câble ce qui arrive.
    if ('MutationObserver' in window) {
      const domObserver = new MutationObserver((records) => {
        records.forEach((record) => {
          record.addedNodes.forEach((node) => wireDynamic(node));
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