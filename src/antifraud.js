/**
 * Anti-fraude simple (§12.3 du cahier des charges).
 *
 * Objectif MVP : écarter les cas grossiers sans construire un moteur lourd.
 * Trois contrôles :
 *  1. Détection de bots via User-Agent.
 *  2. Doublons : même session + même produit dans une fenêtre très courte.
 *  3. Sessions répétées : trop de clics d'une même session sur une courte période.
 */

const DEFAULT_CONFIG = {
  duplicateWindowMs: 10 * 1000, // 10 s : même session + même produit = doublon
  burstWindowMs: 60 * 1000, // 1 min : nombre de clics max par session
  burstMaxClicks: 12,
  botPatterns: /(bot|crawler|spider|crawl|curl|wget|python-requests|scrapy|headless)/i,
};

/**
 * Retourne true si le User-Agent ressemble à un bot / script automatisé.
 * @param {string} userAgent
 * @returns {boolean}
 */
function looksLikeBot(userAgent) {
  if (!userAgent || userAgent.trim() === '') {
    return true; // Pas d'UA : suspect par défaut.
  }
  return DEFAULT_CONFIG.botPatterns.test(userAgent);
}

/**
 * Détecte un doublon : même session_id + même produit dans une fenêtre courte.
 * @param {object[]} clickLogs Journal existant
 * @param {string} sessionId
 * @param {string} productId
 * @param {number} [now]
 * @returns {boolean}
 */
function isDuplicate(clickLogs, sessionId, productId, now = Date.now()) {
  return clickLogs.some((click) => {
    if (click.session_id !== sessionId || click.id_produit !== productId) {
      return false;
    }
    const ts = new Date(click.timestamp).getTime();
    return now - ts <= DEFAULT_CONFIG.duplicateWindowMs;
  });
}

/**
 * Détecte un burst : une session qui clique un nombre excessif de fois
 * dans une fenêtre courte.
 * @param {object[]} clickLogs
 * @param {string} sessionId
 * @param {number} [now]
 * @returns {boolean}
 */
function isBurst(clickLogs, sessionId, now = Date.now()) {
  const recent = clickLogs.filter((click) => {
    if (click.session_id !== sessionId) {
      return false;
    }
    const ts = new Date(click.timestamp).getTime();
    return now - ts <= DEFAULT_CONFIG.burstWindowMs;
  });
  return recent.length >= DEFAULT_CONFIG.burstMaxClicks;
}

/**
 * Évalue un clic entrant.
 * @param {object} params
 * @param {object[]} params.clickLogs
 * @param {string} params.sessionId
 * @param {string} params.productId
 * @param {string} params.userAgent
 * @returns {{ allowed: boolean, reason?: string }}
 */
function evaluateClick({ clickLogs, sessionId, productId, userAgent }) {
  if (looksLikeBot(userAgent)) {
    return { allowed: false, reason: 'bot_or_missing_user_agent' };
  }
  if (isDuplicate(clickLogs, sessionId, productId)) {
    return { allowed: false, reason: 'duplicate_click' };
  }
  if (isBurst(clickLogs, sessionId)) {
    return { allowed: false, reason: 'burst_session' };
  }
  return { allowed: true };
}

const __api = {
  DEFAULT_CONFIG,
  looksLikeBot,
  isDuplicate,
  isBurst,
  evaluateClick,
};

// Double export : CommonJS (serveur Node) + global navigateur (app offline/Capacitor).
(function (root) {
  if (typeof module !== 'undefined' && module.exports) module.exports = __api;
  root.DDantifraud = __api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
