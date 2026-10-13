# Internal payment reconciliation reports

Implemented **2026-10-07** locally on `feature/reports-page`. Open
`/system/reports` and choose **Reconciliation**. This extends the payment, collection,
task and Support reports described in [37-reports-page.md](37-reports-page.md) and
[38-batch-collection-reports.md](38-batch-collection-reports.md).

## Delivered behavior

- Inclusive payment-date and recorded-batch filters, with current payment statuses.
- Recorded claim amounts/counts separated into verified, pending, clarification
  and rejected categories. Only verified amounts affect client balances.
- Verified amounts/counts split between records with matching verification audits
  and records without matching evidence. The latter are an audit evidence gap;
  reporting does not reverse or change those payments.
- Per-batch/payment-method rows, full-scope totals, CSV/XLSX and explicit period
  saves. Pagination affects displayed rows only; exports and saves retain all groups.
- Immutable, audited saved-period history, including captured batch codes,
  aggregate flags, author and save time. Saved reports contain aggregates only.
- Authorized payment exceptions, independent paging and exact links to the existing
  Finance payment view. Identity/contact fields, references, private files,
  notes and audit JSON are excluded from exception responses.
- Loading, empty, retry, stale-response and revoked-access handling. Dirty filters
  must be applied before exports/saves. Narrow screens scroll wide tables within
  the page, with keyboard focus available.

## Meaning and limits

This compares **internal payment records and verification audits**. The application
has no imported external bank statements, so this report does not claim that bank
transactions, deposits or external account totals have been matched. Verification
still belongs to the established Finance workflow.

Dates apply to each recorded payment date and its **current status**. Batch scope
uses the **batch recorded on the payment**. The Collections report instead groups
by each client's current membership for Finance balance parity; a permitted move
can explain a difference between the two report families.

Audit matching requires a `payment.verified` entry for the payment and the same
Finance actor, ID, version, client, recorded batch, schedule link, payment date,
method, reference, amount, verifier and verification timestamp. Amount comparison
uses decimals. Malformed/older evidence is treated as unmatched; it does not crash
the report or establish fraud. Audit entries and references remain private.

| Review flag | Interpretation |
| --- | --- |
| Possible duplicate reference | More than one ledger record shares a normalized nonblank reference and payment method, ignoring method case. Comparison includes other batches, dates and statuses. This requires review, not automatic rejection. |
| Schedule/client mismatch | A linked installment belongs to a different client. Optional absent schedule links are not errors. |
| Recorded/current batch difference | The payment's recorded batch differs from the client's current membership; a permitted historical move may explain it. |
| Verified without issued schedule | A verified payment's client has no issued schedule. Records needs to review the agreed terms. |
| No matching verification audit | A verified record lacks evidence matching its current payment facts. Review missing or changed evidence through the existing audit/Finance process. |

Each flagged payment is counted once in the overall review total. A payment may
carry several flags, so category counts must not be added to derive a payment
total. Reports do not change money, statuses, schedules, audit evidence or balances.
They do not authorize refunds, adjustments or new verification decisions.

Saved periods capture current facts when saved. They do not reconstruct status or
balances as of the chosen end date. Later record/audit changes leave saved figures
intact. CSV formula-like text is escaped; XLSX uses text cells.

## API and permissions

| Endpoint | Access and behavior |
| --- | --- |
| `GET /api/reports/reconciliation?dateFrom=&dateTo=&batchId=&page=` | `REPORT_VIEW`; 20 batch/method groups per page and full-scope aggregate totals |
| `GET /api/reports/reconciliation/exceptions` | Both `REPORT_VIEW` and `PAYMENT_READ`; same filters, 20 flagged payments per page, minimal authorized review fields |
| `GET /api/reports/export?kind=reconciliation&format=csv` (or `xlsx`) | `REPORT_VIEW`; all scoped aggregates; rejects page, search and payment-status facets |
| `POST /api/reports/snapshots` with `kind: RECONCILIATION` | `REPORT_VIEW`; both period dates required; optional batch; all aggregate groups captured with an audit |
| `GET /api/reports/snapshots?kind=RECONCILIATION&page=` | `REPORT_VIEW`; existing deterministic history pagination |

Existing grants are unchanged. Analytics, HR/Payroll and CS Head see aggregate
reports but cannot retrieve individual exceptions. Owner, COO, General Manager,
Finance and Records have both existing grants. Customers lack report permission
and cannot access reports or exception lists despite their own payment-read grant.
Handlers, CS Team and anonymous requests remain denied.

Revoking payment-read access hides and unmounts the exception list while preserving
authorized aggregates. Revoking report access clears the whole report page and
navigation. The API independently checks current access. Exception links use
`/system/payments?payment=<id>` and preserve the existing Finance permissions.

## Storage and migration

Report figures, exports and exception rows are calculated by parameterized
PostgreSQL statements. Global duplicate counts use a shared windowed reference
read; each response's totals and rows use a single consistent statement. Snapshot
capture and audit use the existing repeatable-read transaction.

The append-only migration `20261007020000_reconciliation_audit_index` adds
`AuditEntry(entity, recordId, action)` indexing for payment evidence lookups.
It changes no financial data or historical migration. The local preview and fresh
test database now have **22 active migrations**. No new payment/snapshot table is
needed; saved aggregates use the existing JSON snapshot storage.

## Verification and handoff

Final shared verification passes **164 tests**: 46 API unit, 88 real PostgreSQL
integration (75 existing regression checks, 8 Reports checks and 5 reconciliation
checks), and 30 web tests. Workspace typechecks and the clean production workspace
build pass. All 22 migrations apply to a fresh dedicated test database. The local
preview migration applies successfully and Prisma reports no schema drift.

Sixteen production-browser check groups pass: seven existing Reports groups,
four Collections groups and five reconciliation groups. The new checks exercise
aggregate-only Analytics access, full-scope exports/saves, immutable captured
group paging, authorized exception links/paging/retry, live payment-read
revocation with a delayed response, report/history recovery, empty states,
mobile/dark scrolling and revoked report access. There are no browser errors.

The real PostgreSQL checks cover every role, aggregate/detail permission separation,
actual Finance verification evidence, decimal status totals, malformed and changed
audits, inclusive dates with a Manila database timezone, global duplicate checks,
schedule/batch exceptions, overlapping flags, complete paginated exports/snapshots,
formula handling, immutable audited history, strict facets and live access revocation.

Validation uses the shared source with all seven local demo overlays excluded.
The feature is packaged on `feature/reports-page` for review, with deployment still
pending. Test commands and private
environment guidance remain in [37-reports-page.md](37-reports-page.md). The new
integration file is included in `pnpm test:api-ts:integration`.

## Remaining work

- Audited post-verification amount corrections/reversals are now delivered in
  [40-payment-adjustments.md](40-payment-adjustments.md), including separate adjustment
  audit-evidence checks. Original verified rows remain immutable through normal APIs.
- External statement import/matching would require approved source data, fields,
  matching rules and access decisions; it is not delivered by this internal report.
- Final business report field/format approval and named UAT remain open.
- Production email setup remains deliberately deferred.

See [36-scope-handoff.md](36-scope-handoff.md) and
[18-scope-traceability-matrix.md](18-scope-traceability-matrix.md) for the full status.
