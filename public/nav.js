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
  const addLink = (href, text, id) => {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = text;
    if (id) link.id = id;
    nav.appendChild(link);
  };
  addLink('/', 'Accueil');
  if (user) {
    if (user.role === 'super_admin') {
      addLink('/dashboard', 'Dashboard');
      addLink('/manage', 'Gérer');
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
    addLink('/login', 'Espace admin');
    addLink('/inscription', 'Inscription établissement');
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
