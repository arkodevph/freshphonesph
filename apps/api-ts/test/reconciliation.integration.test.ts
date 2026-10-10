import 'reflect-metadata';
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { roles, rolePermissions, type Role } from '@freshphones/contracts';
import { createApp } from '../src/app';
import { Database } from '../src/database';
import { hashPassword } from '../src/auth/password';
import type { Config } from '../src/config';
import { Prisma } from '../src/generated/prisma/client';
import { reconciliation } from '../src/reports/reconciliation';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test')) throw new Error('Reconciliation tests require a dedicated TEST_DATABASE_URL ending in _test.');
const origin = 'http://localhost:3100'; const suffix = randomUUID().slice(0, 8);
const sessions = new Map<Role, { id: string; cookie: string }>();
let app: INestApplication; let db: Database; let base: string; let batchId: string; let otherBatchId: string; let clientId: string;
let auditedId: string; let staleId: string;
const period = 'dateFrom=2048-02-01&dateTo=2048-02-29';
beforeEach(async () => { await db.abuseBucket.deleteMany(); });
const request = (role: Role | null, path: string, body?: unknown) => fetch(`${base}/api${path}`, { method: body ? 'POST' : 'GET',
  headers: { Origin: origin, Cookie: role ? sessions.get(role)!.cookie : '', ...(body ? { 'Content-Type': 'application/json' } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}) });
const figures = async () => {
  const response = await request('ANALYTICS', `/reports/reconciliation?${period}&batchId=${batchId}`);
  assert.equal(response.status, 200); return response.json();
};

before(async () => {
  app = await createApp({ NODE_ENV: 'test', PORT: 4100, HOST: '127.0.0.1', DATABASE_URL: databaseUrl, WEB_ORIGIN: origin,
    JWT_SECRET: 'reconciliation-test-only-secret-longer-than-32-characters', EMAIL_FROM: 'test@example.test', CUSTOMER_REMINDER_DAYS_BEFORE: '',
    PRIVATE_STORAGE_PROVIDER: 'local', PRIVATE_STORAGE_S3_REGION: 'ap-southeast-1' } as Config);
  await app.listen(0, '127.0.0.1'); base = await app.getUrl(); db = app.get(Database);
  const batches = await Promise.all(['A', 'B'].map((code) => db.batch.create({ data: { code: `RECON-${suffix}-${code}`, model: 'Private model',
    startDate: new Date('2048-01-01'), endDate: new Date('2048-12-31') } })));
  batchId = batches[0].id; otherBatchId = batches[1].id;
  const people = await Promise.all([batchId, otherBatchId, batchId].map((id, index) => db.client.create({ data: { batchId: id,
    name: `Private recon person ${index}`, email: `private-recon-${suffix}-${index}@example.test`, phone: 'Private recon phone' } })));
  clientId = people[0].id;
  const schedules = await Promise.all([0, 1].map((index) => db.scheduleItem.create({ data: { clientId: people[index].id,
    sequenceNo: 1, dueDate: new Date('2048-12-01'), expectedAmount: '100.00' } })));
  const password = 'Reconciliation-test-password-123!'; const passwordHash = await hashPassword(password);
  await db.loginAttempt.deleteMany();
  for (const role of roles) {
    const person = await db.user.create({ data: { name: `Reconciliation ${role}`, email: `${role.toLowerCase()}-recon-${suffix}@example.test`,
      passwordHash, role, ...(role === 'CUSTOMER' ? { clientId } : {}) } });
    const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: person.email, password }) });
    assert.equal(login.status, 200); sessions.set(role, { id: person.id, cookie: login.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ') });
  }
  const owner = sessions.get('OWNER')!.id;
  async function payment(index: number, status: 'VERIFIED' | 'PENDING' | 'NEEDS_CLARIFICATION' | 'REJECTED', amount: string,
    method: string, referenceNumber: string | null, scheduleItemId?: string, auditAmount?: string) {
    const item = await db.payment.create({ data: { batchId, clientId: people[index].id, amount, method, referenceNumber, scheduleItemId,
      status, recordedById: owner, paymentDate: new Date(index === 0 ? '2048-02-01' : '2048-02-29'), notes: 'Private reconciliation notes',
      ...(status === 'VERIFIED' ? { verifierId: owner, verifiedAt: new Date('2048-02-29T12:34:56.789Z') } : {}) } });
    if (auditAmount !== undefined) await db.auditEntry.create({ data: { actorId: owner, entity: 'payment', action: 'payment.verified', recordId: item.id,
      after: { ...JSON.parse(JSON.stringify(item)), amount: auditAmount } } });
    return item;
  }
  const recorded = await payment(0, 'PENDING', '25.10', 'GCash', 'ref-001', schedules[0].id);
  const verified = await request('OWNER', `/payments/${recorded.id}/verify`, { decision: 'VERIFIED', notes: 'Synthetic Finance review', version: recorded.version });
  assert.equal(verified.status, 200); auditedId = recorded.id;
  await payment(0, 'VERIFIED', '15.05', 'Cash', null, schedules[1].id);
  await payment(0, 'PENDING', '7.25', 'GCash', '---', schedules[1].id);
  await payment(1, 'NEEDS_CLARIFICATION', '3.10', 'Cash', null);
  await payment(0, 'REJECTED', '2.50', 'Cash', 'REF001'); // Same reference, different method: not a duplicate.
  await payment(2, 'VERIFIED', '5.00', 'GCash', null, undefined, '5.00');
  staleId = (await payment(0, 'VERIFIED', '9.00', 'Cash', null, schedules[0].id, '8.00')).id;
  await payment(0, 'VERIFIED', '10.10', 'GCash', null, schedules[0].id, 'invalid legacy amount');
  await payment(0, 'PENDING', '9.90', 'GCash', 'ref.002');
  await db.payment.create({ data: { batchId: otherBatchId, clientId: people[1].id, amount: '10.00', method: 'gcash',
    referenceNumber: 'REF001', status: 'PENDING', recordedById: owner, paymentDate: new Date('2048-03-01') } });
  await db.payment.create({ data: { batchId, clientId, amount: '10.00', method: 'GCash', referenceNumber: 'REF-002',
    status: 'PENDING', recordedById: owner, paymentDate: new Date('2048-01-31') } });
});
after(async () => { if (app) await app.close(); });

test('reconciliation aggregates/export/history require REPORT_VIEW and exceptions require both report and payment-read access for every role', async () => {
  const paths = ['/reports/reconciliation', '/reports/export?kind=reconciliation&format=csv', '/reports/export?kind=reconciliation&format=xlsx', '/reports/snapshots?kind=RECONCILIATION'];
  for (const path of paths) {
    assert.equal((await request(null, path)).status, 401);
    for (const role of roles) assert.equal((await request(role, path)).status, rolePermissions[role].includes('REPORT_VIEW') ? 200 : 403, `${role} ${path}`);
  }
  const detail = '/reports/reconciliation/exceptions'; assert.equal((await request(null, detail)).status, 401);
  const input = { kind: 'RECONCILIATION', periodStart: '2048-02-01', periodEnd: '2048-02-29', batchId };
  assert.equal((await request(null, '/reports/snapshots', input)).status, 401);
  for (const role of roles) {
    const permitted = rolePermissions[role].includes('REPORT_VIEW');
    assert.equal((await request(role, detail)).status, permitted && rolePermissions[role].includes('PAYMENT_READ') ? 200 : 403, role);
    assert.equal((await request(role, '/reports/snapshots', input)).status, permitted ? 201 : 403, role);
  }
});

test('reconciliation separates claim statuses and checks exact Finance audit evidence with inclusive calendar dates and overlapping review flags', async () => {
  const report = await figures();
  assert.deepEqual(report.totals, { payments: 9, verifiedPayments: 5, pendingPayments: 2, clarificationPayments: 1, rejectedPayments: 1,
    auditedVerifiedPayments: 2, unmatchedVerifiedPayments: 3, paymentsWithFlags: 8, duplicateReferencePayments: 2,
    scheduleMismatchPayments: 2, batchMismatchPayments: 1, verifiedWithoutSchedulePayments: 1, recordedAmount: '87.00',
    verifiedAmount: '64.25', pendingAmount: '17.15', clarificationAmount: '3.10', rejectedAmount: '2.50', auditedVerifiedAmount: '30.10', unmatchedVerifiedAmount: '34.15',
    originalVerifiedAmount: '64.25', adjustmentAmount: '0.00', adjustments: 0, adjustmentAuditGapPayments: 0, adjustmentAuditGapAmount: '0.00' });
  assert.equal(report.total, 2); assert.equal(report.items.length, 2);
  const manila = await db.$transaction(async (tx) => { await tx.$executeRaw`SET LOCAL TIME ZONE 'Asia/Manila'`;
    return reconciliation(tx, { batchId, dateFrom: '2048-02-01', dateTo: '2048-02-29' }); });
  assert.deepEqual(manila, report);
  const money = new Prisma.Decimal(report.totals.verifiedAmount).add(report.totals.pendingAmount).add(report.totals.clarificationAmount).add(report.totals.rejectedAmount);
  assert.equal(money.toFixed(2), report.totals.recordedAmount);
  assert.equal(new Prisma.Decimal(report.totals.auditedVerifiedAmount).add(report.totals.unmatchedVerifiedAmount).toFixed(2), report.totals.verifiedAmount);
  const detail = await (await request('FINANCE_OFFICER', `/reports/reconciliation/exceptions?${period}&batchId=${batchId}`)).json();
  assert.equal(detail.total, 8);
  const matching = detail.items.find((item: { id: string }) => item.id === auditedId);
  assert.deepEqual(matching.flags, ['DUPLICATE_REFERENCE']);
  assert.ok(detail.items.some((item: { flags: string[] }) => item.flags.includes('SCHEDULE_CLIENT_MISMATCH') && item.flags.includes('UNMATCHED_VERIFICATION_AUDIT')));
  for (const text of [JSON.stringify(report), JSON.stringify(detail)])
    for (const privateValue of ['Private recon', 'private-recon-', 'ref-001', 'REF001', 'ref.002', 'verificationNotes', 'verifierId', 'proofFileId', clientId]) assert.equal(text.includes(privateValue), false, privateValue);
});

test('reconciliation exports contain full scoped aggregates and no payment-level private fields; snapshots stay immutable and audited', async () => {
  const report = await figures(); const query = `${period}&batchId=${batchId}`;
  for (const format of ['csv', 'xlsx']) {
    const response = await request('ANALYTICS', `/reports/export?kind=reconciliation&format=${format}&${query}`);
    assert.equal(response.status, 200); const text = Buffer.from(await response.arrayBuffer()).toString();
    for (const value of ['87.00', '64.25', '30.10', '34.15', '2048-02-01', '2048-02-29', 'External bank statements have not been matched']) assert.ok(text.includes(value), value);
    for (const privateValue of [auditedId, staleId, clientId, 'Private recon', 'REF001', 'ref-001', 'ref.002']) assert.equal(text.includes(privateValue), false);
  }
  const response = await request('ANALYTICS', '/reports/snapshots', { kind: 'RECONCILIATION', periodStart: '2048-02-01', periodEnd: '2048-02-29', batchId });
  assert.equal(response.status, 201); const saved = await response.json();
  assert.deepEqual(saved.payload.totals, report.totals); assert.deepEqual(saved.payload.groups, report.items);
  assert.deepEqual(saved.payload.filters, { batchId, batchCode: `RECON-${suffix}-A` });
  assert.equal(saved.payload.externalStatementMatched, false); assert.equal(saved.payload.paymentGrouping, 'recorded_payment_batch');
  assert.equal((await db.auditEntry.findFirst({ where: { recordId: saved.id, action: 'report_snapshot.created' } }))?.actorId, sessions.get('ANALYTICS')!.id);
  const before = await db.payment.findMany({ where: { batchId }, orderBy: { id: 'asc' } });
  await figures(); await request('OWNER', `/reports/reconciliation/exceptions?${query}`);
  assert.deepEqual(await db.payment.findMany({ where: { batchId }, orderBy: { id: 'asc' } }), before, 'Reporting never changes payment amounts/status/balances');
  await db.auditEntry.deleteMany({ where: { entity: 'payment', recordId: auditedId, action: 'payment.verified' } });
  assert.equal((await figures()).totals.unmatchedVerifiedAmount, '59.25');
  assert.deepEqual((await db.reportSnapshot.findUniqueOrThrow({ where: { id: saved.id } })).payload, saved.payload);
  const history = await (await request('ANALYTICS', '/reports/snapshots?kind=RECONCILIATION')).json();
  assert.ok(history.items.every((item: { kind: string }) => item.kind === 'RECONCILIATION'));
  assert.deepEqual(history.items.find((item: { id: string }) => item.id === saved.id).payload, saved.payload);
});

test('reconciliation group and exception pagination preserve complete exports/snapshots, stable ordering and empty scopes', async () => {
  const owner = sessions.get('OWNER')!.id;
  for (let index = 0; index < 23; index++) await db.payment.create({ data: { batchId, clientId, method: `=METHOD-${String(index).padStart(2, '0')}`,
    amount: '0.01', status: 'VERIFIED', recordedById: owner, verifierId: owner, verifiedAt: new Date('2048-02-29T12:00:00Z'), paymentDate: new Date('2048-02-29') } });
  const first = await figures(); const second = await (await request('ANALYTICS', `/reports/reconciliation?${period}&batchId=${batchId}&page=2`)).json();
  assert.equal(first.total, 25); assert.equal(first.items.length, 20); assert.equal(second.items.length, 5); assert.deepEqual(first.totals, second.totals);
  const groups = [...first.items, ...second.items]; assert.equal(new Set(groups.map((row) => row.method)).size, 25);
  const details = await (await request('OWNER', `/reports/reconciliation/exceptions?${period}&batchId=${batchId}`)).json();
  const more = await (await request('OWNER', `/reports/reconciliation/exceptions?${period}&batchId=${batchId}&page=2`)).json();
  assert.equal(details.items.length, 20); assert.equal(more.items.length, 11); assert.equal(details.total, 31);
  assert.equal(new Set([...details.items, ...more.items].map((row: { id: string }) => row.id)).size, 31);
  for (const format of ['csv', 'xlsx']) {
    const exported = await request('ANALYTICS', `/reports/export?kind=reconciliation&format=${format}&${period}&batchId=${batchId}`);
    assert.equal(exported.status, 200); const text = Buffer.from(await exported.arrayBuffer()).toString();
    for (const group of groups) assert.ok(text.includes(group.method), group.method);
    if (format === 'csv') assert.ok(text.includes('"\'=METHOD-00"')); else assert.equal(text.includes('<f>'), false);
  }
  const saved = await (await request('ANALYTICS', '/reports/snapshots', { kind: 'RECONCILIATION', periodStart: '2048-02-01', periodEnd: '2048-02-29', batchId })).json();
  assert.equal(saved.payload.groups.length, 25); assert.deepEqual(saved.payload.totals, first.totals);
  const empty = await (await request('ANALYTICS', `/reports/reconciliation?batchId=${randomUUID()}`)).json();
  assert.equal(empty.total, 0); assert.deepEqual(empty.items, []);
  for (const value of Object.values(empty.totals)) assert.equal(value, typeof value === 'number' ? 0 : '0.00');
  const past = await (await request('ANALYTICS', `/reports/reconciliation?${period}&batchId=${batchId}&page=100000`)).json();
  assert.equal(past.items.length, 0); assert.deepEqual(past.totals, first.totals);
});

test('strict reconciliation facets and revoked payment/report access are enforced without exposing exceptions', async () => {
  for (const query of ['status=PENDING', 'q=private', 'page=0', 'page=1junk', 'page=100001', 'batchId=bad', 'dateFrom=2047-02-29', 'dateFrom=2048-03-01&dateTo=2048-02-29'])
    for (const path of ['reconciliation', 'reconciliation/exceptions']) assert.equal((await request('OWNER', `/reports/${path}?${query}`)).status, 400, query);
  for (const query of ['page=2', 'status=PENDING', 'q=private', 'q=']) assert.equal((await request('OWNER', `/reports/export?kind=reconciliation&format=csv&${query}`)).status, 400);
  for (const facet of [{ status: 'PENDING' }, { page: 2 }, { q: 'private' }])
    assert.equal((await request('OWNER', '/reports/snapshots', { kind: 'RECONCILIATION', periodStart: '2048-02-01', periodEnd: '2048-02-29', ...facet })).status, 400);
  assert.equal((await request('OWNER', '/reports/snapshots', { kind: 'RECONCILIATION', periodStart: '2048-02-01', periodEnd: '2048-02-29', batchId: randomUUID() })).status, 404);
  await db.user.update({ where: { id: sessions.get('RECORDS')!.id }, data: { role: 'ANALYTICS', version: { increment: 1 } } });
  assert.equal((await request('RECORDS', '/reports/reconciliation')).status, 401);
  const account = await db.user.findUniqueOrThrow({ where: { id: sessions.get('RECORDS')!.id } });
  const signedIn = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: account.email, password: 'Reconciliation-test-password-123!' }) });
  assert.equal(signedIn.status, 200); sessions.get('RECORDS')!.cookie = signedIn.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  assert.equal((await request('RECORDS', '/reports/reconciliation')).status, 200); assert.equal((await request('RECORDS', '/reports/reconciliation/exceptions')).status, 403);
  await db.user.update({ where: { id: sessions.get('RECORDS')!.id }, data: { role: 'CORE_HANDLER', version: { increment: 1 } } });
  for (const path of ['/reports/reconciliation', '/reports/reconciliation/exceptions', '/reports/export?kind=reconciliation&format=xlsx'])
    assert.equal((await request('RECORDS', path)).status, 401);
});
