import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import {
  roles,
  rolePermissions,
  type Role,
  type User,
} from '@freshphones/contracts';
import { createApp } from '../src/app';
import { Database } from '../src/database';
import { hashPassword } from '../src/auth/password';
import type { Config } from '../src/config';
import { RecruitmentService } from '../src/recruitment/recruitment.service';
import { PrivateStorageService } from '../src/storage/private-storage.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error(
    'Recruitment tests require a dedicated TEST_DATABASE_URL ending in _test.',
  );
const origin = 'http://localhost:3100';
const suffix = randomUUID().slice(0, 8);
const sessions = new Map<Role, { id: string; cookie: string }>();
let app: INestApplication;
let db: Database;
let base: string;
let jobId: string;
let applicantId: string;
let needleJobId: string;
let needleApplicantId: string;
let attachmentId: string;
const privateKeys: string[] = [];
const request = (
  role: Role | null,
  path: string,
  body?: unknown,
  method = body ? 'PATCH' : 'GET',
) =>
  fetch(`${base}/api${path}`, {
    method,
    headers: {
      Origin: origin,
      Cookie: role ? sessions.get(role)!.cookie : '',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const read = async (path: string) => {
  const response = await request('OWNER', path);
  assert.equal(response.status, 200);
  return response.json();
};

before(async () => {
  app = await createApp({
    NODE_ENV: 'test',
    PORT: 4100,
    HOST: '127.0.0.1',
    DATABASE_URL: databaseUrl,
    WEB_ORIGIN: origin,
    JWT_SECRET: 'recruitment-test-only-secret-longer-than-32-characters',
    EMAIL_FROM: 'test@example.test',
    CUSTOMER_REMINDER_DAYS_BEFORE: '',
    PRIVATE_STORAGE_PROVIDER: 'local',
    PRIVATE_STORAGE_S3_REGION: 'ap-southeast-1',
  } as Config);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  db = app.get(Database);
  const batch = await db.batch.create({
    data: {
      code: `RECRUIT-${suffix}`,
      model: 'Synthetic model',
      startDate: new Date('2049-01-01'),
      endDate: new Date('2049-12-31'),
    },
  });
  const client = await db.client.create({
    data: {
      batchId: batch.id,
      name: 'Synthetic recruitment customer',
      email: `recruit-client-${suffix}@example.test`,
      phone: 'Synthetic phone',
    },
  });
  const password = 'Recruitment-test-password-123!';
  const passwordHash = await hashPassword(password);
  await db.loginAttempt.deleteMany();
  for (const role of roles) {
    const person = await db.user.create({
      data: {
        name: `Recruitment ${role}`,
        email: `${role.toLowerCase()}-recruit-${suffix}@example.test`,
        passwordHash,
        role,
        hrConfidentialAccess: role === 'HR_PAYROLL' || role === 'COO',
        ...(role === 'CUSTOMER' ? { clientId: client.id } : {}),
      },
    });
    const login = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: person.email, password }),
    });
    assert.equal(login.status, 200);
    sessions.set(role, {
      id: person.id,
      cookie: login.headers
        .getSetCookie()
        .map((value) => value.split(';')[0])
        .join('; '),
    });
  }
  const createdAt = new Date('2049-07-01T00:00:00Z');
  const openings = [];
  for (let index = 0; index < 45; index++)
    openings.push(
      await db.jobOpening.create({
        data: {
          title: `Backlog ${suffix} role ${index}`,
          description: `Approved description ${suffix}`,
          location: index === 0 ? 'Cebu' : 'Capas',
          employmentType: 'Full-time',
          isOpen: index % 2 === 0,
          createdAt,
        },
      }),
    );
  jobId = openings[0].id;
  const needleJob = await db.jobOpening.findFirstOrThrow({
    where: { title: { contains: suffix } },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });
  needleJobId = needleJob.id;
  await db.jobOpening.update({
    where: { id: needleJob.id },
    data: { title: `Backlog ${suffix} Needle role` },
  });
  for (let index = 0; index < 65; index++)
    await db.applicant.create({
      data: {
        jobId: openings[index % openings.length].id,
        fullName: `Backlog ${suffix} candidate ${index}`,
        email: `backlog-${suffix}-${index}@example.test`,
        phone: 'Private phone',
        message: 'Private candidate message',
        reviewerNotes: 'Private review evidence',
        status: (
          ['RECEIVED', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED'] as const
        )[index % 5],
        createdAt,
      },
    });
  const needleApplicant = await db.applicant.findFirstOrThrow({
    where: { email: { contains: suffix } },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });
  needleApplicantId = needleApplicant.id;
  await db.applicant.update({
    where: { id: needleApplicant.id },
    data: { fullName: `Backlog ${suffix} Needle applicant` },
  });
  applicantId = (
    await db.applicant.findFirstOrThrow({
      where: { jobId, status: 'RECEIVED' },
    })
  ).id;
});
after(async () => {
  if (app) {
    for (const key of privateKeys)
      await app.get(PrivateStorageService).remove(key);
    await app.close();
  }
});

test('every role and anonymous caller obey the existing recruitment grant for directories, counts and exact private details', async () => {
  for (const path of [
    '/recruitment/jobs',
    '/recruitment/applicants',
    '/recruitment/summary',
    `/recruitment/jobs/${jobId}`,
    `/recruitment/applicants/${applicantId}`,
  ]) {
    assert.equal((await request(null, path)).status, 401);
    for (const role of roles)
      assert.equal(
        (await request(role, path)).status,
        rolePermissions[role].includes('RECRUITMENT_MANAGE') ? 200 : 403,
        `${role} ${path}`,
      );
  }
});
test('both full backlogs paginate without overlap at equal timestamps, with complete totals, empty last pages and unfiltered summary counts', async () => {
  for (const [kind, count] of [
    ['jobs', 45],
    ['applicants', 65],
  ] as const) {
    const ids = [];
    for (let page = 1; page <= Math.ceil(count / 20); page++) {
      const response = await read(
        `/recruitment/${kind}?q=${suffix}&page=${page}`,
      );
      assert.equal(response.total, count);
      assert.equal(response.page, page);
      assert.equal(response.pageSize, 20);
      assert.equal(
        response.items.length,
        Math.min(20, count - (page - 1) * 20),
      );
      ids.push(...response.items.map((row: { id: string }) => row.id));
    }
    assert.equal(new Set(ids).size, count);
    assert.deepEqual(ids, [...ids].sort().reverse());
    const past = await read(`/recruitment/${kind}?q=${suffix}&page=100000`);
    assert.equal(past.total, count);
    assert.deepEqual(past.items, []);
  }
  assert.deepEqual(await read('/recruitment/summary'), {
    jobs: await db.jobOpening.count(),
    openJobs: await db.jobOpening.count({ where: { isOpen: true } }),
    applicants: await db.applicant.count(),
    awaitingReview: await db.applicant.count({
      where: { status: { in: ['RECEIVED', 'REVIEWING'] } },
    }),
  });
  const firstJobs = await read(`/recruitment/jobs?q=${suffix}`);
  assert.equal(
    firstJobs.items.some((row: { id: string }) => row.id === needleJobId),
    false,
  );
  const firstPeople = await read(`/recruitment/applicants?q=${suffix}`);
  assert.equal(
    firstPeople.items.some(
      (row: { id: string }) => row.id === needleApplicantId,
    ),
    false,
  );
});
test('combined server-side search, status and job filters find records beyond page one without searching private notes/messages', async () => {
  const opening = await db.jobOpening.findUniqueOrThrow({
    where: { id: needleJobId },
  });
  const query = `q=${encodeURIComponent(`  ${suffix} Needle  `)}&status=${opening.isOpen ? 'OPEN' : 'CLOSED'}`;
  const jobs = await read(`/recruitment/jobs?${query}`);
  assert.equal(jobs.total, 1);
  assert.equal(jobs.items[0].id, needleJobId);
  assert.equal(
    (await read(`/recruitment/jobs?${query}&page=2`)).items.length,
    0,
  );
  assert.equal(
    (await read(`/recruitment/jobs?q=${suffix}&status=OPEN`)).total,
    23,
  );
  assert.equal(
    (await read(`/recruitment/jobs?q=Cebu&status=OPEN`)).items.some(
      (row: { id: string }) => row.id === jobId,
    ),
    true,
  );
  const person = await db.applicant.findUniqueOrThrow({
    where: { id: needleApplicantId },
  });
  const people = await read(
    `/recruitment/applicants?q=${encodeURIComponent(`${suffix} Needle applicant`)}&status=${person.status}&jobId=${person.jobId}`,
  );
  assert.equal(people.total, 1);
  assert.equal(people.items[0].id, needleApplicantId);
  assert.equal(
    (
      await read(
        `/recruitment/applicants?q=${encodeURIComponent(person.email)}`,
      )
    ).total,
    1,
  );
  const byRole = await read(
    `/recruitment/applicants?q=${encodeURIComponent('Needle role')}&jobId=${needleJobId}`,
  );
  assert.equal(
    byRole.total,
    await db.applicant.count({ where: { jobId: needleJobId } }),
  );
  for (const q of ['Private candidate message', 'Private review evidence'])
    assert.equal(
      (await read(`/recruitment/applicants?q=${encodeURIComponent(q)}`)).total,
      0,
    );
  assert.equal(
    (await read(`/recruitment/applicants?jobId=${randomUUID()}`)).total,
    0,
  );
  const privateResponse = JSON.stringify(people);
  assert.equal(privateResponse.includes('passwordHash'), false);
  assert.equal(privateResponse.includes('storageKey'), false);
});
test('strict query/UUID validation rejects invalid or irrelevant facets and exact missing records return 404', async () => {
  for (const kind of ['jobs', 'applicants'])
    for (const query of [
      'page=0',
      'page=-1',
      'page=1junk',
      'page=1.2',
      'page=100001',
      'status=UNKNOWN',
      'status=all',
      'q=' + 'x'.repeat(101),
      'batchId=' + randomUUID(),
      'anything=ignored',
    ])
      assert.equal(
        (await request('OWNER', `/recruitment/${kind}?${query}`)).status,
        400,
        `${kind} ${query}`,
      );
  assert.equal(
    (await request('OWNER', '/recruitment/applicants?jobId=bad')).status,
    400,
  );
  assert.equal(
    (await request('OWNER', `/recruitment/jobs?jobId=${jobId}`)).status,
    400,
  );
  for (const kind of ['jobs', 'applicants']) {
    assert.equal(
      (await request('OWNER', `/recruitment/${kind}/bad`)).status,
      400,
    );
    assert.equal(
      (await request('OWNER', `/recruitment/${kind}/${randomUUID()}`)).status,
      404,
    );
  }
});
test('private attachment metadata and bytes require recruitment access while public careers remain limited to open job fields', async () => {
  const form = new FormData();
  form.append('jobId', jobId);
  form.append('fullName', 'Private attachment candidate');
  form.append('email', `attachment-${suffix}@example.test`);
  form.append(
    'attachment',
    new Blob(
      [Buffer.from('%PDF-1.7\nPrivate synthetic applicant attachment')],
      { type: 'application/pdf' },
    ),
    'private-application.pdf',
  );
  const response = await fetch(`${base}/api/careers/apply`, {
    method: 'POST',
    headers: { Origin: origin },
    body: form,
  });
  assert.equal(response.status, 201);
  const person = await read(
    `/recruitment/applicants/${(await response.json()).id}`,
  );
  attachmentId = person.attachments[0].id;
  const file = await db.applicantAttachment.findUniqueOrThrow({
    where: { id: attachmentId },
    include: { storedFile: true },
  });
  privateKeys.push(file.storedFile.storageKey);
  assert.deepEqual(Object.keys(person.attachments[0].storedFile).sort(), [
    'id',
    'mimeType',
    'originalName',
    'size',
  ]);
  const path = `/applicant-attachments/${attachmentId}/content`;
  assert.equal((await request(null, path)).status, 401);
  for (const role of roles) {
    const downloaded = await request(role, path);
    const permitted = rolePermissions[role].includes('RECRUITMENT_MANAGE');
    assert.equal(downloaded.status, permitted ? 200 : 403, role);
    if (permitted)
      assert.match(
        await downloaded.text(),
        /Private synthetic applicant attachment/,
      );
  }
  const careers = await (await request(null, '/careers')).json();
  assert.ok(careers.some((row: { id: string }) => row.id === jobId));
  for (const row of careers)
    assert.deepEqual(Object.keys(row).sort(), [
      'description',
      'employmentType',
      'id',
      'location',
      'title',
    ]);
  assert.equal(
    JSON.stringify(careers).includes('Private attachment candidate'),
    false,
  );
});
test('reviews preserve captured versions and complete detail responses, reject competing writes and audit only successful human decisions', async () => {
  const before = await db.applicant.findUniqueOrThrow({
    where: { id: applicantId },
  });
  const paths = [
    `/recruitment/applicants/${before.id}`,
    `/recruitment/jobs/${jobId}`,
  ];
  for (const role of roles.filter(
    (role) => !rolePermissions[role].includes('RECRUITMENT_MANAGE'),
  ))
    assert.equal(
      (
        await request(role, paths[0], {
          status: 'HIRED',
          reviewerNotes: 'Unauthorized',
          version: before.version,
        })
      ).status,
      403,
      role,
    );
  const results = await Promise.all([
    request('OWNER', paths[0], {
      status: 'SHORTLISTED',
      reviewerNotes: 'Human Owner review',
      version: before.version,
    }),
    request('HR_PAYROLL', paths[0], {
      status: 'REJECTED',
      reviewerNotes: 'Human HR review',
      version: before.version,
    }),
  ]);
  assert.deepEqual(results.map((row) => row.status).sort(), [200, 409]);
  const winner = await results.find((row) => row.status === 200)!.json();
  assert.equal(winner.version, before.version + 1);
  assert.equal(winner.job.id, jobId);
  assert.ok(Array.isArray(winner.attachments));
  assert.equal(
    (
      await request('OWNER', paths[0], {
        status: 'HIRED',
        version: before.version,
      })
    ).status,
    409,
  );
  const audit = await db.auditEntry.findMany({
    where: {
      entity: 'applicant',
      recordId: before.id,
      action: 'applicant.reviewed',
    },
  });
  assert.equal(audit.length, 1);
  assert.equal(
    (audit[0].before as { version: number }).version,
    before.version,
  );
  assert.equal((audit[0].after as { version: number }).version, winner.version);
  assert.equal((await read(paths[0])).reviewerNotes, winner.reviewerNotes);
  const opening = await read(paths[1]);
  const record = {
    title: opening.title,
    description: opening.description,
    location: opening.location,
    employmentType: opening.employmentType,
    isOpen: false,
  };
  assert.equal(
    (await request('OWNER', paths[1], { record, version: opening.version }))
      .status,
    200,
  );
  assert.equal(
    (
      await request('OWNER', paths[1], {
        record: { ...record, isOpen: true },
        version: opening.version,
      })
    ).status,
    409,
  );
  assert.equal(
    (await (await request(null, '/careers')).json()).some(
      (row: { id: string }) => row.id === jobId,
    ),
    false,
  );
});
test('revoked recruitment access immediately blocks details, pages, counts, files and a stale service actor inside the write transaction', async () => {
  const actor = await db.user.findUniqueOrThrow({
    where: { id: sessions.get('HR_PAYROLL')!.id },
  });
  await db.user.update({
    where: { id: actor.id },
    data: { role: 'CORE_HANDLER', hrConfidentialAccess: false, version: { increment: 1 } },
  });
  for (const path of [
    '/recruitment/jobs',
    '/recruitment/applicants',
    '/recruitment/summary',
    `/recruitment/jobs/${jobId}`,
    `/recruitment/applicants/${applicantId}`,
    `/applicant-attachments/${attachmentId}/content`,
  ])
    assert.equal((await request('HR_PAYROLL', path)).status, 403);
  const row = await db.applicant.findUniqueOrThrow({
    where: { id: applicantId },
  });
  await assert.rejects(
    app
      .get(RecruitmentService)
      .updateApplicant(actor as unknown as User, row.id, {
        version: row.version,
        reviewerNotes: 'Stale actor tried to write.',
      }),
    /access has changed/,
  );
  assert.deepEqual(
    await db.applicant.findUniqueOrThrow({ where: { id: row.id } }),
    row,
  );
});
