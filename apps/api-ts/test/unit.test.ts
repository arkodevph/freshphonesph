import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  accountSchema,
  batchSchema,
  clientSchema,
  passwordSchema,
  rolePermissions,
} from '@freshphones/contracts';
import { hashPassword, verifyPassword } from '../src/auth/password';
import { readConfig } from '../src/config';

test('passwords use independent salts and reject an incorrect password', async () => {
  const one = await hashPassword('A-strong-password-123!');
  const two = await hashPassword('A-strong-password-123!');
  assert.notEqual(one, two);
  assert.ok(await verifyPassword('A-strong-password-123!', one));
  assert.equal(await verifyPassword('wrong-password', one), false);
  assert.equal(await verifyPassword('password', 'malformed'), false);
});
test('customer linkage and employee roles cannot be mixed', () => {
  const input = {
    name: 'Sample Person',
    email: 'person@example.test',
    password: 'A-strong-password-123!',
    role: 'CUSTOMER',
  };
  assert.equal(accountSchema.safeParse(input).success, false);
  assert.ok(
    accountSchema.safeParse({ ...input, clientId: '00000000-0000-4000-8000-000000000001' }).success,
  );
  assert.equal(
    accountSchema.safeParse({
      ...input,
      role: 'OWNER',
      clientId: '00000000-0000-4000-8000-000000000001',
    }).success,
    false,
  );
});
test('record validation rejects invalid dates, unknown fields and missing links', () => {
  const batch = {
    code: 'FP-003',
    model: 'iPhone 16',
    status: 'ACTIVE',
    startDate: '2026-09-01',
    endDate: '2027-03-01',
  };
  assert.ok(batchSchema.safeParse(batch).success);
  assert.equal(batchSchema.safeParse({ ...batch, endDate: '2026-01-01' }).success, false);
  assert.equal(batchSchema.safeParse({ ...batch, startDate: '2026-02-30' }).success, false);
  assert.equal(batchSchema.safeParse({ ...batch, hidden: true }).success, false);
  assert.equal(clientSchema.safeParse({ name: 'Sample Person' }).success, false);
  assert.equal(passwordSchema.safeParse('short').success, false);
});
test('least privilege does not give management or customers account administration', () => {
  assert.ok(rolePermissions.OWNER.includes('ACCOUNT_MANAGE'));
  assert.equal(rolePermissions.COO.includes('ACCOUNT_MANAGE'), false);
  assert.equal(rolePermissions.FINANCE_OFFICER.includes('BATCH_MANAGE'), false);
  assert.deepEqual(rolePermissions.CUSTOMER, []);
});
test('production startup rejects missing email and insecure origins', () => {
  const previous = { ...process.env };
  try {
    process.env.NODE_ENV = 'production';
    process.env.WEB_ORIGIN = 'http://localhost:3100';
    assert.throws(() => readConfig());
  } finally {
    process.env = previous;
  }
});
