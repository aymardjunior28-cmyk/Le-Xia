/**
 * nav.js — Adapte la barre de navigation selon la session (auth).
 * Appelle /api/auth/me puis reconstitue les liens : masque/affiche "Dashboard",
 * "Admins" (super-admin) et ajoute un bouton de déconnexion.
 */
(async function bootNav() {
  const nav = document.querySelector('.topbar nav');
  if (!nav) return;

  let user = null;
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) user = (await res.json()).user;
    else if (res.status !== 401) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.error('Impossible de charger la session :', err);
    user = null;
  }

  nav.replaceChildren();
  nav.classList.toggle('nav-authenticated', Boolean(user));
  const addLink = (href, text, id) => {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = text;
    if (id) link.id = id;
    nav.appendChild(link);
    return link;
  };
  addLink('/', 'Accueil');
  if (user) {
    if (user.role === 'super_admin') {
      addLink('/dashboard', 'Dashboard');
      const manageLink = addLink('/manage', 'Gérer');
      (async () => {
        try {
          const res = await fetch('/api/admin/notifications/unread-count');
          if (!res.ok) return;
          const data = await res.json();
          const count = Number(data.count) || 0;
          if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'nav-badge';
            badge.textContent = count > 99 ? '99+' : String(count);
            manageLink.appendChild(badge);
          }
        } catch (err) {
          /* ignore */
        }
      })();
    } else if (user.role === 'etablissement') {
      addLink('/etablissement-dashboard', 'Tableau de bord');
      addLink('/profil-etablissement', 'Mon profil');
    }
    const userLabel = document.createElement('span');
    userLabel.className = 'nav-user';
    userLabel.title = user.email || '';
    userLabel.textContent = user.nom || user.email || '';
    nav.appendChild(userLabel);
    const logoutLink = document.createElement('a');
    logoutLink.href = '#';
    logoutLink.id = 'nav-logout';
    logoutLink.className = 'nav-logout';
    logoutLink.textContent = 'Déconnexion';
    nav.appendChild(logoutLink);
  } else {
    addLink('/login', 'Inscription/Connexion');
  }

  const overflow = document.createElement('details');
  overflow.className = 'nav-overflow';
  const summary = document.createElement('summary');
  summary.textContent = 'Plus';
  summary.setAttribute('aria-label', 'Afficher les autres liens de navigation');
  const overflowMenu = document.createElement('div');
  overflowMenu.className = 'nav-overflow-menu';
  overflowMenu.setAttribute('aria-label', 'Autres liens de navigation');
  overflow.append(summary, overflowMenu);
  const primaryItems = Array.from(nav.children);
  nav.appendChild(overflow);

  function fitNavigation() {
    primaryItems.forEach((item) => nav.insertBefore(item, overflow));
    overflowMenu.replaceChildren();
    overflow.hidden = true;
    overflow.open = false;

    if (nav.clientWidth === 0) return;
    for (let index = primaryItems.length - 1; nav.scrollWidth > nav.clientWidth && index > 0; index -= 1) {
      overflowMenu.insertBefore(primaryItems[index], overflowMenu.firstChild);
      overflow.hidden = false;
    }
  }

  fitNavigation();
  window.addEventListener('resize', fitNavigation);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitNavigation);
  }

  const logout = document.getElementById('nav-logout');
  if (logout) {
    logout.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (err) {
        /* ignore */
      }
      window.location.href = '/login';
    });
  }
})();
