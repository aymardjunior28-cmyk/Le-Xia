/**
 * manage.js — Interface d'administration des établissements (super-admin).
 * CRUD complet : lister, créer, modifier, supprimer (établissement + produits).
 */
(function () {
  const FCFA = (value) => `${Number(value || 0).toLocaleString('fr-CM')} FCFA`;
  const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char]);
  const safeImageUrl = (value) => {
    const url = String(value || '');
    return url.startsWith('/') && !url.startsWith('//') || /^https?:\/\//i.test(url)
      ? url
      : '';
  };

  const els = {
    list: document.getElementById('establishments-list'),
    count: document.getElementById('est-count'),
    form: document.getElementById('establishment-form'),
    formPanel: document.getElementById('establishment-form-panel'),
    formTitle: document.getElementById('form-title'),
    error: document.getElementById('manage-error'),
    formError: document.getElementById('form-error'),
    newBtn: document.getElementById('new-establishment-btn'),
    cancelBtn: document.getElementById('cancel-form-btn'),
    productsList: document.getElementById('products-list'),
    addProductBtn: document.getElementById('add-product-btn'),
    id: document.getElementById('est-id'),
    nom: document.getElementById('est-nom'),
    type: document.getElementById('est-type'),
    categorie: document.getElementById('est-categorie'),
    quartier: document.getElementById('est-quartier'),
    adresse: document.getElementById('est-adresse'),
    whatsapp: document.getElementById('est-whatsapp'),
    note: document.getElementById('est-note'),
    noteProvisoire: document.getElementById('est-note-provisoire'),
    pointsForm: document.getElementById('points-recharge-form'),
    pointsEstablishment: document.getElementById('points-establishment'),
    pointsAmount: document.getElementById('points-amount'),
    pointsBalances: document.getElementById('points-balances'),
    pointsError: document.getElementById('points-error'),
    pointsSuccess: document.getElementById('points-success'),
    photo: document.getElementById('est-photo'),
    photoPreview: document.getElementById('est-photo-preview'),
    description: document.getElementById('est-description'),
    visibilites: document.getElementById('est-visibilites'),
    notifList: document.getElementById('notifications-list'),
    notifBadge: document.getElementById('notif-badge'),
    notifEmpty: document.getElementById('notifications-empty'),
    notifError: document.getElementById('notifications-error'),
    notifMarkAll: document.getElementById('notif-mark-all'),
    notifRefresh: document.getElementById('notif-refresh'),
  };

  let establishments = [];
  // URL de la photo principale (existante ou fraîchement uploadée).
  let establishmentPhotoUrl = '';

  function showError(message, box) {
    const target = box || els.error;
    target.textContent = message || '';
    target.hidden = !message;
  }

  async function ensureAccess() {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        window.location.href = '/login';
        return false;
      }
      const data = await res.json();
      if (data.user.role !== 'super_admin') {
        window.location.href = '/dashboard';
        return false;
      }
      return true;
    } catch (err) {
      window.location.href = '/login';
      return false;
    }
  }

  async function load() {
    try {
      const items = [];
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const res = await fetch(`/api/establishments?limit=100&offset=${offset}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const page = await res.json();
        if (!Array.isArray(page.items)) throw new Error('Réponse catalogue invalide');
        items.push(...page.items);
        offset += page.items.length;
        hasMore = Boolean(page.hasMore) && page.items.length > 0;
      }
      establishments = items;
      els.count.textContent = String(establishments.length);
      render();
      await loadPointBalances();
    } catch (err) {
      showError('Impossible de charger les établissements.');
      console.error('Erreur de chargement des établissements :', err);
    }
  }

  async function loadPointBalances() {
    try {
      const response = await fetch('/api/admin/points');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Impossible de charger les soldes.');
      const items = data.items || [];
      const previousSelection = els.pointsEstablishment.value;
      els.pointsEstablishment.innerHTML =
        '<option value="">Choisir un établissement</option>' +
        items.map((item) =>
          `<option value="${escapeHtml(item.establishmentId)}">${escapeHtml(item.nom)} — ${escapeHtml(item.type)} (${Number(item.points_solde).toLocaleString('fr-CM')} points)</option>`
        ).join('');
      if (items.some((item) => item.establishmentId === previousSelection)) {
        els.pointsEstablishment.value = previousSelection;
      }
      els.pointsBalances.innerHTML = `
        <table>
          <thead><tr><th>Établissement</th><th>Compte</th><th>Solde</th></tr></thead>
          <tbody>${items.map((item) => `
            <tr>
              <td>${escapeHtml(item.nom)} (${escapeHtml(item.type)})</td>
              <td>${escapeHtml(item.email || 'Compte non associé')}</td>
              <td>${Number(item.points_solde).toLocaleString('fr-CM')} points</td>
            </tr>`).join('')}
          </tbody>
        </table>`;
    } catch (err) {
      els.pointsError.textContent = err.message;
      els.pointsError.hidden = false;
    }
  }

  function render() {
    if (establishments.length === 0) {
      els.list.innerHTML = '<p class="empty-state">Aucun établissement. Créez le premier !</p>';
      return;
    }
    els.list.innerHTML = establishments
      .map(
        (e) => {
          const photo = safeImageUrl(e.photo);
          return `
      <article class="manage-item">
          <div class="manage-thumb">
            ${photo ? `<img class="manage-thumb-image" src="${escapeHtml(photo)}" alt="" />` : ''}
            ${photo ? '' : '<span class="manage-thumb-empty">🖼️</span>'}
          </div>
        <div class="manage-info">
          <div class="meta-row">
            <span class="badge">${e.type === 'restaurant' ? 'Restaurant' : 'Meublé'}</span>
            ${e.note != null ? `<span class="score-box">${escapeHtml(e.note)}</span>` : ''}
            <span class="muted">${escapeHtml(e.quartier)}</span>
          </div>
          <h3 class="title">${escapeHtml(e.nom)}</h3>
          <p class="location">WhatsApp ${escapeHtml(e.whatsapp)} • ${(e.products || []).length} produit(s)</p>
          <p class="location">${Number(e.points_solde || 0).toLocaleString('fr-CM')} points au solde</p>
          ${e.description ? `<p class="description">${escapeHtml(e.description)}</p>` : ''}
        </div>
        <div class="manage-item-actions">
          <button class="btn-small" data-action="edit" data-id="${escapeHtml(e.id)}">Modifier</button>
          <button class="btn-small btn-danger" data-action="delete" data-id="${escapeHtml(e.id)}">Supprimer</button>
        </div>
      </article>`;
        })
      .join('');
  }

  els.list.addEventListener('click', async (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'edit') {
      openForm(establishments.find((e) => e.id === id));
    } else if (btn.dataset.action === 'delete') {
      if (confirm('Supprimer définitivement cet établissement et ses produits ?')) {
        const res = await fetch('/api/establishments/' + encodeURIComponent(id), { method: 'DELETE' });
        if (res.ok) load();
        else showError('Suppression impossible');
      }
    }
  });

  // ---- Éditeur de produits embarqués ----
  // Chaque produit : inputs texte + un champ fichier photo (upload immédiat).
  function productRow(product, index) {
    const p = product || {};
    const photo = safeImageUrl(p.photo);
    const hasPhoto = photo ? '' : 'hidden';
    return `
      <div class="product-row" data-index="${index}" data-photo-url="${escapeHtml(photo)}">
        <input type="text" class="p-nom" placeholder="Nom du produit" value="${escapeHtml(p.nom)}" />
        <input type="number" class="p-prix" placeholder="Prix (FCFA)" value="${escapeHtml(p.prix != null ? p.prix : '')}" />
        <input type="text" class="p-dispo" placeholder="Disponibilité" value="${escapeHtml(p.disponibilite)}" />
        <input type="file" class="p-photo" accept="image/*" title="Choisir une photo" />
        <input type="text" class="p-desc" placeholder="Description" value="${escapeHtml(p.description)}" />
        <input type="text" class="p-tags" placeholder="Tags (séparés par des virgules)" value="${escapeHtml((p.tags || []).join(', '))}" />
        <button type="button" class="btn-small btn-danger p-remove">×</button>
        <img class="p-photo-preview photo-preview ${hasPhoto}" alt="" src="${escapeHtml(photo)}" />
      </div>`;
  }

  function renderProducts(products) {
    const list = products && products.length ? products : [null];
    els.productsList.innerHTML = list.map((p, i) => productRow(p, i)).join('');
  }

  function collectProducts() {
    return Array.from(els.productsList.querySelectorAll('.product-row'))
      .map((row) => ({
        id: row.dataset.productId || undefined,
        nom: row.querySelector('.p-nom').value.trim(),
        prix: Number(row.querySelector('.p-prix').value) || 0,
        disponibilite: row.querySelector('.p-dispo').value.trim(),
        photo: row.dataset.photoUrl || '',
        description: row.querySelector('.p-desc').value.trim(),
        tags: row
          .querySelector('.p-tags')
          .value.split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }))
      .filter((p) => p.nom);
  }

  /**
   * Upload d'une image vers /api/upload. Retourne l'URL publique, ou null.
   */
  async function uploadImage(fileInput) {
    if (!fileInput.files || !fileInput.files[0]) return null;
    const formData = new FormData();
    formData.append('photo', fileInput.files[0]);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Upload échoué');
    }
    const { url } = await res.json();
    return url;
  }

  // Photo principale de l'établissement.
  els.photo.addEventListener('change', async () => {
    try {
      const url = await uploadImage(els.photo);
      if (url) {
        establishmentPhotoUrl = url;
        els.photoPreview.src = url;
        els.photoPreview.hidden = false;
      }
    } catch (err) {
      showError(err.message, els.formError);
    }
  });

  // Photos des produits : upload immédiat + aperçu.
  els.productsList.addEventListener('change', async (event) => {
    const input = event.target;
    if (!input.classList.contains('p-photo')) return;
    const row = input.closest('.product-row');
    try {
      const url = await uploadImage(input);
      if (url) {
        row.dataset.photoUrl = url;
        const preview = row.querySelector('.p-photo-preview');
        preview.src = url;
        preview.hidden = false;
      }
    } catch (err) {
      showError(err.message, els.formError);
    }
  });

  els.productsList.addEventListener('click', (event) => {
    if (event.target.classList.contains('p-remove')) {
      const rows = els.productsList.querySelectorAll('.product-row');
      if (rows.length > 1) event.target.closest('.product-row').remove();
    }
  });

  els.addProductBtn.addEventListener('click', () => {
    els.productsList.insertAdjacentHTML('beforeend', productRow(null, Date.now()));
  });

  // ---- Ouverture / fermeture du formulaire ----
  function openForm(establishment) {
    const isEdit = Boolean(establishment);
    els.formTitle.textContent = isEdit ? 'Modifier l’établissement' : 'Nouvel établissement';
    els.id.value = establishment ? establishment.id : '';
    els.nom.value = establishment ? establishment.nom : '';
    els.type.value = establishment ? establishment.type : 'restaurant';
    els.categorie.value = establishment ? establishment.categorie || '' : '';
    els.quartier.value = establishment ? establishment.quartier : '';
    els.adresse.value = establishment ? establishment.adresse || '' : '';
    els.whatsapp.value = establishment ? establishment.whatsapp : '';
    els.note.value = establishment && establishment.note != null ? establishment.note : '';
    els.noteProvisoire.checked = Boolean(establishment && establishment.note_provisoire);
    establishmentPhotoUrl = establishment ? safeImageUrl(establishment.photo) : '';
    if (establishmentPhotoUrl) {
      els.photoPreview.src = establishmentPhotoUrl;
      els.photoPreview.hidden = false;
    } else {
      els.photoPreview.hidden = true;
      els.photoPreview.removeAttribute('src');
    }
    els.description.value = establishment ? establishment.description || '' : '';
    const vis = establishment && establishment.visibilites ? establishment.visibilites[0] : 'home_feed';
    els.visibilites.value = ['home_feed', 'restaurants', 'meubles'].includes(vis) ? vis : 'all';

    const products = establishment ? (establishment.products || []).map((p) => ({ ...p })) : [];
    renderProducts(products);
    Array.from(els.productsList.querySelectorAll('.product-row')).forEach((row, i) => {
      if (products[i] && products[i].id) row.dataset.productId = products[i].id;
    });

    showError('', els.formError);
    els.formPanel.hidden = false;
    els.formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeForm() {
    els.formPanel.hidden = true;
    els.form.reset();
    establishmentPhotoUrl = '';
    els.photoPreview.hidden = true;
    els.photoPreview.removeAttribute('src');
    showError('', els.formError);
  }

  els.newBtn.addEventListener('click', () => openForm(null));
  els.cancelBtn.addEventListener('click', closeForm);

  function buildVisibilites(value) {
    if (value === 'all') return ['home_feed', 'restaurants', 'meubles'];
    return [value];
  }

  // ---- Soumission (création ou modification) ----
  els.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError('', els.formError);

    const payload = {
      nom: els.nom.value,
      type: els.type.value,
      categorie: els.categorie.value,
      quartier: els.quartier.value,
      adresse: els.adresse.value,
      whatsapp: els.whatsapp.value,
      note: els.note.value,
      note_provisoire: els.noteProvisoire.checked,
      photo: establishmentPhotoUrl,
      description: els.description.value,
      visibilites: buildVisibilites(els.visibilites.value),
      products: collectProducts(),
    };

    const isEdit = Boolean(els.id.value);
    const url = isEdit ? '/api/establishments/' + els.id.value : '/api/establishments';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (res.ok) {
      closeForm();
      load();
    } else {
      showError(data.error || 'Enregistrement impossible', els.formError);
    }
  });

  els.pointsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    els.pointsError.hidden = true;
    els.pointsSuccess.hidden = true;
    try {
      const response = await fetch('/api/admin/points/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          establishmentId: els.pointsEstablishment.value,
          points: Number(els.pointsAmount.value),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Recharge impossible.');
      els.pointsSuccess.textContent =
        `Recharge effectuée : +${data.points_recharges.toLocaleString('fr-CM')} points. Nouveau solde : ${data.points_solde.toLocaleString('fr-CM')} points.`;
      els.pointsSuccess.hidden = false;
      els.pointsAmount.value = '';
      await load();
    } catch (err) {
      els.pointsError.textContent = err.message;
      els.pointsError.hidden = false;
    }
  });

  function formatDate(value) {
    if (!value) return '';
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString('fr-FR');
    } catch (_) {
      return value;
    }
  }

  function showNotifError(message) {
    if (!els.notifError) return;
    els.notifError.textContent = message || '';
    els.notifError.hidden = !message;
  }

  async function loadNotifications() {
    if (!els.notifList) return;
    showNotifError('');
    try {
      const res = await fetch('/api/admin/notifications?limit=50');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) return;
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      const unread = typeof data.unreadCount === 'number' ? data.unreadCount : items.filter((n) => !n.read).length;
      if (els.notifBadge) {
        els.notifBadge.textContent = String(unread);
        els.notifBadge.style.display = unread > 0 ? 'inline-flex' : 'none';
      }
      if (els.notifEmpty) els.notifEmpty.hidden = items.length > 0;
      if (items.length === 0) {
        els.notifList.innerHTML = '';
        return;
      }
      els.notifList.innerHTML = items
        .map((n) => {
          const isUnread = !n.read;
          const link = n.establishmentId ? `/etablissement/${escapeHtml(n.establishmentId)}` : '#';
          const typeLabel = n.type === 'etablissement_registered' ? 'Inscription' : 'Création par super-admin';
          return `
            <article class="notification-item ${isUnread ? 'unread' : ''}" data-id="${escapeHtml(n.id)}">
              <div class="notification-main">
                <div class="notification-meta">
                  <span class="notification-type">${escapeHtml(typeLabel)}</span>
                  <span class="notification-time">${escapeHtml(formatDate(n.createdAt))}</span>
                  ${isUnread ? '<span class="notification-dot"></span>' : ''}
                </div>
                <p class="notification-message">${escapeHtml(n.message || '')}</p>
                ${n.establishmentId ? `<a class="notification-link" href="${link}">Voir la fiche</a>` : ''}
              </div>
              <div class="notification-actions">
                ${isUnread ? `<button class="btn-small" data-action="notif-read">Marquer comme lu</button>` : ''}
                <button class="btn-small btn-danger" data-action="notif-delete">Supprimer</button>
              </div>
            </article>`;
        })
        .join('');
    } catch (err) {
      console.error('Erreur chargement notifications :', err);
      showNotifError('Impossible de charger les notifications.');
    }
  }

  if (els.notifMarkAll) {
    els.notifMarkAll.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/admin/notifications/mark-all-read', { method: 'POST' });
        if (res.ok) {
          await loadNotifications();
        }
      } catch (err) {
        console.error(err);
      }
    });
  }
  if (els.notifRefresh) {
    els.notifRefresh.addEventListener('click', () => loadNotifications());
  }
  if (els.notifList) {
    els.notifList.addEventListener('click', async (event) => {
      const btn = event.target.closest('button[data-action]');
      if (!btn) return;
      const item = btn.closest('.notification-item');
      if (!item) return;
      const id = item.dataset.id;
      if (btn.dataset.action === 'notif-read') {
        try {
          const res = await fetch('/api/admin/notifications/' + encodeURIComponent(id) + '/read', { method: 'POST' });
          if (res.ok) loadNotifications();
        } catch (err) {
          console.error(err);
        }
      } else if (btn.dataset.action === 'notif-delete') {
        if (!confirm('Supprimer cette notification ?')) return;
        try {
          const res = await fetch('/api/admin/notifications/' + encodeURIComponent(id), { method: 'DELETE' });
          if (res.ok) loadNotifications();
        } catch (err) {
          console.error(err);
        }
      }
    });
  }

  // ---- Init ----
  (async function init() {
    if (await ensureAccess()) {
      load();
      loadNotifications();
    }
  })();
})();
