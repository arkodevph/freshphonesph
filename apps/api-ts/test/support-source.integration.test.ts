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
const password = 'Synthetic-support-source-password-123!';
let app: INestApplication, db: Database, base: string, clientId: string, otherId: string;
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
const post = (value: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(value) });

before(async () => {
  app = await createApp({ NODE_ENV: 'test', PORT: 4100, HOST: '127.0.0.1', DATABASE_URL: databaseUrl!, WEB_ORIGIN: origin,
    JWT_SECRET: 'support-source-test-secret-at-least-32-characters',
    EMAIL_FROM: 'synthetic@example.test', CUSTOMER_REMINDER_DAYS_BEFORE: '', PRIVATE_STORAGE_PROVIDER: 'local',
    PRIVATE_STORAGE_S3_REGION: 'ap-southeast-1' });
  await app.listen(0, '127.0.0.1'); base = await app.getUrl(); db = app.get(Database);
  await db.loginAttempt.deleteMany();
  const batch = await db.batch.create({ data: { code: `SUPSRC-${suffix}`, model: 'Synthetic phone',
    startDate: new Date('2050-01-01'), endDate: new Date('2050-12-31') } });
  const client = await db.client.create({ data: { name: `Synthetic Source Customer ${suffix}`, email: '', phone: '', batchId: batch.id } });
  const other = await db.client.create({ data: { name: `Another Source Customer ${suffix}`, email: '', phone: '', batchId: batch.id } });
  clientId = client.id; otherId = other.id;
  const passwordHash = await hashPassword(password);
  for (const role of ['OWNER', 'CS_TEAM', 'ANALYTICS', 'CUSTOMER'] as const) {
    const user = await db.user.create({ data: { name: `Synthetic ${role}`, role,
      email: `support-source-${role.toLowerCase()}-${suffix}@example.test`, passwordHash,
      ...(role === 'CUSTOMER' ? { clientId } : {}) } });
    accounts.set(role, user.email);
  }
});
after(async () => { if (app) await app.close(); });

test('customer origin is server-assigned; staff origin is explicit, immutable and filterable', async () => {
  const customer = await new Session().login('CUSTOMER');
  const staff = await new Session().login('CS_TEAM');
  const analyst = await new Session().login('ANALYTICS');
  const portalInput = { category: 'Delivery', description: 'When is my device expected?' };
  assert.equal((await customer.request('/portal/support', post({ ...portalInput, source: 'PHONE' }))).status, 400);
  assert.equal((await customer.request('/support/cases', post({ ...portalInput, clientId: otherId, source: 'PHONE' }))).status, 403);
  const portalResponse = await customer.request('/portal/support', post(portalInput));
  assert.equal(portalResponse.status, 201);
  const portal = await portalResponse.json();
  assert.equal(portal.source, 'customer_portal');
  assert.equal((await db.supportCase.findUniqueOrThrow({ where: { id: portal.id } })).source, 'CUSTOMER_PORTAL');

  const staffInput = { clientId, category: 'Payment question', description: 'Customer asked about payment timing.', source: 'PHONE' };
  assert.equal((await staff.request('/support/cases', post({ ...staffInput, source: 'CUSTOMER_PORTAL' }))).status, 400);
  assert.equal((await staff.request('/support/cases', post({ ...staffInput, source: 'UNRECORDED' }))).status, 400);
  assert.equal((await staff.request('/support/cases', post({ category: staffInput.category, description: staffInput.description, source: 'PHONE' }))).status, 400);
  assert.equal((await analyst.request('/support/cases', post(staffInput))).status, 403);
  const created = await staff.request('/support/cases', post(staffInput));
  assert.equal(created.status, 201);
  const logged = await created.json();
  assert.equal(logged.source, 'PHONE');
  assert.equal((await db.supportCase.findUniqueOrThrow({ where: { id: logged.id } })).source, 'PHONE');
  const audit = await db.auditEntry.findFirst({ where: { recordId: logged.id, action: 'support_case.created' } });
  assert.equal((audit?.after as { source?: string })?.source, 'PHONE');
  await assert.rejects(db.supportCase.update({ where: { id: logged.id }, data: { source: 'OTHER' } }), /Support case source cannot be changed/);

  const phone = await staff.request('/support/cases?source=PHONE');
  assert.equal(phone.status, 200);
  const phoneCases = await phone.json();
  assert.ok(phoneCases.results.some((item: { id: string }) => item.id === logged.id));
  assert.ok(phoneCases.results.every((item: { source: string }) => item.source === 'phone'));
  const portalCases = await (await staff.request('/support/cases?source=CUSTOMER_PORTAL')).json();
  assert.ok(portalCases.results.some((item: { id: string }) => item.id === portal.id));
  assert.ok(portalCases.results.every((item: { source: string }) => item.source === 'customer_portal'));
  assert.equal((await staff.request('/support/cases?source=INVALID')).status, 400);
  const detail = await (await staff.request(`/support/cases/${logged.id}`)).json();
  assert.equal(detail.source, 'phone');
  const mine = await (await customer.request('/portal/support')).json();
  assert.ok(mine.some((item: { id: string; source: string }) => item.id === logged.id && item.source === 'phone'));
  assert.equal((await analyst.request('/support/cases?source=PHONE')).status, 403);

  const lookup = await (await staff.request(`/support/client-options?q=${encodeURIComponent(suffix)}`)).json();
  assert.deepEqual(lookup.find((item: { id: string }) => item.id === clientId), { id: clientId, name: `Synthetic Source Customer ${suffix}`, batch_code: `SUPSRC-${suffix}` });
  assert.equal((await customer.request(`/support/client-options?q=${suffix}`)).status, 403);
  assert.equal((await staff.request('/support/client-options?q=x')).status, 400);

  const report = await (await analyst.request('/reports/support')).json();
  assert.ok(report.sources.some((item: { source: string; total: number }) => item.source === 'PHONE' && item.total >= 1));
  assert.ok(report.sources.some((item: { source: string; total: number }) => item.source === 'CUSTOMER_PORTAL' && item.total >= 1));
});
