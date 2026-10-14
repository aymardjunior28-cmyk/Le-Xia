/**
 * offline/auth.local.js — Authentification 100% locale (app Android offline).
 *
 * Remplace le hachage scrypt (crypto Node) par SHA-256 via l'API Web Crypto,
 * et les sessions cookie serveur par une session en localStorage.
 *
 * Expose window.DDAuth.
 */
(function (root) {
  'use strict';

  const ROLES = { SUPER_ADMIN: 'super_admin' };
  const SESSION_KEY = 'dd_session_user';

  const DEFAULT_SUPERADMIN = {
    id: 'user_super_admin',
    email: 'superadmin@douala.cm',
    password: 'Admin@2026',
    nom: 'Super Administrateur',
  };

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function toHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /** SHA-256(password + salt) via Web Crypto (asynchrone). */
  async function hashPassword(password, salt) {
    const enc = new TextEncoder();
    const data = enc.encode(String(password) + salt);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return toHex(digest);
  }

  function randomSalt() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function verifyPassword(password, salt, expectedHash) {
    if (!salt || !expectedHash) return false;
    const candidate = await hashPassword(password, salt);
    return candidate === expectedHash;
  }

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
   * Amorce un super-admin si la collection users est vide.
   * @param {object[]} users collection mutable
   * @returns {Promise<boolean>} true si créé
   */
  async function ensureSuperAdmin(users) {
    if (Array.isArray(users) && users.some((u) => u.role === ROLES.SUPER_ADMIN)) {
      return false;
    }
    const salt = randomSalt();
    const hash = await hashPassword(DEFAULT_SUPERADMIN.password, salt);
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

  function setSession(user) {
    localStorage.setItem(SESSION_KEY, user.id);
  }

  function getSessionUserId() {
    try {
      return localStorage.getItem(SESSION_KEY);
    } catch (e) {
      return null;
    }
  }

  function clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  root.DDAuth = {
    ROLES,
    DEFAULT_SUPERADMIN,
    normalizeEmail,
    hashPassword,
    verifyPassword,
    publicUser,
    ensureSuperAdmin,
    setSession,
    getSessionUserId,
    clearSession,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
