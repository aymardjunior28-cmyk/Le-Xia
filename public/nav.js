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
  } catch (err) {
    user = null;
  }

  let html = '<a href="/">Accueil</a>';
  if (user) {
    html += '<a href="/dashboard">Dashboard</a>';
    if (user.role === 'super_admin') {
      html += '<a href="/manage">Gérer</a>';
      html += '<a href="/admins">Admins</a>';
    }
    html += `<span class="nav-user" title="${user.email}">${user.nom || user.email}</span>`;
    html += '<a href="#" id="nav-logout" class="nav-logout">Déconnexion</a>';
  } else {
    html += '<a href="/login">Espace admin</a>';
  }
  nav.innerHTML = html;

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
