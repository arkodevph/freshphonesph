import type { Applicant } from './api';

export type ReviewDraft = {
  base: Applicant;
  status: string;
  notes: string;
  latest: Applicant | null;
  conflict: boolean;
};
export const reviewDraft = (base: Applicant): ReviewDraft => ({
  base,
  status: base.status,
  notes: base.reviewer_notes,
  latest: null,
  conflict: false,
});
export const reviewDirty = (draft: ReviewDraft) =>
  draft.status !== draft.base.status ||
  draft.notes !== draft.base.reviewer_notes;
export function observeReview(
  draft: ReviewDraft,
  latest: Applicant,
): ReviewDraft {
  if (String(draft.base.id) !== String(latest.id))
    throw new Error('Cannot mix applicant reviews.');
  if (
    (latest.version ?? 0) < (draft.latest?.version ?? draft.base.version ?? 0)
  )
    return draft;
  // A read never replaces the version or notes the reviewer started with.
  return latest.version !== draft.base.version
    ? { ...draft, latest, conflict: true }
    : draft;
}
export function resolveReview(
  draft: ReviewDraft,
  choice: 'latest' | 'draft',
): ReviewDraft {
  if (!draft.latest)
    throw new Error('Load the latest review before resolving a conflict.');
  const next = reviewDraft(draft.latest);
  return choice === 'draft'
    ? { ...next, status: draft.status, notes: draft.notes }
    : next;
}
