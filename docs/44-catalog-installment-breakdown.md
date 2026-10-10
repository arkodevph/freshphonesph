# Per-offer sample payment breakdown

Implemented locally on `feature/reports-page`, 2026-10-08, for scope §4's sample payment
schedules and expected installments. The user confirmed that catalog staff enter each
offer's **total payable, installment count and payment schedule**.

## Staff workflow

In `/system/catalog`, add or edit a listing and enable **Show a sample payment plan**.
Enter its full payable amount, 1–600 installments and a fixed 7-, 15- or 30-day interval.
The editor previews the regular amount, final amount, total and duration before saving.
Use a separate listing for a different offer. Disable the checkbox and save to remove a plan.

Owner, COO, General Manager and Records retain `CATALOG_MANAGE`; other roles cannot write
terms. Terms save with the listing's captured version, audit and refresh event. Competing
edits preserve drafts and require an explicit discard before loading newer terms. Photo
operations preserve the plan. Old editor requests missing the new field are rejected,
preventing an older browser tab from silently clearing newly entered terms.

An advertised daily rate remains a separate marketing field. It does not establish a
contract price or duration. Existing listings receive no inferred terms, and no sample
plan is seeded for the six real offers. Staff must enter approved offer data.

## Public preview

Published listings with terms show **View sample payments**. The dialog displays the
total payable, interval, regular/final amounts and every installment with 20-row paging.
If a listing has no advertised daily rate, its card displays the plan's total payable.
Customers can select an optional example start date to see illustrative due dates; without
one, timing is expressed as days after the start. The first payment is one interval after
the start. Example dates use date-only UTC arithmetic, with start dates between 1900 and
2100, so browser timezones do not shift a due date.

Intervals match the existing records schedule policy: `WEEKLY` = 7 days, `SEMIMONTHLY` =
15 days and `MONTHLY` = 30 days. Public labels explicitly say “Every 7/15/30 days”; these
do not promise the 15th/30th of each month or calendar-month anniversaries. A calendar-date
policy would require a separate agreed change to both previews and issued schedules.

The calculation uses integer centavos and the issued schedule's half-even rounding rule.
The final installment absorbs the remainder; if normal rounding would leave a nonpositive
final payment, the regular amount rounds down. Every installment is at least one centavo
and the sum equals the total exactly. For example, PHP 100 over three payments produces
PHP 33.33, PHP 33.33 and PHP 33.34.

Missing terms show a contact prompt. Hiding a listing or removing its plan clears an open
preview on the next catalog refresh. Changed versions rebuild the preview from current
terms. The preview is illustrative: it does not enroll a client, reserve a unit, issue an
agreement, create payments or change balances. Existing private batch terms remain private.

## Data and API

The existing catalog create/update and staff/public read routes carry `installmentPlan`:

```json
{ "totalAmount": "100.00", "installmentCount": 3, "cadence": "WEEKLY" }
```

Use explicit `null` for no plan. Unknown fields, partial objects, invalid amounts/counts
and insufficient total centavos are rejected. Only published catalog terms appear publicly.

Migration `20261008030000_catalog_installment_breakdown` adds nullable decimal amount,
integer count and cadence columns to `CatalogItem`. Its database constraint enforces
all-or-none terms, count bounds and sufficient centavos. There are now **26 migrations**.
The migration changes no batch, agreement, schedule, payment or customer record. Neon and
Better Auth remain documentation targets; this uses the current local PostgreSQL/auth stack.

## Verification and remaining acceptance

`apps/api-ts/test/catalog.test.ts` verifies validation and parity with issued schedules,
including half-even ties, small totals, maximum amounts and 600 payments for every cadence.
`catalog.integration.test.ts` covers all-role authorization, published-only data, concurrent
writes, audit atomicity, plan removal, photo preservation, database constraints and unchanged
financial-record counts. `apps/web/test/catalog-plan.test.ts` covers dates, draft isolation
and captured-version/public-read behavior.

Local automated verification passed **227 tests**: 59 API unit, 123 PostgreSQL integration
and 45 web tests, including the existing local demo-auth checks. Workspace typechecks and
production builds pass. All 26 migrations apply to a fresh test database and the backed-up
local preview with no Prisma schema drift.

Production-build browser checks against an isolated real API passed staff term entry,
exact rounding, anonymous previews, leap-year dates, full paging, invalid-date recovery,
captured drafts during competing edits, explicit reload and plan removal while a preview
is open. Desktop, 390px mobile, dark staff editing and keyboard focus return passed.

Named business reviewers still need to approve actual prices, counts and intervals, then
walk through publication, preview dates, competing edits and removal. Production deployment
remains a release task; public support entry, FAQ search and other scope gaps remain separate.
