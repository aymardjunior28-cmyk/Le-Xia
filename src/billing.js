/**
 * Service de facturation par blocs prépayés (§6 et §8.4 du cahier des charges).
 *
 * Règles :
 *  - Deux verticales, deux grilles tarifaires distinctes.
 *  - Restaurant : 350 – 420 FCFA / conversation attribuée.
 *  - Meublé     : 1 500 – 1 800 FCFA / conversation attribuée.
 *  - Le paiement est un bloc prépayé : pas de commission, pas d'encours.
 *  - Chaque conversation attribuée consomme une unité du bloc actif.
 */

const TARIFFS = {
  restaurant: { min: 350, max: 420 },
  meuble: { min: 1500, max: 1800 },
};

const BLOCK_VALIDITY_DAYS = 90;

/**
 * Valide et borne un prix unitaire selon la verticale.
 * @param {string} verticale "restaurant" | "meuble"
 * @param {number} prixUnitaire
 * @returns {{ ok: boolean, prix?: number, error?: string }}
 */
function resolveUnitPrice(verticale, prixUnitaire) {
  const range = TARIFFS[verticale];
  if (!range) {
    return { ok: false, error: 'Verticale inconnue (restaurant | meuble)' };
  }
  if (prixUnitaire === undefined || prixUnitaire === null) {
    return { ok: true, prix: range.min };
  }
  const value = Number(prixUnitaire);
  if (Number.isNaN(value) || value < range.min || value > range.max) {
    return {
      ok: false,
      error: `Prix unitaire hors grille : ${range.min} – ${range.max} FCFA`,
    };
  }
  return { ok: true, prix: value };
}

/**
 * Crée un bloc de facturation prépayé.
 * @param {object} params
 * @param {string} params.establishmentId
 * @param {string} params.verticale
 * @param {number} params.nombreConversations
 * @param {number} [params.prixUnitaire] Borné par la grille de la verticale
 * @param {string} [params.id] Identifiant (sinon généré)
 * @returns {{ ok: boolean, block?: object, error?: string }}
 */
function createBlock({ establishmentId, verticale, nombreConversations, prixUnitaire, id }) {
  if (!establishmentId) {
    return { ok: false, error: 'establishmentId est requis' };
  }

  const conversations = Number(nombreConversations);
  if (!Number.isInteger(conversations) || conversations <= 0) {
    return { ok: false, error: 'nombreConversations doit être un entier positif' };
  }

  const price = resolveUnitPrice(verticale, prixUnitaire);
  if (!price.ok) {
    return { ok: false, error: price.error };
  }

  const now = new Date();
  const expiration = new Date(now.getTime() + BLOCK_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

  const block = {
    id_bloc: id || `block_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    id_etablissement: establishmentId,
    type_verticale: verticale,
    nombre_conversations: conversations,
    conversations_consommees: 0,
    prix_unitaire: price.prix,
    montant_total: conversations * price.prix,
    statut: 'active',
    date_achat: now.toISOString(),
    date_expiration: expiration.toISOString(),
  };

  return { ok: true, block };
}

/**
 * Trouve le bloc actif d'un établissement (le plus ancien d'abord, FIFO).
 * @param {object[]} blocks
 * @param {string} establishmentId
 * @returns {object|null}
 */
function findActiveBlock(blocks, establishmentId) {
  return (
    blocks
      .filter(
        (block) =>
          block.id_etablissement === establishmentId &&
          isBlockUsable(block)
      )
      .sort((a, b) => new Date(a.date_achat) - new Date(b.date_achat))[0] || null
  );
}

function isBlockUsable(block, now = Date.now()) {
  return (
    block.statut === 'active' &&
    block.conversations_consommees < block.nombre_conversations &&
    new Date(block.date_expiration).getTime() > now
  );
}

/**
 * Consomme une conversation d'un bloc. Opère par mutation.
 * @param {object[]} blocks
 * @param {string} establishmentId
 * @returns {{ ok: boolean, block?: object, reason?: string }}
 */
function consumeConversation(blocks, establishmentId) {
  const block = findActiveBlock(blocks, establishmentId);

  if (!block) {
    return { ok: false, reason: 'aucun_bloc_actif' };
  }

  block.conversations_consommees += 1;
  if (block.conversations_consommees >= block.nombre_conversations) {
    block.statut = 'epuise';
  }

  return { ok: true, block };
}

module.exports = {
  TARIFFS,
  BLOCK_VALIDITY_DAYS,
  resolveUnitPrice,
  createBlock,
  findActiveBlock,
  isBlockUsable,
  consumeConversation,
};
