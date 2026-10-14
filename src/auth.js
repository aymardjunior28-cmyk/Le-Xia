'use strict';

/**
 * src/auth.js — Authentification et gestion des rôles (sans dépendance externe).
 *
 * - Hachage des mots de passe : scrypt (Node crypto) + salt aléatoire.
 * - Rôles : `super_admin` (peut créer/gérer des admins) et `admin`.
 * - Helpers purs (pas d'accès au store) ; l'orchestration vit dans server.js.
 */

const crypto = require('crypto');

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
};

const ALL_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

// Compte super-admin amorcé au premier démarrage (à changer après connexion).
const DEFAULT_SUPERADMIN = {
  id: 'user_super_admin',
  email: 'superadmin@douala.cm',
  password: 'Admin@2026',
  nom: 'Super Administrateur',
};

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * Hache un mot de passe avec scrypt.
 * @param {string} password
 * @param {string} [salt] sel hexadécimal (généré si absent)
 * @returns {{ salt: string, hash: string }}
 */
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(String(password), salt, 64);
  return { salt, hash: derived.toString('hex') };
}

/**
 * Vérifie un mot de passe contre un sel + hash stockés (comparaison à temps constant).
 * @returns {boolean}
 */
function verifyPassword(password, salt, expectedHash) {
  if (!salt || !expectedHash) return false;
  let candidate;
  try {
    candidate = crypto.scryptSync(String(password), salt, 64);
  } catch (err) {
    return false;
  }
  const expected = Buffer.from(String(expectedHash), 'hex');
  if (expected.length !== candidate.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

/**
 * Retire les champs sensibles (jamais renvoyés au client).
 */
function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    nom: user.nom,
    role: user.role,
    actif: user.actif !== false,
    date_creation: user.date_creation,
  };
}

/**
 * Valide les champs de création d'un compte.
 * @returns {string|null} message d'erreur, ou null si valide
 */
function validateUserInput({ email, nom, password, role }) {
  if (!normalizeEmail(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))) {
    return 'Adresse email invalide';
  }
  if (!nom || !String(nom).trim()) {
    return 'Le nom est requis';
  }
  if (!password || String(password).length < 6) {
    return 'Le mot de passe doit contenir au moins 6 caractères';
  }
  if (role && !ALL_ROLES.includes(role)) {
    return 'Rôle invalide (admin | super_admin)';
  }
  return null;
}

/**
 * Construit un objet utilisateur prêt à être persisté.
 * @returns {{ ok: boolean, user?: object, error?: string }}
 */
function buildUser({ email, nom, password, role = ROLES.ADMIN }) {
  const error = validateUserInput({ email, nom, password, role });
  if (error) return { ok: false, error };

  const { salt, hash } = hashPassword(password);
  return {
    ok: true,
    user: {
      id: `user_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      email: normalizeEmail(email),
      nom: String(nom).trim(),
      role,
      password_hash: hash,
      password_salt: salt,
      actif: true,
      date_creation: new Date().toISOString(),
    },
  };
}

/**
 * Amorce un super-admin si aucun n'existe encore.
 * @param {object[]} users collection mutable
 * @returns {boolean} true si un super-admin a été créé
 */
function ensureSuperAdmin(users) {
  if (Array.isArray(users) && users.some((u) => u.role === ROLES.SUPER_ADMIN)) {
    return false;
  }
  const { salt, hash } = hashPassword(DEFAULT_SUPERADMIN.password);
  users.push({
    id: DEFAULT_SUPERADMIN.id,
    email: DEFAULT_SUPERADMIN.email,
    nom: DEFAULT_SUPERADMIN.nom,
    role: ROLES.SUPER_ADMIN,
    password_hash: hash,
    password_salt: salt,
    actif: true,
    date_creation: new Date().toISOString(),
  });
  return true;
}

module.exports = {
  ROLES,
  ALL_ROLES,
  DEFAULT_SUPERADMIN,
  normalizeEmail,
  hashPassword,
  verifyPassword,
  publicUser,
  validateUserInput,
  buildUser,
  ensureSuperAdmin,
};
