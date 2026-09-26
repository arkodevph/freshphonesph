import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { roles, rolePermissions, type Role } from '@freshphones/contracts';
import { createApp } from '../src/app';
import { Database } from '../src/database';
import { AuthService } from '../src/auth/auth.service';
import { EmailDeliveryService } from '../src/portal/email-delivery.service';
import { hashPassword, tokenHash } from '../src/auth/password';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error(
    'TEST_DATABASE_URL must point to a dedicated database ending in _test. Apply migrations to it first.',
  );
const origin = 'http://localhost:3100';
const password = 'Integration-password-123!';
let app: INestApplication;
let db: Database;
let base: string;
let second: INestApplication;
let secondBase: string;
const emails = new Map<Role, string>();
const accounts = new Map<Role, string>();
let firstClient: string;
let secondClient: string;
let batchId: string;
const suffix = randomUUID().slice(0, 8);

class Session {
  cookies = new Map<string, string>();
  async request(path: string, options: RequestInit = {}, apiBase = base) {
    const response = await fetch(`${apiBase}/api${path}`, {
      ...options,
      headers: {
        Origin: origin,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Cookie: this.cookie(),
        ...options.headers,
      },
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [key, ...value] = cookie.split(';')[0].split('=');
      this.cookies.set(key, value.join('='));
    }
    return response;
  }
  cookie() {
    return [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; ');
  }
  async login(role: Role) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emails.get(role), password }),
    });
    assert.equal(response.status, 200);
    return this;
  }
  async upload(path: string, body: FormData, apiBase = base) {
    return fetch(`${apiBase}/api${path}`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: this.cookie() },
      body,
    });
  }
}
const post = (value: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(value) });
const patch = (value: unknown): RequestInit => ({ method: 'PATCH', body: JSON.stringify(value) });
async function stream(session: Session, apiBase = base) {
  const controller = new AbortController();
  const response = await session.request('/events', { signal: controller.signal }, apiBase);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/);
  const reader = response.body!.getReader();
  let text = '';
  let ended = false;
  const running = (async () => {
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        text += new TextDecoder().decode(chunk.value);
      }
    } catch {
      /* Abort is expected on cleanup. */
    } finally {
      ended = true;
    }
  })();
  const wait = async (predicate: () => boolean, timeout = 4500) => {
    const deadline = Date.now() + timeout;
    while (!predicate() && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 30));
    assert.ok(predicate(), `Stream condition did not arrive. Received ${text}`);
  };
  await wait(() => text.includes('event: ready'));
  return {
    controller,
    get text() {
      return text;
    },
    get ended() {
      return ended;
    },
    wait,
    close: async () => {
      controller.abort();
      await running;
    },
  };
}

before(async () => {
  app = await createApp({
    NODE_ENV: 'test',
    PORT: 4100,
    HOST: '127.0.0.1',
    DATABASE_URL: databaseUrl,
    WEB_ORIGIN: origin,
    JWT_SECRET: 'integration-only-secret-at-least-32-characters',
    EMAIL_FROM: 'test@example.test',
    CUSTOMER_REMINDER_DAYS_BEFORE: '',
    PRIVATE_STORAGE_PROVIDER: 'local',
    PRIVATE_STORAGE_S3_REGION: 'ap-southeast-1',
  });
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  db = app.get(Database);
  await db.loginAttempt.deleteMany({
    where: {
      key: {
        in: ['login-ip:127.0.0.1', 'reset-ip:127.0.0.1', 'reset-use:127.0.0.1'].map(tokenHash),
      },
    },
  });
  const batch = await db.batch.create({
    data: {
      code: `TEST-${suffix}`,
      contractPrice: '100.00',
      installmentCount: 3,
      cadence: 'MONTHLY',
      model: 'Test phone',
      status: 'ACTIVE',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-03-01'),
    },
  });
  batchId = batch.id;
  const c1 = await db.client.create({
    data: {
      name: 'First customer',
      email: `${suffix}-one@example.test`,
      phone: '+63 900 000 0001',
      batchId,
    },
  });
  firstClient = c1.id;
  const otherBatch = await db.batch.create({
    data: {
      code: `OTHER-${suffix}`,
      model: 'Other phone',
      status: 'ACTIVE',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-03-01'),
    },
  });
  const c2 = await db.client.create({
    data: {
      name: 'Second customer',
      email: `${suffix}-two@example.test`,
      phone: '+63 900 000 0002',
      batchId: otherBatch.id,
    },
  });
  secondClient = c2.id;
  const passwordHash = await hashPassword(password);
  for (const role of roles) {
    const email = `${suffix}-${role.toLowerCase()}@example.test`;
    emails.set(role, email);
    const user = await db.user.create({
      data: {
        name: `Test ${role}`,
        email,
        passwordHash,
        role,
        ...(role === 'CUSTOMER' ? { clientId: firstClient } : {}),
      },
    });
    accounts.set(role, user.id);
  }
  second = await createApp({
    NODE_ENV: 'test',
    PORT: 4100,
    HOST: '127.0.0.1',
    DATABASE_URL: databaseUrl,
    WEB_ORIGIN: origin,
    JWT_SECRET: 'integration-only-secret-at-least-32-characters',
    EMAIL_FROM: 'test@example.test',
    CUSTOMER_REMINDER_DAYS_BEFORE: '',
    PRIVATE_STORAGE_PROVIDER: 'local',
    PRIVATE_STORAGE_S3_REGION: 'ap-southeast-1',
  });
  await second.listen(0, '127.0.0.1');
  secondBase = await second.getUrl();
});
after(async () => {
  await second?.close();
  await app?.close();
});

test('database health and anonymous API denial', async () => {
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  assert.equal((await fetch(`${base}/api/batches`)).status, 401);
  assert.equal((await fetch(`${base}/api/events`)).status, 401);
});

test('authentication rate limits are shared between API instances', async () => {
  const key = `integration-rate-limit:${suffix}`;
  await app.get(AuthService).limit(key, 2);
  await second.get(AuthService).limit(key, 2);
  await assert.rejects(app.get(AuthService).limit(key, 2), /Too many attempts/);
});
test('role matrix is enforced for every foundation collection', async () => {
  const routes = {
    '/batches': 'BATCH_READ',
    '/clients': 'CLIENT_READ',
    '/accounts': 'ACCOUNT_MANAGE',
    '/audit': 'AUDIT_READ',
    '/payments': 'PAYMENT_READ',
    '/support/cases': 'SUPPORT_MANAGE',
    '/reports/dashboard': 'REPORT_VIEW',
  } as const;
  for (const role of roles) {
    const session = await new Session().login(role);
    for (const [route, permission] of Object.entries(routes))
      assert.equal(
        (await session.request(route)).status,
        rolePermissions[role].includes(permission) ? 200 : 403,
        `${role} ${route}`,
      );
    const overview = await (await session.request('/overview')).json();
    if (!rolePermissions[role].includes('CLIENT_READ')) assert.equal(overview.clients, null);
    await session.request('/auth/logout', post({}));
  }
});
test('wrong credentials, origin forgery, cookie flags and refresh replay protection', async () => {
  const session = new Session();
  assert.equal(
    (await session.request('/auth/login', post({ email: emails.get('OWNER'), password: 'wrong' })))
      .status,
    401,
  );
  const login = await session.request(
    '/auth/login',
    post({ email: emails.get('OWNER'), password }),
  );
  assert.equal(login.status, 200);
  assert.ok(
    login.headers
      .getSetCookie()
      .every((cookie) => cookie.includes('HttpOnly') && cookie.includes('SameSite=Lax')),
  );
  assert.equal(
    (
      await session.request('/batches', {
        ...post({}),
        headers: { Origin: 'https://evil.example' },
      })
    ).status,
    403,
  );
  const oldRefresh = session.cookies.get('fp_refresh')!;
  assert.equal((await session.request('/auth/refresh', post({}))).status, 200);
  assert.notEqual(session.cookies.get('fp_refresh'), oldRefresh);
  assert.equal(
    (
      await session.request('/auth/refresh', {
        ...post({}),
        headers: { Cookie: `fp_refresh=${oldRefresh}` },
      })
    ).status,
    401,
  );
  const oldAccess = session.cookies.get('fp_access')!;
  await session.request('/auth/logout', post({}));
  assert.equal(
    (await session.request('/auth/me', { headers: { Cookie: `fp_access=${oldAccess}` } })).status,
    401,
  );
});
test('batch writes audit atomically; duplicates, malformed input and stale edits are rejected', async () => {
  const owner = await new Session().login('OWNER');
  const finance = await new Session().login('FINANCE_OFFICER');
  const input = {
    code: `NEW-${suffix}`,
    model: 'iPhone 16',
    status: 'ACTIVE',
    startDate: '2026-09-01',
    endDate: '2027-03-01',
  };
  assert.equal((await finance.request('/batches', post(input))).status, 403);
  assert.equal(
    (await owner.request('/batches', post({ ...input, endDate: '2020-01-01' }))).status,
    400,
  );
  assert.equal((await owner.request('/batches', post({ ...input, unexpected: true }))).status, 400);
  const created = await owner.request('/batches', post(input));
  assert.equal(created.status, 201);
  const batch = await created.json();
  assert.equal(
    await db.auditEntry.count({ where: { recordId: batch.id, action: 'batch.created' } }),
    1,
  );
  const eventCount = await db.changeEvent.count();
  assert.equal((await owner.request('/batches', post(input))).status, 409);
  assert.equal(await db.changeEvent.count(), eventCount);
  const updates = await Promise.all([
    owner.request(
      `/batches/${batch.id}`,
      patch({ version: 1, record: { ...input, model: 'First edit' } }),
    ),
    owner.request(
      `/batches/${batch.id}`,
      patch({ version: 1, record: { ...input, model: 'Second edit' } }),
    ),
  ]);
  assert.deepEqual(updates.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    await db.auditEntry.count({ where: { recordId: batch.id, action: 'batch.updated' } }),
    1,
  );
});
test('client account linkage, record updates and cross-customer isolation', async () => {
  const owner = await new Session().login('OWNER');
  const customer = await new Session().login('CUSTOMER');
  const searched = await (await owner.request('/clients?q=0001')).json();
  assert.ok(searched.items.some((client: { id: string }) => client.id === firstClient));
  assert.equal((await customer.request(`/clients/${firstClient}`)).status, 200);
  assert.equal((await customer.request(`/clients/${secondClient}`)).status, 404);
  assert.equal((await customer.request('/clients', post({}))).status, 403);
  const input = {
    name: 'Linked customer',
    email: `${suffix}-linked@example.test`,
    phone: '+63 900 123 4567',
    batchId,
    status: 'ACTIVE',
    releaseStatus: 'NOT_READY',
  };
  const created = await owner.request('/clients', post(input));
  assert.equal(created.status, 201);
  const client = await created.json();
  const account = {
    name: 'Linked customer',
    email: input.email,
    password,
    role: 'CUSTOMER',
    clientId: client.id,
  };
  assert.equal((await owner.request('/accounts', post(account))).status, 201);
  assert.equal(
    (
      await owner.request(
        '/accounts',
        post({ ...account, email: `${suffix}-duplicate@example.test` }),
      )
    ).status,
    409,
  );
  assert.equal((await owner.request('/accounts', post({ ...account, role: 'OWNER' }))).status, 400);
  assert.equal(
    (
      await owner.request(
        `/clients/${client.id}`,
        patch({ version: 1, record: { ...input, releaseStatus: 'READY' } }),
      )
    ).status,
    200,
  );
  const audit = await db.auditEntry.findFirstOrThrow({
    where: { recordId: client.id, action: 'client.updated' },
  });
  assert.equal((audit.after as { releaseStatus: string }).releaseStatus, 'READY');
  const accountAudit = await db.auditEntry.findFirstOrThrow({
    where: { recordId: (await db.user.findUniqueOrThrow({ where: { email: input.email } })).id },
  });
  assert.equal(JSON.stringify(accountAudit).includes('password'), false);
});
test('owner can find, filter and safely update a staff account', async () => {
  const owner = await new Session().login('OWNER');
  const email = `${suffix}-directory@example.test`;
  const createdResponse = await owner.request('/accounts', post({
    name: 'Directory Test Person',
    email,
    password,
    role: 'RECORDS',
  }));
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  try {
    const searched = await (await owner.request('/accounts?q=Directory%20Test')).json();
    assert.deepEqual(searched.items.map((item: { id: string }) => item.id), [created.id]);
    const records = await (await owner.request('/accounts?role=RECORDS&status=ACTIVE')).json();
    assert.ok(records.items.some((item: { id: string }) => item.id === created.id));
    const inactive = await (await owner.request('/accounts?q=Directory%20Test&status=INACTIVE')).json();
    assert.equal(inactive.total, 0);

    const roleUpdate = await owner.request(
      `/accounts/${created.id}`,
      patch({ role: 'ANALYTICS', version: created.version }),
    );
    assert.equal(roleUpdate.status, 200);
    const changed = await roleUpdate.json();
    assert.equal(changed.role, 'ANALYTICS');

    const deactivate = await owner.request(
      `/accounts/${created.id}`,
      patch({ active: false, version: changed.version }),
    );
    assert.equal(deactivate.status, 200);
    assert.equal((await deactivate.json()).active, false);
    assert.equal(
      await db.auditEntry.count({ where: { recordId: created.id, action: 'account.role_changed' } }),
      1,
    );
    assert.equal(
      await db.auditEntry.count({ where: { recordId: created.id, action: 'account.deactivated' } }),
      1,
    );

    const self = await db.user.findUniqueOrThrow({ where: { id: accounts.get('OWNER')! } });
    assert.equal(
      (await owner.request(`/accounts/${self.id}`, patch({ role: 'COO', version: self.version }))).status,
      400,
    );
  } finally {
    await db.user.delete({ where: { id: created.id } });
  }
});
test('SSE delivers across two API instances and isolates customer events', async () => {
  const owner = await new Session().login('OWNER');
  const customer = await new Session().login('CUSTOMER');
  const ownerStream = await stream(owner, secondBase);
  const customerStream = await stream(customer, secondBase);
  try {
    const input = {
      name: 'Updated first customer',
      email: `${suffix}-one@example.test`,
      phone: '+63 900 000 0001',
      batchId,
      status: 'ACTIVE',
      releaseStatus: 'READY',
    };
    const c1 = await db.client.findUniqueOrThrow({ where: { id: firstClient } });
    assert.equal(
      (
        await owner.request(
          `/clients/${firstClient}`,
          patch({ version: c1.version, record: input }),
        )
      ).status,
      200,
    );
    await customerStream.wait(() => customerStream.text.includes(firstClient));
    await ownerStream.wait(() => ownerStream.text.includes(firstClient));
    assert.equal(customerStream.text.includes(input.email), false);
    const c2 = await db.client.findUniqueOrThrow({ where: { id: secondClient } });
    assert.equal(
      (
        await owner.request(
          `/clients/${secondClient}`,
          patch({
            version: c2.version,
            record: {
              ...input,
              name: 'Updated second customer',
              email: c2.email,
              batchId: c2.batchId,
            },
          }),
        )
      ).status,
      200,
    );
    await ownerStream.wait(() => ownerStream.text.includes(secondClient));
    await new Promise((resolve) => setTimeout(resolve, 1100));
    assert.equal(customerStream.text.includes(secondClient), false);
    assert.equal(customerStream.text.includes('Updated first customer'), false);
  } finally {
    await ownerStream.close();
    await customerStream.close();
  }
});
test('enrollment snapshots exact installments, freezes terms and rolls back invalid writes', async () => {
  const owner = await new Session().login('OWNER');
  const terms = { code: `PLAN-${suffix}`, model: 'iPhone plan', status: 'ACTIVE',
    startDate: '2026-01-31', endDate: '2026-05-01', contractPrice: '100.00', installmentCount: 3, cadence: 'MONTHLY' };
  const created = await owner.request('/batches', post(terms));
  assert.equal(created.status, 201);
  const batch = await created.json();
  assert.equal(batch.contractPrice, '100.00');
  assert.equal(batch.startDate, terms.startDate);
  const input = { name: 'Schedule member', email: '', batchId: batch.id,
    status: 'ACTIVE', releaseStatus: 'NOT_READY', joinedAt: '2026-02-01' };
  const enrolled = await owner.request('/clients', post(input));
  assert.equal(enrolled.status, 201);
  const client = await enrolled.json();
  assert.equal(client.joinedAt, '2026-02-01');
  const schedule = await (await owner.request(`/clients/${client.id}/schedule`)).json();
  assert.equal(schedule.totalDue, '100.00');
  assert.deepEqual(schedule.items.map((item: { expectedAmount: string }) => item.expectedAmount), ['33.33', '33.33', '33.34']);
  assert.deepEqual(schedule.items.map((item: { dueDate: string }) => item.dueDate), ['2026-03-02', '2026-04-01', '2026-05-01']);
  for (const record of [{ ...terms, contractPrice: '200.00' }, { ...terms, startDate: '2026-02-01' }])
    assert.equal((await owner.request(`/batches/${batch.id}`, patch({ version: 1, record }))).status, 409);
  assert.equal((await owner.request(`/clients/${client.id}`, patch({ version: 1, record: { ...input, batchId } }))).status, 409);
  assert.deepEqual(await (await owner.request(`/clients/${client.id}/schedule`)).json(), schedule);
  assert.equal(await db.auditEntry.count({ where: { recordId: client.id, action: 'schedule.generated' } }), 1);
  const eventCount = await db.changeEvent.count();
  const clientCount = await db.client.count();
  const legacy = await db.batch.findFirstOrThrow({ where: { code: `OTHER-${suffix}` } });
  assert.equal((await owner.request('/clients', post({ ...input, batchId: legacy.id }))).status, 400);
  assert.equal(await db.changeEvent.count(), eventCount);
  assert.equal(await db.client.count(), clientCount);
  for (const change of [{ contractPrice: '0.001' }, { contractPrice: '-1' }, { installmentCount: 0 },
    { contractPrice: '0.01', installmentCount: 2 }, { endDate: '2026-02-01' }]) {
    assert.equal((await owner.request('/batches', post({ ...terms, code: `BAD-${suffix}`, ...change }))).status, 400);
  }
  const filtered = await (await owner.request(`/clients?batchId=${batch.id}&q=Schedule`)).json();
  assert.deepEqual(filtered.items.map((item: { id: string }) => item.id), [client.id]);
});

test('client search finds and pages records in a 1,000-client dataset', async () => {
  const records = await new Session().login('RECORDS');
  const marker = `SEARCH-${suffix}`;
  await db.client.createMany({
    data: Array.from({ length: 1000 }, (_, index) => ({
      name: `${marker} Client ${String(index).padStart(4, '0')}`,
      email: `${marker.toLowerCase()}-${index}@example.test`,
      phone: `+63 917 ${String(index).padStart(7, '0')}`,
      batchId,
    })),
  });
  try {
    const first = await (await records.request(`/clients?q=${marker}&page=1`)).json();
    const last = await (await records.request(`/clients?q=${marker}&page=50`)).json();
    assert.equal(first.total, 1000);
    assert.equal(last.items.length, 20);
    const known = await (await records.request(
      `/clients?q=${encodeURIComponent(`${marker} Client 0999`)}`,
    )).json();
    assert.deepEqual(known.items.map((item: { name: string }) => item.name), [`${marker} Client 0999`]);
  } finally {
    await db.client.deleteMany({ where: { name: { startsWith: marker } } });
  }
});

test('schedule issuance is idempotent under concurrency, audited and isolated by role/customer', async () => {
  const owner = await new Session().login('OWNER');
  const customer = await new Session().login('CUSTOMER');
  assert.equal((await customer.request(`/clients/${secondClient}/schedule`)).status, 404);
  assert.equal((await customer.request(`/clients/${firstClient}/schedule`, post({}))).status, 403);
  const eventCount = await db.changeEvent.count({ where: { recordId: firstClient } });
  const issued = await Promise.all([
    owner.request(`/clients/${firstClient}/schedule`, post({})),
    owner.request(`/clients/${firstClient}/schedule`, post({})),
  ]);
  assert.deepEqual(issued.map((res) => res.status), [201, 201]);
  assert.deepEqual(await issued[0].json(), await issued[1].json());
  assert.equal(await db.scheduleItem.count({ where: { clientId: firstClient } }), 3);
  assert.equal(await db.auditEntry.count({ where: { recordId: firstClient, action: 'schedule.generated' } }), 1);
  assert.equal(await db.changeEvent.count({ where: { recordId: firstClient } }), eventCount + 1);
  assert.equal((await customer.request(`/clients/${firstClient}/schedule`)).status, 200);
  for (const role of roles) {
    const session = await new Session().login(role);
    assert.equal((await session.request(`/clients/${firstClient}/schedule`)).status,
      role === 'CUSTOMER' || rolePermissions[role].includes('CLIENT_READ') ? 200 : 404, role);
    assert.equal((await session.request(`/clients/${firstClient}/schedule`, post({}))).status,
      rolePermissions[role].includes('CLIENT_MANAGE') ? 201 : 403, role);
  }
});

test('Finance verification alone moves balances and customer-visible history', async () => {
  const records = await new Session().login('RECORDS');
  const finance = await new Session().login('FINANCE_OFFICER');
  const customer = await new Session().login('CUSTOMER');
  const support = await new Session().login('CS_TEAM');
  const input = {
    clientId: firstClient,
    amount: '10.25',
    paymentDate: '2026-09-22',
    method: 'GCash',
    referenceNumber: `GC-${suffix}`,
    notes: 'Claim shared in Messenger',
  };
  assert.equal((await support.request('/payments/receipt-scan', post({ template: 'gcash' }))).status, 403);
  assert.equal((await records.request('/payments/receipt-scan', post({ template: 'gcash' }))).status, 400);
  assert.equal((await support.request('/payments', post(input))).status, 403);
  const recorded = await records.request('/payments', post(input));
  assert.equal(recorded.status, 201);
  const payment = await recorded.json();
  assert.equal(payment.status, 'PENDING');
  assert.equal(payment.duplicateReference, false);
  const proof = new FormData();
  const proofBytes = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    Buffer.from('private-proof-fixture'),
  ]);
  proof.append('proof', new Blob([proofBytes], { type: 'image/png' }), 'receipt.png');
  const attached = await records.upload(`/payments/${payment.id}/proof`, proof);
  assert.equal(attached.status, 201);
  const paymentWithProof = await attached.json();
  assert.ok(paymentWithProof.proofFile.id);
  const storedProof = await records.request(`/payments/${payment.id}/proof`);
  assert.equal(storedProof.status, 200);
  assert.match(storedProof.headers.get('content-type') ?? '', /^image\/png/);
  assert.deepEqual(Buffer.from(await storedProof.arrayBuffer()), proofBytes);
  assert.equal((await customer.request(`/payments/${payment.id}/proof`)).status, 404);
  assert.equal((await support.request(`/payments/${payment.id}/proof`)).status, 403);
  const duplicateProof = new FormData();
  duplicateProof.append('proof', new Blob([proofBytes], { type: 'image/png' }), 'other.png');
  assert.equal((await records.upload(`/payments/${payment.id}/proof`, duplicateProof)).status, 409);
  const duplicate = await (await records.request('/payments', post(input))).json();
  assert.equal(duplicate.duplicateReference, true);

  const pendingBalance = await (await records.request(`/clients/${firstClient}/balance`)).json();
  assert.equal(pendingBalance.totalDue, '100.00');
  assert.equal(pendingBalance.verifiedPaid, '0.00');
  assert.equal(pendingBalance.remainingBalance, '100.00');
  assert.equal(pendingBalance.pendingAmount, '20.50');
  const unpaidSchedule = await (await customer.request(`/clients/${firstClient}/schedule`)).json();
  assert.equal(unpaidSchedule.items[0].paidApplied, '0.00');
  assert.equal(unpaidSchedule.items[0].status,
    unpaidSchedule.items[0].dueDate < new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10) ? 'OVERDUE' : 'UPCOMING');
  assert.equal((await records.request(`/payments/${payment.id}/verify`, post({
    decision: 'VERIFIED', notes: 'Not permitted', version: payment.version,
  }))).status, 403);

  const decisions = await Promise.all([
    finance.request(`/payments/${payment.id}/verify`, post({
      decision: 'VERIFIED', notes: 'Matched GCash history', version: paymentWithProof.version,
    })),
    finance.request(`/payments/${payment.id}/verify`, post({
      decision: 'VERIFIED', notes: 'Second reviewer', version: paymentWithProof.version,
    }), secondBase),
  ]);
  assert.deepEqual(decisions.map((response) => response.status).sort(), [200, 409]);
  assert.equal((await (await customer.request('/portal/notifications')).json()).filter(
    (item: { kind: string }) => item.kind === 'payment',
  ).length, 1);
  const verifiedBalance = await (await customer.request(`/clients/${firstClient}/balance`)).json();
  assert.equal(verifiedBalance.verifiedPaid, '10.25');
  assert.equal(verifiedBalance.remainingBalance, '89.75');
  const allocatedSchedule = await (await customer.request(`/clients/${firstClient}/schedule`)).json();
  assert.equal(allocatedSchedule.items[0].paidApplied, '10.25');
  assert.equal(allocatedSchedule.items[0].status, 'PARTIAL');
  assert.equal((await customer.request(`/clients/${secondClient}/balance`)).status, 404);
  const customerPayments = await (await customer.request('/payments')).json();
  assert.deepEqual(customerPayments.items.map((item: { id: string }) => item.id), [payment.id]);
  const statement = await (await customer.request(`/clients/${firstClient}/statement`)).json();
  assert.equal(statement.officialTaxInvoice, false);
  assert.match(statement.notice, /not an official BIR sales invoice/i);
  assert.deepEqual(statement.verifiedPayments.map((item: { id: string }) => item.id), [payment.id]);
  assert.equal((await customer.request(`/payments/${duplicate.id}/confirmation`)).status, 404);
  const confirmation = await (await customer.request(`/payments/${payment.id}/confirmation`)).json();
  assert.equal(confirmation.payment.id, payment.id);
  assert.equal(confirmation.officialTaxInvoice, false);
  assert.equal((await customer.request(`/payments/${payment.id}/proof`)).status, 200);
  const clarification = await finance.request(`/payments/${duplicate.id}/verify`, post({
    decision: 'NEEDS_CLARIFICATION', notes: 'Reference needs a clearer screenshot', version: duplicate.version,
  }));
  assert.equal(clarification.status, 200);
  assert.equal((await clarification.json()).status, 'NEEDS_CLARIFICATION');
  const corrected = await records.request(`/payments/${duplicate.id}`, patch({
    version: duplicate.version + 1,
    record: { ...input, amount: '11.00', referenceNumber: `GC-CORRECTED-${suffix}` },
  }));
  assert.equal(corrected.status, 200);
  assert.equal((await corrected.json()).status, 'PENDING');
  assert.equal((await records.request(`/payments/${payment.id}`, patch({
    version: payment.version + 1, record: input,
  }))).status, 409);
  assert.equal(await db.auditEntry.count({ where: { recordId: payment.id } }), 3);

  const overpayment = await (await records.request('/payments', post({
    ...input, amount: '150.00', referenceNumber: `OVER-${suffix}`,
  }))).json();
  assert.equal((await finance.request(`/payments/${overpayment.id}/verify`, post({
    decision: 'VERIFIED', notes: 'Matched bank history', version: overpayment.version,
  }))).status, 200);
  const overpaidBalance = await (await records.request(`/clients/${firstClient}/balance`)).json();
  assert.equal(overpaidBalance.remainingBalance, '0.00');
  assert.equal(overpaidBalance.overpaid, '60.25');
  const report = await (await finance.request(
    `/reports/dashboard?batchId=${batchId}&dateFrom=2026-09-22&dateTo=2026-09-22`,
  )).json();
  assert.equal(report.verifiedAmount, '160.25');
  assert.equal(report.pendingAmount, '11.00');
  const exported = await finance.request(
    `/reports/payments/export?batchId=${batchId}&dateFrom=2026-09-22&dateTo=2026-09-22`,
  );
  assert.equal(exported.status, 200);
  assert.match(exported.headers.get('content-type') ?? '', /text\/csv/);
  const csv = await exported.text();
  assert.match(csv, /"VERIFIED"/);
  assert.equal(csv.includes('First customer'), false);
  assert.equal(csv.includes(`GC-${suffix}`), false);
});

test('payment search and stable pagination find claims in a 1,000-row queue', async () => {
  const records = await new Session().login('RECORDS');
  const marker = `LOAD-${suffix}`;
  await db.payment.createMany({
    data: Array.from({ length: 1000 }, (_, index) => ({
      clientId: firstClient,
      batchId,
      amount: '1.00',
      paymentDate: new Date('2026-09-20'),
      method: 'GCash',
      referenceNumber: `${marker}-${String(index).padStart(4, '0')}`,
      recordedById: accounts.get('RECORDS')!,
    })),
  });
  try {
    const first = await (await records.request(`/payments?q=${marker}&page=1`)).json();
    const last = await (await records.request(`/payments?q=${marker}&page=50`)).json();
    assert.equal(first.total, 1000);
    assert.equal(first.pageSize, 20);
    assert.equal(last.items.length, 20);
    assert.equal(new Set([
      ...first.items.map((item: { id: string }) => item.id),
      ...last.items.map((item: { id: string }) => item.id),
    ]).size, 40);

    const batchSearch = await (await records.request(
      `/payments?q=${encodeURIComponent(`TEST-${suffix}`)}&status=PENDING&dateFrom=2026-09-20&dateTo=2026-09-20`,
    )).json();
    assert.equal(batchSearch.total, 1000);

    const exported = await records.request(
      `/reports/payments/export?q=${marker}&status=PENDING&dateFrom=2026-09-20&dateTo=2026-09-20`,
    );
    const csv = await exported.text();
    assert.equal(exported.status, 200, csv);
    assert.equal(csv.split('\r\n').length, 1001);
    assert.equal(csv.includes('First customer'), false);
    assert.equal(csv.includes(marker), false);
  } finally {
    await db.payment.deleteMany({ where: { referenceNumber: { startsWith: marker } } });
  }
});

test('deactivation stops an existing stream and invalidates the session', async () => {
  const owner = await new Session().login('OWNER');
  const records = await new Session().login('RECORDS');
  const connection = await stream(records);
  try {
    const user = await db.user.findUniqueOrThrow({ where: { id: accounts.get('RECORDS')! } });
    assert.equal(
      (await owner.request(`/accounts/${user.id}`, patch({ active: false, version: user.version })))
        .status,
      200,
    );
    await connection.wait(() => connection.ended);
    assert.equal((await records.request('/auth/me')).status, 401);
    assert.equal((await records.request('/auth/refresh', post({}))).status, 401);
    assert.equal(
      (
        await owner.request(
          `/accounts/${accounts.get('OWNER')}`,
          patch({ active: false, version: 1 }),
        )
      ).status,
      400,
    );
  } finally {
    await connection.close();
  }
});
test('disconnect recovery retrieves current authoritative records', async () => {
  const owner = await new Session().login('OWNER');
  const customer = await new Session().login('CUSTOMER');
  const connection = await stream(customer);
  await connection.close();
  const current = await db.client.findUniqueOrThrow({ where: { id: firstClient } });
  const input = {
    name: current.name,
    email: current.email,
    phone: current.phone,
    batchId: current.batchId,
    status: current.status,
    releaseStatus: 'RELEASED',
  };
  assert.equal(
    (
      await owner.request(
        `/clients/${firstClient}`,
        patch({ version: current.version, record: input }),
      )
    ).status,
    200,
  );
  const reconnected = await stream(customer, secondBase);
  try {
    assert.equal(
      (await (await customer.request(`/clients/${firstClient}`, {}, secondBase)).json())
        .releaseStatus,
      'RELEASED',
    );
  } finally {
    await reconnected.close();
  }
});
test('password reset is single-use and revokes existing sessions without exposing tokens', async () => {
  const finance = await new Session().login('FINANCE_OFFICER');
  const known = await finance.request(
    '/auth/forgot-password',
    post({ email: emails.get('FINANCE_OFFICER') }),
  );
  const unknown = await finance.request(
    '/auth/forgot-password',
    post({ email: `${suffix}-missing@example.test` }),
  );
  assert.deepEqual(await known.json(), await unknown.json());
  const files = await readdir('.local/mail');
  let token = '';
  for (const file of files) {
    const text = await readFile(`.local/mail/${file}`, 'utf8');
    if (text.startsWith(`To: ${emails.get('FINANCE_OFFICER')}\n`))
      token = text.match(/reset-password#([A-Za-z0-9_-]+)/)?.[1] ?? '';
  }
  assert.ok(token);
  const stored = await db.passwordReset.findUniqueOrThrow({
    where: { tokenHash: tokenHash(token) },
  });
  assert.notEqual(stored.tokenHash, token);
  assert.equal(
    (
      await finance.request(
        '/auth/reset-password',
        post({ token, password: 'New-integration-password-123!' }),
      )
    ).status,
    200,
  );
  assert.equal((await finance.request('/auth/me')).status, 401);
  assert.equal(
    (await finance.request('/auth/reset-password', post({ token, password }))).status,
    401,
  );
});

test('customer documents stay private through clarification, resubmission and review', async () => {
  await db.loginAttempt.deleteMany({ where: { key: tokenHash('login-ip:127.0.0.1') } });
  await db.user.update({ where: { id: accounts.get('RECORDS')! }, data: { active: true } });
  const customer = await new Session().login('CUSTOMER');
  const records = await new Session().login('RECORDS');
  const unrelatedStaff = await new Session().login('CS_TEAM');
  const otherEmail = `${suffix}-other-customer@example.test`;
  await db.user.create({ data: { name: 'Other customer', email: otherEmail,
    passwordHash: await hashPassword(password), role: 'CUSTOMER', clientId: secondClient } });
  const other = new Session();
  assert.equal((await other.request('/auth/login', post({ email: otherEmail, password }))).status, 200);
  const checklist = await (await customer.request('/portal/documents')).json();
  assert.equal(checklist.length, 2);
  assert.ok(checklist.every((item: { status: string }) => item.status === 'MISSING'));
  assert.equal((await other.request(`/clients/${firstClient}/documents`)).status, 404);
  assert.equal((await new Session().request('/portal/documents')).status, 401);

  const badFile = new FormData();
  badFile.append('file', new Blob(['not an image'], { type: 'image/png' }), 'fake.png');
  assert.equal((await customer.upload('/portal/documents/PHOTO_ID', badFile)).status, 400);
  assert.equal((await (await customer.request('/portal/documents')).json())[0].status, 'MISSING');

  const photo = new FormData();
  photo.append('file', new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1])], { type: 'image/png' }), 'id.png');
  const uploaded = await customer.upload('/portal/documents/PHOTO_ID', photo);
  assert.equal(uploaded.status, 201);
  const first = await uploaded.json();
  assert.equal(first.status, 'SUBMITTED');
  const uploadAudit = await db.auditEntry.findFirstOrThrow({ where: { recordId: first.id, action: 'document.submitted' } });
  assert.equal((uploadAudit.after as { clientId: string }).clientId, firstClient);
  assert.equal((await other.request(`/documents/${first.id}/file`)).status, 404);
  assert.equal((await unrelatedStaff.request(`/documents/${first.id}/file`)).status, 404);
  assert.equal((await other.request(`/documents/${first.id}/review`, post({ status: 'APPROVED', version: 1 }))).status, 403);
  assert.equal((await customer.request(`/documents/${first.id}/file`)).status, 200);
  assert.equal((await customer.upload('/portal/documents/PHOTO_ID', photo)).status, 409);

  const clarification = await records.request(`/documents/${first.id}/review`, post({ status: 'NEEDS_CLARIFICATION', version: 1, clarification: 'Please include all four corners.' }));
  assert.equal(clarification.status, 200);
  assert.equal((await records.request(`/documents/${first.id}/review`, post({ status: 'APPROVED', version: 1 }))).status, 409);
  const needs = (await (await customer.request('/portal/documents')).json())[0];
  assert.equal(needs.status, 'NEEDS_CLARIFICATION');
  assert.match(needs.latest.clarification, /four corners/);

  const corrected = new FormData();
  corrected.append('file', new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 2])], { type: 'image/png' }), 'corrected.png');
  const replacement = await customer.upload('/portal/documents/PHOTO_ID', corrected);
  assert.equal(replacement.status, 201);
  const replacementId = (await replacement.json()).id;
  const history = (await (await customer.request('/portal/documents')).json())[0];
  assert.equal(history.history.length, 2);
  assert.equal(history.latest.id, replacementId);
  assert.equal((await records.request(`/documents/${replacementId}/review`, post({ status: 'APPROVED', version: 1 }))).status, 200);
  assert.equal((await (await customer.request('/portal/documents')).json())[0].status, 'APPROVED');
  assert.equal((await customer.request(`/documents/${first.id}/file`)).status, 200);
  assert.equal((await other.request('/portal/documents')).status, 200);
  assert.ok((await (await other.request('/portal/documents')).json()).every((item: { status: string }) => item.status === 'MISSING'));
});

test('support updates and notifications are scoped to the linked customer', async () => {
  await db.loginAttempt.deleteMany({ where: { key: tokenHash('login-ip:127.0.0.1') } });
  const customer = await new Session().login('CUSTOMER');
  const staff = await new Session().login('CS_TEAM');
  const owner = await new Session().login('OWNER');
  const other = new Session();
  assert.equal((await other.request('/auth/login', post({ email: `${suffix}-other-customer@example.test`, password }))).status, 200);
  const created = await customer.request('/portal/support', post({ category: 'Payment', description: 'Please check my latest payment record.' }));
  assert.equal(created.status, 201);
  const supportCase = await created.json();
  assert.equal((await other.request('/portal/support')).status, 200);
  assert.ok(!(await (await other.request('/portal/support')).json()).some((item: { id: string }) => item.id === supportCase.id));
  assert.equal((await other.request('/support/cases')).status, 403);
  assert.equal((await staff.request(`/support/cases/${supportCase.id}`, patch({ status: 'RESOLVED', version: 1 }))).status, 400);
  assert.equal((await staff.request(`/support/cases/${supportCase.id}`, patch({ status: 'IN_PROGRESS', version: 1 }))).status, 200);
  assert.equal((await staff.request(`/support/cases/${supportCase.id}`, patch({ status: 'RESOLVED', resolution: 'Checked with Finance.', version: 2 }))).status, 200);
  assert.equal((await staff.request(`/support/cases/${supportCase.id}`, patch({ status: 'CLOSED', version: 2 }))).status, 409);
  assert.equal((await staff.request(`/support/cases/${supportCase.id}`, patch({ assignedStaffId: accounts.get('CS_TEAM'), version: 3 }))).status, 200);
  const ownCase = (await (await customer.request('/portal/support')).json()).find((item: { id: string }) => item.id === supportCase.id);
  assert.equal(ownCase.status, 'resolved');
  assert.equal(ownCase.resolution, 'Checked with Finance.');
  assert.equal(ownCase.assigned_staff, accounts.get('CS_TEAM'));

  const current = await db.client.findUniqueOrThrow({ where: { id: firstClient } });
  const releaseStatus = current.releaseStatus === 'READY' ? 'PROCESSING' : 'READY';
  const update = await owner.request(`/clients/${firstClient}`, patch({ version: current.version, record: {
    name: current.name, email: current.email, phone: current.phone, batchId: current.batchId,
    status: current.status, releaseStatus,
  } }));
  assert.equal(update.status, 200);
  const notices = await (await customer.request('/portal/notifications')).json();
  assert.ok(notices.some((item: { kind: string }) => item.kind === 'support'));
  assert.ok(notices.some((item: { kind: string }) => item.kind === 'release'));
  const unread = notices.find((item: { readAt: string | null }) => !item.readAt);
  assert.equal((await other.request(`/portal/notifications/${unread.id}/read`, post({}))).status, 404);
  assert.equal((await customer.request(`/portal/notifications/${unread.id}/read`, post({}))).status, 200);
  assert.ok((await (await customer.request(`/portal/notifications/${unread.id}/read`, post({}))).json()).readAt);
  const delivery = app.get(EmailDeliveryService);
  for (let attempt = 0; attempt < 10; attempt++) {
    if ((await db.notification.findUniqueOrThrow({ where: { id: unread.id } })).emailStatus === 'SENT') break;
    await delivery.deliver();
  }
  assert.equal((await db.notification.findUniqueOrThrow({ where: { id: unread.id } })).emailStatus, 'SENT');
  const email = await readFile(join(process.cwd(), '.local/mail', `${unread.id}.txt`), 'utf8');
  assert.match(email, /Fresh Phones PH/);
});

test('Owner can edit audited customer email templates while other roles cannot', async () => {
  await db.loginAttempt.deleteMany({ where: { key: { in: [
    'login-ip:127.0.0.1',
    ...(['OWNER', 'CORE_HANDLER', 'CUSTOMER'] as const).map((role) => `login-email:${emails.get(role)}`),
  ].map(tokenHash) } } });
  const owner = await new Session().login('OWNER');
  const handler = await new Session().login('CORE_HANDLER');
  const customer = await new Session().login('CUSTOMER');
  assert.equal((await handler.request('/customer-notification-settings')).status, 403);
  assert.equal((await customer.request('/customer-notification-settings')).status, 403);
  const settings = await (await owner.request('/customer-notification-settings')).json();
  const current = settings.templates.find((item: { kind: string }) => item.kind === 'payment');
  const input = { version: current.version, subject: 'Account update: {title}', body: 'Hello,\n\n{message}\n\nOpen {url}' };
  assert.equal((await owner.request('/customer-notification-settings/templates/payment', patch({ ...input, body: 'No placeholders' }))).status, 400);
  assert.equal((await handler.request('/customer-notification-settings/templates/payment', patch(input))).status, 403);
  const updated = await owner.request('/customer-notification-settings/templates/payment', patch(input));
  assert.equal(updated.status, 200);
  assert.equal((await owner.request('/customer-notification-settings/templates/payment', patch(input))).status, 409);
  assert.ok(await db.auditEntry.count({ where: { action: 'customer_email_template.updated' } }));
  assert.equal((await owner.request('/customer-notification-settings/reminders', patch({ version: settings.reminderVersion, reminderDays: '31' }))).status, 400);
  const reminder = await owner.request('/customer-notification-settings/reminders', patch({ version: settings.reminderVersion, reminderDays: '' }));
  assert.equal(reminder.status, 200);
  const savedReminder = await reminder.json();
  const due = new Date(Date.now() + 8 * 60 * 60 * 1000);
  due.setUTCDate(due.getUTCDate() + 3);
  const reminderClient = await db.client.create({ data: { name: 'Reminder customer', email: `${suffix}-reminder@example.test`, phone: '+63 900 000 0022', batchId } });
  await db.user.create({ data: { name: 'Reminder customer', email: `${suffix}-reminder@example.test`, passwordHash: await hashPassword(password), role: 'CUSTOMER', clientId: reminderClient.id } });
  const dueItem = await db.scheduleItem.create({ data: { clientId: reminderClient.id, sequenceNo: 1, dueDate: new Date(`${due.toISOString().slice(0, 10)}T00:00:00Z`), expectedAmount: '10.00' } });
  const enabled = await owner.request('/customer-notification-settings/reminders', patch({ version: savedReminder.version, reminderDays: '3' }));
  assert.equal(enabled.status, 200);
  const reminderKey = `installment:${dueItem.id}:3`;
  assert.equal(await db.notification.count({ where: { dedupeKey: reminderKey } }), 1);
  await app.get(EmailDeliveryService).refreshReminders();
  assert.equal(await db.notification.count({ where: { dedupeKey: reminderKey } }), 1);
  const enabledSettings = await enabled.json();
  assert.equal((await owner.request('/customer-notification-settings/reminders', patch({ version: enabledSettings.version, reminderDays: '' }))).status, 200);
  const notice = await db.notification.create({ data: { userId: accounts.get('CUSTOMER')!, kind: 'payment', title: 'Payment verified', message: 'Finance checked your record.' } });
  const delivery = app.get(EmailDeliveryService);
  for (let attempt = 0; attempt < 10; attempt++) {
    if ((await db.notification.findUniqueOrThrow({ where: { id: notice.id } })).emailStatus === 'SENT') break;
    await delivery.deliver();
  }
  assert.equal((await db.notification.findUniqueOrThrow({ where: { id: notice.id } })).emailStatus, 'SENT');
  const email = await readFile(join(process.cwd(), '.local/mail', `${notice.id}.txt`), 'utf8');
  assert.match(email, /Account update: Payment verified/);
  assert.match(email, /Finance checked your record/);
});
