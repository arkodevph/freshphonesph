import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import type { RetentionPreview, RetentionRequest, RetentionScope } from '@freshphones/contracts';
import { createApp } from '../src/app';
import { Database } from '../src/database';
import { hashPassword } from '../src/auth/password';
import { PrivateStorageService } from '../src/storage/private-storage.service';
import { safeUser } from '../src/auth/auth.service';
import { RetentionService } from '../src/retention/retention.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test')) throw new Error('Use a migrated dedicated TEST_DATABASE_URL ending in _test.');
const origin = 'http://localhost:3100', password = 'Synthetic-retention-test-password123!';
const old = new Date('2020-01-01T00:00:00Z'), suffix = randomUUID().slice(0, 8);
let app: INestApplication, second: INestApplication, db: Database, base: string, secondBase: string, directory: string, hash: string;
let owner: { id: string; email: string }, finance: { id: string; email: string }, jobId: string, batchId: string;
const sessions = new Map<string, string>();
async function call(path: string, body?: unknown, role = 'owner', target = base) {
  return fetch(`${target}/api${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: origin,
    Cookie: sessions.get(role) ?? '', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function success<T>(response: Response, status = 201): Promise<T> {
  const body = await response.json(); assert.equal(response.status, status, JSON.stringify(body)); return body as T;
}
async function preview(scope: RetentionScope, subjectId: string) {
  return success<RetentionPreview>(await call('/retention/preview', { scope, subjectId }));
}
async function policy(scope: RetentionScope, days = 1) {
  const draft = await success<{ id: string }>(await call('/retention/policies', { scope, days,
    basis: 'Synthetic approved test policy. Never activate this fixture in production.',
    backupInstructions: 'Keep ledger outside backups and reconcile restored copies before reopening access.',
    externalCopyInstructions: 'Record provider and exported copy disposition in the synthetic test case.' }));
  await success(await call(`/retention/policies/${draft.id}/approve`, { approvalReference: `Synthetic policy approval ${suffix}` }));
  return draft.id;
}
async function application(status: 'REJECTED' | 'REVIEWING' = 'REJECTED') {
  return db.applicant.create({ data: { jobId, fullName: `Private Applicant ${randomUUID()}`, email: 'applicant@example.test', phone: '09123456789',
    message: 'Personal application content', reviewerNotes: 'Private evaluation', status, createdAt: old, updatedAt: old } });
}
async function file(originalName = 'private-id.pdf') {
  const storageKey = randomUUID(), payload = Buffer.from('%PDF-synthetic confidential bytes');
  await writeFile(join(directory, storageKey), payload);
  return db.storedFile.create({ data: { storageKey, originalName, mimeType: 'application/pdf', size: payload.length, createdAt: old } });
}
async function request(scope: RetentionScope, subjectId: string) {
  const current = await preview(scope, subjectId); assert.deepEqual(current.blockers, []);
  return success<RetentionRequest>(await call('/retention/requests', { scope, subjectId, previewHash: current.previewHash, reason: `Synthetic expiry case ${suffix}` }));
}
async function approve(row: RetentionRequest) {
  return success<RetentionRequest>(await call(`/retention/requests/${row.id}/decision`, { version: row.version, approved: true, reason: 'Synthetic reviewed erasure authorization.' }));
}
async function execute(row: RetentionRequest) {
  return success<RetentionRequest>(await call(`/retention/requests/${row.id}/execute`, { version: row.version, confirmation: row.subjectId }));
}

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'fresh-retention-'));
  const config = { NODE_ENV: 'test' as const, PORT: 4100, HOST: '127.0.0.1', DATABASE_URL: databaseUrl!, WEB_ORIGIN: origin,
    JWT_SECRET: 'retention-test-only-secret-at-least-32-characters', EMAIL_FROM: 'synthetic@example.test',
    CUSTOMER_REMINDER_DAYS_BEFORE: '', PRIVATE_STORAGE_PROVIDER: 'local' as const, PRIVATE_STORAGE_DIR: directory, PRIVATE_STORAGE_S3_REGION: 'ap-southeast-1' };
  app = await createApp(config); second = await createApp(config); await app.listen(0, '127.0.0.1'); await second.listen(0, '127.0.0.1');
  base = await app.getUrl(); secondBase = await second.getUrl(); db = app.get(Database); hash = await hashPassword(password);
  await db.loginAttempt.deleteMany();
  owner = await db.user.create({ data: { name: 'Retention Owner', email: `retention-owner-${suffix}@example.test`, passwordHash: hash, role: 'OWNER' } });
  finance = await db.user.create({ data: { name: 'Retention Finance', email: `retention-finance-${suffix}@example.test`, passwordHash: hash, role: 'FINANCE_OFFICER' } });
  for (const [role, person] of [['owner', owner], ['finance', finance]] as const) {
    const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: person.email, password }) });
    assert.equal(response.status, 200); sessions.set(role, response.headers.getSetCookie().map(value => value.split(';')[0]).join('; '));
  }
  batchId = (await db.batch.create({ data: { code: `RETENTION-${suffix}`, model: 'Synthetic phone', startDate: old, endDate: new Date('2020-12-31') } })).id;
  jobId = (await db.jobOpening.create({ data: { title: 'Retention synthetic role', description: 'Test', isOpen: true } })).id;
});
after(async () => { if (app) await app.close(); if (second) await second.close(); if (directory) await rm(directory, { recursive: true, force: true }); });

test('retention is Owner only, defaults to no approved rules, validates inputs, and stores immutable policy revisions', async () => {
  for (const route of ['/policies', '/candidates', '/requests', '/holds', '/deletion-ledger']) {
    assert.equal((await call(`/retention${route}`, undefined, 'finance')).status, 403);
    assert.equal((await call(`/retention${route}`, undefined, 'anonymous')).status, 401);
  }
  const applicant = await application();
  const initial = await preview('APPLICANT', applicant.id); assert.equal(initial.policy, null); assert.match(initial.blockers.join(' '), /No approved/);
  assert.equal((await call('/retention/requests', { scope: 'APPLICANT', subjectId: applicant.id, previewHash: initial.previewHash, reason: 'Expiry case' })).status, 409);
  for (const invalid of [{ scope: 'APPLICANT', days: 0 }, { scope: 'APPLICANT', days: 1, approvedById: owner.id }])
    assert.equal((await call('/retention/policies', invalid)).status, 400);
  const first = await policy('APPLICANT');
  assert.equal((await db.retentionPolicy.findUniqueOrThrow({ where: { id: first } })).status, 'ACTIVE');
  await assert.rejects(db.retentionPolicy.update({ where: { id: first }, data: { days: 2 } }));
  await assert.rejects(db.retentionPolicy.delete({ where: { id: first } }));
  const secondId = await policy('APPLICANT');
  assert.equal((await db.retentionPolicy.findUniqueOrThrow({ where: { id: first } })).status, 'RETIRED');
  assert.equal((await db.retentionPolicy.findUniqueOrThrow({ where: { id: secondId } })).version, 2);
  for (const scope of ['CUSTOMER', 'EMPLOYEE', 'PRIVATE_FILE'] as const) await policy(scope);
});

test('unfinished or recently changed applications are blocked; active parent holds also protect their attachments', async () => {
  const applicant = await application('REVIEWING'); const stored = await file();
  await db.applicantAttachment.create({ data: { applicantId: applicant.id, storedFileId: stored.id, createdAt: old } });
  assert.match((await preview('APPLICANT', applicant.id)).blockers.join(' '), /finalized/);
  await db.applicant.update({ where: { id: applicant.id }, data: { status: 'REJECTED', updatedAt: new Date() } });
  assert.match((await preview('APPLICANT', applicant.id)).blockers.join(' '), /not elapsed/);
  await db.applicant.update({ where: { id: applicant.id }, data: { updatedAt: old } });
  const hold = await success<{ id: string }>(await call('/retention/holds', { scope: 'APPLICANT', subjectId: applicant.id, reason: 'Synthetic litigation hold' }));
  assert.match((await preview('PRIVATE_FILE', stored.id)).blockers.join(' '), /hold/);
  await success(await call(`/retention/holds/${hold.id}/release`, { reason: 'Synthetic hold cleared' }));
  assert.deepEqual((await preview('PRIVATE_FILE', stored.id)).blockers, []);
  assert.equal((await call(`/retention/holds/${hold.id}/release`, { reason: 'Cannot release twice' })).status, 409);
});

test('concurrent requests deduplicate; stale data, policy revisions and hold history invalidate approval', async () => {
  const applicant = await application(); const current = await preview('APPLICANT', applicant.id);
  const input = { scope: 'APPLICANT', subjectId: applicant.id, previewHash: current.previewHash, reason: 'Concurrency expiry case' };
  const results = await Promise.all([call('/retention/requests', input), call('/retention/requests', input, 'owner', secondBase)]);
  assert.deepEqual(results.map(response => response.status).sort(), [201, 409]);
  const row = await results.find(response => response.status === 201)!.json() as RetentionRequest;
  await db.applicant.update({ where: { id: applicant.id }, data: { reviewerNotes: 'Changed after preview', updatedAt: old } });
  assert.equal((await call(`/retention/requests/${row.id}/decision`, { version: 1, approved: true, reason: 'Stale approval denied' })).status, 409);
  await success(await call(`/retention/requests/${row.id}/decision`, { version: 1, approved: false, reason: 'Refresh the request' }));
  let revised = await approve(await request('APPLICANT', applicant.id));
  const hold = await success<{ id: string }>(await call('/retention/holds', { scope: 'APPLICANT', subjectId: applicant.id, reason: 'New operational hold' }));
  assert.equal((await call(`/retention/requests/${revised.id}/execute`, { version: revised.version, confirmation: applicant.id })).status, 409);
  await success(await call(`/retention/holds/${hold.id}/release`, { reason: 'Operation cleared' }));
  assert.equal((await call(`/retention/requests/${revised.id}/execute`, { version: revised.version, confirmation: applicant.id })).status, 409);
  await success(await call(`/retention/requests/${revised.id}/decision`, { version: revised.version, approved: false, reason: 'Refresh after hold' }));
  revised = await approve(await request('APPLICANT', applicant.id)); await policy('APPLICANT');
  assert.equal((await call(`/retention/requests/${revised.id}/execute`, { version: revised.version, confirmation: applicant.id })).status, 409);
  assert.equal((await db.applicant.findUniqueOrThrow({ where: { id: applicant.id } })).retentionErasedAt, null);
});

test('applicant erasure removes PII and audit copies; failed storage stays inaccessible and retry survives another API process', async () => {
  const applicant = await application(), stored = await file();
  const attachment = await db.applicantAttachment.create({ data: { applicantId: applicant.id, storedFileId: stored.id, createdAt: old } });
  await db.auditEntry.create({ data: { actorId: owner.id, action: 'applicant.reviewed', entity: 'applicant', recordId: applicant.id,
    before: { fullName: applicant.fullName, email: applicant.email }, after: { id: applicant.id, status: 'REJECTED', message: applicant.message } } });
  const approved = await approve(await request('APPLICANT', applicant.id));
  assert.equal((await call(`/retention/requests/${approved.id}/execute`, { version: approved.version, confirmation: randomUUID() })).status, 409);
  const storage = app.get(PrivateStorageService), erase = storage.erase.bind(storage);
  storage.erase = async () => { throw new Error('Sensitive provider error should not be persisted'); };
  let result: RetentionRequest;
  try { result = await execute(approved); } finally { storage.erase = erase; }
  assert.equal(result!.status, 'FILES_PENDING'); assert.equal(result!.files[0].status, 'FAILED'); assert.equal(result!.files[0].attempts, 1);
  assert.doesNotMatch(result!.files[0].error!, /Sensitive/);
  assert.equal((await db.storedFile.findUniqueOrThrow({ where: { id: stored.id } })).purgePending, true);
  await assert.rejects(storage.read(stored.storageKey)); assert.ok(await readFile(join(directory, stored.storageKey)));
  assert.equal(await db.applicantAttachment.count({ where: { id: attachment.id } }), 0);
  const erased = await db.applicant.findUniqueOrThrow({ where: { id: applicant.id } });
  assert.equal(erased.email, ''); assert.equal(erased.message, ''); assert.equal(erased.reviewerNotes, ''); assert.ok(erased.retentionErasedAt);
  const history = await db.auditEntry.findMany({ where: { entity: 'applicant', recordId: applicant.id } });
  assert.doesNotMatch(JSON.stringify(history), /applicant@example|Personal application/);
  await assert.rejects(db.applicant.update({ where: { id: applicant.id }, data: { email: 'resurrect@example.test' } }));
  await assert.rejects(db.applicantAttachment.create({ data: { applicantId: applicant.id, storedFileId: (await file()).id } }));
  assert.equal((await call(`/retention/requests/${approved.id}/execute`, { version: approved.version, confirmation: applicant.id })).status, 409);
  const completed = await success<RetentionRequest>(await call(`/retention/requests/${approved.id}/retry-files`, {}, 'owner', secondBase));
  assert.equal(completed.status, 'COMPLETED'); assert.equal(completed.files[0].attempts, 2); await assert.rejects(readFile(join(directory, stored.storageKey)));
  assert.equal(await db.storedFile.count({ where: { id: stored.id } }), 0);
  const job = await db.retentionFileJob.findFirstOrThrow({ where: { requestId: completed.id } }); assert.equal(job.storageKey, null);
  const followup = await success<RetentionRequest>(await call(`/retention/requests/${completed.id}/followup`, { version: completed.version, reference: 'Synthetic backup/provider case closed' }));
  assert.ok(followup.followupAt); assert.equal(followup.followupBy!.id, owner.id);
  await assert.rejects(db.retentionRequest.delete({ where: { id: completed.id } }));
  const ledger = await success<{ records: { subjectId: string; manifest: object }[] }>(await call('/retention/deletion-ledger'), 200);
  assert.ok(ledger.records.some(row => row.subjectId === applicant.id)); assert.doesNotMatch(JSON.stringify(ledger), /applicant@example|private-id.pdf|Personal application/);
});

test('customer erasure preserves exact financial facts and clears linked records, notifications and local email previews', async () => {
  const client = await db.client.create({ data: { name: 'Private Customer', email: 'customer-private@example.test', phone: '09123456789', batchId, status: 'COMPLETED', releaseStatus: 'RELEASED', createdAt: old, updatedAt: old } });
  const account = await db.user.create({ data: { name: client.name, email: `customer-${suffix}@example.test`, passwordHash: hash, role: 'CUSTOMER', active: false, clientId: client.id, createdAt: old, updatedAt: old } });
  const proof = await file('receipt-personal.pdf');
  const schedule = await db.scheduleItem.create({ data: { clientId: client.id, sequenceNo: 1, dueDate: old, expectedAmount: '1234.56' } });
  const payment = await db.payment.create({ data: { clientId: client.id, batchId, scheduleItemId: schedule.id, amount: '1234.56', paymentDate: old, method: 'GCASH',
    referenceNumber: 'private-reference', receiptName: client.name, receiptPhone: client.phone, notes: 'Private receipt note', verificationNotes: 'Private verification details', proofFileId: proof.id,
    status: 'VERIFIED', recordedById: owner.id, verifierId: finance.id, verifiedAt: old, createdAt: old, updatedAt: old } });
  const support = await db.supportCase.create({ data: { clientId: client.id, category: 'Payment', description: 'Personal concern', resolution: 'Private resolution', status: 'CLOSED', closedAt: old, createdAt: old, updatedAt: old } });
  await db.supportMessage.create({ data: { caseId: support.id, authorId: owner.id, body: 'Personal chat', createdAt: old } });
  const notice = await db.notification.create({ data: { userId: account.id, kind: 'payment', title: 'Personal preview', message: 'Private Customer message', emailStatus: 'SENT', createdAt: old } });
  const mailDirectory = join(process.cwd(), '.local/mail'); await import('node:fs/promises').then(fs => fs.mkdir(mailDirectory, { recursive: true }));
  await writeFile(join(mailDirectory, `${notice.id}.txt`), 'Private Customer saved email');
  const legacyResetMailId = randomUUID();
  await writeFile(join(mailDirectory, `${legacyResetMailId}.txt`), `To: ${account.email}\nHello Private Customer\nPrivate password reset preview`);
  await db.auditEntry.create({ data: { actorId: finance.id, action: 'payment.verified', entity: 'payment', recordId: payment.id,
    after: { client: { id: client.id, name: client.name }, amount: '1234.56', status: 'VERIFIED', receiptPhone: client.phone } } });
  const approved = await approve(await request('CUSTOMER', client.id)); const completed = await execute(approved);
  assert.equal(completed.status, 'COMPLETED'); assert.equal(completed.files.length, 3);
  const current = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
  for (const key of ['amount', 'status', 'verifiedAt', 'verifierId', 'recordedById', 'scheduleItemId', 'paymentDate', 'batchId'] as const) assert.deepEqual(current[key], payment[key], key);
  assert.equal(current.receiptName, ''); assert.equal(current.referenceNumber, ''); assert.equal(current.proofFileId, null);
  assert.deepEqual(await db.scheduleItem.findUniqueOrThrow({ where: { id: schedule.id } }), schedule);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: account.id } })).passwordHash, 'ERASED');
  assert.equal(await db.supportMessage.count({ where: { caseId: support.id } }), 0); assert.equal(await db.notification.count({ where: { id: notice.id } }), 0);
  await assert.rejects(readFile(join(mailDirectory, `${notice.id}.txt`)));
  await assert.rejects(readFile(join(mailDirectory, `${legacyResetMailId}.txt`)));
  const audit = await db.auditEntry.findFirstOrThrow({ where: { entity: 'payment', recordId: payment.id } }); assert.equal((audit.after as { amount: string }).amount, '1234.56');
  await assert.rejects(db.supportCase.create({ data: { clientId: client.id, category: 'Payment', description: 'New personal concern' } }));
  await assert.rejects(db.client.update({ where: { id: client.id }, data: { name: 'Restored profile' } }));
});

test('customer open work, nonzero balance, active accounts and shared files block profile deletion', async () => {
  const client = await db.client.create({ data: { name: 'Protected customer', email: '', phone: '', batchId, status: 'COMPLETED', releaseStatus: 'RELEASED', createdAt: old, updatedAt: old } });
  await db.scheduleItem.create({ data: { clientId: client.id, sequenceNo: 1, dueDate: old, expectedAmount: '50' } });
  assert.match((await preview('CUSTOMER', client.id)).blockers.join(' '), /balance/);
  const open = await db.supportCase.create({ data: { clientId: client.id, category: 'Record', description: 'Open', createdAt: old, updatedAt: old } });
  assert.match((await preview('CUSTOMER', client.id)).blockers.join(' '), /support/);
  const applicant = await application(); const shared = await file();
  await db.applicantAttachment.create({ data: { applicantId: applicant.id, storedFileId: shared.id, createdAt: old } });
  await db.customerDocument.create({ data: { clientId: client.id, fileId: shared.id, requirementKey: 'ID', createdAt: old } });
  assert.match((await preview('APPLICANT', applicant.id)).blockers.join(' '), /shared/);
  assert.match((await preview('PRIVATE_FILE', shared.id)).blockers.join(' '), /support/);
  assert.ok(open.id);
});

test('inactive employee erasure preserves task facts and disables credentials; unfinished tasks and HR decisions remain protected', async () => {
  const employee = await db.user.create({ data: { name: 'Private Employee', email: `inactive-${suffix}@example.test`, passwordHash: hash, role: 'CORE_HANDLER', active: false, createdAt: old, updatedAt: old } });
  const stored = await file('employee-report.pdf');
  const task = await db.task.create({ data: { assigneeId: employee.id, creatorId: owner.id, title: 'Personal task title', instructions: 'Personal instructions', report: 'Personal employee report', deadline: old,
    status: 'DONE', submittedAt: old, lateFlag: false, attachmentFileId: stored.id, createdAt: old, updatedAt: old } });
  const reviewed = await db.kpiReview.create({ data: { taskId: task.id, reviewerId: owner.id, factualEvidence: 'Private evidence', evaluation: 'Private employee evaluation', recommendation: 'No change', decision: 'NOTED', createdAt: old } });
  const completed = await execute(await approve(await request('EMPLOYEE', employee.id))); assert.equal(completed.status, 'COMPLETED');
  const erased = await db.user.findUniqueOrThrow({ where: { id: employee.id } }); assert.equal(erased.active, false); assert.equal(erased.passwordHash, 'ERASED'); assert.ok(erased.retentionErasedAt);
  const current = await db.task.findUniqueOrThrow({ where: { id: task.id } });
  for (const key of ['deadline', 'submittedAt', 'lateFlag', 'status', 'creatorId', 'assigneeId'] as const) assert.deepEqual(current[key], task[key]);
  assert.equal(current.report, ''); assert.equal((await db.kpiReview.findUniqueOrThrow({ where: { id: reviewed.id } })).evaluation, '[erased]');
  await assert.rejects(db.user.update({ where: { id: employee.id }, data: { active: true } }));
  await assert.rejects(db.task.create({ data: { assigneeId: employee.id, creatorId: owner.id, title: 'Restore employee work', deadline: old } }));
  const other = await db.user.create({ data: { name: 'Protected Employee', email: `protected-${suffix}@example.test`, passwordHash: hash, role: 'CORE_HANDLER', active: false, createdAt: old, updatedAt: old } });
  const unfinished = await db.task.create({ data: { assigneeId: other.id, creatorId: owner.id, title: 'Open work', deadline: old, createdAt: old, updatedAt: old } });
  assert.match((await preview('EMPLOYEE', other.id)).blockers.join(' '), /Finish/);
  await db.task.update({ where: { id: unfinished.id }, data: { status: 'DONE', updatedAt: old } });
  const review = await db.kpiReview.create({ data: { taskId: unfinished.id, reviewerId: owner.id, factualEvidence: 'Evidence', evaluation: 'Evaluation', recommendation: 'Review', decision: 'ACTION_RECOMMENDED', createdAt: old } });
  await db.hrActionRequest.create({ data: { reviewId: review.id, proposedById: owner.id, proposedAction: 'Human follow up', rationale: 'Private action context', createdAt: old } });
  assert.match((await preview('EMPLOYEE', other.id)).blockers.join(' '), /HR action/);
});

test('orphan files purge idempotently; active storage leases are respected and expired leases recover', async () => {
  const stored = await file(); const approved = await approve(await request('PRIVATE_FILE', stored.id));
  const storage = app.get(PrivateStorageService), original = storage.erase.bind(storage); storage.erase = async () => { throw new Error('Temporary storage failure'); };
  try { await execute(approved); } finally { storage.erase = original; }
  const job = await db.retentionFileJob.findFirstOrThrow({ where: { requestId: approved.id } });
  await db.retentionFileJob.update({ where: { id: job.id }, data: { status: 'RUNNING', leaseId: randomUUID(), leaseUntil: new Date(Date.now() + 60_000) } });
  const waiting = await success<RetentionRequest>(await call(`/retention/requests/${approved.id}/retry-files`, {})); assert.equal(waiting.status, 'FILES_PENDING');
  await db.retentionFileJob.update({ where: { id: job.id }, data: { leaseUntil: old } });
  const completed = await success<RetentionRequest>(await call(`/retention/requests/${approved.id}/retry-files`, {}, 'owner', secondBase)); assert.equal(completed.status, 'COMPLETED');
  assert.equal((await success<RetentionRequest>(await call(`/retention/requests/${approved.id}/retry-files`, {}))).status, 'COMPLETED');
});

test('revoked Owner access blocks service writes even with previously loaded user identity', async () => {
  const identity = safeUser(await db.user.findUniqueOrThrow({ where: { id: owner.id } }));
  await db.user.update({ where: { id: owner.id }, data: { active: false } });
  assert.equal((await call('/retention/policies')).status, 401);
  await assert.rejects(app.get(RetentionService).hold(identity, { scope: 'APPLICANT', subjectId: (await application()).id, reason: 'Revoked access attempt' }));
});
