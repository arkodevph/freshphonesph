import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Applicant } from '../lib/api';
import {
  observeReview,
  resolveReview,
  reviewDirty,
  reviewDraft,
} from '../lib/recruitment-review';

const applicant: Applicant = {
  id: '7e091b36-b584-4b09-a8ca-f2a8eb30cb9a',
  job: 'b',
  job_title: 'Support',
  full_name: 'Synthetic reviewer',
  email: 'synthetic@example.test',
  phone: '',
  message: '',
  status: 'received',
  reviewer_notes: 'Original note',
  created_at: '2026-10-01T00:00:00Z',
  version: 1,
};
test('refreshes retain draft notes, selected identity and the version captured before a competing review', () => {
  const draft = {
    ...reviewDraft(applicant),
    notes: 'My unsaved assessment',
    status: 'shortlisted',
  };
  const current = {
    ...applicant,
    version: 2,
    reviewer_notes: 'Other reviewer note',
    status: 'reviewing',
  };
  const observed = observeReview(draft, current);
  assert.equal(observed.notes, draft.notes);
  assert.equal(observed.status, draft.status);
  assert.equal(observed.base.version, 1);
  assert.equal(observed.latest?.version, 2);
  assert.equal(observed.conflict, true);
  assert.equal(reviewDirty(observed), true);
});
test('an explicit conflict choice can use the latest saved review or retain the draft on its captured latest version', () => {
  const draft = observeReview(
    { ...reviewDraft(applicant), notes: 'My note', status: 'shortlisted' },
    {
      ...applicant,
      version: 3,
      status: 'reviewing',
      reviewer_notes: 'New saved note',
    },
  );
  const saved = resolveReview(draft, 'latest');
  assert.equal(saved.base.version, 3);
  assert.equal(saved.notes, 'New saved note');
  assert.equal(reviewDirty(saved), false);
  const mine = resolveReview(draft, 'draft');
  assert.equal(mine.base.version, 3);
  assert.equal(mine.notes, 'My note');
  assert.equal(mine.status, 'shortlisted');
  assert.equal(mine.conflict, false);
  assert.equal(reviewDirty(mine), true);
  assert.throws(
    () => resolveReview(reviewDraft(applicant), 'draft'),
    /Load the latest/,
  );
});
test('delayed older reads cannot replace newer comparison evidence or a successfully saved review', () => {
  const draft = observeReview(reviewDraft(applicant), {
    ...applicant,
    version: 3,
  });
  assert.equal(observeReview(draft, { ...applicant, version: 2 }), draft);
  const saved = reviewDraft({
    ...applicant,
    version: 4,
    reviewer_notes: 'Saved notes',
  });
  assert.equal(observeReview(saved, { ...applicant, version: 3 }), saved);
});
test('review drafts cannot mix different applicant identities and same-version reads cannot overwrite local edits', () => {
  const draft = { ...reviewDraft(applicant), notes: 'Unsent notes' };
  assert.equal(observeReview(draft, applicant), draft);
  assert.throws(
    () => observeReview(draft, { ...applicant, id: 'another' }),
    /Cannot mix/,
  );
});
