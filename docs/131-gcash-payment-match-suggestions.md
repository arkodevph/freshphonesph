# GCash payment match suggestions — F09

Implemented locally on 2026-11-10 after the user confirmed strict reference,
amount and Philippine calendar-date matching. Suggestions appear in the existing
GCash statement review workspace, beside each extracted transaction.

## Rules and boundaries

- A suggestion requires an incoming positive credit, exact reference (including
  case and leading zeros), exact centavos, the same stored payment calendar date,
  and a date within the statement's declared reporting period. No time tolerance,
  fuzzy reference matching or amount rounding is applied. `paymentDate` is a SQL
  DATE, so the comparison preserves the Philippine business date without a UTC
  timestamp conversion.
- Candidates are GCash payments in the statement's own batch. Rejected payments
  cannot be suggested. Repeated references anywhere in that batch's GCash payment
  history, including rejected records and dates outside the reporting period,
  make a result ambiguous. Repeated references anywhere in the selected reading
  also make it ambiguous, including rows on another page. Ambiguous results have
  no payment link. Other batches' records are not exposed or included as matches.
- Missing references, dates requiring review, outgoing or unread credits, and
  unmatched incoming rows retain explicit labels. A separate count identifies
  non-rejected GCash payments in the reporting period with no exact incoming row;
  ambiguous matches can have an exact row, so this count is not an approval gate.
- Current interpretation and original extraction are computed independently.
  Corrections refresh suggestions through the existing reading reload. Historical
  revisions remain historical evidence, with the existing warning and edit rules.
- These are read-only suggestions. They do not approve, verify, link, allocate,
  credit or change payments, schedules or balances. Existing duplicate evidence,
  Records/Manager approval and Finance-only verification rules remain in force.

## Access, query and UI

The existing private, no-store reading endpoint now returns page-aligned
`paymentMatches` and `unmatchedPayments` in the shared contract. It checks both
GCash and payment read permissions, resolves current batch assignments, and reads
statements/payments in a Repeatable Read transaction. No new permission, migration
or external integration is required.

The query filters payments by the authorized batch before aggregation and uses a
bounded JSON row set (at most 1,000 parsed rows). It returns counts and only a
unique suggested payment ID, without loading the batch's complete payment history
into application memory. Existing batch/payment indexes remain sufficient for the
measured fixture. EXPLAIN ANALYZE on 2,500 payment records measured about 3.3 ms in
the initial regression run; this is local evidence, not a production guarantee.

Records/Finance can open **GCash history**, choose **Review submission** (or **Open submission**), and
read the **Payment match** column. **Open payment** appears only for unique
suggestions. **Refresh transactions and matches** reloads the authoritative data.
A failed request replaces the result with a recoverable error rather than zero
counts or stale suggestions.

## Design and verification

Nami retained the existing comparison layout and staff palette. The controlling
reference was the actual React table example at
https://www.untitledui.com/react/components/tables, inspected through OpenCLI on
2026-11-10 (`/tmp/freshphones-f09-table-primary.png`). Its aligned rows, restrained
separators and status/action hierarchy informed the additional column. The
negative example was the excessive partitioning study in Nami's design principles:
no separate bordered match card was added per row. Existing neutral surfaces and
blue action tokens preserve contrast; labels carry state independently of color.

Initial API regression: 52 tests passed across GCash history, payment workflow,
matching and correction reconciliation. The new integration scenario covers the
role matrix, reassignment, other-batch isolation, exact amount/date/reference,
duplicate references across pages and history, original/current interpretations,
pagination, and unchanged payment snapshots. A later focused rerun also checks a
rejected duplicate suppresses an otherwise unique suggestion. Web regression:
198 tests passed, including the new unique-link/ambiguous-no-link rendering test.
API TypeScript and optimized web build passed. Final rendered checks and build
identity are recorded below when completed.

A clearly labeled synthetic F09 batch/statement was added to the local preview
for visual checks; existing demo assignments and passwords were preserved.
Its description and reading warning identify it as demonstration data.

Evidence logs are in `/tmp/freshphones-rbac-20261110/f09-*.log`; browser scripts,
fixture identifiers and screenshots are in `.local/f09/`. Named-client statement
format acceptance, non-Chromium testing and production acceptance remain open.
No commit, push or production deployment was performed.

## Initial preview checks

The initial local preview at `http://localhost:3000` ran `.next-preview-b`, build
`k4HzCY6rNtfJ0kt2_-DXg`. Inspected screenshots include desktop light/dark,
390px mobile light/dark, horizontally scrolled match columns, approximate 200%
text-size stress, and Chromium protanopia/deuteranopia/tritanopia simulations.
The table retains the primary reference's continuous row hierarchy. The help text
was aligned with the table after inspection; the unique-payment link now has an
underline, the existing accent color and a visible 3px keyboard-focus outline.
Sampled text contrast was at least 5.07:1 across both themes. Browser checks
passed refresh, a simulated HTTP 503 with retry, keyboard access to horizontal
scrolling, exact-payment navigation and zero page errors. Color-vision and
text-size simulations are limited checks, not user testing or native browser
text-zoom acceptance.

The default local Python lacked pypdf. The preview now uses the existing pinned
requirements in `.local/gcash-pdf-venv`, configured through the ignored API preview
environment file. A live canonical Handler upload of the synthetic PDF succeeded,
returned three extracted rows and produced scoped match suggestions. No new
provider or dependency requirement was introduced. Final formatting reports zero
files needing changes; API TypeScript, the final web build and edited component
rendering test passed.

## Full review journey verification — 10 November 2026

Rechecked the running local preview after restarting its database/API and rebuilding
the website. This pass used `.next-preview-a`, build `yUriGwvU6GkGc4aOaN1mf`,
with a separate, clearly labeled synthetic batch `F09-JOURNEY-96dba18a`.
Existing demo account assignments were preserved.

The live API journey passed these checks:

- Handler upload extracted three rows from the original synthetic PDF. Recording
  its exact incoming payment produced the same scoped suggestion for Records,
  Finance and COO.
- Records/COO verification attempts were denied. Finance could not verify before
  operational reviews, and the Manager could not skip Records.
- Altering the extracted reference removed the current suggestion and reopened
  statement review. Original extraction retained its suggestion. Restoring the
  reference restored the current suggestion; a stale review version was rejected.
  Downloaded original PDF bytes remained identical throughout.
- Receipt attachment and independent Records/assigned-Manager approvals left the
  balance unchanged. Only Finance verification credited the synthetic ₱50 payment:
  remaining balance moved from ₱10,000 to ₱9,950. Repeat verification was rejected
  and did not apply credit twice.

Browser checks through the Records workspace also passed: saved a description-only
correction, observed reopened review, saved a new Records decision, refreshed the
matches and followed **Open payment** to the exact verified transaction. Its details
showed both operational approvals and the Finance reviewer. A fresh console check
had no error entries; CSS preload warnings remain. An older open monitoring tab
returned expected 403s after switching the shared demo session to Records.

Regression results: 45 GCash-history/payment-workflow integration tests passed on
a freshly migrated, isolated `_test` database, plus three matching unit tests and
one payment-link rendering test. No application source fix was needed.

Local evidence: `.local/f09/full-journey.cjs`, `full-journey-result.json`,
`full-journey.log`, `full-journey-statement.png`, `full-journey-payment.png` and
`full-journey-clean-console.log`. Regression logs are under
`/tmp/freshphones-f03-20261110/f09-*.log`.

Real-client statement formats, named-staff acceptance, non-Chromium behavior and
production acceptance remain unverified. This synthetic pass does not close those
acceptance items.
