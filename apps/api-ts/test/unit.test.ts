import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  accountSchema,
  accountUpdateSchema,
  batchSchema,
  batchListQuerySchema,
  clientListQuerySchema,
  clientSchema,
  passwordSchema,
  rolePermissions,
  paymentDecisionSchema,
  paymentSchema,
  financeAlertQuerySchema,
  financeAlertReadSchema,
  staffAlertQuerySchema,
  staffAlertReadSchema,
  staffAlertReadAllSchema,
  staffEmailKinds,
  staffEmailTemplateSchema,
  staffEmailTimingSchema,
  staffEmailQuerySchema,
  staffEmailRetrySchema,
} from '@freshphones/contracts';
import { hashPassword, verifyPassword } from '../src/auth/password';
import { readConfig } from '../src/config';
import { generateSchedule, amountInCents } from '../src/records/schedule';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Cadence } from '@freshphones/contracts';
import { spawnSync } from 'node:child_process';
import { ReceiptService } from '../src/finance/receipt.service';
import { allocateVerifiedPayments } from '../src/records/allocation';
import { renderCustomerEmail } from '../src/portal/notification-settings.service';
import { taskAlertKind } from '../src/staff/alert-queries';
import { canReadPaymentResults } from '../src/staff/payment-results';
import { hasResultEmailAccess, taskEmailStage } from '../src/staff/email-queue';

test('staff email reminder stages respect exact before/after boundaries and configured timing', () => {
  const now = new Date('2026-10-06T00:00:00Z');
  const deadline = (hours: number) => new Date(now.getTime() + hours * 3_600_000);
  assert.equal(taskEmailStage(deadline(24), now, 24, 0), 'TASK_DUE_SOON');
  assert.equal(taskEmailStage(new Date(deadline(24).getTime() + 1), now, 24, 0), null);
  assert.equal(taskEmailStage(deadline(0), now, 24, 0), 'TASK_DUE_SOON');
  assert.equal(taskEmailStage(new Date(now.getTime() - 1), now, 24, 0), 'TASK_OVERDUE');
  assert.equal(taskEmailStage(deadline(-2), now, 6, 2), null);
  assert.equal(taskEmailStage(new Date(deadline(-2).getTime() - 1), now, 6, 2), 'TASK_OVERDUE');
  assert.equal(taskEmailStage(deadline(7), now, 6, 2), null);
  assert.equal(taskEmailStage(deadline(6), now, 6, 2), 'TASK_DUE_SOON');
});
test('staff email contracts reject forged recipients, unsafe subjects, unsupported wording and invalid timing', () => {
  const template = { version: 0, enabled: true, subject: 'Staff · {title}', body: 'Please review {message}\nOpen {url}' };
  assert.equal(staffEmailKinds.length, 14);
  assert.ok(staffEmailTemplateSchema.safeParse(template).success);
  for (const changes of [{ subject: 'Hello' }, { subject: '{title}\r\nBcc: bad@example.test' }, { subject: '{title} {secret}' },
    { body: '{message} {url} {notes}' }, { body: 'No details' }, { recipientEmail: 'bad@example.test' }, { version: -1 }])
    assert.equal(staffEmailTemplateSchema.safeParse({ ...template, ...changes }).success, false);
  const timing = { version: 0, dueSoonHours: 24, overdueHours: 0 };
  assert.ok(staffEmailTimingSchema.safeParse(timing).success);
  for (const changes of [{ dueSoonHours: 0 }, { dueSoonHours: 169 }, { overdueHours: -1 }, { overdueHours: 0.5 }, { userId: 'forged-recipient' }])
    assert.equal(staffEmailTimingSchema.safeParse({ ...timing, ...changes }).success, false);
  assert.equal(staffEmailQuerySchema.safeParse({ page: 0 }).success, false);
  assert.equal(staffEmailQuerySchema.safeParse({ status: 'delivered' }).success, false);
  assert.equal(staffEmailRetrySchema.safeParse({ version: 1, recipientEmail: 'bad@example.test' }).success, false);
  assert.equal(staffEmailRetrySchema.safeParse({ version: 0 }).success, false);
});
test('staff Finance result email permissions match the private in-app result policy', () => {
  for (const role of Object.keys(rolePermissions) as (keyof typeof rolePermissions)[])
    assert.equal(hasResultEmailAccess({ role }), canReadPaymentResults({ role }), role);
});

test('Finance results require staff payment recording and reading access, including after a role change', () => {
  for (const [role, permissions] of Object.entries(rolePermissions))
    assert.equal(canReadPaymentResults({ role: role as keyof typeof rolePermissions }),
      role !== 'CUSTOMER' && permissions.includes('PAYMENT_READ') && permissions.includes('PAYMENT_RECORD'), role);
  assert.equal(canReadPaymentResults({ role: 'RECORDS' }), true);
  assert.equal(canReadPaymentResults({ role: 'CUSTOMER' }), false);
  assert.equal(canReadPaymentResults({ role: 'CORE_HANDLER' }), false);
});
test('immutable Finance result reads cannot forge a recipient, payment, decision or version', () => {
  assert.deepEqual(staffAlertReadSchema.parse({ entity: 'payment-result' }), { entity: 'payment-result' });
  assert.ok(staffAlertQuerySchema.safeParse({ scope: 'results', unreadOnly: 'true' }).success);
  assert.ok(staffAlertReadAllSchema.safeParse({ scope: 'results' }).success);
  for (const extra of [{ userId: 'foreign' }, { paymentId: 'foreign' }, { decision: 'VERIFIED' }, { version: 1 }])
    assert.equal(staffAlertReadSchema.safeParse({ entity: 'payment-result', ...extra }).success, false);
});

test('Support alert contracts allow only recipient-owned reads and the Support scope', () => {
  assert.deepEqual(staffAlertReadSchema.parse({ entity: 'support' }), { entity: 'support' });
  assert.ok(staffAlertQuerySchema.safeParse({ scope: 'support', unreadOnly: 'true', page: '2' }).success);
  assert.ok(staffAlertReadAllSchema.safeParse({ scope: 'support' }).success);
  assert.ok(staffEmailQuerySchema.safeParse({ kind: 'SUPPORT_CUSTOMER_REPLY' }).success);
  for (const extra of [{ userId: 'foreign' }, { caseId: 'foreign' }, { body: 'private' }, { version: 1 }, { kind: 'SUPPORT_ASSIGNED' }])
    assert.equal(staffAlertReadSchema.safeParse({ entity: 'support', ...extra }).success, false);
  assert.equal(staffAlertReadAllSchema.safeParse({ scope: 'support', assignedStaffId: 'foreign' }).success, false);
});

test('Owner account alerts accept only receipt actions and account email kinds', () => {
  assert.deepEqual(staffAlertReadSchema.parse({ entity: 'account' }), { entity: 'account' });
  assert.ok(staffAlertQuerySchema.safeParse({ scope: 'accounts', page: '2', unreadOnly: 'true' }).success);
  assert.ok(staffAlertReadAllSchema.safeParse({ scope: 'accounts' }).success);
  assert.ok(staffEmailQuerySchema.safeParse({ kind: 'ACCOUNT_DEACTIVATED' }).success);
  for (const extra of [{ userId: 'foreign' }, { accountId: 'foreign' }, { role: 'OWNER' }, { active: false }, { version: 2 }, { kind: 'ACCOUNT_CREATED' }])
    assert.equal(staffAlertReadSchema.safeParse({ entity: 'account', ...extra }).success, false);
  assert.equal(staffAlertReadAllSchema.safeParse({ scope: 'accounts', role: 'OWNER' }).success, false);
});

test('task alerts advance at the 24-hour and passed-deadline boundaries without timezone drift', () => {
  const now = new Date('2026-10-06T04:00:00.000Z');
  assert.equal(taskAlertKind(new Date(now.getTime() + 86_400_001), now), 'TASK_ASSIGNED');
  assert.equal(taskAlertKind(new Date(now.getTime() + 86_400_000), now), 'TASK_DUE_SOON');
  assert.equal(taskAlertKind(now, now), 'TASK_DUE_SOON');
  assert.equal(taskAlertKind(new Date(now.getTime() - 1), now), 'TASK_OVERDUE');
  assert.equal(taskAlertKind(new Date('2026-10-07T12:00:00+08:00'), now), 'TASK_DUE_SOON');
});
test('staff alerts reject forged recipients, ambiguous reads and invalid scopes', () => {
  assert.deepEqual(staffAlertQuerySchema.parse({}), { page: 1, unreadOnly: false, scope: 'all' });
  assert.ok(staffAlertQuerySchema.safeParse({ scope: 'tasks', unreadOnly: 'true', page: '2' }).success);
  assert.ok(staffAlertReadSchema.safeParse({ entity: 'task', kind: 'TASK_DUE_SOON', deadline: '2026-10-07T12:00:00+08:00' }).success);
  assert.ok(staffAlertReadSchema.safeParse({ entity: 'payment', version: 1 }).success);
  for (const input of [{ entity: 'task', kind: 'TASK_ASSIGNED' }, { entity: 'task', kind: 'TASK_DUE', deadline: '2026-10-07' },
    { entity: 'task', kind: 'TASK_ASSIGNED', deadline: '2026-10-07T04:00:00Z', userId: 'foreign' },
    { entity: 'payment', version: 0 }, { entity: 'payment', version: 1, kind: 'TASK_ASSIGNED' }])
    assert.equal(staffAlertReadSchema.safeParse(input).success, false);
  for (const query of [{ scope: 'customer' }, { page: 0 }, { userId: 'foreign' }])
    assert.equal(staffAlertQuerySchema.safeParse(query).success, false);
  assert.equal(staffAlertReadAllSchema.safeParse({ scope: 'tasks', userId: 'foreign' }).success, false);
});

test('Finance alert reads require a captured version and bounded, explicit queue filters', () => {
  assert.deepEqual(financeAlertQuerySchema.parse({}), { page: 1, unreadOnly: false });
  assert.deepEqual(financeAlertQuerySchema.parse({ page: '2', unreadOnly: 'true' }), { page: 2, unreadOnly: true });
  for (const query of [{ page: '0' }, { page: '100001' }, { unreadOnly: 'yes' }, { userId: 'someone-else' }])
    assert.equal(financeAlertQuerySchema.safeParse(query).success, false);
  assert.ok(financeAlertReadSchema.safeParse({ version: 2 }).success);
  for (const body of [{}, { version: 0 }, { version: 1.5 }, { version: '1' }, { version: 1, userId: 'someone-else' }])
    assert.equal(financeAlertReadSchema.safeParse(body).success, false);
});

test('verified funds allocate by installment order with centavo precision', () => {
  const items = [
    { sequenceNo: 1, dueDate: '2026-01-01', expectedAmount: '33.33' },
    { sequenceNo: 2, dueDate: '2026-02-01', expectedAmount: '33.33' },
    { sequenceNo: 3, dueDate: '2026-12-01', expectedAmount: '33.34' },
  ];
  assert.deepEqual(allocateVerifiedPayments(items, '40.00', '2026-09-26').map(({ paidApplied, status }) => ({ paidApplied, status })), [
    { paidApplied: '33.33', status: 'PAID' },
    { paidApplied: '6.67', status: 'PARTIAL' },
    { paidApplied: '0.00', status: 'UPCOMING' },
  ]);
  assert.equal(allocateVerifiedPayments(items, '0.00', '2026-09-26')[0].status, 'OVERDUE');
  assert.equal(allocateVerifiedPayments(items, '120.00', '2026-09-26')[2].paidApplied, '33.34');
});
test('customer email templates substitute only approved event fields', () => {
  assert.deepEqual(renderCustomerEmail({ subject: 'Update: {title}', body: '{message}\n{url}' },
    { title: 'Payment verified', message: 'Finance checked this payment.', url: 'https://example.test/portal/payments' }),
  { subject: 'Update: Payment verified', text: 'Finance checked this payment.\nhttps://example.test/portal/payments' });
});

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
  assert.ok(paymentSchema.safeParse({ ...payment, receiptTime: '5:42 PM', receiptName: 'MI•••••E T.', receiptPhone: '+63 9•••••2050' }).success);
  assert.equal(paymentSchema.safeParse({ ...payment, receiptTime: '25:99 PM' }).success, false);
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
test('GCash receipt reference continues below a date on the same line', () => {
  const result = spawnSync('python3', [join(__dirname, '../scripts/receipt_ocr.py'), 'gcash', '--text'], {
    input: 'MleceeeE T.\n+63 Qeeeee2050\nSent via GCash\nAmount 460.00\nRef No, 0045 429 Sep 25, 2026 5:42\n643381 PM\n279g CO2e',
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout) as { referenceNumber: string; paymentDate: string; amount: string;
    receiptTime: string; receiptName: string; receiptPhone: string };
  assert.equal(parsed.referenceNumber, '0045 429 643381');
  assert.equal(parsed.paymentDate, '2026-09-25');
  assert.equal(parsed.amount, '460.00');
  assert.equal(parsed.receiptTime, '5:42 PM');
  assert.equal(parsed.receiptName, 'MI•••••E T.');
  assert.equal(parsed.receiptPhone, '+63 9•••••2050');
});
test('GCash receipt reads a partly masked name and spaced full phone', () => {
  const result = spawnSync('python3', [join(__dirname, '../scripts/receipt_ocr.py'), 'gcash', '--text'], {
    input: 'MA+-K Gee T.\n+63 912 345 6789\nAmount 130.00\nRef No. 0045 037 Sep 14, 2026 3:47\n198439 PM',
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout) as { receiptName: string; receiptPhone: string };
  assert.equal(parsed.receiptName, 'MA•K G•• T.');
  assert.equal(parsed.receiptPhone, '+63 912 345 6789');
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
test('Redis config rejects other protocols and requires production credentials, namespaces and remote TLS', () => {
  const previous = { ...process.env };
  try {
    Object.assign(process.env, { NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://fresh:fresh@localhost:5435/synthetic_test', WEB_ORIGIN: 'http://localhost:3000',
      BETTER_AUTH_SECRET: 'synthetic-config-secret-at-least-32-characters', REDIS_URL: 'https://redis.example.test' });
    assert.throws(() => readConfig(), /REDIS_URL must use/);
    Object.assign(process.env, { NODE_ENV: 'production', BETTER_AUTH_URL: 'https://freshphones.example.test/api/auth',
      WEB_ORIGIN: 'https://freshphones.example.test', AUTH_REQUIRE_STAFF_MFA: 'true', REDIS_URL: 'redis://redis.example.test' });
    delete process.env.REDIS_NAMESPACE;
    assert.throws(() => readConfig(), /authenticated Redis/);
    process.env.REDIS_URL = 'redis://:synthetic@redis.example.test'; process.env.REDIS_NAMESPACE = 'synthetic-production';
    assert.throws(() => readConfig(), /requires TLS/);
  } finally { process.env = previous; }
});
test('production startup requires private S3 storage configuration', () => {
  const previous = { ...process.env };
  try {
    Object.assign(process.env, { NODE_ENV: 'production',
      REDIS_URL: 'rediss://:synthetic-test@redis.example.test:6379', REDIS_NAMESPACE: 'synthetic-production',
      BETTER_AUTH_SECRET: 'generated-better-auth-test-secret-at-least-32-characters', BETTER_AUTH_URL: 'https://freshphones.example.test/api/auth', AUTH_REQUIRE_STAFF_MFA: 'true',
      WEB_ORIGIN: 'https://freshphones.example.test', JWT_SECRET: 'generated-unit-test-secret-at-least-32-characters',
      RESEND_API_KEY: 'unit-test-key', EMAIL_FROM: 'Fresh Phones PH <updates@freshphones.ph>', PRIVATE_STORAGE_PROVIDER: 'local' });
    assert.throws(() => readConfig(), /private S3 storage/);
    process.env.PRIVATE_STORAGE_PROVIDER = 's3';
    delete process.env.PRIVATE_STORAGE_S3_ENDPOINT;
    assert.throws(() => readConfig(), /Private S3 storage requires/);
  } finally { process.env = previous; }
});
test('production startup rejects the example sender and unapproved privacy documents', () => {
  const previous = { ...process.env };
  try {
    Object.assign(process.env, { NODE_ENV: 'production',
      REDIS_URL: 'rediss://:synthetic-test@redis.example.test:6379', REDIS_NAMESPACE: 'synthetic-production',
      BETTER_AUTH_SECRET: 'generated-better-auth-test-secret-at-least-32-characters', BETTER_AUTH_URL: 'https://freshphones.example.test/api/auth', AUTH_REQUIRE_STAFF_MFA: 'true',
      WEB_ORIGIN: 'https://freshphones.example.test', JWT_SECRET: 'generated-unit-test-secret-at-least-32-characters',
      RESEND_API_KEY: 'unit-test-key', PRIVATE_STORAGE_PROVIDER: 's3',
      PRIVATE_STORAGE_S3_ENDPOINT: 'https://storage.example.test/storage/v1/s3',
      PRIVATE_STORAGE_S3_BUCKET: 'private-files', PRIVATE_STORAGE_S3_ACCESS_KEY: 'key',
      PRIVATE_STORAGE_S3_SECRET_KEY: 'secret' });
    delete process.env.EMAIL_FROM;
    assert.throws(() => readConfig(), /explicit EMAIL_FROM/);
    process.env.EMAIL_FROM = 'Fresh Phones PH <updates@example.com>';
    assert.throws(() => readConfig(), /explicit EMAIL_FROM/);
    process.env.EMAIL_FROM = 'Fresh Phones Test <onboarding@resend.dev>';
    assert.throws(() => readConfig(), /explicit EMAIL_FROM/);
    process.env.EMAIL_FROM = 'Fresh Phones PH <updates@freshphones.ph>';
    assert.throws(() => readConfig(), /approved customer, employee and applicant privacy notices/);
  } finally { process.env = previous; }
});
test('production identity rejects legacy-only secrets, disabled staff MFA and cross-origin cookie deployment', () => {
  const previous = { ...process.env };
  try {
    Object.assign(process.env, { NODE_ENV: 'production',
      REDIS_URL: 'rediss://:synthetic-test@redis.example.test:6379', REDIS_NAMESPACE: 'synthetic-production', WEB_ORIGIN: 'https://freshphones.example.test',
      JWT_SECRET: 'legacy-unit-test-secret-at-least-32-characters', BETTER_AUTH_URL: 'https://freshphones.example.test/api/auth' });
    delete process.env.BETTER_AUTH_SECRET; delete process.env.AUTH_REQUIRE_STAFF_MFA;
    assert.throws(() => readConfig(), /generated Better Auth secret/);
    process.env.BETTER_AUTH_SECRET = 'generated-better-auth-test-secret-at-least-32-characters';
    process.env.AUTH_REQUIRE_STAFF_MFA = 'false'; assert.throws(() => readConfig(), /staff MFA/);
    process.env.AUTH_REQUIRE_STAFF_MFA = 'true'; process.env.BETTER_AUTH_URL = 'https://backend.example.test/api/auth';
    assert.throws(() => readConfig(), /web origin/);
    process.env.BETTER_AUTH_URL = 'https://freshphones.example.test/unexpected';
    assert.throws(() => readConfig(), /BETTER_AUTH_URL/);
  } finally { process.env = previous; }
});
test('record list contracts accept inclusive date bounds, one-sided dates and every correct status', () => {
  for (const [schema, statuses] of [[batchListQuerySchema, ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']],
    [clientListQuerySchema, ['ACTIVE', 'ON_HOLD', 'COMPLETED']]] as const) {
    for (const status of statuses) assert.ok(schema.safeParse({ status }).success);
    assert.deepEqual(schema.parse({ q: '  case  ', model: ' iPhone ', dateFrom: '2028-02-29', dateTo: '2028-02-29' }),
      { page: 1, q: 'case', model: 'iPhone', dateFrom: '2028-02-29', dateTo: '2028-02-29' });
    assert.ok(schema.safeParse({ dateFrom: '2028-02-29' }).success);
    assert.ok(schema.safeParse({ dateTo: '2028-02-29' }).success);
  }
});
test('record query contracts reject unknown keys, duplicate facets, invalid dates and wrong record statuses', () => {
  for (const schema of [batchListQuerySchema, clientListQuerySchema])
    for (const query of [{ dateFrom: '2027-02-29' }, { dateTo: '2028-02-30' },
      { dateFrom: '2028-03-01', dateTo: '2028-02-29' }, { model: ['iPhone', 'iPad'] },
      { q: 'a'.repeat(101) }, { model: 'a'.repeat(101) }, { userId: 'foreign' }, { dateFrom: '2028-01-01T00:00:00Z' }])
      assert.equal(schema.safeParse(query).success, false, JSON.stringify(query));
  assert.equal(batchListQuerySchema.safeParse({ status: 'ON_HOLD' }).success, false);
  assert.equal(clientListQuerySchema.safeParse({ status: 'CANCELLED' }).success, false);
});
