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
app.set('trust proxy', process.env.TRUST_PROXY === 'true');

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
const hasSuperAdmin = users.some((user) => user.role === auth.ROLES.SUPER_ADMIN);
const hasLegacySuperAdmin = users.some(
  (user) =>
    user.role === auth.ROLES.SUPER_ADMIN &&
    auth.normalizeEmail(user.email) === 'superadmin@douala.cm'
);
let superAdminConfig = {
  email: process.env.SUPERADMIN_EMAIL,
  password: process.env.SUPERADMIN_PASSWORD,
};
let generatedSuperAdminPassword;
if (
  (!hasSuperAdmin || hasLegacySuperAdmin) &&
  !superAdminConfig.email &&
  !superAdminConfig.password
) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('En production, configure SUPERADMIN_EMAIL et SUPERADMIN_PASSWORD avant le démarrage.');
  }
  superAdminConfig = {
    email: 'superadmin@localhost.local',
    password: crypto.randomBytes(24).toString('base64url'),
  };
  generatedSuperAdminPassword = superAdminConfig.password;
}
if (auth.ensureSuperAdmin(users, superAdminConfig)) {
  saveCollection('users', users);
  if (generatedSuperAdminPassword) {
    console.warn(
      `[auth] Compte super-admin local créé : ${superAdminConfig.email} / ${generatedSuperAdminPassword}\n` +
      '[auth] Conservez ce mot de passe ; il ne sera plus affiché après ce démarrage.'
    );
  } else {
    console.log('[auth] Compte super-admin initialisé depuis la configuration.');
  }
}

const persistEstablishments = () => saveCollection('establishments', establishments);
const persistClicks = () => saveCollection('clickLogs', clickLogs);
const persistBlocks = () => saveCollection('blocks', blocks);
const persistUsers = () => saveCollection('users', users);
let pointsBalanceMigrated = false;
establishments.forEach((establishment) => {
  if (!Number.isSafeInteger(establishment.points_solde) || establishment.points_solde < 0) {
    establishment.points_solde = establishmentsLib.INITIAL_POINTS_BALANCE;
    pointsBalanceMigrated = true;
  }
});
if (pointsBalanceMigrated) persistEstablishments();

function mutateAndPersistMany(changes) {
  const snapshots = changes.map(({ collection, skipSnapshot }) =>
    skipSnapshot ? null : structuredClone(collection)
  );
  let savedCount = 0;
  try {
    changes.forEach(({ mutate }) => mutate());
    for (const change of changes) {
      change.persist();
      savedCount += 1;
    }
  } catch (err) {
    changes.forEach(({ collection }, index) => {
      if (snapshots[index] === null) {
        changes[index].rollback();
        return;
      }
      collection.length = 0;
      snapshots[index].forEach((item) => collection.push(item));
    });
    for (let index = 0; index < savedCount; index += 1) {
      if (snapshots[index] === null) continue;
      try {
        changes[index].persistSnapshot(snapshots[index]);
      } catch (rollbackError) {
        console.error(`[store] Échec du rollback : ${rollbackError.message}`);
      }
    }
    throw err;
  }
}

function mutateAndPersist(collection, persist, mutate, persistSnapshot) {
  mutateAndPersistMany([{ collection, persist, mutate, persistSnapshot }]);
}


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

function publicEstablishment(establishment) {
  const { points_solde: pointsBalance, ...publicData } = establishment;
  return {
    ...publicData,
    points_actifs: Number.isSafeInteger(pointsBalance) && pointsBalance >= 50,
  };
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
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const key = pair.slice(0, idx).trim();
      try {
        out[key] = decodeURIComponent(pair.slice(idx + 1).trim());
      } catch (err) {
        out[key] = '';
      }
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
    if (Date.now() - session.createdAt >= SESSION_TTL_MS) {
      sessions.delete(token);
      return next();
    }
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

/** Garde de page HTML : réserve au super-admin (sinon redirection dashboard). */
function requirePageSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.redirect('/login');
  }
  if (req.user.role !== auth.ROLES.SUPER_ADMIN) {
    return res.redirect('/etablissement-dashboard');
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

function requirePageEtablissement(req, res, next) {
  if (!req.user) return res.redirect('/login');
  if (req.user.role !== auth.ROLES.ETABLISSEMENT) {
    return res.redirect('/dashboard');
  }
  next();
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const cookie =
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(
      SESSION_TTL_MS / 1000
    )}${secure}`;
  res.setHeader('Set-Cookie', cookie);
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`
  );
}

app.use(express.json());
app.use(attachUser);
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.get('/dashboard.html', requirePageSuperAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
app.get('/manage.html', requirePageSuperAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manage.html'));
});
app.get('/profil-etablissement.html', requirePageEtablissement, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profil-etablissement.html'));
});
app.get('/etablissement-dashboard.html', requirePageEtablissement, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'etablissement-dashboard.html'));
});
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Authentification (login / logout / session courante)
// ---------------------------------------------------------------------------
app.get('/login', (req, res) => {
  if (req.user) {
    return res.redirect(
      req.user.role === auth.ROLES.SUPER_ADMIN ? '/dashboard' : '/etablissement-dashboard'
    );
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
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  for (const [ip, attempt] of loginAttempts) {
    if (now - attempt.startedAt >= LOGIN_WINDOW_MS) loginAttempts.delete(ip);
  }
  for (const [token, session] of sessions) {
    if (now - session.createdAt >= SESSION_TTL_MS) sessions.delete(token);
  }
  const attempts = loginAttempts.get(key);
  if (attempts && now - attempts.startedAt >= LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
  }
  const currentAttempts = loginAttempts.get(key);
  if (currentAttempts && currentAttempts.count >= LOGIN_MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
  }

  const email = auth.normalizeEmail(req.body && req.body.email);
  const password = req.body && req.body.password;

  const user = users.find((u) => u.email === email && u.actif !== false);
  if (
    typeof password !== 'string' ||
    password.length > 1024 ||
    !user ||
    !auth.verifyPassword(password, user.password_salt, user.password_hash)
  ) {
    const previous = loginAttempts.get(key);
    loginAttempts.set(key, {
      startedAt: previous ? previous.startedAt : now,
      count: (previous ? previous.count : 0) + 1,
    });
    return res.status(401).json({ error: 'Identifiants invalides' });
  }
  loginAttempts.delete(key);

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
  const requestedLimit = Number(req.query.limit);
  const requestedOffset = Number(req.query.offset);
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 100)
    : 50;
  const offset = Number.isInteger(requestedOffset) && requestedOffset >= 0
    ? requestedOffset
    : 0;
  const page = establishments
    .slice(offset, offset + limit)
    .map((establishment) =>
      req.user && req.user.role === auth.ROLES.SUPER_ADMIN
        ? establishment
        : publicEstablishment(establishment)
    );
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

  return res.json(publicEstablishment(establishment));
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

  mutateAndPersist(establishments, persistEstablishments, () => establishments.push(establishment));

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
  if (body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return res.status(400).json({ error: 'Adresse email invalide' });
  }
  if (body.password.length < 12 || body.password.length > 1024) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir 12 à 1024 caractères' });
  }

  const emailNorm = auth.normalizeEmail(body.email);
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
  const { salt, hash } = auth.hashPassword(body.password);
  const userId = `user_${crypto.randomUUID()}`;
  const user = {
    id: userId,
    email: emailNorm,
    password_hash: hash,
    password_salt: salt,
    role: auth.ROLES.ETABLISSEMENT,
    etablissementId: establishmentId,
    nom: body.nom,
    actif: true,
    date_creation: new Date().toISOString(),
  };
  mutateAndPersistMany([
    {
      collection: establishments,
      mutate: () => establishments.push(establishment),
      persist: persistEstablishments,
      persistSnapshot: (snapshot) => saveCollection('establishments', snapshot),
    },
    {
      collection: users,
      mutate: () => users.push(user),
      persist: persistUsers,
      persistSnapshot: (snapshot) => saveCollection('users', snapshot),
    },
  ]);

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
    {
      ...req.body,
      date_ajout: existing.date_ajout,
      statut: req.body.statut || existing.statut,
      points_solde: existing.points_solde,
    },
    existing.id
  );
  updated.points_solde = existing.points_solde;

  mutateAndPersist(establishments, persistEstablishments, () => {
    establishments[index] = updated;
  });

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

function uploadProfilePhoto(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload échoué' });
    }
    return next();
  });
}

app.put('/api/etablissement/moi', requireEtablissement, uploadProfilePhoto, (req, res) => {
  const index = establishments.findIndex(
    (item) => item.id === req.user.etablissementId
  );
  if (index === -1) {
    return res.status(404).json({ error: 'Établissement introuvable' });
  }

  const existing = establishments[index];
  const body = {
    ...req.body,
    photo: req.file ? `/uploads/${req.file.filename}` : req.body.photoUrl || existing.photo || '',
  };
  const error = establishmentsLib.validateEstablishmentInput(body);
  if (error) {
    return res.status(400).json({ error });
  }

  const updated = establishmentsLib.buildEstablishment(
    { ...existing, ...body, date_ajout: existing.date_ajout },
    existing.id
  );
  updated.points_solde = existing.points_solde;

  mutateAndPersist(establishments, persistEstablishments, () => {
    establishments[index] = updated;
  });

  return res.json(updated);
});

app.get('/api/admin/points', requireSuperAdmin, (req, res) => {
  return res.json({
    items: establishments.map((establishment) => {
      const owner = users.find(
        (user) =>
          user.role === auth.ROLES.ETABLISSEMENT &&
          user.etablissementId === establishment.id
      );
      return {
        establishmentId: establishment.id,
        nom: establishment.nom,
        type: establishment.type,
        email: owner ? owner.email : '',
        points_solde: establishment.points_solde,
      };
    }),
  });
});

app.post('/api/admin/points/recharge', requireSuperAdmin, (req, res) => {
  const { establishmentId, points } = req.body || {};
  if (typeof establishmentId !== 'string' || !establishmentId.trim()) {
    return res.status(400).json({ error: 'Établissement requis' });
  }
  if (!Number.isSafeInteger(points) || points < 50 || points % 50 !== 0) {
    return res.status(400).json({ error: 'La recharge doit être un multiple de 50 points (minimum 50)' });
  }

  const establishment = establishments.find((item) => item.id === establishmentId);
  if (!establishment) {
    return res.status(404).json({ error: 'Établissement introuvable' });
  }
  if (!Number.isSafeInteger(establishment.points_solde) ||
      establishment.points_solde + points > Number.MAX_SAFE_INTEGER) {
    return res.status(400).json({ error: 'Solde maximal dépassé' });
  }

  const previousBalance = establishment.points_solde;
  mutateAndPersist(establishments, persistEstablishments, () => {
    establishment.points_solde += points;
  });

  return res.json({
    establishmentId,
    points_recharges: points,
    points_solde: establishment.points_solde,
    previousBalance,
  });
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
  const validationError = establishmentsLib.validateProductInput(body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
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

  mutateAndPersist(establishments, persistEstablishments, () => {
    establishments[index].products = establishments[index].products || [];
    establishments[index].products.push(product);
  });

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
  const validationError = establishmentsLib.validateProductInput({
    ...establishments[index].products[productIndex],
    ...body,
  });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  const updatedProduct = {
    ...establishments[index].products[productIndex],
    nom: body.nom || establishments[index].products[productIndex].nom,
    prix: body.prix !== undefined ? Number(body.prix) : establishments[index].products[productIndex].prix,
    disponibilite: body.disponibilite || establishments[index].products[productIndex].disponibilite,
    photo: body.photo || establishments[index].products[productIndex].photo,
    description: body.description || establishments[index].products[productIndex].description,
    tags: body.tags || establishments[index].products[productIndex].tags,
    statut: body.statut || establishments[index].products[productIndex].statut,
  };
  mutateAndPersist(establishments, persistEstablishments, () => {
    establishments[index].products[productIndex] = updatedProduct;
  });

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

  mutateAndPersist(establishments, persistEstablishments, () => {
    establishments[index].products.splice(productIndex, 1);
  });

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

  const activeBlocks = estBlocks.filter((block) => billing.isBlockUsable(block));

  res.json({
    establishmentId,
    pointsSolde: establishments.find((establishment) => establishment.id === establishmentId)
      .points_solde,
    costPerClick: 50,
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

  mutateAndPersist(establishments, persistEstablishments, () => {
    establishments.splice(index, 1);
  });

  return res.json({ ok: true });
});

app.post('/api/blocks', requireSuperAdmin, (req, res) => {
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

  mutateAndPersist(blocks, persistBlocks, () => blocks.push(result.block));

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
  if (!Number.isSafeInteger(establishment.points_solde) || establishment.points_solde < 50) {
    return res.status(402).json({
      error: 'Solde de points insuffisant. Contactez l’équipe pour une recharge.',
      reason: 'insufficient_points',
    });
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
  const whatsappUrl = buildWhatsappUrl(
    establishment.whatsapp,
    attributedClick.id_clic,
    establishment.nom
  );

  let consumption = { ok: false, reason: 'aucun_bloc_actif' };
  const changes = [{
    collection: establishments,
    mutate: () => {
      establishment.points_solde -= 50;
    },
    persist: persistEstablishments,
    persistSnapshot: (snapshot) => saveCollection('establishments', snapshot),
  }];
  if (billing.findActiveBlock(blocks, establishmentId)) {
    changes.push({
      collection: blocks,
      mutate: () => {
        consumption = billing.consumeConversation(blocks, establishmentId);
      },
      persist: persistBlocks,
      persistSnapshot: (snapshot) => saveCollection('blocks', snapshot),
    });
  }
  changes.push({
    collection: clickLogs,
    skipSnapshot: true,
    mutate: () => clickLogs.push(attributedClick),
    rollback: () => clickLogs.pop(),
    persist: persistClicks,
  });
  mutateAndPersistMany(changes);

  res.json({
    clickId: attributedClick.id_clic,
    whatsappUrl,
    pointsSolde: establishment.points_solde,
    pointsDebited: 50,
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

app.get('/api/dashboard', requireSuperAdmin, (req, res) => {
  // On expose les totaux de base + les collections brutes et les blocs.
  // L'agrégation avancée (§9) est faite côté client dans dashboard.js (Étape 3).
  const stats = {
    totalEstablishments: establishments.length,
    totalClicks: clickLogs.length,
    totalAttributed: clickLogs.filter((click) => click.is_attributed).length,
    totalRevenue: blocks.reduce((sum, block) => sum + block.montant_total, 0),
    activeBlocks: blocks.filter((block) => billing.isBlockUsable(block)).length,
  };

  res.json({
    stats,
    establishments,
    blocks,
    clicks: clickLogs,
  });
});

app.get('/dashboard', requirePageSuperAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

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
app.get('/profil-etablissement', requirePageEtablissement, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profil-etablissement.html'));
});

// Tableau de bord établissement (son propre rendement uniquement).
app.get('/etablissement-dashboard', requirePageEtablissement, (req, res) => {
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
      note: establishment.note,
      points_actifs: establishment.points_solde >= 50,
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

app.use((err, req, res, _next) => {
  console.error(`[http] ${req.method} ${req.path}: ${err.message}`);
  if (res.headersSent) return;
  return res.status(500).json({ error: 'Erreur interne du serveur' });
});

app.listen(port, () => {
  console.log(`Douala Discovery MVP running at http://localhost:${port}`);
});
