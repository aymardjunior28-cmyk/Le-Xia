const establishmentsContainer = document.getElementById('establishments');
const template = document.getElementById('card-template');
const filterButtons = document.querySelectorAll('.filter-btn');
const quartierFilter = document.getElementById('quartier-filter');
const priceFilter = document.getElementById('price-filter');

let currentFilter = 'all';
let currentQuartier = 'all';
let currentMaxPrice = 'all';
let allItems = [];

function safeImageUrl(value) {
  const url = String(value || '');
  return (url.startsWith('/') && !url.startsWith('//')) || /^https?:\/\//i.test(url)
    ? url
    : '';
}

/**
 * Verdict associé à une note (0-10) saisie dans l'administration.
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
        adresse: establishment.adresse,
        establishmentPhotos: Array.isArray(establishment.photos) ? establishment.photos.slice(0, 3) : [],
        productId: product.id,
        name: product.nom,
        price: product.prix,
        availability: product.disponibilite,
        photo: product.photo || establishment.photo,
        description: product.description,
        note: establishment.note != null ? establishment.note : null,
        noteProvisoire: establishment.note_provisoire === true,
        pointsActifs: establishment.points_actifs !== false,
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
  try {
    const items = [];
    let offset = 0;
    let total = Infinity;
    while (offset < total) {
      const response = await fetch(`/api/establishments?limit=100&offset=${offset}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.items)) throw new Error('Réponse catalogue invalide');
      items.push(...data.items);
      total = Number(data.total) || 0;
      if (data.items.length === 0) break;
      offset += data.items.length;
    }
    if (items.length === 0) {
      establishmentsContainer.textContent = 'Aucun établissement disponible pour le moment.';
      establishmentsContainer.classList.add('empty-state');
      return;
    }
    const catalogEstablishments = items.filter(
      (establishment) => Array.isArray(establishment.products) && establishment.products.length > 0
    );
    if (catalogEstablishments.length === 0) {
      establishmentsContainer.textContent = 'Aucun établissement avec une offre disponible pour le moment.';
      establishmentsContainer.classList.add('empty-state');
      allItems = [];
      return;
    }
    establishmentsContainer.classList.remove('empty-state');
    allItems = flattenProducts(catalogEstablishments);
    populateQuartiers(catalogEstablishments);
    updateHeroOffers(catalogEstablishments);
    renderEstablishments();
  } catch (err) {
    establishmentsContainer.textContent =
      'Impossible de charger le catalogue. Vérifiez votre connexion puis actualisez la page.';
    establishmentsContainer.classList.add('empty-state');
    console.error('Erreur de chargement du catalogue :', err);
  }
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
    const discoverButton = clone.querySelector('.primary-btn');
    // Aucune classe d'animation : rendu immédiat.
    clone.querySelector('.card-image').src = safeImageUrl(item.photo);
    clone.querySelector('.card-image').alt = item.name;
    clone.querySelector('.badge').textContent =
      item.type === 'restaurant' ? 'Restaurant' : 'Meublé';
    clone.querySelector('.pricing').textContent = `${item.price.toLocaleString('fr-CM')} FCFA`;
    clone.querySelector('.title').textContent = item.name;
    clone.querySelector('.location').textContent = `${item.quartier} • ${item.availability}`;
    clone.querySelector('.description').textContent = item.description;
    if (!item.pointsActifs) {
      card.classList.add('points-exhausted');
      discoverButton.disabled = true;
      discoverButton.textContent = 'Solde épuisé';
      discoverButton.title = 'Cet établissement doit être rechargé par le super-admin.';
    }

    const scoreBox = clone.querySelector('.score-box');
    const scoreWord = clone.querySelector('.score-word');
    const scoreSource = clone.querySelector('.score-verdict small');
    const rating = Number(item.note);
    if (item.note != null && Number.isFinite(rating) && rating >= 0 && rating <= 10) {
      const { score, word } = noteVerdict(rating);
      scoreBox.textContent = `${score}/10`;
      scoreWord.textContent = word;
      scoreSource.textContent = item.noteProvisoire
        ? 'Note provisoire de démonstration'
        : 'Note attribuée par l’administration';
    } else {
      scoreBox.textContent = '—';
      scoreWord.textContent = 'Pas encore noté';
      scoreSource.textContent = 'Aucune note renseignée';
    }

    // Clic sur la carte → fiche produit dédiée (§10.2).
    card.style.cursor = 'pointer';
    card.addEventListener('click', (event) => {
      if (event.target.closest('.primary-btn')) return;
      if (item.productId) {
        window.location.href =
          `/produit/${encodeURIComponent(item.establishmentId)}/${encodeURIComponent(item.productId)}`;
      }
    });

    // Bouton "Découvrir plus" → redirection WhatsApp attribuée.
    discoverButton.addEventListener('click', async () => {
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
          if (result.reason === 'insufficient_points') {
            discoverButton.disabled = true;
            card.classList.add('points-exhausted');
            discoverButton.textContent = 'Solde épuisé';
          }
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
