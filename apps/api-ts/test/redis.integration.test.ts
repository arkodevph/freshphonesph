import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { INestApplication, INestApplicationContext } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { createApp } from '../src/app';
import { createWorkerApp } from '../src/worker-app';
import { Database } from '../src/database';
import type { Config } from '../src/config';
import { hashPassword } from '../src/auth/password';
import { safeUser } from '../src/auth/auth.service';
import { RedisEventsService } from '../src/redis/redis-events.service';
import { redisConnection, streamKey } from '../src/redis/connection';
import { relayChanges } from '../src/redis/event-relay';
import { WorkQueueService } from '../src/jobs/work-queue.service';
import { BackgroundWorkerService } from '../src/jobs/background-worker.service';
import { RetentionService } from '../src/retention/retention.service';
import { PrivateStorageService } from '../src/storage/private-storage.service';
import { EmailDeliveryService } from '../src/portal/email-delivery.service';
import { queueTaskEmail } from '../src/staff/email-queue';
import { NotificationsService } from '../src/notifications/notifications.service';

const databaseUrl = process.env.TEST_DATABASE_URL, redisUrl = process.env.TEST_REDIS_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test') || !redisUrl)
  throw new Error('Use a migrated dedicated TEST_DATABASE_URL ending in _test and TEST_REDIS_URL.');
const origin = 'http://localhost:3100', password = 'Synthetic-Redis-password123!', suffix = randomUUID();
let config: Config, app: INestApplication, second: INestApplication, worker: INestApplicationContext | undefined;
let otherWorker: INestApplicationContext | undefined, db: Database, redis: Redis, base: string, secondBase: string, directory: string;
let owner: Awaited<ReturnType<Database['user']['create']>>, staff: typeof owner;
const mailIds = new Set<string>();
const streams: { stop: () => void }[] = [];
async function until(check: () => boolean | Promise<boolean>, timeout = 15_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await check()) return; await delay(50); }
  assert.fail('Timed out waiting for Redis integration state.');
}
async function login(person: typeof owner, target = base) {
  const response = await fetch(`${target}/api/auth/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: person.email, password }) });
  assert.equal(response.status, 200, await response.clone().text());
  return response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
}
async function sse(cookie: string, target = base) {
  const abort = new AbortController();
  const response = await fetch(`${target}/api/events`, { headers: { Cookie: cookie }, signal: abort.signal });
  assert.equal(response.status, 200);
  const reader = response.body!.getReader(), decoder = new TextDecoder();
  const stream = { text: '', ended: false, stop: () => abort.abort() };
  streams.push(stream);
  void (async () => {
    try { for (;;) { const row = await reader.read(); if (row.done) break; stream.text += decoder.decode(row.value); } }
    catch { /* Explicit test cancellation. */ } finally { stream.ended = true; }
  })();
  await until(() => stream.text.includes('event: ready'));
  return stream;
}
async function notification(userId = owner.id) {
  const row = await db.notification.create({ data: { userId, kind: 'support', title: 'Synthetic private notice', message: `Private content ${randomUUID()}` } });
  mailIds.add(row.id); return row;
}
async function deletion() {
  const storageKey = randomUUID(), bytes = Buffer.from('synthetic private bytes');
  await writeFile(join(directory, storageKey), bytes);
  const file = await db.storedFile.create({ data: { storageKey, originalName: 'private-test.txt', mimeType: 'text/plain', size: bytes.length,
    createdAt: new Date('2020-01-01') } });
  const retention = app.get(RetentionService), user = safeUser(owner);
  let policy = await db.retentionPolicy.findFirst({ where: { scope: 'PRIVATE_FILE', status: 'ACTIVE' } });
  if (!policy) {
    const draft = await retention.createPolicy(user, { scope: 'PRIVATE_FILE', days: 1, basis: 'Synthetic approved test expiry rule',
      backupInstructions: 'Synthetic backup disposition', externalCopyInstructions: 'Synthetic external copy disposition' });
    await retention.activatePolicy(user, draft.id, 'Synthetic Owner review');
  }
  const preview = await retention.preview(user, { scope: 'PRIVATE_FILE', subjectId: file.id }); assert.deepEqual(preview.blockers, []);
  const request = await retention.request(user, { scope: 'PRIVATE_FILE', subjectId: file.id, previewHash: preview.previewHash, reason: 'Synthetic approved deletion' });
  const approved = await retention.decide(user, request.id, { version: request.version, approved: true, reason: 'Synthetic Owner approval' });
  const executed = await retention.execute(user, request.id, { version: approved.version, confirmation: file.id });
  assert.equal(executed.status, 'FILES_PENDING');
  return { file, request: executed, jobId: executed.files[0].id };
}
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'fresh-redis-private-'));
  config = { NODE_ENV: 'test', PORT: 4100, HOST: '127.0.0.1', DATABASE_URL: databaseUrl!, WEB_ORIGIN: origin,
    BETTER_AUTH_SECRET: 'redis-test-secret-at-least-32-characters', EMAIL_FROM: 'synthetic@example.test',
    CUSTOMER_REMINDER_DAYS_BEFORE: '', PRIVATE_STORAGE_PROVIDER: 'local', PRIVATE_STORAGE_DIR: directory,
    PRIVATE_STORAGE_S3_REGION: 'ap-southeast-1', REDIS_URL: redisUrl, REDIS_NAMESPACE: `redis-test-${suffix}` };
  redis = redisConnection(config, true); await until(() => redis.status === 'ready');
  app = await createApp(config); second = await createApp(config);
  await app.listen(0, '127.0.0.1'); await second.listen(0, '127.0.0.1');
  base = await app.getUrl(); secondBase = await second.getUrl(); db = app.get(Database);
  const hash = await hashPassword(password);
  owner = await db.user.create({ data: { name: 'Synthetic Redis Owner', email: `redis-owner-${suffix}@example.test`, passwordHash: hash, role: 'OWNER' } });
  staff = await db.user.create({ data: { name: 'Synthetic Redis Staff', email: `redis-staff-${suffix}@example.test`, passwordHash: hash, role: 'RECORDS' } });
  await delay(400);
});
after(async () => {
  for (const stream of streams) stream.stop();
  if (otherWorker) await otherWorker.close(); if (worker) await worker.close();
  if (app) await app.close(); if (second) await second.close();
  if (redis) {
    let cursor = '0';
    do { const result = await redis.scan(cursor, 'MATCH', `${config.REDIS_NAMESPACE}:*`, 'COUNT', 1000); cursor = result[0]; if (result[1].length) await redis.del(...result[1]); } while (cursor !== '0');
    redis.disconnect();
  }
  for (const id of mailIds) await rm(join(process.cwd(), '.local/mail', `${id}.txt`), { force: true });
  if (directory) await rm(directory, { recursive: true, force: true });
});

test('only committed events publish, including lower sequence IDs that commit later', async () => {
  await db.changeEvent.updateMany({ data: { publishedAt: new Date() } });
  let release!: () => void, created!: () => void, earlyId = 0n;
  const gate = new Promise<void>(resolve => { release = resolve; }), ready = new Promise<void>(resolve => { created = resolve; });
  const transaction = db.$transaction(async tx => { earlyId = (await tx.changeEvent.create({ data: { entity: 'account', recordId: owner.id } })).id; created(); await gate; }, { timeout: 20_000 });
  await ready;
  const late = await db.changeEvent.create({ data: { entity: 'account', recordId: staff.id } });
  assert.ok(late.id > earlyId);
  try {
    await relayChanges(db, redis, config);
    const fields = (await redis.xrange(streamKey(config), '-', '+')).map(([, data]) => data[1]);
    assert.ok(fields.includes(String(late.id))); assert.ok(!fields.includes(String(earlyId)));
  } finally { release(); await transaction; }
  await relayChanges(db, redis, config);
  assert.ok((await redis.xrange(streamKey(config), '-', '+')).some(([, fields]) => fields[1] === String(earlyId)));
  const count = await db.changeEvent.count();
  await assert.rejects(db.$transaction(async tx => { await tx.changeEvent.create({ data: { entity: 'account', recordId: owner.id } }); throw new Error('Synthetic rollback'); }));
  assert.equal(await db.changeEvent.count(), count);
});

test('two API replicas broadcast minimal hints and enforce recipient privacy and live session revocation', async () => {
  const cookie = await login(owner), a = await sse(cookie), b = await sse(cookie, secondBase), hidden = await sse(await login(staff));
  const notice = await notification();
  await db.changeEvent.create({ data: { entity: 'notification', recordId: notice.id } }); await relayChanges(db, redis, config);
  await until(() => a.text.includes(notice.id) && b.text.includes(notice.id)); await delay(150);
  assert.ok(!hidden.text.includes(notice.id)); assert.ok(!a.text.includes(notice.message)); assert.ok(!a.text.includes(owner.email));
  await db.authSession.deleteMany({ where: { userId: owner.id } });
  await until(() => a.ended && b.ended); hidden.stop();
});

test('Redis carries event IDs only and never forwards fabricated record payloads', async () => {
  const stream = await sse(await login(owner)), fake = randomUUID();
  await redis.xadd(streamKey(config), '*', 'entity', 'notification', 'recordId', fake, 'message', 'private-injected-text');
  await delay(400); assert.ok(!stream.text.includes(fake)); assert.ok(!stream.text.includes('private-injected-text'));
  const events = await redis.xrange(streamKey(config), '-', '+');
  assert.ok(events.filter(([, fields]) => fields[0] === 'eventId').every(([, fields]) => fields.length === 2));
  stream.stop();
});

test('stream replacement while connected requests a fresh authorized snapshot', async () => {
  const stream = await sse(await login(owner));
  await db.changeEvent.create({ data: { entity: 'account', recordId: owner.id } });
  await relayChanges(db, redis, config); await until(() => stream.text.includes(owner.id));
  await delay(100);
  const before = stream.text.split('event: ready').length;
  await redis.del(streamKey(config));
  await db.changeEvent.create({ data: { entity: 'account', recordId: staff.id } });
  await relayChanges(db, redis, config);
  await until(() => stream.text.split('event: ready').length > before, 10_000);
  stream.stop();
});

test('API instances leave durable email jobs for the separate worker', async () => {
  await app.get(EmailDeliveryService).refreshReminders();
  assert.ok((await app.get(WorkQueueService).control!.getJobs(['waiting'])).some(job => job.name === 'reminders'));
  const row = await notification(); await delay(500);
  assert.equal((await db.notification.findUniqueOrThrow({ where: { id: row.id } })).emailStatus, 'PENDING');
  await assert.rejects(readFile(join(process.cwd(), '.local/mail', `${row.id}.txt`)));
  const response = await fetch(`${base}/api/operations`, { headers: { Cookie: await login(staff) } }); assert.equal(response.status, 403);
  assert.equal((await fetch(`${base}/api/health/redis`)).status, 503);
});

test('customer retries freeze the provider payload and stale leases cannot overwrite a replacement', async () => {
  const row = await notification(), emails = app.get(EmailDeliveryService);
  const sender = emails as unknown as { sendRendered: (...args: unknown[]) => Promise<void> };
  const original = sender.sendRendered.bind(emails), payloads: unknown[][] = [];
  sender.sendRendered = async (...args) => { payloads.push(args.slice(0, 5)); throw new Error('Synthetic provider failure'); };
  try {
    await emails.deliver(row.id, false);
    const first = await db.notification.findUniqueOrThrow({ where: { id: row.id } }); assert.equal(first.emailStatus, 'PENDING');
    await db.customerEmailTemplate.upsert({ where: { kind: 'support' }, update: { subject: 'Changed template', body: 'Changed body' },
      create: { kind: 'support', subject: 'Changed template', body: 'Changed body' } });
    await db.notification.update({ where: { id: row.id }, data: { emailNextAt: new Date(0) } });
    await emails.deliver(row.id, false);
    assert.deepEqual(payloads[0], payloads[1]);
    let started!: () => void, release!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
    sender.sendRendered = async () => { started(); await gate; throw new Error('Synthetic expired lease'); };
    await db.notification.update({ where: { id: row.id }, data: { emailNextAt: new Date(0) } });
    const stale = emails.deliver(row.id, false); await ready;
    sender.sendRendered = original;
    await db.notification.update({ where: { id: row.id }, data: { emailNextAt: new Date(0) } });
    await second.get(EmailDeliveryService).deliver(row.id, false);
    release(); await stale;
    const last = await db.notification.findUniqueOrThrow({ where: { id: row.id } });
    assert.equal(last.emailStatus, 'SENT'); assert.equal(last.emailAttemptId, null);
  } finally { sender.sendRendered = original; await db.customerEmailTemplate.deleteMany({ where: { kind: 'support' } }); }
});

test('Redis workers recover pending jobs, deduplicate delivery, and process already authorized file removal', async () => {
  const row = await notification(), removal = await deletion();
  const ownerStream = await sse(await login(owner)), unrelatedStream = await sse(await login(staff));
  worker = await createWorkerApp(config); otherWorker = await createWorkerApp(config);
  await until(async () => (await db.notification.findUniqueOrThrow({ where: { id: row.id } })).emailStatus === 'SENT', 25_000);
  const queues = app.get(WorkQueueService);
  await Promise.all([queues.enqueue('customer-email', row.id, 'duplicate-a'), queues.enqueue('customer-email', row.id, 'duplicate-b')]);
  await delay(400);
  assert.equal((await db.notification.findUniqueOrThrow({ where: { id: row.id } })).emailAttempts, 1);
  assert.match(await readFile(join(process.cwd(), '.local/mail', `${row.id}.txt`), 'utf8'), /Synthetic private notice/);
  await until(async () => (await db.retentionRequest.findUniqueOrThrow({ where: { id: removal.request.id } })).status === 'COMPLETED');
  assert.equal(await db.storedFile.count({ where: { id: removal.file.id } }), 0);
  await assert.rejects(readFile(join(directory, removal.file.storageKey)));
  assert.equal(await db.auditEntry.count({ where: { recordId: removal.request.id, action: 'retention.worker_file_attempt' } }), 1);
  await until(() => ownerStream.text.includes(removal.request.id));
  assert.ok(!unrelatedStream.text.includes(removal.request.id));
  ownerStream.stop(); unrelatedStream.stop();
  await until(async () => (await fetch(`${base}/api/health/redis`)).status === 200);
  for (const job of await queues.deliveries!.getJobs(['completed', 'waiting', 'active', 'delayed', 'failed']))
    assert.deepEqual(Object.keys(job.data), ['id']);
});

test('recipient deactivation skips queued emails; erased outbox IDs remain harmless', async () => {
  const hash = await hashPassword(password), person = await db.user.create({ data: { name: 'Synthetic disabled', email: `disabled-${suffix}@example.test`, passwordHash: hash, role: 'RECORDS', active: false } });
  const row = await notification(person.id), vanished = await notification();
  await db.notification.delete({ where: { id: vanished.id } });
  await app.get(WorkQueueService).enqueue('customer-email', vanished.id, 'erased');
  await worker!.get(BackgroundWorkerService).reconcile();
  await until(async () => (await db.notification.findUniqueOrThrow({ where: { id: row.id } })).emailStatus === 'SKIPPED');
  await assert.rejects(readFile(join(process.cwd(), '.local/mail', `${row.id}.txt`)));
  await assert.rejects(readFile(join(process.cwd(), '.local/mail', `${vanished.id}.txt`)));
});

test('staff task reminders use current eligibility and durable provider payloads', async () => {
  const task = await db.task.create({ data: { title: 'Synthetic worker task', instructions: '', assigneeId: staff.id, creatorId: owner.id,
    deadline: new Date(Date.now() + 10 * 86_400_000) } });
  await db.$transaction(tx => queueTaskEmail(tx, task, 'TASK_ASSIGNED'));
  const email = await db.staffEmail.findFirstOrThrow({ where: { taskId: task.id } }); mailIds.add(email.id);
  await worker!.get(BackgroundWorkerService).reconcile();
  await until(async () => (await db.staffEmail.findUniqueOrThrow({ where: { id: email.id } })).status === 'SENT');
  assert.equal((await db.staffEmail.findUniqueOrThrow({ where: { id: email.id } })).attempts, 1);
});

test('operations emails recheck record ownership before delivery', async () => {
  const task = await db.task.create({ data: { title: 'Synthetic operations task', creatorId: owner.id, assigneeId: staff.id,
    deadline: new Date(Date.now() + 10 * 86_400_000) } });
  const operations = app.get(NotificationsService);
  const notice = await db.$transaction(tx => operations.enqueue(tx, { recipientId: staff.id, eventKey: 'task.assigned',
    dedupeKey: `task:${task.id}:assigned`, variables: { title: task.title, deadline: task.deadline.toISOString() }, link: '/system/tasks' }));
  mailIds.add(notice.id);
  const delivery = await db.notificationDelivery.findUniqueOrThrow({ where: { notificationId: notice.id } });
  await worker!.get(BackgroundWorkerService).reconcile();
  await until(async () => (await db.notificationDelivery.findUniqueOrThrow({ where: { id: delivery.id } })).status === 'SENT');
  const stale = await db.$transaction(tx => operations.enqueue(tx, { recipientId: staff.id, eventKey: 'task.assigned',
    dedupeKey: `task:${task.id}:reassigned`, variables: { title: task.title, deadline: task.deadline.toISOString() }, link: '/system/tasks' }));
  mailIds.add(stale.id);
  await db.task.update({ where: { id: task.id }, data: { assigneeId: owner.id } });
  const blocked = await db.notificationDelivery.findUniqueOrThrow({ where: { notificationId: stale.id } });
  await worker!.get(BackgroundWorkerService).reconcile();
  await until(async () => (await db.notificationDelivery.findUniqueOrThrow({ where: { id: blocked.id } })).attempts === 5);
  await assert.rejects(readFile(join(process.cwd(), '.local/mail', `${stale.id}.txt`)));
});

test('worker shutdown and restart recover database jobs while the API stays online', async () => {
  await otherWorker!.close(); otherWorker = undefined; await worker!.close(); worker = undefined;
  const row = await notification(); await delay(300);
  assert.equal((await db.notification.findUniqueOrThrow({ where: { id: row.id } })).emailStatus, 'PENDING');
  worker = await createWorkerApp(config);
  await until(async () => (await db.notification.findUniqueOrThrow({ where: { id: row.id } })).emailStatus === 'SENT', 25_000);
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
});

test('BullMQ retries infrastructure failures without losing the durable delivery', async () => {
  const emails = worker!.get(EmailDeliveryService), original = emails.deliver.bind(emails), row = await notification();
  let failures = 0;
  emails.deliver = async (id, staff) => { if (id === row.id && failures++ < 1) throw new Error('synthetic-secret-provider-data'); await original(id, staff); };
  try {
    await app.get(WorkQueueService).enqueue('customer-email', row.id, 'retry');
    await until(async () => (await db.notification.findUniqueOrThrow({ where: { id: row.id } })).emailStatus === 'SENT');
    assert.ok(failures >= 2); assert.equal((await db.notification.findUniqueOrThrow({ where: { id: row.id } })).emailAttempts, 1);
    const saved = (await app.get(WorkQueueService).deliveries!.getJobs(['completed'])).find(job => job.data.id === row.id)!;
    assert.ok(saved); assert.ok(!JSON.stringify(saved.stacktrace).includes('synthetic-secret-provider-data'));
  } finally { emails.deliver = original; }
});

test('file worker retries are bounded and require execution evidence', async () => {
  await worker!.close(); worker = undefined;
  const removal = await deletion(), retention = app.get(RetentionService), storage = app.get(PrivateStorageService), original = storage.erase.bind(storage);
  const evidence = await db.auditEntry.findFirstOrThrow({ where: { recordId: removal.request.id, action: 'retention.records_erased' } });
  await db.auditEntry.delete({ where: { id: evidence.id } });
  await retention.processFileJob(removal.jobId);
  assert.equal((await db.retentionFileJob.findUniqueOrThrow({ where: { id: removal.jobId } })).attempts, 0);
  await db.auditEntry.create({ data: { actorId: owner.id, entity: 'retention', recordId: removal.request.id, action: 'retention.records_erased' } });
  storage.erase = async () => { throw new Error('Synthetic secret-bearing provider failure'); };
  try {
    for (let i = 0; i < 6; i++) {
      await db.retentionFileJob.update({ where: { id: removal.jobId }, data: { nextAt: new Date(0) } });
      await retention.processFileJob(removal.jobId);
    }
    const job = await db.retentionFileJob.findUniqueOrThrow({ where: { id: removal.jobId } });
    assert.equal(job.attempts, 5); assert.equal(job.status, 'FAILED'); assert.ok(!job.error?.includes('secret-bearing'));
    assert.ok(await db.storedFile.findUnique({ where: { id: removal.file.id } }));
    await retention.purge(safeUser(owner), removal.request.id);
    assert.equal((await db.retentionFileJob.findUniqueOrThrow({ where: { id: removal.jobId } })).attempts, 0);
  } finally { storage.erase = original; }
  await retention.processFileJob(removal.jobId);
  assert.equal((await db.retentionRequest.findUniqueOrThrow({ where: { id: removal.request.id } })).status, 'COMPLETED');
  worker = await createWorkerApp(config);
});

test('Redis interruption preserves database writes and reconnects with a fresh snapshot', {
  skip: process.env.TEST_REDIS_RESTART_CONTAINER !== 'fresh-redis-test',
}, async () => {
  assert.equal(new URL(redisUrl!).port, '6381');
  const stream = await sse(await login(owner));
  const before = stream.text.split('event: ready').length;
  let eventId = 0n;
  execFileSync('docker', ['stop', '-t', '1', 'fresh-redis-test'], { stdio: 'ignore' });
  try {
    eventId = (await db.changeEvent.create({ data: { entity: 'account', recordId: owner.id } })).id;
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
    await assert.rejects(relayChanges(db, app.get(WorkQueueService).connection!, config));
    assert.equal((await db.changeEvent.findUniqueOrThrow({ where: { id: eventId } })).publishedAt, null);
  } finally { execFileSync('docker', ['start', 'fresh-redis-test'], { stdio: 'ignore' }); }
  await until(() => redis.status === 'ready', 25_000);
  await until(async () => Boolean((await db.changeEvent.findUniqueOrThrow({ where: { id: eventId } })).publishedAt), 25_000);
  await until(() => stream.text.split('event: ready').length > before);
  stream.stop();
});
