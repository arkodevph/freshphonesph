# Batch and collection reports

Implemented **2026-10-07** on the local `feature/reports-page` branch. Open
`/system/reports` and choose **Batch & Collections**. This extends the Reports page
described in [37-reports-page.md](37-reports-page.md).

## Delivered behavior

- Batch and date filters, current client counts, issued agreement totals, verified
  collections, pending amounts, outstanding balances and overpaid/unapplied funds.
- Inclusive payment-date collections and pending-payment counts for the selected
  period, separate from current overall figures.
- Paginated batch rows with totals covering every scoped batch, including batches
  without clients. The existing batch picker searches all pages with IDs/codes only.
- CSV and XLSX exports include all scoped batches, period labels and scope totals.
  Paging affects the displayed rows only. Edited filters must be applied first.
- Explicit period saves retain every batch row, aggregate figures, selected batch
  ID/code, author and save time. Saved reports have their own batch pagination and
  type-specific history. Later payment or batch changes do not alter saved figures.
- Missing schedules are counted and flagged for Records review. Loading, empty,
  error/retry, stale-response and revoked-access handling remain in place. Wide
  tables scroll within the page on narrow screens and support keyboard focus.

## How to interpret the figures

**Dates apply only to period collections and pending payments.** Overall client
counts, issued agreements, verified/pending totals and balances include all dates
and use the current records. A saved report captures those overall totals at the
time of saving; it does not reconstruct balances as of the period end date.

Agreed/issued totals sum actual client schedule items. A batch's advertised plan
price multiplied by enrollment is not the source of an issued agreement. A client
without a schedule has an unknown agreement, contributes zero issued due, and is
shown in the missing-schedule count.

For each client, with decimal arithmetic:

```text
issued_due = sum(issued schedule amounts)
verified_paid = sum(VERIFIED payments across all dates)
remaining = max(issued_due - verified_paid, 0)
overpaid = max(verified_paid - issued_due, 0)
```

Batch/scope totals add these individual results. One client's overpayment cannot
cancel another client's unpaid amount. Pending, clarification and rejected records
do not reduce balances. Pending records have separate amount/count columns.

Schedules and payments are grouped by each client's **current batch membership**,
matching Finance's client balance. This also handles a permitted move before a
schedule is issued, even when an older payment retains its original recorded
batch. The Payments report remains available for payment-record batch history.

Overpaid/unapplied figures include verified funds for clients without schedules.
They identify amounts to review; they do not authorize refunds or adjustments.

## API and access

| Endpoint | Behavior |
| --- | --- |
| `GET /api/reports/collections?dateFrom=&dateTo=&batchId=&page=` | Strict filters, 20 batch rows per page, full-scope totals |
| `GET /api/reports/export?kind=collections&format=csv` (or `xlsx`) | All scoped batch aggregates; date/batch filters; rejects page, search and status |
| `POST /api/reports/snapshots` with `kind: COLLECTIONS` | Requires both period dates; optional batch; captures all scoped rows and an audit entry |
| `GET /api/reports/snapshots?kind=COLLECTIONS&page=` | Existing paginated history, filtered to this report family |

All endpoints enforce the existing `REPORT_VIEW` permission. Owner, COO, General
Manager, HR/Payroll, Finance, Records, Analytics and CS Head retain their existing
report grants. Customer, Handler, CS Team and anonymous requests are denied.
Analytics does not gain `BATCH_READ` or access to the Records module.

Responses, downloads and captured figures contain batch IDs/codes/status and
aggregate figures. They exclude client identity/contact, payment references/notes,
proofs and private documents. CSV formula-like text is escaped; XLSX uses text
cells. Existing operational-document boundaries still apply.

A single parameterized PostgreSQL read calculates totals and page rows from a
consistent statement snapshot. Payment dates are compared as calendar dates,
independent of session timezone. Snapshot capture and audit use a repeatable-read
transaction. Existing JSON snapshot storage supports the new kind, so no schema
migration or role-grant change is required.

## Verification and handoff

Final shared verification passes **157 tests**: 46 API unit, 83 real PostgreSQL
integration (75 regression checks and 8 Reports checks), and 28 web tests. All 21
active migrations apply to a fresh dedicated PostgreSQL database. Workspace
typechecks, the clean production workspace build and the final API build pass.
Eleven production-browser check groups pass, covering the existing Reports page
and the new collection tab without browser errors.

Verification covers decimal accuracy, Finance balance parity, per-client
overpayment, pending/clarification/rejected exclusion, inclusive dates and a Manila
database timezone, missing schedules, moved clients, empty batches, pagination,
full-scope exports/saves, formula handling, immutable audited history, every role,
anonymous/revoked access and private-field exclusion.

The shared validation workspace excludes local seeded accounts and optional demo
sign-in code. The implementation is packaged on `feature/reports-page` for review;
staging and production deployment remain separate release tasks.
Validation commands are in [37-reports-page.md](37-reports-page.md); web tests need
`NEXT_PUBLIC_API_BACKEND=typescript` when run directly outside Next.js.

## Remaining scope

Internal reconciliation reports are now delivered in
[39-reconciliation-reports.md](39-reconciliation-reports.md). Audited amount
adjustments are now delivered in [40-payment-adjustments.md](40-payment-adjustments.md).
Current collection credit includes those entries, using each original payment date
for period filtering. External statement matching remains open.
Final business approval of report fields/formats and named UAT are separate
acceptance tasks. Production email setup remains deferred until the Owner has
the required sender and service details.

See [36-scope-handoff.md](36-scope-handoff.md) for the full coworker handoff and
[18-scope-traceability-matrix.md](18-scope-traceability-matrix.md) for scope status.
