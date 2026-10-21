const test = require('node:test');
const assert = require('node:assert');

const billing = require('../src/billing');

test('createBlock restaurant borne le prix dans la grille 350-420', () => {
  const { ok, block } = billing.createBlock({
    establishmentId: 'rest-1',
    verticale: 'restaurant',
    nombreConversations: 10,
    prixUnitaire: 350,
  });

  assert.strictEqual(ok, true);
  assert.strictEqual(block.prix_unitaire, 350);
  assert.strictEqual(block.montant_total, 3500);
  assert.strictEqual(block.statut, 'active');
  assert.strictEqual(block.nombre_conversations, 10);
  assert.strictEqual(block.conversations_consommees, 0);
});

test('createBlock refuse un prix hors grille', () => {
  const result = billing.createBlock({
    establishmentId: 'rest-1',
    verticale: 'restaurant',
    nombreConversations: 10,
    prixUnitaire: 9999,
  });
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /hors grille/);
});

test('createBlock refuse une verticale inconnue', () => {
  const result = billing.createBlock({
    establishmentId: 'x',
    verticale: 'spa',
    nombreConversations: 5,
  });
  assert.strictEqual(result.ok, false);
});

test('createBlock refuse un nombre de conversations invalide', () => {
  const result = billing.createBlock({
    establishmentId: 'rest-1',
    verticale: 'restaurant',
    nombreConversations: 0,
  });
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /entier positif/);
});

test('meublé : grille 1500-1800', () => {
  const { ok, block } = billing.createBlock({
    establishmentId: 'meuble-1',
    verticale: 'meuble',
    nombreConversations: 4,
    prixUnitaire: 1800,
  });
  assert.strictEqual(ok, true);
  assert.strictEqual(block.montant_total, 7200);
});

test('consumeConversation décrémente et épuise le bloc', () => {
  const blocks = [];
  billing.createBlock({ establishmentId: 'rest-1', verticale: 'restaurant', nombreConversations: 2, prixUnitaire: 400 });
  blocks.push(billing.createBlock({ establishmentId: 'rest-1', verticale: 'restaurant', nombreConversations: 2, prixUnitaire: 400, id: 'b1' }).block);

  const c1 = billing.consumeConversation(blocks, 'rest-1');
  assert.strictEqual(c1.ok, true);
  assert.strictEqual(blocks[0].conversations_consommees, 1);
  assert.strictEqual(blocks[0].statut, 'active');

  const c2 = billing.consumeConversation(blocks, 'rest-1');
  assert.strictEqual(c2.ok, true);
  assert.strictEqual(blocks[0].conversations_consommees, 2);
  assert.strictEqual(blocks[0].statut, 'epuise');
});

test('consumeConversation échoue sans bloc actif', () => {
  const result = billing.consumeConversation([], 'rest-1');
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'aucun_bloc_actif');
});

test('isBlockUsable exclut les blocs expirés ou épuisés', () => {
  const now = Date.now();
  const block = {
    statut: 'active',
    conversations_consommees: 0,
    nombre_conversations: 3,
    date_expiration: new Date(now + 60_000).toISOString(),
  };
  assert.strictEqual(billing.isBlockUsable(block, now), true);
  assert.strictEqual(
    billing.isBlockUsable({ ...block, date_expiration: new Date(now - 1).toISOString() }, now),
    false
  );
  assert.strictEqual(
    billing.isBlockUsable({ ...block, conversations_consommees: 3 }, now),
    false
  );
});

test('consumeConversation ne puise pas dans le bloc d un autre établissement', () => {
  const blocks = [];
  blocks.push(
    billing.createBlock({ establishmentId: 'other', verticale: 'restaurant', nombreConversations: 5, prixUnitaire: 350, id: 'bX' }).block
  );
  const result = billing.consumeConversation(blocks, 'rest-1');
  assert.strictEqual(result.ok, false);
});
