# Finance pending-payment alerts

Full Scope v6 §12 now has an in-app Finance queue in the staff notification bell. In
TypeScript API mode, Owner and Finance accounts see current payments awaiting verification,
their unread count, an unread-only filter, pagination, refresh and mark-all-as-read. Opening
an alert marks its captured version read and opens the exact payment for human review.

## Queue and read state

Alerts are derived from current `PENDING` payment records rather than copied into a delivery
queue. Existing pending payments and newly authorized reviewers are covered automatically.
Only the signed-in reviewer's `FinanceAlertRead` receipts determine their unread count; one
reviewer's reads never dismiss another reviewer's alerts. Read alerts stay in the pending
queue until a Finance decision removes the payment.

Corrections and new proof attachments increment the payment version and make an older read
receipt unread again. A clarification or rejection removes the pending alert. Correcting a
clarification returns the payment to pending and makes it unread. Verified payments also
leave the alert queue. The list sorts by last update and ID, with 20 entries per page.

Reading alerts does not update payment status, amount, version, balance, verification audit
or customer notifications. Verification still requires the existing explicit Finance
decision, note and captured version. A stale read returns 409 and an alert that has left
pending returns 404. Repeated reads of the same version preserve the read timestamp.

The list includes only payment ID/version, amount, client name, batch code, timestamps and
an internal target path. Proofs, receipt contact details, recording notes and transaction
references remain on the existing permission-scoped payment screen.

## Access, concurrency and refresh

| Endpoint | Contract |
| --- | --- |
| `GET /api/staff/finance-alerts?page=1&unreadOnly=false` | `PAYMENT_VERIFY`; pending/unread counts and bounded page |
| `POST /api/staff/finance-alerts/:id/read` | `PAYMENT_VERIFY`; strict `{ "version": 1 }`, current pending record |
| `POST /api/staff/finance-alerts/read-all` | `PAYMENT_VERIFY`; snapshots all currently pending versions for this account |

Read writes recheck the active account's current permission and use the same PostgreSQL
transaction lock as payment corrections and decisions. Mark-all cannot accidentally
acknowledge a later correction. Read invalidations reach only that reviewer, including tabs
connected to a second API instance. Payment events refresh the list and badge for reviewers.
Opening/reconnecting/focusing refetches authoritative data, with visible-tab polling every
30 seconds as a fallback. Failures show retry and an unavailable badge rather than claiming
there are no pending payments.

Alert links work during same-page navigation and clear old payment search/date/status
filters. The payment table refreshes on live changes while open Finance review notes and
their captured versions remain intact. A reviewed payment may still be shown by its direct
link, but it no longer appears in pending alerts.

## Migration and verification

Apply the additive Prisma migration `20261006160000_finance_alert_reads` with
`pnpm db:migrate`. It adds per-account/per-payment read receipts and a pending queue index;
existing pending payments start unread. It performs no payment or balance data conversion.

API tests in `apps/api-ts/test/integration.test.ts` cover the complete role matrix, backlog,
bounded pagination, independent reviewers, immutable money records on read, stale versions,
corrections/proofs/clarification/decisions, cross-instance events and read/correction races.
Contract tests reject invalid versions, unbounded pages and attempts to select another user.
Browser walkthroughs use synthetic API responses; PostgreSQL tests use dedicated databases.

The 2026-10-06 automated verification passed 25 API unit tests, 33 PostgreSQL integration
tests and 14 web tests (72 total), workspace typechecks and production builds. The migrated
test schema matches Prisma with no drift. The read-state migration is also applied to the
local `freshphones_v6_preview` database; this does not imply production deployment.

Browser checks passed backlog pagination, per-alert/all reads, same-page exact links clearing
an old search, correction unread state, captured review drafts and stale-decision rejection,
independent reviewers, empty/error/retry states, keyboard dismissal, role-aware fetches and
390px/320px mobile layouts without overflow or runtime errors. The walkthrough also used
the application's light/dark theme controls. Focus refresh drives the synthetic browser
walkthrough; actual cross-instance SSE behavior is exercised in the PostgreSQL suite.

Named UAT should cover:

1. Sign in as Finance and Owner; open the same pending payment from each bell and confirm
   each has independent unread state and the correct payment appears.
2. Mark all read; confirm payments remain pending and balances stay unchanged.
3. Correct a claim or attach proof from Records; confirm it becomes unread for both reviewers.
4. Clarify and resubmit, then verify or reject; confirm the alert lifecycle and human review.
5. Open two tabs while another reviewer changes the payment; confirm refresh, preserved
   review notes, stale decision rejection, keyboard dismissal and mobile/dark layouts.
6. Try other staff/customer roles and direct API requests; confirm Finance alerts are denied.

This increment delivers pending-payment in-app alerts. The bell is now shared with task
assignment/deadline alerts in [28-staff-task-alerts.md](28-staff-task-alerts.md). Verification-result
alerts are implemented in [29-finance-result-alerts.md](29-finance-result-alerts.md), and staff
email delivery is implemented in [30-staff-email-delivery.md](30-staff-email-delivery.md).
Production provisioning and named client acceptance remain open.
