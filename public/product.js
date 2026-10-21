const FCFA = (value) => `${Number(value || 0).toLocaleString('fr-CM')} FCFA`;

/**
 * Verdict associé à une note réelle (0-10) saisie par le super-admin.
 */
function noteVerdict(note) {
  const value = Number(note);
  const score = value.toFixed(1);
  let word = 'Correct';
  if (value >= 9) word = 'Excellent';
  else if (value >= 8) word = 'Très bien';
  else if (value >= 7) word = 'Bien';
  else if (value >= 5) word = 'Moyen';
  else word = 'Faible';
  return { score, word };
}

/**
 * Extrait les paramètres de route /produit/:establishmentId/:productId
 */
function parseRoute() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  // segments = ['produit', establishmentId, productId]
  if (segments[0] !== 'produit' || segments.length !== 3) {
    return null;
  }
  return { establishmentId: segments[1], productId: segments[2] };
}

async function loadProduct() {
  const route = parseRoute();
  const container = document.getElementById('product-detail');

  if (!route) {
    container.innerHTML = '<p class="empty-state">URL de produit invalide.</p>';
    return;
  }

  try {
    const response = await fetch(
      `/api/product/${encodeURIComponent(route.establishmentId)}/${encodeURIComponent(route.productId)}`
    );
    if (!response.ok) {
      container.textContent = response.status === 404
        ? 'Produit introuvable.'
        : 'Impossible de charger ce produit.';
      container.classList.add('empty-state');
      return;
    }

    const { establishment, product } = await response.json();
    const template = document.createElement('template');
    template.innerHTML = `
    <article class="product-page-card">
      <div class="product-page-media">
        <img class="product-page-image" alt="" />
      </div>
      <div class="product-page-body">
        <div class="meta-row">
          <span class="badge"></span>
          <span class="pricing"></span>
        </div>
        <h1 class="title"></h1>
        <p class="location"></p>
        <p class="description"></p>
        <div class="score">
          <span class="score-box"></span>
          <span class="score-verdict">
            <span class="score-word"></span>
            <small></small>
          </span>
        </div>
        <p class="availability"></p>
        <div class="cta-row">
          <button class="primary-btn" id="whatsapp-btn">Voir le WhatsApp</button>
        </div>
      </div>
    </article>
  `;
    container.replaceChildren(template.content.cloneNode(true));

    const { score, word } = establishment.note == null
      ? { score: null, word: null }
      : noteVerdict(establishment.note);
    const image = container.querySelector('.product-page-image');
    image.src = product.photo || '';
    image.alt = product.nom || '';
    container.querySelector('.badge').textContent =
      establishment.type === 'restaurant' ? 'Restaurant' : 'Meublé';
    container.querySelector('.pricing').textContent = FCFA(product.prix);
    container.querySelector('.title').textContent = product.nom || '';
    container.querySelector('.location').textContent =
      `${establishment.nom || ''} • ${establishment.quartier || ''}`;
    container.querySelector('.description').textContent = product.description || '';
    container.querySelector('.availability').textContent =
      `Disponibilité : ${product.disponibilite || ''}`;
    const scoreContainer = container.querySelector('.score');
    if (score === null) {
      scoreContainer.remove();
    } else {
      scoreContainer.querySelector('.score-box').textContent = score;
      scoreContainer.querySelector('.score-word').textContent = word;
      scoreContainer.querySelector('small').textContent = 'note de l’établissement';
    }

    document.getElementById('whatsapp-btn').addEventListener('click', async () => {
      try {
        const redirectResponse = await fetch('/api/redirect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            establishmentId: establishment.id,
            productId: product.id,
            source: 'product_page',
            sessionId: `session_${Date.now()}`,
          }),
        });

        const result = await redirectResponse.json();
        if (redirectResponse.ok && result.whatsappUrl) {
          window.location.href = result.whatsappUrl;
        } else {
          alert(result.error || 'Redirection impossible pour le moment.');
        }
      } catch (err) {
        alert('Erreur réseau. Réessaie.');
      }
    });
  } catch (err) {
    container.textContent = 'Erreur réseau. Impossible de charger le produit.';
    container.classList.add('empty-state');
  }
}

loadProduct();
