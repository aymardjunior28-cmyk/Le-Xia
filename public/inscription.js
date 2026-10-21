/**
 * inscription.js — Inscription établissement en 2 étapes avec upload de photo.
 * Étape 1 : compte (email, mot de passe, nom)
 * Étape 2 : établissement (type, quartier, whatsapp, adresse, catégorie, description, photo)
 * Envoi via FormData (multipart) car la photo est un fichier.
 */
(function bootInscription() {
  const form1 = document.getElementById('form-inscription-1');
  const form2 = document.getElementById('form-inscription-2');
  const btnNext1 = document.getElementById('btn-next-1');
  const btnPrev2 = document.getElementById('btn-prev-2');
  const btnSubmit2 = document.getElementById('btn-submit-2');
  const msg = document.getElementById('msg-inscription');

  const badge1 = document.getElementById('step-1-badge');
  const badge2 = document.getElementById('step-2-badge');
  const label1 = document.getElementById('step-1-label');
  const label2 = document.getElementById('step-2-label');

  if (!form1 || !form2) return;

  let currentStep = 1;

  function showMsg(text, type) {
    msg.textContent = text;
    msg.className = 'msg auth-' + (type || 'error');
  }

  function showStep(step) {
    currentStep = step;
    if (step === 1) {
      form1.classList.add('active');
      form1.classList.remove('hidden');
      form2.classList.remove('active');
      form2.classList.add('hidden');
      badge1.classList.add('active');
      badge2.classList.remove('active');
      label1.classList.add('active');
      label2.classList.remove('active');
      btnNext1.style.display = 'inline-block';
      btnPrev2.style.display = 'none';
      btnSubmit2.style.display = 'none';
    } else {
      form1.classList.remove('active');
      form1.classList.add('hidden');
      form2.classList.add('active');
      form2.classList.remove('hidden');
      badge1.classList.remove('active');
      badge2.classList.add('active');
      label1.classList.remove('active');
      label2.classList.add('active');
      btnNext1.style.display = 'none';
      btnPrev2.style.display = 'inline-block';
      btnSubmit2.style.display = 'inline-block';
    }
    showMsg('', '');
  }

  // Validation étape 1 avant de passer à l'étape 2
  function validateStep1() {
    const email = form1.elements.email.value.trim();
    const password = form1.elements.password.value;
    const nom = form1.elements.nom.value.trim();

    if (!email || !password || !nom) {
      showMsg('Veuillez remplir tous les champs de l\'étape 1.', 'error');
      return false;
    }
    if (password.length < 12) {
      showMsg('Le mot de passe doit contenir au moins 12 caractères.', 'error');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMsg('Email invalide.', 'error');
      return false;
    }
    showMsg('', '');
    return true;
  }

  // Validation étape 2 avant envoi
  function validateStep2() {
    const type = form2.elements.type.value;
    const quartier = form2.elements.quartier.value.trim();
    const whatsapp = form2.elements.whatsapp.value.trim();

    if (!type || !quartier || !whatsapp) {
      showMsg('Veuillez remplir les champs obligatoires de l\'étape 2.', 'error');
      return false;
    }
    showMsg('', '');
    return true;
  }

  btnNext1.addEventListener('click', () => {
    if (validateStep1()) showStep(2);
  });

  btnPrev2.addEventListener('click', () => {
    showStep(1);
  });

  form2.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMsg('', '');

    if (!validateStep2()) return;

    const formData = new FormData(form2);

    // Ajouter les champs de l'étape 1 (déjà validés)
    formData.append('email', form1.elements.email.value.trim());
    formData.append('password', form1.elements.password.value);
    formData.append('nom', form1.elements.nom.value.trim());

    btnSubmit2.disabled = true;
    btnSubmit2.textContent = 'Création en cours…';
    let submitted = false;

    try {
      const res = await fetch('/api/etablissements/inscription', {
        method: 'POST',
        body: formData, // FormData définit automatiquement Content-Type: multipart/form-data
      });

      const data = await res.json();

      if (!res.ok) {
        showMsg(data.error || 'Inscription échouée.', 'error');
        return;
      }

      showMsg('Compte créé avec succès ! Redirection…', 'success');
      submitted = true;

      setTimeout(() => {
        window.location.href = '/login';
      }, 1200);
    } catch (err) {
      showMsg('Erreur réseau. Réessayez.', 'error');
    } finally {
      if (!submitted) {
        btnSubmit2.textContent = 'S\'inscrire';
        btnSubmit2.disabled = false;
      }
    }
  });

  // Démarrer à l'étape 1
  showStep(1);
})();