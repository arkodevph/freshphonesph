# Payment operational review chain — 2026-11-09

A pending payment previously accepted a Finance decision without Records completeness
approval or an assigned Manager cross-check. The payment API now enforces:

1. The assigned Handler records the external payment as a pending claim. Receipt
   proof may be attached later: the Handler UI explicitly confirms recording
   without it and offers Attach proof on the saved claim, row menu and details.
   A failed upload retries against that existing payment ID. Proof remains
   required before approval. Existing technical-maintenance recording rights
   remain available.
2. Records checks the member, batch, receipt, amount, date/reference and duplicate evidence,
   then approves completeness or returns the payment with a required note.
3. The current assigned Batch Manager approves the cross-check or returns it with a note.
4. Finance can verify, reject or request clarification only after both approvals.
   Only verification credits the derived balance.

The unit of review is one payment. Receipt proof is required for approval. Requested
GCash statements retain their separate period/revision review; this change does not
invent a statement frequency or assert package-wide completeness. The client's
expected receipt list, statement/package requirements and signed policy acceptance
remain open.

## Access, correction and history

`PAYMENT_COMPLETENESS_REVIEW` belongs to Records; `PAYMENT_MANAGER_REVIEW` belongs
to Batch Managers (including the legacy Manager alias). COO, CEO, Finance, Handler
and technical administrators cannot perform these operational approvals. A recorder
cannot approve their own payment. The server rechecks current role, active account,
assignment and payment version inside the existing serialized write transaction.

Payment corrections and attached/replacement receipts advance the evidence revision,
invalidating both approvals. Returns set `NEEDS_CLARIFICATION` and invalidate the old
revision; the Handler corrects/resubmits, then both stages repeat. Pending approved
reviewers can return evidence before Finance decides. A change to the batch revision,
including reassignment, requires a renewed Manager cross-check. Inactive or changed-role
reviewers cannot supply valid approvals.

Reviews retain actor, timestamp, note, submitted payment version, evidence revision and
batch revision. Database triggers forbid changing or deleting review history. Each
review/return creates audit and live-change entries atomically. Existing verified and
rejected payments remain immutable; existing pending payments must complete the chain.
Customer payment responses omit operational review history and notes.

## Staff workflow

Use **Payments & Finance**. Pending rows show **Awaiting Records**, **Awaiting Manager**
or **Ready for Finance**. Records uses **Review completeness**; the assigned Manager
uses **Cross-check**. Both reuse the existing payment review dialog. **View details**
retains review history. Finance decision controls appear after Manager approval.

No page redesign or new visual system is included. The current payment controls and
styles are reused. Handler stage-decision notices are now available through
**bell → Payment reviews**, with saved notes, current payment status and current
assignment checks; see [Batch Handler progress](batch-handler-remaining-work-plan.md).
Reviewer queue/escalation policy remains a separate F03/F19 follow-up; existing
Finance-result notifications continue.

## Validation and release

Migration: `20261109100000_payment_operational_reviews`.
Run `pnpm --filter @fresh/api-ts test:payment-workflow` against a dedicated
`TEST_DATABASE_URL` ending in `_test`, after applying migrations. The focused suite
covers authorization, order, stale/concurrent reviews, proof requirements/replacement,
returns, corrections, reassignment/revocation, immutable history and unchanged financial
ledger/report behavior. Current run evidence is in ignored `.local/payment-chain/`.

Production deployment and named client acceptance are separate. Only the local preview
and isolated test databases are migrated in this session.

Verified in this session: 24 focused PostgreSQL/API scenarios, 77 core integration
scenarios from a clean export of the staged feature, 138 API unit tests and 192 web
tests pass. Contracts/API/web types, the protected optimized web build, scoped
formatting and staged whitespace checks pass. The browser completed Records → Manager
→ Finance with zero page errors; desktop and 390px screenshots were inspected.
The current localhost:3000 preview is `.next-preview-a`, build
`zCrRb6dqB_w1KsInKZWfF`. Synthetic demo batch: `WORKFLOW-DEMO-1109`.

The initial broader run against the existing mixed working tree reported authentication
expectation failures and repeated-fixture collisions. The clean staged source passed
all 77 core cases; the focused suites passed on a fresh isolated database. Unrelated
local authentication, AI, layout and other changes were excluded from this feature.
