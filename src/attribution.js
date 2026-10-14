/**
 * Service d'attribution — cœur du produit.
 *
 * Règles (cf. cahier des charges §7 et §11) :
 *  - Chaque clic produit un identifiant unique au format YYYYMMDD_HHMMSS_xxxx.
 *  - Une conversation n'est "attribuée" que via l'identifiant de clic.
 *  - Le statut suit le cycle : pending -> attributed.
 *  - Le clic est journalisé côté serveur.
 *
 * LIMITE MVP ASSUMÉE : la confirmation réelle de l'ouverture de la conversation
 * WhatsApp n'est pas observable sans callback (WhatsApp Business API). Au stade
 * MVP, on marque la conversation "attributed" au moment où le lien WhatsApp est
 * effectivement servi au client. Le modèle de données conserve `status`,
 * `conversationOpenedAt` et `id_conversation` pour brancher ultérieurement une
 * validation temps réel sans changer le schéma.
 */

/**
 * Génère un identifiant de clic unique, lisible et triable chronologiquement.
 * Format : 20261012_145233_89f2
 * @param {Date} [date]
 * @returns {string}
 */
function generateClickId(date = new Date()) {
  const pad = (n, len = 2) => String(n).padStart(len, '0');

  const yyyy = date.getUTCFullYear();
  const MM = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const HH = pad(date.getUTCHours());
  const mm = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  const rand = Math.random().toString(16).slice(2, 6);

  return `${yyyy}${MM}${dd}_${HH}${mm}${ss}_${rand}`;
}

/**
 * Génère un identifiant de conversation stable rattaché à un clic.
 * @param {string} clickId
 * @returns {string}
 */
function generateConversationId(clickId) {
  return `conv_${clickId}`;
}

/**
 * Crée un événement de clic complet conforme au cahier des charges (§5.1 / §8.3).
 * @param {object} params
 * @param {string} params.establishmentId
 * @param {string} params.productId
 * @param {string} params.source Source de trafic (ex: "home_feed", "social")
 * @param {string} params.canal Canal d'origine (ex: "web_mobile", "web_desktop")
 * @param {string} params.sessionId Identifiant de session utilisateur
 * @param {string} [params.userId] Identifiant utilisateur si connu
 * @param {string} [params.urlSource] URL d'origine (Referer)
 * @param {string} [params.zoneGeo] Quartier / zone géographique
 * @param {string} [params.ip] Adresse IP (pour l'anti-fraude)
 * @returns {object} Événement de clic, statut "pending"
 */
function createClickEvent({
  establishmentId,
  productId,
  source,
  canal,
  sessionId,
  userId = null,
  urlSource = null,
  zoneGeo = null,
  ip = null,
}) {
  const timestamp = new Date().toISOString();
  const clickId = generateClickId();

  return {
    id_clic: clickId,
    id_etablissement: establishmentId,
    id_produit: productId,
    id_utilisateur: userId,
    source,
    canal,
    zone_geo: zoneGeo,
    url_source: urlSource,
    session_id: sessionId,
    ip,
    timestamp,
    is_attributed: false,
    id_conversation: null,
    status: 'pending',
    conversation_opened_at: null,
  };
}

/**
 * Marque une conversation comme attribuée et facturable.
 * Opère sur une copie (le journal reste une source append-only dans store.js).
 * @param {object} click Événement de clic "pending"
 * @returns {object} Événement mis à jour, statut "attributed"
 */
function markAttributed(click) {
  if (click.status === 'attributed') {
    return click;
  }

  return {
    ...click,
    status: 'attributed',
    is_attributed: true,
    id_conversation: generateConversationId(click.id_clic),
    conversation_opened_at: new Date().toISOString(),
  };
}

module.exports = {
  generateClickId,
  generateConversationId,
  createClickEvent,
  markAttributed,
};
