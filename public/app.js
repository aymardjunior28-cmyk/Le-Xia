const establishmentsContainer = document.getElementById('establishments');
const template = document.getElementById('card-template');
const filterButtons = document.querySelectorAll('.filter-btn');
const quartierFilter = document.getElementById('quartier-filter');
const priceFilter = document.getElementById('price-filter');

let currentFilter = 'all';
let currentQuartier = 'all';
let currentMaxPrice = 'all';
let allItems = [];

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
 * Aplati les établissements en une liste de produits pour le feed.
 * Chaque carte du feed représente un produit (photo, prix, dispo propres).
 */
function flattenProducts(establishments) {
  const items = [];
  establishments.forEach((establishment) => {
    (establishment.products || []).forEach((product) => {
      items.push({
        establishmentId: establishment.id,
        establishmentName: establishment.nom,
        type: establishment.type,
        quartier: establishment.quartier,
        productId: product.id,
        name: product.nom,
        price: product.prix,
        availability: product.disponibilite,
        photo: product.photo,
        description: product.description,
        note: establishment.note != null ? establishment.note : null,
      });
    });
  });
  return items;
}

/**
 * Alimente la liste déroulante des quartiers (valeurs uniques).
 */
function populateQuartiers(establishments) {
  const quartiers = Array.from(new Set(establishments.map((e) => e.quartier))).sort();
  quartiers.forEach((quartier) => {
    const option = document.createElement('option');
    option.value = quartier;
    option.textContent = quartier;
    quartierFilter.appendChild(option);
  });
}

/**
 * Met à jour les prix d'appel du hero avec les minima réels du catalogue.
 */
function updateHeroOffers(establishments) {
  const minPriceFor = (type) => {
    const prices = [];
    establishments.forEach((establishment) => {
      if (establishment.type !== type) return;
      (establishment.products || []).forEach((product) => prices.push(product.prix));
    });
    return prices.length > 0 ? Math.min(...prices) : null;
  };

  [
    ['restaurant', 'hero-price-restaurant'],
    ['meuble', 'hero-price-meuble'],
  ].forEach(([type, elementId]) => {
    const el = document.getElementById(elementId);
    const min = minPriceFor(type);
    if (!el || min == null) return;
    el.dataset.count = String(min);
    el.textContent = min.toLocaleString('fr-CM');
  });
}

async function fetchEstablishments() {
  const response = await fetch('/api/establishments');
  const data = await response.json();
  allItems = flattenProducts(data);
  populateQuartiers(data);
  updateHeroOffers(data);
  renderEstablishments();
}

/**
 * Applique les trois filtres combinés : type, quartier, prix max.
 */
function applyFilters(items) {
  return items.filter((item) => {
    if (currentFilter !== 'all' && item.type !== currentFilter) return false;
    if (currentQuartier !== 'all' && item.quartier !== currentQuartier) return false;
    if (currentMaxPrice !== 'all' && item.price > Number(currentMaxPrice)) return false;
    return true;
  });
}

function renderEstablishments() {
  const items = applyFilters(allItems);

  establishmentsContainer.innerHTML = '';

  if (items.length === 0) {
    establishmentsContainer.innerHTML =
      '<p class="empty-state">Aucun résultat pour ces filtres.</p>';
    return;
  }

  items.forEach((item) => {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.card');
    // Apparition en cascade au scroll + effet 3D au survol (ui.js).
    card.classList.add('reveal', 'tilt');
    card.dataset.revealIndex = String(items.indexOf(item));
    card.dataset.tilt = '';
    clone.querySelector('.card-image').src = item.photo;
    clone.querySelector('.card-image').alt = item.name;
    clone.querySelector('.badge').textContent =
      item.type === 'restaurant' ? 'Restaurant' : 'Meublé';
    clone.querySelector('.pricing').textContent = `${item.price.toLocaleString('fr-CM')} FCFA`;
    clone.querySelector('.title').textContent = item.name;
    clone.querySelector('.location').textContent = `${item.quartier} • ${item.availability}`;
    clone.querySelector('.description').textContent = item.description;

    // Note réelle saisie par le super-admin si elle existe, sinon score cosmétique.
    const { score, word } =
      item.note != null ? noteVerdict(item.note) : scoreFor(item.productId);
    clone.querySelector('.score-box').textContent = score;
    clone.querySelector('.score-word').textContent = word;

    // Clic sur la carte → fiche produit dédiée (§10.2).
    card.style.cursor = 'pointer';
    card.addEventListener('click', (event) => {
      if (event.target.classList.contains('primary-btn')) return;
      window.location.href = `/produit/${item.establishmentId}/${item.productId}`;
    });

    // Bouton "Découvrir plus" → redirection WhatsApp attribuée.
    clone.querySelector('.primary-btn').addEventListener('click', async () => {
      const payload = {
        establishmentId: item.establishmentId,
        productId: item.productId,
        source: 'home_feed',
        sessionId: `session_${Date.now()}`,
      };

      try {
        const response = await fetch('/api/redirect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (response.ok && result.whatsappUrl) {
          window.location.href = result.whatsappUrl;
        } else {
          alert(result.error || 'Redirection impossible pour le moment.');
        }
      } catch (err) {
        alert('Erreur réseau. Réessaie.');
      }
    });

    card.dataset.type = item.type;
    establishmentsContainer.appendChild(clone);
  });
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
    renderEstablishments();
  });
});

quartierFilter.addEventListener('change', (event) => {
  currentQuartier = event.target.value;
  renderEstablishments();
});

priceFilter.addEventListener('change', (event) => {
  currentMaxPrice = event.target.value;
  renderEstablishments();
});

// Bouton "Rechercher" : ré-applique les filtres et ramène vers les résultats.
document.getElementById('search-btn').addEventListener('click', () => {
  renderEstablishments();
  establishmentsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

fetchEstablishments();
