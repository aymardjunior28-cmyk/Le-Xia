/**
 * offline/store.local.js — Persistance 100% locale pour l'app Android.
 *
 * Remplace src/store.js (système de fichiers Node) par localStorage.
 * Les images sont stockées en dataURL directement (simplicité ; suffisant
 * pour une démo avec quelques établissements).
 *
 * Expose window.DDStore.
 */
(function (root) {
  'use strict';

  const PREFIX = 'dd_';

  const hasLocalStorage = (() => {
    try {
      const k = PREFIX + '__probe__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  })();

  // Repli mémoire si localStorage est indisponible (évite un crash).
  const memoryFallback = {};

  /**
   * Charge une collection nommée. Renvoie un tableau (copie).
   * @param {string} name
   * @returns {Array}
   */
  function loadCollection(name) {
    try {
      const raw = hasLocalStorage ? localStorage.getItem(PREFIX + name) : memoryFallback[name];
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.warn('[store.local] Lecture impossible pour', name, err);
      return [];
    }
  }

  /**
   * Persiste une collection (écriture complète).
   * @param {string} name
   * @param {Array} data
   */
  function saveCollection(name, data) {
    try {
      const str = JSON.stringify(data);
      if (hasLocalStorage) {
        localStorage.setItem(PREFIX + name, str);
      } else {
        memoryFallback[name] = str;
      }
    } catch (err) {
      console.error('[store.local] Sauvegarde échouée pour', name, err);
    }
  }

  /**
   * "Stocke" une image. En local, la dataURL EST l'URL affichable : on la
   * renvoie telle quelle (elle sera persistée avec l'établissement/produit).
   * @param {string} dataURL
   * @returns {Promise<string>}
   */
  async function saveImage(dataURL) {
    return dataURL;
  }

  /** Identité asynchrone : les images sont déjà des dataURL/URL http. */
  async function hydrateImages(value) {
    return value;
  }

  root.DDStore = {
    PREFIX,
    loadCollection,
    saveCollection,
    saveImage,
    hydrateImages,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

