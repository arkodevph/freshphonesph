import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getApplicant,
  getJob,
  getRecruitmentSummary,
  listApplicants,
  listJobs,
  updateApplicant,
} from '../lib/api';
import { ApiError } from '../lib/ts-api';

const originalFetch = globalThis.fetch;
after(() => {
  globalThis.fetch = originalFetch;
});
const id = '7e091b36-b584-4b09-a8ca-f2a8eb30cb9a';
const job = {
  id,
  title: 'Synthetic Support',
  location: 'Capas',
  employmentType: 'Full-time',
  description: '',
  isOpen: false,
  version: 4,
  _count: { applicants: 31 },
};
const applicant = {
  id,
  jobId: id,
  job: { id, title: job.title },
  fullName: 'Synthetic person',
  email: 'synthetic@example.test',
  phone: '',
  message: '',
  status: 'REVIEWING',
  reviewerNotes: 'Private reviewed note',
  version: 3,
  createdAt: '2026-10-01T00:00:00Z',
  attachments: [
    {
      id,
      storedFile: {
        originalName: 'private.pdf',
        mimeType: 'application/pdf',
        size: 10,
      },
    },
  ],
};
test('job and applicant paging transmit the full applied scope and preserve complete counts', async () => {
  const calls: { url: URL; options?: RequestInit }[] = [];
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));
    calls.push({ url, options });
    return Response.json({
      items: [url.pathname.includes('jobs') ? job : applicant],
      total: 41,
      page: 3,
      pageSize: 20,
    });
  };
  const jobs = await listJobs({ q: 'Support', status: 'closed', page: '3' });
  const applicants = await listApplicants({
    q: 'person',
    jobId: id,
    status: 'reviewing',
    page: '3',
  });
  assert.deepEqual(Object.fromEntries(calls[0].url.searchParams), {
    q: 'Support',
    status: 'CLOSED',
    page: '3',
  });
  assert.deepEqual(Object.fromEntries(calls[1].url.searchParams), {
    q: 'person',
    jobId: id,
    status: 'REVIEWING',
    page: '3',
  });
  assert.equal(jobs.count, 41);
  assert.equal(applicants.count, 41);
  assert.equal(jobs.results[0].applicant_count, 31);
  assert.equal(
    applicants.results[0].attachments?.[0].storedFile.originalName,
    'private.pdf',
  );
  assert.ok(
    calls.every(
      (call) =>
        call.options?.credentials === 'include' &&
        call.options.cache === 'no-store',
    ),
  );
});
test('explicit detail and count reads use the guarded endpoints without directory filters', async () => {
  const paths: string[] = [];
  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    paths.push(path);
    return Response.json(
      path.includes('applicants')
        ? applicant
        : path.includes('jobs')
          ? job
          : { jobs: 41, openJobs: 21, applicants: 81, awaitingReview: 40 },
    );
  };
  const person = await getApplicant(id);
  const opening = await getJob(id);
  const summary = await getRecruitmentSummary();
  assert.equal(person.version, 3);
  assert.equal(person.job_title, job.title);
  assert.equal(opening.version, 4);
  assert.equal(summary.applicants, 81);
  assert.deepEqual(paths, [
    `/api/recruitment/applicants/${id}`,
    `/api/recruitment/jobs/${id}`,
    '/api/recruitment/summary',
  ]);
});
test('a conflict returns to the reviewer without replacing the captured version or automatically retrying the write', async () => {
  let calls = 0;
  globalThis.fetch = async (path, options) => {
    calls++;
    assert.equal(
      new URL(String(path)).pathname,
      `/api/recruitment/applicants/${id}`,
    );
    assert.deepEqual(JSON.parse(String(options?.body)), {
      status: 'SHORTLISTED',
      reviewerNotes: 'My draft',
      version: 2,
    });
    return Response.json(
      { message: 'This applicant changed.' },
      { status: 409 },
    );
  };
  await assert.rejects(
    updateApplicant(id, {
      status: 'shortlisted',
      reviewer_notes: 'My draft',
      version: 2,
    }),
    (error: unknown) => error instanceof ApiError && error.status === 409,
  );
  assert.equal(calls, 1);
});
