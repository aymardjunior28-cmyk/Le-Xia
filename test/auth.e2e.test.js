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
const ADMIN_EMAIL = 'admin-test@douala.cm';
const ADMIN_PASSWORD = 'Test-SuperAdmin-2026!';

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
    env: {
      ...process.env,
      PORT: String(PORT),
      SUPERADMIN_EMAIL: ADMIN_EMAIL,
      SUPERADMIN_PASSWORD: ADMIN_PASSWORD,
    },
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
  const directPage = await fetch(`${BASE}/dashboard.html`, { redirect: 'manual' });
  assert.strictEqual(directPage.status, 302);
  assert.match(directPage.headers.get('location') || '', /\/login$/);

  const api = await fetch(`${BASE}/api/dashboard`);
  assert.strictEqual(api.status, 401);
});

test('login super-admin puis accès dashboard', async () => {
  const bad = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: 'mauvais' }),
  });
  assert.strictEqual(bad.status, 401);

  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
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

test('un compte établissement ne peut pas accéder au dashboard admin', async () => {
  const form = new FormData();
  form.set('email', `owner-${Date.now()}@douala.cm`);
  form.set('password', 'Proprietaire-2026!');
  form.set('nom', 'Établissement test');
  form.set('type', 'restaurant');
  form.set('quartier', 'Bonanjo');
  form.set('whatsapp', '237655999111');
  form.set('produit_nom', 'Plat du jour');
  form.set('produit_prix', '3500');
  form.set('produit_disponibilite', 'Disponible');
  form.set('produit_description', 'Offre de bienvenue');
  form.set('role', 'super_admin');
  const signup = await fetch(`${BASE}/api/etablissements/inscription`, {
    method: 'POST',
    body: form,
  });
  assert.strictEqual(signup.status, 201);
  const signupData = await signup.json();
  assert.strictEqual(signupData.establishment.points_solde, 1000);
  assert.strictEqual(signupData.establishment.products.length, 1);
  assert.strictEqual(signupData.establishment.products[0].nom, 'Plat du jour');
  assert.strictEqual(signupData.user.role, 'etablissement');
  const publicEstablishments = await fetch(`${BASE}/api/establishments`);
  assert.strictEqual(publicEstablishments.status, 200);
  const publicCatalog = await publicEstablishments.json();
  const registeredEstablishment = publicCatalog.items.find(
    (item) => item.id === signupData.establishment.id
  );
  assert.ok(registeredEstablishment, 'L’établissement inscrit doit apparaître dans le catalogue public');
  assert.strictEqual(registeredEstablishment.products.length, 1);
  assert.strictEqual(registeredEstablishment.products[0].nom, 'Plat du jour');

  const ownerEmail = form.get('email');
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ownerEmail, password: 'Proprietaire-2026!' }),
  });
  assert.strictEqual(login.status, 200);
  const cookie = login.headers.get('set-cookie');

  const initialProduct = signupData.establishment.products[0];
  const removeProduct = await fetch(
    `${BASE}/api/etablissements/${signupData.establishment.id}/produits/${initialProduct.id}`,
    { method: 'DELETE', headers: { cookie } }
  );
  assert.strictEqual(removeProduct.status, 200);
  const catalogWithoutProducts = await fetch(`${BASE}/api/establishments`);
  const hiddenEstablishment = (await catalogWithoutProducts.json()).items.find(
    (item) => item.id === signupData.establishment.id
  );
  assert.deepStrictEqual(hiddenEstablishment.products, []);

  const addProduct = await fetch(
    `${BASE}/api/etablissements/${signupData.establishment.id}/produits`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({
        nom: 'Plat réactivé',
        prix: 4200,
        disponibilite: 'Disponible',
      }),
    }
  );
  assert.strictEqual(addProduct.status, 201);
  const restoredProduct = await addProduct.json();
  const catalogWithProduct = await fetch(`${BASE}/api/establishments`);
  const visibleEstablishment = (await catalogWithProduct.json()).items.find(
    (item) => item.id === signupData.establishment.id
  );
  assert.strictEqual(visibleEstablishment.products[0].id, restoredProduct.id);

  const profile = await fetch(`${BASE}/api/etablissement/moi`, { headers: { cookie } });
  assert.strictEqual(profile.status, 200);
  const profileData = await profile.json();
  const photoForm = new FormData();
  photoForm.set('nom', profileData.nom);
  photoForm.set('type', profileData.type);
  photoForm.set('quartier', profileData.quartier);
  photoForm.set('whatsapp', profileData.whatsapp);
  photoForm.set('adresse', profileData.adresse || '');
  photoForm.set('categorie', profileData.categorie || '');
  photoForm.set('description', profileData.description || '');
  photoForm.set('photoUrl', profileData.photo || '');
  photoForm.set('statut', profileData.statut || 'actif');
  photoForm.append(
    'photo',
    new Blob([
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgWJ9awAAAABJRU5ErkJggg==',
        'base64'
      ),
    ], { type: 'image/png' }),
    'profile.png'
  );
  const profileUpdate = await fetch(`${BASE}/api/etablissement/moi`, {
    method: 'PUT',
    headers: { cookie },
    body: photoForm,
  });
  assert.strictEqual(profileUpdate.status, 200);
  const updatedProfile = await profileUpdate.json();
  assert.match(updatedProfile.photo, /^\/uploads\/.+\.png$/);
  fs.rmSync(path.join(ROOT, 'public', updatedProfile.photo.slice(1)), { force: true });

  const keepPhoto = await fetch(`${BASE}/api/etablissement/moi`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({
      nom: updatedProfile.nom,
      type: updatedProfile.type,
      quartier: updatedProfile.quartier,
      whatsapp: updatedProfile.whatsapp,
      adresse: updatedProfile.adresse,
      categorie: updatedProfile.categorie,
      description: updatedProfile.description,
      photoUrl: updatedProfile.photo,
      statut: updatedProfile.statut,
      points_solde: 999999,
    }),
  });
  assert.strictEqual(keepPhoto.status, 200);
  const keptProfile = await keepPhoto.json();
  assert.strictEqual(keptProfile.photo, updatedProfile.photo);
  assert.strictEqual(keptProfile.points_solde, 1000);

  const api = await fetch(`${BASE}/api/dashboard`, { headers: { cookie } });
  assert.strictEqual(api.status, 403);
  const page = await fetch(`${BASE}/dashboard`, {
    headers: { cookie },
    redirect: 'manual',
  });
  assert.strictEqual(page.status, 302);
  assert.match(page.headers.get('location') || '', /\/etablissement-dashboard$/);
  const ownDashboard = await fetch(`${BASE}/api/etablissement/mes-stats`, { headers: { cookie } });
  assert.strictEqual(ownDashboard.status, 200);
  const ownDashboardData = await ownDashboard.json();
  assert.strictEqual(ownDashboardData.pointsSolde, 1000);
  const ownDashboardPage = await fetch(`${BASE}/etablissement-dashboard`, { headers: { cookie } });
  assert.strictEqual(ownDashboardPage.status, 200);
  assert.match(await ownDashboardPage.text(), /id="stat-points"/);
  const block = await fetch(`${BASE}/api/blocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ establishmentId: 'rest-1', nombreConversations: 10 }),
  });
  assert.strictEqual(block.status, 403);
});

test('super-admin : CRUD complet d un établissement', async () => {
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
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
  const points = await fetch(`${BASE}/api/admin/points`);
  assert.strictEqual(points.status, 401);
  const block = await fetch(`${BASE}/api/blocks`, { method: 'POST' });
  assert.strictEqual(block.status, 401);
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
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
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
  fs.rmSync(path.join(ROOT, 'public', url.slice(1)), { force: true });

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

test('les tentatives de connexion sont limitées par adresse réseau', async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: 'incorrect' }),
    });
    assert.strictEqual(res.status, 401);
  }
  const blocked = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: 'incorrect' }),
  });
  assert.strictEqual(blocked.status, 429);
});
