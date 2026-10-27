/**
 * login.js — Soumission du formulaire de connexion.
 */
(function () {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const passwordToggle = document.getElementById('password-toggle');
  const errorBox = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-btn');

  passwordToggle.addEventListener('click', () => {
    const showPassword = passwordInput.type === 'password';
    passwordInput.type = showPassword ? 'text' : 'password';
    passwordToggle.textContent = showPassword ? 'Masquer' : 'Afficher';
    passwordToggle.setAttribute('aria-pressed', String(showPassword));
  });

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Connexion…';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.value,
          password: passwordInput.value,
        }),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        window.location.href = '/dashboard';
        return;
      }
      showError(data.error || 'Identifiants invalides.');
    } catch (err) {
      showError('Erreur réseau. Réessaie.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Se connecter';
    }
  });
})();
