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
import { generateSchedule, amountInCents } from '../src/records/schedule';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Cadence } from '@freshphones/contracts';

test('schedule fixtures match the executed Django generate_schedule baseline', () => {
  const fixtures = JSON.parse(readFileSync(join(__dirname, 'fixtures/django-schedules.json'), 'utf8')) as {
    total: string; count: number; cadence: Cadence; start: string;
    items: { sequenceNo: number; dueDate: string; expectedAmount: string }[];
  }[];
  for (const fixture of fixtures) {
    const actual = generateSchedule({ contractPrice: fixture.total, installmentCount: fixture.count,
      cadence: fixture.cadence, startDate: new Date(fixture.start) });
    assert.deepEqual(actual.map((item) => ({ ...item, dueDate: item.dueDate.toISOString().slice(0, 10) })), fixture.items);
  }
});

test('installments preserve totals and positive amounts even at centavo boundaries', () => {
  for (const [total, count] of [['100.00', 3], ['0.10', 6], ['9999999999.99', 600], ['0.05', 2], ['0.07', 2]] as const) {
    const schedule = generateSchedule({ contractPrice: total, installmentCount: count, cadence: 'MONTHLY', startDate: new Date('2026-01-31') });
    assert.equal(schedule.reduce((sum, item) => sum + amountInCents(item.expectedAmount), 0n), amountInCents(total));
    assert.ok(schedule.every((item) => amountInCents(item.expectedAmount) > 0n));
  }
  assert.throws(() => generateSchedule({ contractPrice: '0.01', installmentCount: 2, cadence: 'MONTHLY', startDate: new Date('2026-01-01') }));
});
test('cadence follows baseline fixed-day intervals across leap years and month ends', () => {
  for (const [cadence, expected] of [['WEEKLY', '2024-02-07'], ['SEMIMONTHLY', '2024-02-15'], ['MONTHLY', '2024-03-01']] as const) {
    const [item] = generateSchedule({ contractPrice: '1200.50', installmentCount: 1, cadence, startDate: new Date('2024-01-31') });
    assert.equal(item.dueDate.toISOString().slice(0, 10), expected);
    assert.equal(item.expectedAmount, '1200.50');
  }
});

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
