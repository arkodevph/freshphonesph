# Scheduled installment earnings

On 2026-10-28 Jaycee authorized item 2 of the October 26 client workflow notes.
He clarified that **earnings means scheduled installment amounts for every batch
and member**, and requested both meanings of bi-monthly as selectable options.
The working sequence is: implement the feature, then Jaycee tests it.

## Report behavior

Open **Reports → Installment earnings**. Choose a year, frequency and period,
then calculate. Frequencies are:

- Monthly: each calendar month.
- Bi-monthly: 15th and month-end installment periods, grouped as days 1–15
  and 16 through the last day of the month. This display name follows Jaycee's
  terminology correction on 2026-10-28.
- Every two months: January–February, March–April, May–June, July–August,
  September–October and November–December.

The calculation sums the exact `ScheduleItem.expectedAmount` values whose issued
due dates fall within the inclusive selected period. Leap years and month ends
use calendar dates. Changing the report frequency does not issue, regenerate,
reschedule or otherwise modify installments. Payment amounts, payment status,
verification and Finance corrections do not change these scheduled figures.

Choose Batch or Member grouping, optionally filter a batch, or use **View members**
on a batch row. All current batches and members in scope remain visible, including
those with no amount due. Members without any issued schedule are identified
explicitly: their scheduled amount is unknown, and they contribute zero to the
calculation. The report does not estimate schedules from batch contract prices.
Grouping uses each member's current batch, matching the existing single-batch
membership model. Multiple memberships are a separate workflow item.

Summary totals cover the complete filtered scope; table rows paginate in groups
of 20. CSV and XLSX include all pages in the same scope. Member reports expose
the member's name for identification, but no contact details, documents, payment
references or proof files. CSV formula-like names are escaped; XLSX cells use text.

## Access and implementation

Both report reads and downloads require `REPORT_VIEW`, enforced by NestJS.
The CEO can use the report with the existing report-only permission. This feature
grants no new permissions. It adds no financial writes, database migrations,
snapshot type, background work or third-party integration.

- Shared period definitions and query/response contracts:
  `packages/contracts/src/installment-earnings.ts`.
- Query: `apps/api-ts/src/reports/installment-earnings.ts`.
- Endpoints: `GET /api/reports/installment-earnings` and
  `GET /api/reports/installment-earnings/export`.
- Frontend: `InstallmentEarnings.tsx` and `useInstallmentEarnings.ts` under
  `apps/web/app/system/reports/`.

Required query field: `year`. Optional fields: `frequency`, `period`, `groupBy`
(`batches` or `members`), `batchId`, `page`; downloads also accept `format`
(`csv` or `xlsx`). Invalid periods, years, scopes and unknown fields are rejected.

## Validation and local preview

Focused API tests: `pnpm --filter @fresh/api-ts test:earnings`, using an isolated
local `TEST_DATABASE_URL` ending in `_test`. Tests cover authorization for every
role, exact amounts, inclusive boundaries, both bi-monthly options, leap days,
independence from payments, zero rows, missing schedules, pagination, exports
and privacy. Web tests cover complete calendar coverage and filter validation.

Other role/access source changes were being made concurrently in the same
checkout, including generated database-client changes before the migrations
were available. For this slice, the isolated source under
`.local/installment-earnings/isolated-source` combines the pre-task source
snapshot with the new reporting files and its own generated Prisma client.
It preserves those concurrent edits in the main checkout. Private validation
logs and browser evidence live under `.local/installment-earnings/`.

The dedicated test preview uses web port **3002** and API port **4102**,
with the existing local sample database and one-click role helper. It does not
replace the main preview on ports 3000/4100. All work remains local; Jaycee's
manual test is still pending.

Validation passed on 2026-10-28: **126 automated tests** (106 web, six focused
earnings integration, ten existing report integration and four CEO authorization),
API/web typechecks, optimized web build, scoped formatting and whitespace checks.
Ten browser check groups passed with zero JavaScript page errors: independent
database sum, full-scope pagination, batch/member reconciliation, all frequencies,
CSV/XLSX, zero periods, retry, mobile at 390/320px, light/dark and Finance access.
Read-only SQL plans for all-batch and one-batch member views were saved in the
private evidence directory. These small local plans do not establish production
load acceptance.

Persistent user units: `freshphones-earnings-api-local.service` and
`freshphones-earnings-web-local.service`. The web launcher manages
`freshphones-earnings-web-preview.scope`. Runtime logs are
`/tmp/freshphones-earnings-api.log` and `/tmp/freshphones-earnings-web.log`;
the optimized build log is `/tmp/freshphones-installment-earnings-build.log`.
