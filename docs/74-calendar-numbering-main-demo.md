# Calendar schedules and Agent numbering in the main demo

October 26 checklist items **#6 and #15**, integrated into the shared local
checkout on **October 30, 2026**, at Jaycee's request. This combines the existing
implementations with the latest roles, enrollments, multiple memberships,
notifications and GCash review workspace. The earlier isolated previews are
historical development environments.

## Test with the normal accounts

Open [the main login](http://localhost:3000/login), expand **Preview a workspace**,
and choose **Chief operating officer → Paluwagan Records → New batch**.

1. Choose an active Agent. The batch number is assigned by the server after
   creation, using that Agent's code and next sequence, such as `AB-001`.
2. Enter the model, price, installment count and start date.
3. Choose Monthly, Bi-monthly or Weekly, then the first installment due date.
   The chosen date is installment 1. Monthly plans also offer the same calendar
   day or the actual last day of each month.
4. Review every date and amount in **Installment schedule preview**, then create
   the batch. The final installment includes any centavo remainder.
5. Use the existing assignments controls to choose its Manager and Handler.
   The assigned Agent can submit an enrollment; its Manager approves it through
   the existing workflow. Approval issues the saved calendar schedule.
6. Existing Customer accounts retain their original memberships and can select
   each approved batch independently in the portal. Owner / CEO installment
   earnings use the issued rows.

Examples: a monthly month-end plan starting February 28, 2027 continues March 31
and April 30. A Bi-monthly plan starting January 31, 2028 continues February 15,
February 29 and March 15. Date shortcuts and the full schedule preview are also
available on narrow screens.

## Existing records and access

- Existing batch codes and their original fixed 7/15/30-day schedules stay
  unchanged. No historical batch is automatically renumbered or converted.
- Each Agent's counter continues across years and code changes. Reassignment
  changes the current representative while keeping the original numbering
  ownership and identifier. Generated numbers cannot be manually overridden or
  renamed. Failed transactions do not consume a number.
- A batch with schedules or payments has locked plan terms. Status changes
  retain its saved policy. Unissued plan changes remain versioned and audited.
- Creation still requires `BATCH_CREATE`: COO, Records and the existing internal
  administrator. Batch Managers retain their current operational permissions
  without gaining batch creation. Full Agent choices are returned only to
  creators; other assignment options retain their minimized fields and scope.
- Manager assignments, approved enrollment, shared member identities, report
  families and Finance-only payment verification retain the current main rules.
  GCash review source was preserved byte-for-byte.

## Integration and migrations

The numbering and calendar patches were merged against their captured base
versions rather than replacing current files. Conflicts retained the main
`BATCH_CREATE` guard, Manager fields, current assignment scope and membership
methods. Older test fixtures now use current COO/Records and Handler roles.

Both existing forward migrations apply on clean databases and on the current
preview after its later migrations:

- `20261028030000_agent_batch_numbering`: wider identifiers, nullable numbering
  metadata, durable counters, constraints and the legacy-prefix lookup index.
- `20261028040000_calendar_installment_schedules`: nullable first due date,
  month-end policy and database constraints.

Prisma and contracts were regenerated. An integration review also fixed final
date validation when an editor omits a saved month-end policy: server validation
still includes that policy rather than accepting an earlier calendar day.

## Verification and source state

The isolated migration rehearsal and actual preview migration each preserved
all original values in **64 tables**, including codes, account links, issued
schedules, financial history, assignments and GCash evidence. A private database
backup and source backup are retained in the ignored
`.local/calendar-numbering-integration/` evidence folder. No accounts or passwords
were reset.

The full combined test results and current availability are recorded in the
[afternoon handoff](68-2026-10-28-afternoon-handoff.md). Implementation and local
verification are separate from Jaycee/client acceptance and production release.
Source remains local and uncommitted on `feature/gcash-review-workspace`; no
remote push, release-branch merge or deployment is part of this integration.

Combined verification passes **486 automated checks**: 86 API unit/reader,
130 web and 270 PostgreSQL scenarios across 23 isolated suites. All current
migrations apply on clean test databases. API/web builds, TypeScript, scoped
formatting and whitespace pass. Seven browser groups pass with zero page errors;
these include real seeded COO creation, leap cutoffs, 390/320px dark views,
Agent/Manager approval, Customer membership switching, CEO earnings, API plan and
identifier locks, and retained GCash comparison. A post-walkthrough comparison
against the private backup confirms every original row/column in 17 operational
and evidence tables is unchanged. Temporary test databases were removed.
