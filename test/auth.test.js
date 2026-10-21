'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const auth = require('../src/auth');

test('ensureSuperAdmin exige une configuration initiale forte', () => {
  assert.throws(() => auth.ensureSuperAdmin([]), /SUPERADMIN_EMAIL/);
  assert.throws(
    () => auth.ensureSuperAdmin([], { email: 'admin@example.cm', password: 'short' }),
    /12 à 1024 caractères/
  );

  const users = [];
  assert.strictEqual(
    auth.ensureSuperAdmin(users, {
      email: ' ADMIN@example.cm ',
      password: 'Long-enough-test-password!',
    }),
    true
  );
  assert.strictEqual(users[0].email, 'admin@example.cm');
  assert.strictEqual(auth.verifyPassword('Long-enough-test-password!', users[0].password_salt, users[0].password_hash), true);
  assert.strictEqual(auth.ensureSuperAdmin(users), false);
});

test('ensureSuperAdmin réinitialise le compte super-admin historique', () => {
  const users = [{
    id: 'user_super_admin',
    email: 'superadmin@douala.cm',
    role: auth.ROLES.SUPER_ADMIN,
    password_hash: 'legacy',
    password_salt: 'legacy',
  }];
  assert.throws(() => auth.ensureSuperAdmin(users), /SUPERADMIN_EMAIL/);
  assert.strictEqual(
    auth.ensureSuperAdmin(users, {
      email: 'new-admin@example.cm',
      password: 'New-secure-password-2026!',
    }),
    true
  );
  assert.strictEqual(users[0].email, 'new-admin@example.cm');
  assert.strictEqual(
    auth.verifyPassword('New-secure-password-2026!', users[0].password_salt, users[0].password_hash),
    true
  );
});
