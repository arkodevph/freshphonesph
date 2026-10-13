import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { legalDocuments, type LegalDocumentKey } from '@freshphones/contracts';
import { createApp } from '../src/app';
import { Database } from '../src/database';
import { hashPassword } from '../src/auth/password';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error('Use a migrated dedicated TEST_DATABASE_URL ending in _test.');
const origin = 'http://localhost:3100';
const password = 'Synthetic-legal-password-123!';
const suffix = randomUUID().slice(0, 8);
const firstVersion = `test-v1-${suffix}`;
const secondVersion = `test-v2-${suffix}`;
const originals = Object.fromEntries(Object.entries(legalDocuments).map(([key, value]) => [key, value])) as typeof legalDocuments;
let app: INestApplication, second: INestApplication, db: Database, base: string, secondBase: string;
let owner: { id: string; email: string }, customer: { id: string; email: string }, jobId: string;
const cookies = new Map<string, string>();

function publish(key: LegalDocumentKey, version = firstVersion) {
  legalDocuments[key] = { ...originals[key], version, status: 'PUBLISHED',
    publishedAt: '2026-10-09T00:00:00.000Z', reviewItems: [] };
}
async function request(path: string, role?: 'owner' | 'customer', method = 'GET', body?: unknown, target = base) {
  return fetch(`${target}/api${path}`, { method,
    headers: { Origin: origin, ...(role ? { Cookie: cookies.get(role)! } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function acknowledge(role: 'owner' | 'customer', key: LegalDocumentKey, action: string, version = firstVersion, target = base) {
  return request('/legal/acknowledgments', role, 'POST', { key, version, action }, target);
}

before(async () => {
  const config = { NODE_ENV: 'test' as const, PORT: 4100, HOST: '127.0.0.1', DATABASE_URL: databaseUrl!, WEB_ORIGIN: origin,
    JWT_SECRET: 'legal-test-only-secret-at-least-32-characters',
    EMAIL_FROM: 'synthetic@example.test', CUSTOMER_REMINDER_DAYS_BEFORE: '', PRIVATE_STORAGE_PROVIDER: 'local' as const,
    PRIVATE_STORAGE_S3_REGION: 'ap-southeast-1' };
  app = await createApp(config); second = await createApp(config);
  await app.listen(0, '127.0.0.1'); await second.listen(0, '127.0.0.1');
  base = await app.getUrl(); secondBase = await second.getUrl(); db = app.get(Database);
  await db.loginAttempt.deleteMany();
  const hash = await hashPassword(password);
  const batch = await db.batch.create({ data: { code: `LEGAL-${suffix}`, model: 'Synthetic model',
    startDate: new Date('2050-01-01'), endDate: new Date('2050-12-31') } });
  const client = await db.client.create({ data: { name: 'Synthetic legal customer', email: '', phone: '', batchId: batch.id } });
  owner = await db.user.create({ data: { name: 'Synthetic legal owner', email: `legal-owner-${suffix}@example.test`,
    passwordHash: hash, role: 'OWNER' } });
  customer = await db.user.create({ data: { name: 'Synthetic legal customer', email: `legal-customer-${suffix}@example.test`,
    passwordHash: hash, role: 'CUSTOMER', clientId: client.id } });
  const job = await db.jobOpening.create({ data: { title: `Synthetic legal role ${suffix}`, description: 'Test role', isOpen: true } });
  jobId = job.id;
  for (const [role, person] of [['owner', owner], ['customer', customer]] as const) {
    const response = await request('/auth/login', undefined, 'POST', { email: person.email, password });
    assert.equal(response.status, 200);
    cookies.set(role, response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; '));
  }
});
after(async () => {
  for (const key of Object.keys(originals) as LegalDocumentKey[]) legalDocuments[key] = originals[key];
  if (app) await app.close(); if (second) await second.close();
});

test('drafts are public for review but cannot be acknowledged or treated as accepted', async () => {
  const document = await request('/legal/documents/CUSTOMER_PRIVACY');
  assert.equal(document.status, 200);
  assert.equal((await document.json()).status, 'DRAFT');
  const status = await request('/legal/status', 'customer');
  assert.deepEqual((await status.json()).pending, []);
  assert.equal((await acknowledge('customer', 'CUSTOMER_PRIVACY', 'ACKNOWLEDGED', 'draft-2026-10-09')).status, 400);
});

test('published versions gate the correct role, record one immutable decision, and reopen on a new version', async () => {
  publish('CUSTOMER_PRIVACY'); publish('PORTAL_TERMS'); publish('EMPLOYEE_PRIVACY');
  assert.equal((await request('/portal/support', 'customer')).status, 428);
  assert.equal((await request('/recruitment/jobs', 'owner')).status, 428);
  assert.equal((await request('/auth/me', 'customer')).status, 200);
  const customerStatus = await (await request('/legal/status', 'customer')).json();
  assert.deepEqual(customerStatus.pending.map((item: { key: string }) => item.key), ['CUSTOMER_PRIVACY', 'PORTAL_TERMS']);
  assert.equal((await acknowledge('customer', 'CUSTOMER_PRIVACY', 'ACCEPTED')).status, 400);
  assert.equal((await acknowledge('customer', 'EMPLOYEE_PRIVACY', 'ACKNOWLEDGED')).status, 403);
  const first = await Promise.all([
    acknowledge('customer', 'CUSTOMER_PRIVACY', 'ACKNOWLEDGED'),
    acknowledge('customer', 'CUSTOMER_PRIVACY', 'ACKNOWLEDGED', firstVersion, secondBase),
  ]);
  assert.deepEqual(first.map((response) => response.status), [201, 201]);
  assert.equal(await db.legalAcknowledgement.count({ where: { userId: customer.id } }), 1);
  assert.equal((await request('/portal/support', 'customer')).status, 428);
  assert.equal((await acknowledge('customer', 'PORTAL_TERMS', 'ACCEPTED')).status, 201);
  assert.equal((await request('/portal/support', 'customer')).status, 200);
  assert.equal((await acknowledge('owner', 'EMPLOYEE_PRIVACY', 'ACKNOWLEDGED')).status, 201);
  assert.equal((await request('/recruitment/jobs', 'owner')).status, 200);
  const stored = await db.legalDocumentVersion.findUniqueOrThrow({ where: { key_version: { key: 'CUSTOMER_PRIVACY', version: firstVersion } } });
  assert.equal(stored.contentHash.length, 64);
  assert.equal((stored.content as { title: string }).title, 'Customer Privacy Notice');
  assert.equal(await db.auditEntry.count({ where: { entity: 'legal_acknowledgement', recordId: { in: (await db.legalAcknowledgement.findMany({ where: { userId: customer.id }, select: { id: true } })).map((row) => row.id) } } }), 2);
  publish('CUSTOMER_PRIVACY', secondVersion);
  assert.equal((await request('/portal/support', 'customer')).status, 428);
  assert.equal((await acknowledge('customer', 'CUSTOMER_PRIVACY', 'ACKNOWLEDGED', firstVersion)).status, 400);
  assert.equal((await acknowledge('customer', 'CUSTOMER_PRIVACY', 'ACKNOWLEDGED', secondVersion)).status, 201);
  assert.equal((await request('/portal/support', 'customer')).status, 200);
  await assert.rejects(db.legalAcknowledgement.update({ where: {
    documentId_userId: { documentId: stored.id, userId: customer.id },
  }, data: { action: 'ACCEPTED' } }));
});

test('an active applicant notice requires an exact acknowledged version saved with the application', async () => {
  publish('APPLICANT_PRIVACY');
  const body = { jobId, fullName: 'Synthetic applicant', email: `applicant-${suffix}@example.test`, phone: '', message: '' };
  const initial = await db.applicant.count({ where: { jobId } });
  assert.equal((await request('/careers/apply', undefined, 'POST', body)).status, 400);
  assert.equal((await request('/careers/apply', undefined, 'POST', {
    ...body, privacyNoticeVersion: 'old-version', privacyNoticeAcknowledged: true,
  })).status, 400);
  assert.equal(await db.applicant.count({ where: { jobId } }), initial);
  const submitted = await request('/careers/apply', undefined, 'POST', {
    ...body, privacyNoticeVersion: firstVersion, privacyNoticeAcknowledged: true,
  });
  assert.equal(submitted.status, 201);
  const applicantId = (await submitted.json()).id as string;
  const record = await db.legalAcknowledgement.findFirst({ where: { applicantId }, include: { document: true } });
  assert.equal(record?.document.key, 'APPLICANT_PRIVACY');
  assert.equal(record?.document.version, firstVersion);
  assert.equal(record?.action, 'ACKNOWLEDGED');
});
