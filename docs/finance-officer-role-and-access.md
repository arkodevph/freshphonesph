# Finance Officer — role and portal access

Last updated: **2026-11-21**, Phases 1–4 on `feature/finance-officer-portal`, base
`bf739e0`. Original access audit: 2026-11-14. Existing Handler design work is
preserved separately. Role code: `FINANCE_OFFICER`.

This reference describes existing permissions, data scope, actions and UI limits.
It does not grant new access or mark proposed Finance improvements complete.
The API enforces access independently of visible navigation and buttons.

## Quick summary

Finance Officer handles final payment decisions, verified-credit adjustments,
financial reporting and the recording of approved external refunds.

- Reads company-wide batches, members, schedules, balances, payment claims,
  private payment proof and GCash statement evidence; not limited to a Handler's
  assigned batches.
- Verifies, rejects or requests clarification on eligible pending payments after
  current Records and assigned Manager approvals and receipt proof are present.
- Corrects, reverses or restores verified credit through audited adjustments.
- Opens member Statements of Account and verified-payment Confirmations from
  the Finance workspace, with fresh preview, PDF and printing. These retain the
  operational, non-BIR document notice.
- Reads/exports Payments, Collections and Reconciliation reports; saves snapshots
  and submits analysis within those families.
- Reads withdrawal cases and records partial/full external refund payouts against
  a COO-approved amount. It does not decide refund terms or transfer money.
- Reads and assigns Finance-department tasks; starts/submits its own tasks and
  completes eligible submitted Finance tasks. This is not global staff authority.
- Reads Finance/task alerts and personal notifications, and manages its own
  password, MFA, recovery codes, sessions and required notice acknowledgments.
- Cannot record/correct payment claims, replace receipts, perform Records/Manager
  reviews, edit operational records, manage customer IDs, administer personnel or
  access confidential HR/KPI evaluations.

Only Finance-verified credit affects the account balance. Recording a refund,
reading/scanning evidence or saving a report does not send money.

## Data and authority boundaries

| Data/action                        | Finance scope                                                                                                                                                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Batches and member records         | Company-wide read scope through `batchScope`/`clientScope`; not current Handler/Manager assignment scope. Read permission does not imply editing or reassignment.                                                       |
| Payment records and proof          | Company-wide payment scope, including pending, clarification, verified and rejected records and attached private receipt proof.                                                                                         |
| Duplicate-reference matches        | Company-wide search by method and normalized reference; the endpoint returns up to ten recent matches. A warning is evidence, not an automatic financial decision.                                                      |
| GCash statements                   | Company-wide batch scope; read current/historical submissions, original/current readings, corrections, activity and authorized files, including the archived queue. No statement mutations.                             |
| Withdrawals                        | Company-wide case read scope. Refund payout authority is separate from withdrawal/refund approval authority.                                                                                                            |
| Tasks and assignees                | Active accounts with the Finance Officer role. Scoped task bodies, reports and authorized attachments are readable, including another Finance officer's work. Not limited to tasks created by this user; not all staff. |
| Reports and saved history          | The three Finance report families, including permitted shared snapshots/analysis. No author-only filter is imposed on that family's history.                                                                            |
| Notifications and alert read state | The current user's notifications/read state and eligible work queues. It does not grant another user's inbox or session administration.                                                                                 |
| Confidential HR                    | Not eligible for the confidential-HR grant. A stored `hrConfidentialAccess=true` does not add Finance permissions.                                                                                                      |
| Authentication                     | Existing active-account/session, required MFA and legal-acknowledgment gates still apply. Hiding a UI control is not the security boundary.                                                                             |

## Current capabilities

| Area                              | What Finance can access and do                                                                                                                                                                                                    | Boundary                                                                                                                                                                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home/dashboard                    | Open the current operations dashboard, read permitted batch/member/payment summaries and available Finance follow-up/task entries.                                                                                                | A dedicated Finance home is proposed; current generic pending counts are not proof that every displayed payment is ready for Finance.                                                                                                             |
| Paluwagan Records                 | List/search/filter batches; open authorized batch detail/member context and read plan, capacity/status and assignment information. Read assignment filter options.                                                                | Cannot create/edit/activate/reassign batches. Batch change-history endpoint requires `BATCH_MANAGE`, which Finance lacks.                                                                                                                         |
| Clients                           | List/search/filter company-wide member records, read profile/contact and membership/batch/unit/release information. Open installment schedules and release-update reads.                                                          | Cannot enroll/edit members, issue schedules or change release status. Client change-history endpoint requires `CLIENT_MANAGE`.                                                                                                                    |
| Payments list/detail              | List/filter/search payment records, open transaction details, inspect original/effective credit, receipt metadata, recording/verification notes, operational-review history and adjustment evidence.                              | Read access does not allow editing the original claim or its proof. Finance now uses its own sortable table with batch/member identity, full-reference access, explicit proof/stage labels and contextual actions.                                                                                                   |
| Receipt proof                     | View/download existing private payment proof through the authorized proof endpoint.                                                                                                                                               | No receipt upload/replacement or receipt-scanning endpoint access; these require `PAYMENT_RECORD`.                                                                                                                                                |
| Duplicate investigation           | Search matching method/reference evidence and inspect returned payment context.                                                                                                                                                   | Does not mark a duplicate paid, remove a record or verify funds.                                                                                                                                                                                  |
| Submission checklist              | Read batch/period recorded claims, receipt presence, statement status and declared evidence requirements/blockers.                                                                                                                | Only Records/COO maintain expected submissions. Finance cannot add/edit/waive checklist requirements.                                                                                                                                             |
| Final Finance review              | Explicitly Verify, Reject or Request clarification for a qualifying pending payment, with a required note and current version.                                                                                                    | Current Records/assigned Manager approvals, proof and an open membership are required. Verification additionally requires complete submission evidence.                                                                                           |
| Verified-credit adjustments       | Correct the effective credited amount, reverse credit to zero, or restore credit through a new adjustment, with reason, version/revision checks, request ID and audit history.                                                    | Verified payments in open memberships only. Original payment and append-only adjustment history remain; this is not a refund payout or deletion.                                                                                                  |
| Balances                          | Read issued obligations, verified/effective paid amount, remaining balance, pending context and overpayment where returned by the API.                                                                                            | No direct balance write. Pending/rejected/clarification claims do not become credited payments.                                                                                                                                                   |
| Account document APIs             | Read an authorized client's Statement of Account and a verified payment's Payment Confirmation, including current credit/adjustment context and the operational-document notice.                                                  | The existing endpoints are available, but dedicated Finance preview/PDF/print entry points are still proposed. A copied Handler component in the Finance folder does not establish an active Finance action. These are not official tax invoices. |
| GCash history                     | List/filter statements; inspect current and previous PDF submissions, original/current extracted transactions, corrections, review/activity history, and download authorized PDFs.                                                | Cannot upload/resubmit, correct extracted rows, approve/return, archive or restore statements. Statement review does not verify individual payments.                                                                                              |
| Financial reports                 | Read Payments, Collections, Reconciliation, related exceptions and scheduled installment earnings; use existing applicable batch/period filters and CSV/XLSX exports. Read dashboard/chart data permitted by the Payments family. | No Tasks/Support report-family access. The executive chart composition is not shown to Finance merely because those read APIs are permitted. Scheduled installments are not actual collected funds.                                               |
| Saved reports/analysis            | Create permitted report snapshots, read saved history and submit analysis to a permitted snapshot that does not already have submitted analysis.                                                                                  | `REPORT_WRITE` does not edit payment records. Submitted analysis cannot simply be replaced; access is family-based, not unrestricted across all reports.                                                                                          |
| Withdrawals                       | Read cases, financial context, events, replacement preview and refund/payout history, including approved, already paid and remaining refund amounts.                                                                              | No customer withdrawal submission/resubmission/cancellation, Agent forwarding/replacement proposal, COO case decision or refund-policy/amount decision. A replacement-preview read does not grant enrollment access.                              |
| External refund payout recording  | Record a partial/full refund paid outside the app: amount, actual date, method, reference and note. Repeated identical request IDs are handled idempotently.                                                                      | Case must be approved/replaced with an approved refund amount; amount cannot exceed remaining approval, date cannot be in the future, and external references cannot be reused. No transfer integration or payout deletion/edit grant.            |
| Customer work                     | Open the payment queue and its payment links.                                                                                                                                                                                     | Finance cannot open this endpoint's support/document queues. The payment queue now includes only currently Finance-ready claims; all-payment history remains available through Payments.                                                                         |
| Department tasks                  | List/filter/read Finance tasks and detail, instructions, assignee, deadline, priority, submissions and authorized evidence. Read minimal Finance assignee options and create tasks with those fields.                             | Department scope; no general personnel directory. Creating a deadline does not provide an endpoint for arbitrarily editing existing deadlines.                                                                                                    |
| Own task work                     | Start a new task assigned to this user; submit its report/evidence while eligible and at the current version.                                                                                                                     | Cannot start or submit another person's task as its assignee. Submission requires the existing report/evidence conditions.                                                                                                                        |
| Complete department tasks         | Mark a submitted in-scope Finance task Done through the existing completion action.                                                                                                                                               | A late task needs an existing human KPI review first. Finance can see whether it was reviewed but cannot read private evaluation content or perform that evaluation.                                                                              |
| Additional task evidence API      | The existing `/work/tasks/:id/attachments` API permits an in-scope task assignee or authorized task assigner to add an attachment before the task is Done; authorized task-attachment reads follow scope.                         | This additional API is not a grant to submit another person's task and is not evidence that every legacy action appears in the current Tasks UI.                                                                                                  |
| Finance alerts                    | Read Finance-ready review alerts, open their exact payment links, filter unread items and mark individual/all applicable alerts read.                                                                                             | Read state is personal; reading an alert does not verify a payment. Dashboard, payment queues, Customer work and alerts now share the current readiness predicate.                                                               |
| Task/personal notifications       | Read own task alerts and personal notification records; mark individual/all authorized notifications read. Open the notifications page.                                                                                           | No Support, Accounts, Enrollments, Handler Payment reviews or Handler Finance-result queue access. Handler's retained-until-deleted inbox is not enabled for Finance; its read/delete-inbox methods reject non-Handlers.                          |
| Account and security              | Read own identity/security status, change own password, configure/verify/disable own MFA under the existing rules, regenerate recovery codes, view/revoke own sessions, sign out, and use password recovery.                      | No resetting/changing another employee's credentials, roles, grants, activation or sessions.                                                                                                                                                      |
| Notices and workspace preferences | Read applicable employee/privacy notices and acknowledge their current versions; use workspace search, accessible page navigation and light/dark mode.                                                                            | Preferences do not add authorization or change another role's design.                                                                                                                                                                             |
| Live updates                      | Receive existing record-change/refresh events for permitted batches, members, payments, GCash, tasks, withdrawals and personal alert/access state.                                                                                | Live events apply the same visibility rules; they do not expose denied modules or add mutation rights.                                                                                                                                            |

## Payment decision sequence

1. Handler records the external payment as a pending claim and supplies receipt proof.
2. Records approves completeness for the current evidence version.
3. The currently assigned Batch Manager approves the cross-check for that evidence
   and current batch version. Reviewer accounts must remain active and in the
   required roles; reviewer separation rules still apply.
4. Finance reads the evidence and independently checks actual funds outside the app.
5. Finance chooses Verify, Reject or Request clarification, supplies a note and
   submits against the current payment version.
6. A successful verification credits the payment. Rejection or clarification does
   not credit it. The decision and relevant notifications are recorded.

All three Finance decisions require pending status, proof, current operational
approvals and an open membership. **Verification additionally checks complete
submission evidence.** Returns/corrections/replaced evidence, changed assignments,
changed batch versions and concurrent decisions can invalidate eligibility.
Finance cannot supply the missing Records/Manager approval itself or bypass the
current-version checks. A receipt image is not proof of an actual bank settlement.

## Phase 1 workspace — 2026-11-20

The Finance home follows the coworker’s COO dashboard composition within the
existing Finance shell. It shows currently actionable payments, upstream waiting
stages, clarification follow-ups, verified effective collections for the named
payment-date period, approved refunds with a remaining amount, and the signed-in
officer’s open tasks. Only current verified credit and its adjustments enter the
collections figure. All queues are filtered by the server before pagination.

Payments defaults to Ready for Finance, with waiting stages, clarification and
All payments available. Exact payment links remain accessible independently of
the queue. Failed reads show a retryable error; same-query rows are marked stale,
while changed-query failures and denied access clear old data. Read-only memberships
are labeled explicitly; verification stays unavailable until submission evidence
is complete. This adds no new financial permissions or decision-policy changes.

The full implementation record and validation are in
[the Finance work plan](finance-officer-remaining-work-plan.md#phase-1-living-design-record--2026-11-20).

## Phase 2 workspace — 2026-11-20

Payments has server sorting for Member, Payment date and Recorded date, retained
in its URLs. Amounts show effective credit and original adjusted amounts; they
remain unsortable because stored claim ordering would misrepresent effective credit.
Member identity stays pinned, with Batch also pinned on wider screens. Table
scrolling is contained, with names-only density choices and reachable row actions.

Use a row’s **Open review workspace** action to inspect the current payment,
private receipt, full reference, potential duplicate matches, Records/Manager
history and date-scoped submission requirements beside the decision. Other file
types retain an original-file link. Verify, Reject and Request clarification have
separate effects and require a note and explicit confirmation. A stale version or
failed evidence read blocks submission; reload/review is explicit. Notes survive
errors and close/reopen while the page remains open, rather than being server-saved
drafts. Denied reads clear review evidence and cached Finance rows. Existing
verified-credit history and eligible correction controls remain available.

## Portal navigation

The workspace policy permits the following routes. Finance now prioritizes Payments, Reports, GCash, Withdrawals, Tasks and Ready for
Finance; secondary pages can also be opened directly when authorized.

| Workspace             | Route                   |
| --------------------- | ----------------------- |
| Dashboard/Home        | `/system`               |
| Tasks & KPI           | `/system/tasks`         |
| Reports               | `/system/reports`       |
| Clients               | `/system/clients`       |
| Paluwagan Records     | `/system/records`       |
| Payments & Finance    | `/system/payments`      |
| GCash history         | `/system/gcash-history` |
| Withdrawals           | `/system/withdrawals`   |
| Ready for Finance     | `/system/customer-work` |
| Notifications utility | `/system/notifications` |

Own-account security is at `/security`; employee/privacy notices are available
from the account menu. They are personal utilities, not extra business grants.
These workspace routes are denied to Finance, including direct URL visits:

```text
/system/operations-monitor
/system/agents
/system/catalog
/system/team
/system/personnel
/system/agent-network
/system/enrollments
/system/hr-actions
/system/support
/system/inquiries
/system/recruitment
/system/notification-settings
/system/retention
/system/assistant
```

The current `Cloud`/AI Assistant workspace at `/system/assistant` is CEO-only;
Finance does not inherit it through reporting permission.

## Restrictions

Finance Officer cannot:

- Create/correct pending payment claims, scan receipts through the payment scan
  API, attach/replace proof, or impersonate the Handler recorder.
- Approve Records completeness or the Manager cross-check, skip their current
  approvals, verify without required evidence, or decide a non-pending claim.
- Overwrite/delete original verified payments, adjustments or decision history;
  directly set a customer's balance; automatically verify a group of claims.
- Create/edit/activate/reassign batches, enroll/reassign members, change issued
  schedules or release states, or read edit-history endpoints requiring management.
- Read/upload/review customer IDs or requirement documents, configure customer
  requirement types, or maintain expected-submission checklists. Payment receipts,
  GCash PDFs and financial statements use separate access from customer ID files.
- Upload/review/correct/archive/restore GCash statements.
- Decide withdrawal approval, replacement policy, refund eligibility/amount/terms
  or create an Agent replacement request. Finance only records approved external
  refunds actually paid, subject to the existing payout checks.
- Read Tasks/Support reports, unrelated staff task bodies/files, confidential KPI
  evaluation content or review queues, private HR/payroll/applicant records, or
  impose automatic salary deductions.
- Manage accounts, role assignments, confidential access, staff email settings,
  general personnel/Agent directories or Agent hierarchy.
- Manage support/inquiries, enrollment requests/forms, recruitment, public catalog,
  notification templates/reminder jobs, retention/deletion, technical administration
  or the global audit-log workspace.
- Use a linked customer's private portal session or customer-only membership/
  pending-payment endpoints. Authorized staff financial reads are separate.
- Use the CEO-only AI workspace, send money, initiate bank/GCash transfers, or issue
  an official tax invoice through the operational document features.

Public website actions remain public; they do not become staff management access.

## Effective permission keys

The current default Finance role has exactly **13** effective permission keys:

| Key                     | Meaning within this role                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `BATCH_READ`            | Company-wide authorized batch reads.                                                             |
| `CLIENT_READ`           | Company-wide authorized member/schedule reads.                                                   |
| `PAYMENT_READ`          | Payment/proof/balance/statement/confirmation and checklist reads, subject to service conditions. |
| `PAYMENT_VERIFY`        | Final eligible decisions, verified-credit adjustments and Finance alert access.                  |
| `GCASH_HISTORY_READ`    | Statement/PDF/reading/history reads.                                                             |
| `REPORT_VIEW`           | Only Payments/Collections/Reconciliation report families and allowed exports/history.            |
| `REPORT_WRITE`          | Save permitted report snapshots and submit analysis.                                             |
| `WITHDRAWAL_READ`       | Withdrawal/case/refund/payout context reads.                                                     |
| `WITHDRAWAL_REFUND_PAY` | Record approved external refund payouts.                                                         |
| `TASK_ASSIGN`           | Assign/manage department tasks; does not widen department scope or grant KPI review.             |
| `TASK_READ`             | Scoped Finance task reads and applicable staff-alert access.                                     |
| `TASK_SUBMIT`           | Own task progress/submission and service-authorized evidence actions.                            |
| `NOTIFICATION_READ`     | Current user's personal notification reads/read-state changes.                                   |

No `PAYMENT_RECORD`, `PAYMENT_COMPLETENESS_REVIEW`, `PAYMENT_MANAGER_REVIEW`,
`DOCUMENT_READ`, `DOCUMENT_UPLOAD`, `DOCUMENT_REVIEW`, `KPI_REVIEW`, `STAFF_READ`,
`HR_CONFIDENTIAL`, `ACCOUNT_MANAGE`, `AUDIT_READ` or general operational-management
permission is part of this role.

## Supported access and Finance implementation status

| Item                                                                                               | Current status                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Final verification, adjustments, financial reports, scoped task work and approved-refund recording | Existing server capability and current role grants. Ordinary financial decision and refund controls already exist. This document does not claim new end-to-end acceptance of every mutation. |
| Local schema/API baseline                                                                          | Previously restored after the authorized coworker merge. Fresh read checks on 2026-11-14 returned 200 for payment, Finance-alert and other sampled authorized reads.                         |
| Dedicated Finance home and consistent actionable queue                                             | Implemented locally in Phase 1: dedicated Finance home and authoritative actionable queues; current readiness matches Finance alerts.                                                                         |
| Clear read-error state, server stage filtering and specialized Finance table                       | Implemented locally in Phases 1–2: explicit load errors, server stage filtering, sorting, density, pinned identity and contextual row actions.                            |
| Evidence and deliberate decision in one review context                                             | Implemented locally in Phase 2: combined evidence, notes, explicit confirmation and stale-version blocking; final-decision authority unchanged.                                                                                                              |
| Dedicated SOA/verified-confirmation preview, PDF and print entry points                            | Implemented locally in Phase 3 using the existing authorized document reads, fresh export guards, Finance portal surfaces and verified-only confirmation.                                                                                                                               |
| Better reconciliation/refund/document links and follow-up                                          | Implemented locally in Phase 3: scoped report/GCash links and return context, distinct refund amounts and reviewed personal Finance notification state; existing refund policy retained.                                                                                                                              |
| Complete Finance business acceptance and regression walkthrough                                    | Proposed Phase 4. Actual bank-receipt QA and final Handler acceptance remain separately deferred.                                                                                            |

See [Finance Officer remaining-work plan](finance-officer-remaining-work-plan.md).
The original documentation request preceded implementation; Jaycee subsequently authorized Phases 1–3. Full Phase 4 acceptance remains pending.

## Verification and limits

On 2026-11-14:

- Extracted the 13 effective permission keys, three report families and ten allowed
  `/system` routes from the current contract/workspace policy; cross-checked the
  signed-in normal Finance API identity. Setting the HR grant flag in the contract
  does not add Finance permissions.
- A fresh isolated local Finance session completed **24 authorized API GET checks
  with HTTP 200** and **12 restricted API GET checks with HTTP 403**. Reads include
  batches, clients, payments, department task options, report families, installment
  earnings, saved reports, withdrawals, GCash, Finance/task alerts, personal
  notifications, Customer work payments, security and legal status. Denials include
  account administration, general personnel/Agent hierarchy, audit, KPI review,
  Tasks/Support reports, notification management, support/document work queues and
  customer-only endpoints.
- Six existing workspace-policy/role-isolation tests passed. Source review also
  covered service-level checks that decorators alone do not describe: financial
  versions/evidence, open memberships, refund approval, task department/assignee
  scope, checklist-management denial and Handler-only retained inbox actions.
- Initial installment-earnings requests omitted the required year/period query
  contract and returned validation errors; reran with the actual schema parameters.
  Those are harness corrections, not failed authorization checks.
- No financial/business mutation, schema change, access-policy change or UI change
  was performed. Only own audit logins were created; each was logged out and its
  subsequent identity read confirmed 401. No existing user session was revoked.

Evidence: `../.local/finance-access-20261114/` (`inventory.json`,
`access-results.json`, `role-tests.log`). This is local source/read verification,
not a full new mutation/financial-flow audit, client acceptance or deployment.

### Phase 1 verification — 2026-11-20

241 web tests, 48 unique isolated database checks and 12 browser groups pass, plus
contracts/API types and the optimized web build. New Finance overview and queue
reads reject other roles; current readiness and financial writes are exercised
in disposable test databases. Dashboard/queue/failure/access-loss states and
320–1440px light/dark renders pass locally. Own browser session cleanup returns
logout 200 then identity 401. Existing permission grants and financial decision
policies are unchanged. See the work plan for evidence and remaining acceptance.

### Phase 2 verification — 2026-11-20

245 web tests and 47 isolated DB checks (10 Finance workspace/sorting and 37
financial regressions) pass. The final optimized build/type check passes with
72 pages. The served Finance screen passed its table/review browser checks, and
Handler, Records and Manager payment pages/API reads passed a separate smoke check.
No financial preview writes, role-grant changes, schema migration or deployment.
Detailed captures and boundaries are recorded in the work plan.

## Source and maintenance

- [Role grants, report families and effective permissions](../packages/contracts/src/index.ts).
- [Workspace route policy](../apps/web/lib/workspace-access.ts),
  [role manifest](../apps/web/app/system/_role-designs/manifest.json), and
  [Finance-owned views](../apps/web/app/system/_role-designs/finance_officer/).
- [Batch/client/staff/task scope](../apps/api-ts/src/records/scope.ts) and
  [record reads and write gates](../apps/api-ts/src/records/records.controller.ts).
- [Payment API](../apps/api-ts/src/finance/finance.controller.ts),
  [financial decisions/adjustments/documents](../apps/api-ts/src/finance/finance.service.ts),
  and [Finance-ready predicate](../apps/api-ts/src/finance/payment-workflow-query.ts).
- [Submission checklist controller](../apps/api-ts/src/submission-checklists/checklists.controller.ts)
  and [read/manage service boundary](../apps/api-ts/src/submission-checklists/checklists.service.ts).
- [GCash history API](../apps/api-ts/src/gcash-history/gcash-history.controller.ts)
  and [scoped service](../apps/api-ts/src/gcash-history/gcash-history.service.ts).
- [Report routes/family guards](../apps/api-ts/src/reports/reports.controller.ts)
  and [snapshots/analysis/exports](../apps/api-ts/src/reports/reports.service.ts).
- [Withdrawal API](../apps/api-ts/src/withdrawals/withdrawals.controller.ts)
  and [case scope/refund payout gates](../apps/api-ts/src/withdrawals/withdrawals.service.ts).
- [Current tasks API](../apps/api-ts/src/tasks/tasks.controller.ts),
  [department/assignee/completion checks](../apps/api-ts/src/tasks/tasks.service.ts),
  and [additional work API](../apps/api-ts/src/work/work.controller.ts).
- [Staff alerts](../apps/api-ts/src/staff/staff-alerts.service.ts),
  [Finance alerts](../apps/api-ts/src/finance/finance-alerts.controller.ts),
  [personal notifications](../apps/api-ts/src/notifications/notifications.controller.ts),
  and [Customer work subtype gates](../apps/api-ts/src/portal/customer-work.service.ts).
- [Authentication/personal security](../apps/api-ts/src/auth/auth.controller.ts),
  [legal acknowledgments](../apps/api-ts/src/legal/legal.controller.ts),
  [live event visibility](../apps/api-ts/src/realtime/realtime.controller.ts), and
  [server access guard](../apps/api-ts/src/auth/access.ts).

When asked for **Finance Officer role/access**, start with the quick summary,
then the requested area. Keep permission, service conditions, actual UI and future
work distinct. Update this file and its verification date when those change.


### Phase 3 implementation — 2026-11-20

Finance now opens SOA documents from payment rows or Balance lookup; verified rows
also open Payment Confirmations. Preview/PDF/print retain fresh authorized reads,
member/batch binding, operational non-BIR notices and stale/abort/access-loss guards.
Report links preserve applied period/batch/page and safe return context. Collections
uses the current member batch; Payments/Reconciliation use the recorded payment
batch. The optional `membershipBatchId` payment-list query only narrows existing
read authorization, without new grants or schema changes. Use the Collections
report for exports of that membership scope. GCash payment matches return to the
exact statement revision; unavailable revisions report an error. Approved refunds,
recorded external payouts and remaining approval are distinct; undecided amounts/
dates remain pending, with existing partial-payout/version/idempotency behavior.
Finance notification links and personal read states retain their existing policy.


### Phase 3 verification — 2026-11-20

250 web tests,59 isolated DB checks (12 Finance,10 Reports,37 regressions), contracts/API
and full optimized web types/build pass. The final served build passes20 Finance
browser groups;3 other-role payment read smoke checks pass. Real SOA/confirmation
PDFs and print preserve non-BIR wording; browser money/read-state mutations use
intercepted fixtures, and financial server mutations run only in disposable test
DBs. All test databases were removed and own test sessions logged out. Handler WIP
and other role manifests remain preserved. Scoped formatting and client credential
checks pass. No preview financial writes, schema/migration/grant change, commit/push
or deployment. Full Phase 4 and Jaycee/client acceptance remain pending. See the
[Phase 3 handoff](finance-officer-remaining-work-plan.md#phase-3-verification-and-handoff--2026-11-20).


### Phase 4 technical acceptance — 2026-11-21

The acceptance pass uses a separate synthetic-only database and private file store
at the existing local preview URL. Actual Records → assigned Manager → Finance
browser decisions include returns, corrections, renewed approvals, clarification
and once-only final verification. Customer balance, SOA and confirmation agree.
Financial/report/role/evidence regression checks use disposable databases; the
handoff/RLS group also runs under a non-superuser without row-security bypass.
The original preview database is preserved.

Six Finance-owned source files address conflict recovery, responsive layout and accessibility while retaining portal style:
valid term/value definition lists, a stable Finance-note label with a described
character hint, removal of the inherited decorative header eyebrow, and one-click
explicit stale-review reload with generation/identity guards, focus return after
live table refresh and payment filters that fit short landscape. No backend,
schema, grant or financial-policy change was made in Phase 4. Other role-owned views
and the prior Handler work are preserved.

Jaycee explicitly required keeping all work uncommitted so he can test it himself.
His hands-on acceptance, real browser zoom and human assistive-technology walkthrough
remain pending. Start with the [manual test guide](finance-officer-phase4-manual-test.md).
No commit, push, merge or deployment is part of this pass.


Final Phase 4 technical verification passes 250 web/145 API-unit/161 isolated DB checks,
37 browser groups across Chromium/Firefox/WebKit and 3 other-role read smokes. Four
full-page axe scans report 0 violations; real browser zoom, human AT and Jaycee's
hands-on acceptance remain pending. Full 72-page optimized build/types, API types,
six-file scoped formatting and the client credential scan pass. Original preview
financial fingerprints, backend/other-role sources, Handler WIP and grants are
preserved. The synthetic acceptance DB and pending manual claims are retained at
local 3000. All own sessions were logged out and disposable DBs removed. No commit,
push, merge or deployment. See the [test guide](finance-officer-phase4-manual-test.md).
