import test from 'node:test';
import assert from 'node:assert/strict';
import { STAFF_ACCOUNTS } from './AuthContext.tsx';

test('STAFF_ACCOUNTS provides valid accounts for all required roles', () => {
  const roles = ['owner', 'manager', 'cashier', 'inventory_staff'] as const;

  for (const role of roles) {
    const acc = STAFF_ACCOUNTS[role];
    assert.ok(acc, `Account for ${role} should exist`);
    assert.equal(acc.role, role);
    assert.ok(acc.email.includes('@'));
    assert.ok(acc.pin.length >= 4, `PIN for ${role} should be at least 4 digits`);
    assert.ok(acc.defaultPassword.length >= 6, `Password for ${role} should be at least 6 characters`);
    assert.ok(acc.profile.full_name.length > 0);
  }
});

test('PIN codes are unique per role for fast PIN login', () => {
  const pins = Object.values(STAFF_ACCOUNTS).map((acc) => acc.pin);
  const uniquePins = new Set(pins);
  assert.equal(uniquePins.size, pins.length, 'Each staff role must have a distinct PIN code');
});

test('Owner and Cashier roles have expected credentials', () => {
  assert.equal(STAFF_ACCOUNTS.owner.pin, '9999');
  assert.equal(STAFF_ACCOUNTS.owner.email, 'owner@kopi99warungboto.id');

  assert.equal(STAFF_ACCOUNTS.cashier.pin, '1234');
  assert.equal(STAFF_ACCOUNTS.cashier.email, 'kasir@kopi99warungboto.id');
});
