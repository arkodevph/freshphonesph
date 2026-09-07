import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import type { INestApplication } from '@nestjs/common';
import { roles, rolePermissions, type Role } from '@freshphones/contracts';
import { createApp } from '../src/app';
import { Database } from '../src/database';
import { AuthService } from '../src/auth/auth.service';
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
