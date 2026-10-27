'use strict';

/**
 * src/establishments.js — Normalisation & validation des établissements (§8.1/§8.2).
 *
 * Helper pur et réutilisable, utilisé à la création (POST) comme à la
 * modification (PUT). Garantit un schéma cohérent quel que soit l'appelant.
 */

const VALID_TYPES = ['restaurant', 'meuble'];
const crypto = require('crypto');
const INITIAL_POINTS_BALANCE = 1000;
const FIELD_LIMITS = {
  nom: 120,
  quartier: 100,
  adresse: 250,
  categorie: 100,
  description: 2000,
  photo: 2048,
  horaires: 500,
  produits_services: 1000,
  lien: 2048,
};

/** Nettoie une chaîne (trim + String). */
function str(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

/** Normalise un numéro WhatsApp (chiffres uniquement). */
function cleanPhone(value) {
  return str(value).replace(/[^\d]/g, '');
}

function isSafeMediaUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  if (value === '') return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch (err) {
    return false;
  }
}

/** Borne une note entre 0 et 10, ou null si absente/invalide. */
function normalizeNote(value) {
  if (value === '' || value === undefined || value === null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

/** Normalise la liste des produits embarqués. */
function normalizeProducts(products, establishmentId) {
  if (!Array.isArray(products)) return [];
  return products.map((product, index) => ({
    id: str(product.id) || `prod_${establishmentId}_${index + 1}`,
    id_etablissement: establishmentId,
    type_produit: str(product.type_produit, 'plat'),
    nom: str(product.nom, 'Produit'),
    prix: Number(product.prix) || 0,
    disponibilite: str(product.disponibilite),
    photo: str(product.photo),
    description: str(product.description),
    tags: Array.isArray(product.tags) ? product.tags.map((t) => str(t)).filter(Boolean) : [],
    statut: str(product.statut, 'actif'),
  }));
}

/**
 * Valide les champs requis d'un établissement.
 * @returns {string|null} message d'erreur, ou null si valide
 */
function validateEstablishmentInput(body) {
  if (!body || typeof body !== 'object') return 'Corps de requête invalide';
  const required = ['nom', 'type', 'quartier', 'whatsapp'];
  const missing = required.filter((field) => typeof body[field] !== 'string' || !body[field].trim());
  if (missing.length > 0) {
    return `Champs requis manquants : ${missing.join(', ')}`;
  }
  if (!VALID_TYPES.includes(body.type)) {
    return 'type doit être "restaurant" ou "meublé"';
  }
  if (body.id !== undefined && (typeof body.id !== 'string' || !/^[\w-]{1,100}$/.test(body.id))) {
    return 'id contient des caractères non autorisés';
  }
  for (const [field, max] of Object.entries(FIELD_LIMITS)) {
    if (body[field] !== undefined && (typeof body[field] !== 'string' || body[field].length > max)) {
      return `${field} doit être une chaîne de ${max} caractères maximum`;
    }
  }
  if (body.photo !== undefined && !isSafeMediaUrl(body.photo)) {
    return 'photo doit être une URL HTTP(S) ou un chemin local';
  }
  if (body.photos !== undefined &&
    (!Array.isArray(body.photos) || body.photos.length > 3 ||
      body.photos.some((photo) => !isSafeMediaUrl(photo)))) {
    return 'photos doit contenir au maximum 3 URL HTTP(S) ou chemins locaux';
  }
  const phoneLength = cleanPhone(body.whatsapp).length;
  if (phoneLength < 6 || phoneLength > 20) {
    return 'Numéro WhatsApp invalide';
  }
  if (body.note !== undefined && body.note !== null && body.note !== '') {
    const note = Number(body.note);
    if (!Number.isFinite(note) || note < 0 || note > 10) {
      return 'note doit être comprise entre 0 et 10';
    }
  }
  if (body.note_provisoire !== undefined && typeof body.note_provisoire !== 'boolean') {
    return 'note_provisoire doit être un booléen';
  }
  if (body.products !== undefined) {
    if (!Array.isArray(body.products)) return 'products doit être une liste';
    for (const product of body.products) {
      const error = validateProductInput(product);
      if (error) return error;
    }
  }
  return null;
}

function validateProductInput(product) {
  if (!product || typeof product !== 'object' || Array.isArray(product)) {
    return 'Produit invalide';
  }
  if (product.id !== undefined &&
    (typeof product.id !== 'string' || !/^[\w-]{1,120}$/.test(product.id))) {
    return 'id de produit contient des caractères non autorisés';
  }
  if (typeof product.nom !== 'string' || !product.nom.trim() || product.nom.length > 120) {
    return 'Le nom du produit est requis (120 caractères maximum)';
  }
  const price = Number(product.prix);
  if (!Number.isFinite(price) || price <= 0 || price > 100000000) {
    return 'Le prix du produit doit être un nombre positif valide';
  }
  for (const [field, max] of Object.entries({
    type_produit: 60,
    disponibilite: 160,
    photo: 2048,
    description: 2000,
    statut: 30,
  })) {
    if (product[field] !== undefined && (typeof product[field] !== 'string' || product[field].length > max)) {
      return `${field} doit être une chaîne de ${max} caractères maximum`;
    }
  }
  if (product.photo !== undefined && !isSafeMediaUrl(product.photo)) {
    return 'photo doit être une URL HTTP(S) ou un chemin local';
  }
  if (product.tags !== undefined &&
    (!Array.isArray(product.tags) || product.tags.length > 30 ||
      product.tags.some((tag) => typeof tag !== 'string' || tag.length > 60))) {
    return 'tags doit être une liste de 30 éléments maximum (60 caractères chacun)';
  }
  return null;
}

/**
 * Construit l'objet établissement normalisé (hors id/dates, gérés par l'appelant).
 * @param {object} body corps de requête
 * @param {string} establishmentId id (existant pour PUT, généré pour POST)
 */
function buildEstablishment(body, establishmentId) {
  const now = new Date().toISOString();
  const visibilites = Array.isArray(body.visibilites) && body.visibilites.length > 0
    ? body.visibilites.map((v) => str(v)).filter(Boolean)
    : ['home_feed'];

  return {
    id: establishmentId,
    nom: str(body.nom),
    type: body.type,
    statut: str(body.statut, 'actif'),
    quartier: str(body.quartier),
    adresse: str(body.adresse),
    whatsapp: cleanPhone(body.whatsapp),
    categorie: str(body.categorie),
    photo: str(body.photo),
    photos: Array.isArray(body.photos) ? body.photos.slice(0, 3).map((photo) => str(photo)) : [],
    note: normalizeNote(body.note),
    note_provisoire: body.note_provisoire === true && normalizeNote(body.note) !== null,
    points_solde: INITIAL_POINTS_BALANCE,
    description: str(body.description),
    visibilites,
    horaires: str(body.horaires),
    produits_services: str(body.produits_services),
    lien: str(body.lien),
    date_ajout: body.date_ajout || now,
    date_maj: now,
    products: normalizeProducts(body.products, establishmentId),
  };
}

/** Génère un id lisible et unique pour un établissement. */
function generateId(type) {
  const prefix = type === 'restaurant' ? 'rest' : 'meuble';
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

module.exports = {
  VALID_TYPES,
  INITIAL_POINTS_BALANCE,
  str,
  cleanPhone,
  normalizeNote,
  normalizeProducts,
  validateProductInput,
  validateEstablishmentInput,
  buildEstablishment,
  generateId,
};
