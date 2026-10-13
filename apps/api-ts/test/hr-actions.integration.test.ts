import 'reflect-metadata';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../src/app';
import { Database } from '../src/database';
import { hashPassword } from '../src/auth/password';
import { safeUser } from '../src/auth/auth.service';
import { RealtimeController } from '../src/realtime/realtime.controller';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error('TEST_DATABASE_URL must point to a migrated dedicated database ending in _test.');
const origin = 'http://localhost:3100';
const password = 'Synthetic-HR-action-password-123!';
const suffix = randomUUID().slice(0, 8);
let app: INestApplication, second: INestApplication, db: Database, base: string, secondBase: string;
let owner: { id: string; email: string }, hr: { id: string; email: string }, coo: { id: string; email: string };
let generalManager: { id: string; email: string }, customer: { id: string; email: string }, taskId: string, reviewId: string;
class Session {
  cookie = '';
  async request(path: string, init: RequestInit = {}, target = base) {
    const response = await fetch(`${target}/api${path}`, { ...init, headers: {
      Origin: origin, Cookie: this.cookie, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers,
    } });
    if (response.headers.getSetCookie().length)
      this.cookie = response.headers.getSetCookie().map((item) => item.split(';')[0]).join('; ');
    return response;
  }
  async login(person: { email: string }) {
    const response = await this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email: person.email, password }) });
    assert.equal(response.status, 200);
    return this;
  }
}
const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });
const proposal = (id = reviewId) => ({ reviewId: id, proposedAction: 'Schedule a documented coaching meeting',
  rationale: 'Human review of the work report and deadline calls for a coaching conversation.' });

before(async () => {
  const config = { NODE_ENV: 'test' as const, PORT: 4100, HOST: '127.0.0.1', DATABASE_URL: databaseUrl!, WEB_ORIGIN: origin,
    JWT_SECRET: 'hr-action-test-only-secret-at-least-32-characters',
    EMAIL_FROM: 'synthetic@example.test', CUSTOMER_REMINDER_DAYS_BEFORE: '', PRIVATE_STORAGE_PROVIDER: 'local' as const,
    PRIVATE_STORAGE_S3_REGION: 'ap-southeast-1' };
  app = await createApp(config); second = await createApp(config);
  await app.listen(0, '127.0.0.1'); await second.listen(0, '127.0.0.1');
  base = await app.getUrl(); secondBase = await second.getUrl(); db = app.get(Database);
  await db.loginAttempt.deleteMany();
  const hash = await hashPassword(password);
  const batch = await db.batch.create({ data: { code: `HR-ACTION-${suffix}`, model: 'Synthetic model',
    startDate: new Date('2050-01-01'), endDate: new Date('2050-12-31') } });
  const client = await db.client.create({ data: { name: 'Synthetic HR action customer', email: '', phone: '', batchId: batch.id } });
  async function person(role: 'OWNER' | 'HR_PAYROLL' | 'COO' | 'GENERAL_MANAGER' | 'CUSTOMER' | 'CORE_HANDLER', granted = false) {
    return db.user.create({ data: { role, hrConfidentialAccess: granted, name: `Synthetic ${role}`,
      email: `${suffix}-${randomUUID()}@example.test`, passwordHash: hash,
      ...(role === 'CUSTOMER' ? { clientId: client.id } : {}) } });
  }
  owner = await person('OWNER'); hr = await person('HR_PAYROLL', true); coo = await person('COO', true);
  generalManager = await person('GENERAL_MANAGER'); customer = await person('CUSTOMER');
  const assignee = await person('CORE_HANDLER');
  const task = await db.task.create({ data: { title: `Synthetic HR review ${suffix}`, creatorId: owner.id,
    assigneeId: assignee.id, deadline: new Date('2026-01-01'), submittedAt: new Date('2026-01-02'),
    status: 'SUBMITTED', report: 'Synthetic report for human review.', lateFlag: true,
    review: { create: { reviewerId: hr.id, factualEvidence: 'Submitted after recorded deadline.',
      evaluation: 'Context reviewed by a human.', recommendation: 'Discuss expectations.', decision: 'ACTION_RECOMMENDED' } } } });
  taskId = task.id;
  reviewId = (await db.kpiReview.findUniqueOrThrow({ where: { taskId } })).id;
});
after(async () => { if (app) await app.close(); if (second) await second.close(); });

test('only approved HR/COO may propose and only Owner may decide, with strict request bodies', async () => {
  const sessions = { owner: await new Session().login(owner), hr: await new Session().login(hr),
    coo: await new Session().login(coo), gm: await new Session().login(generalManager),
    customer: await new Session().login(customer), anonymous: new Session() };
  for (const [key, session] of Object.entries(sessions)) {
    assert.equal((await session.request('/hr-actions')).status, ['owner', 'hr', 'coo'].includes(key) ? 200 : key === 'anonymous' ? 401 : 403, key);
    assert.equal((await session.request('/hr-actions/eligible-reviews')).status, ['hr', 'coo'].includes(key) ? 200 : key === 'anonymous' ? 401 : 403, key);
    if (key !== 'hr' && key !== 'coo')
      assert.equal((await session.request('/hr-actions', post(proposal()))).status, key === 'anonymous' ? 401 : 403, key);
  }
  for (const body of [
    { ...proposal(), proposedById: hr.id }, { ...proposal(), reviewId: 'wrong' },
    { ...proposal(), proposedAction: ' ' }, { ...proposal(), rationale: 'short' },
  ]) assert.equal((await sessions.hr.request('/hr-actions', post(body))).status, 400);
  const noted = await db.kpiReview.create({ data: { taskId: (await db.task.create({ data: {
    title: 'Synthetic unrelated review', creatorId: owner.id, assigneeId: hr.id, deadline: new Date('2026-01-01'),
    status: 'SUBMITTED', submittedAt: new Date('2026-01-02'), lateFlag: true,
  } })).id, reviewerId: owner.id, factualEvidence: 'A late fact.', evaluation: 'No action needed.',
    recommendation: '', decision: 'NOTED' } });
  assert.equal((await sessions.hr.request('/hr-actions', post(proposal(noted.id)))).status, 409);
});

test('rejection permits a fresh request; Owner approval is final, reasoned, audited and changes no pay or task facts', async () => {
  const hrSession = await new Session().login(hr), cooSession = await new Session().login(coo);
  const ownerSession = await new Session().login(owner), ownerSecond = await new Session().login(owner);
  const originalTask = await db.task.findUniqueOrThrow({ where: { id: taskId } });
  const originalReview = await db.kpiReview.findUniqueOrThrow({ where: { id: reviewId } });
  const initial = await hrSession.request('/hr-actions', post(proposal()));
  assert.equal(initial.status, 201);
  const first = await initial.json(); assert.equal(first.status, 'PENDING');
  assert.equal(first.proposedByName, 'Synthetic HR_PAYROLL');
  assert.equal((await cooSession.request('/hr-actions', post(proposal()))).status, 409);
  assert.equal((await cooSession.request('/hr-actions')).status, 200);
  const cooHistory = await (await cooSession.request('/hr-actions')).json();
  assert.equal(cooHistory.results.some((row: { id: string }) => row.id === first.id), false);
  for (const invalid of [{ version: 1, decision: 'APPROVED' },
    { version: 1, decision: 'APPROVED', reason: '  ' },
    { version: 1, decision: 'APPROVED', reason: 'A suitable reason.', actorId: owner.id }])
    assert.equal((await ownerSession.request(`/hr-actions/${first.id}/decision`, post(invalid))).status, 400);
  assert.equal((await hrSession.request(`/hr-actions/${first.id}/decision`, post({ version: 1,
    decision: 'APPROVED', reason: 'Request reviewed with the task context.' }))).status, 403);
  assert.equal((await ownerSession.request(`/hr-actions/${first.id}/decision`, post({ version: 2,
    decision: 'REJECTED', reason: 'Please include the earlier coaching context.' }))).status, 409);
  const rejected = await ownerSession.request(`/hr-actions/${first.id}/decision`, post({ version: 1,
    decision: 'REJECTED', reason: 'Please include the earlier coaching context.' }));
  assert.equal(rejected.status, 200); assert.equal((await rejected.json()).status, 'REJECTED');
  assert.equal((await ownerSecond.request(`/hr-actions/${first.id}/decision`, post({ version: 1,
    decision: 'APPROVED', reason: 'Stale competing decision must be denied.' }), secondBase)).status, 409);
  assert.equal((await hrSession.request('/hr-actions/eligible-reviews')).status, 200);
  const revised = await cooSession.request('/hr-actions', post({ ...proposal(),
    rationale: 'After rejection, the prior coaching context was reviewed and recorded by the COO.' }));
  assert.equal(revised.status, 201);
  const secondRequest = await revised.json();
  assert.notEqual(secondRequest.id, first.id);
  const approved = await ownerSecond.request(`/hr-actions/${secondRequest.id}/decision`, post({ version: 1,
    decision: 'APPROVED', reason: 'I reviewed the full human evaluation and the revised context.' }), secondBase);
  assert.equal(approved.status, 200);
  const final = await approved.json();
  assert.equal(final.status, 'APPROVED'); assert.equal(final.decidedByName, 'Synthetic OWNER');
  assert.equal(final.version, 2); assert.ok(final.decidedAt);
  assert.equal((await hrSession.request('/hr-actions', post(proposal()))).status, 409);
  const history = await (await ownerSession.request('/hr-actions')).json();
  assert.deepEqual(history.results.filter((row: { reviewId: string }) => row.reviewId === reviewId)
    .map((row: { status: string }) => row.status).sort(), ['APPROVED', 'REJECTED']);
  assert.deepEqual(await db.task.findUniqueOrThrow({ where: { id: taskId } }), originalTask);
  assert.deepEqual(await db.kpiReview.findUniqueOrThrow({ where: { id: reviewId } }), originalReview);
  const audits = await db.auditEntry.findMany({ where: { entity: 'hr_action_request', recordId: { in: [first.id, secondRequest.id] } } });
  assert.deepEqual(audits.map((row) => row.action).sort(), ['hr_action.approved', 'hr_action.rejected', 'hr_action.requested', 'hr_action.requested']);
  await assert.rejects(db.hrActionRequest.update({ where: { id: secondRequest.id }, data: { proposedAction: 'Rewrite' } }));
  await assert.rejects(db.hrActionRequest.delete({ where: { id: secondRequest.id } }));
});

test('live change identifiers stay with the Owner and the specific proposer', async () => {
  const rows = await db.hrActionRequest.findMany({ where: { reviewId }, orderBy: { createdAt: 'asc' } });
  assert.equal(rows.length, 2);
  const realtime = app.get(RealtimeController) as unknown as {
    visible: (user: ReturnType<typeof safeUser>, event: { entity: string; recordId: string }) => Promise<boolean>;
  };
  for (const [person, expected] of [
    [owner, [true, true]], [hr, [true, false]], [coo, [false, true]], [generalManager, [false, false]],
  ] as const) {
    const user = safeUser(await db.user.findUniqueOrThrow({ where: { id: person.id } }));
    assert.deepEqual(await Promise.all(rows.map((row) => realtime.visible(user,
      { entity: 'hr_action_request', recordId: row.id }))), expected);
  }
});

test('revoked HR access and deactivated Owner cannot use an existing session to read or write decisions', async () => {
  const hrSession = await new Session().login(hr), ownerSession = await new Session().login(owner);
  await db.user.update({ where: { id: hr.id }, data: { hrConfidentialAccess: false } });
  assert.equal((await hrSession.request('/hr-actions')).status, 401);
  assert.equal((await hrSession.request('/hr-actions', post(proposal()))).status, 401);
  await db.user.update({ where: { id: owner.id }, data: { active: false } });
  assert.equal((await ownerSession.request('/hr-actions')).status, 401);
});
