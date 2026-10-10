import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { paymentAdjustmentSchema, roles, rolePermissions, type Role, type User } from '@freshphones/contracts';
import { createApp } from '../src/app';
import { Database } from '../src/database';
import { FinanceService } from '../src/finance/finance.service';
import { hashPassword } from '../src/auth/password';
import type { Config } from '../src/config';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test')) throw new Error('Adjustment tests require a dedicated TEST_DATABASE_URL ending in _test.');
const origin = 'http://localhost:3100'; const suffix = randomUUID().slice(0, 8);
const sessions = new Map<Role, { id: string; cookie: string }>();
let app: INestApplication; let db: Database; let base: string; let batchId: string; let linkedClientId: string;
const request = (role: Role | null, path: string, body?: unknown, method = body ? 'POST' : 'GET') => fetch(`${base}/api${path}`, {
  method, headers: { Origin: origin, Cookie: role ? sessions.get(role)!.cookie : '', ...(body ? { 'Content-Type': 'application/json' } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
const input = (correctedAmount: string, expectedRevision = 0) => ({ correctedAmount, expectedRevision, paymentVersion: 2,
  requestId: randomUUID(), reason: 'Checked the receipt and corrected the credited amount.' });
async function verified(amount = '10.00', clientId = linkedClientId) {
  const row = await db.payment.create({ data: { clientId, batchId, amount, method: 'GCash', referenceNumber: `PRIVATE-${randomUUID()}`,
    paymentDate: new Date('2049-03-01'), recordedById: sessions.get('OWNER')!.id } });
  const response = await request('FINANCE_OFFICER', `/payments/${row.id}/verify`, { decision: 'VERIFIED', version: 1, notes: 'Synthetic receipt checked.' });
  assert.equal(response.status, 200); return db.payment.findUniqueOrThrow({ where: { id: row.id } });
}
async function newClient(due = '100.00') {
  const client = await db.client.create({ data: { batchId, name: `Private adjustment ${randomUUID()}`, email: `adjust-client-${randomUUID()}@example.test`, phone: 'Private phone' } });
  await db.scheduleItem.create({ data: { clientId: client.id, sequenceNo: 1, dueDate: new Date('2049-04-01'), expectedAmount: due } });
  return client.id;
}
async function balance(clientId: string) { const response = await request('OWNER', `/clients/${clientId}/balance`); assert.equal(response.status, 200); return response.json(); }

before(async () => {
  app = await createApp({ NODE_ENV: 'test', PORT: 4100, HOST: '127.0.0.1', DATABASE_URL: databaseUrl, WEB_ORIGIN: origin,
    JWT_SECRET: 'adjustment-test-only-secret-longer-than-32-characters', EMAIL_FROM: 'test@example.test', CUSTOMER_REMINDER_DAYS_BEFORE: '',
    PRIVATE_STORAGE_PROVIDER: 'local', PRIVATE_STORAGE_S3_REGION: 'ap-southeast-1' } as Config);
  await app.listen(0, '127.0.0.1'); base = await app.getUrl(); db = app.get(Database);
  batchId = (await db.batch.create({ data: { code: `ADJUST-${suffix}`, model: 'Private model', startDate: new Date('2049-01-01'), endDate: new Date('2049-12-31') } })).id;
  linkedClientId = await newClient();
  const password = 'Adjustment-test-password-123!'; const passwordHash = await hashPassword(password);
  await db.loginAttempt.deleteMany();
  for (const role of roles) {
    const person = await db.user.create({ data: { name: `Adjustment ${role}`, email: `${role.toLowerCase()}-adjust-${suffix}@example.test`,
      passwordHash, role, ...(role === 'CUSTOMER' ? { clientId: linkedClientId } : {}) } });
    const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: person.email, password }) });
    assert.equal(login.status, 200); sessions.set(role, { id: person.id, cookie: login.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ') });
  }
});
after(async () => { if (app) await app.close(); });

test('only current PAYMENT_VERIFY grants permit an adjustment, with authentication and the full role matrix', async () => {
  const payment = await verified(); let revision = 0;
  assert.equal((await request(null, `/payments/${payment.id}/adjustments`, input('8.00'))).status, 401);
  for (const role of roles) {
    const response = await request(role, `/payments/${payment.id}/adjustments`, input(revision ? '7.00' : '8.00', revision));
    const permitted = rolePermissions[role].includes('PAYMENT_VERIFY'); assert.equal(response.status, permitted ? 200 : 403, role);
    if (permitted) revision++;
  }
  assert.equal(await db.paymentAdjustment.count({ where: { paymentId: payment.id } }), 2);
});

test('signed decimal corrections, overpayment, reversal and restoration leave the original verified payment unchanged', async () => {
  const clientId = await newClient('100.00'); const original = await verified('125.50', clientId);
  const path = `/payments/${original.id}/adjustments`;
  assert.equal((await balance(clientId)).overpaid, '25.50');
  const first = await request('FINANCE_OFFICER', path, input('80.25')); assert.equal(first.status, 200);
  const credit = await first.json(); assert.equal(credit.amount, '125.50'); assert.equal(credit.effectiveAmount, '80.25');
  assert.equal(credit.adjustments[0].amount, '-45.25'); assert.equal(credit.adjustments[0].reason, input('0').reason);
  assert.equal((await balance(clientId)).remainingBalance, '19.75');
  const schedule = await (await request('OWNER', `/clients/${clientId}/schedule`)).json(); assert.equal(schedule.items[0].paidApplied, '80.25');
  assert.equal(schedule.items[0].status, 'PARTIAL');
  assert.equal((await request('OWNER', path, input('0.00', 1))).status, 200);
  assert.equal((await balance(clientId)).verifiedPaid, '0.00'); assert.equal((await balance(clientId)).remainingBalance, '100.00');
  assert.equal((await request('OWNER', path, input('100.01', 2))).status, 200);
  assert.equal((await balance(clientId)).overpaid, '0.01');
  assert.deepEqual(await db.payment.findUniqueOrThrow({ where: { id: original.id } }), original);
  const adjustments = await db.paymentAdjustment.findMany({ where: { paymentId: original.id }, orderBy: { sequence: 'asc' } });
  assert.deepEqual(adjustments.map((entry) => entry.amount.toFixed(2)), ['-45.25', '-80.25', '100.01']);
  assert.equal(await db.auditEntry.count({ where: { entity: 'payment_adjustment', recordId: { in: adjustments.map((entry) => entry.id) }, action: 'payment.adjusted' } }), 3);
  const pending = await db.payment.create({ data: { clientId, batchId, amount: '500.00', method: 'Cash', paymentDate: new Date('2049-03-01'), recordedById: sessions.get('OWNER')!.id } });
  assert.equal((await balance(clientId)).verifiedPaid, '100.01');
  assert.equal((await request('OWNER', `/payments/${pending.id}/adjustments`, { ...input('5'), paymentVersion: 1 })).status, 409);
  assert.equal((await request('OWNER', `/payments/${original.id}`, { version: 2, record: { clientId, amount: '1.00', paymentDate: '2049-03-01', method: 'Cash' } }, 'PATCH')).status, 409);
});

test('strict input rejects negative, oversized, fractional, missing and no-op requests without ledger changes', async () => {
  const payment = await verified(); const path = `/payments/${payment.id}/adjustments`;
  for (const facet of [{ correctedAmount: '-1.00' }, { correctedAmount: '10000000000.00' }, { correctedAmount: '1.001' }, { correctedAmount: 1 },
    { correctedAmount: 'NaN' }, { correctedAmount: '01.00' }, { expectedRevision: -1 }, { expectedRevision: 1.5 }, { reason: 'short' },
    { reason: '          ' }, { reason: 'x'.repeat(1001) }, { requestId: 'invalid' }, { paymentVersion: 0 }, { actorId: sessions.get('OWNER')!.id }])
    assert.equal((await request('OWNER', path, { ...input('9.99'), ...facet })).status, 400, JSON.stringify(facet));
  assert.equal((await request('OWNER', path, { correctedAmount: '9.99' })).status, 400);
  assert.equal((await request('OWNER', path, input('10.00'))).status, 400);
  assert.equal((await request('OWNER', path, { ...input('9'), paymentVersion: 1 })).status, 409);
  assert.equal((await request('OWNER', `/payments/${randomUUID()}/adjustments`, input('9'))).status, 404);
  assert.equal(await db.paymentAdjustment.count({ where: { paymentId: payment.id } }), 0);
  assert.ok(paymentAdjustmentSchema.safeParse(input('0')).success);
});

test('identical retries are idempotent, request IDs are bound to the actor and payload, and concurrent stale revisions cannot double-adjust', async () => {
  const clientId = await newClient(); const payment = await verified('10.00', clientId); const path = `/payments/${payment.id}/adjustments`;
  const body = input('8.01'); const responses = await Promise.all([request('OWNER', path, body), request('OWNER', path, body)]);
  assert.deepEqual(responses.map((response) => response.status), [200, 200]);
  assert.equal(await db.paymentAdjustment.count({ where: { paymentId: payment.id } }), 1);
  assert.equal((await request('OWNER', path, { ...body, correctedAmount: '8.02' })).status, 409);
  assert.equal((await request('FINANCE_OFFICER', path, body)).status, 409);
  const distinct = await Promise.all([request('OWNER', path, input('7.01', 1)), request('FINANCE_OFFICER', path, input('6.01', 1))]);
  assert.deepEqual(distinct.map((response) => response.status).sort(), [200, 409]);
  assert.equal(await db.paymentAdjustment.count({ where: { paymentId: payment.id } }), 2);
  const winner = distinct.find((response) => response.status === 200)!; const result = await winner.json();
  assert.equal((await balance(clientId)).verifiedPaid, result.effectiveAmount);
  assert.equal((await request('OWNER', path, input('5.01', 1))).status, 409);
  const retry = await request('OWNER', path, body); assert.equal(retry.status, 200); assert.equal((await retry.json()).effectiveAmount, result.effectiveAmount);
});

test('balance, summary, statement, confirmation and customer history use net credit while adjustment reasons and actors stay private', async () => {
  const payment = await verified('30.10'); const body = { ...input('20.05'), reason: 'Private staff evidence: receipt amount corrected after review.' };
  assert.equal((await request('OWNER', `/payments/${payment.id}/adjustments`, body)).status, 200);
  const own = await (await request('CUSTOMER', `/payments?id=${payment.id}`)).json(); const row = own.items[0];
  assert.equal(row.amount, '30.10'); assert.equal(row.effectiveAmount, '20.05'); assert.equal(row.adjustmentRevision, 1);
  assert.equal(row.adjustments[0].reason, undefined); assert.equal(row.adjustments[0].actor, undefined);
  const statement = await (await request('CUSTOMER', `/clients/${linkedClientId}/statement`)).json();
  const entry = statement.verifiedPayments.find((item: { id: string }) => item.id === payment.id);
  assert.equal(entry.effectiveAmount, '20.05');
  const sum = statement.verifiedPayments.reduce((total: number, item: { effectiveAmount: string }) => total + Math.round(Number(item.effectiveAmount) * 100), 0);
  assert.equal(sum, Math.round(Number(statement.balance.verifiedPaid) * 100));
  assert.equal((await (await request('CUSTOMER', '/payments/summary')).json()).verifiedAmount, statement.balance.verifiedPaid);
  const confirmation = await (await request('CUSTOMER', `/payments/${payment.id}/confirmation`)).json();
  assert.equal(confirmation.officialTaxInvoice, false); assert.equal(confirmation.payment.effectiveAmount, '20.05');
  for (const text of [JSON.stringify(own), JSON.stringify(statement), JSON.stringify(confirmation)]) assert.equal(text.includes(body.reason), false);
  const other = await verified('10.00', await newClient());
  assert.equal((await request('CUSTOMER', `/payments/${other.id}/confirmation`)).status, 404);
  assert.equal((await request('CUSTOMER', `/clients/${other.clientId}/statement`)).status, 404);
  assert.equal((await (await request('CUSTOMER', `/payments?id=${other.id}`)).json()).total, 0);
  const notifications = await db.notification.findMany({ where: { userId: sessions.get('CUSTOMER')!.id, title: 'Payment credit adjusted' } });
  assert.equal(notifications.length, 3); // Two permission-matrix adjustments plus this one; retries never duplicate notices.
  assert.ok(notifications.some((notice) => notice.targetPath === `/portal/financial-document?payment=${payment.id}`));
  assert.ok(notifications.every((notice) => !notice.message.includes(body.reason)));
});

test('all live report/export totals reconcile to net credit; original claims and saved snapshots retain their evidence', async () => {
  const scopedBatch = await db.batch.create({ data: { code: `ADJ-RPT-${suffix}`, model: 'Private report model', startDate: new Date('2049-01-01'), endDate: new Date('2049-12-31') } });
  const client = await db.client.create({ data: { batchId: scopedBatch.id, name: 'Private report adjustment person', email: `adjust-report-${suffix}@example.test`, phone: 'Private phone' } });
  await db.scheduleItem.create({ data: { clientId: client.id, sequenceNo: 1, dueDate: new Date('2049-04-01'), expectedAmount: '100.00' } });
  const pending = await db.payment.create({ data: { clientId: client.id, batchId: scopedBatch.id, amount: '125.50', method: 'GCash',
    paymentDate: new Date('2049-03-01'), recordedById: sessions.get('OWNER')!.id } });
  assert.equal((await request('OWNER', `/payments/${pending.id}/verify`, { decision: 'VERIFIED', notes: 'Synthetic Finance review.', version: 1 })).status, 200);
  const scope = `batchId=${scopedBatch.id}&dateFrom=2049-03-01&dateTo=2049-03-01`;
  const saved = [];
  for (const kind of ['PAYMENTS', 'COLLECTIONS', 'RECONCILIATION']) {
    const response = await request('ANALYTICS', '/reports/snapshots', { kind, periodStart: '2049-03-01', periodEnd: '2049-03-01', batchId: scopedBatch.id });
    assert.equal(response.status, 201); saved.push(await response.json());
  }
  assert.equal((await request('FINANCE_OFFICER', `/payments/${pending.id}/adjustments`, input('80.25'))).status, 200);
  const paymentReport = await (await request('ANALYTICS', `/reports/payments?${scope}`)).json();
  assert.equal(paymentReport.verifiedAmount, '80.25'); assert.equal(paymentReport.originalVerifiedAmount, '125.50'); assert.equal(paymentReport.adjustmentAmount, '-45.25');
  const dashboard = await (await request('OWNER', `/reports/dashboard?${scope}`)).json(); assert.equal(dashboard.verifiedAmount, '80.25');
  const collection = await (await request('ANALYTICS', `/reports/collections?${scope}`)).json();
  assert.equal(collection.totals.verifiedAmount, '80.25'); assert.equal(collection.totals.collectedInPeriod, '80.25');
  assert.equal(collection.totals.adjustmentAmount, '-45.25'); assert.equal(collection.totals.remainingBalance, '19.75');
  const recon = await (await request('ANALYTICS', `/reports/reconciliation?${scope}`)).json();
  assert.equal(recon.totals.recordedAmount, '125.50'); assert.equal(recon.totals.originalVerifiedAmount, '125.50');
  assert.equal(recon.totals.verifiedAmount, '80.25'); assert.equal(recon.totals.auditedVerifiedAmount, '80.25');
  assert.equal(recon.totals.adjustments, 1); assert.equal(recon.totals.adjustmentAuditGapPayments, 0);
  const emptyPeriod = await (await request('ANALYTICS', `/reports/collections?batchId=${scopedBatch.id}&dateFrom=2049-03-02&dateTo=2049-03-02`)).json();
  assert.equal(emptyPeriod.totals.verifiedAmount, '80.25'); assert.equal(emptyPeriod.totals.collectedInPeriod, '0.00');
  for (const kind of ['payments', 'collections', 'reconciliation']) for (const format of ['csv', 'xlsx']) {
    const response = await request('ANALYTICS', `/reports/export?kind=${kind}&format=${format}&${scope}`); assert.equal(response.status, 200);
    const content = Buffer.from(await response.arrayBuffer()).toString(); assert.ok(content.includes('80.25')); assert.ok(content.includes('-45.25'));
    for (const privateValue of [client.name, pending.id, client.id, input('0').reason]) assert.equal(content.includes(privateValue), false);
  }
  for (const snapshot of saved) assert.deepEqual((await db.reportSnapshot.findUniqueOrThrow({ where: { id: snapshot.id } })).payload, snapshot.payload);
  assert.equal(saved[0].payload.verifiedAmount, '125.50'); assert.equal(saved[1].payload.totals.verifiedAmount, '125.50');
  const adjustment = await db.paymentAdjustment.findFirstOrThrow({ where: { paymentId: pending.id } });
  const audit = await db.auditEntry.findFirstOrThrow({ where: { recordId: adjustment.id, entity: 'payment_adjustment' } });
  await db.auditEntry.update({ where: { id: audit.id }, data: { after: { ...(audit.after as object), amount: 'malformed evidence' } } });
  const gap = await (await request('ANALYTICS', `/reports/reconciliation?${scope}`)).json();
  assert.equal(gap.totals.adjustmentAuditGapPayments, 1); assert.equal(gap.totals.adjustmentAuditGapAmount, '45.25');
  assert.equal(gap.totals.paymentsWithFlags, 1); assert.equal(gap.totals.unmatchedVerifiedPayments, 0);
  const exceptions = await (await request('OWNER', `/reports/reconciliation/exceptions?${scope}`)).json();
  assert.deepEqual(exceptions.items[0].flags, ['UNMATCHED_ADJUSTMENT_AUDIT']);
  assert.equal((await balance(client.id)).verifiedPaid, '80.25', 'Evidence gaps require review and do not mutate the ledger');
});

test('audit failures roll back credit, adjustment history, events and customer notifications together', async () => {
  const payment = await verified(); const beforeEvents = await db.changeEvent.count(); const beforeNotices = await db.notification.count();
  await db.$executeRawUnsafe(`CREATE FUNCTION adjustment_test_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'payment.adjusted' THEN RAISE EXCEPTION 'Synthetic audit failure'; END IF; RETURN NEW; END; $$`);
  await db.$executeRawUnsafe(`CREATE TRIGGER adjustment_test_audit_failure BEFORE INSERT ON "AuditEntry" FOR EACH ROW EXECUTE FUNCTION adjustment_test_audit_failure()`);
  try {
    assert.equal((await request('OWNER', `/payments/${payment.id}/adjustments`, input('9.00'))).status, 500);
    assert.equal(await db.paymentAdjustment.count({ where: { paymentId: payment.id } }), 0);
    assert.equal(await db.changeEvent.count(), beforeEvents); assert.equal(await db.notification.count(), beforeNotices);
    assert.deepEqual(await db.payment.findUniqueOrThrow({ where: { id: payment.id } }), payment);
  } finally {
    await db.$executeRawUnsafe('DROP TRIGGER adjustment_test_audit_failure ON "AuditEntry"');
    await db.$executeRawUnsafe('DROP FUNCTION adjustment_test_audit_failure()');
  }
});

test('database constraints preserve append-only credit chains and reject invalid transitions outside the API', async () => {
  const payment = await verified(); assert.equal((await request('OWNER', `/payments/${payment.id}/adjustments`, input('9.00'))).status, 200);
  const entry = await db.paymentAdjustment.findFirstOrThrow({ where: { paymentId: payment.id } });
  await assert.rejects(db.paymentAdjustment.update({ where: { id: entry.id }, data: { reason: 'Trying to silently change history.' } }));
  await assert.rejects(db.paymentAdjustment.delete({ where: { id: entry.id } }));
  const data = { paymentId: payment.id, actorId: sessions.get('OWNER')!.id, requestId: randomUUID(), sequence: 2, paymentVersion: 2,
    amount: '-1.00', beforeAmount: '9.00', afterAmount: '8.00', reason: input('0').reason };
  for (const facet of [{ sequence: 4 }, { beforeAmount: '10.00' }, { amount: '1.00' }, { afterAmount: '-1.00', amount: '-10.00' }, { paymentVersion: 1 }])
    await assert.rejects(db.paymentAdjustment.create({ data: { ...data, ...facet } }));
  assert.equal(await db.paymentAdjustment.count({ where: { paymentId: payment.id } }), 1);
  assert.deepEqual(await db.paymentAdjustment.findUniqueOrThrow({ where: { id: entry.id } }), entry);
});

test('role revocation is rechecked within the Finance write transaction, including idempotent retries', async () => {
  const payment = await verified(); const actor = await db.user.findUniqueOrThrow({ where: { id: sessions.get('FINANCE_OFFICER')!.id } });
  const body = input('9.00'); assert.equal((await request('FINANCE_OFFICER', `/payments/${payment.id}/adjustments`, body)).status, 200);
  await db.user.update({ where: { id: actor.id }, data: { role: 'RECORDS', version: { increment: 1 } } });
  assert.equal((await request('FINANCE_OFFICER', `/payments/${payment.id}/adjustments`, body)).status, 401);
  await assert.rejects(app.get(FinanceService).adjust(actor as unknown as User, payment.id, input('8.00', 1)), /access has changed/);
  assert.equal(await db.paymentAdjustment.count({ where: { paymentId: payment.id } }), 1);
});
