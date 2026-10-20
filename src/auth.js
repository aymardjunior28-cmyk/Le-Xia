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
};

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
  DEFAULT_SUPERADMIN,
  normalizeEmail,
  hashPassword,
  verifyPassword,
  publicUser,
  ensureSuperAdmin,
};
