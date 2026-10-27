const FCFA = (value) => `${Number(value || 0).toLocaleString('fr-CM')} FCFA`;
const safeImageUrl = (value) => {
  const url = String(value || '');
  return (url.startsWith('/') && !url.startsWith('//')) || /^https?:\/\//i.test(url)
    ? url
    : '';
};

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
    <section class="establishment-extras" aria-label="Photos et localisation de l’établissement">
      <h2>Le décor</h2>
      <div class="establishment-gallery"></div>
      <h2>Localisation</h2>
      <iframe class="establishment-map" title="Localisation de l’établissement sur Google Maps" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
    </section>
  `;
    container.replaceChildren(template.content.cloneNode(true));

    const { score, word } = establishment.note == null
      ? { score: null, word: null }
      : noteVerdict(establishment.note);
    const image = container.querySelector('.product-page-image');
    image.src = safeImageUrl(product.photo);
    image.alt = product.nom || '';
    const gallery = container.querySelector('.establishment-gallery');
    const galleryPhotos = Array.isArray(establishment.photos) ? establishment.photos.slice(0, 3) : [];
    for (let index = 0; index < 3; index += 1) {
      const tile = document.createElement('div');
      tile.className = 'establishment-gallery-tile';
      const photoUrl = safeImageUrl(galleryPhotos[index]);
      if (photoUrl) {
        const galleryImage = document.createElement('img');
        galleryImage.src = photoUrl;
        galleryImage.alt = `Décor de ${establishment.nom || 'l’établissement'} - photo ${index + 1}`;
        galleryImage.loading = 'lazy';
        tile.appendChild(galleryImage);
      } else {
        tile.textContent = 'Photo à venir';
      }
      gallery.appendChild(tile);
    }
    const locationQuery = [establishment.adresse, establishment.quartier, establishment.nom]
      .filter(Boolean)
      .join(', ');
    container.querySelector('.establishment-map').src =
      `https://maps.google.com/maps?q=${encodeURIComponent(locationQuery)}&output=embed`;
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

    const whatsappButton = document.getElementById('whatsapp-btn');
    if (establishment.points_actifs === false) {
      whatsappButton.disabled = true;
      whatsappButton.textContent = 'Solde épuisé';
      whatsappButton.title = 'Cet établissement doit être rechargé par le super-admin.';
      whatsappButton.classList.add('points-exhausted');
    }
    whatsappButton.addEventListener('click', async () => {
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
          if (result.reason === 'insufficient_points') {
            whatsappButton.disabled = true;
            whatsappButton.classList.add('points-exhausted');
            whatsappButton.textContent = 'Solde épuisé';
          }
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
