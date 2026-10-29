# Role access alignment — 2026-10-28

Jaycee authorized implementation after reviewing the role matrix. COO can grant and
assign business roles. Agents submit enrollment requests; the assigned Batch Manager
approves them, with COO oversight. This supersedes the earlier review hold and V4's
prohibition on Agent enrollment. The October 26 CEO report-only decision remains.

## Implemented access

| Role | Available responsibilities in the existing system |
|---|---|
| Owner / CEO | Read/export all report families and saved analysis. No operational work or report authoring. |
| COO | Business account/role administration, operational records, batch/team assignments, enrollment review, tasks, support, recruitment job management and all report families. No final financial verification. |
| Batch Manager | Assigned batches/members/documents, enrollment approval, Handler assignment within their team, team tasks and scoped payment monitoring. No Batch ID creation or payment recording. |
| HR & Payroll | Minimal personnel directory, recruitment job management, personal tasks. Private applicant files, HR actions and private HR access require an explicit confidential grant. Payroll stays external. |
| Records & Monitoring | Batch ID creation and record maintenance, client documents/reviews, Agent directory and payment monitoring. No payment claim recording, direct enrollment, Handler assignment or final financial verification. |
| Finance | Payment/receipt review and final financial verification/correction/reversal, collection/reconciliation reports and department tasks. No claim recording or personnel account administration. |
| KPI Officer | Minimal personnel directory, task facts/targets/deadlines, human KPI evaluation, task assignment and task reports. Cross-person task bodies/files and private HR/applicant/payroll records are excluded. |
| Operations Coordinator | Assigned Pioneer/Agent hierarchy, recruitment progress, minimal personnel directory and scoped tasks. No member/payment editing. |
| CSR | Support/inquiries, minimal customer lookup with payment status, personal tasks and support reports. No payment amounts, receipt files or financial editing through lookup. |
| Pioneer Agent | Own assigned Agents, recruitment progress, minimal team directory and scoped coaching tasks. No enrollment approval or payment editing. |
| Agent | Own linked Agent profile/network, assigned open batches, enrollment submission/status and read-only assigned tasks. Enrollment takes effect only after review. |
| Batch Handler | Current assigned batches/members/schedules/balances, pending payment claim recording, receipt upload/correction, saved Finance results and personal tasks. No enrollment or final verification. |
| Customer | Existing own-client portal, schedule/payments/documents/support/notifications. Other clients remain inaccessible. |

Owner and CEO are one report-only business role (`CEO`), displayed as **Owner / CEO**.
Technical maintenance uses internal `SYSTEM_ADMIN`, never financial verification;
see [the Owner / CEO correction](67-owner-ceo-role.md). COO cannot provision/change technical administrators
or change their own role/access assignments. HR role-assignment delegation is undecided,
so HR cannot grant roles. COO/administrator may approve confidential access for another
active HR/COO account, with reason, version, audit and fresh sign-in; no self-grant.
Consequential HR decisions retain their existing separate approval workflow.

Catalog ownership is undecided: existing administrator/COO/Records/Manager catalog grants are
preserved. Legacy Analytics remains explicitly labeled and keeps existing report access;
no automatic conversion to KPI. New business accounts use the current role list.

## Scope and migration

`GENERAL_MANAGER` becomes `BATCH_MANAGER`, `CS_HEAD`/`CS_TEAM` become `CSR`, and
`CORE_HANDLER` becomes `BATCH_HANDLER`. Legacy `OWNER` normalizes to `CEO`. Migrations preserve account IDs, credentials,
links and business history, audit conversions and revoke old sessions. New hierarchy,
Agent-account and batch-manager assignments start unassigned; no real reporting roster
is guessed. COO must assign actual teams/profiles/batches in account and batch management.

The API denies authenticated business routes without an explicit permission policy.
Lists, guessed IDs, balances, history, receipt/document files, tasks and live event IDs
follow the current assignment. Handler Finance-result alerts, mark-all and queued result
emails also recheck the current batch assignment. Financial duplicate evidence remains
global for Finance, while Handler results stay within assigned batches.

Reports are separated by family: Finance receives Payments/Collections/Reconciliation,
KPI Tasks, CSR Support, and executive/legacy Analytics all five. These restrictions cover
live reports, downloads, snapshots, analysis and history. CEO has no report writes.

Enrollment requests are versioned and audited. Submission does not create a Client or
schedule. A current assigned Manager or COO approves/rejects with a reason; approval
creates the member and schedule atomically. Repeated requests/decisions are idempotent,
competing/stale decisions conflict and a submitter cannot approve their own request.
Requests remain visible in the enrollment workspace; saved internal notification rows
do not imply a new email/SMS integration or enrollment items in the existing staff bell.

## Deliberate limits

This access foundation does not complete the eight-confirmation/capacity gate, new
activation stages, Records/Manager operational payment-review chain, whole-GCash-history
PDF workflow, refunds, multi-batch memberships, payroll/commission calculation or client
UAT. Existing Finance verification stays exclusive and audited; balances use verified
credit only. Those business workflows retain their own backlog items and decisions.

## Verification

Evidence is kept in ignored `.local/role-access/`. The authorization suite exercises all
stored roles plus cross-team assignments, report families, enrollment approval/retries,
COO role administration, customer document isolation and current Handler result access.
The local preview uses clearly synthetic `ACCESS-DEMO-*` fixtures for new-role walkthroughs.
Current validation: 68 API unit tests, 108 web tests, workspace typechecks, final API
compilation/typecheck, optimized integrated-web build, formatting and whitespace checks
pass. Redis replication/worker checks pass 13 scenarios; the opt-in Redis interruption
scenario is skipped. All 14 local business/customer role previews pass navigation,
permitted-workspace and direct-route checks with zero page errors. A real browser also
completed Agent submission → assigned Manager approval → Agent status refresh, CSR lookup
and the 390px enrollment view.

All 181 distinct PostgreSQL integration scenarios pass, including the 77 core scenarios
and eleven focused role-access scenarios. The long command was interrupted after 75
passing cases; the remaining 49 core and 57 module scenarios then passed in persistent
jobs against the same isolated fresh baseline. The validation summary checks that these
three groups do not overlap. Total: **370 automated tests pass**, with one optional Redis
interruption scenario skipped. Evidence: `validation-summary.json`, `final-integration.log`,
`remaining-core.log`, `remaining-modules.log`, `final-unit.log`, `final-web-tests.log`,
`redis-tests-final.log`, type/build/format logs, browser results and screenshots in
`.local/role-access/`. Two read-only scope plans were captured on the small preview dataset;
production scale and named client UAT remain separate.

Local migration preservation checks compared existing users/credentials and
Payment/Client/ScheduleItem/Batch/Agent data before and after migration. The private backup
is under `~/.local/state/codex/freshphones-backups/20261028-role-access-preview/`.
The web, API and existing worker are running on the local preview configuration.

No production deployment, third-party integration, remote push or commit is part of this change.
