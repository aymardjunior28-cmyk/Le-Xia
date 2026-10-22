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
    } catch (err) {
      showMsg('Erreur lors du chargement du profil.', 'error');
    }
  }

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