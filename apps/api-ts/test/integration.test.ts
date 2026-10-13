import 'reflect-metadata';
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { effectivePermissions, roles, rolePermissions, staffEmailKinds, type Role, type StaffAlert, type StaffAlertPage } from '@freshphones/contracts';
import { createApp } from '../src/app';
import { Database } from '../src/database';
import { AuthService } from '../src/auth/auth.service';
import { EmailDeliveryService } from '../src/portal/email-delivery.service';
import { FinanceAlertsService } from '../src/finance/finance-alerts.service';
import { StaffAlertsService } from '../src/staff/staff-alerts.service';
import { taskAlertKind } from '../src/staff/alert-queries';
import { canReadPaymentResults } from '../src/staff/payment-results';
import { StaffEmailService } from '../src/staff/staff-email.service';
import { notifySupport } from '../src/staff/support-alerts';
import { notifyAccount } from '../src/staff/account-alerts';
import { queueTaskEmail, queuePendingEmails, queueResultEmails, staffEmailWindowMs } from '../src/staff/email-queue';
import { CONFIG, type Config } from '../src/config';
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
    // This parity scenario deliberately submits many invalid applications.
    ABUSE_LIMITS: { application: [[50, 3600]] },
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
        hrConfidentialAccess: role === 'HR_PAYROLL',
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
    ABUSE_LIMITS: { application: [[50, 3600]] },
  });
  await second.listen(0, '127.0.0.1');
  secondBase = await second.getUrl();
});
after(async () => {
  await second?.close();
  await app?.close();
});
beforeEach(async () => {
  // Each scenario makes many synthetic logins. Isolate fixture counters without weakening the API limiter or its cross-instance test.
  await db.abuseBucket.deleteMany();
  await db.loginAttempt.deleteMany({ where: { key: { in: [
    tokenHash('login-ip:127.0.0.1'), ...[...emails.values()].map(email => tokenHash(`login-email:${email}`)),
  ] } } });
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
test('recruitment role matrix protects listings, applicant details and writes', async () => {
  const jobId = randomUUID();
  for (const role of roles) {
    const session = await new Session().login(role);
    const permitted = rolePermissions[role].includes('RECRUITMENT_MANAGE');
    const canReadApplicants = permitted && effectivePermissions({ role, hrConfidentialAccess: role === 'HR_PAYROLL' }).includes('HR_CONFIDENTIAL');
    assert.equal((await session.request('/recruitment/jobs')).status, permitted ? 200 : 403, `${role} job listings`);
    assert.equal((await session.request('/recruitment/applicants')).status, canReadApplicants ? 200 : 403, `${role} applicant records`);
    if (!permitted) {
      assert.equal((await session.request('/recruitment/jobs', post({ title: 'Unauthorized opening' }))).status, 403);
      assert.equal((await session.request(`/recruitment/jobs/${jobId}`, patch({ version: 1, record: { title: 'Unauthorized edit' } }))).status, 403);
    }
    if (!canReadApplicants) {
      assert.equal((await session.request(`/recruitment/applicants/${jobId}`, patch({ version: 1, status: 'HIRED' }))).status, 403);
      assert.equal((await session.request(`/applicant-attachments/${jobId}/content`)).status, 403);
    }
    await session.request('/auth/logout', post({}));
  }
});
test('owner and recruitment staff share the public job board and applicant review queue', async () => {
  const anonymous = new Session();
  assert.equal((await anonymous.request('/recruitment/jobs')).status, 401);
  assert.equal((await anonymous.request('/recruitment/applicants')).status, 401);
  const customer = await new Session().login('CUSTOMER');

  for (const role of ['OWNER', 'COO', 'HR_PAYROLL'] as const) {
    const staff = await new Session().login(role);
    const record = {
      title: `Recruitment ${role} ${suffix}`, description: 'Help Fresh Phones customers.',
      employmentType: 'Full-time', location: 'Capas, Tarlac', isOpen: true,
    };
    const created = await staff.request('/recruitment/jobs', post(record));
    assert.equal(created.status, 201);
    const job = await created.json();
    const careers = async () => (await anonymous.request('/careers')).json() as Promise<{ id: string; title: string }[]>;
    assert.ok((await careers()).some((item) => item.id === job.id));
    assert.equal((await customer.request('/recruitment/jobs', post(record))).status, 403);
    assert.equal((await customer.request(`/recruitment/jobs/${job.id}`, patch({ version: job.version, record }))).status, 403);

    const editedRecord = { ...record, title: `${record.title} updated` };
    const edited = await staff.request(`/recruitment/jobs/${job.id}`, patch({ version: job.version, record: editedRecord }));
    assert.equal(edited.status, 200);
    const current = await edited.json();
    assert.equal((await careers()).find((item) => item.id === job.id)?.title, editedRecord.title);
    assert.equal((await staff.request(`/recruitment/jobs/${job.id}`, patch({ version: job.version, record }))).status, 409);

    const applied = await anonymous.upload('/careers/apply', (() => {
      const form = new FormData();
      form.set('jobId', job.id);
      form.set('fullName', `Applicant ${role}`);
      form.set('email', `${suffix}-${role.toLowerCase()}-applicant@example.test`);
      form.set('message', 'I would like to join the team.');
      return form;
    })());
    assert.equal(applied.status, 201);
    const application = await applied.json();
    const owner = role === 'OWNER' ? staff : await new Session().login('OWNER');
    const queue = await (await owner.request(`/recruitment/applicants?q=${suffix}-${role.toLowerCase()}-applicant`)).json();
    const applicant = queue.items.find((item: { id: string }) => item.id === application.id);
    assert.ok(applicant);
    assert.equal(applicant.job.title, editedRecord.title);
    assert.equal(applicant.status, 'RECEIVED');
    const openings = await (await owner.request('/recruitment/jobs')).json();
    assert.equal(openings.items.find((item: { id: string }) => item.id === job.id)?._count.applicants, 1);
    const reviewInput = {
      version: applicant.version, status: 'REVIEWING', reviewerNotes: 'Arrange a human-led interview.',
    };
    const canReviewApplicants = effectivePermissions({ role, hrConfidentialAccess: role === 'HR_PAYROLL' }).includes('HR_CONFIDENTIAL');
    if (!canReviewApplicants) assert.equal((await staff.request(`/recruitment/applicants/${applicant.id}`, patch(reviewInput))).status, 403);
    const reviewer = canReviewApplicants ? staff : owner;
    const reviewed = await reviewer.request(`/recruitment/applicants/${applicant.id}`, patch(reviewInput));
    assert.equal(reviewed.status, 200);
    const review = await reviewed.json();
    assert.equal(review.reviewerId, accounts.get(canReviewApplicants ? role : 'OWNER'));
    assert.equal(review.status, 'REVIEWING');
    const ownerQueue = await (await owner.request(`/recruitment/applicants?q=${suffix}-${role.toLowerCase()}-applicant`)).json();
    assert.equal(ownerQueue.items[0].reviewerNotes, 'Arrange a human-led interview.');
    assert.equal((await customer.request(`/recruitment/applicants/${applicant.id}`, patch({
      version: review.version, status: 'HIRED',
    }))).status, 403);

    const closed = await staff.request(`/recruitment/jobs/${job.id}`, patch({
      version: current.version, record: { ...editedRecord, isOpen: false },
    }));
    assert.equal(closed.status, 200);
    const closedJob = await closed.json();
    assert.ok(!(await careers()).some((item) => item.id === job.id));
    const lateApplication = await anonymous.request('/careers/apply', post({
      jobId: job.id, fullName: 'Late Applicant', email: 'late@example.test',
    }));
    assert.equal(lateApplication.status, 404);
    assert.ok(await db.applicant.findUnique({ where: { id: applicant.id } }));
    const reopened = await owner.request(`/recruitment/jobs/${job.id}`, patch({
      version: closedJob.version, record: editedRecord,
    }));
    assert.equal(reopened.status, 200);
    assert.ok((await careers()).some((item) => item.id === job.id));
    const audit = await db.auditEntry.findMany({ where: { recordId: { in: [job.id, applicant.id] } } });
    assert.ok(audit.some((entry) => entry.action === 'job.created' && entry.actorId === accounts.get(role)));
    assert.ok(audit.some((entry) => entry.action === 'job.updated'));
    assert.ok(audit.some((entry) => entry.action === 'applicant.reviewed'));
    assert.ok((await careers()).every((item) => !('reviewerNotes' in item) && !('applicants' in item)));
    await staff.request('/auth/logout', post({}));
    if (owner !== staff) await owner.request('/auth/logout', post({}));
  }
  await customer.request('/auth/logout', post({}));
});
test('wrong credentials, origin forgery, cookie flags and signed database-session revocation', async () => {
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
  const oldRefresh = session.cookies.get('fp_session')!;
  assert.equal((await session.request('/auth/refresh', post({}))).status, 200);
  assert.equal(session.cookies.get('fp_session'), oldRefresh);
  assert.equal(
    (
      await session.request('/auth/refresh', {
        ...post({}),
        headers: { Cookie: `fp_refresh=${oldRefresh}` },
      })
    ).status,
    401,
  );
  const oldAccess = session.cookies.get('fp_session')!;
  await session.request('/auth/logout', post({}));
  assert.equal(
    (await session.request('/auth/me', { headers: { Cookie: `fp_session=${oldAccess}` } })).status,
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
      role === 'CUSTOMER' || (role !== 'CORE_HANDLER' && rolePermissions[role].includes('CLIENT_READ')) ? 200 : 404, role);
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
    receiptTime: '5:42 PM',
    receiptName: 'MI•••••E T.',
    receiptPhone: '+63 9•••••2050',
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
  assert.equal(payment.receiptTime, '5:42 PM');
  assert.equal(payment.receiptName, 'MI•••••E T.');
  assert.equal(payment.receiptPhone, '+63 9•••••2050');
  assert.equal((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).receiptPhone, '+63 9•••••2050');
  const pendingForCustomer = await customer.request('/portal/payments/review');
  assert.equal(pendingForCustomer.status, 200);
  assert.ok((await pendingForCustomer.json()).some((item: { id: string; amount: string }) => item.id === payment.id && item.amount === '10.25'));
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
  assert.equal(customerPayments.items[0].receiptTime, '5:42 PM');
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
  const correctedPayment = await corrected.json();
  assert.equal(correctedPayment.status, 'PENDING');
  assert.equal(correctedPayment.receiptName, 'MI•••••E T.');
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

test('payment duplicate precheck finds matching references across clients', async () => {
  const records = await new Session().login('RECORDS');
  const support = await new Session().login('CS_TEAM');
  const reference = `CHECK ${suffix}`;
  const query = `/payments/duplicates?${new URLSearchParams({ method: 'gcash', referenceNumber: `CHECK-${suffix}` })}`;
  assert.equal((await support.request(query)).status, 403);
  assert.deepEqual(await (await records.request(query)).json(), []);
  const created: string[] = [];
  try {
    for (const clientId of [firstClient, secondClient]) {
      const response = await records.request('/payments', post({
        clientId, amount: '2.00', paymentDate: '2026-09-24', method: 'GCash', referenceNumber: reference,
      }));
      assert.equal(response.status, 201);
      created.push((await response.json()).id);
    }
    const matches = await (await records.request(query)).json() as Array<{ id: string; clientId: string; referenceNumber: string }>;
    assert.equal(matches.length, 2);
    assert.deepEqual(new Set(matches.map((match) => match.clientId)), new Set([firstClient, secondClient]));
    assert.ok(matches.every((match) => match.referenceNumber === reference));
    const otherMethod = query.replace('method=gcash', 'method=maya');
    assert.deepEqual(await (await records.request(otherMethod)).json(), []);
    const excluding = await (await records.request(`${query}&excludeId=${created[0]}`)).json() as Array<{ id: string }>;
    assert.deepEqual(excluding.map((match) => match.id), [created[1]]);
  } finally {
    await db.payment.deleteMany({ where: { id: { in: created } } });
  }
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
  let resetMail = '';
  for (const file of files) {
    const text = await readFile(`.local/mail/${file}`, 'utf8');
    if (text.startsWith(`To: ${emails.get('FINANCE_OFFICER')}\n`)) {
      token = text.match(/reset-password#([A-Za-z0-9_-]+)/)?.[1] ?? '';
      resetMail = text;
    }
  }
  assert.ok(token);
  assert.ok(resetMail.includes(`Reset code: ${token}`));
  const stored = await db.authVerification.findUniqueOrThrow({
    where: { identifier: tokenHash(`reset-password:${token}`) },
  });
  assert.notEqual(stored.identifier, token);
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

test('changing a customer password keeps the current session and revokes other sessions', async () => {
  const userId = accounts.get('CUSTOMER')!;
  const email = emails.get('CUSTOMER')!;
  await db.loginAttempt.deleteMany({ where: { key: { in: [tokenHash(`login-email:${email}`), tokenHash('login-ip:127.0.0.1')] } } });
  const original = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  const current = await new Session().login('CUSTOMER');
  const other = await new Session().login('CUSTOMER');
  const newPassword = 'Changed-integration-password-456!';
  try {
    assert.equal((await current.request('/auth/forgot-password', post({ email }))).status, 200);
    let resetCode = '';
    for (const file of await readdir('.local/mail')) {
      const text = await readFile(`.local/mail/${file}`, 'utf8');
      if (text.startsWith(`To: ${email}\n`)) {
        resetCode = text.match(/portal\/settings#reset-code=([A-Za-z0-9_-]+)/)?.[1] ?? '';
        assert.ok(text.includes(`Reset code: ${resetCode}`));
      }
    }
    assert.ok(resetCode);
    assert.equal((await current.request('/auth/change-password', post({ currentPassword: 'wrong', newPassword }))).status, 400);
    assert.equal((await current.request('/auth/change-password', post({ currentPassword: password, newPassword: password }))).status, 400);
    assert.equal((await current.request('/auth/change-password', post({ currentPassword: password, newPassword }))).status, 200);
    assert.equal((await current.request('/auth/me')).status, 200);
    assert.equal((await other.request('/auth/me')).status, 401);
    assert.equal((await new Session().request('/auth/login', post({ email: emails.get('CUSTOMER'), password }))).status, 401);
    assert.equal((await new Session().request('/auth/login', post({ email: emails.get('CUSTOMER'), password: newPassword }))).status, 200);
    assert.equal((await current.request('/auth/reset-password', post({ token: resetCode, password: 'Another-integration-password-789!' }))).status, 401);
    assert.ok(await db.auditEntry.findFirst({ where: { actorId: userId, action: 'password.changed', recordId: userId } }));
  } finally {
    await db.user.update({ where: { id: userId }, data: { passwordHash: original.passwordHash } });
  }
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
  const ownUnread = await db.notification.create({ data: { userId: accounts.get('CUSTOMER')!, kind: 'support', title: 'Another update', message: 'Please review.' } });
  const otherUnread = await db.notification.create({ data: { userId: (await db.user.findUniqueOrThrow({ where: { email: `${suffix}-other-customer@example.test` } })).id, kind: 'support', title: 'Private update', message: 'For another customer.' } });
  assert.equal((await staff.request('/portal/notifications/read-all', post({}))).status, 403);
  assert.equal((await customer.request('/portal/notifications/read-all', post({}))).status, 200);
  assert.ok((await db.notification.findUniqueOrThrow({ where: { id: ownUnread.id } })).readAt);
  assert.equal((await db.notification.findUniqueOrThrow({ where: { id: otherUnread.id } })).readAt, null);
  assert.equal((await (await customer.request('/portal/notifications/read-all', post({}))).json()).updated, 0);
});

test('support replies stay on the linked case and release milestones stay private', async () => {
  await db.loginAttempt.deleteMany({ where: { key: tokenHash('login-ip:127.0.0.1') } });
  const customer = await new Session().login('CUSTOMER');
  const staff = await new Session().login('CS_TEAM');
  const owner = await new Session().login('OWNER');
  const other = new Session();
  assert.equal((await other.request('/auth/login', post({ email: `${suffix}-other-customer@example.test`, password }))).status, 200);
  const created = await customer.request('/portal/support', post({ category: 'Account', description: 'Please correct the unit in my membership.' }));
  assert.equal(created.status, 201);
  const supportCase = await created.json();
  assert.equal((await other.request(`/portal/support/${supportCase.id}`)).status, 404);
  assert.equal((await other.request(`/portal/support/${supportCase.id}/replies`, post({ body: 'Trying to read another case.' }))).status, 404);
  assert.equal((await customer.request(`/portal/support/${supportCase.id}/replies`, post({ body: 'Extra detail', needsReply: true }))).status, 400);
  const staffReply = await staff.request(`/support/cases/${supportCase.id}/replies`, post({ body: 'Which model should be on your record?', needsReply: true }));
  assert.equal(staffReply.status, 201);
  assert.equal((await staffReply.json()).status, 'waiting_for_client');
  const customerReply = await customer.request(`/portal/support/${supportCase.id}/replies`, post({ body: 'It should say iPhone 16 Pro.' }));
  assert.equal(customerReply.status, 201);
  assert.equal((await customerReply.json()).status, 'in_progress');
  const detail = await (await customer.request(`/portal/support/${supportCase.id}`)).json();
  assert.deepEqual(detail.messages.map((item: { author_type: string }) => item.author_type), ['staff', 'customer']);
  assert.equal(detail.last_message.by_customer, true);
  assert.ok((await (await staff.request('/support/cases')).json()).results.some((item: { id: string; last_message: { by_customer: boolean } }) =>
    item.id === supportCase.id && item.last_message.by_customer));
  const supportNotice = (await (await customer.request('/portal/notifications')).json()).find((item: { targetPath: string }) => item.targetPath === `/portal/support#case-${supportCase.id}`);
  assert.ok(supportNotice);
  assert.equal((await staff.request(`/support/cases/${supportCase.id}`, patch({ status: 'RESOLVED', resolution: 'Corrected the membership record.', version: 3 }))).status, 200);
  assert.equal((await customer.request(`/portal/support/${supportCase.id}/replies`, post({ body: 'Another reply' }))).status, 409);

  const current = await db.client.findUniqueOrThrow({ where: { id: firstClient } });
  const release = await owner.request(`/clients/${firstClient}/release-updates`, post({ version: current.version, status: 'READY', note: 'Please arrange collection with the team.', collectionDate: '2026-10-01' }));
  assert.equal(release.status, 201);
  assert.equal((await other.request(`/clients/${firstClient}/release-updates`)).status, 404);
  const updates = await (await customer.request(`/clients/${firstClient}/release-updates`)).json();
  assert.equal(updates[0].collection_date, '2026-10-01');
  assert.match(updates[0].note, /arrange collection/);
  assert.ok((await (await customer.request('/portal/notifications')).json()).some((item: { targetPath: string }) => item.targetPath?.startsWith('/portal/release#release-update-')));
});

test('staff work queues show only authorized, actionable records and open exact items', async () => {
  await db.loginAttempt.deleteMany({ where: { key: tokenHash('login-ip:127.0.0.1') } });
  const customer = await new Session().login('CUSTOMER');
  const support = await new Session().login('CS_TEAM');
  const records = await new Session().login('RECORDS');
  const finance = new Session();
  assert.equal((await finance.request('/auth/login', post({ email: emails.get('FINANCE_OFFICER'), password: 'New-integration-password-123!' }))).status, 200);
  const owner = await new Session().login('OWNER');

  for (const kind of ['support', 'documents', 'payments'])
    assert.equal((await customer.request(`/operations/customer-work?kind=${kind}`)).status, 403);
  assert.equal((await support.request('/operations/customer-work?kind=documents')).status, 403);
  assert.equal((await support.request('/operations/customer-work?kind=payments')).status, 403);
  assert.equal((await records.request('/operations/customer-work?kind=payments')).status, 403);
  assert.equal((await finance.request('/operations/customer-work?kind=documents')).status, 403);
  assert.equal((await finance.request('/operations/customer-work?kind=support')).status, 403);
  assert.equal((await owner.request('/operations/customer-work?kind=invalid')).status, 400);
  assert.equal((await owner.request('/operations/customer-work?kind=support&page=0')).status, 400);

  const supportBefore = await (await support.request('/operations/customer-work?kind=support')).json();
  const created = await customer.request('/portal/support', post({ category: 'Delivery', description: 'Please check the collection arrangements.' }));
  assert.equal(created.status, 201);
  const caseId = (await created.json()).id;
  const supportQueue = await (await support.request('/operations/customer-work?kind=support')).json();
  assert.equal(supportQueue.count, supportBefore.count + 1);
  assert.equal(supportQueue.results[0].href, `/system/support?case=${supportQueue.results[0].id}`);
  const focusedCase = await (await support.request(`/support/cases?case=${caseId}`)).json();
  assert.deepEqual(focusedCase.results.map((item: { id: string }) => item.id), [caseId]);
  assert.equal((await support.request('/support/cases?case=bad')).status, 400);
  assert.equal((await support.request(`/support/cases/${caseId}`, patch({ status: 'WAITING_FOR_CLIENT', version: 1 }))).status, 200);
  assert.equal((await (await support.request('/operations/customer-work?kind=support')).json()).count, supportBefore.count);

  const documentBefore = await (await records.request('/operations/customer-work?kind=documents')).json();
  const document = new FormData();
  document.append('file', new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 3])], { type: 'image/png' }), 'agreement.png');
  const submitted = await customer.upload('/portal/documents/SIGNED_AGREEMENT', document);
  assert.equal(submitted.status, 201);
  const documentId = (await submitted.json()).id;
  const documentQueue = await (await records.request('/operations/customer-work?kind=documents')).json();
  assert.equal(documentQueue.count, documentBefore.count + 1);
  assert.ok(documentQueue.results[0].href.startsWith('/system/clients?client='));
  const focusedClient = await (await records.request(`/clients?id=${firstClient}`)).json();
  assert.deepEqual(focusedClient.items.map((item: { id: string }) => item.id), [firstClient]);
  assert.equal((await records.request('/clients?id=bad')).status, 400);
  assert.equal((await records.request(`/documents/${documentId}/review`, post({ status: 'APPROVED', version: 1 }))).status, 200);
  assert.equal((await (await records.request('/operations/customer-work?kind=documents')).json()).count, documentBefore.count);

  const paymentQueue = await (await finance.request('/operations/customer-work?kind=payments')).json();
  assert.ok(paymentQueue.count > 0);
  const paymentId = paymentQueue.results[0].id;
  const focusedPayment = await (await finance.request(`/payments?id=${paymentId}`)).json();
  assert.deepEqual(focusedPayment.items.map((item: { id: string }) => item.id), [paymentId]);
  assert.equal((await finance.request('/payments?id=bad')).status, 400);
  const newPayment = await db.payment.create({ data: { clientId: firstClient, batchId, amount: '1.00',
    paymentDate: new Date('2026-09-27'), method: 'GCash', recordedById: accounts.get('RECORDS')! } });
  assert.equal((await (await finance.request('/operations/customer-work?kind=payments')).json()).count, paymentQueue.count + 1);
  assert.equal((await finance.request(`/payments/${newPayment.id}/verify`, post({
    decision: 'NEEDS_CLARIFICATION', notes: 'Need the transaction reference.', version: 1,
  }))).status, 200);
  assert.equal((await (await finance.request('/operations/customer-work?kind=payments')).json()).count, paymentQueue.count);
  assert.equal((await owner.request('/operations/customer-work?kind=payments&page=2')).status, 200);
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
  assert.equal(settings.testEmailConfigured, false);
  const testAddress = `${suffix}-owner-test@example.test`;
  assert.equal((await customer.request('/customer-notification-settings/test-reminder', post({ email: testAddress }))).status, 403);
  assert.equal((await owner.request('/customer-notification-settings/test-reminder', post({ email: 'invalid' }))).status, 400);
  assert.equal((await owner.request('/customer-notification-settings/test-reminder', post({ email: testAddress }))).status, 503);
  const configured = app.get<Config>(CONFIG);
  const originalKey = configured.RESEND_API_KEY;
  const originalFrom = configured.EMAIL_FROM;
  const originalEnvironment = configured.NODE_ENV;
  const originalFetch = globalThis.fetch;
  let submitted: { to: string[]; subject: string; text: string } | undefined;
  configured.NODE_ENV = 'development';
  configured.RESEND_API_KEY = 'test-only';
  configured.EMAIL_FROM = 'Fresh Phones Test <onboarding@resend.dev>';
  globalThis.fetch = (input, init) => {
    if (String(input) === 'https://api.resend.com/emails') {
      submitted = JSON.parse(String(init?.body));
      return Promise.resolve(new Response(JSON.stringify({ id: randomUUID() }), { status: 200 }));
    }
    return originalFetch(input, init);
  };
  try {
    const ready = await (await owner.request('/customer-notification-settings')).json();
    assert.equal(ready.testEmailConfigured, true);
    assert.equal(ready.usingResendTestSender, true);
    assert.equal((await owner.request('/customer-notification-settings/test-reminder', post({ email: testAddress }))).status, 200);
  } finally {
    globalThis.fetch = originalFetch;
    configured.RESEND_API_KEY = originalKey;
    configured.EMAIL_FROM = originalFrom;
    configured.NODE_ENV = originalEnvironment;
  }
  assert.deepEqual(submitted?.to, [testAddress]);
  assert.match(submitted?.subject ?? '', /TEST · Upcoming installment/);
  assert.match(submitted?.text ?? '', /No payment is due from this email/);
  assert.match(submitted?.text ?? '', /\/portal\/schedule/);
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
  await db.payment.create({ data: { clientId: reminderClient.id, batchId, amount: '3.00', paymentDate: new Date(`${due.toISOString().slice(0, 10)}T00:00:00Z`), method: 'GCash', recordedById: accounts.get('RECORDS')! } });
  const enabled = await owner.request('/customer-notification-settings/reminders', patch({ version: savedReminder.version, reminderDays: '3' }));
  assert.equal(enabled.status, 200);
  const reminderKey = `installment:${dueItem.id}:3`;
  assert.equal(await db.notification.count({ where: { dedupeKey: reminderKey } }), 1);
  const reminderNotice = await db.notification.findUniqueOrThrow({ where: { dedupeKey: reminderKey } });
  assert.match(reminderNotice.message, /awaiting Finance review/);
  assert.equal(reminderNotice.targetPath, '/portal/schedule#installment-1');
  await app.get(EmailDeliveryService).refreshReminders();
  assert.equal(await db.notification.count({ where: { dedupeKey: reminderKey } }), 1);
  assert.equal((await db.notification.findUniqueOrThrow({ where: { dedupeKey: reminderKey } })).emailStatus, 'SENT');
  const reminderEmail = await readFile(join(process.cwd(), '.local/mail', `${reminderNotice.id}.txt`), 'utf8');
  assert.match(reminderEmail, /Upcoming installment/);
  assert.match(reminderEmail, new RegExp(`due ${due.toISOString().slice(0, 10)}`));
  assert.match(reminderEmail, /Remaining scheduled amount: PHP 10\.00/);
  assert.match(reminderEmail, /awaiting Finance review/);
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

test('staff tasks enforce ownership, private evidence, objective lateness and human KPI review', async () => {
  await db.loginAttempt.deleteMany({ where: { key: { in: [
    'login-ip:127.0.0.1',
    ...(['OWNER', 'HR_PAYROLL', 'CORE_HANDLER', 'CS_TEAM', 'CUSTOMER'] as const)
      .map((role) => `login-email:${emails.get(role)}`),
  ].map(tokenHash) } } });
  const owner = await new Session().login('OWNER');
  const hr = await new Session().login('HR_PAYROLL');
  const handler = await new Session().login('CORE_HANDLER');
  const otherStaff = await new Session().login('CS_TEAM');
  const customer = await new Session().login('CUSTOMER');
  assert.equal((await customer.request('/tasks')).status, 403);
  assert.equal((await otherStaff.request('/tasks/assignees')).status, 403);
  assert.equal((await hr.request('/tasks/assignees')).status, 200);

  const assignment = { title: `Check stock ${suffix}`, instructions: 'Count the units and report the result.',
    assigneeId: accounts.get('CORE_HANDLER'), priority: 'HIGH', deadline: new Date(Date.now() + 3_600_000).toISOString() };
  const createdResponse = await owner.request('/tasks', post(assignment));
  assert.equal(createdResponse.status, 201);
  const firstTask = await createdResponse.json();
  assert.equal(firstTask.status, 'TODO');
  assert.equal((await otherStaff.request(`/tasks/${firstTask.id}`)).status, 404);
  assert.equal((await customer.request(`/tasks/${firstTask.id}`)).status, 403);
  assert.equal((await (await handler.request('/tasks')).json()).results.some((task: { id: string }) => task.id === firstTask.id), true);
  assert.equal((await otherStaff.request(`/tasks/${firstTask.id}/start`, patch({ version: 1 }))).status, 404);
  const started = await handler.request(`/tasks/${firstTask.id}/start`, patch({ version: 1 }));
  assert.equal(started.status, 200);
  assert.equal((await started.json()).version, 2);
  assert.equal((await handler.request(`/tasks/${firstTask.id}/start`, patch({ version: 1 }))).status, 409);
  assert.equal((await handler.upload(`/tasks/${firstTask.id}/submit`, (() => {
    const data = new FormData(); data.set('version', '2'); data.set('report', ''); return data;
  })())).status, 400);
  const invalid = new FormData(); invalid.set('version', '2'); invalid.set('report', 'Counted.');
  invalid.set('attachment', new Blob(['not an image'], { type: 'image/png' }), 'fake.png');
  assert.equal((await handler.upload(`/tasks/${firstTask.id}/submit`, invalid)).status, 400);
  const valid = new FormData(); valid.set('version', '2'); valid.set('report', 'Counted 12 units.');
  valid.set('attachment', new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1])], { type: 'image/png' }), 'count.png');
  const submittedResponse = await handler.upload(`/tasks/${firstTask.id}/submit`, valid);
  assert.equal(submittedResponse.status, 200);
  const submitted = await submittedResponse.json();
  assert.equal(submitted.status, 'SUBMITTED');
  assert.equal(submitted.lateFlag, false);
  assert.equal((await handler.upload(`/tasks/${firstTask.id}/submit`, valid)).status, 409);
  assert.equal((await otherStaff.request(`/tasks/${firstTask.id}/attachment`)).status, 404);
  assert.equal((await owner.request(`/tasks/${firstTask.id}/attachment`)).status, 200);
  assert.equal((await handler.request(`/tasks/${firstTask.id}/attachment`)).status, 200);
  assert.equal((await owner.request(`/tasks/${firstTask.id}/complete`, post({ version: submitted.version }))).status, 200);

  const lateResponse = await owner.request('/tasks', post({ ...assignment, title: `Late stock check ${suffix}` }));
  assert.equal(lateResponse.status, 201);
  const lateTask = await lateResponse.json();
  await db.task.update({ where: { id: lateTask.id }, data: { deadline: new Date(Date.now() - 3_600_000) } });
  const lateForm = new FormData(); lateForm.set('version', '1'); lateForm.set('report', 'Counted after the deadline.');
  const lateSubmittedResponse = await handler.upload(`/tasks/${lateTask.id}/submit`, lateForm);
  assert.equal(lateSubmittedResponse.status, 200);
  const lateSubmitted = await lateSubmittedResponse.json();
  assert.equal(lateSubmitted.lateFlag, true);
  assert.equal((await owner.request(`/tasks/${lateTask.id}/complete`, post({ version: lateSubmitted.version }))).status, 409);
  assert.equal((await otherStaff.request('/kpi/queue')).status, 403);
  const queue = await (await hr.request('/kpi/queue')).json();
  assert.ok(queue.results.some((task: { id: string }) => task.id === lateTask.id));
  const reviewInput = { taskId: lateTask.id, version: lateSubmitted.version,
    evaluation: 'Delivery was delayed by the late inventory handover.',
    recommendation: 'Discuss the handover process with the team.', decision: 'NOTED' };
  assert.equal((await otherStaff.request('/kpi/reviews', post(reviewInput))).status, 403);
  const reviewedResponse = await hr.request('/kpi/reviews', post(reviewInput));
  assert.equal(reviewedResponse.status, 201);
  const reviewed = await reviewedResponse.json();
  assert.match(reviewed.factualEvidence, /LATE/);
  assert.equal((await hr.request('/kpi/reviews', post(reviewInput))).status, 409);
  const taskAfterReview = await (await owner.request(`/tasks/${lateTask.id}`)).json();
  assert.equal(taskAfterReview.reviewed, true);
  assert.equal(taskAfterReview.review.evaluation, reviewInput.evaluation);
  assert.equal((await owner.request(`/tasks/${lateTask.id}/complete`, post({ version: taskAfterReview.version }))).status, 200);
  assert.ok(!(await (await hr.request('/kpi/queue')).json()).results.some((task: { id: string }) => task.id === lateTask.id));
  assert.ok((await (await hr.request('/kpi/reviews')).json()).results.some((item: { taskId: string }) => item.taskId === lateTask.id));
  assert.equal((await db.auditEntry.count({ where: { recordId: lateTask.id, entity: 'task' } })), 4);
});

test('record details and history enforce role permissions, field minimization and bounded pagination', async () => {
  const owner = await new Session().login('OWNER');
  const records = await new Session().login('RECORDS');
  const input = { code: `EDIT-HISTORY-${suffix}`, model: 'Original phone', status: 'ACTIVE',
    startDate: '2026-09-01', endDate: '2027-03-01', contractPrice: '120.00', installmentCount: 3, cadence: 'MONTHLY' };
  const batch = await (await owner.request('/batches', post(input))).json();
  assert.equal(batch.termsLocked, false);
  assert.equal('clients' in batch, false);
  const clientInput = { name: 'History customer', email: '', phone: '+63 900 000 0009', batchId: batch.id,
    status: 'ACTIVE', releaseStatus: 'NOT_READY', joinedAt: '2026-09-02' };
  const client = await (await records.request('/clients', post(clientInput))).json();
  assert.equal(client.scheduleIssued, true);
  assert.equal((await (await owner.request(`/batches/${batch.id}`)).json()).termsLocked, true);
  const matrixPasswordHash = await hashPassword(password);
  for (const role of roles) {
    // Earlier account-recovery tests intentionally change/revoke the shared customer account.
    const email = `${suffix}-edit-matrix-${role.toLowerCase()}@example.test`;
    await db.user.create({ data: { name: `Matrix ${role}`, email, passwordHash: matrixPasswordHash, role,
      ...(role === 'CUSTOMER' ? { clientId: client.id } : {}) } });
    const session = new Session();
    assert.equal((await session.request('/auth/login', post({ email, password }))).status, 200);
    for (const [route, permission] of [
      [`/batches/${batch.id}`, 'BATCH_READ'], [`/batches/${batch.id}/history`, 'BATCH_MANAGE'],
      [`/clients/${client.id}/history`, 'CLIENT_MANAGE'],
    ] as const) assert.equal((await session.request(route)).status,
      role === 'CORE_HANDLER' && route === `/batches/${batch.id}` ? 404 : rolePermissions[role].includes(permission) ? 200 : 403, `${role} ${route}`);
    if (!rolePermissions[role].includes('CLIENT_MANAGE'))
      assert.equal((await session.request(`/clients/${client.id}`, patch({ version: client.version, record: clientInput }))).status, 403);
    await session.request('/auth/logout', post({}));
  }
  assert.equal((await new Session().request(`/clients/${client.id}/history`)).status, 401);
  const edited = await records.request(`/clients/${client.id}`, patch({ version: client.version,
    record: { ...clientInput, name: 'Corrected name', phone: '+63 900 000 0010' } }));
  assert.equal(edited.status, 200);
  const history = await (await records.request(`/clients/${client.id}/history`)).json();
  const entry = history.items.find((item: { action: string }) => item.action === 'client.updated');
  assert.equal(entry.actor.name, 'Test RECORDS');
  assert.deepEqual(entry.changes, [
    { field: 'name', label: 'Full name', before: 'History customer', after: 'Corrected name' },
    { field: 'phone', label: 'Contact number', before: '+63 900 000 0009', after: '+63 900 000 0010' },
  ]);
  assert.equal(history.items.some((item: { action: string }) => item.action === 'schedule.generated'), true);
  assert.equal(JSON.stringify(history).includes('passwordHash'), false);
  // Even unexpected private snapshot keys must never be returned by this endpoint.
  await db.auditEntry.createMany({ data: Array.from({ length: 22 }, (_, index) => ({
    actorId: accounts.get('OWNER')!, action: 'batch.updated', entity: 'batch', recordId: batch.id,
    before: { model: `Before ${index}`, passwordHash: 'never-expose-this', privateUrl: 'private-file-url' },
    after: { model: `After ${index}`, account: { secret: 'private-account' } },
  })) });
  const first = await (await owner.request(`/batches/${batch.id}/history`)).json();
  const next = await (await owner.request(`/batches/${batch.id}/history?page=2`)).json();
  assert.equal(first.total, 23);
  assert.equal(first.items.length, 20);
  assert.equal(next.items.length, 3);
  assert.equal(first.items.some((item: { id: string }) => next.items.some((other: { id: string }) => item.id === other.id)), false);
  assert.doesNotMatch(JSON.stringify(first), /never-expose|private-file|private-account|"before":\{/);
  for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=100001', 'unexpected=true'])
    assert.equal((await owner.request(`/batches/${batch.id}/history?${query}`)).status, 400);
  assert.equal((await owner.request(`/batches/${randomUUID()}/history`)).status, 404);
  assert.equal((await owner.request('/batches/not-a-uuid/history')).status, 400);
});

test('client edits reject stale concurrent drafts and preserve schedules and verified balances', async () => {
  const owner = await new Session().login('OWNER');
  const records = await new Session().login('RECORDS');
  const input = { name: 'Concurrent edit client', email: `${suffix}-edit@example.test`, phone: '+63 900 555 0001',
    batchId, status: 'ACTIVE', releaseStatus: 'NOT_READY', joinedAt: '2026-09-02', unitModel: 'Original unit' };
  const client = await (await owner.request('/clients', post(input))).json();
  const claim = await (await owner.request('/payments', post({ clientId: client.id, amount: '10.00',
    paymentDate: '2026-09-02', method: 'Cash' }))).json();
  assert.equal((await owner.request(`/payments/${claim.id}/verify`, post({ version: claim.version, decision: 'VERIFIED', notes: 'Checked cash receipt' }))).status, 200);
  const schedule = await (await owner.request(`/clients/${client.id}/schedule`)).json();
  const balance = await (await owner.request(`/clients/${client.id}/balance`)).json();
  const attempts = await Promise.all([
    owner.request(`/clients/${client.id}`, patch({ version: client.version, record: { ...input, name: 'Owner correction' } })),
    records.request(`/clients/${client.id}`, patch({ version: client.version, record: { ...input, name: 'Records correction' } })),
  ]);
  assert.deepEqual(attempts.map((response) => response.status).sort(), [200, 409]);
  const winner = await attempts.find((response) => response.status === 200)!.json();
  const current = await (await owner.request(`/clients/${client.id}`)).json();
  assert.equal(current.name, winner.name);
  assert.equal(current.phone, input.phone);
  assert.equal(current.version, client.version + 1);
  assert.equal(await db.auditEntry.count({ where: { entity: 'client', recordId: client.id, action: 'client.updated' } }), 1);
  assert.deepEqual(await (await owner.request(`/clients/${client.id}/schedule`)).json(), schedule);
  assert.deepEqual(await (await owner.request(`/clients/${client.id}/balance`)).json(), balance);
  assert.equal((await owner.request(`/clients/${client.id}`, patch({ version: current.version,
    record: { ...input, remainingBalance: '0.00' } }))).status, 400);
});

test('agent directory permissions, optimistic updates and privacy match the public verification contract', async () => {
  const owner = await new Session().login('OWNER');
  const input = { name: `Recognized Agent ${suffix}`, code: `FP-AGENT-${suffix}`, active: true };
  const response = await owner.request('/agents', post(input));
  assert.equal(response.status, 201);
  const agent = await response.json();
  assert.equal(agent.code, input.code.toUpperCase());
  const hash = await hashPassword(password);
  const customerClient = await db.client.create({ data: { name: 'Agent matrix customer', email: '', phone: '', batchId } });
  for (const role of roles) {
    const email = `${suffix}-agent-matrix-${role.toLowerCase()}@example.test`;
    await db.user.create({ data: { name: `Agent matrix ${role}`, email, passwordHash: hash, role,
      ...(role === 'CUSTOMER' ? { clientId: customerClient.id } : {}) } });
    const session = new Session();
    assert.equal((await session.request('/auth/login', post({ email, password }))).status, 200);
    for (const route of ['/agents', `/agents/${agent.id}`])
      assert.equal((await session.request(route)).status, rolePermissions[role].includes('AGENT_MANAGE') ? 200 : 403, `${role} ${route}`);
    assert.equal((await session.request(`/batches/${randomUUID()}/assignments`, patch({ version: 1, handlerId: null, agentId: null }))).status,
      rolePermissions[role].includes('BATCH_MANAGE') ? 404 : 403, `${role} batch assignment`);
    if (!rolePermissions[role].includes('AGENT_MANAGE')) {
      assert.equal((await session.request('/agents', post(input))).status, 403);
      assert.equal((await session.request(`/agents/${agent.id}`, patch({ version: 1, record: input }))).status, 403);
    }
    await session.request('/auth/logout', post({}));
  }
  assert.equal((await new Session().request('/agents')).status, 401);
  assert.equal((await owner.request('/agents', post(input))).status, 409);
  assert.equal((await owner.request('/agents', post({ ...input, phone: 'private' }))).status, 400);
  assert.equal((await owner.request('/agents?page=0')).status, 400);
  const found = await (await new Session().request(`/agents/verify?q=${encodeURIComponent(input.code)}`)).json();
  assert.deepEqual(Object.keys(found).sort(), ['agent_code', 'found', 'full_name', 'is_active']);
  assert.equal(found.full_name, input.name);
  assert.notEqual(found.agent_code, agent.code);
  assert.match(found.agent_code, /^FP\*+[A-Z0-9]{2}$/);
  assert.equal((await (await new Session().request(`/agents/verify?q=${encodeURIComponent(input.name.toLowerCase())}`)).json()).found, true);
  assert.deepEqual(await (await new Session().request('/agents/verify?q=Recognized')).json(), { found: false });
  const attempts = await Promise.all([
    owner.request(`/agents/${agent.id}`, patch({ version: 1, record: { ...input, active: false } })),
    owner.request(`/agents/${agent.id}`, patch({ version: 1, record: { ...input, active: false } }), secondBase),
  ]);
  assert.deepEqual(attempts.map((item) => item.status).sort(), [200, 409]);
  assert.equal(await db.auditEntry.count({ where: { entity: 'agent', recordId: agent.id, action: 'agent.updated' } }), 1);
  assert.equal((await (await new Session().request(`/agents/verify?q=${input.code}`)).json()).is_active, false);
  assert.ok((await (await owner.request(`/agents?status=INACTIVE&q=${suffix}`)).json()).items.some((item: { id: string }) => item.id === agent.id));
  await owner.request('/agents', post({ ...input, code: `SECOND-${suffix}` }));
  assert.deepEqual(await (await new Session().request(`/agents/verify?q=${encodeURIComponent(input.name)}`)).json(), { found: false });
});

test('batch assignments restrict every handler read and filter, preserve schedules, and audit names atomically', async () => {
  const owner = await new Session().login('OWNER');
  const hash = await hashPassword(password);
  const handlers = await Promise.all(['one', 'two', 'inactive'].map((key) => db.user.create({ data: {
    name: `Assigned handler ${key}`, email: `${suffix}-assigned-${key}@example.test`, role: 'CORE_HANDLER',
    active: key !== 'inactive', passwordHash: hash,
  } })));
  const handler = new Session();
  assert.equal((await handler.request('/auth/login', post({ email: handlers[0].email, password }))).status, 200);
  const batches = await Promise.all(['one', 'two', 'three'].map(async (key) => {
    const result = await owner.request('/batches', post({ code: `ASSIGNED-${key}-${suffix}`, model: 'Assignment unit', status: 'ACTIVE',
      startDate: '2026-09-01', endDate: '2027-03-01', contractPrice: '100.00', installmentCount: 3, cadence: 'MONTHLY' }));
    assert.equal(result.status, 201); return result.json();
  }));
  const clients = await Promise.all(batches.map(async (batch, index) => {
    const result = await owner.request('/clients', post({ name: `Assigned customer ${index}`, email: '', phone: '', batchId: batch.id,
      status: 'ACTIVE', releaseStatus: 'READY' }));
    assert.equal(result.status, 201); return result.json();
  }));
  const agents = await Promise.all(['one', 'two', 'inactive'].map(async (key) => {
    const result = await owner.request('/agents', post({ name: `Assignment agent ${key}`, code: `ASSIGN-AGENT-${key}-${suffix}`, active: key !== 'inactive' }));
    assert.equal(result.status, 201); return result.json();
  }));
  const schedule = await (await owner.request(`/clients/${clients[0].id}/schedule`)).json();
  const balance = await (await owner.request(`/clients/${clients[0].id}/balance`)).json();
  const assignment = { version: 1, handlerId: handlers[0].id, agentId: agents[0].id };
  for (const invalid of [{ ...assignment, handlerId: handlers[2].id }, { ...assignment, handlerId: accounts.get('FINANCE_OFFICER') },
    { ...assignment, agentId: agents[2].id }, { ...assignment, agentId: randomUUID() },
    { ...assignment, version: 0 }, { ...assignment, extra: true }]) {
    assert.equal((await owner.request(`/batches/${batches[0].id}/assignments`, patch(invalid))).status, 400);
  }
  assert.equal((await handler.request(`/batches/${batches[0].id}/assignments`, patch(assignment))).status, 403);
  assert.equal((await handler.request(`/batches/${batches[0].id}`)).status, 404);
  const attempts = await Promise.all([
    owner.request(`/batches/${batches[0].id}/assignments`, patch(assignment)),
    owner.request(`/batches/${batches[0].id}/assignments`, patch(assignment), secondBase),
  ]);
  assert.deepEqual(attempts.map((item) => item.status).sort(), [200, 409]);
  assert.equal((await owner.request(`/batches/${batches[2].id}/assignments`, patch({ ...assignment, agentId: agents[1].id }))).status, 200);
  assert.equal(await db.auditEntry.count({ where: { entity: 'batch', recordId: batches[0].id, action: 'batch.assigned' } }), 1);
  const history = await (await owner.request(`/batches/${batches[0].id}/history`)).json();
  assert.deepEqual(history.items[0].changes, [
    { field: 'handlerId', label: 'Handler', before: null, after: handlers[0].name },
    { field: 'agentId', label: 'Agent', before: null, after: agents[0].name },
  ]);
  assert.doesNotMatch(JSON.stringify(history), /passwordHash|assigned-one@example|"clients":/);
  const visibleBatches = await (await handler.request('/batches')).json();
  assert.equal(visibleBatches.total, 2);
  assert.deepEqual(visibleBatches.items.map((item: { id: string }) => item.id).sort(), [batches[0].id, batches[2].id].sort());
  assert.equal((await (await handler.request('/clients')).json()).total, 2);
  assert.equal((await (await handler.request(`/clients?handlerId=${handlers[1].id}`)).json()).total, 0);
  assert.equal((await (await handler.request(`/batches?handlerId=${handlers[1].id}`)).json()).total, 0);
  for (const route of [`/batches?agentId=${agents[0].id}`, `/clients?agentId=${agents[0].id}`, `/clients?batchId=${batches[0].id}`])
    assert.equal((await (await handler.request(route)).json()).total, 1);
  assert.equal((await (await handler.request(`/clients?id=${clients[1].id}`)).json()).total, 0);
  assert.equal((await (await handler.request(`/batches?q=ASSIGNED-two-${suffix}`)).json()).total, 0);
  assert.equal((await (await handler.request('/clients?page=2')).json()).items.length, 0);
  for (const route of [`/batches/${batches[0].id}`, `/clients/${clients[0].id}`, `/clients/${clients[0].id}/schedule`, `/clients/${clients[0].id}/release-updates`])
    assert.equal((await handler.request(route)).status, 200, route);
  for (const route of [`/batches/${batches[1].id}`, `/clients/${clients[1].id}`, `/clients/${clients[1].id}/schedule`, `/clients/${clients[1].id}/release-updates`])
    assert.equal((await handler.request(route)).status, 404, route);
  for (const route of [`/batches/${batches[0].id}/history`, `/clients/${clients[0].id}/history`, '/accounts', '/agents', '/payments', '/reports/dashboard', `/clients/${clients[0].id}/documents`])
    assert.ok([403, 404].includes((await handler.request(route)).status), route);
  assert.equal((await handler.request(`/clients/${clients[0].id}/schedule`, post({}))).status, 403);
  assert.deepEqual(await (await handler.request('/overview')).json(), { activeBatches: 2, clients: 2, readyForRelease: 2, employees: null });
  const options = await (await handler.request('/records/assignment-options')).json();
  assert.deepEqual(options.handlers, [{ id: handlers[0].id, name: handlers[0].name, active: true }]);
  assert.deepEqual(options.agents.map((agent: { id: string }) => agent.id).sort(), [agents[0].id, agents[1].id].sort());
  assert.doesNotMatch(JSON.stringify(options), /email|code|password|phone/);
  assert.deepEqual(await (await owner.request(`/clients/${clients[0].id}/schedule`)).json(), schedule);
  assert.deepEqual(await (await owner.request(`/clients/${clients[0].id}/balance`)).json(), balance);
  // Existing inactive assignments stay intact; they cannot be selected for a different batch.
  assert.equal((await owner.request(`/agents/${agents[0].id}`, patch({ version: 1,
    record: { name: agents[0].name, code: agents[0].code, active: false } }))).status, 200);
  assert.equal((await owner.request(`/batches/${batches[0].id}/assignments`, patch({ ...assignment, version: 2 }))).status, 200);
  assert.equal((await owner.request(`/batches/${batches[1].id}/assignments`, patch(assignment))).status, 400);
  assert.equal((await owner.request(`/batches/${batches[0].id}/assignments`, patch({ version: 2, handlerId: null, agentId: null }))).status, 200);
  assert.equal((await handler.request(`/clients/${clients[0].id}/schedule`)).status, 404);
  assert.equal((await (await handler.request('/clients')).json()).total, 1);
  const cleared = await (await owner.request(`/batches/${batches[0].id}/history`)).json();
  assert.equal(cleared.items[0].changes[0].before, handlers[0].name);
  assert.equal(cleared.items[0].changes[0].after, null);
});

test('live events disclose only current assignments and invalidate the previous handler after reassignment', async () => {
  const owner = await new Session().login('OWNER');
  const hash = await hashPassword(password);
  const staff = await Promise.all(['previous', 'next'].map((key) => db.user.create({ data: {
    name: `Stream handler ${key}`, email: `${suffix}-stream-handler-${key}@example.test`, role: 'CORE_HANDLER', passwordHash: hash,
  } })));
  const [previous, next] = [new Session(), new Session()];
  for (const [index, session] of [previous, next].entries())
    assert.equal((await session.request('/auth/login', post({ email: staff[index].email, password }))).status, 200);
  const batch = await (await owner.request('/batches', post({ code: `STREAM-ASSIGNED-${suffix}`, model: 'Stream phone', status: 'ACTIVE',
    startDate: '2026-09-01', endDate: '2027-03-01', contractPrice: '100.00', installmentCount: 3, cadence: 'MONTHLY' }))).json();
  const clientInput = { name: 'Stream client', email: '', phone: '', batchId: batch.id, status: 'ACTIVE', releaseStatus: 'NOT_READY' };
  const client = await (await owner.request('/clients', post(clientInput))).json();
  assert.equal((await owner.request(`/batches/${batch.id}/assignments`, patch({ version: 1, handlerId: staff[0].id, agentId: null }))).status, 200);
  const oldFeed = await stream(previous);
  const newFeed = await stream(next, secondBase);
  try {
    assert.equal((await owner.request(`/batches/${batch.id}/assignments`, patch({ version: 2, handlerId: staff[1].id, agentId: null }))).status, 200);
    await oldFeed.wait(() => oldFeed.text.includes(`"entity":"record-access","recordId":"${staff[0].id}"`));
    await newFeed.wait(() => newFeed.text.includes(batch.id));
    assert.equal((await owner.request(`/clients/${client.id}`, patch({ version: 1, record: { ...clientInput, name: 'Stream correction' } }))).status, 200);
    await newFeed.wait(() => newFeed.text.includes(client.id));
    assert.equal(oldFeed.text.includes(batch.id), false);
    assert.equal(oldFeed.text.includes(client.id), false);
    assert.equal((await previous.request(`/clients/${client.id}`)).status, 404);
    assert.equal((await next.request(`/clients/${client.id}/schedule`)).status, 200);
    assert.equal((await (await previous.request('/overview')).json()).clients, 0);
    assert.equal((await next.request(`/batches/${batch.id}/assignments`, patch({ version: 3, handlerId: staff[0].id, agentId: null }))).status, 403);
  } finally { await oldFeed.close(); await newFeed.close(); }
});

async function alertAccount(key: string, role: Role = 'FINANCE_OFFICER') {
  const linkedClient = role === 'CUSTOMER' ? await db.client.create({ data: { name: 'Alert matrix customer', email: '', phone: '', batchId } }) : null;
  const user = await db.user.create({ data: { name: `Alert reviewer ${key}`, email: `${suffix}-alert-${key.toLowerCase()}@example.test`,
    role, hrConfidentialAccess: role === 'HR_PAYROLL', passwordHash: await hashPassword(password), clientId: linkedClient?.id ?? null } });
  const session = new Session();
  assert.equal((await session.request('/auth/login', post({ email: user.email, password }))).status, 200);
  return { user, session };
}
async function resetAlertLoginLimit() {
  await db.loginAttempt.deleteMany({ where: { key: tokenHash('login-ip:127.0.0.1') } });
}
type AlertSnapshot = { items: { id: string; version: number; readAt: string | null; targetPath: string }[];
  total: number; pendingCount: number; unreadCount: number; pageSize: number };
async function alertSnapshot(session: Session, query = '', apiBase = base): Promise<AlertSnapshot> {
  const response = await session.request(`/staff/finance-alerts${query}`, {}, apiBase);
  assert.equal(response.status, 200);
  return response.json();
}

test('Finance alerts enforce every role, origin, strict input and current reviewer permissions', async () => {
  await resetAlertLoginLimit();
  const payment = await db.payment.create({ data: { clientId: firstClient, batchId, amount: '2.00',
    paymentDate: new Date('2026-10-06'), method: 'GCash', recordedById: accounts.get('RECORDS')! } });
  const anonymous = new Session();
  for (const [path, options] of [['/staff/finance-alerts', {}], ['/staff/finance-alerts/read-all', post({})],
    [`/staff/finance-alerts/${payment.id}/read`, post({ version: 1 })]] as const)
    assert.equal((await anonymous.request(path, options)).status, 401);
  for (const role of roles) {
    const { session } = await alertAccount(`matrix-${role}`, role);
    const permitted = rolePermissions[role].includes('PAYMENT_VERIFY');
    assert.equal((await session.request('/staff/finance-alerts')).status, permitted ? 200 : 403, role);
    assert.equal((await session.request(`/staff/finance-alerts/${payment.id}/read`, post({ version: 1 }))).status, permitted ? 200 : 403, role);
    assert.equal((await session.request('/staff/finance-alerts/read-all', post({}))).status, permitted ? 200 : 403, role);
  }
  const { session, user } = await alertAccount('strict');
  for (const query of ['?page=0', '?page=100001', '?unreadOnly=yes', '?userId=foreign'])
    assert.equal((await session.request(`/staff/finance-alerts${query}`)).status, 400);
  for (const body of [{}, { version: 0 }, { version: 1, userId: accounts.get('OWNER') }])
    assert.equal((await session.request(`/staff/finance-alerts/${payment.id}/read`, post(body))).status, 400);
  assert.equal((await session.request('/staff/finance-alerts/not-a-uuid/read', post({ version: 1 }))).status, 400);
  assert.equal((await session.request(`/staff/finance-alerts/${randomUUID()}/read`, post({ version: 1 }))).status, 404);
  assert.equal((await session.request('/staff/finance-alerts/read-all', { ...post({}), headers: { Origin: 'https://forged.example' } })).status, 403);
  const staleUser = await (await session.request('/auth/me')).json();
  await db.user.update({ where: { id: user.id }, data: { role: 'RECORDS' } });
  assert.equal((await session.request('/staff/finance-alerts')).status, 401);
  await assert.rejects(app.get(FinanceAlertsService).readAll(staleUser), /Your access has changed/);
  assert.equal(await db.financeAlertRead.count({ where: { userId: user.id } }), 0);
  await db.payment.delete({ where: { id: payment.id } });
});

test('Finance pending backlog is paginated, private per reviewer and reads leave all financial records untouched', async () => {
  await resetAlertLoginLimit();
  const first = await alertAccount('backlog-one');
  const other = await alertAccount('backlog-two');
  const ids: string[] = Array.from({ length: 25 }, () => randomUUID());
  await db.payment.createMany({ data: ids.map((id) => ({ id, clientId: firstClient, batchId, amount: '1.23',
    paymentDate: new Date('2026-10-06'), method: 'GCash', recordedById: accounts.get('RECORDS')!,
    receiptPhone: 'private-receipt-number', referenceNumber: 'private-reference', notes: 'private-note',
    updatedAt: new Date('2040-01-01') })) });
  try {
    const pending = await db.payment.count({ where: { status: 'PENDING' } });
    const initial = await alertSnapshot(first.session);
    const next = await alertSnapshot(first.session, '?page=2', secondBase);
    assert.equal(initial.pendingCount, pending);
    assert.equal(initial.unreadCount, pending);
    assert.equal(initial.pageSize, 20);
    assert.equal(initial.items.length, 20);
    assert.ok(initial.items.every((item) => ids.includes(item.id) && item.readAt === null));
    assert.equal(new Set([...initial.items, ...next.items].map((item) => item.id)).size, initial.items.length + next.items.length);
    assert.ok(ids.every((id) => [...initial.items, ...next.items].some((item) => item.id === id)));
    assert.doesNotMatch(JSON.stringify(initial), /private-receipt-number|private-reference|private-note|storageKey|passwordHash/);
    const target = initial.items[0];
    assert.equal(target.targetPath, `/system/payments?payment=${target.id}`);
    const before = await db.payment.findMany({ where: { id: { in: ids } }, orderBy: { id: 'asc' } });
    const auditCount = await db.auditEntry.count();
    const notificationCount = await db.notification.count();
    const balanceBefore = await (await first.session.request(`/clients/${firstClient}/balance`)).json();
    const single = await first.session.request(`/staff/finance-alerts/${target.id}/read`, post({ version: target.version }), secondBase);
    assert.equal(single.status, 200);
    const receipt = await single.json();
    const repeated = await (await first.session.request(`/staff/finance-alerts/${target.id}/read`, post({ version: target.version }))).json();
    assert.equal(repeated.readAt, receipt.readAt);
    assert.equal((await alertSnapshot(first.session, '?unreadOnly=true')).unreadCount, pending - 1);
    assert.equal((await alertSnapshot(other.session)).unreadCount, pending);
    const all = await first.session.request('/staff/finance-alerts/read-all', post({}), secondBase);
    assert.equal(all.status, 200);
    assert.equal((await all.json()).updated, pending - 1);
    assert.deepEqual(await (await first.session.request('/staff/finance-alerts/read-all', post({}))).json(), { updated: 0 });
    const unread = await alertSnapshot(first.session, '?unreadOnly=true');
    assert.equal(unread.items.length, 0);
    assert.equal(unread.unreadCount, 0);
    assert.equal(unread.pendingCount, pending);
    assert.equal((await alertSnapshot(first.session)).total, pending);
    assert.equal((await alertSnapshot(other.session)).unreadCount, pending);
    assert.deepEqual(await db.payment.findMany({ where: { id: { in: ids } }, orderBy: { id: 'asc' } }), before);
    assert.deepEqual(await (await first.session.request(`/clients/${firstClient}/balance`)).json(), balanceBefore);
    assert.equal(await db.auditEntry.count(), auditCount);
    assert.equal(await db.notification.count(), notificationCount);
  } finally { await db.payment.deleteMany({ where: { id: { in: ids } } }); }
  assert.equal(await db.financeAlertRead.count({ where: { paymentId: { in: ids } } }), 0);
});

test('pending Finance alerts become unread on correction/proof, reappear after clarification and leave after decisions', async () => {
  await resetAlertLoginLimit();
  const { session: finance, user } = await alertAccount('lifecycle');
  const records = await new Session().login('RECORDS');
  assert.equal((await finance.request('/staff/finance-alerts/read-all', post({}))).status, 200);
  const input = { clientId: firstClient, amount: '3.50', paymentDate: '2026-10-06', method: 'GCash', referenceNumber: `ALERT-${suffix}` };
  const create = await records.request('/payments', post(input));
  assert.equal(create.status, 201);
  const payment = await create.json();
  const pending = (await alertSnapshot(finance)).pendingCount;
  assert.equal((await alertSnapshot(finance)).unreadCount, 1);
  const readPath = `/staff/finance-alerts/${payment.id}/read`;
  assert.equal((await finance.request(readPath, post({ version: 1 }))).status, 200);
  assert.equal((await alertSnapshot(finance)).unreadCount, 0);
  const correction = await records.request(`/payments/${payment.id}`, patch({ version: 1, record: { ...input, amount: '3.75' } }), secondBase);
  assert.equal(correction.status, 200);
  assert.equal((await alertSnapshot(finance)).unreadCount, 1);
  assert.equal((await finance.request(readPath, post({ version: 1 }))).status, 409);
  assert.equal((await db.financeAlertRead.findUniqueOrThrow({ where: { userId_paymentId: { userId: user.id, paymentId: payment.id } } })).seenVersion, 1);
  assert.equal((await finance.request(readPath, post({ version: 2 }))).status, 200);
  const proof = new FormData();
  proof.append('proof', new Blob([Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), Buffer.from('alert-private-proof')])],
    { type: 'image/png' }), 'alert.png');
  assert.equal((await records.upload(`/payments/${payment.id}/proof`, proof)).status, 201);
  assert.equal((await alertSnapshot(finance)).unreadCount, 1);
  assert.equal((await finance.request(readPath, post({ version: 2 }))).status, 409);
  assert.equal((await finance.request(`/payments/${payment.id}/verify`, post({ version: 3, decision: 'NEEDS_CLARIFICATION', notes: 'Please confirm the reference.' }))).status, 200);
  assert.equal((await alertSnapshot(finance)).pendingCount, pending - 1);
  assert.equal((await alertSnapshot(finance)).unreadCount, 0);
  assert.equal((await finance.request(readPath, post({ version: 3 }))).status, 404);
  assert.equal((await records.request(`/payments/${payment.id}`, patch({ version: 4, record: { ...input, amount: '3.75', referenceNumber: `ALERT-FIXED-${suffix}` } }))).status, 200);
  assert.equal((await alertSnapshot(finance)).unreadCount, 1);
  const balanceBefore = await (await finance.request(`/clients/${firstClient}/balance`)).json();
  assert.equal((await finance.request('/staff/finance-alerts/read-all', post({}))).status, 200);
  assert.equal((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status, 'PENDING');
  assert.equal((await finance.request(`/payments/${payment.id}/verify`, post({ version: 5, decision: 'VERIFIED', notes: 'Matched the external transaction.' }))).status, 200);
  const balanceAfter = await (await finance.request(`/clients/${firstClient}/balance`)).json();
  assert.equal(Number(balanceAfter.verifiedPaid) - Number(balanceBefore.verifiedPaid), 3.75);
  assert.equal((await alertSnapshot(finance)).pendingCount, pending - 1);
  assert.equal((await finance.request(readPath, post({ version: 5 }))).status, 404);
  const rejected = await (await records.request('/payments', post({ ...input, referenceNumber: `ALERT-REJECT-${suffix}` }))).json();
  assert.equal((await alertSnapshot(finance)).unreadCount, 1);
  assert.equal((await finance.request(`/payments/${rejected.id}/verify`, post({ version: 1, decision: 'REJECTED', notes: 'External transaction does not match.' }))).status, 200);
  assert.equal((await alertSnapshot(finance)).unreadCount, 0);
});

test('Finance alert reads refresh only the same reviewer across instances and serialize with payment corrections', async () => {
  await resetAlertLoginLimit();
  const first = await alertAccount('stream-one');
  const other = await alertAccount('stream-two');
  const records = await new Session().login('RECORDS');
  const ownFeed = await stream(first.session, secondBase);
  const otherFeed = await stream(other.session);
  const recordsFeed = await stream(records, secondBase);
  try {
    const input = { clientId: firstClient, amount: '1.00', paymentDate: '2026-10-06', method: 'GCash', referenceNumber: `ALERT-STREAM-${suffix}` };
    const created = await records.request('/payments', post(input));
    assert.equal(created.status, 201);
    const payment = await created.json();
    await ownFeed.wait(() => ownFeed.text.includes(payment.id));
    await otherFeed.wait(() => otherFeed.text.includes(payment.id));
    assert.equal((await first.session.request(`/staff/finance-alerts/${payment.id}/read`, post({ version: 1 }))).status, 200);
    await ownFeed.wait(() => ownFeed.text.includes(`"entity":"finance-alert-read","recordId":"${first.user.id}"`));
    assert.equal(otherFeed.text.includes('finance-alert-read'), false);
    assert.equal(recordsFeed.text.includes('finance-alert-read'), false);
    const concurrent = await Promise.all([
      first.session.request('/staff/finance-alerts/read-all', post({}), secondBase),
      records.request(`/payments/${payment.id}`, patch({ version: 1, record: { ...input, amount: '1.25' } })),
    ]);
    assert.deepEqual(concurrent.map((response) => response.status), [200, 200]);
    const current = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    const receipt = await db.financeAlertRead.findUniqueOrThrow({ where: { userId_paymentId: { userId: first.user.id, paymentId: payment.id } } });
    assert.equal(current.version, 2);
    assert.ok(receipt.seenVersion <= current.version);
    const queue = await alertSnapshot(first.session, '?unreadOnly=true');
    assert.equal(queue.items.some((item) => item.id === payment.id), receipt.seenVersion < current.version);
    await ownFeed.wait(() => ownFeed.text.match(new RegExp(payment.id, 'g'))!.length >= 2);
    assert.equal(otherFeed.text.includes('finance-alert-read'), false);
    assert.equal(recordsFeed.text.includes('finance-alert-read'), false);
  } finally { await Promise.all([ownFeed.close(), otherFeed.close(), recordsFeed.close()]); }
});

async function staffAlertSnapshot(session: Session, query = '', apiBase = base): Promise<StaffAlertPage> {
  const response = await session.request(`/staff/alerts${query}`, {}, apiBase);
  assert.equal(response.status, 200);
  return response.json();
}
function staffRead(alert: StaffAlert): RequestInit {
  return post(alert.entity === 'payment' ? { entity: 'payment', version: alert.version }
    : alert.entity === 'payment-result' ? { entity: 'payment-result' }
    : alert.entity === 'support' ? { entity: 'support' }
    : alert.entity === 'account' ? { entity: 'account' }
    : { entity: 'task', kind: alert.kind, deadline: alert.deadline });
}
async function alertTask(assigneeId: string, title: string, deadline = new Date(Date.now() + 48 * 3_600_000)) {
  return db.task.create({ data: { title, instructions: 'Private task instructions', report: 'Private draft report',
    assigneeId, creatorId: accounts.get('OWNER')!, deadline } });
}

test('staff alerts enforce assignee isolation for every role and deny Finance/customer forgery', async () => {
  await resetAlertLoginLimit();
  const foreign = await alertAccount('task-foreign', 'CORE_HANDLER');
  const foreignTask = await alertTask(foreign.user.id, 'Other employee secret task');
  for (const role of roles) {
    const { user, session } = await alertAccount(`staff-matrix-${role}`, role);
    const own = role !== 'CUSTOMER' ? await alertTask(user.id, `Own alert ${role}`) : null;
    const list = await session.request('/staff/alerts');
    assert.equal(list.status, role === 'CUSTOMER' ? 403 : 200, role);
    if (own) {
      const snapshot: StaffAlertPage = await list.json();
      assert.equal(snapshot.taskCount, 1);
      assert.equal(snapshot.items.some((alert) => alert.id === foreignTask.id), false, role);
      const target = snapshot.items.find((alert) => alert.id === own.id)!;
      assert.equal((await session.request(`/staff/alerts/${own.id}/read`, staffRead(target))).status, 200);
      assert.equal((await session.request(`/staff/alerts/${foreignTask.id}/read`, post({
        entity: 'task', kind: 'TASK_ASSIGNED', deadline: foreignTask.deadline.toISOString(),
      }))).status, 404, role);
    }
    assert.equal((await session.request('/staff/alerts?scope=finance')).status, rolePermissions[role].includes('PAYMENT_VERIFY') ? 200 : 403, role);
    assert.equal((await session.request('/staff/alerts/read-all', post({ scope: 'tasks' }))).status, role === 'CUSTOMER' ? 403 : 200, role);
    assert.equal((await session.request('/staff/alerts/read-all', post({ scope: 'finance' }))).status, rolePermissions[role].includes('PAYMENT_VERIFY') ? 200 : 403, role);
  }
  const anonymous = new Session();
  assert.equal((await anonymous.request('/staff/alerts')).status, 401);
  assert.equal((await anonymous.request('/staff/alerts/read-all', post({}))).status, 401);
  const { user, session } = await alertAccount('staff-strict', 'CORE_HANDLER');
  const own = await alertTask(user.id, 'Strict alert');
  for (const query of ['?scope=customer', '?userId=foreign', '?page=0', '?unreadOnly=yes'])
    assert.equal((await session.request(`/staff/alerts${query}`)).status, 400);
  for (const body of [{ entity: 'task', kind: 'TASK_ASSIGNED' }, { entity: 'task', kind: 'TASK_ASSIGNED', deadline: own.deadline.toISOString(), userId: foreign.user.id },
    { entity: 'payment', version: 0 }])
    assert.equal((await session.request(`/staff/alerts/${own.id}/read`, post(body))).status, 400);
  assert.equal((await session.request('/staff/alerts/read-all', post({ scope: 'tasks', userId: foreign.user.id }))).status, 400);
  assert.equal((await session.request('/staff/alerts/read-all', { ...post({}), headers: { Origin: 'https://forged.example' } })).status, 403);
  const pending = await db.payment.findFirstOrThrow({ where: { status: 'PENDING' } });
  assert.equal((await session.request(`/staff/alerts/${pending.id}/read`, post({ entity: 'payment', version: pending.version }))).status, 403);
  const staleUser = await (await session.request('/auth/me')).json();
  await db.user.update({ where: { id: user.id }, data: { active: false } });
  await assert.rejects(app.get(StaffAlertsService).readAll(staleUser, 'tasks'), /Your access has changed/);
  assert.equal(await db.taskAlertRead.count({ where: { userId: user.id } }), 0);
  assert.equal((await session.request('/staff/alerts')).status, 401);
  const linked = await db.client.create({ data: { name: 'Former staff customer', email: '', phone: '', batchId } });
  await db.user.update({ where: { id: user.id }, data: { active: true, role: 'CUSTOMER', clientId: linked.id } });
  await assert.rejects(app.get(StaffAlertsService).readAll(staleUser, 'tasks'), /Staff access required/);
  assert.equal((await session.request('/staff/alerts')).status, 401);
});

test('task alert backlog pages safely and reminder SQL matches exact time boundaries across database timezones', async () => {
  await resetAlertLoginLimit();
  const { user, session } = await alertAccount('task-pages', 'CORE_HANDLER');
  const now = new Date('2030-01-02T04:00:00.000Z');
  const deadlines = [-1, 0, 86_400_000, 86_400_001].map((offset) => new Date(now.getTime() + offset));
  const boundary = await Promise.all(deadlines.map((deadline, index) => alertTask(user.id, `Boundary ${index}`, deadline)));
  const { taskAlertRows } = await import('../src/staff/alert-queries.js');
  for (const zone of ['UTC', 'Asia/Manila', 'America/New_York']) {
    const rows = await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL TIME ZONE '${zone}'`);
      return tx.$queryRaw<{ id: string; kind: string }[]>(taskAlertRows(user.id, now));
    });
    for (const task of boundary) assert.equal(rows.find((row) => row.id === task.id)!.kind, taskAlertKind(task.deadline, now), zone);
  }
  const ids: string[] = Array.from({ length: 25 }, () => randomUUID());
  await db.task.createMany({ data: ids.map((id, index) => ({ id, title: `Paged task ${index}`, assigneeId: user.id,
    creatorId: accounts.get('OWNER')!, deadline: new Date(Date.now() + 48 * 3_600_000),
    instructions: 'private-evidence-instructions', report: 'private-report-text' })) });
  const closed = await Promise.all((['SUBMITTED', 'DONE'] as const).map((status) => db.task.create({ data: {
    title: `Closed ${status}`, assigneeId: user.id, creatorId: accounts.get('OWNER')!, status,
    deadline: new Date(Date.now() - 3_600_000), submittedAt: new Date(), lateFlag: true,
  } })));
  const first = await staffAlertSnapshot(session, '?scope=tasks');
  const next = await staffAlertSnapshot(session, '?scope=tasks&page=2', secondBase);
  assert.equal(first.taskCount, 29);
  assert.equal(first.total, 29);
  assert.equal(first.items.length, 20);
  assert.equal(next.items.length, 9);
  assert.equal(new Set([...first.items, ...next.items].map((alert) => alert.id)).size, 29);
  assert.ok(closed.every((task) => ![...first.items, ...next.items].some((alert) => alert.id === task.id)));
  assert.doesNotMatch(JSON.stringify(first), /private-evidence-instructions|private-report-text|KpiReview|attachment|passwordHash/);
  assert.equal((await staffAlertSnapshot(session, '?scope=tasks&page=3')).items.length, 0);
});

test('task alerts retain reads on start, advance once at deadlines, and stop on submission without automatic KPI actions', async () => {
  await resetAlertLoginLimit();
  const assignee = await alertAccount('task-lifecycle', 'CORE_HANDLER');
  const owner = await new Session().login('OWNER');
  const deadline = new Date(Date.now() + 8000);
  const created = await owner.request('/tasks', post({ title: 'Deadline lifecycle', instructions: 'Submit the facts.',
    assigneeId: assignee.user.id, priority: 'HIGH', deadline: deadline.toISOString() }));
  assert.equal(created.status, 201);
  const task = await created.json();
  const first = await staffAlertSnapshot(assignee.session);
  const alert = first.items[0];
  assert.equal(alert.entity, 'task');
  assert.equal(alert.kind, 'TASK_DUE_SOON');
  assert.equal(alert.targetPath, `/system/tasks?task=${task.id}`);
  const before = await db.task.findUniqueOrThrow({ where: { id: task.id } });
  const auditCount = await db.auditEntry.count({ where: { recordId: task.id } });
  const notices = await db.notification.count();
  assert.equal((await assignee.session.request(`/staff/alerts/${task.id}/read`, staffRead(alert))).status, 200);
  const receipt = await db.taskAlertRead.findFirstOrThrow({ where: { taskId: task.id } });
  assert.equal((await assignee.session.request(`/staff/alerts/${task.id}/read`, staffRead(alert), secondBase)).status, 200);
  assert.equal((await db.taskAlertRead.findFirstOrThrow({ where: { taskId: task.id } })).readAt.getTime(), receipt.readAt.getTime());
  assert.deepEqual(await db.task.findUniqueOrThrow({ where: { id: task.id } }), before);
  assert.equal(await db.auditEntry.count({ where: { recordId: task.id } }), auditCount);
  assert.equal(await db.notification.count(), notices);
  assert.equal((await assignee.session.request(`/tasks/${task.id}/start`, patch({ version: 1 }))).status, 200);
  assert.equal((await staffAlertSnapshot(assignee.session)).unreadCount, 0);
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, deadline.getTime() - Date.now() + 40)));
  const overdue = (await staffAlertSnapshot(assignee.session)).items[0];
  assert.equal(overdue.kind, 'TASK_OVERDUE');
  assert.equal(overdue.readAt, null);
  assert.equal((await staffAlertSnapshot(assignee.session)).unreadCount, 1);
  assert.equal((await assignee.session.request(`/staff/alerts/${task.id}/read`, staffRead(alert))).status, 409);
  assert.equal((await db.task.findUniqueOrThrow({ where: { id: task.id } })).lateFlag, null);
  assert.equal(await db.kpiReview.count({ where: { taskId: task.id } }), 0);
  assert.equal((await assignee.session.request('/staff/alerts/read-all', post({ scope: 'tasks' }))).status, 200);
  assert.deepEqual(await (await assignee.session.request('/staff/alerts/read-all', post({ scope: 'tasks' }))).json(), { updated: 0 });
  const submit = new FormData(); submit.set('version', '2'); submit.set('report', 'Completed after deadline.');
  assert.equal((await assignee.session.upload(`/tasks/${task.id}/submit`, submit)).status, 200);
  assert.equal((await staffAlertSnapshot(assignee.session)).taskCount, 0);
  assert.equal((await assignee.session.request(`/staff/alerts/${task.id}/read`, staffRead(overdue))).status, 404);
  assert.equal(await db.kpiReview.count({ where: { taskId: task.id } }), 0);
  assert.equal((await owner.request(`/tasks/${task.id}/complete`, post({ version: 3 }))).status, 409);
  assert.equal(await db.taskAlertRead.count({ where: { taskId: task.id } }), 2);
  // A new deadline starts a fresh acknowledgement even when its reminder stage matches.
  const rescheduled = await alertTask(assignee.user.id, 'Changed deadline');
  const old = (await staffAlertSnapshot(assignee.session)).items[0];
  assert.equal((await assignee.session.request(`/staff/alerts/${rescheduled.id}/read`, staffRead(old))).status, 200);
  await db.task.update({ where: { id: rescheduled.id }, data: { deadline: new Date(Date.now() + 72 * 3_600_000), version: { increment: 1 } } });
  assert.equal((await staffAlertSnapshot(assignee.session)).unreadCount, 1);
  assert.equal((await assignee.session.request(`/staff/alerts/${rescheduled.id}/read`, staffRead(old))).status, 409);
  await db.task.delete({ where: { id: rescheduled.id } });
  assert.equal(await db.taskAlertRead.count({ where: { taskId: rescheduled.id } }), 0);
});

test('combined staff alerts share existing Finance receipts and mark-all respects its selected scope', async () => {
  await resetAlertLoginLimit();
  const first = await alertAccount('combined');
  const other = await alertAccount('combined-other');
  const tasks = await Promise.all(Array.from({ length: 3 }, (_, index) => alertTask(first.user.id, `Finance own task ${index}`)));
  const beforeTasks = await db.task.findMany({ where: { id: { in: tasks.map((task) => task.id) } } });
  const beforePayments = await db.payment.findMany({ orderBy: { id: 'asc' } });
  const financeBefore = await alertSnapshot(first.session);
  const initial = await staffAlertSnapshot(first.session);
  assert.equal(initial.taskCount, 3);
  assert.equal(initial.financeCount, financeBefore.pendingCount);
  assert.equal(initial.unreadCount, initial.financeCount + 3);
  const taskOnly = await staffAlertSnapshot(first.session, '?scope=tasks&unreadOnly=true');
  assert.equal(taskOnly.total, 3);
  assert.equal(taskOnly.unreadCount, initial.unreadCount);
  assert.equal(taskOnly.filteredUnreadCount, 3);
  assert.ok(taskOnly.items.every((alert) => alert.entity === 'task'));
  const financeOnly = await staffAlertSnapshot(first.session, '?scope=finance');
  assert.equal(financeOnly.total, financeBefore.pendingCount);
  assert.ok(financeOnly.items.every((alert) => alert.entity === 'payment'));
  const target = financeOnly.items[0];
  assert.equal((await first.session.request(`/staff/alerts/${target.id}/read`, staffRead(target))).status, 200);
  assert.equal((await alertSnapshot(first.session)).unreadCount, initial.financeCount - 1);
  assert.equal((await alertSnapshot(other.session)).unreadCount, initial.financeCount);
  const markTasks = await first.session.request('/staff/alerts/read-all', post({ scope: 'tasks' }), secondBase);
  assert.equal(markTasks.status, 200);
  assert.equal((await markTasks.json()).updated, 3);
  assert.equal((await staffAlertSnapshot(first.session, '?scope=tasks&unreadOnly=true')).total, 0);
  assert.equal((await alertSnapshot(first.session)).unreadCount, initial.financeCount - 1);
  assert.equal((await first.session.request('/staff/alerts/read-all', post({ scope: 'finance' }))).status, 200);
  assert.equal((await alertSnapshot(first.session)).unreadCount, 0);
  assert.equal((await staffAlertSnapshot(first.session)).unreadCount, 0);
  const extra = await alertTask(first.user.id, 'Another assigned task');
  assert.equal((await staffAlertSnapshot(first.session)).unreadCount, 1);
  assert.equal((await first.session.request('/staff/alerts/read-all', post({ scope: 'all' }))).status, 200);
  assert.equal((await staffAlertSnapshot(first.session)).unreadCount, 0);
  assert.deepEqual(await db.task.findMany({ where: { id: { in: tasks.map((task) => task.id) } } }), beforeTasks);
  assert.deepEqual(await db.payment.findMany({ orderBy: { id: 'asc' } }), beforePayments);
  await db.task.delete({ where: { id: extra.id } });
});

test('task assignment events and reads stay scoped across instances and serialize with submission', async () => {
  await resetAlertLoginLimit();
  const first = await alertAccount('task-stream-one', 'CORE_HANDLER');
  const other = await alertAccount('task-stream-other', 'CS_TEAM');
  const owner = await new Session().login('OWNER');
  const customer = await alertAccount('task-stream-customer', 'CUSTOMER');
  const ownFeed = await stream(first.session, secondBase);
  const foreignFeed = await stream(other.session);
  const ownerFeed = await stream(owner, secondBase);
  const customerFeed = await stream(customer.session, secondBase);
  try {
    const created = await owner.request('/tasks', post({ title: 'Live assigned task', instructions: 'Private event instructions',
      assigneeId: first.user.id, priority: 'MEDIUM', deadline: new Date(Date.now() + 48 * 3_600_000).toISOString() }));
    assert.equal(created.status, 201);
    const task = await created.json();
    await ownFeed.wait(() => ownFeed.text.includes(task.id));
    await ownerFeed.wait(() => ownerFeed.text.includes(task.id));
    assert.equal(foreignFeed.text.includes(task.id), false);
    assert.equal(customerFeed.text.includes(task.id), false);
    const alert = (await staffAlertSnapshot(first.session)).items[0];
    assert.equal((await first.session.request(`/staff/alerts/${task.id}/read`, staffRead(alert))).status, 200);
    await ownFeed.wait(() => ownFeed.text.includes(`"entity":"staff-alert-read","recordId":"${first.user.id}"`));
    assert.equal(ownerFeed.text.includes('staff-alert-read'), false);
    assert.equal(foreignFeed.text.includes('staff-alert-read'), false);
    assert.equal(customerFeed.text.includes('staff-alert-read'), false);
    const submit = new FormData(); submit.set('version', '1'); submit.set('report', 'Report without attachment');
    const concurrent = await Promise.all([
      first.session.request('/staff/alerts/read-all', post({ scope: 'tasks' }), secondBase),
      first.session.upload(`/tasks/${task.id}/submit`, submit),
    ]);
    assert.deepEqual(concurrent.map((response) => response.status), [200, 200]);
    await ownFeed.wait(() => (ownFeed.text.match(new RegExp(task.id, 'g')) ?? []).length >= 2);
    assert.equal((await staffAlertSnapshot(first.session)).activeCount, 0);
    assert.equal(await db.taskAlertRead.count({ where: { taskId: task.id } }), 1);
    assert.equal(foreignFeed.text.includes(task.id), false);
    assert.equal(customerFeed.text.includes(task.id), false);
    assert.doesNotMatch(ownFeed.text, /Private event instructions|Report without attachment/);
    await db.user.update({ where: { id: first.user.id }, data: { active: false } });
    await ownFeed.wait(() => ownFeed.ended);
    assert.equal((await first.session.request('/staff/alerts')).status, 401);
  } finally { await Promise.all([ownFeed.close(), foreignFeed.close(), ownerFeed.close(), customerFeed.close()]); }
});

async function recordedResultPayment(session: Session, clientId = firstClient, amount = '25.00') {
  const input = { clientId, amount, paymentDate: '2026-10-06', method: 'GCash', referenceNumber: randomUUID() };
  const response = await session.request('/payments', post(input));
  assert.equal(response.status, 201);
  return { payment: await response.json(), input };
}
const decideResult = (session: Session, id: string, decision = 'VERIFIED', version = 1, notes = 'Checked external payment evidence.', apiBase = base) =>
  session.request(`/payments/${id}/verify`, post({ decision, version, notes }), apiBase);
async function seededResult(userId: string, paymentId: string, paymentVersion = 2) {
  return db.paymentResultAlert.create({ data: { userId, paymentId, paymentVersion, decision: 'NEEDS_CLARIFICATION',
    amount: '25.00', clientName: 'Saved customer', batchCode: `TEST-${suffix}`, notes: 'Private saved Finance notes', verifierName: 'Finance reviewer' } });
}

test('Finance decisions notify active Records and the recorder once and retain historical clarification after correction', async () => {
  await resetAlertLoginLimit();
  const records = await alertAccount('result-records', 'RECORDS');
  const recorder = await alertAccount('result-recorder', 'COO');
  const observer = await alertAccount('result-observer', 'GENERAL_MANAGER');
  const inactive = await alertAccount('result-inactive', 'RECORDS');
  await db.user.update({ where: { id: inactive.user.id }, data: { active: false } });
  const finance = (await alertAccount('result-decisions-finance')).session;
  const customer = await alertAccount('result-customer', 'CUSTOMER');
  const clientId = customer.user.clientId!;
  await db.scheduleItem.create({ data: { clientId, sequenceNo: 1, dueDate: new Date('2026-10-06'), expectedAmount: '100.00' } });
  const balanceBefore = await (await recorder.session.request(`/clients/${clientId}/balance`)).json();
  const payments: Awaited<ReturnType<typeof recordedResultPayment>>[] = [];
  for (const decision of ['VERIFIED', 'REJECTED', 'NEEDS_CLARIFICATION'] as const) {
    const entry = await recordedResultPayment(recorder.session, clientId);
    payments.push(entry);
    const note = `Private ${decision} Finance note\nSecond line retained.`;
    const response = await decideResult(finance, entry.payment.id, decision, 1, note);
    assert.equal(response.status, 200);
    const recipients = await db.paymentResultAlert.findMany({ where: { paymentId: entry.payment.id } });
    const activeRecords = await db.user.findMany({ where: { role: 'RECORDS', active: true }, select: { id: true } });
    assert.deepEqual(recipients.map((row) => row.userId).sort(), [...activeRecords.map((user) => user.id), recorder.user.id].sort());
    assert.ok(recipients.every((row) => row.paymentVersion === 2 && row.decision === decision && row.notes === note));
    assert.equal((await decideResult(finance, entry.payment.id, decision, 1, note, secondBase)).status, 409);
    assert.equal(await db.paymentResultAlert.count({ where: { paymentId: entry.payment.id } }), recipients.length);
  }
  const snapshot = await staffAlertSnapshot(records.session, '?scope=results');
  assert.equal(snapshot.resultCount, 3);
  assert.equal(snapshot.unreadCount, 3);
  assert.deepEqual(snapshot.items.map((alert) => alert.kind).sort(), ['PAYMENT_CLARIFICATION', 'PAYMENT_REJECTED', 'PAYMENT_VERIFIED']);
  assert.doesNotMatch(JSON.stringify(snapshot), /Private VERIFIED|Second line|passwordHash|referenceNumber|receiptPhone/);
  assert.equal((await staffAlertSnapshot(recorder.session, '?scope=results')).resultCount, 3);
  assert.equal((await staffAlertSnapshot(observer.session)).resultCount, 0);
  assert.equal(await db.paymentResultAlert.count({ where: { userId: inactive.user.id } }), 0);
  assert.equal(await db.notification.count({ where: { userId: records.user.id } }), 0);
  assert.equal(await db.notification.count({ where: { userId: customer.user.id, kind: 'payment' } }), 1);
  const balanceAfter = await (await recorder.session.request(`/clients/${clientId}/balance`)).json();
  assert.equal(Number(balanceAfter.verifiedPaid) - Number(balanceBefore.verifiedPaid), 25);
  assert.equal(Number(balanceBefore.remainingBalance) - Number(balanceAfter.remainingBalance), 25);
  const clarification = snapshot.items.find((alert) => alert.kind === 'PAYMENT_CLARIFICATION')!;
  assert.equal(clarification.entity, 'payment-result');
  assert.equal(clarification.targetPath, `/system/payments?payment=${payments[2].payment.id}&result=${clarification.id}`);
  const detail = await (await records.session.request(`/staff/alerts/results/${clarification.id}`)).json();
  assert.equal(detail.notes, 'Private NEEDS_CLARIFICATION Finance note\nSecond line retained.');
  assert.equal(detail.currentStatus, 'NEEDS_CLARIFICATION');
  const corrected = await recorder.session.request(`/payments/${payments[2].payment.id}`, patch({ record: { ...payments[2].input, amount: '26.00' }, version: 2 }));
  assert.equal(corrected.status, 200);
  await db.client.update({ where: { id: clientId }, data: { name: 'Changed customer name' } });
  const historical = await (await records.session.request(`/staff/alerts/results/${clarification.id}`, {}, secondBase)).json();
  assert.equal(historical.decision, 'NEEDS_CLARIFICATION');
  assert.equal(historical.amount, '25.00');
  assert.equal(historical.clientName, detail.clientName);
  assert.equal(historical.notes, detail.notes);
  assert.equal(historical.currentStatus, 'PENDING');
  assert.equal(historical.currentVersion, 3);
  assert.equal((await decideResult(finance, payments[2].payment.id, 'VERIFIED', 3)).status, 200);
  assert.equal((await staffAlertSnapshot(records.session, '?scope=results')).resultCount, 4);
  const final = await (await records.session.request(`/staff/alerts/results/${clarification.id}`)).json();
  assert.equal(final.decision, 'NEEDS_CLARIFICATION');
  assert.equal(final.currentStatus, 'VERIFIED');
  assert.equal(final.currentVersion, 4);
  assert.equal((await staffAlertSnapshot(records.session, '?scope=results')).items.filter((alert) => alert.kind === 'PAYMENT_VERIFIED').length, 2);
});

test('Finance result details and reads enforce every role, recipient, current access and strict input', async () => {
  await resetAlertLoginLimit();
  const payment = await db.payment.create({ data: { clientId: firstClient, batchId, amount: '25.00', paymentDate: new Date('2026-10-06'),
    method: 'GCash', recordedById: accounts.get('RECORDS')!, status: 'VERIFIED', version: 2,
    verifierId: accounts.get('OWNER')!, verifiedAt: new Date() } });
  const foreign = await alertAccount('result-foreign', 'RECORDS');
  const foreignResult = await seededResult(foreign.user.id, payment.id);
  for (const role of roles) {
    const { user, session } = await alertAccount(`result-matrix-${role}`, role);
    const result = await seededResult(user.id, payment.id);
    const permitted = canReadPaymentResults({ role });
    assert.equal((await session.request('/staff/alerts?scope=results')).status, permitted ? 200 : 403, role);
    assert.equal((await session.request(`/staff/alerts/results/${result.id}`)).status, permitted ? 200 : 403, role);
    assert.equal((await session.request(`/staff/alerts/${result.id}/read`, post({ entity: 'payment-result' }))).status, permitted ? 200 : 403, role);
    assert.equal((await session.request('/staff/alerts/read-all', post({ scope: 'results' }))).status, permitted ? 200 : 403, role);
    if (role !== 'CUSTOMER') {
      const all = await staffAlertSnapshot(session);
      assert.equal(all.resultCount, permitted ? 1 : 0, role);
      assert.equal(all.items.some((alert) => alert.id === foreignResult.id), false, role);
    }
    if (permitted) {
      assert.equal((await session.request(`/staff/alerts/results/${foreignResult.id}`)).status, 404, role);
      assert.equal((await session.request(`/staff/alerts/${foreignResult.id}/read`, post({ entity: 'payment-result' }))).status, 404, role);
    }
  }
  const strict = await alertAccount('result-strict', 'RECORDS');
  const result = await seededResult(strict.user.id, payment.id);
  for (const extra of [{ userId: foreign.user.id }, { paymentId: payment.id }, { version: 2 }, { decision: 'REJECTED' }])
    assert.equal((await strict.session.request(`/staff/alerts/${result.id}/read`, post({ entity: 'payment-result', ...extra }))).status, 400);
  assert.equal((await strict.session.request('/staff/alerts?scope=results&userId=foreign')).status, 400);
  assert.equal((await strict.session.request('/staff/alerts/results/not-a-uuid')).status, 400);
  assert.equal((await strict.session.request(`/staff/alerts/${result.id}/read`, { ...post({ entity: 'payment-result' }), headers: { Origin: 'https://forged.example' } })).status, 403);
  assert.equal((await new Session().request(`/staff/alerts/results/${result.id}`)).status, 401);
  const stale = await (await strict.session.request('/auth/me')).json();
  await db.user.update({ where: { id: strict.user.id }, data: { role: 'CORE_HANDLER' } });
  assert.equal((await strict.session.request(`/staff/alerts/results/${result.id}`)).status, 401);
  assert.equal((await strict.session.request('/auth/login', post({ email: strict.user.email, password }))).status, 200);
  assert.equal((await staffAlertSnapshot(strict.session)).resultCount, 0);
  await assert.rejects(app.get(StaffAlertsService).read(stale, result.id, { entity: 'payment-result' }), /Payment recording and read access/);
  await assert.rejects(app.get(StaffAlertsService).readAll(stale, 'results'), /Payment recording and read access/);
  await app.get(StaffAlertsService).readAll(stale, 'all');
  assert.equal((await db.paymentResultAlert.findUniqueOrThrow({ where: { id: result.id } })).readAt, null);
  await db.user.update({ where: { id: strict.user.id }, data: { role: 'RECORDS', active: false } });
  await assert.rejects(app.get(StaffAlertsService).read(stale, result.id, { entity: 'payment-result' }), /Your access has changed/);
  assert.equal((await strict.session.request('/staff/alerts')).status, 401);
});

test('Finance result history pages and scoped mark-all preserve other alerts, payments, balances and customer delivery', async () => {
  await resetAlertLoginLimit();
  const reviewer = await alertAccount('result-pages');
  const other = await alertAccount('result-pages-other', 'RECORDS');
  const payment = await db.payment.create({ data: { clientId: firstClient, batchId, amount: '25.00', paymentDate: new Date('2026-10-06'),
    method: 'GCash', recordedById: reviewer.user.id, version: 51 } });
  const results = await Promise.all(Array.from({ length: 25 }, (_, index) => seededResult(reviewer.user.id, payment.id, (index + 1) * 2)));
  const otherResult = await seededResult(other.user.id, payment.id);
  const tasks = await Promise.all([alertTask(reviewer.user.id, 'Scope task one'), alertTask(reviewer.user.id, 'Scope task two')]);
  const beforePayment = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
  const beforeTasks = await db.task.findMany({ where: { id: { in: tasks.map((task) => task.id) } }, orderBy: { id: 'asc' } });
  const beforeBalance = await (await reviewer.session.request(`/clients/${firstClient}/balance`)).json();
  const beforeAudits = await db.auditEntry.count();
  const beforeNotices = await db.notification.count();
  const first = await staffAlertSnapshot(reviewer.session, '?scope=results');
  const next = await staffAlertSnapshot(reviewer.session, '?scope=results&page=2', secondBase);
  assert.equal(first.items.length, 20);
  assert.equal(next.items.length, 5);
  assert.equal(first.total, 25);
  assert.equal(first.unreadCount, 25 + 2 + first.financeCount);
  assert.equal(new Set([...first.items, ...next.items].map((alert) => alert.id)).size, 25);
  assert.equal((await staffAlertSnapshot(reviewer.session, '?scope=results&page=3')).items.length, 0);
  const target = first.items[0];
  assert.equal((await reviewer.session.request(`/staff/alerts/${target.id}/read`, staffRead(target))).status, 200);
  const receipt = await db.paymentResultAlert.findUniqueOrThrow({ where: { id: target.id } });
  assert.equal((await reviewer.session.request(`/staff/alerts/${target.id}/read`, staffRead(target), secondBase)).status, 200);
  assert.equal((await db.paymentResultAlert.findUniqueOrThrow({ where: { id: target.id } })).readAt!.getTime(), receipt.readAt!.getTime());
  assert.equal((await staffAlertSnapshot(reviewer.session, '?scope=results&unreadOnly=true')).total, 24);
  assert.equal((await reviewer.session.request('/staff/alerts/read-all', post({ scope: 'results' }), secondBase)).status, 200);
  assert.deepEqual(await (await reviewer.session.request('/staff/alerts/read-all', post({ scope: 'results' }))).json(), { updated: 0 });
  const afterResults = await staffAlertSnapshot(reviewer.session);
  assert.equal(afterResults.unreadCount, first.financeCount + 2);
  assert.equal(afterResults.resultCount, 25);
  assert.equal((await alertSnapshot(reviewer.session)).unreadCount, first.financeCount);
  assert.equal((await db.paymentResultAlert.findUniqueOrThrow({ where: { id: otherResult.id } })).readAt, null);
  assert.equal((await reviewer.session.request('/staff/alerts/read-all', post({ scope: 'tasks' }))).status, 200);
  assert.equal((await staffAlertSnapshot(reviewer.session)).unreadCount, first.financeCount);
  assert.equal((await reviewer.session.request('/staff/alerts/read-all', post({ scope: 'all' }))).status, 200);
  assert.equal((await staffAlertSnapshot(reviewer.session)).unreadCount, 0);
  assert.equal((await staffAlertSnapshot(reviewer.session, '?scope=results&unreadOnly=true')).total, 0);
  assert.equal((await staffAlertSnapshot(reviewer.session, '?scope=results')).total, results.length);
  assert.deepEqual(await db.payment.findUniqueOrThrow({ where: { id: payment.id } }), beforePayment);
  assert.deepEqual(await db.task.findMany({ where: { id: { in: tasks.map((task) => task.id) } }, orderBy: { id: 'asc' } }), beforeTasks);
  assert.deepEqual(await (await reviewer.session.request(`/clients/${firstClient}/balance`)).json(), beforeBalance);
  assert.equal(await db.auditEntry.count(), beforeAudits);
  assert.equal(await db.notification.count(), beforeNotices);
  await db.payment.delete({ where: { id: payment.id } });
  assert.equal(await db.paymentResultAlert.count({ where: { paymentId: payment.id } }), 0);
});

test('Finance result events and reads reach only each recipient across API instances', async () => {
  await resetAlertLoginLimit();
  const records = await alertAccount('result-stream-records', 'RECORDS');
  const otherRecords = await alertAccount('result-stream-records-other', 'RECORDS');
  const recorder = await alertAccount('result-stream-recorder', 'COO');
  const unrelated = await alertAccount('result-stream-observer', 'GENERAL_MANAGER');
  const finance = (await alertAccount('result-stream-finance')).session;
  const customer = await alertAccount('result-stream-customer', 'CUSTOMER');
  const feeds = await Promise.all([stream(records.session, secondBase), stream(otherRecords.session), stream(recorder.session), stream(unrelated.session), stream(customer.session)]);
  const [ownFeed, otherFeed, recorderFeed, unrelatedFeed, customerFeed] = feeds;
  try {
    const { payment } = await recordedResultPayment(recorder.session, customer.user.clientId!);
    assert.equal((await decideResult(finance, payment.id, 'NEEDS_CLARIFICATION', 1, 'Private stream Finance note', secondBase)).status, 200);
    const own = await db.paymentResultAlert.findFirstOrThrow({ where: { paymentId: payment.id, userId: records.user.id } });
    const other = await db.paymentResultAlert.findFirstOrThrow({ where: { paymentId: payment.id, userId: otherRecords.user.id } });
    const original = await db.paymentResultAlert.findFirstOrThrow({ where: { paymentId: payment.id, userId: recorder.user.id } });
    await ownFeed.wait(() => ownFeed.text.includes(own.id));
    await otherFeed.wait(() => otherFeed.text.includes(other.id));
    await recorderFeed.wait(() => recorderFeed.text.includes(original.id));
    assert.equal(otherFeed.text.includes(own.id), false);
    assert.equal(recorderFeed.text.includes(own.id), false);
    assert.equal(ownFeed.text.includes(other.id), false);
    assert.equal(unrelatedFeed.text.includes('payment-result'), false);
    assert.equal(customerFeed.text.includes('payment-result'), false);
    assert.doesNotMatch(ownFeed.text, /Private stream Finance note|paymentVersion|clientName/);
    assert.equal((await records.session.request(`/staff/alerts/${own.id}/read`, post({ entity: 'payment-result' }))).status, 200);
    await ownFeed.wait(() => ownFeed.text.includes(`"entity":"staff-alert-read","recordId":"${records.user.id}"`));
    assert.equal(otherFeed.text.includes('staff-alert-read'), false);
    assert.equal(recorderFeed.text.includes('staff-alert-read'), false);
    assert.equal(unrelatedFeed.text.includes('staff-alert-read'), false);
    assert.equal((await db.paymentResultAlert.findUniqueOrThrow({ where: { id: other.id } })).readAt, null);
    await db.user.update({ where: { id: records.user.id }, data: { active: false } });
    await ownFeed.wait(() => ownFeed.ended);
    assert.equal((await records.session.request(`/staff/alerts/results/${own.id}`)).status, 401);
  } finally { await Promise.all(feeds.map((feed) => feed.close())); }
});

test('Finance result delivery commits atomically and duplicate decisions cannot duplicate results or customer notices', async () => {
  await resetAlertLoginLimit();
  const recorder = await alertAccount('result-atomic-recorder', 'RECORDS');
  const customer = await alertAccount('result-atomic-customer', 'CUSTOMER');
  const finance = (await alertAccount('result-atomic-finance')).session;
  const owner = await new Session().login('OWNER');
  const { payment } = await recordedResultPayment(recorder.session, customer.user.clientId!);
  const before = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
  const beforeAudits = await db.auditEntry.count({ where: { recordId: payment.id } });
  const beforeNotices = await db.notification.count({ where: { userId: customer.user.id } });
  const beforeEvents = await db.changeEvent.count();
  await db.$executeRawUnsafe(`CREATE FUNCTION fail_result_delivery() RETURNS trigger AS $$ BEGIN
    IF NEW."paymentId" = '${payment.id}'::uuid THEN RAISE EXCEPTION 'Test result delivery rollback'; END IF;
    RETURN NEW; END; $$ LANGUAGE plpgsql`);
  await db.$executeRawUnsafe('CREATE TRIGGER fail_result_delivery BEFORE INSERT ON "PaymentResultAlert" FOR EACH ROW EXECUTE FUNCTION fail_result_delivery()');
  try {
    assert.equal((await decideResult(finance, payment.id)).status, 500);
    assert.deepEqual(await db.payment.findUniqueOrThrow({ where: { id: payment.id } }), before);
    assert.equal(await db.auditEntry.count({ where: { recordId: payment.id } }), beforeAudits);
    assert.equal(await db.notification.count({ where: { userId: customer.user.id } }), beforeNotices);
    assert.equal(await db.changeEvent.count(), beforeEvents);
    assert.equal(await db.paymentResultAlert.count({ where: { paymentId: payment.id } }), 0);
  } finally {
    await db.$executeRawUnsafe('DROP TRIGGER fail_result_delivery ON "PaymentResultAlert"');
    await db.$executeRawUnsafe('DROP FUNCTION fail_result_delivery()');
  }
  assert.equal((await decideResult(recorder.session, payment.id)).status, 403);
  const responses = await Promise.all([decideResult(finance, payment.id), decideResult(owner, payment.id, 'VERIFIED', 1, 'Concurrent reviewer', secondBase)]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
  const activeRecords = await db.user.count({ where: { role: 'RECORDS', active: true } });
  assert.equal(await db.paymentResultAlert.count({ where: { paymentId: payment.id } }), activeRecords);
  assert.equal(await db.paymentResultAlert.count({ where: { paymentId: payment.id, userId: recorder.user.id } }), 1);
  assert.equal(await db.auditEntry.count({ where: { recordId: payment.id, action: 'payment.verified' } }), 1);
  assert.equal(await db.notification.count({ where: { userId: customer.user.id, kind: 'payment' } }), 1);
  assert.equal((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).version, 2);
  const newlyHired = await alertAccount('result-no-backfill', 'RECORDS');
  assert.equal((await staffAlertSnapshot(newlyHired.session, '?scope=results')).resultCount, 0);
});

async function quietStaffEmails() {
  await db.staffEmail.updateMany({ where: { status: { in: ['PENDING', 'SENDING'] } }, data: { status: 'SKIPPED', attemptId: null } });
}
async function mailTask(userId: string, hours = 48, title = 'Staff email task') {
  return db.task.create({ data: { title, instructions: 'Private instructions remain behind sign-in.', assigneeId: userId,
    creatorId: accounts.get('OWNER')!, deadline: new Date(Date.now() + hours * 3_600_000) } });
}
async function queueAssigned(task: Awaited<ReturnType<typeof mailTask>>) {
  await db.$transaction((tx) => queueTaskEmail(tx, task, 'TASK_ASSIGNED'));
  return db.staffEmail.findFirstOrThrow({ where: { taskId: task.id, kind: 'TASK_ASSIGNED' } });
}

test('staff email settings and delivery controls enforce every role, strict inputs, stale versions and audit', async () => {
  await resetAlertLoginLimit();
  const owner = await new Session().login('OWNER');
  const anonymous = new Session();
  assert.equal((await anonymous.request('/staff-notification-settings')).status, 401);
  const settings = await (await owner.request('/staff-notification-settings')).json();
  assert.equal(settings.deliveryMode, 'local');
  assert.deepEqual(settings.templates.map((row: { kind: string }) => row.kind), staffEmailKinds);
  const template = settings.templates[0];
  const input = { version: template.version, enabled: true, subject: 'Staff notice: {title}', body: 'Staff update\n\n{message}\n\nOpen {url}' };
  for (const role of roles) {
    const account = await alertAccount(`staff-email-matrix-${role}`, role);
    const permitted = rolePermissions[role].includes('ACCOUNT_MANAGE');
    assert.equal((await account.session.request('/staff-notification-settings')).status, permitted ? 200 : 403, role);
    assert.equal((await account.session.request('/staff-notification-settings/deliveries')).status, permitted ? 200 : 403, role);
    if (!permitted) {
      assert.equal((await account.session.request('/staff-notification-settings/templates/TASK_ASSIGNED', patch(input))).status, 403, role);
      assert.equal((await account.session.request('/staff-notification-settings/timing', patch({ version: 0, dueSoonHours: 12, overdueHours: 2 }))).status, 403, role);
      assert.equal((await account.session.request(`/staff-notification-settings/deliveries/${randomUUID()}/retry`, post({ version: 1 }))).status, 403, role);
    }
  }
  assert.equal((await owner.request('/staff-notification-settings/templates/TASK_ASSIGNED', patch({ ...input, recipientEmail: 'forged@example.test' }))).status, 400);
  assert.equal((await owner.request('/staff-notification-settings/templates/TASK_ASSIGNED', patch({ ...input, subject: '{title}\nBcc: forged' }))).status, 400);
  assert.equal((await owner.request('/staff-notification-settings/templates/TASK_ASSIGNED', patch({ ...input, body: '{message} {url} {notes}' }))).status, 400);
  assert.equal((await owner.request('/staff-notification-settings/templates/UNKNOWN', patch(input))).status, 400);
  assert.equal((await owner.request('/staff-notification-settings/deliveries?page=0')).status, 400);
  assert.equal((await owner.request('/staff-notification-settings/deliveries?recipientEmail=forged')).status, 400);
  assert.equal((await owner.request('/staff-notification-settings/templates/TASK_ASSIGNED', { ...patch(input), headers: { Origin: 'https://foreign.test' } })).status, 403);
  assert.equal((await owner.request('/staff-notification-settings/templates/TASK_ASSIGNED', patch(input))).status, 200);
  assert.equal((await owner.request('/staff-notification-settings/templates/TASK_ASSIGNED', patch(input))).status, 409);
  assert.equal((await owner.request('/staff-notification-settings/timing', patch({ version: settings.timingVersion, dueSoonHours: 0, overdueHours: 0 }))).status, 400);
  const timing = { version: settings.timingVersion, dueSoonHours: 6, overdueHours: 2 };
  assert.equal((await owner.request('/staff-notification-settings/timing', patch(timing))).status, 200);
  assert.equal((await owner.request('/staff-notification-settings/timing', patch(timing))).status, 409);
  assert.ok(await db.auditEntry.count({ where: { actorId: accounts.get('OWNER')!, action: 'staff_email_template.updated' } }));
  assert.ok(await db.auditEntry.count({ where: { actorId: accounts.get('OWNER')!, action: 'staff_email_timing.updated' } }));
  await db.staffNotificationConfig.update({ where: { key: 'staff' }, data: { dueSoonHours: 24, overdueHours: 0 } });
  const revoked = await alertAccount('staff-email-revoked-owner', 'OWNER');
  const staleOwner = { id: revoked.user.id, role: 'OWNER', name: revoked.user.name, email: revoked.user.email, clientId: null, permissions: rolePermissions.OWNER } as const;
  await db.user.update({ where: { id: revoked.user.id }, data: { role: 'CORE_HANDLER' } });
  await assert.rejects(app.get(StaffEmailService).settings({ ...staleOwner, permissions: [...staleOwner.permissions] }), /Owner access/);
  assert.equal((await revoked.session.request('/staff-notification-settings')).status, 401);
});

test('staff emails cover all seven kinds with correct recipients, private contents, historical results and local delivery', async () => {
  await quietStaffEmails(); await resetAlertLoginLimit();
  await db.task.updateMany({ where: { status: { in: ['TODO', 'IN_PROGRESS'] } }, data: { status: 'DONE' } });
  const owner = await new Session().login('OWNER');
  const recorder = await alertAccount('staff-mail-recorder', 'RECORDS');
  const finance = await alertAccount('staff-mail-finance');
  const inactive = await alertAccount('staff-mail-inactive', 'RECORDS');
  await db.user.update({ where: { id: inactive.user.id }, data: { active: false } });
  const handler = await alertAccount('staff-mail-handler', 'CORE_HANDLER');
  const customer = await alertAccount('staff-mail-customer', 'CUSTOMER');
  const assignedResponse = await owner.request('/tasks', post({ title: 'Assignment email exact task', instructions: 'Private task evidence', assigneeId: handler.user.id,
    priority: 'HIGH', deadline: new Date(Date.now() + 48 * 3_600_000).toISOString() }));
  assert.equal(assignedResponse.status, 201);
  const assigned = await assignedResponse.json();
  const assignedMail = await db.staffEmail.findFirstOrThrow({ where: { taskId: assigned.id } });
  assert.equal(assignedMail.userId, handler.user.id);
  assert.equal(assignedMail.targetPath, `/system/tasks?task=${assigned.id}`);
  assert.equal(assignedMail.subjectTemplate, 'Staff notice: {title}');
  assert.doesNotMatch(assignedMail.message, /Private task evidence/);
  const due = await mailTask(handler.user.id, 2, 'Email due-soon task');
  const overdue = await mailTask(handler.user.id, -1, 'Email overdue task');
  await Promise.all([app.get(StaffEmailService).queueReminders(), second.get(StaffEmailService).queueReminders()]);
  assert.equal(await db.staffEmail.count({ where: { taskId: due.id, kind: 'TASK_DUE_SOON' } }), 1);
  assert.equal(await db.staffEmail.count({ where: { taskId: overdue.id, kind: 'TASK_OVERDUE' } }), 1);
  const { payment, input } = await recordedResultPayment(recorder.session, customer.user.clientId!);
  const pending = await db.staffEmail.findMany({ where: { paymentId: payment.id, kind: 'FINANCE_PENDING' } });
  const expectedReviewers = await db.user.findMany({ where: { active: true, role: { in: ['OWNER', 'FINANCE_OFFICER'] } }, select: { id: true } });
  assert.deepEqual(pending.map((row) => row.userId).sort(), expectedReviewers.map((row) => row.id).sort());
  assert.equal(await db.staffEmail.count({ where: { paymentId: payment.id, userId: customer.user.id } }), 0);
  assert.equal((await decideResult(finance.session, payment.id, 'NEEDS_CLARIFICATION', 1, 'Secret Finance note and account details')).status, 200);
  const clarification = await db.paymentResultAlert.findFirstOrThrow({ where: { paymentId: payment.id, userId: recorder.user.id } });
  assert.equal(await db.staffEmail.count({ where: { resultId: clarification.id } }), 1);
  assert.equal(await db.staffEmail.count({ where: { paymentId: payment.id, userId: inactive.user.id } }), 0);
  const corrected = await recorder.session.request(`/payments/${payment.id}`, patch({ record: input, version: 2 }));
  assert.equal(corrected.status, 200);
  assert.equal((await decideResult(finance.session, payment.id, 'VERIFIED', 3, 'Verification private note')).status, 200);
  const rejected = (await recordedResultPayment(recorder.session)).payment;
  assert.equal((await decideResult(finance.session, rejected.id, 'REJECTED', 1, 'Reject private note')).status, 200);
  const mailKinds = await db.staffEmail.findMany({ where: { OR: [{ taskId: { in: [assigned.id, due.id, overdue.id] } }, { paymentId: { in: [payment.id, rejected.id] } }] } });
  assert.deepEqual([...new Set(mailKinds.map((row) => row.kind))].sort(), staffEmailKinds.filter((kind) => !kind.startsWith('SUPPORT_') && !kind.startsWith('ACCOUNT_')).sort());
  for (const row of mailKinds.filter((row) => row.paymentId)) assert.doesNotMatch(row.message, /Secret Finance|private note|account details|\b25\.00\b|GCash/);
  const finalPending = (await recordedResultPayment(recorder.session)).payment;
  // Each local delivery batch is bounded, so drain it as a worker would.
  for (let index = 0; index < 40 && await db.staffEmail.count({ where: { status: 'PENDING', nextAt: { lte: new Date() } } }); index++)
    await app.get(EmailDeliveryService).deliver();
  assert.equal((await db.staffEmail.findUniqueOrThrow({ where: { id: assignedMail.id } })).status, 'SENT');
  const savedResultMail = await db.staffEmail.findFirstOrThrow({ where: { resultId: clarification.id } });
  assert.equal(savedResultMail.status, 'SENT');
  const content = await readFile(join(process.cwd(), '.local/mail', `${savedResultMail.id}.txt`), 'utf8');
  assert.match(content, new RegExp(`result=${clarification.id}`));
  assert.match(content, /Finance requested clarification/);
  assert.doesNotMatch(content, /Secret Finance|Verification private note/);
  assert.equal(await db.staffEmail.count({ where: { paymentId: finalPending.id, kind: 'FINANCE_PENDING', status: 'SENT' } }), expectedReviewers.length);
  assert.equal(await db.staffEmail.count({ where: { paymentId: payment.id, kind: 'FINANCE_PENDING', status: 'SKIPPED' } }), expectedReviewers.length * 2);
  assert.equal(await db.notification.count({ where: { userId: customer.user.id, kind: 'payment' } }), 1);
  assert.equal(await db.staffEmail.count({ where: { userId: customer.user.id } }), 0);
  const later = await alertAccount('staff-mail-no-backfill', 'RECORDS');
  assert.equal(await db.staffEmail.count({ where: { userId: later.user.id } }), 0);
});

test('staff task emails follow configured timing, dedupe deadlines, pause safely and stop after submission', async () => {
  await quietStaffEmails(); await resetAlertLoginLimit();
  await db.task.updateMany({ where: { status: { in: ['TODO', 'IN_PROGRESS'] } }, data: { status: 'DONE' } });
  const handler = await alertAccount('staff-mail-timing', 'CORE_HANDLER');
  const service = app.get(StaffEmailService);
  const task = await mailTask(handler.user.id, 12);
  await service.queueReminders();
  const queued = await db.staffEmail.findFirstOrThrow({ where: { taskId: task.id, kind: 'TASK_DUE_SOON' } });
  await db.staffNotificationConfig.update({ where: { key: 'staff' }, data: { dueSoonHours: 6, overdueHours: 2 } });
  let sent = 0;
  await service.deliver(async () => { sent++; });
  const deferred = await db.staffEmail.findUniqueOrThrow({ where: { id: queued.id } });
  assert.equal(deferred.status, 'PENDING'); assert.equal(deferred.attempts, 0);
  assert.equal(deferred.nextAt.getTime(), task.deadline.getTime() - 6 * 3_600_000);
  assert.equal(sent, 0);
  await db.staffNotificationConfig.update({ where: { key: 'staff' }, data: { dueSoonHours: 24, overdueHours: 0 } });
  await db.staffEmail.update({ where: { id: queued.id }, data: { nextAt: new Date(0) } });
  await db.staffEmailTemplate.upsert({ where: { kind: 'TASK_DUE_SOON' }, create: { kind: 'TASK_DUE_SOON', enabled: false, subject: '{title}', body: '{message}\n{url}' }, update: { enabled: false } });
  await service.deliver(async () => { sent++; });
  assert.equal((await db.staffEmail.findUniqueOrThrow({ where: { id: queued.id } })).attempts, 0);
  const disabledTask = await mailTask(handler.user.id, 3);
  await service.queueReminders();
  assert.equal(await db.staffEmail.count({ where: { taskId: disabledTask.id } }), 0);
  await db.staffEmailTemplate.update({ where: { kind: 'TASK_DUE_SOON' }, data: { enabled: true } });
  await db.staffEmail.update({ where: { id: queued.id }, data: { nextAt: new Date(0) } });
  await service.deliver(async () => { sent++; }); assert.equal(sent, 1);
  await service.queueReminders(); await service.queueReminders();
  assert.equal(await db.staffEmail.count({ where: { taskId: disabledTask.id } }), 1);
  assert.equal(await db.staffEmail.count({ where: { taskId: task.id } }), 1);
  await db.task.update({ where: { id: task.id }, data: { deadline: new Date(Date.now() + 4 * 3_600_000), version: { increment: 1 } } });
  await service.queueReminders();
  assert.equal(await db.staffEmail.count({ where: { taskId: task.id, kind: 'TASK_DUE_SOON' } }), 2);
  await db.task.update({ where: { id: disabledTask.id }, data: { status: 'SUBMITTED', report: 'Done', submittedAt: new Date(), lateFlag: false } });
  await service.deliver(async () => { sent++; });
  assert.equal((await db.staffEmail.findFirstOrThrow({ where: { taskId: disabledTask.id } })).status, 'SKIPPED');
  assert.equal(sent, 2);
  assert.equal((await db.task.findUniqueOrThrow({ where: { id: disabledTask.id } })).status, 'SUBMITTED');
  const delayedOverdue = await mailTask(handler.user.id, -1);
  await db.staffNotificationConfig.update({ where: { key: 'staff' }, data: { overdueHours: 2 } });
  await service.queueReminders(); assert.equal(await db.staffEmail.count({ where: { taskId: delayedOverdue.id } }), 0);
  await db.task.update({ where: { id: delayedOverdue.id }, data: { deadline: new Date(Date.now() - 3 * 3_600_000) } });
  await service.queueReminders(); assert.equal(await db.staffEmail.count({ where: { taskId: delayedOverdue.id, kind: 'TASK_OVERDUE' } }), 1);
  await db.staffNotificationConfig.update({ where: { key: 'staff' }, data: { overdueHours: 0 } });
});

test('staff email delivery rechecks active access, recipient address, task ownership and Finance access', async () => {
  await quietStaffEmails(); await resetAlertLoginLimit();
  const service = app.get(StaffEmailService);
  const staff = await alertAccount('staff-mail-auth', 'CORE_HANDLER');
  const changedAddress = await alertAccount('staff-mail-address', 'CORE_HANDLER');
  const reassigned = await alertAccount('staff-mail-reassigned', 'CORE_HANDLER');
  const finance = await alertAccount('staff-mail-auth-finance');
  const recorder = await alertAccount('staff-mail-auth-recorder', 'RECORDS');
  const inactiveTask = await mailTask(staff.user.id), addressTask = await mailTask(changedAddress.user.id), reassignedTask = await mailTask(reassigned.user.id);
  await queueAssigned(inactiveTask); await queueAssigned(addressTask); await queueAssigned(reassignedTask);
  const { payment } = await recordedResultPayment(recorder.session);
  assert.equal((await decideResult(finance.session, payment.id, 'NEEDS_CLARIFICATION', 1)).status, 200);
  const ownResult = await db.staffEmail.findFirstOrThrow({ where: { paymentId: payment.id, userId: recorder.user.id, kind: 'PAYMENT_CLARIFICATION' } });
  const stillPending = (await recordedResultPayment(recorder.session)).payment;
  const reviewMail = await db.staffEmail.findFirstOrThrow({ where: { paymentId: stillPending.id, userId: finance.user.id, kind: 'FINANCE_PENDING' } });
  const keep = [ownResult.id, reviewMail.id, ...(await db.staffEmail.findMany({ where: { taskId: { in: [inactiveTask.id, addressTask.id, reassignedTask.id] } }, select: { id: true } })).map((row) => row.id)];
  await db.staffEmail.updateMany({ where: { id: { notIn: keep }, status: 'PENDING' }, data: { status: 'SKIPPED' } });
  await db.user.update({ where: { id: staff.user.id }, data: { active: false } });
  await db.user.update({ where: { id: changedAddress.user.id }, data: { email: `${suffix}-changed-recipient@example.test` } });
  await db.task.update({ where: { id: reassignedTask.id }, data: { assigneeId: changedAddress.user.id } });
  await db.user.update({ where: { id: finance.user.id }, data: { role: 'CORE_HANDLER' } });
  await db.user.update({ where: { id: recorder.user.id }, data: { role: 'CORE_HANDLER' } });
  let sent = 0; await service.deliver(async () => { sent++; }); assert.equal(sent, 0);
  assert.equal(await db.staffEmail.count({ where: { id: { in: keep }, status: 'SKIPPED', attempts: 0 } }), keep.length);
  const owner = await new Session().login('OWNER');
  const visible = await (await owner.request('/staff-notification-settings/deliveries?status=SKIPPED')).json();
  assert.ok(visible.items.every((row: { canRetry: boolean }) => !row.canRetry));
  await db.staffEmail.update({ where: { id: ownResult.id }, data: { status: 'FAILED' } });
  const failed = await db.staffEmail.findUniqueOrThrow({ where: { id: ownResult.id } });
  assert.equal((await owner.request(`/staff-notification-settings/deliveries/${failed.id}/retry`, post({ version: failed.version }))).status, 409);
  assert.equal((await db.payment.findUniqueOrThrow({ where: { id: stillPending.id } })).status, 'PENDING');
});

test('staff email claims are exclusive across instances and reclaimed leases fence stale completion', async () => {
  await quietStaffEmails(); await resetAlertLoginLimit();
  const handler = await alertAccount('staff-mail-leases', 'CORE_HANDLER');
  const mail = await queueAssigned(await mailTask(handler.user.id));
  const firstService = app.get(StaffEmailService), secondService = second.get(StaffEmailService);
  let sends = 0;
  const send = async () => { sends++; await new Promise((resolve) => setTimeout(resolve, 60)); };
  await Promise.all([firstService.deliver(send), secondService.deliver(send)]);
  assert.equal(sends, 1);
  const sent = await db.staffEmail.findUniqueOrThrow({ where: { id: mail.id } });
  assert.equal(sent.status, 'SENT'); assert.equal(sent.attempts, 1);
  const reclaim = await queueAssigned(await mailTask(handler.user.id));
  let unblock!: () => void, started!: () => void;
  const blocked = new Promise<void>((resolve) => { unblock = resolve; });
  const entered = new Promise<void>((resolve) => { started = resolve; });
  const original = firstService.deliver(async () => { started(); await blocked; throw new Error('Original lease worker failed after replacement completed'); });
  await entered;
  await db.staffEmail.update({ where: { id: reclaim.id }, data: { nextAt: new Date(0) } });
  await secondService.deliver(async () => {});
  const replacement = await db.staffEmail.findUniqueOrThrow({ where: { id: reclaim.id } });
  assert.equal(replacement.status, 'SENT'); assert.equal(replacement.totalAttempts, 2);
  unblock(); await original;
  assert.deepEqual(await db.staffEmail.findUniqueOrThrow({ where: { id: reclaim.id } }), replacement);
});

test('staff email failures back off, preserve provider payload, stop at five attempts and allow audited bounded retries', async () => {
  await quietStaffEmails(); await resetAlertLoginLimit();
  const owner = await new Session().login('OWNER');
  const handler = await alertAccount('staff-mail-retry', 'CORE_HANDLER');
  const mail = await queueAssigned(await mailTask(handler.user.id));
  const service = app.get(StaffEmailService);
  const deliveries: unknown[][] = [];
  for (let index = 1; index <= 5; index++) {
    await db.staffEmail.update({ where: { id: mail.id }, data: { nextAt: new Date(0) } });
    const before = Date.now();
    await service.deliver(async (...args) => { deliveries.push(args); throw new Error('Test provider outage with secret details'); });
    const row = await db.staffEmail.findUniqueOrThrow({ where: { id: mail.id } });
    assert.equal(row.attempts, index); assert.equal(row.totalAttempts, index);
    assert.equal(row.status, index === 5 ? 'FAILED' : 'PENDING');
    assert.ok(row.nextAt.getTime() >= before + Math.min(60, 2 ** index) * 60_000);
    assert.doesNotMatch(row.error ?? '', /secret details/);
    if (index === 1) {
      await db.staffEmailTemplate.update({ where: { kind: 'TASK_ASSIGNED' }, data: { subject: 'NEW {title}', body: 'NEW {message}\n{url}' } });
      app.get<Config>(CONFIG).EMAIL_FROM = 'changed-sender@example.test';
    }
  }
  for (const args of deliveries) assert.deepEqual(args.slice(0, 5), deliveries[0].slice(0, 5));
  assert.equal(new Set(deliveries.map(args => args[5])).size, 5, 'Each delivery attempt has a fresh fencing token.');
  const failed = await db.staffEmail.findUniqueOrThrow({ where: { id: mail.id } });
  assert.equal((await owner.request(`/staff-notification-settings/deliveries/${mail.id}/retry`, post({ version: failed.version, recipientEmail: 'forged@example.test' }))).status, 400);
  assert.equal((await owner.request(`/staff-notification-settings/deliveries/${mail.id}/retry`, post({ version: failed.version - 1 }))).status, 409);
  const attempts = await Promise.all([owner.request(`/staff-notification-settings/deliveries/${mail.id}/retry`, post({ version: failed.version })),
    owner.request(`/staff-notification-settings/deliveries/${mail.id}/retry`, post({ version: failed.version }), secondBase)]);
  assert.deepEqual(attempts.map((response) => response.status).sort(), [200, 409]);
  assert.equal(await db.auditEntry.count({ where: { recordId: mail.id, action: 'staff_email.retried' } }), 1);
  await service.deliver(async (...args) => { assert.deepEqual(args.slice(0, 5), deliveries[0].slice(0, 5)); });
  assert.equal((await db.staffEmail.findUniqueOrThrow({ where: { id: mail.id } })).totalAttempts, 6);
  assert.equal((await db.staffEmail.findUniqueOrThrow({ where: { id: mail.id } })).status, 'SENT');
  assert.equal((await owner.request(`/staff-notification-settings/deliveries/${mail.id}/retry`, post({ version: failed.version }))).status, 409);
  const expired = await queueAssigned(await mailTask(handler.user.id));
  await db.staffEmail.update({ where: { id: expired.id }, data: { createdAt: new Date(Date.now() - staffEmailWindowMs - 1) } });
  let sent = 0; await service.deliver(async () => { sent++; }); assert.equal(sent, 0);
  const expiredRow = await db.staffEmail.findUniqueOrThrow({ where: { id: expired.id } });
  assert.equal(expiredRow.status, 'FAILED'); assert.equal(expiredRow.attempts, 0);
  assert.equal((await owner.request(`/staff-notification-settings/deliveries/${expired.id}/retry`, post({ version: expiredRow.version }))).status, 409);
  app.get<Config>(CONFIG).EMAIL_FROM = 'test@example.test';
});

test('staff email provider requests retain one idempotency key and exact payload across retries', async () => {
  await quietStaffEmails(); await resetAlertLoginLimit();
  const handler = await alertAccount('staff-mail-provider', 'CORE_HANDLER');
  const mail = await queueAssigned(await mailTask(handler.user.id));
  const configured = app.get<Config>(CONFIG), originalFetch = globalThis.fetch;
  const before = { environment: configured.NODE_ENV, from: configured.EMAIL_FROM, key: configured.RESEND_API_KEY };
  const requests: { key: string | null; body: unknown }[] = [];
  configured.NODE_ENV = 'production'; configured.RESEND_API_KEY = 'fake-provider-test-only'; configured.EMAIL_FROM = 'Fresh Phones <staff@example.test>';
  await db.notification.updateMany({ where: { emailStatus: { in: ['PENDING', 'SENDING'] } }, data: { emailStatus: 'SKIPPED' } });
  globalThis.fetch = (input, init) => {
    if (String(input) === 'https://api.resend.com/emails') {
      requests.push({ key: new Headers(init?.headers).get('Idempotency-Key'), body: JSON.parse(String(init?.body)) });
      return Promise.resolve(new Response(JSON.stringify({ id: randomUUID() }), { status: requests.length === 1 ? 503 : 200 }));
    }
    return originalFetch(input, init);
  };
  try {
    await app.get(EmailDeliveryService).deliver();
    assert.equal((await db.staffEmail.findUniqueOrThrow({ where: { id: mail.id } })).status, 'PENDING');
    configured.EMAIL_FROM = 'Changed <new@example.test>';
    await db.staffEmail.update({ where: { id: mail.id }, data: { nextAt: new Date(0) } });
    await app.get(EmailDeliveryService).deliver();
    assert.equal(requests.length, 2); assert.deepEqual(requests[0], requests[1]);
    assert.equal(requests[0].key, `notification/${mail.id}`);
    assert.deepEqual((requests[0].body as { to: string[] }).to, [handler.user.email]);
    assert.equal((await db.staffEmail.findUniqueOrThrow({ where: { id: mail.id } })).status, 'SENT');
  } finally { globalThis.fetch = originalFetch; configured.NODE_ENV = before.environment; configured.EMAIL_FROM = before.from; configured.RESEND_API_KEY = before.key; }
});

test('staff email outbox failures roll back task assignments and Finance decisions with audit and customer notices', async () => {
  await quietStaffEmails(); await resetAlertLoginLimit();
  const owner = await new Session().login('OWNER');
  const recorder = await alertAccount('staff-mail-atomic-recorder', 'RECORDS');
  const customer = await alertAccount('staff-mail-atomic-customer', 'CUSTOMER');
  const finance = await alertAccount('staff-mail-atomic-finance');
  const { payment } = await recordedResultPayment(recorder.session, customer.user.clientId!);
  const beforePayment = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
  const beforeAudits = await db.auditEntry.count(), beforeEvents = await db.changeEvent.count(), beforeNotices = await db.notification.count();
  const taskTitle = `Atomic email task ${suffix}`;
  await db.$executeRawUnsafe(`CREATE FUNCTION fail_staff_email_outbox() RETURNS trigger AS $$ BEGIN
    IF NEW."kind" = 'TASK_ASSIGNED' OR (NEW."paymentId" = '${payment.id}'::uuid AND NEW."kind" = 'PAYMENT_VERIFIED')
      THEN RAISE EXCEPTION 'Test staff email outbox rollback'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`);
  await db.$executeRawUnsafe('CREATE TRIGGER fail_staff_email_outbox BEFORE INSERT ON "StaffEmail" FOR EACH ROW EXECUTE FUNCTION fail_staff_email_outbox()');
  try {
    assert.equal((await owner.request('/tasks', post({ title: taskTitle, instructions: '', assigneeId: recorder.user.id, priority: 'MEDIUM', deadline: new Date(Date.now() + 48 * 3_600_000).toISOString() }))).status, 500);
    assert.equal(await db.task.count({ where: { title: taskTitle } }), 0);
    assert.equal((await decideResult(finance.session, payment.id)).status, 500);
    assert.deepEqual(await db.payment.findUniqueOrThrow({ where: { id: payment.id } }), beforePayment);
    assert.equal(await db.paymentResultAlert.count({ where: { paymentId: payment.id } }), 0);
    assert.equal(await db.staffEmail.count({ where: { paymentId: payment.id, kind: 'PAYMENT_VERIFIED' } }), 0);
    assert.equal(await db.auditEntry.count(), beforeAudits); assert.equal(await db.changeEvent.count(), beforeEvents); assert.equal(await db.notification.count(), beforeNotices);
  } finally { await db.$executeRawUnsafe('DROP TRIGGER fail_staff_email_outbox ON "StaffEmail"'); await db.$executeRawUnsafe('DROP FUNCTION fail_staff_email_outbox()'); }
  assert.equal((await decideResult(finance.session, payment.id)).status, 200);
  const results = await db.paymentResultAlert.findMany({ where: { paymentId: payment.id } });
  assert.equal(await db.staffEmail.count({ where: { paymentId: payment.id, kind: 'PAYMENT_VERIFIED' } }), results.length);
  await db.$transaction(async (tx) => { await queueResultEmails(tx, results); await queueResultEmails(tx, results); });
  assert.equal(await db.staffEmail.count({ where: { paymentId: payment.id, kind: 'PAYMENT_VERIFIED' } }), results.length);
  await db.payment.delete({ where: { id: payment.id } });
  assert.equal(await db.staffEmail.count({ where: { paymentId: payment.id } }), 0);
});

test('staff email history pages and filters exclude sensitive payloads and retries preserve source records and unread state', async () => {
  await quietStaffEmails(); await resetAlertLoginLimit();
  const owner = await new Session().login('OWNER');
  const handler = await alertAccount('staff-mail-pages', 'CORE_HANDLER');
  const task = await mailTask(handler.user.id);
  const original = await queueAssigned(task);
  await db.staffEmail.updateMany({ where: { status: 'FAILED' }, data: { status: 'SKIPPED' } });
  await db.staffEmail.createMany({ data: Array.from({ length: 25 }, (_, index) => ({ userId: handler.user.id, kind: 'TASK_ASSIGNED', taskId: task.id,
    deadline: task.deadline, dedupeKey: `paging:${suffix}:${index}`, recipientEmail: handler.user.email, title: 'Page assignment', message: 'Private delivery message',
    targetPath: `/system/tasks?task=${task.id}`, subjectTemplate: '{title}', bodyTemplate: '{message}\n{url}', status: 'FAILED',
  })) });
  const first = await (await owner.request('/staff-notification-settings/deliveries?status=FAILED&kind=TASK_ASSIGNED')).json();
  const next = await (await owner.request('/staff-notification-settings/deliveries?status=FAILED&kind=TASK_ASSIGNED&page=2')).json();
  assert.equal(first.total, 25); assert.equal(first.items.length, 20); assert.equal(next.items.length, 5);
  assert.equal(new Set([...first.items, ...next.items].map((row: { id: string }) => row.id)).size, 25);
  assert.doesNotMatch(JSON.stringify(first), /Private delivery message|bodyTemplate|renderedBody|attemptId|password|dedupeKey|targetPath/);
  assert.ok(first.items.every((row: { canRetry: boolean }) => row.canRetry));
  const beforeTask = await db.task.findUniqueOrThrow({ where: { id: task.id } });
  const beforeReads = await db.taskAlertRead.count(), beforeNotices = await db.notification.count(), beforePaymentCount = await db.payment.count();
  const failed = first.items[0];
  assert.equal((await owner.request(`/staff-notification-settings/deliveries/${failed.id}/retry`, post({ version: failed.version }))).status, 200);
  assert.deepEqual(await db.task.findUniqueOrThrow({ where: { id: task.id } }), beforeTask);
  assert.equal(await db.taskAlertRead.count(), beforeReads); assert.equal(await db.notification.count(), beforeNotices); assert.equal(await db.payment.count(), beforePaymentCount);
  const current = await db.staffEmail.findUniqueOrThrow({ where: { id: original.id } });
  assert.equal(current.status, 'PENDING');
  assert.equal((await handler.session.request(`/staff-notification-settings/deliveries/${failed.id}/retry`, post({ version: failed.version }))).status, 403);
});

async function resetSupportLoginLimit() {
  const keys = ['login-ip:127.0.0.1', ...[...emails.values()].map((email) => `login-email:${email}`)].map(tokenHash);
  await db.loginAttempt.deleteMany({ where: { key: { in: keys } } });
}

async function createAlertSupport(customer: Session, label: string) {
  const response = await customer.request('/portal/support', post({ category: label, description: `Private concern ${label}` }));
  assert.equal(response.status, 201);
  return response.json() as Promise<{ id: string; version: number }>;
}
async function assignAlertSupport(owner: Session, id: string, userId: string | null, version: number) {
  const response = await owner.request(`/support/cases/${id}`, patch({ assignedStaffId: userId, version }));
  assert.equal(response.status, 200);
  return response.json() as Promise<{ id: string; version: number }>;
}
async function supportFixture(key: string) {
  await resetSupportLoginLimit();
  const customer = await new Session().login('CUSTOMER');
  const owner = await new Session().login('OWNER');
  const team = await alertAccount(`support-${key}`, 'CS_TEAM');
  const created = await createAlertSupport(customer, key);
  const assigned = await assignAlertSupport(owner, created.id, team.user.id, created.version);
  return { customer, owner, team, assigned };
}

test('Support alerts route new cases to active heads, isolate recipients and enforce every role and strict input', async () => {
  await resetSupportLoginLimit();
  const matrix = new Map<Role, Awaited<ReturnType<typeof alertAccount>>>();
  for (const role of roles) matrix.set(role, await alertAccount(`support-role-${role}`, role));
  const customer = await new Session().login('CUSTOMER');
  const created = await createAlertSupport(customer, 'matrix-private-description');
  const heads = await db.user.findMany({ where: { active: true, role: 'CS_HEAD' }, select: { id: true } });
  const alerts = await db.supportAlert.findMany({ where: { caseId: created.id } });
  assert.deepEqual(alerts.map((a) => a.userId).sort(), heads.map((h) => h.id).sort());
  assert.ok(alerts.every((a) => a.kind === 'SUPPORT_NEW_CASE' && a.caseVersion === 1));
  for (const role of roles) {
    const session = matrix.get(role)!.session;
    const permitted = rolePermissions[role].includes('SUPPORT_MANAGE');
    assert.equal((await session.request('/staff/alerts?scope=support')).status, permitted ? 200 : 403, role);
    assert.equal((await session.request('/staff/alerts/read-all', post({ scope: 'support' }))).status, permitted ? 200 : 403, role);
    if (role !== 'CUSTOMER') {
      const queue = await staffAlertSnapshot(session);
      const own = queue.items.filter((a) => a.entity === 'support' && a.caseId === created.id);
      assert.equal(own.length, role === 'CS_HEAD' ? 1 : 0, role);
      assert.doesNotMatch(JSON.stringify(own), /Private concern|matrix-private-description|client_name|description|passwordHash/);
      if (own[0]) assert.equal(own[0].targetPath, `/system/support?case=${created.id}`);
    }
    const target = alerts.find((a) => a.userId === matrix.get('CS_HEAD')!.user.id)!;
    assert.equal((await session.request(`/staff/alerts/${target.id}/read`, post({ entity: 'support' }))).status,
      role === 'CS_HEAD' ? 200 : permitted ? 404 : 403, role);
  }
  const head = matrix.get('CS_HEAD')!.session;
  const target = alerts.find((a) => a.userId === matrix.get('CS_HEAD')!.user.id)!;
  for (const extra of [{ userId: accounts.get('OWNER') }, { caseId: created.id }, { version: 1 }, { kind: 'SUPPORT_NEW_CASE' }])
    assert.equal((await head.request(`/staff/alerts/${target.id}/read`, post({ entity: 'support', ...extra }))).status, 400);
  assert.equal((await head.request(`/staff/alerts/${target.id}/read`, { ...post({ entity: 'support' }), headers: { Origin: 'https://foreign.test' } })).status, 403);
  assert.equal((await new Session().request('/staff/alerts?scope=support')).status, 401);
  assert.equal(await db.supportAlert.count({ where: { caseId: created.id, userId: accounts.get('CUSTOMER') } }), 0);
});

test('Support triage falls back to active Owners without heads and does not backfill new staff', async () => {
  await quietStaffEmails(); await resetSupportLoginLimit();
  const customer = await new Session().login('CUSTOMER');
  const owner = await new Session().login('OWNER');
  const heads = await db.user.findMany({ where: { role: 'CS_HEAD', active: true }, select: { id: true } });
  try {
    await db.user.updateMany({ where: { id: { in: heads.map((h) => h.id) } }, data: { active: false } });
    const created = await createAlertSupport(customer, 'owner-fallback');
    const recipients = await db.supportAlert.findMany({ where: { caseId: created.id } });
    const owners = await db.user.findMany({ where: { active: true, role: 'OWNER' }, select: { id: true } });
    assert.deepEqual(recipients.map((a) => a.userId).sort(), owners.map((a) => a.id).sort());
    assert.ok((await staffAlertSnapshot(owner, '?scope=support')).items.some((a) => a.entity === 'support' && a.caseId === created.id));
    await db.user.updateMany({ where: { id: { in: heads.map((h) => h.id) } }, data: { active: true } });
    assert.ok(!(await staffAlertSnapshot(owner, '?scope=support')).items.some((a) => a.entity === 'support' && a.caseId === created.id));
    const newHead = await alertAccount('support-new-head', 'CS_HEAD');
    assert.equal((await staffAlertSnapshot(newHead.session, '?scope=support')).supportCount, 0);
    const sent: string[] = [];
    await app.get(StaffEmailService).deliver(async (id) => { sent.push(id); });
    const outbox = await db.staffEmail.findMany({ where: { supportAlertId: { in: recipients.map((a) => a.id) } } });
    assert.ok(outbox.every((row) => !sent.includes(row.id)));
    assert.ok(outbox.every((e) => e.status === 'SKIPPED'));
  } finally { await db.user.updateMany({ where: { id: { in: heads.map((h) => h.id) } }, data: { active: true } }); }
});

test('Support reads preserve cases and messages; reassignment, staff replies, resolution and reopening retire old alerts', async () => {
  const { customer, owner, team, assigned } = await supportFixture('lifecycle');
  const other = await alertAccount('support-lifecycle-other', 'CS_TEAM');
  const id = assigned.id;
  assert.equal((await customer.request(`/portal/support/${id}/replies`, post({ body: 'Private customer reply' }))).status, 201);
  const queue = await staffAlertSnapshot(team.session, '?scope=support');
  assert.equal(queue.supportCount, 2);
  const replyAlert = queue.items.find((a) => a.kind === 'SUPPORT_CUSTOMER_REPLY')!;
  const before = await db.supportCase.findUniqueOrThrow({ where: { id } });
  const messages = await db.supportMessage.findMany({ where: { caseId: id } });
  const audit = await db.auditEntry.count(), notices = await db.notification.count();
  const receipt = await (await team.session.request(`/staff/alerts/${replyAlert.id}/read`, staffRead(replyAlert), secondBase)).json();
  assert.equal((await (await team.session.request(`/staff/alerts/${replyAlert.id}/read`, staffRead(replyAlert))).json()).readAt, receipt.readAt);
  assert.equal((await other.session.request(`/staff/alerts/${replyAlert.id}/read`, staffRead(replyAlert))).status, 404);
  assert.deepEqual(await db.supportCase.findUniqueOrThrow({ where: { id } }), before);
  assert.deepEqual(await db.supportMessage.findMany({ where: { caseId: id } }), messages);
  assert.equal(await db.auditEntry.count(), audit); assert.equal(await db.notification.count(), notices);
  const moved = await assignAlertSupport(owner, id, other.user.id, before.version);
  assert.equal((await staffAlertSnapshot(team.session, '?scope=support')).supportCount, 0);
  assert.equal((await team.session.request(`/staff/alerts/${replyAlert.id}/read`, staffRead(replyAlert))).status, 404);
  const returned = await assignAlertSupport(owner, id, team.user.id, moved.version);
  assert.equal((await staffAlertSnapshot(team.session, '?scope=support')).supportCount, 1);
  assert.equal((await customer.request(`/portal/support/${id}/replies`, post({ body: 'Follow-up question' }))).status, 201);
  assert.equal((await team.session.request(`/support/cases/${id}/replies`, post({ body: 'Staff answer', needsReply: true }))).status, 201);
  assert.equal((await staffAlertSnapshot(team.session, '?scope=support')).supportCount, 1);
  const current = await db.supportCase.findUniqueOrThrow({ where: { id } });
  assert.equal(current.version, returned.version + 2);
  const resolved = await owner.request(`/support/cases/${id}`, patch({ status: 'RESOLVED', resolution: 'Customer concern addressed.', version: current.version }));
  assert.equal(resolved.status, 200); const done = await resolved.json();
  assert.equal((await staffAlertSnapshot(team.session, '?scope=support')).supportCount, 0);
  assert.equal((await customer.request(`/portal/support/${id}/replies`, post({ body: 'Cannot reply' }))).status, 409);
  const reopened = await owner.request(`/support/cases/${id}`, patch({ status: 'OPEN', version: done.version }));
  assert.equal(reopened.status, 200); const open = await reopened.json();
  const fresh = await staffAlertSnapshot(team.session, '?scope=support');
  assert.equal(fresh.supportCount, 1); assert.ok(!fresh.items.some((a) => a.id === replyAlert.id));
  assert.equal((await owner.request(`/support/cases/${id}`, patch({ status: 'CLOSED', version: open.version }))).status, 200);
  assert.equal((await staffAlertSnapshot(team.session, '?scope=support')).supportCount, 0);
});

test('Support selected-scope mark-all covers all pages and preserves other alerts, recipients and source records', async () => {
  const { customer, team, assigned } = await supportFixture('pages');
  const other = await alertAccount('support-pages-other', 'CS_TEAM');
  const task = await alertTask(team.user.id, 'Support staff unrelated task');
  for (let i = 0; i < 25; i++) assert.equal((await customer.request(`/portal/support/${assigned.id}/replies`, post({ body: `Private reply ${i}` }))).status, 201);
  const first = await staffAlertSnapshot(team.session, '?scope=support&unreadOnly=true');
  const next = await staffAlertSnapshot(team.session, '?scope=support&unreadOnly=true&page=2', secondBase);
  assert.equal(first.total, 26); assert.equal(first.items.length, 20); assert.equal(next.items.length, 6);
  assert.equal(new Set([...first.items, ...next.items].map((a) => a.id)).size, 26);
  const supportCase = await db.supportCase.findUniqueOrThrow({ where: { id: assigned.id } });
  const messages = await db.supportMessage.findMany({ where: { caseId: assigned.id } });
  const reads = await db.taskAlertRead.count(), financeReads = await db.financeAlertRead.count();
  const otherReads = await db.supportAlert.count({ where: { userId: other.user.id, readAt: { not: null } } });
  const audit = await db.auditEntry.count(), notices = await db.notification.count();
  assert.deepEqual(await (await team.session.request('/staff/alerts/read-all', post({ scope: 'support' }), secondBase)).json(), { updated: 26 });
  assert.deepEqual(await (await team.session.request('/staff/alerts/read-all', post({ scope: 'support' }))).json(), { updated: 0 });
  const unread = await staffAlertSnapshot(team.session, '?scope=support&unreadOnly=true');
  assert.equal(unread.total, 0); assert.equal(unread.supportCount, 26); assert.equal(unread.unreadCount, 1);
  assert.ok((await staffAlertSnapshot(team.session, '?scope=tasks&unreadOnly=true')).items.some((a) => a.id === task.id));
  assert.deepEqual(await db.supportCase.findUniqueOrThrow({ where: { id: assigned.id } }), supportCase);
  assert.deepEqual(await db.supportMessage.findMany({ where: { caseId: assigned.id } }), messages);
  assert.equal(await db.taskAlertRead.count(), reads); assert.equal(await db.financeAlertRead.count(), financeReads);
  assert.equal(await db.supportAlert.count({ where: { userId: other.user.id, readAt: { not: null } } }), otherReads);
  assert.equal(await db.auditEntry.count(), audit); assert.equal(await db.notification.count(), notices);
});

test('Support staff emails use private previews, Owner templates, bounded retries and current recipient eligibility', async () => {
  await quietStaffEmails();
  const { customer, owner, team, assigned } = await supportFixture('email');
  await quietStaffEmails();
  const row = await db.staffEmail.findFirstOrThrow({ where: { userId: team.user.id, kind: 'SUPPORT_ASSIGNED', supportAlert: { caseId: assigned.id } } });
  await db.staffEmail.update({ where: { id: row.id }, data: { status: 'PENDING' } });
  assert.equal(row.targetPath, `/system/support?case=${assigned.id}`);
  assert.doesNotMatch(JSON.stringify({ title: row.title, message: row.message, subject: row.subjectTemplate, body: row.bodyTemplate }), /Private concern|email|clientId/);
  const service = app.get(StaffEmailService);
  await db.staffEmail.update({ where: { id: row.id }, data: { attempts: 4, totalAttempts: 4 } });
  await service.deliver(async () => { throw new Error('Private provider response must remain hidden'); });
  const failed = await db.staffEmail.findUniqueOrThrow({ where: { id: row.id } });
  assert.equal(failed.status, 'FAILED'); assert.equal(failed.attempts, 5); assert.ok(failed.renderedBody!.includes(row.targetPath));
  assert.doesNotMatch(failed.error!, /Private provider/);
  assert.equal((await owner.request(`/staff-notification-settings/deliveries/${row.id}/retry`, post({ version: failed.version }))).status, 200);
  const sent: { id: string; subject: string; body: string }[] = [];
  await second.get(StaffEmailService).deliver(async (id, _to, subject, body) => { sent.push({ id, subject, body }); });
  assert.equal(sent[0].id, row.id); assert.equal(sent[0].subject, failed.renderedSubject); assert.equal(sent[0].body, failed.renderedBody);
  assert.equal((await db.staffEmail.findUniqueOrThrow({ where: { id: row.id } })).status, 'SENT');
  const settings = await (await owner.request('/staff-notification-settings')).json();
  const template = settings.templates.find((t: { kind: string }) => t.kind === 'SUPPORT_CUSTOMER_REPLY');
  const input = { version: template.version, enabled: false, subject: '{title}', body: 'Support update\n{message}\nOpen {url}' };
  const paused = await owner.request('/staff-notification-settings/templates/SUPPORT_CUSTOMER_REPLY', patch(input));
  assert.equal(paused.status, 200); const pausedTemplate = await paused.json();
  assert.equal((await owner.request('/staff-notification-settings/templates/SUPPORT_CUSTOMER_REPLY', patch(input))).status, 409);
  assert.equal((await customer.request(`/portal/support/${assigned.id}/replies`, post({ body: 'Private paused reply' }))).status, 201);
  assert.equal(await db.staffEmail.count({ where: { userId: team.user.id, kind: 'SUPPORT_CUSTOMER_REPLY' } }), 0);
  assert.equal((await staffAlertSnapshot(team.session, '?scope=support')).supportCount, 2);
  assert.equal((await owner.request('/staff-notification-settings/templates/SUPPORT_CUSTOMER_REPLY', patch({ ...input, version: pausedTemplate.version, enabled: true }))).status, 200);
  assert.equal((await customer.request(`/portal/support/${assigned.id}/replies`, post({ body: 'Private fresh reply' }))).status, 201);
  const replyEmail = await db.staffEmail.findFirstOrThrow({ where: { userId: team.user.id, kind: 'SUPPORT_CUSTOMER_REPLY' } });
  await db.user.update({ where: { id: team.user.id }, data: { role: 'RECORDS' } });
  assert.equal((await team.session.request('/staff/alerts?scope=support')).status, 401);
  await service.deliver(async () => { assert.fail('Revoked Support recipient must not receive an email'); });
  assert.equal((await db.staffEmail.findUniqueOrThrow({ where: { id: replyEmail.id } })).status, 'SKIPPED');
  await db.user.update({ where: { id: team.user.id }, data: { role: 'CS_TEAM' } });
  assert.equal((await team.session.request('/auth/login', post({ email: team.user.email, password }))).status, 200);
  assert.equal((await customer.request(`/portal/support/${assigned.id}/replies`, post({ body: 'Reply that gets answered' }))).status, 201);
  assert.equal((await team.session.request(`/support/cases/${assigned.id}/replies`, post({ body: 'Answered promptly' }))).status, 201);
  await service.deliver(async () => { assert.fail('Already answered reply must be skipped'); });
  assert.ok((await db.staffEmail.findMany({ where: { userId: team.user.id, kind: 'SUPPORT_CUSTOMER_REPLY' } })).every((r) => r.status === 'SKIPPED'));
});

test('Support alerts and read changes refresh only their recipient across API instances', async () => {
  const { customer, team, assigned } = await supportFixture('stream');
  const other = await alertAccount('support-stream-other', 'CS_TEAM');
  const ownFeed = await stream(team.session, secondBase), otherFeed = await stream(other.session), customerFeed = await stream(customer);
  try {
    assert.equal((await customer.request(`/portal/support/${assigned.id}/replies`, post({ body: 'Private live reply' }))).status, 201);
    const alert = await db.supportAlert.findFirstOrThrow({ where: { userId: team.user.id, caseId: assigned.id, kind: 'SUPPORT_CUSTOMER_REPLY' } });
    await ownFeed.wait(() => ownFeed.text.includes(alert.id));
    await otherFeed.wait(() => otherFeed.text.includes(assigned.id));
    await customerFeed.wait(() => customerFeed.text.includes(assigned.id));
    assert.equal(otherFeed.text.includes(alert.id), false); assert.equal(customerFeed.text.includes(alert.id), false);
    assert.doesNotMatch(ownFeed.text, /Private live reply|Private concern/);
    assert.equal((await team.session.request(`/staff/alerts/${alert.id}/read`, post({ entity: 'support' }))).status, 200);
    await ownFeed.wait(() => ownFeed.text.includes(`"entity":"staff-alert-read","recordId":"${team.user.id}"`));
    assert.equal(otherFeed.text.includes('staff-alert-read'), false); assert.equal(customerFeed.text.includes('staff-alert-read'), false);
  } finally { await Promise.all([ownFeed.close(), otherFeed.close(), customerFeed.close()]); }
});

test('Support outbox failures roll back case creation, replies and assignments; concurrent assignments create one event', async () => {
  await quietStaffEmails();
  const { customer, owner, team, assigned } = await supportFixture('atomic');
  const other = await alertAccount('support-atomic-other', 'CS_TEAM');
  const before = await db.supportCase.findUniqueOrThrow({ where: { id: assigned.id } });
  const counts = async () => ({ cases: await db.supportCase.count(), messages: await db.supportMessage.count(),
    alerts: await db.supportAlert.count(), emails: await db.staffEmail.count(), audit: await db.auditEntry.count(),
    notices: await db.notification.count(), events: await db.changeEvent.count() });
  const initial = await counts();
  await db.$executeRawUnsafe(`CREATE FUNCTION fail_support_outbox() RETURNS trigger AS $$ BEGIN
    IF NEW.kind::text LIKE 'SUPPORT_%' THEN RAISE EXCEPTION 'Test Support outbox failure'; END IF;
    RETURN NEW; END; $$ LANGUAGE plpgsql`);
  await db.$executeRawUnsafe('CREATE TRIGGER fail_support_outbox BEFORE INSERT ON "StaffEmail" FOR EACH ROW EXECUTE FUNCTION fail_support_outbox()');
  try {
    assert.equal((await customer.request('/portal/support', post({ category: 'Rollback', description: 'Private new concern' }))).status, 500);
    assert.equal((await customer.request(`/portal/support/${assigned.id}/replies`, post({ body: 'Rollback message' }))).status, 500);
    assert.equal((await owner.request(`/support/cases/${assigned.id}`, patch({ assignedStaffId: other.user.id, version: before.version }))).status, 500);
    assert.deepEqual(await counts(), initial);
    assert.deepEqual(await db.supportCase.findUniqueOrThrow({ where: { id: assigned.id } }), before);
  } finally {
    await db.$executeRawUnsafe('DROP TRIGGER fail_support_outbox ON "StaffEmail"');
    await db.$executeRawUnsafe('DROP FUNCTION fail_support_outbox()');
  }
  const concurrent = await Promise.all([
    owner.request(`/support/cases/${assigned.id}`, patch({ assignedStaffId: other.user.id, version: before.version })),
    owner.request(`/support/cases/${assigned.id}`, patch({ assignedStaffId: other.user.id, version: before.version }), secondBase),
  ]);
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409]);
  const updated = await db.supportCase.findUniqueOrThrow({ where: { id: assigned.id } });
  assert.equal(await db.supportAlert.count({ where: { userId: other.user.id, caseId: assigned.id } }), 1);
  const duplicateBefore = await counts();
  await db.$transaction((tx) => notifySupport(tx, updated, 'SUPPORT_ASSIGNED'));
  assert.deepEqual(await counts(), duplicateBefore);
  assert.equal((await staffAlertSnapshot(team.session, '?scope=support')).supportCount, 0);
});

async function createAlertAccount(owner: Session, key: string, role: Role = 'RECORDS') {
  const response = await owner.request('/accounts', post({ name: `Account subject ${key}`, email: `${suffix}-account-${key}@example.test`, role, password }));
  assert.equal(response.status, 201);
  return response.json() as Promise<{ id: string; name: string; email: string; role: Role; active: boolean; version: number }>;
}
async function updateAlertAccount(owner: Session, account: { id: string; version: number }, input: { role?: Role; active?: boolean }, apiBase = base) {
  const response = await owner.request(`/accounts/${account.id}`, patch({ ...input, version: account.version }), apiBase);
  assert.equal(response.status, 200);
  return response.json() as Promise<{ id: string; name: string; email: string; role: Role; active: boolean; version: number }>;
}

test('Account alerts and detail reads enforce every role, recipient isolation, strict input and staff-only events', async () => {
  await resetSupportLoginLimit();
  const matrix = new Map<Role, Awaited<ReturnType<typeof alertAccount>>>();
  for (const role of roles) matrix.set(role, await alertAccount(`account-role-${role}`, role));
  const owner = matrix.get('OWNER')!;
  const subject = await createAlertAccount(owner.session, 'matrix');
  const recipients = await db.accountAlert.findMany({ where: { accountId: subject.id } });
  const owners = await db.user.findMany({ where: { active: true, role: 'OWNER' }, select: { id: true } });
  assert.deepEqual(recipients.map((r) => r.userId).sort(), owners.map((o) => o.id).sort());
  const target = recipients.find((r) => r.userId === owner.user.id)!;
  for (const role of roles) {
    const session = matrix.get(role)!.session;
    assert.equal((await session.request('/staff/alerts?scope=accounts')).status, role === 'OWNER' ? 200 : 403, role);
    assert.equal((await session.request('/staff/alerts/read-all', post({ scope: 'accounts' }))).status, role === 'OWNER' ? 200 : 403, role);
    assert.equal((await session.request(`/staff/alerts/${target.id}/read`, post({ entity: 'account' }))).status, role === 'OWNER' ? 200 : 403, role);
    assert.equal((await session.request(`/accounts/${subject.id}`)).status, role === 'OWNER' ? 200 : 403, role);
    if (role !== 'CUSTOMER') {
      const queue = await staffAlertSnapshot(session);
      assert.equal(queue.items.some((r) => r.id === target.id), role === 'OWNER', role);
      assert.equal(queue.accountCount, role === 'OWNER' ? 1 : 0, role);
    }
  }
  const foreignOwner = await alertAccount('account-foreign-owner', 'OWNER');
  assert.equal((await foreignOwner.session.request(`/staff/alerts/${target.id}/read`, post({ entity: 'account' }))).status, 404);
  assert.equal((await staffAlertSnapshot(foreignOwner.session, '?scope=accounts')).total, 0);
  const preview = (await staffAlertSnapshot(owner.session, '?scope=accounts')).items[0];
  assert.equal(preview.targetPath, `/system/team?account=${subject.id}`);
  assert.ok(preview.message.includes(subject.name));
  assert.doesNotMatch(JSON.stringify(preview), /password|passwordHash|@example\.test|clientId|session|reset/i);
  const detail = await (await owner.session.request(`/accounts/${subject.id}`)).json();
  assert.equal(detail.email, subject.email); assert.doesNotMatch(JSON.stringify(detail), /passwordHash|sessions|resets/);
  for (const extra of [{ userId: foreignOwner.user.id }, { accountId: subject.id }, { active: false }, { version: 1 }])
    assert.equal((await owner.session.request(`/staff/alerts/${target.id}/read`, post({ entity: 'account', ...extra }))).status, 400);
  assert.equal((await owner.session.request(`/staff/alerts/${target.id}/read`, { ...post({ entity: 'account' }), headers: { Origin: 'https://foreign.test' } })).status, 403);
  assert.equal((await new Session().request('/staff/alerts?scope=accounts')).status, 401);
  assert.equal((await new Session().request(`/accounts/${subject.id}`)).status, 401);
  assert.equal((await owner.session.request('/accounts/invalid')).status, 400);
  assert.equal((await owner.session.request(`/accounts/${randomUUID()}`)).status, 404);
  const customerClient = await db.client.create({ data: { name: 'Account event customer', email: '', phone: '', batchId } });
  const customer = await owner.session.request('/accounts', post({ name: 'Customer account', email: `${suffix}-account-customer@example.test`, password, role: 'CUSTOMER', clientId: customerClient.id }));
  assert.equal(customer.status, 201); const customerAccount = await customer.json();
  assert.equal((await owner.session.request(`/accounts/${customerAccount.id}`, patch({ active: false, version: 1 }))).status, 200);
  assert.equal(await db.accountAlert.count({ where: { accountId: customerAccount.id } }), 0);
});

test('Account lifecycle keeps historical snapshots, emits each real change once and retains existing session revocation', async () => {
  await resetSupportLoginLimit();
  const owner = await alertAccount('account-lifecycle-owner', 'OWNER');
  let subject = await createAlertAccount(owner.session, 'lifecycle');
  const employee = new Session();
  assert.equal((await employee.request('/auth/login', post({ email: subject.email, password }))).status, 200);
  const original = await db.accountAlert.findFirstOrThrow({ where: { userId: owner.user.id, accountId: subject.id } });
  const count = await db.accountAlert.count();
  assert.equal((await owner.session.request(`/accounts/${subject.id}`, patch({ role: subject.role, active: true, version: subject.version }))).status, 200);
  assert.equal(await db.accountAlert.count(), count);
  subject = await updateAlertAccount(owner.session, subject, { role: 'FINANCE_OFFICER', active: false });
  assert.equal((await employee.request('/auth/me')).status, 401);
  const decisions = await db.accountAlert.findMany({ where: { userId: owner.user.id, accountId: subject.id, accountVersion: 2 } });
  assert.deepEqual(decisions.map((a) => a.kind).sort(), ['ACCOUNT_DEACTIVATED', 'ACCOUNT_ROLE_CHANGED']);
  assert.ok(decisions.every((a) => a.previousRole === 'RECORDS' && a.role === 'FINANCE_OFFICER' && a.previousActive && !a.active));
  assert.equal((await owner.session.request(`/accounts/${subject.id}`, patch({ active: true, version: 1 }))).status, 409);
  subject = await updateAlertAccount(owner.session, subject, { active: true }, secondBase);
  const active = await db.accountAlert.findFirstOrThrow({ where: { userId: owner.user.id, accountId: subject.id, kind: 'ACCOUNT_ACTIVATED' } });
  assert.equal(active.accountVersion, 3); assert.equal(active.previousActive, false); assert.equal(active.active, true);
  const history = await staffAlertSnapshot(owner.session, '?scope=accounts');
  assert.equal(history.accountCount, 4); assert.equal(history.items.length, 4);
  assert.ok(history.items.find((a) => a.id === original.id)!.message.includes('records'));
  assert.ok(history.items.find((a) => a.id === decisions.find((a) => a.kind === 'ACCOUNT_ROLE_CHANGED')!.id)!.message.includes('records → finance officer'));
  assert.equal((await (await owner.session.request(`/accounts/${subject.id}`)).json()).role, 'FINANCE_OFFICER');
  assert.equal((await owner.session.request(`/accounts/${owner.user.id}`, patch({ active: false, version: 1 }))).status, 400);
  assert.equal((await owner.session.request(`/accounts/${owner.user.id}`, patch({ role: 'RECORDS', version: 1 }))).status, 400);
  const promoted = await alertAccount('account-promoted', 'RECORDS');
  assert.equal((await owner.session.request(`/accounts/${promoted.user.id}`, patch({ role: 'OWNER', version: 1 }))).status, 200);
  assert.equal(await db.accountAlert.count({ where: { userId: promoted.user.id } }), 1);
  const promotion = await db.accountAlert.findFirstOrThrow({ where: { userId: promoted.user.id } });
  assert.equal(promotion.kind, 'ACCOUNT_ROLE_CHANGED'); assert.equal(promotion.accountId, promoted.user.id);
});

test('Account mark-all reads all historical pages without changing access, sessions, audit, money or other categories', async () => {
  await resetSupportLoginLimit();
  const owner = await alertAccount('account-pages-owner', 'OWNER');
  const other = await alertAccount('account-pages-other', 'OWNER');
  let subject = await createAlertAccount(owner.session, 'pages');
  for (let i = 0; i < 25; i++) subject = await updateAlertAccount(owner.session, subject, { role: i % 2 === 0 ? 'CS_TEAM' : 'RECORDS' });
  const task = await alertTask(owner.user.id, 'Unrelated Owner task');
  const first = await staffAlertSnapshot(owner.session, '?scope=accounts&unreadOnly=true');
  const next = await staffAlertSnapshot(owner.session, '?scope=accounts&unreadOnly=true&page=2', secondBase);
  assert.equal(first.total, 26); assert.equal(first.items.length, 20); assert.equal(next.items.length, 6);
  assert.equal(new Set([...first.items, ...next.items].map((a) => a.id)).size, 26);
  const source = await db.user.findUniqueOrThrow({ where: { id: subject.id } });
  const sessions = await db.session.findMany({ where: { userId: subject.id } });
  const audit = await db.auditEntry.count(), notices = await db.notification.count();
  const taskReads = await db.taskAlertRead.count(), financeReads = await db.financeAlertRead.count(), resultReads = await db.paymentResultAlert.count({ where: { readAt: { not: null } } });
  const otherRead = await db.accountAlert.count({ where: { userId: other.user.id, readAt: { not: null } } });
  const balance = await (await owner.session.request(`/clients/${firstClient}/balance`)).json();
  const target = first.items[0];
  const receipt = await (await owner.session.request(`/staff/alerts/${target.id}/read`, staffRead(target), secondBase)).json();
  assert.equal((await (await owner.session.request(`/staff/alerts/${target.id}/read`, staffRead(target))).json()).readAt, receipt.readAt);
  assert.deepEqual(await (await owner.session.request('/staff/alerts/read-all', post({ scope: 'accounts' }))).json(), { updated: 25 });
  assert.deepEqual(await (await owner.session.request('/staff/alerts/read-all', post({ scope: 'accounts' }))).json(), { updated: 0 });
  const unread = await staffAlertSnapshot(owner.session, '?scope=accounts&unreadOnly=true');
  assert.equal(unread.total, 0); assert.equal(unread.accountCount, 26); assert.equal(unread.unreadCount, first.unreadCount - 26);
  assert.ok((await staffAlertSnapshot(owner.session, '?scope=tasks&unreadOnly=true')).items.some((a) => a.id === task.id));
  assert.deepEqual(await db.user.findUniqueOrThrow({ where: { id: subject.id } }), source);
  assert.deepEqual(await db.session.findMany({ where: { userId: subject.id } }), sessions);
  assert.equal(await db.auditEntry.count(), audit); assert.equal(await db.notification.count(), notices);
  assert.equal(await db.taskAlertRead.count(), taskReads); assert.equal(await db.financeAlertRead.count(), financeReads);
  assert.equal(await db.paymentResultAlert.count({ where: { readAt: { not: null } } }), resultReads);
  assert.equal(await db.accountAlert.count({ where: { userId: other.user.id, readAt: { not: null } } }), otherRead);
  assert.deepEqual(await (await owner.session.request(`/clients/${firstClient}/balance`)).json(), balance);
});

test('Account emails use four Owner templates, private local previews and frozen bounded retries for historical events', async () => {
  await quietStaffEmails(); await resetSupportLoginLimit();
  const owner = await alertAccount('account-mail-owner', 'OWNER');
  let subject = await createAlertAccount(owner.session, 'mail');
  subject = await updateAlertAccount(owner.session, subject, { role: 'CS_TEAM', active: false });
  subject = await updateAlertAccount(owner.session, subject, { active: true });
  const rows = await db.staffEmail.findMany({ where: { userId: owner.user.id, accountAlert: { accountId: subject.id } } });
  assert.deepEqual(rows.map((r) => r.kind).sort(), ['ACCOUNT_ACTIVATED', 'ACCOUNT_CREATED', 'ACCOUNT_DEACTIVATED', 'ACCOUNT_ROLE_CHANGED']);
  for (const row of rows) {
    assert.equal(row.targetPath, `/system/team?account=${subject.id}`);
    assert.doesNotMatch(row.message, /Account subject|account-mail|@|Integration-password|RECORDS|CS_TEAM/);
  }
  for (let i = 0; i < 12 && await db.staffEmail.count({ where: { status: 'PENDING', accountAlertId: { not: null } } }); i++) await app.get(EmailDeliveryService).deliver();
  for (const row of rows) {
    assert.equal((await db.staffEmail.findUniqueOrThrow({ where: { id: row.id } })).status, 'SENT');
    const preview = await readFile(join(process.cwd(), '.local/mail', `${row.id}.txt`), 'utf8');
    assert.ok(preview.includes(row.targetPath)); assert.doesNotMatch(preview, /Account subject|Integration-password|passwordHash/);
  }
  const settings = await (await owner.session.request('/staff-notification-settings')).json();
  assert.equal(settings.templates.length, 14);
  const template = settings.templates.find((t: { kind: string }) => t.kind === 'ACCOUNT_CREATED');
  const input = { version: template.version, enabled: false, subject: '{title}', body: 'Owner event\n{message}\nOpen {url}' };
  const pausedResponse = await owner.session.request('/staff-notification-settings/templates/ACCOUNT_CREATED', patch(input));
  assert.equal(pausedResponse.status, 200); const paused = await pausedResponse.json();
  assert.equal((await owner.session.request('/staff-notification-settings/templates/ACCOUNT_CREATED', patch(input))).status, 409);
  const pausedSubject = await createAlertAccount(owner.session, 'mail-paused');
  assert.equal(await db.staffEmail.count({ where: { accountAlert: { accountId: pausedSubject.id } } }), 0);
  assert.equal(await db.accountAlert.count({ where: { userId: owner.user.id, accountId: pausedSubject.id } }), 1);
  assert.equal((await owner.session.request('/staff-notification-settings/templates/ACCOUNT_CREATED', patch({ ...input, enabled: true, version: paused.version }))).status, 200);
  assert.equal(await db.staffEmail.count({ where: { accountAlert: { accountId: pausedSubject.id } } }), 0);
  await quietStaffEmails();
  const failedSubject = await createAlertAccount(owner.session, 'mail-retry');
  const mail = await db.staffEmail.findFirstOrThrow({ where: { userId: owner.user.id, accountAlert: { accountId: failedSubject.id } } });
  await quietStaffEmails(); await db.staffEmail.update({ where: { id: mail.id }, data: { status: 'PENDING', attempts: 4, totalAttempts: 4 } });
  await app.get(StaffEmailService).deliver(async () => { throw new Error('Sensitive provider response'); });
  const failed = await db.staffEmail.findUniqueOrThrow({ where: { id: mail.id } });
  assert.equal(failed.status, 'FAILED'); assert.equal(failed.attempts, 5); assert.doesNotMatch(failed.error!, /Sensitive/);
  await updateAlertAccount(owner.session, failedSubject, { active: false });
  await quietStaffEmails();
  assert.equal((await owner.session.request(`/staff-notification-settings/deliveries/${mail.id}/retry`, post({ version: failed.version }))).status, 200);
  const sent: { id: string; subject: string; body: string }[] = [];
  await second.get(StaffEmailService).deliver(async (id, _to, subject, body) => { sent.push({ id, subject, body }); });
  assert.deepEqual(sent, [{ id: mail.id, subject: failed.renderedSubject!, body: failed.renderedBody! }]);
  const history = await (await owner.session.request('/staff-notification-settings/deliveries?kind=ACCOUNT_CREATED')).json();
  assert.doesNotMatch(JSON.stringify(history), /accountAlertId|accountName|subjectTemplate|renderedBody|passwordHash|targetPath/);
});

test('Account email and receipt eligibility rechecks current Owner access, active status and captured recipient address', async () => {
  await quietStaffEmails(); await resetSupportLoginLimit();
  const actor = await new Session().login('OWNER');
  const recipients = await Promise.all(['role', 'inactive', 'address', 'valid'].map((key) => alertAccount(`account-recipient-${key}`, 'OWNER')));
  const subject = await createAlertAccount(actor, 'eligibility');
  const rows = await Promise.all(recipients.map((r) => db.staffEmail.findFirstOrThrow({ where: { userId: r.user.id, accountAlert: { accountId: subject.id } } })));
  await db.staffEmail.updateMany({ where: { id: { notIn: rows.map((r) => r.id) }, status: { in: ['PENDING', 'SENDING'] } }, data: { status: 'SKIPPED' } });
  await db.user.update({ where: { id: recipients[0].user.id }, data: { role: 'RECORDS' } });
  await db.user.update({ where: { id: recipients[1].user.id }, data: { active: false } });
  await db.user.update({ where: { id: recipients[2].user.id }, data: { email: `${suffix}-account-new-address@example.test` } });
  assert.equal((await recipients[0].session.request('/staff/alerts?scope=accounts')).status, 401);
  assert.equal((await recipients[0].session.request('/auth/login', post({ email: recipients[0].user.email, password }))).status, 200);
  assert.equal((await staffAlertSnapshot(recipients[0].session)).accountCount, 0);
  assert.equal((await recipients[1].session.request('/staff/alerts?scope=accounts')).status, 401);
  const stale = { id: recipients[0].user.id, role: 'OWNER', name: recipients[0].user.name, email: recipients[0].user.email, clientId: null, permissions: rolePermissions.OWNER } as const;
  await assert.rejects(app.get(StaffAlertsService).readAll({ ...stale, permissions: [...stale.permissions] }, 'accounts'), /Owner account access/);
  const delivered: string[] = [];
  await app.get(StaffEmailService).deliver(async (id) => { delivered.push(id); });
  assert.deepEqual(delivered, [rows[3].id]);
  for (const row of rows.slice(0, 3)) assert.equal((await db.staffEmail.findUniqueOrThrow({ where: { id: row.id } })).status, 'SKIPPED');
});

test('Account SSE events and read invalidations stay private to each active Owner across instances', async () => {
  await resetSupportLoginLimit();
  const own = await alertAccount('account-stream-own', 'OWNER'), other = await alertAccount('account-stream-other', 'OWNER');
  const staff = await alertAccount('account-stream-staff', 'CS_TEAM'), customer = await alertAccount('account-stream-customer', 'CUSTOMER');
  const feeds = await Promise.all([stream(own.session, secondBase), stream(other.session), stream(staff.session), stream(customer.session)]);
  try {
    const subject = await createAlertAccount(own.session, 'stream');
    const ownAlert = await db.accountAlert.findFirstOrThrow({ where: { userId: own.user.id, accountId: subject.id } });
    const otherAlert = await db.accountAlert.findFirstOrThrow({ where: { userId: other.user.id, accountId: subject.id } });
    await feeds[0].wait(() => feeds[0].text.includes(ownAlert.id)); await feeds[1].wait(() => feeds[1].text.includes(otherAlert.id));
    assert.equal(feeds[0].text.includes(otherAlert.id), false); assert.equal(feeds[1].text.includes(ownAlert.id), false);
    for (const feed of feeds.slice(2)) { assert.equal(feed.text.includes(ownAlert.id), false); assert.equal(feed.text.includes(subject.id), false); }
    assert.doesNotMatch(feeds[0].text, /Account subject|account-stream|Integration-password|passwordHash/);
    assert.equal((await own.session.request(`/staff/alerts/${ownAlert.id}/read`, post({ entity: 'account' }))).status, 200);
    await feeds[0].wait(() => feeds[0].text.includes(`"entity":"staff-alert-read","recordId":"${own.user.id}"`));
    assert.ok(feeds.slice(1).every((feed) => !feed.text.includes('staff-alert-read')));
  } finally { await Promise.all(feeds.map((feed) => feed.close())); }
});

test('Account outbox failure rolls back creation, access, audit and session revocation; concurrent changes deduplicate events', async () => {
  await quietStaffEmails(); await resetSupportLoginLimit();
  const owner = await alertAccount('account-atomic-owner', 'OWNER');
  const subject = await createAlertAccount(owner.session, 'atomic');
  const employee = new Session(); assert.equal((await employee.request('/auth/login', post({ email: subject.email, password }))).status, 200);
  const before = await db.user.findUniqueOrThrow({ where: { id: subject.id } });
  const sessions = await db.session.findMany({ where: { userId: subject.id } });
  const counts = async () => ({ users: await db.user.count(), alerts: await db.accountAlert.count(), emails: await db.staffEmail.count(),
    audit: await db.auditEntry.count(), events: await db.changeEvent.count(), notices: await db.notification.count() });
  const original = await counts();
  await db.$executeRawUnsafe(`CREATE FUNCTION fail_account_outbox() RETURNS trigger AS $$ BEGIN
    IF NEW.kind::text LIKE 'ACCOUNT_%' THEN RAISE EXCEPTION 'Test account outbox failure'; END IF;
    RETURN NEW; END; $$ LANGUAGE plpgsql`);
  await db.$executeRawUnsafe('CREATE TRIGGER fail_account_outbox BEFORE INSERT ON "StaffEmail" FOR EACH ROW EXECUTE FUNCTION fail_account_outbox()');
  try {
    assert.equal((await owner.session.request('/accounts', post({ name: 'Rollback staff', email: `${suffix}-account-rollback@example.test`, role: 'RECORDS', password }))).status, 500);
    assert.equal((await owner.session.request(`/accounts/${subject.id}`, patch({ role: 'CS_TEAM', active: false, version: 1 }))).status, 500);
    assert.deepEqual(await counts(), original);
    assert.deepEqual(await db.user.findUniqueOrThrow({ where: { id: subject.id } }), before);
    assert.deepEqual(await db.session.findMany({ where: { userId: subject.id } }), sessions);
    assert.equal((await employee.request('/auth/me')).status, 200);
  } finally {
    await db.$executeRawUnsafe('DROP TRIGGER fail_account_outbox ON "StaffEmail"'); await db.$executeRawUnsafe('DROP FUNCTION fail_account_outbox()');
  }
  const responses = await Promise.all([
    owner.session.request(`/accounts/${subject.id}`, patch({ active: false, role: 'CS_TEAM', version: 1 })),
    owner.session.request(`/accounts/${subject.id}`, patch({ active: false, role: 'CS_HEAD', version: 1 }), secondBase),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  const current = await db.user.findUniqueOrThrow({ where: { id: subject.id } });
  assert.equal(current.version, 2); assert.equal((await employee.request('/auth/me')).status, 401);
  assert.equal(await db.accountAlert.count({ where: { userId: owner.user.id, accountId: subject.id, kind: 'ACCOUNT_DEACTIVATED' } }), 1);
  const afterCounts = await counts();
  await db.$transaction((tx) => notifyAccount(tx, owner.user, before, current));
  assert.deepEqual(await counts(), afterCounts);
});

async function recordFilterFixture(key: string) {
  await resetAlertLoginLimit();
  const owner = await alertAccount(`filter-${key}-owner`, 'OWNER');
  const handler = await alertAccount(`filter-${key}-handler`, 'CORE_HANDLER');
  const otherHandler = await alertAccount(`filter-${key}-other`, 'CORE_HANDLER');
  const agent = await db.agent.create({ data: { name: `Filter agent ${key}`, code: `FILTER-${key}-${suffix}` } });
  const otherAgent = await db.agent.create({ data: { name: `Other filter agent ${key}`, code: `FILTER-O-${key}-${suffix}` } });
  const prefix = `F-${key}-${suffix}`;
  const batch = await db.batch.create({ data: { code: `${prefix}-A`, model: 'iPhone 15 Pro', status: 'ACTIVE',
    startDate: new Date('2028-02-29'), endDate: new Date('2028-10-01'), handlerId: handler.user.id, agentId: agent.id } });
  const other = await db.batch.create({ data: { code: `${prefix}-B`, model: 'iPhone 15 Pro', status: 'ACTIVE',
    startDate: new Date('2028-03-01'), endDate: new Date('2028-10-01'), handlerId: otherHandler.user.id, agentId: otherAgent.id } });
  return { owner, handler, otherHandler, agent, otherAgent, prefix, batch, other };
}
async function filterPage(session: Session, kind: 'batches' | 'clients', query: Record<string, string>, apiBase = base) {
  const response = await session.request(`/${kind}?${new URLSearchParams(query)}`, {}, apiBase);
  assert.equal(response.status, 200);
  return response.json() as Promise<{ items: { id: string; version: number }[]; total: number; page: number; pageSize: number }>;
}

test('Records/Clients filters enforce the full role matrix and strict inputs at the HTTP boundary', async () => {
  await resetAlertLoginLimit();
  const query = '?q=filter&model=iphone&status=ACTIVE&dateFrom=2028-02-29&dateTo=2028-03-01';
  for (const path of ['/batches', '/clients']) assert.equal((await new Session().request(path + query)).status, 401);
  for (const role of roles) {
    const { session } = await alertAccount(`filter-matrix-${role}`, role);
    for (const [path, permission] of [['/batches', 'BATCH_READ'], ['/clients', 'CLIENT_READ']] as const)
      assert.equal((await session.request(path + query)).status, rolePermissions[role].includes(permission) ? 200 : 403, `${role} ${path}`);
  }
  await resetAlertLoginLimit();
  const owner = await alertAccount('filter-input-owner', 'OWNER');
  for (const path of ['/batches', '/clients']) {
    for (const input of ['?dateFrom=2027-02-29', '?dateTo=2028-02-30', '?dateFrom=2028-03-01&dateTo=2028-02-29',
      '?model=iphone&model=ipad', '?handlerId=foreign', '?agentId=foreign', '?page=0', '?page=100001',
      '?ownerId=foreign', '?status=anything', `?model=${'a'.repeat(101)}`])
      assert.equal((await owner.session.request(path + input)).status, 400, path + input);
  }
  assert.equal((await owner.session.request('/batches?status=ON_HOLD')).status, 400);
  assert.equal((await owner.session.request('/clients?status=CANCELLED')).status, 400);
  await db.user.update({ where: { id: owner.user.id }, data: { role: 'CS_TEAM' } });
  assert.equal((await owner.session.request('/batches' + query)).status, 401);
  assert.equal((await owner.session.request('/clients' + query)).status, 401);
});

test('batch model/status/start-date filters intersect assignments and include both date endpoints', async () => {
  const f = await recordFilterFixture('dates');
  const fixtures = [];
  for (const [index, status] of ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].entries())
    fixtures.push(await db.batch.create({ data: { code: `${f.prefix}-${index}`, model: 'iPhone 15 Pro',
      status: status as 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED', startDate: new Date(index === 0 ? '2028-02-28' : index === 3 ? '2028-03-02' : '2028-03-01'),
      endDate: new Date('2028-10-01'), handlerId: f.handler.user.id, agentId: f.agent.id } }));
  const query = { q: f.prefix, model: 'pHoNe 15', dateFrom: '2028-02-29', dateTo: '2028-03-01', handlerId: f.handler.user.id, agentId: f.agent.id };
  const page = await filterPage(f.owner.session, 'batches', query);
  assert.equal(page.total, 3); assert.deepEqual(new Set(page.items.map(x => x.id)), new Set([f.batch.id, fixtures[1].id, fixtures[2].id]));
  assert.equal((await filterPage(f.owner.session, 'batches', { ...query, status: 'COMPLETED' })).total, 1);
  assert.equal((await filterPage(f.owner.session, 'batches', { ...query, model: 'ipad' })).total, 0);
  assert.equal((await filterPage(f.owner.session, 'batches', { ...query, q: 'no-match' })).total, 0);
  assert.equal((await filterPage(f.owner.session, 'batches', { ...query, dateFrom: '2028-02-29', dateTo: '2028-02-29' })).items[0].id, f.batch.id);
  for (const [index, status] of ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].entries()) {
    const result = await filterPage(f.owner.session, 'batches', { q: fixtures[index].code, status });
    assert.equal(result.total, 1); assert.equal(result.items[0].id, fixtures[index].id);
  }
  assert.equal((await filterPage(f.owner.session, 'batches', { q: f.prefix, dateTo: '2028-02-28' })).total, 1);
  assert.equal((await filterPage(f.owner.session, 'batches', { q: f.prefix, dateFrom: '2028-03-02' })).total, 1);
});

test('client filters use displayed unit fallback and joined date, preserve legacy rows without a range, and perform no writes', async () => {
  const f = await recordFilterFixture('client');
  const rows = [];
  for (const [index, value] of [
    { unitModel: '', joinedAt: '2028-02-29', status: 'ACTIVE' },
    { unitModel: 'iPHONE 15 Pro', joinedAt: '2028-03-01', status: 'ON_HOLD' },
    { unitModel: 'iPad Air', joinedAt: '2028-03-01', status: 'COMPLETED' },
    { unitModel: '', joinedAt: null, status: 'ACTIVE' },
    { unitModel: '', joinedAt: '2028-02-28', status: 'ACTIVE' },
  ].entries()) rows.push(await db.client.create({ data: { name: `${f.prefix} Client ${index}`, email: '', phone: '', batchId: f.batch.id,
    unitModel: value.unitModel, status: value.status as 'ACTIVE' | 'ON_HOLD' | 'COMPLETED', joinedAt: value.joinedAt ? new Date(value.joinedAt) : null,
    createdAt: new Date('2026-01-01') } }));
  const before = await Promise.all([db.auditEntry.count(), db.changeEvent.count(), db.notification.count(),
    db.scheduleItem.count(), db.payment.count(), db.client.findMany({ where: { batchId: f.batch.id } })]);
  const query = { q: f.prefix, model: 'pHoNe 15', dateFrom: '2028-02-29', dateTo: '2028-03-01',
    batchId: f.batch.id, handlerId: f.handler.user.id, agentId: f.agent.id };
  const result = await filterPage(f.owner.session, 'clients', query);
  assert.deepEqual(new Set(result.items.map(x => x.id)), new Set(rows.slice(0, 2).map(x => x.id))); assert.equal(result.total, 2);
  assert.equal((await filterPage(f.owner.session, 'clients', { ...query, status: 'ON_HOLD' })).items[0].id, rows[1].id);
  assert.equal((await filterPage(f.owner.session, 'clients', { ...query, model: 'ipad', status: 'COMPLETED' })).items[0].id, rows[2].id);
  assert.equal((await filterPage(f.owner.session, 'clients', { ...query, dateTo: '2028-02-29' })).items[0].id, rows[0].id);
  assert.equal((await filterPage(f.owner.session, 'clients', { q: f.prefix, model: 'iphone' })).total, 4);
  assert.equal((await filterPage(f.owner.session, 'clients', { q: f.prefix, dateTo: '2028-02-28' })).items[0].id, rows[4].id);
  assert.equal((await filterPage(f.owner.session, 'clients', { q: f.prefix, dateFrom: '2028-03-01' })).total, 2);
  assert.equal((await filterPage(f.owner.session, 'clients', { q: f.prefix, dateTo: '2026-01-01' })).total, 0);
  const after = await Promise.all([db.auditEntry.count(), db.changeEvent.count(), db.notification.count(),
    db.scheduleItem.count(), db.payment.count(), db.client.findMany({ where: { batchId: f.batch.id } })]);
  assert.deepEqual(after, before);
});

test('handler filter counts and exact client links cannot expand assigned access or survive reassignment', async () => {
  const f = await recordFilterFixture('scope');
  const own = await db.client.create({ data: { name: `${f.prefix} Own`, email: '', phone: '', batchId: f.batch.id,
    joinedAt: new Date('2028-02-29'), unitModel: 'iPhone 15 Pro' } });
  const foreign = await db.client.create({ data: { name: `${f.prefix} Private`, email: '', phone: '', batchId: f.other.id,
    joinedAt: new Date('2028-03-01'), unitModel: 'iPhone 15 Pro' } });
  const query = { q: f.prefix, model: 'iphone', status: 'ACTIVE', dateFrom: '2028-02-29', dateTo: '2028-03-01' };
  for (const kind of ['batches', 'clients'] as const) {
    const result = await filterPage(f.handler.session, kind, query); assert.equal(result.total, 1);
    assert.equal(result.items[0].id, kind === 'batches' ? f.batch.id : own.id);
    const assignmentFilters: Record<string, string>[] = [{ handlerId: f.otherHandler.user.id }, { agentId: f.otherAgent.id }];
    for (const extra of assignmentFilters) {
      const hidden = await filterPage(f.handler.session, kind, { ...query, ...extra });
      assert.equal(hidden.total, 0); assert.deepEqual(hidden.items, []);
    }
  }
  assert.equal((await filterPage(f.handler.session, 'clients', { id: foreign.id })).total, 0);
  assert.equal((await filterPage(f.handler.session, 'clients', { batchId: f.other.id, ...query })).total, 0);
  assert.equal((await filterPage(f.handler.session, 'clients', { id: own.id })).items[0].id, own.id);
  assert.equal((await f.handler.session.request(`/clients/${foreign.id}`)).status, 404);
  const reassignment = await f.owner.session.request(`/batches/${f.batch.id}/assignments`, patch({ version: f.batch.version,
    handlerId: f.otherHandler.user.id, agentId: f.agent.id }));
  assert.equal(reassignment.status, 200);
  for (const kind of ['batches', 'clients'] as const)
    assert.equal((await filterPage(f.handler.session, kind, query, secondBase)).total, 0);
  assert.equal((await f.handler.session.request(`/clients/${own.id}`)).status, 404);
});

test('combined record filters paginate accurate totals without duplicates and keep exact client lookup independent of a page', async () => {
  const f = await recordFilterFixture('pages');
  const batchIds = [], clientIds = [];
  for (let index = 0; index < 25; index++) {
    const batch = await db.batch.create({ data: { code: `${f.prefix}-${index}`, model: 'iPad Air', status: 'ACTIVE',
      startDate: new Date('2028-02-29'), endDate: new Date('2028-10-01'), handlerId: f.handler.user.id, agentId: f.agent.id,
      createdAt: new Date('2026-01-01') } });
    batchIds.push(batch.id);
    const client = await db.client.create({ data: { name: `${f.prefix} ${index}`, email: '', phone: '', batchId: batch.id,
      joinedAt: new Date('2028-02-29'), createdAt: new Date('2026-01-01') } });
    clientIds.push(client.id);
  }
  const query = { q: f.prefix, model: 'ipad', status: 'ACTIVE', handlerId: f.handler.user.id, agentId: f.agent.id,
    dateFrom: '2028-02-29', dateTo: '2028-02-29' };
  for (const [kind, ids] of [['batches', batchIds], ['clients', clientIds]] as const) {
    const first = await filterPage(f.handler.session, kind, { ...query, page: '1' });
    const secondPage = await filterPage(f.handler.session, kind, { ...query, page: '2' }, secondBase);
    assert.equal(first.total, 25); assert.equal(first.pageSize, 20); assert.equal(first.items.length, 20);
    assert.equal(secondPage.total, 25); assert.equal(secondPage.items.length, 5);
    const actual = [...first.items, ...secondPage.items].map(x => x.id);
    assert.equal(new Set(actual).size, 25); assert.deepEqual(new Set(actual), new Set(ids));
    assert.deepEqual(actual, [...ids].sort().reverse());
    const empty = await filterPage(f.handler.session, kind, { ...query, page: '3' });
    assert.equal(empty.total, 25); assert.deepEqual(empty.items, []);
    assert.deepEqual((await filterPage(f.handler.session, kind, { ...query, status: 'COMPLETED' })).items, []);
  }
  const linked = await filterPage(f.handler.session, 'clients', { id: clientIds[0] });
  assert.equal(linked.total, 1); assert.equal(linked.items[0].id, clientIds[0]);
});

test('merged operations endpoints retain the existing permission grants and enforce new role-specific permissions', async () => {
  await resetAlertLoginLimit();
  for (const role of roles) {
    const { session } = await alertAccount(`merged-role-${role}`, role);
    for (const [path, permission] of [['/recruitment/jobs', 'RECRUITMENT_MANAGE'], ['/recruitment/applicants', 'RECRUITMENT_MANAGE'],
      ['/requirement-types', 'DOCUMENT_READ'], ['/notifications', 'NOTIFICATION_READ'], ['/work/tasks', 'TASK_READ'],
      ['/reports/tasks', 'REPORT_VIEW'], ['/reports/support', 'REPORT_VIEW']] as const)
      assert.equal((await session.request(path)).status,
        rolePermissions[role].includes(permission) && (path !== '/recruitment/applicants' || role === 'OWNER' || role === 'HR_PAYROLL') ? 200 : 403, `${role} ${path}`);
  }
  for (const path of ['/recruitment/jobs', '/requirement-types', '/notifications', '/work/tasks', '/reports/tasks'])
    assert.equal((await new Session().request(path)).status, 401, path);
  assert.equal(rolePermissions.COO.includes('SUPPORT_MANAGE'), false);
  assert.equal(rolePermissions.CORE_HANDLER.includes('BATCH_READ'), true);
  assert.equal(rolePermissions.CORE_HANDLER.includes('CLIENT_READ'), true);
});

test('merged recruitment supports public applications/private attachments and versioned internal review without touching client documents', async () => {
  await resetAlertLoginLimit();
  const owner = await alertAccount('merged-recruit-owner', 'OWNER');
  const hr = await alertAccount('merged-recruit-hr', 'HR_PAYROLL');
  const create = await owner.session.request('/recruitment/jobs', post({ title: `Merge job ${suffix}`, description: 'Approved role description',
    location: 'Cebu', employmentType: 'Full time', isOpen: true }));
  assert.equal(create.status, 201); const job = await create.json();
  const publicJobs = await (await new Session().request('/careers')).json();
  assert.ok(publicJobs.some((row: { id: string }) => row.id === job.id));
  const before = await db.customerDocument.count();
  const attachment = new FormData();
  attachment.append('jobId', job.id); attachment.append('fullName', 'Synthetic applicant'); attachment.append('email', `${suffix}-applicant@example.test`);
  attachment.append('phone', ''); attachment.append('message', 'Synthetic application');
  attachment.append('attachment', new Blob([Buffer.from('%PDF-1.7\nSynthetic private application')], { type: 'application/pdf' }), 'application.pdf');
  const applied = await new Session().upload('/careers/apply', attachment);
  assert.equal(applied.status, 201); const application = await applied.json();
  const page = await (await hr.session.request(`/recruitment/applicants?q=${suffix}`)).json();
  const row = page.items.find((item: { id: string }) => item.id === application.id); assert.ok(row); assert.equal(row.attachments.length, 1);
  assert.equal((await new Session().request(`/applicant-attachments/${row.attachments[0].id}/content`)).status, 401);
  const file = await hr.session.request(`/applicant-attachments/${row.attachments[0].id}/content`);
  assert.equal(file.status, 200); assert.match(await file.text(), /Synthetic private application/);
  assert.equal((await hr.session.request(`/recruitment/applicants/${row.id}`, patch({ status: 'SHORTLISTED', reviewerNotes: 'Reviewed by HR', version: row.version }))).status, 200);
  assert.equal((await hr.session.request(`/recruitment/applicants/${row.id}`, patch({ status: 'HIRED', version: row.version }))).status, 409);
  const closed = await owner.session.request(`/recruitment/jobs/${job.id}`, patch({ version: job.version,
    record: { title: job.title, description: job.description, location: job.location, employmentType: job.employmentType, isOpen: false } }));
  assert.equal(closed.status, 200);
  assert.equal((await new Session().request('/careers/apply', post({ jobId: job.id, fullName: 'Other applicant', email: `${suffix}-otherapp@example.test`, phone: '', message: '' }))).status, 404);
  assert.equal(await db.customerDocument.count(), before);
});

test('merged configured requirements keep old document reviews intact and enforce customer ownership with private revision history', async () => {
  await resetAlertLoginLimit();
  const owner = await alertAccount('merged-doc-owner', 'OWNER');
  const customer = await alertAccount('merged-doc-customer', 'CUSTOMER');
  const other = await alertAccount('merged-doc-other', 'CUSTOMER');
  const existing = await db.customerDocument.findMany({ orderBy: { id: 'asc' } });
  const response = await owner.session.request('/requirement-types', post({ code: `MERGE_${suffix}`, label: 'Synthetic approved requirement',
    description: 'Synthetic verification fixture', allowedMimeTypes: ['application/pdf'], maxBytes: 5 * 1024 * 1024, customerCanUpload: true, active: true }));
  assert.equal(response.status, 201); const type = await response.json(); const clientId = customer.user.clientId!;
  const file = new FormData(); file.append('document', new Blob([Buffer.from('%PDF-1.7\nPrivate configured requirement')], { type: 'application/pdf' }), 'requirement.pdf');
  const upload = await customer.session.upload(`/clients/${clientId}/requirements/${type.id}/upload`, file);
  assert.equal(upload.status, 201); const requirement = await upload.json(); assert.equal(requirement.status, 'SUBMITTED');
  assert.equal(requirement.documents[0].revision, 1);
  assert.equal((await other.session.request(`/clients/${clientId}/requirements`)).status, 404);
  assert.equal((await other.session.request(`/documents/${requirement.documents[0].id}/content`)).status, 404);
  const reviewed = await owner.session.request(`/client-requirements/${requirement.id}/review`, post({ status: 'NEEDS_CLARIFICATION',
    customerNote: 'Please provide a clearer scan.', internalNote: 'Internal review context', version: requirement.version }));
  assert.equal(reviewed.status, 201);
  assert.equal((await owner.session.request(`/client-requirements/${requirement.id}/review`, post({ status: 'APPROVED', customerNote: 'Reviewed', internalNote: '', version: requirement.version }))).status, 409);
  const own = await (await customer.session.request(`/clients/${clientId}/requirements`)).json();
  const current = own.find((item: { type: { id: string } }) => item.type.id === type.id);
  assert.equal(current.customerNote, 'Please provide a clearer scan.'); assert.equal('internalNote' in current, false);
  assert.equal(JSON.stringify(current).includes('Internal review context'), false);
  assert.deepEqual(await db.customerDocument.findMany({ orderBy: { id: 'asc' } }), existing);
});

test('merged operations reports count existing task submissions/reviews and support turnaround, export aggregates and retain snapshots', async () => {
  await resetAlertLoginLimit(); const owner = await alertAccount('merged-report-owner', 'OWNER');
  const task = await db.task.create({ data: { title: 'Private individual task title', instructions: '', assigneeId: owner.user.id, creatorId: owner.user.id,
    deadline: new Date('2034-01-01T12:00:00Z'), submittedAt: new Date('2034-01-01T13:00:00Z'), status: 'SUBMITTED', report: 'Private task evidence',
    lateFlag: true, createdAt: new Date('2034-01-01T10:00:00Z') } });
  await db.kpiReview.create({ data: { taskId: task.id, reviewerId: owner.user.id, factualEvidence: 'Manually reviewed timing', evaluation: 'Human review', recommendation: 'No automated wage action', decision: 'NOTED' } });
  await db.supportCase.create({ data: { clientId: firstClient, category: 'Synthetic report category', description: 'Private concern', status: 'CLOSED',
    resolution: 'Resolved by staff', createdAt: new Date('2034-01-01T10:00:00Z'), closedAt: new Date('2034-01-01T12:00:00Z') } });
  const query = '?dateFrom=2034-01-01&dateTo=2034-01-01';
  const tasks = await (await owner.session.request('/reports/tasks'+query)).json();
  assert.equal(tasks.total, 1); assert.equal(tasks.submitted, 1); assert.equal(tasks.reviewed, 1); assert.equal(tasks.late, 1);
  const support = await (await owner.session.request('/reports/support'+query)).json();
  assert.equal(support.closed, 1); assert.equal(support.categories[0].averageTurnaroundHours, 2);
  for (const kind of ['tasks', 'support']) {
    const csv = await owner.session.request(`/reports/export${query}&kind=${kind}&format=csv`); assert.equal(csv.status, 200);
    const text = await csv.text(); assert.equal(text.includes('Private individual task title'), false); assert.equal(text.includes('Private concern'), false);
    assert.equal(text.includes(owner.user.name), false);
    const excel = await owner.session.request(`/reports/export${query}&kind=${kind}&format=xlsx`); assert.equal(excel.status, 200);
    assert.equal(Buffer.from(await excel.arrayBuffer()).subarray(0, 2).toString(), 'PK');
  }
  const snapshot = await owner.session.request('/reports/snapshots', post({ kind: 'TASKS', periodStart: '2034-01-01', periodEnd: '2034-01-01' }));
  assert.equal(snapshot.status, 201); const stored = await snapshot.json(); assert.equal(stored.payload.submitted, 1);
  const history = await (await owner.session.request('/reports/snapshots')).json(); assert.ok(history.items.some((item: { id: string }) => item.id === stored.id));
});
