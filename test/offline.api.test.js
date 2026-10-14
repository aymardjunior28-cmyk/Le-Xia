'use strict';
/**
 * Test d'intégration de l'app 100% offline (shim d'API locale).
 *
 * Simule un navigateur (localStorage, fetch qui échoue hors shim, FileReader)
 * puis charge la chaîne complète : modules métier DD* -> store/auth locaux ->
 * api.js. Valide que TOUS les endpoints appelés par le front fonctionnent
 * sans aucun serveur.
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// ---- Environnement navigateur simulé (AVANT de charger les scripts) ----
const mem = new Map();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  writable: true,
  value: {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => void mem.set(k, String(v)),
    removeItem: (k) => void mem.delete(k),
  },
});

// fetch d'origine : doit être appelé UNIQUEMENT hors /api/ (sinon c'est une fuite).
const originalFetchCalls = [];
globalThis.fetch = async (input) => {
  originalFetchCalls.push(String(input));
  throw new Error('RESEAU_INDISPONIBLE:' + input);
};

try {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: { userAgent: 'offline-test-agent' },
  });
} catch (e) {
  globalThis.navigator.userAgent = 'offline-test-agent';
}

// FileReader absent de Node : simulé pour l'upload.
globalThis.FileReader = class FileReaderStub {
  readAsDataURL() {
    this.result = 'data:image/png;base64,dGVzdA==';
    setTimeout(() => this.onload && this.onload(), 0);
  }
};

// ---- Chargement de la chaîne offline (IIFE + double-export) ----
require(path.join(ROOT, 'src', 'attribution.js'));
require(path.join(ROOT, 'src', 'whatsapp.js'));
require(path.join(ROOT, 'src', 'antifraud.js'));
require(path.join(ROOT, 'src', 'billing.js'));
require(path.join(ROOT, 'src', 'establishments.js'));
require(path.join(ROOT, 'src', 'seed.js'));
require(path.join(ROOT, 'public', 'offline', 'store.local.js'));
require(path.join(ROOT, 'public', 'offline', 'auth.local.js'));
require(path.join(ROOT, 'public', 'offline', 'api.js'));

const DDapi = globalThis.DDapi;

const JSON_HEADERS = { 'Content-Type': 'application/json' };

test('app offline : shim d API locale couvre tout le front sans serveur', async () => {
  assert.ok(DDapi, 'DDapi exposé');
  await DDapi.ready;

  // 1) Feed public (seed chargé au premier accès)
  const list = await fetch('/api/establishments');
  assert.strictEqual(list.status, 200);
  const items = await list.json();
  assert.ok(Array.isArray(items) && items.length > 0, 'seed non vide');
  assert.strictEqual(originalFetchCalls.length, 0, 'aucun appel réseau réel');

  // 2) Dashboard anonyme -> 401
  const dashAnon = await fetch('/api/dashboard');
  assert.strictEqual(dashAnon.status, 401);

  // 3) Login super-admin (SHA-256 local)
  const login = await fetch('/api/auth/login', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ email: 'superadmin@douala.cm', password: 'Admin@2026' }),
  });
  assert.strictEqual(login.status, 200);
  const { user } = await login.json();
  assert.strictEqual(user.role, 'super_admin');

  // 4) Session courante
  const me = await fetch('/api/auth/me');
  assert.strictEqual(me.status, 200);

  // 5) Dashboard authentifié
  const dash = await fetch('/api/dashboard');
  assert.strictEqual(dash.status, 200);
  const dashData = await dash.json();
  assert.ok(dashData.stats.totalEstablishments > 0);
  assert.ok(Array.isArray(dashData.establishments));

  // 6) CRUD établissement
  const created = await fetch('/api/establishments', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      nom: 'Chez Test Offline',
      type: 'restaurant',
      quartier: 'Bonaberi',
      whatsapp: '+237699999999',
      products: [{ nom: 'Poulet braisé', prix: 2500 }],
    }),
  });
  assert.strictEqual(created.status, 201);
  const est = await created.json();
  assert.ok(est.id);

  const updated = await fetch('/api/establishments/' + est.id, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ ...est, nom: 'Chez Test Modifié' }),
  });
  assert.strictEqual(updated.status, 200);
  assert.strictEqual((await updated.json()).nom, 'Chez Test Modifié');

  // 7) Détail produit (page fiche)
  const seedItem = items[0];
  const detail = await fetch(`/api/product/${seedItem.id}/${seedItem.products[0].id}`);
  assert.strictEqual(detail.status, 200);
  assert.ok((await detail.json()).product);

  // 8) Clic attribué -> URL WhatsApp
  const redirect = await fetch('/api/redirect', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      establishmentId: seedItem.id,
      productId: seedItem.products[0].id,
      source: 'home_feed',
      sessionId: 'session_test_offline',
    }),
  });
  assert.strictEqual(redirect.status, 200);
  assert.match((await redirect.json()).whatsappUrl, /^https:\/\/wa\.me\//);

  // 9) Upload d'image (FormData + FileReader simulé)
  const fd = new FormData();
  fd.append('photo', new File([Buffer.from('fake')], 'photo.png', { type: 'image/png' }));
  const upload = await fetch('/api/upload', { method: 'POST', body: fd });
  assert.strictEqual(upload.status, 200);
  assert.match((await upload.json()).url, /^data:image\//);

  // 10) Suppression
  const del = await fetch('/api/establishments/' + est.id, { method: 'DELETE' });
  assert.strictEqual(del.status, 200);

  // 11) Logout -> protégé de nouveau
  const logout = await fetch('/api/auth/logout', { method: 'POST' });
  assert.strictEqual(logout.status, 200);
  assert.strictEqual((await fetch('/api/dashboard')).status, 401);

  // 12) Hors /api/ : le shim laisse passer au fetch d'origine
  await assert.rejects(() => fetch('/images/photo.png'), /RESEAU_INDISPONIBLE/);
  assert.ok(originalFetchCalls.includes('/images/photo.png'));

  // 13) Persistance locale réelle (localStorage)
  assert.ok(mem.get('dd_establishments'), 'établissements persistés');
  assert.ok(mem.get('dd_users'), 'compte super-admin persisté');
});
