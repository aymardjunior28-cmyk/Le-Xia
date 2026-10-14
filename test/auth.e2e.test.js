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

function killServer(proc) {
  return new Promise((resolve) => {
    if (!proc || proc.exitCode !== null || proc.signalCode) return resolve();
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    proc.once('exit', finish);
    try {
      proc.kill();
    } catch (e) {
      finish();
    }
    // Filet de sécurité : ne pas bloquer indéfiniment.
    setTimeout(finish, 3000);
  });
}

test.before(async () => {
  if (fs.existsSync(DATA_DIR)) {
    fs.renameSync(DATA_DIR, DATA_BACKUP);
  }
  server = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  // Échoue clairement si le port est déjà pris (évite les faux négatifs).
  const portError = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 100);
    server.once('error', (err) => resolve(err));
    server.once('spawn', () => {
      clearTimeout(timer);
      resolve(null);
    });
  });
  if (portError && ['EADDRINUSE', 'EACCES'].includes(portError.code)) {
    throw new Error(`Port ${PORT} indisponible (${portError.code}). Fermez les processus node résiduels.`);
  }
  await waitReady(`${BASE}/api/health`);
});

test.after(async () => {
  await killServer(server);
  // Laisse l'OS libérer le port avant un éventuel run suivant.
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

test('routes sensibles protégées : /manage et /api/upload sans session', async () => {
  const manage = await fetch(`${BASE}/manage`, { redirect: 'manual' });
  assert.strictEqual(manage.status, 302);
  assert.match(manage.headers.get('location') || '', /\/login$/);

  const upload = await fetch(`${BASE}/api/upload`, { method: 'POST' });
  assert.strictEqual(upload.status, 401);
});

test('upload d image : refusé sans session, accepté par le super-admin, rejeté si non-image', async () => {
  // Petit PNG 1x1 valide (base64).
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  // Sans session -> 401
  const noAuth = await fetch(`${BASE}/api/upload`, {
    method: 'POST',
    body: (() => {
      const fd = new FormData();
      fd.append('photo', new Blob([png], { type: 'image/png' }), 'x.png');
      return fd;
    })(),
  });
  assert.strictEqual(noAuth.status, 401);

  // Connexion super-admin
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@douala.cm', password: 'Admin@2026' }),
  });
  const cookie = login.headers.get('set-cookie');

  // Upload valide -> 200 + URL /uploads/...
  const ok = await fetch(`${BASE}/api/upload`, {
    method: 'POST',
    headers: { cookie },
    body: (() => {
      const fd = new FormData();
      fd.append('photo', new Blob([png], { type: 'image/png' }), 'photo.png');
      return fd;
    })(),
  });
  assert.strictEqual(ok.status, 200);
  const { url } = await ok.json();
  assert.match(url, /^\/uploads\/.+\.png$/);

  // Non-image -> 400
  const bad = await fetch(`${BASE}/api/upload`, {
    method: 'POST',
    headers: { cookie },
    body: (() => {
      const fd = new FormData();
      fd.append('photo', new Blob([Buffer.from('texte')], { type: 'text/plain' }), 'note.txt');
      return fd;
    })(),
  });
  assert.strictEqual(bad.status, 400);
});
