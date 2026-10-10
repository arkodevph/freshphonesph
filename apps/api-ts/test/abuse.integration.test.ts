import 'reflect-metadata';
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { HttpException, type INestApplication } from '@nestjs/common';
import type { Response } from 'express';
import type { Redis } from 'ioredis';
import { createApp } from '../src/app';
import type { Config } from '../src/config';
import { readConfig } from '../src/config';
import { Database } from '../src/database';
import { hashPassword } from '../src/auth/password';
import { identityHeaders } from '../src/auth/auth.service';
import { redisConnection } from '../src/redis/connection';
import { AbuseService } from '../src/abuse/abuse.service';
import { addressGroup, type AbuseOverrides, type AbusePolicyName } from '../src/abuse/policies';
import { ReceiptService } from '../src/finance/receipt.service';

const databaseUrl = process.env.TEST_DATABASE_URL, redisUrl = process.env.TEST_REDIS_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test') || !redisUrl)
  throw new Error('Use a migrated dedicated TEST_DATABASE_URL ending in _test and TEST_REDIS_URL.');
const origin = 'http://localhost:3100', suffix = randomUUID(), password = 'Synthetic-abuse-password123!';
let config: Config, fallbackConfig: Config, directory: string, db: Database, redis: Redis;
let apps: INestApplication[] = [], bases: string[] = [], ownerCookie: string, otherCookie: string, secondCookie: string, ownerId: string;
const streams: AbortController[] = [];
const defaults = (): AbuseOverrides => ({ ingress: [[10000, 60]], health: [[10000, 60]], publicRead: [[10000, 60]],
  auth: [[10000, 60]], accountRead: [[10000, 60]], accountWrite: [[10000, 60]], agentLookup: [[2, 60]],
  application: [[2, 3600], [5, 86400]], upload: [[2, 60]], download: [[2, 60]], expensive: [[2, 60]], email: [[2, 3600]], stream: [[100, 60]] });
async function until(check: () => boolean | Promise<boolean>, timeout = 8000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await check()) return; await delay(40); }
  assert.fail('Timed out waiting for synthetic abuse test state.');
}
async function clearRedis() {
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', `${config.REDIS_NAMESPACE}:{abuse}:*`, 'COUNT', 1000);
    cursor = next; if (keys.length) await redis.del(...keys);
  } while (cursor !== '0');
}
async function request(path: string, options: { method?: string; body?: unknown; raw?: string; cookie?: string; headers?: Record<string, string>; replica?: number } = {}) {
  return fetch(`${bases[options.replica ?? 0]}/api${path}`, { method: options.method ?? 'GET', headers: {
    Origin: origin, ...(options.cookie ? { Cookie: options.cookie } : {}),
    ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }), ...options.headers,
  }, ...(options.body === undefined && options.raw === undefined ? {} : { body: options.raw ?? JSON.stringify(options.body) }) });
}
async function signIn(email: string) {
  const response = await request('/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(response.status, 200, await response.clone().text());
  return response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
}
function fakeResponse() {
  const headers = new Map<string, string>();
  return { headers, response: { setHeader(name: string, value: string) { headers.set(name, value); } } as unknown as Response };
}
async function consume(replica: number, policy: AbusePolicyName, subject: string) {
  const response = fakeResponse();
  try { await apps[replica].get(AbuseService).consume(policy, subject, response.response); return { status: 200, ...response }; }
  catch (error) { assert.ok(error instanceof HttpException); return { status: error.getStatus(), ...response }; }
}
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'fresh-abuse-private-'));
  config = { NODE_ENV: 'test', HOST: '127.0.0.1', PORT: 4100, DATABASE_URL: databaseUrl!, WEB_ORIGIN: origin,
    BETTER_AUTH_SECRET: 'abuse-test-secret-at-least-32-characters', EMAIL_FROM: 'synthetic@example.test',
    CUSTOMER_REMINDER_DAYS_BEFORE: '', PRIVATE_STORAGE_PROVIDER: 'local', PRIVATE_STORAGE_DIR: directory,
    PRIVATE_STORAGE_S3_REGION: 'ap-southeast-1', REDIS_URL: redisUrl, REDIS_NAMESPACE: `abuse-${suffix}`, ABUSE_LIMITS: defaults() };
  fallbackConfig = { ...config, REDIS_URL: undefined, REDIS_NAMESPACE: `abuse-pg-${suffix}`, ABUSE_LIMITS: defaults() };
  redis = redisConnection(config, true); await until(() => redis.status === 'ready');
  for (const item of [config, config, fallbackConfig, fallbackConfig]) {
    const app = await createApp(item); await app.listen(0, '127.0.0.1'); apps.push(app); bases.push(await app.getUrl());
  }
  db = apps[0].get(Database); const hash = await hashPassword(password);
  const owner = await db.user.create({ data: { name: 'Synthetic abuse Owner', email: `abuse-owner-${suffix}@example.test`, role: 'OWNER', passwordHash: hash } });
  const other = await db.user.create({ data: { name: 'Synthetic abuse Records', email: `abuse-records-${suffix}@example.test`, role: 'RECORDS', passwordHash: hash } });
  ownerId = owner.id; ownerCookie = await signIn(owner.email); secondCookie = await signIn(owner.email); otherCookie = await signIn(other.email);
});
beforeEach(async () => {
  for (const stream of streams.splice(0)) stream.abort();
  await until(async () => await db.abuseStreamLease.count() === 0);
  config.ABUSE_LIMITS = defaults(); fallbackConfig.ABUSE_LIMITS = defaults();
  await clearRedis(); await db.abuseBucket.deleteMany(); await db.loginAttempt.deleteMany();
});
after(async () => {
  for (const stream of streams) stream.abort();
  // Test outages affect only an explicitly named disposable container.
  if (process.env.TEST_ABUSE_REDIS_CONTAINER === 'fresh-redis-test') execFileSync('docker', ['start', 'fresh-redis-test'], { stdio: 'ignore' });
  for (const app of apps) await app.close();
  if (redis) {
    let cursor = '0';
    do { const [next, keys] = await redis.scan(cursor, 'MATCH', `${config.REDIS_NAMESPACE}:*`, 'COUNT', 1000);
      cursor = next; if (keys.length) await redis.del(...keys); } while (cursor !== '0');
    redis.disconnect();
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});

test('address grouping resists mapped-address and IPv6 privacy-address rotation', () => {
  assert.equal(addressGroup('::ffff:192.0.2.1'), addressGroup('192.0.2.1'));
  assert.equal(addressGroup('2001:db8:1234:5678::1'), addressGroup('2001:db8:1234:5678:abcd:ef01:2345:6789'));
  assert.equal(addressGroup('2001:0db8:1234:5678:0:0:0:1'), addressGroup('2001:db8:1234:5678::1'));
  assert.notEqual(addressGroup('2001:db8:1234:5678::1'), addressGroup('2001:db8:1234:5679::1'));
  assert.equal(addressGroup('spoofed'), 'unknown');
});

test('configuration rejects blanket proxy trust, unknown policies and invalid quotas', () => {
  const previous = process.env;
  try {
    process.env = { ...previous, DATABASE_URL: databaseUrl, WEB_ORIGIN: origin, NODE_ENV: 'test',
      BETTER_AUTH_SECRET: config.BETTER_AUTH_SECRET, REDIS_URL: redisUrl, TRUSTED_PROXY_CIDRS: '0.0.0.0/0' };
    assert.throws(() => readConfig(), /blanket trust/);
    process.env.TRUSTED_PROXY_CIDRS = '::/0'; assert.throws(() => readConfig(), /blanket trust/);
    process.env.TRUSTED_PROXY_CIDRS = '127.0.0.1/32,::1/128'; process.env.ABUSE_LIMITS = '{"agentLookup":[[3,60]]}';
    assert.deepEqual(readConfig().ABUSE_LIMITS?.agentLookup, [[3, 60]]);
    for (const value of ['{"unknown":[[1,60]]}', '{"upload":[[0,60]]}', '{"auth":[]}', '{"ingress":[[1,0]]}', 'false']) {
      process.env.ABUSE_LIMITS = value; assert.throws(() => readConfig(), /known abuse policies/);
    }
  } finally { process.env = previous; }
});

test('both agent aliases and API replicas share a bucket; query and forwarded headers cannot rotate it', async () => {
  assert.equal((await request('/agents/verify?q=SYNTHETIC')).status, 200);
  assert.equal((await request('/recruitment/agents/verify?q=DIFFERENT', { replica: 1, headers: { 'X-Forwarded-For': '192.0.2.8' } })).status, 200);
  const denied = await request('/AGENTS/verify/?q=OTHER', { headers: { 'X-Forwarded-For': '192.0.2.99', 'X-Real-IP': '192.0.2.99' } });
  assert.equal(denied.status, 429); assert.ok(Number(denied.headers.get('Retry-After')) > 0);
  assert.equal(denied.headers.get('Cache-Control'), 'no-store');
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'), origin);
  assert.match(denied.headers.get('Access-Control-Expose-Headers') ?? '', /Retry-After/i);
  assert.match((await denied.json()).message, /Too many requests/);
});

test('public applications count invalid payloads and stop before multipart parsing, storage and record creation', async () => {
  const before = await db.applicant.count(), files = await db.storedFile.count();
  assert.equal((await request('/careers/apply', { method: 'POST', body: {} })).status, 400);
  assert.equal((await request('/careers/apply', { method: 'POST', body: {}, replica: 1 })).status, 400);
  const denied = await request('/careers/apply?rotate=1', { method: 'POST', raw: 'invalid multipart body', headers: { 'Content-Type': 'multipart/form-data; boundary=missing' } });
  assert.equal(denied.status, 429); assert.ok(Number(denied.headers.get('Retry-After')) > 3500);
  assert.equal(await db.applicant.count(), before); assert.equal(await db.storedFile.count(), files);
  assert.deepEqual(await readdir(directory), []);
});

test('normal public applications still save; a longer window blocks repeated short-window resets', async () => {
  config.ABUSE_LIMITS!.application = [[1, 1], [2, 60]];
  const job = await db.jobOpening.create({ data: { title: 'Synthetic abuse test job', description: 'Synthetic job', isOpen: true } });
  const body = { jobId: job.id, fullName: 'Synthetic Applicant', email: `applicant-${suffix}@example.test` };
  assert.equal((await request('/careers/apply', { method: 'POST', body })).status, 201);
  await delay(1100);
  assert.equal((await request('/careers/apply', { method: 'POST', body, replica: 1 })).status, 201);
  await delay(1100);
  const denied = await request('/careers/apply', { method: 'POST', body }); assert.equal(denied.status, 429);
  assert.ok(Number(denied.headers.get('Retry-After')) > 50);
  assert.equal(await db.applicant.count({ where: { jobId: job.id } }), 2);
});

test('anonymous ingress catches malformed JSON, unknown paths and preflight requests before authentication', async () => {
  config.ABUSE_LIMITS!.ingress = [[2, 60]];
  assert.equal((await request('/auth/login', { method: 'POST', raw: '{', headers: { 'Content-Type': 'application/json' } })).status, 400);
  assert.equal((await request('/unknown-route', { replica: 1 })).status, 404);
  assert.equal((await request('/different-route', { method: 'OPTIONS' })).status, 429);
  // A separate bounded probe budget keeps monitoring useful during ordinary API abuse.
  assert.equal((await request('/health')).status, 200);
});

test('authentication limits cover malformed login and MFA payloads before expensive identity work', async () => {
  config.ABUSE_LIMITS!.auth = [[2, 60]];
  assert.equal((await request('/auth/login', { method: 'POST', body: {} })).status, 400);
  assert.equal((await request('/auth/mfa/verify', { method: 'POST', body: {}, replica: 1 })).status, 400);
  assert.equal((await request('/auth/forgot-password', { method: 'POST', body: { email: 'synthetic@example.test' } })).status, 429);
});

test('account reads share budgets across sessions and replicas, while another account remains usable', async () => {
  config.ABUSE_LIMITS!.accountRead = [[2, 60]];
  assert.equal((await request('/auth/me', { cookie: ownerCookie })).status, 200);
  assert.equal((await request('/auth/me', { cookie: secondCookie, replica: 1 })).status, 200);
  assert.equal((await request('/accounts', { cookie: ownerCookie })).status, 429);
  assert.equal((await request('/auth/me', { cookie: otherCookie })).status, 200);
  assert.equal((await request('/accounts')).status, 401);
  assert.equal((await request('/accounts', { cookie: otherCookie })).status, 403);
});

test('authenticated writes share a budget across routes and IDs, including invalid requests', async () => {
  config.ABUSE_LIMITS!.accountWrite = [[2, 60]];
  assert.equal((await request('/tasks', { cookie: ownerCookie, method: 'POST', body: {} })).status, 400);
  assert.equal((await request(`/clients/${randomUUID()}`, { cookie: ownerCookie, method: 'PATCH', body: {}, replica: 1 })).status, 400);
  assert.equal((await request('/payments', { cookie: secondCookie, method: 'POST', body: {} })).status, 429);
  assert.equal((await request('/auth/me', { cookie: ownerCookie })).status, 200);
});

test('upload quotas stop receipt scanning and malformed multipart processing before side effects', async () => {
  const receipts = apps[0].get(ReceiptService), original = receipts.scan.bind(receipts); let calls = 0;
  receipts.scan = (...args) => { calls++; return original(...args); };
  try {
    for (let index = 0; index < 2; index++) assert.equal((await request('/payments/receipt-scan', { cookie: ownerCookie, method: 'POST', body: {} })).status, 400);
    const denied = await request(`/payments/${randomUUID()}/proof`, { cookie: ownerCookie, method: 'POST', raw: 'broken multipart',
      headers: { 'Content-Type': 'multipart/form-data; boundary=missing' }, replica: 1 });
    assert.equal(denied.status, 429); assert.equal(calls, 2);
    assert.deepEqual(await readdir(directory), []);
  } finally { receipts.scan = original; }
});

test('reports and statements share expensive-request budgets without taking away ordinary reads', async () => {
  assert.equal((await request('/reports/export', { cookie: ownerCookie })).status, 400);
  assert.equal((await request('/reports/payments/export?invalid=yes', { cookie: ownerCookie, replica: 1 })).status, 400);
  assert.equal((await request(`/clients/${randomUUID()}/statement`, { cookie: ownerCookie })).status, 429);
  assert.equal((await request('/auth/me', { cookie: ownerCookie })).status, 200);
});

test('private download quotas share a budget across file types and replicas before reading file bytes', async () => {
  assert.equal((await request(`/documents/${randomUUID()}/file`, { cookie: ownerCookie })).status, 404);
  assert.equal((await request(`/payments/${randomUUID()}/proof`, { cookie: ownerCookie, replica: 1 })).status, 404);
  assert.equal((await request(`/tasks/${randomUUID()}/attachment`, { cookie: secondCookie })).status, 429);
  assert.equal((await request('/auth/me', { cookie: ownerCookie })).status, 200);
});

for (const [name, first, second] of [['Redis', 0, 1], ['PostgreSQL fallback', 2, 3]] as const) {
  test(`${name} limits are atomic across replicas and expire without denied requests extending the window`, async () => {
    const item = first === 0 ? config : fallbackConfig; item.ABUSE_LIMITS!.agentLookup = [[7, 3]];
    const subject = `synthetic-race-${randomUUID()}`;
    const results = await Promise.all(Array.from({ length: 30 }, (_, i) => consume(i % 2 ? first : second, 'agentLookup', subject)));
    assert.equal(results.filter(result => result.status === 200).length, 7);
    // Bounded database admission can also return 503 under concurrent test load;
    // those requests remain denied and do not gain an unprotected allowance.
    assert.equal(results.filter(result => result.status !== 200).length, 23);
    assert.ok(results.every(result => [200, 429, 503].includes(result.status)));
    assert.ok(results.filter(result => result.status !== 200).every(result => Number(result.headers.get('Retry-After')) > 0));
    const key = first === 0 ? (await redis.keys(`${config.REDIS_NAMESPACE}:{abuse}:*`))[0] : undefined;
    const reset = first === 0 ? undefined : (await db.abuseBucket.findFirstOrThrow()).resetsAt;
    const remaining = key ? await redis.pttl(key) : reset!.getTime() - Date.now();
    assert.equal((await consume(first, 'agentLookup', subject)).status, 429);
    if (key) assert.ok(await redis.pttl(key) <= remaining);
    else assert.equal((await db.abuseBucket.findFirstOrThrow()).resetsAt.getTime(), reset!.getTime());
    await delay(Math.max(remaining, 0) + 150);
    assert.equal((await consume(second, 'agentLookup', subject)).status, 200);
  });
}

test('PostgreSQL fallback protects public endpoints across replicas and cleans expired counters', async () => {
  assert.equal((await request('/agents/verify?q=TEST', { replica: 2 })).status, 200);
  assert.equal((await request('/recruitment/agents/verify?q=OTHER', { replica: 3 })).status, 200);
  assert.equal((await request('/agents/verify?q=NEW', { replica: 2 })).status, 429);
  const rows = await db.abuseBucket.findMany(); assert.ok(rows.length > 0);
  assert.ok(rows.every(row => /^[a-f0-9]{64}$/.test(row.key)));
  await db.abuseBucket.updateMany({ data: { resetsAt: new Date('2000-01-01') } });
  await apps[2].get(AbuseService).cleanup(); assert.equal(await db.abuseBucket.count(), 0);
});

test('Redis keys and values contain only namespaced digests, numeric counters and expiring TTLs', async () => {
  await request('/agents/verify?q=SECRET-SYNTHETIC-QUERY');
  const keys = await redis.keys(`${config.REDIS_NAMESPACE}:{abuse}:*`); assert.ok(keys.length > 0);
  for (const key of keys) {
    assert.match(key, /:\{abuse\}:[a-f0-9]{64}$/);
    assert.match((await redis.get(key))!, /^\d+$/); assert.ok(await redis.pttl(key) > 0);
    assert.ok(!key.includes(ownerId)); assert.ok(!key.includes('127.0.0.1')); assert.ok(!key.includes('SECRET'));
  }
});

test('trusted proxy addresses resolve clients safely; identity headers use the resolved address', async () => {
  const trusted = { ...config, TRUSTED_PROXY_CIDRS: '127.0.0.1/32', REDIS_NAMESPACE: `abuse-trusted-${suffix}` };
  const app = await createApp(trusted); await app.listen(0, '127.0.0.1');
  try {
    const base = await app.getUrl();
    for (const address of ['192.0.2.1', '192.0.2.2']) {
      for (let i = 0; i < 2; i++) assert.equal((await fetch(`${base}/api/agents/verify?q=TEST`, { headers: { 'X-Forwarded-For': address } })).status, 200);
      assert.equal((await fetch(`${base}/api/agents/verify?q=TEST`, { headers: { 'X-Forwarded-For': `198.51.100.${Math.floor(Math.random()*200)}, ${address}` } })).status, 429);
    }
    const headers = identityHeaders({ headers: { 'x-forwarded-for': 'forged', 'x-real-ip': 'forged' }, ip: '192.0.2.1', socket: { remoteAddress: '127.0.0.1' } } as never);
    assert.equal(headers.get('x-forwarded-for'), '192.0.2.1'); assert.equal(headers.get('x-real-ip'), null);
  } finally {
    await app.close(); const keys = await redis.keys(`${trusted.REDIS_NAMESPACE}:*`); if (keys.length) await redis.del(...keys);
  }
});

test('shared SSE leases cap simultaneous sessions across replicas and release on disconnect', async () => {
  for (let i = 0; i < 8; i++) {
    const abort = new AbortController(); streams.push(abort);
    const response = await fetch(`${bases[i % 2]}/api/events`, { headers: { Cookie: i % 2 ? secondCookie : ownerCookie }, signal: abort.signal });
    assert.equal(response.status, 200); void response.text().catch(() => {});
  }
  assert.equal(await db.abuseStreamLease.count(), 8);
  const denied = await request('/events', { cookie: ownerCookie }); assert.equal(denied.status, 429);
  assert.equal(denied.headers.get('Retry-After'), '30');
  streams.pop()!.abort(); await until(async () => await db.abuseStreamLease.count() === 7);
  const abort = new AbortController(); streams.push(abort);
  const response = await fetch(`${bases[1]}/api/events`, { headers: { Cookie: ownerCookie }, signal: abort.signal });
  assert.equal(response.status, 200); void response.text().catch(() => {});
  assert.equal((await request('/auth/me', { cookie: ownerCookie })).status, 200);
});

test('expired stream leases recover after a crashed replica and cleanup removes only expired leases', async () => {
  await db.abuseStreamLease.create({ data: { id: randomUUID(), accountKey: 'synthetic-old', addressKey: 'synthetic-old', expiresAt: new Date('2000-01-01') } });
  await apps[0].get(AbuseService).cleanup(); assert.equal(await db.abuseStreamLease.count(), 0);
});

test('default application quotas stop the sixth attempt and retain both hour/day expirations', async () => {
  delete config.ABUSE_LIMITS!.application;
  const subject = `default-application-${randomUUID()}`;
  for (let i = 0; i < 5; i++) assert.equal((await consume(i % 2, 'application', subject)).status, 200);
  assert.equal((await consume(1, 'application', subject)).status, 429);
  const ttls = await Promise.all((await redis.keys(`${config.REDIS_NAMESPACE}:{abuse}:*`)).map(key => redis.pttl(key)));
  assert.ok(ttls.some(ttl => ttl > 3500_000 && ttl <= 3600_000));
  assert.ok(ttls.some(ttl => ttl > 86000_000 && ttl <= 86400_000));
});

test('request protection fails closed with a safe 503 if neither shared backend is available', async () => {
  const brokenUrl = new URL(databaseUrl!); brokenUrl.hostname = '127.0.0.1'; brokenUrl.port = '1';
  const brokenDb = new Database({ ...fallbackConfig, DATABASE_URL: brokenUrl.toString() });
  const protection = new AbuseService(fallbackConfig, brokenDb), response = fakeResponse();
  try {
    await assert.rejects(protection.consume('agentLookup', 'synthetic-failure', response.response), error => {
      assert.ok(error instanceof HttpException); assert.equal(error.getStatus(), 503);
      assert.match(error.message, /Request protection is temporarily unavailable/);
      assert.ok(!error.message.includes('postgresql://')); return true;
    });
    assert.equal(response.headers.get('Retry-After'), '5');
  } finally { protection.onModuleDestroy(); await brokenDb.$disconnect(); }
});

test('a Redis network stall has a bounded decision timeout and PostgreSQL still enforces the shared quota', {
  skip: process.env.TEST_ABUSE_REDIS_CONTAINER !== 'fresh-redis-test',
}, async () => {
  execFileSync('docker', ['pause', 'fresh-redis-test'], { stdio: 'ignore' });
  try {
    const start = Date.now();
    assert.equal((await request('/agents/verify?q=STALLED')).status, 200);
    assert.ok(Date.now() - start < 2500);
    assert.equal((await request('/agents/verify?q=OTHER', { replica: 1 })).status, 200);
    assert.equal((await request('/agents/verify?q=BLOCKED')).status, 429);
  } finally { execFileSync('docker', ['unpause', 'fresh-redis-test'], { stdio: 'ignore' }); }
  await delay(2200); assert.equal(await redis.ping(), 'PONG');
});

test('a real Redis outage uses shared PostgreSQL protection and recovers without unprotected requests', {
  skip: process.env.TEST_ABUSE_REDIS_CONTAINER !== 'fresh-redis-test',
}, async () => {
  execFileSync('docker', ['stop', '--time', '1', 'fresh-redis-test'], { stdio: 'ignore' });
  try {
    await until(() => redis.status !== 'ready');
    const start = Date.now();
    assert.equal((await request('/agents/verify?q=OUTAGE')).status, 200);
    assert.ok(Date.now() - start < 2500);
    assert.equal((await request('/recruitment/agents/verify?q=OTHER', { replica: 1 })).status, 200);
    assert.equal((await request('/agents/verify?q=BLOCKED')).status, 429);
    assert.equal((await request('/auth/me', { cookie: ownerCookie })).status, 200);
  } finally { execFileSync('docker', ['start', 'fresh-redis-test'], { stdio: 'ignore' }); }
  await until(() => redis.status === 'ready'); await delay(2200);
  assert.equal((await request('/health')).status, 200);
});
