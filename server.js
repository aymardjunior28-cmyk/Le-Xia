const express = require('express');
const path = require('path');

const { loadCollection, saveCollection } = require('./src/store');
const { seedEstablishments } = require('./src/seed');
const attribution = require('./src/attribution');
const { buildWhatsappUrl } = require('./src/whatsapp');
const antifraud = require('./src/antifraud');
const billing = require('./src/billing');

const app = express();
const port = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Sources de vérité persistées (JSON dans data/)
// ---------------------------------------------------------------------------
const establishments = loadCollection('establishments', seedEstablishments);
const clickLogs = loadCollection('clickLogs', []);
const blocks = loadCollection('blocks', []);

const persistEstablishments = () => saveCollection('establishments', establishments);
const persistClicks = () => saveCollection('clickLogs', clickLogs);
const persistBlocks = () => saveCollection('blocks', blocks);

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

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

app.get('/api/dashboard', (req, res) => {
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

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
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
