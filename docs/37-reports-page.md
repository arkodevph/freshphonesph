# Reports page and saved periods

Implemented **2026-10-07** on `feature/reports-page`, based on the published
`4ae1337` handoff. The TypeScript staff app now provides `/system/reports` for
accounts with the existing `REPORT_VIEW` permission.

## Delivered behavior

- Reports navigation and direct page access require report permission. Customer,
  Handler and CS Team accounts cannot use the report APIs; existing role grants
  are preserved.
- Payments shows verified collections, pending amounts, clarification and rejected
  counts. Inclusive payment-date, batch and status filters apply to both figures
  and downloads. Pending payments stay separate from verified collections.
- The report-only batch picker returns only IDs and batch codes. Analytics can
  search all batch pages without gaining access to the Records module.
- Tasks/KPI shows status counts, submission timing and human review counts.
  Support shows category totals and average closure turnaround. Their dates use
  UTC creation dates; they do not accept irrelevant payment/batch filters.
- CSV and XLSX downloads use the applied filters. Edited filters must be applied
  before downloading or saving. The Payments page also now offers Excel export.
  Downloads use the normal cookie session/refresh handling.
- Saving requires an explicit bounded period and retains payment batch/status
  filters, the batch code as captured, figures, author and save time. Snapshot
  creation writes an audit entry. Later record changes do not alter captured data.
- History is filtered by report type, paginated and expandable. Older snapshots
  remain readable. Reports have loading, empty, error/retry and access states;
  sequenced reads prevent an older response from replacing a newer report view.
- The page follows the existing light/dark theme and accommodates narrow screens.

## API changes

| Endpoint | Behavior |
| --- | --- |
| `GET /api/reports/payments` | Minimal payment summary; same filters as export |
| `GET /api/reports/collections` | Batch/collection aggregates; see [38-batch-collection-reports.md](38-batch-collection-reports.md) |
| `GET /api/reports/batches?q=&page=` | Searchable, paginated IDs/codes only |
| `GET /api/reports/tasks`, `/support` | Strict date-only filters |
| `GET /api/reports/export?kind=&format=` | Payments, Collections, Tasks or Support; CSV/XLSX; rejects unsupported filter combinations |
| `POST /api/reports/snapshots` | Bounded period; payment batch/status filters retained in existing JSON payload |
| `GET /api/reports/snapshots?kind=&page=` | Strict, bounded pages with deterministic ordering |

Every endpoint requires `REPORT_VIEW`. Payment exports omit customer identity,
references, proof and notes. Tasks/Support exports contain aggregates without
individual task evidence, concerns, replies or contact details. CSV text that
could be interpreted as a formula is escaped; XLSX uses text cells.

No schema migration is needed. The existing 21 active migrations remain unchanged.
No balance, payment verification, private file, HR approval or role grant is changed.

## Initial Reports page verification

- 46 shared API unit tests, 75 existing PostgreSQL integration tests, 5 new Reports
  integration tests and 26 web tests pass: **152 tests**. Integration uses a fresh,
  dedicated PostgreSQL test database with all 21 migrations.
- Workspace typechecks and a clean production build pass with local seeded accounts
  and optional demo sign-in code excluded from the shared snapshot.
- Reports integration checks every role and anonymous denial, export scopes and
  private-field omission, batch search/paging, inclusive dates, saved filters,
  immutable figures, audit creation, history pagination and revoked report access.
- Synthetic browser checks cover the user interactions, downloads, explicit saves,
  retained filters, history, delayed responses, recovery, mobile/dark display and
  access revocation. These checks are engineering evidence; named business UAT
  remains open.

From the repository root, with private local settings configured:

```bash
pnpm typecheck
pnpm test:api-ts
NEXT_PUBLIC_API_BACKEND=typescript pnpm --filter @fresh/web test
pnpm build
```

Create a fresh dedicated database ending in `_test`, set `TEST_DATABASE_URL`, then:

```bash
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @fresh/api-ts db:migrate
pnpm test:api-ts:integration
```

## Remaining reporting scope

The dedicated page and the subsequent batch/collection report family are delivered;
see [38-batch-collection-reports.md](38-batch-collection-reports.md) for current
totals, period semantics and verification. Internal reconciliation is delivered in
[39-reconciliation-reports.md](39-reconciliation-reports.md). Additional approved
formats, external statement matching, the final business field-access matrix and
named report UAT remain open. Audited post-verification financial adjustments are
delivered in [40-payment-adjustments.md](40-payment-adjustments.md).

For handoff status and other remaining work, see [36-scope-handoff.md](36-scope-handoff.md)
and [18-scope-traceability-matrix.md](18-scope-traceability-matrix.md).
