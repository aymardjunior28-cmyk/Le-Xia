/**
 * admins.js — Gestion des comptes administrateurs (réservé au super-admin).
 * Crée, active/désactive et supprime des comptes via l'API /api/admin/users.
 */
(function () {
  const form = document.getElementById('create-admin-form');
  const nomInput = document.getElementById('new-nom');
  const emailInput = document.getElementById('new-email');
  const passwordInput = document.getElementById('new-password');
  const errorBox = document.getElementById('create-error');
  const successBox = document.getElementById('create-success');
  const listContainer = document.getElementById('admin-list');

  async function ensureSuperAdmin() {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        window.location.href = '/login';
        return false;
      }
      const { user } = await res.json();
      if (user.role !== 'super_admin') {
        window.location.href = '/dashboard';
        return false;
      }
      return true;
    } catch (err) {
      window.location.href = '/login';
      return false;
    }
  }

  function roleBadge(role) {
    return role === 'super_admin'
      ? '<span class="role-badge role-super">Super-admin</span>'
      : '<span class="role-badge">Admin</span>';
  }

  async function loadUsers() {
    const res = await fetch('/api/admin/users');
    if (!res.ok) {
      listContainer.innerHTML = '<p class="empty-state">Impossible de charger les comptes.</p>';
      return;
    }
    const list = await res.json();
    if (list.length === 0) {
      listContainer.innerHTML = '<p class="empty-state">Aucun compte.</p>';
      return;
    }

    const rows = list
      .map((u) => {
        const status = u.actif
          ? '<span class="status-active">Actif</span>'
          : '<span class="status-inactive">Désactivé</span>';
        const actions = u.is_you
          ? '<span class="muted">(vous)</span>'
          : `<button class="btn-small" data-action="toggle" data-id="${u.id}" data-actif="${u.actif}">
               ${u.actif ? 'Désactiver' : 'Activer'}
             </button>
             <button class="btn-small btn-danger" data-action="delete" data-id="${u.id}">Supprimer</button>`;
        return `<tr>
          <td>${u.nom}</td>
          <td>${u.email}</td>
          <td>${roleBadge(u.role)}</td>
          <td>${status}</td>
          <td class="admin-actions">${actions}</td>
        </tr>`;
      })
      .join('');

    listContainer.innerHTML = `<table>
      <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  listContainer.addEventListener('click', async (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id, actif } = btn.dataset;

    if (action === 'toggle') {
      await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: actif !== 'true' }),
      });
      loadUsers();
    } else if (action === 'delete') {
      if (confirm('Supprimer définitivement ce compte ?')) {
        await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
        loadUsers();
      }
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.hidden = true;
    successBox.hidden = true;

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: nomInput.value,
        email: emailInput.value,
        password: passwordInput.value,
      }),
    });
    const data = await res.json();

    if (res.ok) {
      successBox.textContent = `Compte « ${data.nom} » créé avec succès.`;
      successBox.hidden = false;
      form.reset();
      loadUsers();
    } else {
      errorBox.textContent = data.error || 'Création impossible.';
      errorBox.hidden = false;
    }
  });

  (async function init() {
    if (await ensureSuperAdmin()) {
      loadUsers();
    }
  })();
})();
