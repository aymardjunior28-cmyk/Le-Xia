'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const establishments = require('../src/establishments');

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
      products: [{ nom: 'Plat', prix: 3500 }],
    }),
    null
  );
});
