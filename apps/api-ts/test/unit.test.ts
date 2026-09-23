import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  accountSchema,
  accountUpdateSchema,
  batchSchema,
  clientSchema,
  passwordSchema,
  rolePermissions,
  paymentDecisionSchema,
  paymentSchema,
} from '@freshphones/contracts';
import { hashPassword, verifyPassword } from '../src/auth/password';
import { readConfig } from '../src/config';
import { generateSchedule, amountInCents } from '../src/records/schedule';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Cadence } from '@freshphones/contracts';
import { spawnSync } from 'node:child_process';
import { ReceiptService } from '../src/finance/receipt.service';

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
test('account updates require a version and at least one deliberate change', () => {
  assert.ok(accountUpdateSchema.safeParse({ version: 1, role: 'FINANCE_OFFICER' }).success);
  assert.ok(accountUpdateSchema.safeParse({ version: 2, active: false }).success);
  assert.ok(accountUpdateSchema.safeParse({ version: 3, role: 'RECORDS', active: true }).success);
  assert.equal(accountUpdateSchema.safeParse({ version: 1 }).success, false);
  assert.equal(accountUpdateSchema.safeParse({ version: 0, active: true }).success, false);
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
  assert.equal(rolePermissions.CUSTOMER.includes('ACCOUNT_MANAGE'), false);
});
test('finance payment contracts preserve the human verification boundary', () => {
  const payment = {
    clientId: '00000000-0000-4000-8000-000000000001',
    amount: '2000.00', paymentDate: '2026-09-22', method: 'GCash', referenceNumber: 'GC123',
  };
  assert.ok(paymentSchema.safeParse(payment).success);
  assert.equal(paymentSchema.safeParse({ ...payment, amount: '0.00' }).success, false);
  assert.ok(paymentDecisionSchema.safeParse({ decision: 'VERIFIED', notes: 'Matched GCash', version: 1 }).success);
  assert.equal(paymentDecisionSchema.safeParse({ decision: 'PENDING', notes: 'Reset', version: 1 }).success, false);
  assert.ok(rolePermissions.FINANCE_OFFICER.includes('PAYMENT_VERIFY'));
  assert.ok(rolePermissions.OWNER.includes('PAYMENT_VERIFY'));
  assert.equal(rolePermissions.RECORDS.includes('PAYMENT_VERIFY'), false);
  assert.ok(rolePermissions.CUSTOMER.includes('PAYMENT_READ'));
  assert.ok(rolePermissions.ANALYTICS.includes('REPORT_VIEW'));
  assert.equal(rolePermissions.CUSTOMER.includes('REPORT_VIEW'), false);
});
test('receipt templates extract editable GCash and Maya candidates', () => {
  const fixtures = [
    ['gcash', 'Amount Sent: PHP 1,250.00\nReference No. 1234567890123\nDate: September 22, 2026 1:23 PM'],
    ['gcash', 'Amount 200.00\nTotal Amount Sent ₱200.00\nRef No. 8017443499106 May 12, 2024 9:21 AM'],
    ['maya', 'You Sent P500.50\nReference ID: MAYA-ABC-12345\nDate & Time: 09/21/2026 08:10 PM'],
  ] as const;
  for (const [template, receipt] of fixtures) {
    const result = spawnSync('python3', [join(__dirname, '../scripts/receipt_ocr.py'), template, '--text'], {
      input: receipt, encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout) as {
      amount: string; referenceNumber: string; paymentDate: string; confidence: number;
    };
    assert.ok(parsed.amount);
    assert.ok(parsed.referenceNumber);
    assert.match(parsed.paymentDate, /^(2026-09-2[12]|2024-05-12)$/);
    assert.equal(parsed.confidence, 1);
  }
});
test('receipt extraction leaves an unknown payment date for human review', () => {
  const result = spawnSync('python3', [join(__dirname, '../scripts/receipt_ocr.py'), 'gcash', '--text'], {
    input: 'Amount Sent: PHP 750.00\nReference No. 1234567890123', encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout) as { paymentDate: string | null; warnings: string[] };
  assert.equal(parsed.paymentDate, null);
  assert.ok(parsed.warnings.some((warning) => warning.includes('Payment date was not found')));
});
test('receipt scanner rejects unsupported templates and non-images before OCR', async () => {
  const scanner = new ReceiptService();
  await assert.rejects(scanner.scan('unknown', undefined), /supported receipt type/);
  await assert.rejects(scanner.scan('gcash', {
    buffer: Buffer.from('not an image'), mimetype: 'text/plain', size: 12,
  }), /JPG, PNG or WebP/);
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
