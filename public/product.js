const FCFA = (value) => `${Number(value || 0).toLocaleString('fr-CM')} FCFA`;

/**
 * Score déterministe (cosmétique) façon comparateur, dérivé de l'id produit.
 * Stable d'un rendu à l'autre : 6.0 → 9.9, avec un verdict associé.
 */
function scoreFor(id) {
  let hash = 0;
  const key = String(id);
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 100000;
  }
  const score = (6 + (hash % 39) / 10).toFixed(1);
  const value = Number(score);
  let word = 'Correct';
  if (value >= 8.5) word = 'Excellent';
  else if (value >= 7.5) word = 'Très bien';
  else if (value >= 6.8) word = 'Bien';
  return { score, word };
}

/**
 * Extrait les paramètres de route /produit/:establishmentId/:productId
 */
function parseRoute() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  // segments = ['produit', establishmentId, productId]
  if (segments[0] !== 'produit' || segments.length < 3) {
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

  const response = await fetch(`/api/product/${route.establishmentId}/${route.productId}`);
  if (!response.ok) {
    container.innerHTML = '<p class="empty-state">Produit introuvable.</p>';
    return;
  }

  const data = await response.json();
  const { establishment, product } = data;
  const { score, word } = scoreFor(product.id);

  container.innerHTML = `
    <article class="product-page-card">
      <div class="product-page-media">
        <img class="product-page-image" src="${product.photo}" alt="${product.nom}" />
      </div>
      <div class="product-page-body">
        <div class="meta-row">
          <span class="badge">${establishment.type === 'restaurant' ? 'Restaurant' : 'Meublé'}</span>
          <span class="pricing">${FCFA(product.prix)}</span>
        </div>
        <h1 class="title">${product.nom}</h1>
        <p class="location">${establishment.nom} • ${establishment.quartier}</p>
        <p class="description">${product.description}</p>
        <div class="score">
          <span class="score-box">${score}</span>
          <span class="score-verdict">
            <span class="score-word">${word}</span>
            <small>basé sur l'activité</small>
          </span>
        </div>
        <p class="availability">Disponibilité : ${product.disponibilite}</p>
        <div class="cta-row">
          <button class="primary-btn" id="whatsapp-btn">Voir le WhatsApp</button>
        </div>
      </div>
    </article>
  `;

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
}

loadProduct();
