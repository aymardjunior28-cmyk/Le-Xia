'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const establishments = require('../src/establishments');
const { seedEstablishments } = require('../src/seed');

const validEstablishment = {
  nom: 'Test',
  type: 'restaurant',
  quartier: 'Bonanjo',
  whatsapp: '237655000000',
};

test('validateEstablishmentInput rejects invalid fields and media URLs', () => {
  assert.match(
    establishments.validateEstablishmentInput({ ...validEstablishment, note: 11 }),
    /note doit être comprise/
  );
  assert.match(
    establishments.validateEstablishmentInput({ ...validEstablishment, photo: 'javascript:alert(1)' }),
    /photo doit être/
  );
  assert.match(
    establishments.validateEstablishmentInput({
      ...validEstablishment,
      products: [{ nom: 'Invalid', prix: -1 }],
    }),
    /prix du produit/
  );
  assert.strictEqual(
    establishments.validateEstablishmentInput({
      ...validEstablishment,
      photo: '/uploads/photo.png',
      photos: ['/uploads/decor-1.png', 'https://example.com/decor-2.jpg'],
      products: [{ nom: 'Plat', prix: 3500 }],
    }),
    null
  );
  assert.match(
    establishments.validateEstablishmentInput({ ...validEstablishment, photos: ['javascript:alert(1)'] }),
    /photos doit contenir/
  );
  assert.match(
    establishments.validateEstablishmentInput({ ...validEstablishment, photos: ['/1.jpg', '/2.jpg', '/3.jpg', '/4.jpg'] }),
    /photos doit contenir/
  );
});

test('buildEstablishment stores up to three decor photos', () => {
  assert.deepEqual(
    establishments.buildEstablishment({ ...validEstablishment, photos: ['/1.jpg', '/2.jpg', '/3.jpg'] }, 'test-id').photos,
    ['/1.jpg', '/2.jpg', '/3.jpg']
  );
});

test('note provisoire must be boolean and is stored only with a note', () => {
  assert.match(
    establishments.validateEstablishmentInput({
      ...validEstablishment,
      note_provisoire: 'true',
    }),
    /note_provisoire doit être un booléen/
  );
  assert.equal(
    establishments.buildEstablishment(
      { ...validEstablishment, note: 8.5, note_provisoire: true },
      'test-id'
    ).note_provisoire,
    true
  );
  assert.equal(
    establishments.buildEstablishment(
      { ...validEstablishment, note_provisoire: true },
      'test-id'
    ).note_provisoire,
    false
  );
});

test('seed catalog photos are local files', () => {
  for (const establishment of seedEstablishments) {
    for (const product of establishment.products || []) {
      assert.match(product.photo, /^\/images\/[^/]+$/);
      assert.ok(
        fs.existsSync(path.join(__dirname, '..', 'public', product.photo.slice(1))),
        `Missing local image ${product.photo}`
      );
    }
  }
});
