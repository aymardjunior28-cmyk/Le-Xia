const express = require('express');
const path = require('path');
const crypto = require('crypto');

const { loadCollection, saveCollection } = require('./src/store');
const { seedEstablishments } = require('./src/seed');
const attribution = require('./src/attribution');
const { buildWhatsappUrl } = require('./src/whatsapp');
const antifraud = require('./src/antifraud');
const billing = require('./src/billing');
const auth = require('./src/auth');

const app = express();
const port = process.env.PORT || 3000;
app.set('trust proxy', true);

// ---------------------------------------------------------------------------
// Sources de vérité persistées (JSON dans data/)
// ---------------------------------------------------------------------------
const establishments = loadCollection('establishments', seedEstablishments);
const clickLogs = loadCollection('clickLogs', []);
const blocks = loadCollection('blocks', []);
const users = loadCollection('users', []);
if (auth.ensureSuperAdmin(users)) {
  saveCollection('users', users);
  console.log(
    `[auth] Super-admin amorcé : ${auth.DEFAULT_SUPERADMIN.email} / ${auth.DEFAULT_SUPERADMIN.password} (à changer après connexion)`
  );
}

const persistEstablishments = () => saveCollection('establishments', establishments);
const persistClicks = () => saveCollection('clickLogs', clickLogs);
const persistBlocks = () => saveCollection('blocks', blocks);
const persistUsers = () => saveCollection('users', users);


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Retrouve un produit dans un établissement donné.
 */
function findProduct(establishmentId, productId) {
  const establishment = establishments.find((item) => item.id === establishmentId);
  if (!establishment) {
    return { establishment: null, product: null };
  }
  const product = (establishment.products || []).find((p) => p.id === productId);
  return { establishment, product };
}

/**
 * Extrait le canal d'origine depuis le User-Agent (web_mobile / web_desktop).
 */
function deriveChannel(userAgent) {
  if (!userAgent) {
    return 'unknown';
  }
  return /mobile|android|iphone|ipad/i.test(userAgent) ? 'web_mobile' : 'web_desktop';
}

/**
 * Valide les entrées minimales de /api/redirect.
 */
function validateRedirectBody(body) {
  if (!body || typeof body !== 'object') {
    return 'Corps de requête invalide';
  }
  if (!body.establishmentId || typeof body.establishmentId !== 'string') {
    return 'establishmentId est requis';
  }
  if (!body.productId || typeof body.productId !== 'string') {
    return 'productId est requis';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Authentification : sessions en mémoire (cookie httpOnly) + middlewares
// ---------------------------------------------------------------------------
const SESSION_COOKIE = 'dd_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours
const sessions = new Map(); // token -> { userId, createdAt }

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const key = pair.slice(0, idx).trim();
      out[key] = decodeURIComponent(pair.slice(idx + 1).trim());
    }
  });
  return out;
}

function findUserById(id) {
  return users.find((u) => u.id === id && u.actif !== false) || null;
}

/** Attache req.user si une session valide existe (ne bloque jamais). */
function attachUser(req, _res, next) {
  const token = parseCookies(req)[SESSION_COOKIE];
  const session = token && sessions.get(token);
  if (session) {
    const user = findUserById(session.userId);
    if (user) {
      req.user = user;
    } else {
      sessions.delete(token);
    }
  }
  next();
}

/** Exige une session authentifiée (sinon 401). */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentification requise' });
  }
  next();
}

/** Exige le rôle super-admin (sinon 403). */
function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentification requise' });
  }
  if (req.user.role !== auth.ROLES.SUPER_ADMIN) {
    return res.status(403).json({ error: 'Accès réservé au super-administrateur' });
  }
  next();
}

/** Garde de page HTML : redirige vers /login si non connecté. */
function requirePageAuth(req, res, next) {
  if (!req.user) {
    return res.redirect('/login');
  }
  next();
}

/** Garde de page HTML : réserve au super-admin (sinon redirection dashboard). */
function requirePageSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.redirect('/login');
  }
  if (req.user.role !== auth.ROLES.SUPER_ADMIN) {
    return res.redirect('/dashboard');
  }
  next();
}

function setSessionCookie(res, token) {
  const cookie =
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(
      SESSION_TTL_MS / 1000
    )}`;
  res.setHeader('Set-Cookie', cookie);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(attachUser);

// ---------------------------------------------------------------------------
// Authentification (login / logout / session courante)
// ---------------------------------------------------------------------------
app.get('/login', (req, res) => {
  if (req.user) {
    return res.redirect(req.user.role === auth.ROLES.SUPER_ADMIN ? '/dashboard' : '/dashboard');
  }
  return res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  return res.json({ user: auth.publicUser(req.user) });
});

app.post('/api/auth/login', (req, res) => {
  const email = auth.normalizeEmail(req.body && req.body.email);
  const password = req.body && req.body.password;

  const user = users.find((u) => u.email === email && u.actif !== false);
  if (!user || !auth.verifyPassword(password, user.password_salt, user.password_hash)) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { userId: user.id, createdAt: Date.now() });
  setSessionCookie(res, token);
  return res.json({ user: auth.publicUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (token) {
    sessions.delete(token);
  }
  clearSessionCookie(res);
  return res.json({ ok: true });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'douala-discovery-mvp' });
});

app.get('/api/establishments', (req, res) => {
  res.json(establishments);
});

app.get('/api/establishment/:id', (req, res) => {
  const establishment = establishments.find((item) => item.id === req.params.id);

  if (!establishment) {
    return res.status(404).json({ error: 'Établissement introuvable' });
  }

  return res.json(establishment);
});

app.post('/api/establishments', (req, res) => {
  const body = req.body || {};

  // Validation minimale conforme à la fiche établissement (§8.1).
  const required = ['nom', 'type', 'quartier', 'whatsapp'];
  const missing = required.filter((field) => !body[field] || typeof body[field] !== 'string');
  if (missing.length > 0) {
    return res.status(400).json({ error: `Champs requis manquants : ${missing.join(', ')}` });
  }
  if (!['restaurant', 'meuble'].includes(body.type)) {
    return res.status(400).json({ error: 'type doit être "restaurant" ou "meuble"' });
  }

  const now = new Date().toISOString();
  const establishment = {
    id: body.id || `${body.type === 'restaurant' ? 'rest' : 'meuble'}_${Date.now()}`,
    nom: body.nom.trim(),
    type: body.type,
    statut: 'actif',
    quartier: body.quartier.trim(),
    adresse: body.adresse || '',
    whatsapp: String(body.whatsapp).replace(/[^\d]/g, ''),
    categorie: body.categorie || '',
    visibilites: body.visibilites || ['home_feed'],
    date_ajout: now,
    date_maj: now,
    products: Array.isArray(body.products) ? body.products : [],
  };

  // Rattache chaque produit à son établissement.
  establishment.products = establishment.products.map((product, index) => ({
    id: product.id || `prod_${establishment.id}_${index + 1}`,
    id_etablissement: establishment.id,
    type_produit: product.type_produit || 'plat',
    nom: product.nom || 'Produit',
    prix: Number(product.prix) || 0,
    disponibilite: product.disponibilite || '',
    photo: product.photo || '',
    description: product.description || '',
    tags: product.tags || [],
    statut: 'actif',
  }));

  establishments.push(establishment);
  persistEstablishments();

  return res.status(201).json(establishment);
});

app.post('/api/blocks', (req, res) => {
  const body = req.body || {};

  const establishment = establishments.find((item) => item.id === body.establishmentId);
  if (!establishment) {
    return res.status(404).json({ error: 'Établissement introuvable' });
  }

  const result = billing.createBlock({
    establishmentId: body.establishmentId,
    verticale: establishment.type,
    nombreConversations: body.nombreConversations,
    prixUnitaire: body.prixUnitaire,
  });

  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }

  blocks.push(result.block);
  persistBlocks();

  return res.status(201).json(result.block);
});

app.post('/api/redirect', (req, res) => {
  const validationError = validateRedirectBody(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { establishmentId, productId } = req.body;
  const source =
    typeof req.body.source === 'string' && req.body.source.trim() ? req.body.source : 'home_feed';
  const sessionId =
    typeof req.body.sessionId === 'string' && req.body.sessionId.trim()
      ? req.body.sessionId
      : `session_${Date.now()}`;

  const { establishment, product } = findProduct(establishmentId, productId);

  if (!establishment || !product) {
    return res.status(404).json({ error: 'Établissement ou produit introuvable' });
  }

  const userAgent = req.headers['user-agent'];

  // Anti-fraude simple : bots, doublons, bursts.
  const fraudCheck = antifraud.evaluateClick({
    clickLogs,
    sessionId,
    productId,
    userAgent,
  });

  if (!fraudCheck.allowed) {
    return res.status(429).json({ error: 'Clic refusé', reason: fraudCheck.reason });
  }

  // Création de l'événement de clic (statut "pending").
  const clickEvent = attribution.createClickEvent({
    establishmentId,
    productId,
    source,
    canal: deriveChannel(userAgent),
    sessionId,
    urlSource: req.headers.referer || req.headers.referrer || null,
    zoneGeo: establishment.quartier || null,
    ip: req.ip,
  });

  // Le lien WhatsApp étant effectivement servi, la conversation est attribuée.
  const attributedClick = attribution.markAttributed(clickEvent);

  // Journalisation serveur (append) + persistance immuable sur disque.
  clickLogs.push(attributedClick);
  persistClicks();

  // Consommation du bloc prépayé de l'établissement (facturation réelle).
  const consumption = billing.consumeConversation(blocks, establishmentId);
  if (consumption.ok) {
    persistBlocks();
  }

  const whatsappUrl = buildWhatsappUrl(establishment.whatsapp, attributedClick.id_clic, establishment.nom);

  res.json({
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
});

app.get('/api/dashboard', requireAuth, (req, res) => {
  // On expose les totaux de base + les collections brutes et les blocs.
  // L'agrégation avancée (§9) est faite côté client dans dashboard.js (Étape 3).
  const stats = {
    totalEstablishments: establishments.length,
    totalClicks: clickLogs.length,
    totalAttributed: clickLogs.filter((click) => click.is_attributed).length,
    totalRevenue: blocks.reduce((sum, block) => sum + block.montant_total, 0),
    activeBlocks: blocks.filter((block) => block.statut === 'active').length,
  };

  res.json({
    stats,
    establishments,
    blocks,
    clicks: clickLogs,
  });
});

app.get('/dashboard', requirePageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ---------------------------------------------------------------------------
// Gestion des comptes administrateurs (réservé au super-admin)
// ---------------------------------------------------------------------------
app.get('/admins', requirePageSuperAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admins.html'));
});

// GET  /api/admin/users          -> liste des comptes (super-admin)
// POST /api/admin/users          -> créer un admin
// PATCH /api/admin/users/:id     -> activer / désactiver
// DELETE /api/admin/users/:id    -> supprimer
app.get('/api/admin/users', requireSuperAdmin, (req, res) => {
  const list = users.map((u) => ({
    ...auth.publicUser(u),
    is_you: u.id === req.user.id,
  }));
  return res.json(list);
});

app.post('/api/admin/users', requireSuperAdmin, (req, res) => {
  const body = req.body || {};
  const email = auth.normalizeEmail(body.email);

  if (users.some((u) => u.email === email)) {
    return res.status(409).json({ error: 'Cet email est déjà utilisé' });
  }

  // Via l'UI, un super-admin crée uniquement des comptes "admin".
  const role = auth.ROLES.ADMIN;

  const result = auth.buildUser({
    email,
    nom: body.nom,
    password: body.password,
    role,
  });

  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }

  users.push(result.user);
  persistUsers();
  return res.status(201).json(auth.publicUser(result.user));
});

app.patch('/api/admin/users/:id', requireSuperAdmin, (req, res) => {
  const target = users.find((u) => u.id === req.params.id);
  if (!target) {
    return res.status(404).json({ error: 'Compte introuvable' });
  }
  if (target.id === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre compte ici' });
  }

  if (typeof body_actif(req) === 'boolean') {
    // Empêche de désactiver le dernier super-admin encore actif.
    if (
      target.role === auth.ROLES.SUPER_ADMIN &&
      body_actif(req) === false &&
      users.filter((u) => u.role === auth.ROLES.SUPER_ADMIN && u.actif !== false).length <= 1
    ) {
      return res.status(400).json({ error: 'Impossible de désactiver le dernier super-admin' });
    }
    target.actif = body_actif(req);
  }

  persistUsers();
  return res.json(auth.publicUser(target));
});

app.delete('/api/admin/users/:id', requireSuperAdmin, (req, res) => {
  const index = users.findIndex((u) => u.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Compte introuvable' });
  }
  const target = users[index];
  if (target.id === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }
  if (
    target.role === auth.ROLES.SUPER_ADMIN &&
    users.filter((u) => u.role === auth.ROLES.SUPER_ADMIN).length <= 1
  ) {
    return res.status(400).json({ error: 'Impossible de supprimer le dernier super-admin' });
  }

  users.splice(index, 1);
  persistUsers();
  return res.json({ ok: true });
});

// Helper local : lit { actif: boolean } du body de PATCH.
function body_actif(req) {
  const v = req.body && req.body.actif;
  return typeof v === 'boolean' ? v : null;
}

// API fiche produit dédiée (§10.2).
app.get('/api/product/:establishmentId/:productId', (req, res) => {
  const { establishment, product } = findProduct(req.params.establishmentId, req.params.productId);

  if (!establishment || !product) {
    return res.status(404).json({ error: 'Produit introuvable' });
  }

  return res.json({
    establishment: {
      id: establishment.id,
      nom: establishment.nom,
      type: establishment.type,
      quartier: establishment.quartier,
      adresse: establishment.adresse,
      whatsapp: establishment.whatsapp,
      categorie: establishment.categorie,
    },
    product,
  });
});

// Page fiche produit (§10.2).
app.get('/produit/:establishmentId/:productId', (req, res) => {
  const { establishment, product } = findProduct(req.params.establishmentId, req.params.productId);

  if (!establishment || !product) {
    return res.status(404).send('Produit introuvable');
  }

  res.sendFile(path.join(__dirname, 'public', 'product.html'));
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Douala Discovery MVP running at http://localhost:${port}`);
});
