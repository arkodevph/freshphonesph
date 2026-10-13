import 'reflect-metadata';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { roles, type CatalogInput, type CatalogItem, type Role } from '@freshphones/contracts';
import { createApp } from '../src/app';
import { Database } from '../src/database';
import { hashPassword } from '../src/auth/password';
import { safeUser } from '../src/auth/auth.service';
import { CatalogService } from '../src/catalog/catalog.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test')) throw new Error('Use a migrated dedicated TEST_DATABASE_URL ending in _test.');
const origin = 'http://localhost:3100', password = 'Catalog-test-password-123!';
const suffix = randomUUID().slice(0, 8);
const authorized: Role[] = ['OWNER', 'COO', 'GENERAL_MANAGER', 'RECORDS'];
let app: INestApplication, second: INestApplication, db: Database, base: string, otherBase: string, directory: string;
const cookies = new Map<Role, string>(); const users = new Map<Role, string>();
const input = (code = randomUUID().slice(0, 8)): CatalogInput => ({ code: `CAT-${suffix}-${code}`, name: `Catalog ${suffix} ${code}`,
  condition: 'PRE_OWNED', dailyAmount: '59.25', availability: 'CONTACT_US', description: 'Public model details.', published: false, sortOrder: 10, imageAsset: null, installmentPlan: null });
async function request(path: string, role?: Role, method = 'GET', body?: unknown, target = base) {
  return fetch(`${target}/api${path}`, { method, headers: { Origin: origin, ...(role ? { Cookie: cookies.get(role)! } : {}),
    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function create(record: CatalogInput = input()) {
  const response = await request('/catalog/items', 'OWNER', 'POST', record); assert.equal(response.status, 201);
  return await response.json() as CatalogItem;
}
async function update(item: CatalogItem, change: Partial<CatalogInput>, target = base) {
  const { code, name, condition, dailyAmount, availability, description, published, sortOrder, imageAsset, installmentPlan } = item;
  return request(`/catalog/items/${item.id}`, 'OWNER', 'PATCH', { version: item.version,
    record: { code, name, condition, dailyAmount, availability, description, published, sortOrder, imageAsset, installmentPlan, ...change } }, target);
}
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'fresh-catalog-test-'));
  const config = { NODE_ENV: 'test' as const, PORT: 4100, HOST: '127.0.0.1', DATABASE_URL: databaseUrl!, WEB_ORIGIN: origin,
    JWT_SECRET: 'catalog-test-only-secret-at-least-32-characters', EMAIL_FROM: 'synthetic@example.test',
    CUSTOMER_REMINDER_DAYS_BEFORE: '', PRIVATE_STORAGE_PROVIDER: 'local' as const, PRIVATE_STORAGE_DIR: directory, PRIVATE_STORAGE_S3_REGION: 'ap-southeast-1' };
  app = await createApp(config); second = await createApp(config);
  await app.listen(0, '127.0.0.1'); await second.listen(0, '127.0.0.1');
  base = await app.getUrl(); otherBase = await second.getUrl(); db = app.get(Database); await db.loginAttempt.deleteMany();
  const passwordHash = await hashPassword(password);
  const batch = await db.batch.create({ data: { code: `CAT-${suffix}`, model: 'Test model', startDate: new Date('2050-01-01'), endDate: new Date('2050-12-31') } });
  const client = await db.client.create({ data: { batchId: batch.id, name: 'Synthetic catalog customer', email: '', phone: '' } });
  for (const role of roles) {
    const user = await db.user.create({ data: { name: `Catalog ${role}`, email: `catalog-${suffix}-${role.toLowerCase()}@example.test`, passwordHash,
      role, ...(role === 'CUSTOMER' ? { clientId: client.id } : {}) } }); users.set(role, user.id);
    const response = await request('/auth/login', undefined, 'POST', { email: user.email, password }); assert.equal(response.status, 200);
    cookies.set(role, response.headers.getSetCookie().map(value => value.split(';')[0]).join('; '));
  }
});
after(async () => { if (app) await app.close(); if (second) await second.close(); if (directory) await rm(directory, { recursive: true, force: true }); });

test('anonymous and every role can see published catalog, while management routes enforce the approved role matrix', async () => {
  const row = await create();
  for (const role of [undefined, ...roles]) {
    assert.equal((await request('/catalog', role)).status, 200);
    const allowed = Boolean(role && authorized.includes(role)); const denied = role ? 403 : 401;
    for (const path of ['/catalog/items', `/catalog/items/${row.id}`]) assert.equal((await request(path, role)).status, allowed ? 200 : denied, `${role} ${path}`);
    assert.equal((await request('/catalog/items', role, 'POST', input())).status, allowed ? 201 : denied);
    assert.equal((await request(`/catalog/items/${row.id}`, role, 'PATCH', {})).status, allowed ? 400 : denied);
    assert.equal((await request(`/catalog/items/${row.id}/image`, role, 'POST', {})).status, allowed ? 400 : denied);
    assert.equal((await request(`/catalog/items/${row.id}/image/remove`, role, 'POST', {})).status, allowed ? 400 : denied);
    assert.equal((await request(`/catalog/items/${row.id}/image`, role)).status, allowed ? 404 : denied);
  }
});
test('publication, availability and prices change the public view without leaking internal metadata or financial effects', async () => {
  const financial = await db.payment.count(); const schedules = await db.scheduleItem.count();
  let row = await create(input('visible')); const query = `/catalog?q=${encodeURIComponent(row.name)}`;
  assert.equal((await (await request(query)).json()).total, 0);
  let response = await update(row, { published: true, availability: 'LIMITED', dailyAmount: '75.50' }); assert.equal(response.status, 200); row = await response.json();
  const publicRows = await (await request(query)).json(); assert.equal(publicRows.total, 1);
  assert.equal(publicRows.items[0].dailyAmount, '75.50'); assert.equal(publicRows.items[0].availability, 'LIMITED');
  assert.deepEqual(Object.keys(publicRows.items[0]).sort(), ['id', 'name', 'condition', 'dailyAmount', 'availability', 'description', 'imageAsset', 'hasImage', 'version', 'installmentPlan'].sort());
  response = await update(row, { dailyAmount: null, availability: 'SOLD_OUT' }); row = await response.json();
  assert.equal((await (await request(query)).json()).items[0].dailyAmount, null);
  response = await update(row, { published: false }); assert.equal(response.status, 200);
  assert.equal((await (await request(query)).json()).total, 0);
  for (const query of ['visibility=HIDDEN', 'visibility=PUBLISHED', 'page=1junk', 'page=0', 'availability=INVALID']) assert.equal((await request(`/catalog?${query}`)).status, 400);
  const audits = await db.auditEntry.findMany({ where: { entity: 'catalog', recordId: row.id } }); assert.equal(audits.length, 4);
  assert.ok(audits.every(audit => audit.actorId === users.get('OWNER')));
  assert.equal(await db.changeEvent.count({ where: { entity: 'catalog', recordId: row.id } }), 4);
  assert.equal(await db.payment.count(), financial); assert.equal(await db.scheduleItem.count(), schedules);
});
test('staff-maintained payment terms publish atomically, survive photo operations and never create financial records', async () => {
  const counts = async () => Promise.all([db.batch.count(), db.client.count(), db.scheduleItem.count(), db.payment.count(), db.paymentAdjustment.count()]);
  const before = await counts();
  let row = await create({ ...input('plan'), installmentPlan: { totalAmount: '100', installmentCount: 3, cadence: 'WEEKLY' } });
  assert.deepEqual(row.installmentPlan, { totalAmount: '100.00', installmentCount: 3, cadence: 'WEEKLY' });
  const query = `/catalog?q=${encodeURIComponent(row.name)}`;
  assert.equal((await (await request(query)).json()).total, 0);
  row = await (await update(row, { published: true })).json();
  assert.deepEqual((await (await request(query)).json()).items[0].installmentPlan, row.installmentPlan);
  const original = row;
  const responses = await Promise.all([
    update(row, { installmentPlan: { totalAmount: '123.45', installmentCount: 8, cadence: 'SEMIMONTHLY' } }),
    update(row, { installmentPlan: { totalAmount: '300', installmentCount: 7, cadence: 'MONTHLY' } }, otherBase),
  ]);
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  row = await (await request(`/catalog/items/${row.id}`, 'OWNER')).json();
  const audit = await db.auditEntry.findFirstOrThrow({ where: { entity: 'catalog', recordId: row.id }, orderBy: { createdAt: 'desc' } });
  assert.deepEqual((audit.before as any).installmentPlan, original.installmentPlan);
  assert.deepEqual((audit.after as any).installmentPlan, row.installmentPlan);
  const savedPlan = row.installmentPlan;
  row = await (await request(`/catalog/items/${row.id}/image/remove`, 'RECORDS', 'POST', { version: row.version })).json();
  assert.deepEqual(row.installmentPlan, savedPlan);
  const auditCount = await db.auditEntry.count({ where: { recordId: row.id, entity: 'catalog' } });
  assert.equal((await update(row, { installmentPlan: { totalAmount: '0.01', installmentCount: 2, cadence: 'WEEKLY' } })).status, 400);
  const { installmentPlan, ...withoutPlan } = input();
  assert.equal((await request(`/catalog/items/${row.id}`, 'OWNER', 'PATCH', { version: row.version, record: withoutPlan })).status, 400);
  assert.equal(await db.auditEntry.count({ where: { recordId: row.id, entity: 'catalog' } }), auditCount);
  row = await (await update(row, { installmentPlan: null })).json();
  assert.equal((await (await request(query)).json()).items[0].installmentPlan, null);
  assert.deepEqual(await counts(), before);
});
test('database constraints reject partial terms, invalid counts and totals smaller than the payment count', async () => {
  const row = await create();
  for (const data of [{ planTotalAmount: '100' }, { planInstallmentCount: 3 }, { planCadence: 'WEEKLY' as const },
    { planTotalAmount: '100', planInstallmentCount: 0, planCadence: 'WEEKLY' as const },
    { planTotalAmount: '100', planInstallmentCount: 601, planCadence: 'WEEKLY' as const },
    { planTotalAmount: '0.02', planInstallmentCount: 3, planCadence: 'WEEKLY' as const }])
    await assert.rejects(db.catalogItem.update({ where: { id: row.id }, data }));
  assert.equal((await db.catalogItem.findUniqueOrThrow({ where: { id: row.id } })).planTotalAmount, null);
});
test('search, availability, visibility and stable pagination cover the full backlog', async () => {
  const prefix = `Paging ${suffix}`;
  for (let i = 0; i < 23; i++) await create({ ...input(`page-${i}`), name: `${prefix} ${i}`, published: i !== 22, availability: i % 2 ? 'AVAILABLE' : 'SOLD_OUT' });
  const first = await (await request(`/catalog?q=${prefix}&page=1`)).json();
  const next = await (await request(`/catalog?q=${prefix}&page=2`)).json();
  assert.equal(first.total, 22); assert.equal(first.items.length, 20); assert.equal(next.items.length, 2);
  assert.equal(new Set([...first.items, ...next.items].map(row => row.id)).size, 22);
  const filter = await (await request(`/catalog?q=${prefix}&availability=AVAILABLE`)).json(); assert.equal(filter.total, 11);
  const hidden = await (await request(`/catalog/items?q=${prefix}&visibility=HIDDEN&availability=SOLD_OUT`, 'RECORDS')).json(); assert.equal(hidden.total, 1);
  const byCode = await (await request(`/catalog/items?q=CAT-${suffix}-page-22`, 'OWNER')).json(); assert.equal(byCode.total, 1);
});
test('competing saves across instances reject stale versions and duplicate codes without partial audit writes', async () => {
  const row = await create(); const responses = await Promise.all([update(row, { name: 'First saved name' }), update(row, { name: 'Second saved name' }, otherBase)]);
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  const latest = await (await request(`/catalog/items/${row.id}`, 'OWNER')).json(); assert.equal(latest.version, 2);
  assert.equal(await db.auditEntry.count({ where: { recordId: row.id, entity: 'catalog' } }), 2);
  assert.equal((await request('/catalog/items', 'OWNER', 'POST', { ...input(), code: row.code.toLowerCase() })).status, 409);
  assert.equal((await request('/catalog/items', 'OWNER', 'POST', { ...input(), dailyAmount: '-1' })).status, 400);
});
test('product photos are publish-gated and never serve unrelated private files; invalid uploads cannot change a listing', async () => {
  let row = await create();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4Z0AAAAASUVORK5CYII=', 'base64');
  async function upload(bytes: Uint8Array, type: string, version: number) {
    const form = new FormData(); form.set('version', String(version)); form.set('image', new Blob([new Uint8Array(bytes)], { type }), 'public.png');
    return fetch(`${base}/api/catalog/items/${row.id}/image`, { method: 'POST', headers: { Origin: origin, Cookie: cookies.get('RECORDS')! }, body: form });
  }
  assert.equal((await upload(Buffer.from('<svg/>'), 'image/svg+xml', row.version)).status, 400);
  assert.equal((await upload(Buffer.from('not a png'), 'image/png', row.version)).status, 400);
  let response = await upload(png, 'image/png', row.version); assert.equal(response.status, 201); row = await response.json();
  assert.equal(row.hasImage, true); assert.equal((await request(`/catalog/${row.id}/image`)).status, 404);
  response = await request(`/catalog/items/${row.id}/image`, 'OWNER'); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
  const stored = await db.catalogItem.findUniqueOrThrow({ where: { id: row.id } });
  assert.equal((await request(`/catalog/${stored.imageFileId}/image`)).status, 404);
  response = await update(row, { published: true }); row = await response.json();
  assert.equal((await request(`/catalog/${row.id}/image`)).status, 200);
  assert.equal((await upload(png, 'image/png', row.version - 1)).status, 409);
  response = await request(`/catalog/items/${row.id}/image/remove`, 'OWNER', 'POST', { version: row.version }); assert.equal(response.status, 201); row = await response.json();
  assert.equal(row.hasImage, false); assert.equal((await request(`/catalog/${row.id}/image`)).status, 404);
});
test('a revoked actor cannot bypass the API guard by calling catalog services with cached permissions', async () => {
  const person = await db.user.findUniqueOrThrow({ where: { id: users.get('RECORDS')! } }); const cached = safeUser(person);
  const row = await create(); await db.user.update({ where: { id: person.id }, data: { role: 'CS_TEAM' } });
  try {
    assert.equal((await request('/catalog/items', 'RECORDS')).status, 401);
    const service = app.get(CatalogService);
    await assert.rejects(service.directory(cached, { page: 1, q: '' }), /access has changed/);
    await assert.rejects(service.create(cached, input()), /access has changed/);
    await assert.rejects(service.update(cached, row.id, row.version, input()), /access has changed/);
    await assert.rejects(service.clearImage(cached, row.id, row.version), /access has changed/);
  } finally { await db.user.update({ where: { id: person.id }, data: { role: 'RECORDS' } }); }
});
