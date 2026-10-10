import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { Role } from '@freshphones/contracts';
import { createApp } from '../src/app';
import { Database } from '../src/database';
import { hashPassword } from '../src/auth/password';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error('Use a migrated dedicated TEST_DATABASE_URL ending in _test.');
const origin = 'http://localhost:3100';
const suffix = randomUUID().slice(0, 8);
const password = 'Synthetic-report-analysis-password-123!';
let app: INestApplication, db: Database, base: string, paymentId: string, batchId: string;
const accounts = new Map<Role, string>();
class Session {
  cookie = '';
  async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${base}/api${path}`, { ...init, headers: {
      Origin: origin, Cookie: this.cookie, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers,
    } });
    if (response.headers.getSetCookie().length)
      this.cookie = response.headers.getSetCookie().map((item) => item.split(';')[0]).join('; ');
    return response;
  }
  async login(role: Role) {
    const response = await this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email: accounts.get(role), password }) });
    assert.equal(response.status, 200);
    return this;
  }
}
const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });
const period = () => ({ kind: 'PAYMENTS', periodStart: '2045-02-28', periodEnd: '2045-02-28', status: 'PENDING', batchId });

before(async () => {
  app = await createApp({ NODE_ENV: 'test', PORT: 4100, HOST: '127.0.0.1', DATABASE_URL: databaseUrl!, WEB_ORIGIN: origin,
    JWT_SECRET: 'report-analysis-test-secret-at-least-32-characters',
    EMAIL_FROM: 'synthetic@example.test', CUSTOMER_REMINDER_DAYS_BEFORE: '', PRIVATE_STORAGE_PROVIDER: 'local',
    PRIVATE_STORAGE_S3_REGION: 'ap-southeast-1' });
  await app.listen(0, '127.0.0.1'); base = await app.getUrl(); db = app.get(Database);
  await db.loginAttempt.deleteMany();
  const batch = await db.batch.create({ data: { code: `REP-ANALYSIS-${suffix}`, model: 'Synthetic model',
    startDate: new Date('2045-01-01'), endDate: new Date('2045-12-31') } });
  batchId = batch.id;
  const client = await db.client.create({ data: { name: 'Private synthetic customer', email: '', phone: '', batchId: batch.id } });
  const passwordHash = await hashPassword(password);
  const people = new Map<Role, string>();
  for (const role of ['OWNER', 'ANALYTICS', 'FINANCE_OFFICER', 'CS_TEAM', 'CUSTOMER'] as const) {
    const user = await db.user.create({ data: { name: `Synthetic ${role}`, role,
      email: `report-analysis-${role.toLowerCase()}-${suffix}@example.test`, passwordHash,
      ...(role === 'CUSTOMER' ? { clientId: client.id } : {}) } });
    accounts.set(role, user.email); people.set(role, user.id);
  }
  const payment = await db.payment.create({ data: { clientId: client.id, batchId: batch.id,
    recordedById: people.get('OWNER')!, paymentDate: new Date('2045-02-28'), method: 'Cash', amount: '15.00', status: 'PENDING' } });
  paymentId = payment.id;
});
after(async () => { if (app) await app.close(); });

test('saved periods accept one immutable human analysis, including older numeric-only snapshots', async () => {
  const owner = await new Session().login('OWNER'), analyst = await new Session().login('ANALYTICS');
  const finance = await new Session().login('FINANCE_OFFICER'), csTeam = await new Session().login('CS_TEAM');
  const customer = await new Session().login('CUSTOMER'), anonymous = new Session();
  const missing = await analyst.request('/reports/snapshots', post(period()));
  assert.equal(missing.status, 201);
  const oldSnapshot = await missing.json();
  assert.equal(oldSnapshot.analysis, null);
  assert.equal(oldSnapshot.payload.pendingAmount, '15.00');
  const endpoint = `/reports/snapshots/${oldSnapshot.id}/analysis`;
  for (const bad of [{ body: 'too short' }, { body: '   ' }, { body: 'A valid length analysis with an extra field.', actorId: 'forged' }])
    assert.equal((await analyst.request(endpoint, post(bad))).status, 400);
  assert.equal((await anonymous.request(endpoint, post({ body: 'An anonymous interpretation of these figures.' }))).status, 401);
  assert.equal((await csTeam.request(endpoint, post({ body: 'An unauthorized interpretation of these figures.' }))).status, 403);
  assert.equal((await customer.request(endpoint, post({ body: 'A customer cannot submit staff report analysis.' }))).status, 403);
  assert.equal((await analyst.request(`/reports/snapshots/${randomUUID()}/analysis`, post({ body: 'A note for a missing saved report.' }))).status, 404);

  const notes = ['The period shows a pending claim that Finance should review.', 'The pending claim warrants a manual Finance follow-up.'];
  const competing = await Promise.all([analyst.request(endpoint, post({ body: notes[0] })), owner.request(endpoint, post({ body: notes[1] }))]);
  assert.deepEqual(competing.map((response) => response.status).sort(), [201, 409]);
  const winning = await competing.find((response) => response.status === 201)!.json();
  assert.ok(notes.includes(winning.body));
  assert.equal((await analyst.request(endpoint, post({ body: 'A later rewrite must fail without replacing the original.' }))).status, 409);
  assert.equal((await db.reportAnalysis.count({ where: { snapshotId: oldSnapshot.id } })), 1);
  assert.equal((await db.auditEntry.count({ where: { action: 'report_analysis.submitted', recordId: winning.id } })), 1);
  await assert.rejects(db.reportAnalysis.update({ where: { id: winning.id }, data: { body: 'A changed analysis that must not be saved.' } }), /Submitted report analysis is immutable/);
  await assert.rejects(db.reportAnalysis.delete({ where: { id: winning.id } }), /Submitted report analysis is immutable/);

  const initial = await analyst.request('/reports/snapshots', post({ ...period(),
    analysis: '  Finance should review the period’s pending claim before relying on its value.  ' }));
  assert.equal(initial.status, 201);
  const submitted = await initial.json();
  assert.equal(submitted.analysis.body, 'Finance should review the period’s pending claim before relying on its value.');
  assert.equal(submitted.analysis.submittedBy.id, (await db.user.findUniqueOrThrow({ where: { email: accounts.get('ANALYTICS')! } })).id);
  assert.equal((await db.auditEntry.count({ where: { action: 'report_analysis.submitted', recordId: submitted.analysis.id } })), 1);
  assert.equal((await analyst.request(`/reports/snapshots/${submitted.id}/analysis`, post({ body: 'Another analysis cannot replace this submission.' }))).status, 409);

  await db.payment.update({ where: { id: paymentId }, data: { amount: '25.00' } });
  const history = await finance.request('/reports/snapshots?kind=PAYMENTS');
  assert.equal(history.status, 200);
  const saved = (await history.json()).items as { id: string; payload: { pendingAmount: string }; analysis: { body: string; submittedBy: { name: string } } }[];
  for (const id of [oldSnapshot.id, submitted.id]) {
    const item = saved.find((row) => row.id === id);
    assert.equal(item?.payload.pendingAmount, '15.00');
    assert.ok(item?.analysis?.body);
    assert.ok(item?.analysis?.submittedBy.name);
  }
  assert.equal((await csTeam.request('/reports/snapshots?kind=PAYMENTS')).status, 403);
  assert.equal((await customer.request('/reports/snapshots?kind=PAYMENTS')).status, 403);
});
