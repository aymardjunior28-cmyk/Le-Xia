/**
 * inscription.js — Gestion du formulaire d'inscription établissement.
 * Appelle POST /api/etablissements/inscription puis redirige vers la connexion.
 */
(function bootInscription() {
  const form = document.getElementById('form-inscription');
  const msg = document.getElementById('msg-inscription');

  if (!form) return;

  function showMsg(text, type) {
    msg.textContent = text;
    msg.className = 'msg auth-' + (type || 'error');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMsg('', '');

    const formData = new FormData(form);
    const body = {
      email: formData.get('email'),
      password: formData.get('password'),
      nom: formData.get('nom'),
      type: formData.get('type'),
      quartier: formData.get('quartier'),
      whatsapp: formData.get('whatsapp'),
      adresse: formData.get('adresse'),
      categorie: formData.get('categorie'),
      description: formData.get('description'),
      photo: formData.get('photo'),
    };

    try {
      const res = await fetch('/api/etablissements/inscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        showMsg(data.error || 'Inscription échouée.', 'error');
        return;
      }

      showMsg(
        'Compte créé avec succès ! Vous pouvez maintenant vous connecter.',
        'success'
      );
      form.reset();

      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (err) {
      showMsg('Erreur réseau. Réessayez.', 'error');
    }
  });
})();