const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');

const { loadCollection, saveCollection } = require('./src/store');
const { seedEstablishments } = require('./src/seed');
const attribution = require('./src/attribution');
const { buildWhatsappUrl } = require('./src/whatsapp');
const antifraud = require('./src/antifraud');
const billing = require('./src/billing');
const auth = require('./src/auth');
const establishmentsLib = require('./src/establishments');

const app = express();
const port = process.env.PORT || 3000;
app.set('trust proxy', true);

// ---------------------------------------------------------------------------
// Upload d'images (multer) : stockage sur disque dans public/uploads.
// ---------------------------------------------------------------------------
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_IMAGE = /^image\/(jpeg|jpg|png|webp|gif|avif)$/i;
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
      const unique = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
      cb(null, unique);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format non supporté : utilisez une image (jpg, png, webp, gif, avif)'));
    }
  },
});

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

/** Exige le rôle établissement (sinon 403). */
function requireEtablissement(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentification requise' });
  }
  if (req.user.role !== auth.ROLES.ETABLISSEMENT) {
    return res.status(403).json({ error: 'Accès réservé aux établissements' });
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
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;
  const page = establishments.slice(offset, offset + limit);
  res.json({
    items: page,
    total: establishments.length,
    limit,
    offset,
    hasMore: offset + page.length < establishments.length,
  });
});

app.get('/api/establishment/:id', (req, res) => {
  const establishment = establishments.find((item) => item.id === req.params.id);

  if (!establishment) {
    return res.status(404).json({ error: 'Établissement introuvable' });
  }

  return res.json(establishment);
});

app.post('/api/establishments', requireSuperAdmin, (req, res) => {
  const body = req.body || {};

  const error = establishmentsLib.validateEstablishmentInput(body);
  if (error) {
    return res.status(400).json({ error });
  }

  const id = establishmentsLib.str(body.id) || establishmentsLib.generateId(body.type);
  if (establishments.some((item) => item.id === id)) {
    return res.status(409).json({ error: 'Cet identifiant existe déjà' });
  }

  const establishment = establishmentsLib.buildEstablishment(body, id);

  establishments.push(establishment);
  persistEstablishments();

  return res.status(201).json(establishment);
});

// ---------------------------------------------------------------------------
// Inscription publique d'un établissement (création du compte + du profil).
// ---------------------------------------------------------------------------
app.post('/api/etablissements/inscription', upload.single('photo'), (req, res) => {
  const body = req.body || {};

  const required = ['email', 'password', 'nom', 'type', 'quartier', 'whatsapp'];
  const missing = required.filter((f) => typeof body[f] !== 'string' || !body[f].trim());
  if (missing.length > 0) {
    return res.status(400).json({ error: `Champs requis manquants : ${missing.join(', ')}` });
  }

  const emailNorm = body.email.trim().toLowerCase();
  if (users.find((u) => u.email === emailNorm)) {
    return res.status(409).json({ error: 'Cet email est déjà utilisé' });
  }

  const estError = establishmentsLib.validateEstablishmentInput(body);
  if (estError) {
    return res.status(400).json({ error: estError });
  }

  const establishmentId = establishmentsLib.generateId(body.type);
  if (establishments.some((item) => item.id === establishmentId)) {
    return res.status(409).json({ error: 'Cet identifiant existe déjà' });
  }

  const photoUrl = req.file ? '/uploads/' + req.file.filename : '';
  const establishment = establishmentsLib.buildEstablishment(
    { ...body, photo: photoUrl },
    establishmentId
  );
  establishments.push(establishment);
  persistEstablishments();

  const { salt, hash } = auth.hashPassword(body.password);
  const userId = `user_${Date.now().toString(36)}`;
  users.push({
    id: userId,
    email: emailNorm,
    password_hash: hash,
    password_salt: salt,
    role: auth.ROLES.ETABLISSEMENT,
    etablissementId: establishmentId,
    nom: body.nom,
    actif: true,
    date_creation: new Date().toISOString(),
  });
  persistUsers();

  return res.status(201).json({
    user: { id: userId, email: emailNorm, role: 'etablissement' },
    establishment,
  });
});

// Modification d'un établissement (réservé au super-admin).
app.put('/api/establishments/:id', requireSuperAdmin, (req, res) => {
  const index = establishments.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Établissement introuvable' });
  }

  const error = establishmentsLib.validateEstablishmentInput(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const existing = establishments[index];
  // On conserve la date d'ajout d'origine et le statut si non fourni.
  const updated = establishmentsLib.buildEstablishment(
    { ...req.body, date_ajout: existing.date_ajout, statut: req.body.statut || existing.statut },
    existing.id
  );

  establishments[index] = updated;
  persistEstablishments();

  return res.json(updated);
});

// ---------------------------------------------------------------------------
// Profil de l'établissement connecté (son propre établissement uniquement).
// ---------------------------------------------------------------------------
app.get('/api/etablissement/moi', requireEtablissement, (req, res) => {
  const establishment = establishments.find(
    (item) => item.id === req.user.etablissementId
  );
  if (!establishment) {
    return res.status(404).json({ error: 'Établissement introuvable' });
  }
  return res.json(establishment);
});

app.put('/api/etablissement/moi', requireEtablissement, (req, res) => {
  const index = establishments.findIndex(
    (item) => item.id === req.user.etablissementId
  );
  if (index === -1) {
    return res.status(404).json({ error: 'Établissement introuvable' });
  }

  const error = establishmentsLib.validateEstablishmentInput(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const existing = establishments[index];
  const updated = establishmentsLib.buildEstablishment(
    { ...req.body, date_ajout: existing.date_ajout },
    existing.id
  );

  establishments[index] = updated;
  persistEstablishments();

  return res.json(updated);
});

// ---------------------------------------------------------------------------
// Gestion des produits d'un établissement (propriétaire ou super-admin).
// ---------------------------------------------------------------------------
function findEstablishmentIndex(etablissementId) {
  return establishments.findIndex((item) => item.id === etablissementId);
}

function isOwnerOrSuperAdmin(req, etablissementId) {
  return (
    req.user.role === auth.ROLES.SUPER_ADMIN ||
    (req.user.role === auth.ROLES.ETABLISSEMENT &&
      req.user.etablissementId === etablissementId)
  );
}

// Lister les produits d'un établissement (public).
app.get('/api/etablissements/:etablissementId/produits', (req, res) => {
  const establishment = establishments.find(
    (item) => item.id === req.params.etablissementId
  );
  if (!establishment) {
    return res.status(404).json({ error: 'Établissement introuvable' });
  }
  return res.json(establishment.products || []);
});

// Ajouter un produit à un établissement.
app.post('/api/etablissements/:etablissementId/produits', requireAuth, (req, res) => {
  const index = findEstablishmentIndex(req.params.etablissementId);
  if (index === -1) {
    return res.status(404).json({ error: 'Établissement introuvable' });
  }
  if (!isOwnerOrSuperAdmin(req, req.params.etablissementId)) {
    return res.status(403).json({ error: 'Accès réservé au propriétaire ou au super-admin' });
  }

  const body = req.body || {};
  if (!body.nom || !body.prix) {
    return res.status(400).json({ error: 'nom et prix sont requis' });
  }

  const product = {
    id: `prod_${req.params.etablissementId}_${Date.now().toString(36)}`,
    id_etablissement: req.params.etablissementId,
    type_produit: body.type_produit || 'plat',
    nom: body.nom,
    prix: Number(body.prix) || 0,
    disponibilite: body.disponibilite || 'Disponible',
    photo: body.photo || '',
    description: body.description || '',
    tags: Array.isArray(body.tags) ? body.tags : [],
    statut: body.statut || 'actif',
  };

  establishments[index].products = establishments[index].products || [];
  establishments[index].products.push(product);
  persistEstablishments();

  return res.status(201).json(product);
});

// Modifier un produit d'un établissement.
app.put('/api/etablissements/:etablissementId/produits/:productId', requireAuth, (req, res) => {
  const index = findEstablishmentIndex(req.params.etablissementId);
  if (index === -1) {
    return res.status(404).json({ error: 'Établissement introuvable' });
  }
  if (!isOwnerOrSuperAdmin(req, req.params.etablissementId)) {
    return res.status(403).json({ error: 'Accès réservé au propriétaire ou au super-admin' });
  }

  const productIndex = establishments[index].products.findIndex(
    (p) => p.id === req.params.productId
  );
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Produit introuvable' });
  }

  const body = req.body || {};
  establishments[index].products[productIndex] = {
    ...establishments[index].products[productIndex],
    nom: body.nom || establishments[index].products[productIndex].nom,
    prix: body.prix !== undefined ? Number(body.prix) : establishments[index].products[productIndex].prix,
    disponibilite: body.disponibilite || establishments[index].products[productIndex].disponibilite,
    photo: body.photo || establishments[index].products[productIndex].photo,
    description: body.description || establishments[index].products[productIndex].description,
    tags: body.tags || establishments[index].products[productIndex].tags,
    statut: body.statut || establishments[index].products[productIndex].statut,
  };
  persistEstablishments();

  return res.json(establishments[index].products[productIndex]);
});

// Supprimer un produit d'un établissement.
app.delete('/api/etablissements/:etablissementId/produits/:productId', requireAuth, (req, res) => {
  const index = findEstablishmentIndex(req.params.etablissementId);
  if (index === -1) {
    return res.status(404).json({ error: 'Établissement introuvable' });
  }
  if (!isOwnerOrSuperAdmin(req, req.params.etablissementId)) {
    return res.status(403).json({ error: 'Accès réservé au propriétaire ou au super-admin' });
  }

  const productIndex = establishments[index].products.findIndex(
    (p) => p.id === req.params.productId
  );
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Produit introuvable' });
  }

  establishments[index].products.splice(productIndex, 1);
  persistEstablishments();

  return res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Stats du dashboard établissement (son propre rendement uniquement).
// ---------------------------------------------------------------------------
app.get('/api/etablissement/mes-stats', requireEtablissement, (req, res) => {
  const establishmentId = req.user.etablissementId;

  const estClicks = clickLogs.filter((c) => c.id_etablissement === establishmentId);
  const totalClicks = estClicks.length;
  const totalAttributed = estClicks.filter((c) => c.is_attributed).length;

  const estBlocks = blocks.filter((b) => b.id_etablissement === establishmentId);
  const totalPurchased = estBlocks.reduce((sum, b) => sum + b.nombre_conversations, 0);
  const totalConsumed = estBlocks.reduce((sum, b) => sum + b.conversations_consommees, 0);
  const totalRemaining = totalPurchased - totalConsumed;
  const totalRevenue = estBlocks.reduce((sum, b) => sum + b.montant_total, 0);

  const activeBlocks = estBlocks.filter((b) => b.statut === 'active');

  res.json({
    establishmentId,
    totalClicks,
    totalAttributed,
    conversion: totalClicks > 0 ? totalAttributed / totalClicks : 0,
    totalPurchased,
    totalConsumed,
    totalRemaining,
    totalRevenue,
    activeBlocks: activeBlocks.length,
    blocks: estBlocks,
    recentClicks: estClicks
      .slice()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10),
  });
});

// Suppression d'un établissement (réservé au super-admin).
app.delete('/api/establishments/:id', requireSuperAdmin, (req, res) => {
  const index = establishments.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Établissement introuvable' });
  }

  establishments.splice(index, 1);
  persistEstablishments();

  return res.json({ ok: true });
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

<<<<<<< HEAD
// ---------------------------------------------------------------------------
// Gestion des établissements (réservé au super-admin) + upload d'images
// ---------------------------------------------------------------------------
app.get('/manage', requirePageSuperAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manage.html'));
});

// Upload d'une image (réservé au super-admin) -> renvoie l'URL /uploads/<fichier>.
app.post('/api/upload', requireSuperAdmin, (req, res) => {
  const handler = upload.single('photo');
  handler(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload échoué' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }
    return res.json({ url: '/uploads/' + req.file.filename });
  });
});
=======
// ---------------------------------------------------------------------------
// Gestion des établissements (réservé au super-admin) + upload d'images
// ---------------------------------------------------------------------------
app.get('/manage', requirePageSuperAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manage.html'));
});

// Page d'inscription publique d'un établissement.
app.get('/inscription', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'inscription.html'));
});

// Page de profil établissement (protégée : tout utilisateur authentifié).
app.get('/profil-etablissement', requirePageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profil-etablissement.html'));
});

// Tableau de bord établissement (son propre rendement uniquement).
app.get('/etablissement-dashboard', requirePageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'etablissement-dashboard.html'));
});

// Upload d'une image (réservé au super-admin) -> renvoie l'URL /uploads/<fichier>.
app.post('/api/upload', requireSuperAdmin, (req, res) => {
  const handler = upload.single('photo');
  handler(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload échoué' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }
    return res.json({ url: '/uploads/' + req.file.filename });
  });
});
>>>>>>> refs/remotes/origin/main
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
