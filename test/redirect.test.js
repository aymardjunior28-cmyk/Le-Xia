/**
 * test/redirect.test.js — Test d'intégration de l'endpoint POST /api/redirect.
 * Démarre le serveur sur un port isolé et teste le flux clic → WhatsApp → facturation.
 */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const ROOT = path.join(__dirname, '..');
const PORT = 3998;
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN_EMAIL = 'admin-test@douala.cm';
const ADMIN_PASSWORD = 'Test-SuperAdmin-2026!';

let server;
let tmpDataDir;

const DATA_DIR = path.join(ROOT, 'data');
const DATA_BACKUP = path.join(os.tmpdir(), `dd-data-backup-${Date.now()}`);

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
  if (fs.existsSync(DATA_DIR)) fs.rmSync(DATA_DIR, { recursive: true, force: true });
  if (fs.existsSync(DATA_BACKUP)) fs.renameSync(DATA_BACKUP, DATA_DIR);
});

test('POST /api/redirect : clic valide crée un événement et consomme un bloc', async () => {
  // Créer un établissement avec un bloc de 2 conversations via l'API super-admin
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  assert.strictEqual(login.status, 200);
  const cookie = login.headers.get('set-cookie');

  const createEst = await fetch(`${BASE}/api/establishments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({
      nom: 'Test Redirect Resto',
      type: 'restaurant',
      quartier: 'Bonanjo',
      whatsapp: '237655000099',
      products: [{ nom: 'Plat test', prix: 350, disponibilite: 'Disponible' }],
    }),
  });
  assert.strictEqual(createEst.status, 201);
  const est = await createEst.json();
  const productId = (est.products || [])[0].id;

  // Créer un bloc de 2 conversations
  const createBlock = await fetch(`${BASE}/api/blocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({
      establishmentId: est.id,
      nombreConversations: 2,
      prixUnitaire: 350,
    }),
  });
  assert.strictEqual(createBlock.status, 201);

  // Faire un clic valide
  const redirectRes = await fetch(`${BASE}/api/redirect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      establishmentId: est.id,
      productId,
      source: 'home_feed',
      sessionId: 'session-test-1',
    }),
  });
  assert.strictEqual(redirectRes.status, 200);
  const data = await redirectRes.json();
  assert.ok(data.clickId, 'clickId doit être présent');
  assert.ok(data.whatsappUrl, 'whatsappUrl doit être présent');
  assert.ok(data.whatsappUrl.includes(data.clickId), 'whatsappUrl doit contenir le clickId');
  assert.strictEqual(data.billing.consumed, true, 'Le bloc doit être consommé');
  assert.strictEqual(data.billing.remaining, 1, 'Il doit rester 1 conversation');
});

test('POST /api/redirect : refuse un bot (User-Agent curl)', async () => {
  const redirectRes = await fetch(`${BASE}/api/redirect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'curl/8.0',
    },
    body: JSON.stringify({
      establishmentId: 'rest-1',
      productId: 'prod-rest-1-1',
      source: 'home_feed',
      sessionId: 'session-bot-1',
    }),
  });
  assert.strictEqual(redirectRes.status, 429);
  const data = await redirectRes.json();
  assert.strictEqual(data.error, 'Clic refusé');
  assert.strictEqual(data.reason, 'bot_or_missing_user_agent');
});

test('POST /api/redirect : refuse un doublon même session + même produit', async () => {
  const body = {
    establishmentId: 'rest-1',
    productId: 'prod-rest-1-1',
    source: 'home_feed',
    sessionId: 'session-dup-1',
  };

  const r1 = await fetch(`${BASE}/api/redirect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  assert.strictEqual(r1.status, 200);

  const r2 = await fetch(`${BASE}/api/redirect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  assert.strictEqual(r2.status, 429);
  const data = await r2.json();
  assert.strictEqual(data.reason, 'duplicate_click');
});

test('POST /api/redirect : 404 si établissement ou produit introuvable', async () => {
  const res = await fetch(`${BASE}/api/redirect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      establishmentId: "n'existe pas",
      productId: "n'existe pas",
      source: 'home_feed',
      sessionId: 'session-404-1',
    }),
  });
  assert.strictEqual(res.status, 404);
});