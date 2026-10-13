import 'reflect-metadata';
import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { roles, rolePermissions, type Role, type User } from '@freshphones/contracts';
import { createApp } from '../src/app';
import { Database } from '../src/database';
import { hashPassword } from '../src/auth/password';
import { safeUser } from '../src/auth/auth.service';
import { RecordsService } from '../src/records/records.service';
import { TasksService } from '../src/tasks/tasks.service';
import { WorkService } from '../src/work/work.service';
import { RecruitmentService } from '../src/recruitment/recruitment.service';
import { PrivateStorageService } from '../src/storage/private-storage.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error('TEST_DATABASE_URL must point to a migrated dedicated database ending in _test.');
const origin = 'http://localhost:3100';
const password = 'Confidential-test-password-123!';
const suffix = randomUUID().slice(0, 8);
let app: INestApplication, second: INestApplication, db: Database, base: string, secondBase: string;
let passwordHash: string, clientId: string, taskId: string, applicantId: string, attachmentId: string;
const people = new Map<Role, { id: string; email: string }>();
const sessions = new Map<Role, Session>();
const privateKeys: string[] = [];
const json = (value: unknown) => ({ method: 'PATCH', body: JSON.stringify(value) });

class Session {
  cookie = '';
  async request(path: string, options: RequestInit = {}, target = base) {
    const result = await fetch(`${target}/api${path}`, { ...options,
      headers: { Origin: origin, Cookie: this.cookie, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
    if (result.headers.getSetCookie().length)
      this.cookie = result.headers.getSetCookie().map((item) => item.split(';')[0]).join('; ');
    return result;
  }
  async login(person: { email: string }) {
    const response = await this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email: person.email, password }) });
    assert.equal(response.status, 200);
    return this;
  }
}
async function person(role: Role) {
  return db.user.create({ data: { name: `Synthetic ${role}`, email: `${suffix}-${randomUUID()}@example.test`,
    passwordHash, role, ...(role === 'CUSTOMER' ? { clientId } : {}) } });
}
async function decision(subject: { id: string }, granted: boolean, version?: number, target = base) {
  const current = await db.user.findUniqueOrThrow({ where: { id: subject.id } });
  return sessions.get('OWNER')!.request(`/accounts/${subject.id}`, json({ version: version ?? current.version,
    hrConfidentialAccess: granted, hrAccessReason: granted ? 'Owner approved the confidential review duties.' : 'Confidential duties were removed.' }), target);
}
async function openStream(session: Session) {
  const controller = new AbortController();
  const response = await session.request('/events', { signal: controller.signal }, secondBase);
  assert.equal(response.status, 200);
  let text = '', ended = false;
  const reader = response.body!.getReader();
  const running = (async () => {
    try { while (true) { const item = await reader.read(); if (item.done) break; text += new TextDecoder().decode(item.value); } }
    catch { /* Closing the test stream is expected. */ }
    finally { ended = true; }
  })();
  const wait = async (predicate: () => boolean) => {
    const limit = Date.now() + 4500;
    while (!predicate() && Date.now() < limit) await new Promise((resolve) => setTimeout(resolve, 30));
    assert.ok(predicate(), 'Expected stream condition did not arrive.');
  };
  await wait(() => text.includes('event: ready'));
  return { get text() { return text; }, get ended() { return ended; }, wait,
    close: async () => { controller.abort(); await running; } };
}
before(async () => {
  const config = { NODE_ENV: 'test' as const, PORT: 4100, HOST: '127.0.0.1', DATABASE_URL: databaseUrl!, WEB_ORIGIN: origin,
    JWT_SECRET: 'confidential-test-only-secret-at-least-32-characters',
    EMAIL_FROM: 'synthetic@example.test', CUSTOMER_REMINDER_DAYS_BEFORE: '', PRIVATE_STORAGE_PROVIDER: 'local' as const,
    PRIVATE_STORAGE_S3_REGION: 'ap-southeast-1' };
  app = await createApp(config); second = await createApp(config);
  await app.listen(0, '127.0.0.1'); await second.listen(0, '127.0.0.1');
  base = await app.getUrl(); secondBase = await second.getUrl(); db = app.get(Database);
  await db.loginAttempt.deleteMany();
  passwordHash = await hashPassword(password);
  const batch = await db.batch.create({ data: { code: `HR-${suffix}`, model: 'Synthetic model',
    startDate: new Date('2050-01-01'), endDate: new Date('2050-12-31') } });
  clientId = (await db.client.create({ data: { name: 'Synthetic HR test customer', email: '', phone: '', batchId: batch.id } })).id;
  for (const role of roles) { const user = await person(role); people.set(role, user); sessions.set(role, await new Session().login(user)); }
  taskId = (await db.task.create({ data: { title: `HR task ${suffix}`, creatorId: people.get('OWNER')!.id,
    assigneeId: people.get('CORE_HANDLER')!.id, deadline: new Date('2026-01-01'), submittedAt: new Date('2026-01-02'),
    status: 'SUBMITTED', report: 'Ordinary task evidence.', lateFlag: true,
    review: { create: { reviewerId: people.get('OWNER')!.id, factualEvidence: 'Private context',
      evaluation: 'CONFIDENTIAL-EVALUATION', recommendation: 'CONFIDENTIAL-RECOMMENDATION', decision: 'NOTED' } } } })).id;
  const job = await db.jobOpening.create({ data: { title: `HR job ${suffix}`, description: 'Approved public copy.', isOpen: true } });
  const form = new FormData(); form.set('jobId', job.id); form.set('fullName', `PRIVATE-APPLICANT-${suffix}`);
  form.set('email', `applicant-${suffix}@example.test`);
  form.set('attachment', new Blob(['%PDF-1.7\nPRIVATE-APPLICANT-FILE'], { type: 'application/pdf' }), 'private.pdf');
  const application = await fetch(`${base}/api/careers/apply`, { method: 'POST', headers: { Origin: origin }, body: form });
  assert.equal(application.status, 201); applicantId = (await application.json()).id;
  const applicant = await db.applicant.findUniqueOrThrow({ where: { id: applicantId }, include: { attachments: { include: { storedFile: true } } } });
  attachmentId = applicant.attachments[0].id; privateKeys.push(applicant.attachments[0].storedFile.storageKey);
  await db.applicant.update({ where: { id: applicantId }, data: { reviewerNotes: 'CONFIDENTIAL-HIRING-NOTES' } });
});
beforeEach(async () => { await db.loginAttempt.deleteMany(); });
after(async () => {
  if (app) { for (const key of privateKeys) await app.get(PrivateStorageService).remove(key); await app.close(); }
  if (second) await second.close();
});

test('migration defaults every non-Owner off and all private routes deny every ungranted role and anonymous caller', async () => {
  const paths = ['/kpi/queue', '/kpi/reviews', '/work/kpi/queue', '/recruitment/applicants',
    `/recruitment/applicants/${applicantId}`, `/applicant-attachments/${attachmentId}/content`];
  for (const role of roles) {
    const row = await db.user.findUniqueOrThrow({ where: { id: people.get(role)!.id } });
    assert.equal(row.hrConfidentialAccess, false);
    const me = await (await sessions.get(role)!.request('/auth/me')).json();
    assert.equal(me.permissions.includes('HR_CONFIDENTIAL'), role === 'OWNER');
    for (const path of paths) assert.equal((await sessions.get(role)!.request(path)).status, role === 'OWNER' ? 200 : 403, `${role} ${path}`);
  }
  for (const path of paths) assert.equal((await new Session().request(path)).status, 401, path);
});
test('Owner alone can change grants or read decision history; invalid bodies and ineligible recipients are rejected', async () => {
  const subject = await person('COO');
  for (const role of roles.filter((value) => value !== 'OWNER')) {
    assert.equal((await sessions.get(role)!.request(`/accounts/${subject.id}`, json({ version: 1, hrConfidentialAccess: true, hrAccessReason: 'Escalation attempt.' }))).status, 403, role);
    assert.equal((await sessions.get(role)!.request(`/accounts/${subject.id}/hr-access-history`)).status, 403, role);
  }
  const owner = sessions.get('OWNER')!;
  for (const body of [
    { hrConfidentialAccess: true, hrAccessReason: 'Missing version.' },
    { version: 1, hrConfidentialAccess: true },
    { version: 1, hrConfidentialAccess: true, hrAccessReason: '  ' },
    { version: 1, hrConfidentialAccess: true, hrAccessReason: 'x'.repeat(1001) },
    { version: 1, hrConfidentialAccess: true, hrAccessReason: 'Forged.', actorId: people.get('OWNER')!.id },
  ]) assert.equal((await owner.request(`/accounts/${subject.id}`, json(body))).status, 400);
  for (const role of roles.filter((value) => value !== 'HR_PAYROLL' && value !== 'COO')) {
    const target = people.get(role)!;
    assert.equal((await decision(target, true)).status, 400, role);
  }
  const inactive = await person('HR_PAYROLL'); await db.user.update({ where: { id: inactive.id }, data: { active: false } });
  assert.equal((await decision(inactive, true)).status, 400);
  assert.equal((await new Session().request(`/accounts/${subject.id}/hr-access-history`)).status, 401);
});
test('explicit grants unlock HR and COO after fresh sign-in and record a minimized Owner decision history', async () => {
  for (const role of ['HR_PAYROLL', 'COO'] as const) {
    const subject = people.get(role)!;
    assert.equal((await decision(subject, true)).status, 200);
    assert.equal((await sessions.get(role)!.request('/auth/me')).status, 401);
    sessions.set(role, await new Session().login(subject));
    const me = await (await sessions.get(role)!.request('/auth/me')).json();
    assert.equal(me.permissions.includes('KPI_REVIEW'), true);
    for (const path of ['/kpi/reviews', '/work/kpi/queue', `/recruitment/applicants/${applicantId}`, `/applicant-attachments/${attachmentId}/content`])
      assert.equal((await sessions.get(role)!.request(path, {}, secondBase)).status, 200, `${role} ${path}`);
    const history = await (await sessions.get('OWNER')!.request(`/accounts/${subject.id}/hr-access-history`)).json();
    assert.equal(history.total, 1); assert.equal(history.items[0].granted, true);
    assert.equal(history.items[0].actorName, 'Synthetic OWNER'); assert.match(history.items[0].reason, /Owner approved/);
    assert.deepEqual(Object.keys(history.items[0]).sort(), ['actorName', 'createdAt', 'granted', 'id', 'reason']);
  }
});
test('both task API families redact private evaluations for managers and the employee while keeping ordinary facts and aggregates available', async () => {
  for (const role of roles.filter((value) => value !== 'CUSTOMER')) {
    const session = sessions.get(role)!;
    const expected = ['OWNER', 'HR_PAYROLL', 'COO'].includes(role);
    for (const path of ['/tasks', '/work/tasks']) {
      const response = await session.request(path); assert.equal(response.status, 200);
      const payload = await response.json();
      assert.equal(JSON.stringify(payload).includes('CONFIDENTIAL-EVALUATION'), expected, `${role} ${path}`);
    }
    if (rolePermissions[role].includes('REPORT_VIEW')) {
      const report = await session.request('/reports/tasks'); assert.equal(report.status, 200);
      assert.equal(JSON.stringify(await report.json()).includes('CONFIDENTIAL'), false);
    }
  }
  const direct = await (await sessions.get('GENERAL_MANAGER')!.request(`/tasks/${taskId}`)).json();
  assert.equal(direct.review, null); assert.equal(direct.reviewed, true); assert.equal(direct.report, 'Ordinary task evidence.');
});
test('revocation stops the other replica stream and blocks fresh requests and stale service actors on every confidential path', async () => {
  const subject = people.get('COO')!;
  const stale = safeUser(await db.user.findUniqueOrThrow({ where: { id: subject.id } }));
  const feed = await openStream(sessions.get('COO')!);
  try {
    assert.equal((await decision(subject, false)).status, 200);
    await feed.wait(() => feed.ended);
    assert.equal((await sessions.get('COO')!.request('/kpi/reviews', {}, secondBase)).status, 401);
    sessions.set('COO', await new Session().login(subject));
    for (const path of ['/kpi/queue', '/kpi/reviews', '/work/kpi/queue', '/recruitment/applicants', `/applicant-attachments/${attachmentId}/content`])
      assert.equal((await sessions.get('COO')!.request(path)).status, 403, path);
    await assert.rejects(app.get(TasksService).kpiReviews(stale, 1), /access has changed/);
    await assert.rejects(app.get(TasksService).review(stale, { taskId, version: 1, evaluation: 'Stale.', recommendation: '', decision: 'NOTED' }), /access/);
    await assert.rejects(app.get(WorkService).kpiQueue(stale), /access has changed/);
    await assert.rejects(app.get(WorkService).review(stale, { taskId, evaluation: 'Stale.', recommendation: '', decision: 'NOTED' }), /access has changed/);
    await assert.rejects(app.get(RecruitmentService).applicant(stale, applicantId), /access has changed/);
    await assert.rejects(app.get(RecruitmentService).applicantAttachment(stale, attachmentId), /access has changed/);
    await assert.rejects(app.get(RecruitmentService).updateApplicant(stale, applicantId, { version: 1, reviewerNotes: 'Stale.' }), /access has changed/);
    assert.equal(JSON.stringify(await app.get(TasksService).detail(stale, taskId)).includes('CONFIDENTIAL'), false);
    assert.equal(JSON.stringify(await app.get(WorkService).tasks(stale, { page: 1, q: '' })).includes('CONFIDENTIAL'), false);
  } finally { await feed.close(); }
});
test('cross-instance applicant events reach approved reviewers and stay private from ungranted HR and COO streams', async () => {
  const approved = await person('HR_PAYROLL');
  assert.equal((await decision(approved, true)).status, 200);
  const ungrantedHr = await person('HR_PAYROLL'), ungrantedCoo = await person('COO');
  const feeds = await Promise.all([
    openStream(sessions.get('OWNER')!),
    openStream(await new Session().login(approved)),
    openStream(await new Session().login(ungrantedHr)),
    openStream(await new Session().login(ungrantedCoo)),
  ]);
  try {
    const privateId = randomUUID(), publicId = randomUUID();
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      await tx.changeEvent.create({ data: { entity: 'applicant', recordId: privateId } });
      await tx.changeEvent.create({ data: { entity: 'job_opening', recordId: publicId } });
    });
    // Seeing the later public event proves each stream processed the preceding private event.
    await Promise.all(feeds.map((feed) => feed.wait(() => feed.text.includes(publicId))));
    for (const [index, feed] of feeds.entries()) assert.equal(feed.text.includes(privateId), index < 2);
  } finally { await Promise.all(feeds.map((feed) => feed.close())); }
});
test('grants are cleared on every role change and deactivation and do not return on reactivation', async () => {
  const owner = sessions.get('OWNER')!;
  for (const changes of [{ role: 'COO' }, { role: 'GENERAL_MANAGER' }, { active: false }] as const) {
    const subject = await person('HR_PAYROLL'); assert.equal((await decision(subject, true)).status, 200);
    const response = await owner.request(`/accounts/${subject.id}`, json({ ...changes, version: 2 }));
    assert.equal(response.status, 200); const after = await response.json(); assert.equal(after.hrConfidentialAccess, false);
    if ('active' in changes) {
      const reactivated = await owner.request(`/accounts/${subject.id}`, json({ active: true, version: 3 }));
      assert.equal((await reactivated.json()).hrConfidentialAccess, false);
    }
    const history = await (await owner.request(`/accounts/${subject.id}/hr-access-history`)).json();
    assert.equal(history.total, 2); assert.equal(history.items[0].granted, false); assert.match(history.items[0].reason, /Access cleared/);
  }
});
test('Owner can approve a new eligible role in the same versioned save, with a fresh decision rather than a carried grant', async () => {
  const subject = await person('HR_PAYROLL'); assert.equal((await decision(subject, true)).status, 200);
  const response = await sessions.get('OWNER')!.request(`/accounts/${subject.id}`, json({ version: 2, role: 'COO',
    hrConfidentialAccess: true, hrAccessReason: 'Separately approved new COO duties.' }));
  assert.equal(response.status, 200); assert.equal((await response.json()).hrConfidentialAccess, true);
  const history = await (await sessions.get('OWNER')!.request(`/accounts/${subject.id}/hr-access-history`)).json();
  assert.equal(history.total, 2); assert.match(history.items[0].reason, /new COO/);
});
test('competing Owner decisions reject stale saves, including stale no-ops, and audit only the winning decision', async () => {
  const subject = await person('HR_PAYROLL');
  const responses = await Promise.all([decision(subject, true, 1), decision(subject, true, 1, secondBase)]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
  assert.equal((await decision(subject, true, 1)).status, 409);
  assert.equal((await decision(subject, false, 1)).status, 409);
  assert.equal(await db.auditEntry.count({ where: { recordId: subject.id, action: 'account.hr_access_granted' } }), 1);
});
test('history paging is bounded, stable and private; database constraints reject invalid grants', async () => {
  const subject = await person('HR_PAYROLL');
  for (let index = 0; index < 24; index++) assert.equal((await decision(subject, index % 2 === 0)).status, 200);
  const owner = sessions.get('OWNER')!;
  const first = await (await owner.request(`/accounts/${subject.id}/hr-access-history`)).json();
  const next = await (await owner.request(`/accounts/${subject.id}/hr-access-history?page=2`)).json();
  assert.equal(first.total, 24); assert.equal(first.items.length, 20); assert.equal(next.items.length, 4);
  assert.equal(new Set([...first.items, ...next.items].map((item) => item.id)).size, 24);
  for (const query of ['page=0', 'page=100001', 'page=1&userId=forged'])
    assert.equal((await owner.request(`/accounts/${subject.id}/hr-access-history?${query}`)).status, 400);
  for (const role of ['GENERAL_MANAGER', 'FINANCE_OFFICER', 'OWNER'] as const)
    await assert.rejects(db.user.update({ where: { id: people.get(role)!.id }, data: { hrConfidentialAccess: true } }));
});
test('grant changes preserve job management, public pages and Finance permissions, and stale Owners cannot approve', async () => {
  const coo = sessions.get('COO')!;
  assert.equal((await coo.request('/recruitment/jobs')).status, 200);
  assert.equal((await coo.request('/recruitment/summary')).status, 200);
  assert.equal((await coo.request('/reports/tasks')).status, 200);
  const publicJobs = await new Session().request('/careers'); assert.equal(publicJobs.status, 200);
  assert.equal(JSON.stringify(await publicJobs.json()).includes('PRIVATE-APPLICANT'), false);
  for (const role of ['HR_PAYROLL', 'COO'] as const)
    assert.equal((await sessions.get(role)!.request('/staff/finance-alerts')).status, 403);
  const retiredOwner = await person('OWNER'), subject = await person('HR_PAYROLL');
  const stale = safeUser(retiredOwner);
  await db.user.update({ where: { id: retiredOwner.id }, data: { role: 'GENERAL_MANAGER' } });
  await assert.rejects(app.get(RecordsService).updateAccount(stale as User, subject.id,
    { hrConfidentialAccess: true, hrAccessReason: 'Stale approval.' }, 1), /access has changed/);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: subject.id } })).hrConfidentialAccess, false);
});
