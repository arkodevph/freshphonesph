import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applicantListQuerySchema,
  jobOpeningListQuerySchema,
} from '@freshphones/contracts';

test('recruitment directories trim text and use bounded complete page numbers', () => {
  for (const schema of [applicantListQuerySchema, jobOpeningListQuerySchema]) {
    assert.deepEqual(schema.parse({ q: '  support  ', page: '2' }), {
      q: 'support',
      page: 2,
    });
    for (const page of ['0', '-1', '1junk', '1.5', '100001', 'Infinity'])
      assert.equal(schema.safeParse({ page }).success, false, page);
    assert.equal(schema.safeParse({ q: 'x'.repeat(101) }).success, false);
  }
});
test('job and applicant facets reject irrelevant fields and invalid status values instead of silently ignoring them', () => {
  assert.equal(
    jobOpeningListQuerySchema.safeParse({ status: 'OPEN' }).success,
    true,
  );
  assert.equal(
    applicantListQuerySchema.safeParse({ status: 'HIRED' }).success,
    true,
  );
  for (const schema of [applicantListQuerySchema, jobOpeningListQuerySchema]) {
    for (const query of [
      { status: 'all' },
      { status: 'UNKNOWN' },
      { batchId: '7e091b36-b584-4b09-a8ca-f2a8eb30cb9a' },
      { actorId: 'private' },
    ])
      assert.equal(schema.safeParse(query).success, false);
  }
  assert.equal(
    jobOpeningListQuerySchema.safeParse({
      jobId: '7e091b36-b584-4b09-a8ca-f2a8eb30cb9a',
    }).success,
    false,
  );
  assert.equal(
    applicantListQuerySchema.safeParse({ jobId: 'bad' }).success,
    false,
  );
});
