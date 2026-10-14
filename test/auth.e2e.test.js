/**
 * test/auth.e2e.test.js — Test de bout en bout de l'authentification et de la
 * gestion des admins, en démarrant le serveur sur un port de test isolé.
 */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const ROOT = path.join(__dirname, '..');
const PORT = 3999;
const BASE = `http://127.0.0.1:${PORT}`;

let server;
let tmpDataDir;

async function waitReady(url, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 401) return;
    } catch (err) {
      /* pas encore prêt */
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('Serveur de test non démarré');
}

// Le store écrit dans data/ à côté de src. Pour isoler les données du test,
// on sauvegarde/restaure un éventuel data/ existant.
const DATA_DIR = path.join(ROOT, 'data');
const DATA_BACKUP = path.join(os.tmpdir(), `dd-data-backup-${Date.now()}`);

test.before(async () => {
  if (fs.existsSync(DATA_DIR)) {
    fs.renameSync(DATA_DIR, DATA_BACKUP);
  }
  server = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  await waitReady(`${BASE}/api/health`);
});

test.after(() => {
  if (server) server.kill();
  if (tmpDataDir && fs.existsSync(tmpDataDir)) fs.rmSync(tmpDataDir, { recursive: true, force: true });
  if (fs.existsSync(DATA_DIR)) fs.rmSync(DATA_DIR, { recursive: true, force: true });
  if (fs.existsSync(DATA_BACKUP)) fs.renameSync(DATA_BACKUP, DATA_DIR);
});

test('dashboard protégé : 302 vers /login et API 401 sans session', async () => {
  const page = await fetch(`${BASE}/dashboard`, { redirect: 'manual' });
  assert.strictEqual(page.status, 302);
  assert.match(page.headers.get('location') || '', /\/login$/);

  const api = await fetch(`${BASE}/api/dashboard`);
  assert.strictEqual(api.status, 401);
});

test('login super-admin puis accès dashboard', async () => {
  const bad = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@douala.cm', password: 'mauvais' }),
  });
  assert.strictEqual(bad.status, 401);

  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@douala.cm', password: 'Admin@2026' }),
  });
  assert.strictEqual(res.status, 200);
  const { user } = await res.json();
  assert.strictEqual(user.role, 'super_admin');
  assert.strictEqual(user.password_hash, undefined); // jamais exposé

  const cookie = res.headers.get('set-cookie');
  assert.match(cookie || '', /dd_session=/);

  const me = await fetch(`${BASE}/api/auth/me`, { headers: { cookie } });
  assert.strictEqual(me.status, 200);

  const dash = await fetch(`${BASE}/api/dashboard`, { headers: { cookie } });
  assert.strictEqual(dash.status, 200);
  const data = await dash.json();
  assert.ok(data.stats);
});

test('super-admin crée un admin, qui peut se connecter', async () => {
  // Connexion super-admin
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@douala.cm', password: 'Admin@2026' }),
  });
  const cookie = login.headers.get('set-cookie');

  // Création d'un admin
  const created = await fetch(`${BASE}/api/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ nom: 'Admin Test', email: 'Admin@Test.cm', password: 'secret1' }),
  });
  assert.strictEqual(created.status, 201);
  const newAdmin = await created.json();
  assert.strictEqual(newAdmin.role, 'admin');

  // Doublon refusé
  const dup = await fetch(`${BASE}/api/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ nom: 'Admin Test', email: 'admin@test.cm', password: 'secret1' }),
  });
  assert.strictEqual(dup.status, 409);

  // Le nouvel admin peut se connecter
  const adminLogin = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.cm', password: 'secret1' }),
  });
  assert.strictEqual(adminLogin.status, 200);

  // Un admin ne peut PAS créer de comptes (403)
  const adminCookie = adminLogin.headers.get('set-cookie');
  const forbidden = await fetch(`${BASE}/api/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: adminCookie },
    body: JSON.stringify({ nom: 'X', email: 'x@test.cm', password: 'secret1' }),
  });
  assert.strictEqual(forbidden.status, 403);

  // Suppression par le super-admin
  const del = await fetch(`${BASE}/api/admin/users/${newAdmin.id}`, {
    method: 'DELETE',
    headers: { cookie },
  });
  assert.strictEqual(del.status, 200);
});

test('super-admin : CRUD complet d un établissement', async () => {
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@douala.cm', password: 'Admin@2026' }),
  });
  const cookie = login.headers.get('set-cookie');

  // Création (restaurant) avec un produit
  const create = await fetch(`${BASE}/api/establishments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({
      nom: 'Test Grill',
      type: 'restaurant',
      quartier: 'Bonapriso',
      whatsapp: '237655999999',
      note: 8.5,
      photo: 'https://exemple.cm/photo.jpg',
      description: 'Un super restaurant de test.',
      products: [{ nom: 'Poulet DG', prix: 3500, description: 'Le classique.' }],
    }),
  });
  assert.strictEqual(create.status, 201);
  const est = await create.json();
  assert.strictEqual(est.note, 8.5);
  assert.strictEqual(est.whatsapp, '237655999999');
  assert.strictEqual(est.products.length, 1);
  assert.strictEqual(est.products[0].nom, 'Poulet DG');
  assert.strictEqual(est.products[0].id_etablissement, est.id);

  // Modification (nom + note + type meublé)
  const update = await fetch(`${BASE}/api/establishments/${est.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({
      nom: 'Test Grill Pro',
      type: 'meuble',
      quartier: 'Bonapriso',
      whatsapp: '237655999999',
      note: 9,
    }),
  });
  assert.strictEqual(update.status, 200);
  const updated = await update.json();
  assert.strictEqual(updated.nom, 'Test Grill Pro');
  assert.strictEqual(updated.type, 'meuble');
  assert.strictEqual(updated.note, 9);

  // Suppression
  const del = await fetch(`${BASE}/api/establishments/${est.id}`, {
    method: 'DELETE',
    headers: { cookie },
  });
  assert.strictEqual(del.status, 200);

  const check = await fetch(`${BASE}/api/establishment/${est.id}`);
  assert.strictEqual(check.status, 404);
});

test('un admin simple ne peut PAS gérer les établissements (403)', async () => {
  // Crée un admin
  const superLogin = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@douala.cm', password: 'Admin@2026' }),
  });
  const superCookie = superLogin.headers.get('set-cookie');
  const created = await fetch(`${BASE}/api/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: superCookie },
    body: JSON.stringify({ nom: 'Admin B', email: 'b@test.cm', password: 'secret1' }),
  });
  const adminId = (await created.json()).id;

  // Se connecte en admin
  const adminLogin = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'b@test.cm', password: 'secret1' }),
  });
  const adminCookie = adminLogin.headers.get('set-cookie');

  // Tente de créer un établissement -> 403
  const forbidden = await fetch(`${BASE}/api/establishments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: adminCookie },
    body: JSON.stringify({ nom: 'X', type: 'restaurant', quartier: 'Q', whatsapp: '237655000000' }),
  });
  assert.strictEqual(forbidden.status, 403);

  // Nettoyage
  await fetch(`${BASE}/api/admin/users/${adminId}`, { method: 'DELETE', headers: { cookie: superCookie } });
});
