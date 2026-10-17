/**
 * profil-etablissement.js — Chargement et mise à jour du profil établissement.
 * Réservé aux utilisateurs ayant le rôle "etablissement".
 */
(function bootProfil() {
  const form = document.getElementById('form-profil');
  const msg = document.getElementById('msg-profil');

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
      form.elements.photo.value = est.photo || '';
      form.elements.statut.value = est.statut || 'actif';
      form.elements.id.value = est.id;
    } catch (err) {
      showMsg('Erreur lors du chargement du profil.', 'error');
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMsg('', '');

    const formData = new FormData(form);
    const body = {
      nom: formData.get('nom'),
      type: formData.get('type'),
      quartier: formData.get('quartier'),
      whatsapp: formData.get('whatsapp'),
      adresse: formData.get('adresse'),
      categorie: formData.get('categorie'),
      description: formData.get('description'),
      photo: formData.get('photo'),
      statut: formData.get('statut'),
    };

    try {
      const res = await fetch('/api/etablissement/moi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        showMsg(data.error || 'Échec de la mise à jour.', 'error');
        return;
      }

      showMsg('Profil mis à jour avec succès.', 'success');
    } catch (err) {
      showMsg('Erreur réseau. Réessayez.', 'error');
    }
  });

  loadSession();
})();