# Audited verified-payment adjustments

Implemented locally on `feature/reports-page`, **2026-10-07**. Business UAT and production
acceptance remain open. Shared source excludes local account seeds and demo sign-in code.

## Finance workflow

Open **Payments & Finance**, find a verified payment and choose **Adjust credit**.
Enter the total credit the payment should contribute, explain the checked evidence
in a reason of 10–1,000 characters, review the displayed change and explicitly confirm.
Use **0** for a full reversal. A later correction can restore credit with another entry.

Only existing `PAYMENT_VERIFY` grants (Owner and Finance Officer) can submit adjustments.
The API rechecks the active actor and current grants inside the Finance transaction.
Recording/read/report access does not grant adjustment authority. Pending, rejected and
clarification records use their existing review workflow and cannot receive adjustments.

This increment corrects the credited **amount**. Changing the customer, batch, payment date,
method, reference, receipt or original Finance decision is outside this workflow.
An adjustment changes recorded account credit; it does not execute a refund or a transfer.

## Ledger and concurrency

`Payment.amount`, status, original verification, version and receipt remain unchanged.
`PaymentAdjustment` is an append-only signed ledger with previous/current credit, sequence,
reason, Finance actor, timestamp, original payment version and unique request ID. For example,
an original PHP 125.50 payment corrected to PHP 80.25 gets a **−45.25** entry. Reversing that
credit adds **−80.25**; restoring PHP 100.01 adds **+100.01**. The original remains PHP 125.50.

`POST /api/payments/:id/adjustments` accepts:

```json
{
  "correctedAmount": "80.25",
  "reason": "Checked the receipt and corrected the credited amount.",
  "expectedRevision": 0,
  "paymentVersion": 2,
  "requestId": "7e091b36-b584-4b09-a8ca-f2a8eb30cb9a"
}
```

Credits use Decimal(12,2), allow zero and reject negatives, no-op changes, more than two
decimal places and values outside the database limit. `expectedRevision` is captured from
the displayed payment; a stale revision returns 409 and requires refresh and human review.
The UI never fetches a fresh revision merely to force a write through. Identical retries
with the same request ID, actor and payload return the current payment without another entry,
audit event or notification. A different payload or actor cannot reuse that request ID.

The existing cross-instance Finance advisory lock serializes writes. The database also
checks verified state, original version, sequence, preceding credit and signed delta, and
rejects adjustment UPDATE/DELETE. There are no editing/deletion endpoints for entries.
Adjustment, audit, live payment event and customer notification commit together; an audit
failure rolls all of them back. Reversal keeps the original payment in verified history.

## Consistent money reads

Verified credit is the sum of original verified amounts and their signed adjustments.
Derived balances, overpayments, FIFO installment allocation, reminder calculations,
Finance/dashboard summaries, customer history, statements, confirmations and PDFs all use
that credit. Original amounts and dated adjustment history remain visible in account documents.
Staff can see the adjustment reason and actor. Customer responses expose their own monetary
history without new internal adjustment reasons, request IDs or Finance actor details.
Operational documents remain explicitly non-BIR documents.

Payment, Collections and Reconciliation reports and CSV/XLSX use current adjusted credit.
They expose aggregate adjustment figures; payment downloads retain original amount alongside
delta and current credit. Period filters use the **original payment date**, not the adjustment
creation timestamp. They describe current credit on payments in the selected period, rather
than a reconstructed balance as of that date or a bank posting-date ledger. Verified payment
counts include fully reversed original records. Previously saved snapshots stay unchanged;
new snapshots capture the adjusted figures. Older snapshots without adjustment fields remain readable.

Reconciliation still matches the original verification evidence. It separately checks each
adjustment's actor, ID, payment, version, request, sequence, previous/current credit, signed
amount, reason and timestamp against `payment.adjusted` audit evidence. Missing or malformed
evidence produces `UNMATCHED_ADJUSTMENT_AUDIT`, a count of affected payments and the absolute
magnitude of affected entries. Review flags never automatically change credit. Report-only
roles see aggregates; individual exception links continue to require both report and payment-read grants.

## Verification and handoff

Checks cover Decimal arithmetic, every role and unauthenticated access, reversals/restoration,
overpayment, immutable originals, strict input, duplicate/repeated requests, concurrent stale
revisions, role revocation inside writes, atomic rollback, database append-only constraints,
customer isolation/privacy, documents, schedules, report/export parity and immutable snapshots.
Verification passes **178 shared tests**: 48 API unit, 97 real PostgreSQL integration and
33 web tests. Workspace typechecks, a clean production build and **25 browser check groups**
pass, including Finance/mobile/retry/revocation controls, reporting regressions and actual
customer statement/confirmation PDF downloads with extracted money/history text checked.
All 23 migrations apply to a fresh test database, and the upgraded local preview has no
Prisma drift. All seven private overlays match their original backup byte for byte; a shadow
The shared source passes the repository's seed guard.
Run the shared suites against a dedicated PostgreSQL `TEST_DATABASE_URL` ending in `_test`.

```bash
pnpm db:generate
pnpm db:migrate
pnpm typecheck
pnpm test:api-ts
pnpm test:api-ts:integration
NEXT_PUBLIC_API_BACKEND=typescript pnpm --filter @fresh/web test
NEXT_PUBLIC_API_BACKEND=typescript pnpm build
```

The forward migration is `20261007030000_payment_adjustments`; historical migrations are
preserved. Local seeded accounts, demo overlays, credentials and test databases stay private.
These follow-up files are packaged on `feature/reports-page` for review.

Remaining acceptance: named Finance/Owner UAT and approval of reporting fields/formats.
External bank-statement matching still needs approved input data and matching rules.
Real email delivery remains deferred until the previously requested sender/service setup exists.
