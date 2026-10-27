/**
 * profil-etablissement.js — Chargement et mise à jour du profil établissement.
 * Réservé aux utilisateurs ayant le rôle "etablissement".
 */
(function bootProfil() {
  const form = document.getElementById('form-profil');
  const msg = document.getElementById('msg-profil');
  const photoInput = form && form.elements.photo;
  const photoUrl = form && form.elements.photoUrl;
  const photoPreview = document.getElementById('profile-photo-preview');
  const productsList = document.getElementById('profile-products');
  const productForm = document.getElementById('profile-product-form');
  const productsMsg = document.getElementById('profile-products-msg');
  let establishmentId = '';
  let previewObjectUrl = '';

  if (!form) return;

  function showMsg(text, type) {
    msg.textContent = text;
    msg.className = 'msg auth-' + (type || 'error');
  }

  async function loadSession() {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (!data.user || data.user.role !== 'etablissement') {
        window.location.href = '/login';
        return;
      }
      loadProfil();
    } catch (err) {
      window.location.href = '/login';
    }
  }

  async function loadProfil() {
    try {
      const res = await fetch('/api/etablissement/moi');
      if (!res.ok) {
        showMsg('Impossible de charger votre profil.', 'error');
        return;
      }
      const est = await res.json();

      form.elements.nom.value = est.nom || '';
      form.elements.type.value = est.type || 'restaurant';
      form.elements.quartier.value = est.quartier || '';
      form.elements.whatsapp.value = est.whatsapp || '';
      form.elements.adresse.value = est.adresse || '';
      form.elements.categorie.value = est.categorie || '';
      form.elements.description.value = est.description || '';
      photoUrl.value = est.photo || '';
      if (est.photo) {
        photoPreview.src = est.photo;
        photoPreview.hidden = false;
      } else {
        photoPreview.removeAttribute('src');
        photoPreview.hidden = true;
      }
      form.elements.statut.value = est.statut || 'actif';
      form.elements.id.value = est.id;
      establishmentId = est.id;
      await loadProducts();
    } catch (err) {
      showMsg('Erreur lors du chargement du profil.', 'error');
    }
  }

  async function loadProducts() {
    const response = await fetch(`/api/etablissements/${encodeURIComponent(establishmentId)}/produits`);
    if (!response.ok) throw new Error(`Impossible de charger les produits (HTTP ${response.status})`);
    const products = await response.json();
    productsList.replaceChildren();

    if (products.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'Aucune offre pour le moment. Ajoutez-en une pour apparaître dans le catalogue.';
      productsList.appendChild(empty);
      return;
    }

    products.forEach((product) => {
      const row = document.createElement('article');
      row.className = 'profile-product-row';
      const details = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = product.nom;
      const description = document.createElement('p');
      description.textContent =
        `${Number(product.prix).toLocaleString('fr-CM')} FCFA · ${product.disponibilite || 'Disponible'}`;
      details.append(title, description);
      if (product.description) {
        const note = document.createElement('small');
        note.textContent = product.description;
        details.appendChild(note);
      }
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn-small btn-danger';
      remove.dataset.productId = product.id;
      remove.textContent = 'Supprimer';
      row.append(details, remove);
      productsList.appendChild(row);
    });
  }

  productForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    productsMsg.hidden = true;
    const values = Object.fromEntries(new FormData(productForm));
    try {
      const response = await fetch(
        `/api/etablissements/${encodeURIComponent(establishmentId)}/produits`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Impossible d’ajouter cette offre.');
      productForm.reset();
      productForm.elements.disponibilite.value = 'Disponible';
      productsMsg.textContent = 'Offre ajoutée au catalogue.';
      productsMsg.className = 'msg auth-success';
      productsMsg.hidden = false;
      await loadProducts();
    } catch (err) {
      productsMsg.textContent = err.message;
      productsMsg.className = 'msg auth-error';
      productsMsg.hidden = false;
    }
  });

  productsList.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-product-id]');
    if (!button) return;
    button.disabled = true;
    productsMsg.hidden = true;
    try {
      const response = await fetch(
        `/api/etablissements/${encodeURIComponent(establishmentId)}/produits/${encodeURIComponent(button.dataset.productId)}`,
        { method: 'DELETE' }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Impossible de supprimer cette offre.');
      productsMsg.textContent = 'Offre supprimée.';
      productsMsg.className = 'msg auth-success';
      productsMsg.hidden = false;
      await loadProducts();
    } catch (err) {
      button.disabled = false;
      productsMsg.textContent = err.message;
      productsMsg.className = 'msg auth-error';
      productsMsg.hidden = false;
    }
  });

  photoInput.addEventListener('change', () => {
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = '';
    const file = photoInput.files[0];
    if (!file) {
      if (photoUrl.value) {
        photoPreview.src = photoUrl.value;
        photoPreview.hidden = false;
      }
      return;
    }

    previewObjectUrl = URL.createObjectURL(file);
    photoPreview.src = previewObjectUrl;
    photoPreview.hidden = false;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMsg('', '');

    const formData = new FormData(form);
    formData.set('photo', photoInput.files[0] || '');

    try {
      const res = await fetch('/api/etablissement/moi', {
        method: 'PUT',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        showMsg(data.error || 'Échec de la mise à jour.', 'error');
        return;
      }

      photoUrl.value = data.photo || '';
      photoInput.value = '';
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = '';
      if (data.photo) {
        photoPreview.src = data.photo;
        photoPreview.hidden = false;
      }
      showMsg('Profil mis à jour avec succès.', 'success');
    } catch (err) {
      showMsg('Erreur réseau. Réessayez.', 'error');
    }
  });

  loadSession();
})();