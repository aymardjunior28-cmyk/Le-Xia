/**
 * manage.js — Interface d'administration des établissements (super-admin).
 * CRUD complet : lister, créer, modifier, supprimer (établissement + produits).
 */
(function () {
  const FCFA = (value) => `${Number(value || 0).toLocaleString('fr-CM')} FCFA`;

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
    photo: document.getElementById('est-photo'),
    description: document.getElementById('est-description'),
    visibilites: document.getElementById('est-visibilites'),
  };

  let establishments = [];

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
    const res = await fetch('/api/establishments');
    establishments = await res.json();
    els.count.textContent = establishments.length;
    render();
  }

  function render() {
    if (establishments.length === 0) {
      els.list.innerHTML = '<p class="empty-state">Aucun établissement. Créez le premier !</p>';
      return;
    }
    els.list.innerHTML = establishments
      .map(
        (e) => `
      <article class="manage-item">
        <div class="manage-thumb" style="background-image:url('${e.photo || ''}')">
          ${e.photo ? '' : '<span class="manage-thumb-empty">🖼️</span>'}
        </div>
        <div class="manage-info">
          <div class="meta-row">
            <span class="badge">${e.type === 'restaurant' ? 'Restaurant' : 'Meublé'}</span>
            ${e.note != null ? `<span class="score-box">${e.note}</span>` : ''}
            <span class="muted">${e.quartier}</span>
          </div>
          <h3 class="title">${e.nom}</h3>
          <p class="location">WhatsApp ${e.whatsapp} • ${(e.products || []).length} produit(s)</p>
          ${e.description ? `<p class="description">${e.description}</p>` : ''}
        </div>
        <div class="manage-item-actions">
          <button class="btn-small" data-action="edit" data-id="${e.id}">Modifier</button>
          <button class="btn-small btn-danger" data-action="delete" data-id="${e.id}">Supprimer</button>
        </div>
      </article>`
      )
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
        const res = await fetch('/api/establishments/' + id, { method: 'DELETE' });
        if (res.ok) load();
        else showError('Suppression impossible');
      }
    }
  });

  // ---- Éditeur de produits embarqués ----
  function productRow(product, index) {
    const p = product || {};
    return `
      <div class="product-row" data-index="${index}">
        <input type="text" class="p-nom" placeholder="Nom du produit" value="${p.nom || ''}" />
        <input type="number" class="p-prix" placeholder="Prix (FCFA)" value="${p.prix != null ? p.prix : ''}" />
        <input type="text" class="p-dispo" placeholder="Disponibilité" value="${p.disponibilite || ''}" />
        <input type="text" class="p-photo" placeholder="Photo (URL)" value="${p.photo || ''}" />
        <input type="text" class="p-desc" placeholder="Description" value="${p.description || ''}" />
        <input type="text" class="p-tags" placeholder="Tags (séparés par des virgules)" value="${(p.tags || []).join(', ')}" />
        <button type="button" class="btn-small btn-danger p-remove">×</button>
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
        photo: row.querySelector('.p-photo').value.trim(),
        description: row.querySelector('.p-desc').value.trim(),
        tags: row
          .querySelector('.p-tags')
          .value.split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }))
      .filter((p) => p.nom);
  }

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
    els.photo.value = establishment ? establishment.photo || '' : '';
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
      photo: els.photo.value,
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

  // ---- Init ----
  (async function init() {
    if (await ensureAccess()) {
      load();
    }
  })();
})();
