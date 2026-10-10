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
import { collections } from '../src/reports/collections';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test')) throw new Error('Reports integration requires a dedicated TEST_DATABASE_URL ending in _test.');
const origin = 'http://localhost:3100';
const suffix = randomUUID().slice(0, 8);
const password = 'Report-test-password-123!';
let app: INestApplication;
let db: Database;
let base: string;
const sessions = new Map<Role, { cookie: string; id: string }>();
let batchId: string;
let clientId: string;
const request = (role: Role | null, path: string, body?: unknown) => fetch(`${base}/api${path}`, {
  method: body ? 'POST' : 'GET',
  headers: { Origin: origin, Cookie: role ? sessions.get(role)!.cookie : '', ...(body ? { 'Content-Type': 'application/json' } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
const range = 'dateFrom=2045-02-28&dateTo=2045-02-28';
beforeEach(async () => { await db.abuseBucket.deleteMany(); });

before(async () => {
  // Explicit isolated test configuration never uses a provider or the preview database.
  app = await createApp({ NODE_ENV: 'test', PORT: 4100, HOST: '127.0.0.1', DATABASE_URL: databaseUrl, WEB_ORIGIN: origin,
    // The authorization matrix exercises every report for every role in one burst.
    ABUSE_LIMITS: { expensive: [[1000, 60]] },
    JWT_SECRET: 'reports-test-only-secret-at-least-32-characters', EMAIL_FROM: 'test@example.test', CUSTOMER_REMINDER_DAYS_BEFORE: '',
    PRIVATE_STORAGE_PROVIDER: 'local', PRIVATE_STORAGE_S3_REGION: 'ap-southeast-1' } as Config);
  await app.listen(0, '127.0.0.1'); base = await app.getUrl(); db = app.get(Database);
  const batch = await db.batch.create({ data: { code: `REPORT-${suffix}-00`, model: 'Test phone', status: 'ACTIVE', startDate: new Date('2045-01-01'), endDate: new Date('2045-12-31') } });
  batchId = batch.id;
  const client = await db.client.create({ data: { batchId, name: 'Private report client', email: `private-${suffix}@example.test`, phone: 'Private phone' } });
  clientId = client.id;
  const passwordHash = await hashPassword(password);
  await db.loginAttempt.deleteMany();
  for (const role of roles) {
    const user = await db.user.create({ data: { email: `${role.toLowerCase()}-${suffix}@example.test`, name: `Report ${role}`, role, passwordHash,
      ...(role === 'CUSTOMER' ? { clientId } : {}) } });
    const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password }) });
    assert.equal(login.status, 200, `Report fixture login: ${role}`);
    sessions.set(role, { id: user.id, cookie: login.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ') });
  }
  for (const [status, amount] of [['VERIFIED', '125.50'], ['PENDING', '70.25'], ['NEEDS_CLARIFICATION', '10.00'], ['REJECTED', '5.00']] as const) {
    await db.payment.create({ data: { clientId, batchId, recordedById: sessions.get('OWNER')!.id, paymentDate: new Date('2045-02-28'),
      method: '=SUM(1,2)', referenceNumber: 'Private reference', notes: 'Private payment notes', amount, status,
      ...(status === 'VERIFIED' ? { verifierId: sessions.get('OWNER')!.id, verifiedAt: new Date('2045-02-28T12:00:00Z') } : {}) } });
  }
  await db.payment.create({ data: { clientId, batchId, recordedById: sessions.get('OWNER')!.id, paymentDate: new Date('2045-03-01'), method: 'Cash', amount: '999.00', status: 'VERIFIED',
    verifierId: sessions.get('OWNER')!.id, verifiedAt: new Date('2045-03-01T12:00:00Z') } });
  await db.task.create({ data: { title: 'Private task title', report: 'Private task evidence', assigneeId: sessions.get('OWNER')!.id,
    creatorId: sessions.get('OWNER')!.id, deadline: new Date('2045-02-28T10:00:00Z'), createdAt: new Date('2045-02-28T23:59:59.999Z'), status: 'TODO' } });
  await db.task.create({ data: { title: 'Outside period', assigneeId: sessions.get('OWNER')!.id, creatorId: sessions.get('OWNER')!.id,
    deadline: new Date('2045-03-01T10:00:00Z'), createdAt: new Date('2045-03-01T00:00:00Z') } });
  await db.supportCase.create({ data: { clientId, category: 'Payment question', description: 'Private support concern', status: 'CLOSED',
    createdAt: new Date('2045-02-28T22:00:00Z'), closedAt: new Date('2045-02-28T23:00:00Z') } });
});
after(async () => { if (app) await app.close(); });

test('every Reports endpoint enforces REPORT_VIEW for every role and rejects anonymous access', async () => {
  const endpoints = ['/reports/payments', '/reports/batches', '/reports/tasks', '/reports/support', '/reports/snapshots',
    '/reports/collections', '/reports/export?kind=collections&format=csv', '/reports/export?kind=collections&format=xlsx',
    '/reports/export?kind=payments&format=csv', '/reports/export?kind=tasks&format=xlsx', '/reports/export?kind=support&format=csv'];
  for (const path of endpoints) {
    assert.equal((await request(null, path)).status, 401, path);
    for (const role of roles) assert.equal((await request(role, path)).status, rolePermissions[role].includes('REPORT_VIEW') ? 200 : 403, `${role} ${path}`);
  }
  for (const kind of ['TASKS', 'COLLECTIONS']) {
    const input = { kind, periodStart: '2045-02-28', periodEnd: '2045-02-28' };
    assert.equal((await request(null, '/reports/snapshots', input)).status, 401);
    for (const role of roles) assert.equal((await request(role, '/reports/snapshots', input)).status, rolePermissions[role].includes('REPORT_VIEW') ? 201 : 403, role);
  }
  const missingAnalysisPath = `/reports/snapshots/${randomUUID()}/analysis`;
  const analysis = { body: 'A human analysis attached to a saved reporting period.' };
  assert.equal((await request(null, missingAnalysisPath, analysis)).status, 401);
  for (const role of roles) assert.equal((await request(role, missingAnalysisPath, analysis)).status,
    rolePermissions[role].includes('REPORT_VIEW') ? 404 : 403, `${role} analysis submission`);
});

test('payment figures and CSV/XLSX use identical date, status and batch scopes with private fields omitted', async () => {
  const query = `${range}&batchId=${batchId}`;
  const report = await (await request('ANALYTICS', `/reports/payments?${query}`)).json();
  assert.deepEqual(report, { total: 4, verifiedPayments: 1, verifiedAmount: '125.50', originalVerifiedAmount: '125.50', adjustmentAmount: '0.00', pendingVerification: 1, pendingAmount: '70.25', needsClarification: 1, rejectedPayments: 1 });
  const filtered = await (await request('ANALYTICS', `/reports/payments?${query}&status=PENDING`)).json();
  assert.equal(filtered.total, 1); assert.equal(filtered.pendingAmount, '70.25'); assert.equal(filtered.verifiedAmount, '0.00');
  const empty = await (await request('ANALYTICS', `/reports/payments?${range}&batchId=${randomUUID()}`)).json();
  assert.equal(empty.total, 0); assert.equal(empty.verifiedAmount, '0.00'); assert.equal(empty.pendingAmount, '0.00');
  for (const format of ['csv', 'xlsx']) {
    const response = await request('ANALYTICS', `/reports/export?${query}&status=PENDING&kind=payments&format=${format}`);
    assert.equal(response.status, 200); assert.match(response.headers.get('content-disposition')!, new RegExp(`payments\\.${format}`));
    const bytes = Buffer.from(await response.arrayBuffer()); const text = bytes.toString();
    assert.ok(text.includes('70.25')); assert.equal(text.includes('125.50'), false); assert.equal(text.includes('999.00'), false);
    for (const privateValue of ['Private report client', 'Private phone', 'Private reference', 'Private payment notes', `private-${suffix}@example.test`]) assert.equal(text.includes(privateValue), false);
    if (format === 'xlsx') { assert.equal(bytes.subarray(0, 2).toString(), 'PK'); assert.ok(text.includes('t="inlineStr"')); }
    else assert.ok(text.includes("'=SUM(1,2)"), 'CSV formulas are rendered as text');
  }
  const tasks = await (await request('ANALYTICS', `/reports/tasks?${range}`)).json(); assert.equal(tasks.total, 1);
  const support = await (await request('ANALYTICS', `/reports/support?${range}`)).json(); assert.equal(support.total, 1); assert.equal(support.categories[0].averageTurnaroundHours, 1);
  for (const kind of ['tasks', 'support']) for (const format of ['csv', 'xlsx']) {
    const response = await request('ANALYTICS', `/reports/export?${range}&kind=${kind}&format=${format}`);
    assert.equal(response.status, 200);
    const text = Buffer.from(await response.arrayBuffer()).toString();
    for (const value of ['Private task title', 'Private task evidence', 'Private support concern', 'Private report client', 'Private phone']) assert.equal(text.includes(value), false);
  }
});

test('report-only batch choices expose id/code, search every page and work without BATCH_READ', async () => {
  assert.equal((await request('ANALYTICS', '/batches')).status, 403);
  for (let index = 1; index < 23; index++) await db.batch.create({ data: { code: `REPORT-${suffix}-${String(index).padStart(2, '0')}`,
    model: 'Private model', startDate: new Date('2045-01-01'), endDate: new Date('2045-12-31') } });
  const query = `q=REPORT-${suffix}`;
  const first = await (await request('ANALYTICS', `/reports/batches?${query}&page=1`)).json();
  const second = await (await request('ANALYTICS', `/reports/batches?${query}&page=2`)).json();
  assert.equal(first.total, 23); assert.equal(first.items.length, 20); assert.equal(second.items.length, 3);
  const ids = [...first.items, ...second.items].map((row: { id: string }) => row.id);
  assert.equal(new Set(ids).size, 23);
  for (const row of [...first.items, ...second.items]) assert.deepEqual(Object.keys(row).sort(), ['code', 'id']);
  const found = await (await request('ANALYTICS', `/reports/batches?q=REPORT-${suffix}-22`)).json();
  assert.equal(found.total, 1); assert.ok(found.items[0].code.endsWith('-22'));
});

test('saved payment periods retain all filters and immutable figures, write an audit and paginate type-specific history', async () => {
  const input = { kind: 'PAYMENTS', periodStart: '2045-02-28', periodEnd: '2045-02-28', batchId, status: 'PENDING' };
  const response = await request('ANALYTICS', '/reports/snapshots', input);
  assert.equal(response.status, 201); const saved = await response.json();
  assert.equal(saved.payload.total, 1); assert.equal(saved.payload.pendingAmount, '70.25');
  assert.deepEqual(saved.payload.filters, { batchId, batchCode: `REPORT-${suffix}-00`, status: 'PENDING' });
  assert.deepEqual(Object.keys(saved.createdBy).sort(), ['id', 'name']);
  const audit = await db.auditEntry.findFirst({ where: { recordId: saved.id, action: 'report_snapshot.created' } });
  assert.equal(audit?.actorId, sessions.get('ANALYTICS')!.id);
  await db.payment.updateMany({ where: { batchId, status: 'PENDING' }, data: { amount: '80.50' } });
  await db.batch.update({ where: { id: batchId }, data: { code: `REPORT-${suffix}-renamed` } });
  const captured = await db.reportSnapshot.findUniqueOrThrow({ where: { id: saved.id } });
  assert.deepEqual(captured.payload, saved.payload);
  const live = await (await request('ANALYTICS', `/reports/payments?${range}&batchId=${batchId}&status=PENDING`)).json();
  assert.equal(live.pendingAmount, '80.50');
  for (let index = 0; index < 22; index++) await db.reportSnapshot.create({ data: { kind: 'PAYMENTS', periodStart: new Date('2045-02-28'),
    periodEnd: new Date('2045-02-28'), createdById: sessions.get('OWNER')!.id, payload: saved.payload } });
  const one = await (await request('ANALYTICS', '/reports/snapshots?kind=PAYMENTS&page=1')).json();
  const two = await (await request('ANALYTICS', '/reports/snapshots?kind=PAYMENTS&page=2')).json();
  assert.equal(one.items.length, 20); assert.equal(one.total, two.total);
  assert.equal(new Set([...one.items, ...two.items].map((row: { id: string }) => row.id)).size, one.items.length + two.items.length);
  assert.ok([...one.items, ...two.items].every((row: { kind: string }) => row.kind === 'PAYMENTS'));
  assert.ok([...one.items, ...two.items].some((row: { id: string }) => row.id === saved.id));
});

test('collections derive decimal balances per client, retain overall totals across periods and identify missing schedules', async () => {
  const batch = await db.batch.create({ data: { code: `COLLECT-${suffix}`, model: 'Private collection model', contractPrice: '99999.00', installmentCount: 1, cadence: 'MONTHLY',
    startDate: new Date('2046-01-01'), endDate: new Date('2046-12-31') } });
  const people = await Promise.all([0, 1, 2, 3].map((index) => db.client.create({ data: { batchId: batch.id,
    name: `Sensitive collections client ${index}`, email: `sensitive-${index}-${suffix}@example.test`, phone: 'Sensitive phone' } })));
  for (const [index, amounts] of [[0, ['30.05', '70.05']], [1, ['50.00']], [3, ['0.30']]] as const)
    for (const [sequence, expectedAmount] of amounts.entries()) await db.scheduleItem.create({ data: {
      clientId: people[index].id, sequenceNo: sequence + 1, expectedAmount, dueDate: new Date('2046-12-01') } });
  const entries = [
    [0, 'VERIFIED', '10.10', '2046-01-31'], [0, 'VERIFIED', '20.00', '2046-02-01'],
    [1, 'VERIFIED', '80.00', '2046-02-28'], [2, 'VERIFIED', '5.00', '2046-02-15'],
    [3, 'VERIFIED', '0.10', '2046-02-28'], [3, 'VERIFIED', '0.05', '2046-03-01'],
    [0, 'PENDING', '12.34', '2046-02-28'], [1, 'PENDING', '7.66', '2046-01-31'],
    [0, 'NEEDS_CLARIFICATION', '900.00', '2046-02-28'], [0, 'REJECTED', '900.00', '2046-02-28'],
  ] as const;
  for (const [index, status, amount, date] of entries) await db.payment.create({ data: {
    clientId: people[index].id, batchId: batch.id, amount, status, paymentDate: new Date(date), method: 'Cash',
    recordedById: sessions.get('OWNER')!.id, notes: 'Sensitive collection notes', referenceNumber: 'Sensitive collection reference',
    ...(status === 'VERIFIED' ? { verifierId: sessions.get('OWNER')!.id, verifiedAt: new Date(`${date}T12:00:00Z`) } : {}),
  } });
  const query = `batchId=${batch.id}&dateFrom=2046-02-01&dateTo=2046-02-28`;
  const response = await request('ANALYTICS', `/reports/collections?${query}`);
  assert.equal(response.status, 200); const report = await response.json();
  assert.equal(report.total, 1); assert.equal(report.page, 1); assert.equal(report.items.length, 1);
  assert.deepEqual(report.totals, { clients: 4, scheduledClients: 3, clientsWithoutSchedule: 1,
    agreedAmount: '150.40', verifiedAmount: '115.25', pendingAmount: '20.00', remainingBalance: '70.15', overpaidAmount: '35.00',
    collectedInPeriod: '105.10', verifiedPaymentsInPeriod: 4, pendingInPeriod: '12.34', pendingPaymentsInPeriod: 1, adjustmentAmount: '0.00', adjustmentsInPeriod: '0.00' });
  const { id, code, status, ...rowFigures } = report.items[0]; assert.equal(id, batch.id); assert.equal(code, batch.code);
  assert.deepEqual(rowFigures, report.totals);
  for (const privateValue of ['Sensitive', people[0].id, people[0].email, '99999.00']) assert.equal(JSON.stringify(report).includes(privateValue), false);
  const manila = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL TIME ZONE 'Asia/Manila'`;
    return collections(tx, { batchId: batch.id, dateFrom: '2046-02-01', dateTo: '2046-02-28' });
  });
  assert.deepEqual(manila, report, 'Calendar payment-date boundaries must not depend on the database session timezone');
  // Agreement and balance parity with Finance, including an unscheduled client's unapplied funds.
  for (const [field, financeField] of [['agreedAmount', 'totalDue'], ['verifiedAmount', 'verifiedPaid'], ['pendingAmount', 'pendingAmount'],
    ['remainingBalance', 'remainingBalance'], ['overpaidAmount', 'overpaid']] as const) {
    const values = await Promise.all(people.map(async (person) => (await (await request('OWNER', `/clients/${person.id}/balance`)).json())[financeField]));
    const { Prisma } = await import('../src/generated/prisma/client.js');
    assert.equal(values.reduce((sum, value) => sum.add(value), new Prisma.Decimal(0)).toFixed(2), report.totals[field]);
  }
  for (const dates of ['', '&dateTo=2046-01-31', '&dateFrom=2046-03-01', '&dateFrom=2047-01-01&dateTo=2047-01-01']) {
    const other = await (await request('ANALYTICS', `/reports/collections?batchId=${batch.id}${dates}`)).json();
    for (const field of ['agreedAmount', 'verifiedAmount', 'pendingAmount', 'remainingBalance', 'overpaidAmount', 'clients']) assert.equal(other.totals[field], report.totals[field]);
  }
  const future = await (await request('ANALYTICS', `/reports/collections?batchId=${batch.id}&dateFrom=2047-01-01`)).json();
  assert.equal(future.totals.collectedInPeriod, '0.00'); assert.equal(future.totals.pendingInPeriod, '0.00');
  for (const format of ['csv', 'xlsx']) {
    const exported = await request('ANALYTICS', `/reports/export?kind=collections&format=${format}&${query}`);
    assert.equal(exported.status, 200); const text = Buffer.from(await exported.arrayBuffer()).toString();
    for (const value of ['150.40', '115.25', '70.15', '35.00', '105.10', '12.34', batch.code, '2046-02-01', '2046-02-28']) assert.ok(text.includes(value), value);
    for (const value of ['Sensitive', '99999.00', people[0].id, people[0].email]) assert.equal(text.includes(value), false, value);
  }
  const savedResponse = await request('ANALYTICS', '/reports/snapshots', { kind: 'COLLECTIONS', periodStart: '2046-02-01', periodEnd: '2046-02-28', batchId: batch.id });
  assert.equal(savedResponse.status, 201); const saved = await savedResponse.json();
  assert.deepEqual(saved.payload.totals, report.totals); assert.deepEqual(saved.payload.batches, report.items);
  assert.deepEqual(saved.payload.filters, { batchId: batch.id, batchCode: batch.code });
  assert.equal(saved.payload.balanceBasis, 'current'); assert.equal(saved.payload.paymentGrouping, 'current_client_batch');
  assert.equal((await db.auditEntry.findFirst({ where: { recordId: saved.id } }))?.action, 'report_snapshot.created');
  await db.payment.updateMany({ where: { clientId: people[0].id, amount: '20.00', status: 'VERIFIED' }, data: { amount: '21.00' } });
  await db.batch.update({ where: { id: batch.id }, data: { code: `COLLECT-${suffix}-changed` } });
  assert.deepEqual((await db.reportSnapshot.findUniqueOrThrow({ where: { id: saved.id } })).payload, saved.payload);
  const history = await (await request('ANALYTICS', '/reports/snapshots?kind=COLLECTIONS')).json();
  assert.ok(history.items.every((item: { kind: string }) => item.kind === 'COLLECTIONS'));
  assert.deepEqual(history.items.find((item: { id: string }) => item.id === saved.id).payload, saved.payload);
});

test('collection scopes follow current client membership even for payments recorded before a permitted move', async () => {
  const destination = await db.batch.create({ data: { code: `MOVED-${suffix}`, model: 'Private moved model',
    startDate: new Date('2046-01-01'), endDate: new Date('2046-12-31') } });
  const person = await db.client.create({ data: { batchId, name: 'Private moved client', email: `moved-${suffix}@example.test`, phone: 'Private moved phone' } });
  await db.payment.create({ data: { clientId: person.id, batchId, amount: '10.00', status: 'VERIFIED', paymentDate: new Date('2046-02-01'),
    method: 'Cash', recordedById: sessions.get('OWNER')!.id, verifierId: sessions.get('OWNER')!.id, verifiedAt: new Date('2046-02-01T12:00:00Z') } });
  // Records permits moving a client before a schedule is issued. The old payment retains its recorded batch.
  await db.client.update({ where: { id: person.id }, data: { batchId: destination.id } });
  await db.scheduleItem.create({ data: { clientId: person.id, sequenceNo: 1, expectedAmount: '40.00', dueDate: new Date('2046-12-01') } });
  const moved = await (await request('ANALYTICS', `/reports/collections?batchId=${destination.id}&dateFrom=2046-02-01&dateTo=2046-02-01`)).json();
  assert.equal(moved.totals.clients, 1); assert.equal(moved.totals.agreedAmount, '40.00');
  assert.equal(moved.totals.verifiedAmount, '10.00'); assert.equal(moved.totals.remainingBalance, '30.00'); assert.equal(moved.totals.collectedInPeriod, '10.00');
  const original = await (await request('ANALYTICS', `/reports/collections?batchId=${batchId}&dateFrom=2046-02-01&dateTo=2046-02-01`)).json();
  assert.equal(original.totals.collectedInPeriod, '0.00');
});

test('collection pagination preserves full-scope totals, exports and snapshots, including empty batches', async () => {
  const formulaCode = `=COLLECT-${suffix}`;
  await db.batch.create({ data: { code: formulaCode, model: 'Private formula model', startDate: new Date('2046-01-01'), endDate: new Date('2046-12-31') } });
  const all = await (await request('ANALYTICS', '/reports/collections')).json();
  assert.ok(all.total > 20); assert.equal(all.items.length, 20);
  const rows = [...all.items];
  for (let page = 2; (page - 1) * all.pageSize < all.total; page++) {
    const next = await (await request('ANALYTICS', `/reports/collections?page=${page}`)).json();
    assert.deepEqual(next.totals, all.totals); rows.push(...next.items);
  }
  assert.equal(new Set(rows.map((row) => row.id)).size, all.total);
  const emptyBatch = rows.find((row) => row.clients === 0); assert.ok(emptyBatch);
  assert.equal(emptyBatch.agreedAmount, '0.00'); assert.equal(emptyBatch.remainingBalance, '0.00');
  const empty = await (await request('ANALYTICS', `/reports/collections?batchId=${randomUUID()}`)).json();
  assert.equal(empty.total, 0); assert.equal(empty.items.length, 0);
  for (const [key, value] of Object.entries(empty.totals)) assert.equal(value, typeof value === 'number' ? 0 : '0.00', key);
  const pastLast = await (await request('ANALYTICS', '/reports/collections?page=100000')).json();
  assert.equal(pastLast.items.length, 0); assert.deepEqual(pastLast.totals, all.totals);
  for (const format of ['csv', 'xlsx']) {
    const exported = await request('ANALYTICS', `/reports/export?kind=collections&format=${format}`);
    assert.equal(exported.status, 200); const text = Buffer.from(await exported.arrayBuffer()).toString();
    for (const row of rows) assert.ok(text.includes(row.code), `${format} includes ${row.code}`);
    if (format === 'csv') assert.ok(text.includes(`"'${formulaCode}"`));
    else { assert.ok(text.includes('t="inlineStr"')); assert.equal(text.includes('<f>'), false); }
  }
  const savedResponse = await request('ANALYTICS', '/reports/snapshots', { kind: 'COLLECTIONS', periodStart: '2046-02-01', periodEnd: '2046-02-28' });
  assert.equal(savedResponse.status, 201); const saved = await savedResponse.json();
  assert.equal(saved.payload.batches.length, all.total); assert.deepEqual(saved.payload.totals.remainingBalance, all.totals.remainingBalance);
  assert.deepEqual(saved.payload.batches.map((row: { id: string }) => row.id), rows.map((row) => row.id));
  assert.deepEqual(saved.payload.filters, {});
});

test('invalid or irrelevant filters and unsafe history pages are rejected; removed report access takes effect immediately', async () => {
  for (const query of ['dateFrom=2045-03-01&dateTo=2045-02-28', 'dateFrom=2045-02-29', 'batchId=invalid', 'status=UNKNOWN', 'extra=1'])
    assert.equal((await request('OWNER', `/reports/payments?${query}`)).status, 400, query);
  for (const path of ['/reports/tasks?batchId='+batchId, '/reports/support?status=VERIFIED', '/reports/export?kind=tasks&format=csv&batchId='+batchId,
    '/reports/snapshots?page=0', '/reports/snapshots?page=1junk', '/reports/snapshots?page=100001', '/reports/snapshots?kind=UNKNOWN', '/reports/batches?page=1.5',
    '/reports/collections?status=PENDING', '/reports/collections?q=private', '/reports/collections?page=0', '/reports/collections?page=1junk',
    '/reports/collections?page=100001', '/reports/collections?dateFrom=2045-02-29', '/reports/collections?batchId=invalid',
    '/reports/collections?dateFrom=2045-03-01&dateTo=2045-02-28', '/reports/export?kind=collections&format=csv&status=PENDING',
    '/reports/export?kind=collections&format=xlsx&q=private', '/reports/export?kind=collections&format=xlsx&page=2'])
    assert.equal((await request('OWNER', path)).status, 400, path);
  for (const input of [{ kind: 'TASKS', periodStart: '2045-02-28', periodEnd: '2045-02-28', batchId },
    { kind: 'SUPPORT', periodStart: '2045-02-28', periodEnd: '2045-02-28', status: 'PENDING' },
    { kind: 'PAYMENTS', periodStart: '2045-03-01', periodEnd: '2045-02-28' },
    { kind: 'PAYMENTS', periodStart: '2045-02-28', periodEnd: '2045-02-28', q: 'Private client' },
    { kind: 'COLLECTIONS', periodStart: '2045-02-28', periodEnd: '2045-02-28', status: 'PENDING' },
    { kind: 'COLLECTIONS', periodStart: '2045-02-28', periodEnd: '2045-02-28', page: 2 }])
    assert.equal((await request('OWNER', '/reports/snapshots', input)).status, 400);
  const missing = await request('OWNER', '/reports/snapshots', { kind: 'PAYMENTS', periodStart: '2045-02-28', periodEnd: '2045-02-28', batchId: randomUUID() });
  assert.equal(missing.status, 404);
  await db.user.update({ where: { id: sessions.get('ANALYTICS')!.id }, data: { role: 'CORE_HANDLER', version: { increment: 1 } } });
  for (const path of ['/reports/payments', '/reports/batches', '/reports/collections', '/reports/snapshots', '/reports/export?kind=payments&format=xlsx', '/reports/export?kind=collections&format=csv'])
    assert.equal((await request('ANALYTICS', path)).status, 401, path);
});
