const test = require('node:test');
const assert = require('node:assert');

const attribution = require('../src/attribution');
const antifraud = require('../src/antifraud');

test('generateClickId produit un identifiant au format YYYYMMDD_HHMMSS_xxxx', () => {
  const id = attribution.generateClickId(new Date('2026-10-12T14:52:33.000Z'));
  assert.match(id, /^\d{8}_\d{6}_[0-9a-f]{4}$/);
  assert.ok(id.startsWith('20261012_'));
});

test('createClickEvent crée un événement en statut pending, non attribué', () => {
  const click = attribution.createClickEvent({
    establishmentId: 'rest-1',
    productId: 'prod-1',
    source: 'home_feed',
    canal: 'web_desktop',
    sessionId: 'sess-1',
    zoneGeo: 'Bonanjo',
  });

  assert.strictEqual(click.status, 'pending');
  assert.strictEqual(click.is_attributed, false);
  assert.strictEqual(click.id_conversation, null);
  assert.strictEqual(click.id_etablissement, 'rest-1');
  assert.strictEqual(click.id_produit, 'prod-1');
  assert.strictEqual(click.zone_geo, 'Bonanjo');
});

test('markAttributed fait passer pending -> attributed et attache une conversation', () => {
  const click = attribution.createClickEvent({
    establishmentId: 'rest-1',
    productId: 'prod-1',
    source: 'home_feed',
    canal: 'web_desktop',
    sessionId: 'sess-1',
  });

  const attributed = attribution.markAttributed(click);

  assert.strictEqual(attributed.status, 'attributed');
  assert.strictEqual(attributed.is_attributed, true);
  assert.strictEqual(attributed.id_conversation, `conv_${click.id_clic}`);
  assert.ok(attributed.conversation_opened_at);

  // Idempotent : un second appel ne régénère pas la conversation.
  const again = attribution.markAttributed(attributed);
  assert.strictEqual(again.id_conversation, attributed.id_conversation);
});

test('looksLikeBot détecte les UAs automatisés et lUA vide', () => {
  assert.strictEqual(antifraud.looksLikeBot('Googlebot/2.1'), true);
  assert.strictEqual(antifraud.looksLikeBot('python-requests/2.31'), true);
  assert.strictEqual(antifraud.looksLikeBot(''), true);
  assert.strictEqual(antifraud.looksLikeBot(undefined), true);
  assert.strictEqual(
    antifraud.looksLikeBot('Mozilla/5.0 (Windows NT 10.0) Chrome/120'),
    false
  );
});

test('evaluateClick refuse un bot', () => {
  const result = antifraud.evaluateClick({
    clickLogs: [],
    sessionId: 's1',
    productId: 'p1',
    userAgent: 'curl/8.0',
  });
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.reason, 'bot_or_missing_user_agent');
});

test('evaluateClick refuse un doublon même session + même produit', () => {
  const clickLogs = [
    {
      session_id: 's1',
      id_produit: 'p1',
      timestamp: new Date().toISOString(),
    },
  ];
  const result = antifraud.evaluateClick({
    clickLogs,
    sessionId: 's1',
    productId: 'p1',
    userAgent: 'Mozilla/5.0',
  });
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.reason, 'duplicate_click');
});

test('evaluateClick autorise un clic légitime', () => {
  const result = antifraud.evaluateClick({
    clickLogs: [],
    sessionId: 's-new',
    productId: 'p1',
    userAgent: 'Mozilla/5.0 (iPhone) Safari',
  });
  assert.strictEqual(result.allowed, true);
});
