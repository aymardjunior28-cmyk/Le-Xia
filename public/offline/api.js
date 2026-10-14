/**
 * offline/api.js — API 100% locale pour l'app Android offline.
 *
 * Intercepte window.fetch pour les URL commençant par "/api/" et les traite
 * entièrement sur l'appareil (aucun serveur). Les autres fetch passent à
 * l'implémentation d'origine.
 *
 * Réutilise la logique métier pure : DDattribution, DDantifraud, DDbilling,
 * DDestablishments, DDwhatsapp, DDseed, plus DDStore et DDAuth (locaux).
 *
 * Expose window.DDapi (pratique pour tests) et installe le shim fetch.
 */
(function (root) {
  'use strict';

  const A = root.DDattribution;
  const AF = root.DDantifraud;
  const B = root.DDbilling;
  const EL = root.DDestablishments;
  const WA = root.DDwhatsapp;
  const SEED = root.DDseed;
  const Store = root.DDStore;
  const Auth = root.DDAuth;

  let establishments = [];
  let clickLogs = [];
  let blocks = [];
  let users = [];

  async function init() {
    establishments = Store.loadCollection('establishments');
    if (establishments.length === 0) {
      establishments = JSON.parse(JSON.stringify(SEED.seedEstablishments));
      Store.saveCollection('establishments', establishments);
    }
    clickLogs = Store.loadCollection('clickLogs');
    blocks = Store.loadCollection('blocks');
    users = Store.loadCollection('users');
    if (await Auth.ensureSuperAdmin(users)) {
      Store.saveCollection('users', users);
    }
  }
  const ready = init();

  const persistEstablishments = () => Store.saveCollection('establishments', establishments);
  const persistClicks = () => Store.saveCollection('clickLogs', clickLogs);
  const persistBlocks = () => Store.saveCollection('blocks', blocks);

  function currentUser() {
    const id = Auth.getSessionUserId();
    return users.find((u) => u.id === id && u.actif !== false) || null;
  }

  function findProduct(establishmentId, productId) {
    const establishment = establishments.find((item) => item.id === establishmentId) || null;
    if (!establishment) return { establishment: null, product: null };
    const product = (establishment.products || []).find((p) => p.id === productId) || null;
    return { establishment, product };
  }

  function deriveChannel(userAgent) {
    if (!userAgent) return 'unknown';
    return /mobile|android|iphone|ipad/i.test(userAgent) ? 'web_mobile' : 'web_desktop';
  }

  // ---- Réponses compatibles avec l'API Response utilisée par le front ----
  function jsonResponse(status, data) {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => data,
      headers: { get: () => null },
    };
  }

  // ---- Endpoints auth ----
  async function authMe() {
    const user = currentUser();
    if (!user) return jsonResponse(401, { error: 'Non authentifié' });
    return jsonResponse(200, { user: Auth.publicUser(user) });
  }

  async function authLogin(body) {
    const email = Auth.normalizeEmail(body && body.email);
    const password = body && body.password;
    const user = users.find((u) => u.email === email && u.actif !== false);
    if (!user || !(await Auth.verifyPassword(password, user.password_salt, user.password_hash))) {
      return jsonResponse(401, { error: 'Identifiants invalides' });
    }
    Auth.setSession(user);
    return jsonResponse(200, { user: Auth.publicUser(user) });
  }

  function authLogout() {
    Auth.clearSession();
    return jsonResponse(200, { ok: true });
  }

  // ---- Endpoints établissements ----
  async function listEstablishments() {
    return jsonResponse(200, await Store.hydrateImages(establishments));
  }

  async function getEstablishment(id) {
    const est = establishments.find((item) => item.id === id);
    if (!est) return jsonResponse(404, { error: 'Établissement introuvable' });
    return jsonResponse(200, await Store.hydrateImages(est));
  }

  async function getProduct(establishmentId, productId) {
    const { establishment, product } = findProduct(establishmentId, productId);
    if (!establishment || !product) return jsonResponse(404, { error: 'Produit introuvable' });
    return jsonResponse(200, {
      establishment: {
        id: establishment.id,
        nom: establishment.nom,
        type: establishment.type,
        quartier: establishment.quartier,
        adresse: establishment.adresse,
        whatsapp: establishment.whatsapp,
        categorie: establishment.categorie,
        note: establishment.note,
      },
      product: await Store.hydrateImages(product),
    });
  }

  async function createEstablishment(user, body) {
    const error = EL.validateEstablishmentInput(body);
    if (error) return jsonResponse(400, { error });
    const id = EL.str(body.id) || EL.generateId(body.type);
    if (establishments.some((item) => item.id === id)) {
      return jsonResponse(409, { error: 'Cet identifiant existe déjà' });
    }
    const establishment = EL.buildEstablishment(body, id);
    establishments.push(establishment);
    persistEstablishments();
    return jsonResponse(201, establishment);
  }

  async function updateEstablishment(user, id, body) {
    const index = establishments.findIndex((item) => item.id === id);
    if (index === -1) return jsonResponse(404, { error: 'Établissement introuvable' });
    const error = EL.validateEstablishmentInput(body);
    if (error) return jsonResponse(400, { error });
    const existing = establishments[index];
    const updated = EL.buildEstablishment(
      { ...body, date_ajout: existing.date_ajout, statut: body.statut || existing.statut },
      existing.id
    );
    establishments[index] = updated;
    persistEstablishments();
    return jsonResponse(200, updated);
  }

  function deleteEstablishment(user, id) {
    const index = establishments.findIndex((item) => item.id === id);
    if (index === -1) return jsonResponse(404, { error: 'Établissement introuvable' });
    establishments.splice(index, 1);
    persistEstablishments();
    return jsonResponse(200, { ok: true });
  }

  async function getDashboard(user) {
    const stats = {
      totalEstablishments: establishments.length,
      totalClicks: clickLogs.length,
      totalAttributed: clickLogs.filter((click) => click.is_attributed).length,
      totalRevenue: blocks.reduce((sum, block) => sum + block.montant_total, 0),
      activeBlocks: blocks.filter((block) => block.statut === 'active').length,
    };
    return jsonResponse(200, {
      stats,
      establishments: await Store.hydrateImages(establishments),
      blocks,
      clicks: clickLogs,
    });
  }

  // ---- Redirection attribuée (WhatsApp) : reproduit la route serveur ----
  async function redirect(body, userAgent) {
    const { establishmentId, productId } = body || {};
    if (!establishmentId || !productId) {
      return jsonResponse(400, { error: 'establishmentId et productId sont requis' });
    }
    const { establishment, product } = findProduct(establishmentId, productId);
    if (!establishment || !product) {
      return jsonResponse(404, { error: 'Établissement ou produit introuvable' });
    }

    const source = body.source && String(body.source).trim() ? body.source : 'home_feed';
    const sessionId =
      body.sessionId && String(body.sessionId).trim()
        ? body.sessionId
        : `session_${Date.now()}`;

    const fraudCheck = AF.evaluateClick({ clickLogs, sessionId, productId, userAgent });
    if (!fraudCheck.allowed) {
      return jsonResponse(429, { error: 'Clic refusé', reason: fraudCheck.reason });
    }

    const clickEvent = A.createClickEvent({
      establishmentId,
      productId,
      source,
      canal: deriveChannel(userAgent),
      sessionId,
      urlSource: null,
      zoneGeo: establishment.quartier || null,
      ip: null,
    });
    const attributedClick = A.markAttributed(clickEvent);

    clickLogs.push(attributedClick);
    persistClicks();

    const consumption = B.consumeConversation(blocks, establishmentId);
    if (consumption.ok) persistBlocks();

    const whatsappUrl = WA.buildWhatsappUrl(
      establishment.whatsapp,
      attributedClick.id_clic,
      establishment.nom
    );

    return jsonResponse(200, {
      clickId: attributedClick.id_clic,
      whatsappUrl,
      establishment: {
        id: establishment.id,
        name: establishment.nom,
        type: establishment.type,
        price: product.prix,
      },
      billing: {
        consumed: consumption.ok,
        reason: consumption.reason || null,
        blockId: consumption.block ? consumption.block.id_bloc : null,
        remaining: consumption.block
          ? consumption.block.nombre_conversations - consumption.block.conversations_consommees
          : 0,
      },
    });
  }

  // ---- Upload d'image : convertit le fichier en dataURL et le stocke ----
  async function upload(formData, user) {
    if (!user) return jsonResponse(401, { error: 'Authentification requise' });
    const file = formData && formData.get ? formData.get('photo') : null;
    if (!file) return jsonResponse(400, { error: 'Aucun fichier reçu' });

    const dataURL = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const url = await Store.saveImage(dataURL);
    return jsonResponse(200, { url });
  }

  async function readJsonBody(init) {
    if (!init || init.body == null) return {};
    if (typeof init.body === 'string') {
      try {
        return JSON.parse(init.body);
      } catch (e) {
        return {};
      }
    }
    return init.body;
  }

  // ---- Routeur principal ----
  async function handle(url, method, init) {
    await ready;
    let path = String(url);
    const qIndex = path.indexOf('?');
    if (qIndex !== -1) path = path.slice(0, qIndex);
    const apiIndex = path.indexOf('/api/');
    if (apiIndex !== -1) path = path.slice(apiIndex);
    path = path.replace(/\/+$/, '') || '/api';

    const user = currentUser();

    // auth
    if (path === '/api/auth/me' && method === 'GET') return authMe();
    if (path === '/api/auth/login' && method === 'POST') return authLogin(await readJsonBody(init));
    if (path === '/api/auth/logout' && method === 'POST') return authLogout();

    // dashboard (protégé)
    if (path === '/api/dashboard' && method === 'GET') {
      if (!user) return jsonResponse(401, { error: 'Authentification requise' });
      return getDashboard(user);
    }

    // upload (protégé super-admin) — FormData
    if (path === '/api/upload' && method === 'POST') {
      if (!user) return jsonResponse(401, { error: 'Authentification requise' });
      if (user.role !== Auth.ROLES.SUPER_ADMIN) {
        return jsonResponse(403, { error: 'Accès réservé au super-administrateur' });
      }
      return upload(init && init.body, user);
    }

    // redirect (public)
    if (path === '/api/redirect' && method === 'POST') {
      const body = await readJsonBody(init);
      const ua = root.navigator && root.navigator.userAgent;
      return redirect(body, ua);
    }

    // product détail (public)
    const productMatch = path.match(/^\/api\/product\/([^/]+)\/([^/]+)$/);
    if (productMatch && method === 'GET') {
      return getProduct(decodeURIComponent(productMatch[1]), decodeURIComponent(productMatch[2]));
    }

    // establishments
    if (path === '/api/establishments') {
      if (method === 'GET') return listEstablishments();
      if (method === 'POST') {
        if (!user) return jsonResponse(401, { error: 'Authentification requise' });
        if (user.role !== Auth.ROLES.SUPER_ADMIN) {
          return jsonResponse(403, { error: 'Accès réservé au super-administrateur' });
        }
        return createEstablishment(user, await readJsonBody(init));
      }
    }

    const estMatch = path.match(/^\/api\/establishments\/([^/]+)$/);
    if (estMatch) {
      const id = decodeURIComponent(estMatch[1]);
      if (method === 'PUT') {
        if (!user) return jsonResponse(401, { error: 'Authentification requise' });
        if (user.role !== Auth.ROLES.SUPER_ADMIN) {
          return jsonResponse(403, { error: 'Accès réservé au super-administrateur' });
        }
        return updateEstablishment(user, id, await readJsonBody(init));
      }
      if (method === 'DELETE') {
        if (!user) return jsonResponse(401, { error: 'Authentification requise' });
        if (user.role !== Auth.ROLES.SUPER_ADMIN) {
          return jsonResponse(403, { error: 'Accès réservé au super-administrateur' });
        }
        return deleteEstablishment(user, id);
      }
    }

    const estSingle = path.match(/^\/api\/establishment\/([^/]+)$/);
    if (estSingle && method === 'GET') {
      return getEstablishment(decodeURIComponent(estSingle[1]));
    }

    // Route /api inconnue : null => le shim retentera le fetch d'origine.
    return null;
  }

  // ---- Installation du shim fetch ----
  function installFetchShim() {
    if (root.__ddFetchShimInstalled) return;
    root.__ddFetchShimInstalled = true;
    const originalFetch = root.fetch ? root.fetch.bind(root) : null;

    root.fetch = async function (input, init) {
      const url = typeof input === 'string' ? input : input && input.url ? input.url : String(input);
      const method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();

      // On n'intercepte que les appels à notre API.
      if (url.indexOf('/api/') === -1) {
        return originalFetch ? originalFetch(input, init) : Promise.reject(new Error('fetch indisponible'));
      }

      try {
        const res = await handle(url, method, init || {});
        if (res) return res;
      } catch (err) {
        console.error('[offline/api] erreur', err);
        return jsonResponse(500, { error: 'Erreur interne' });
      }
      return originalFetch ? originalFetch(input, init) : jsonResponse(404, { error: 'Non trouvé' });
    };
  }

  installFetchShim();

  root.DDapi = { handle, ready };
})(typeof globalThis !== 'undefined' ? globalThis : this);


