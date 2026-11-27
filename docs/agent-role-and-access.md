# Agent — role and portal access

For manual verification of the whole role, use the
[104-case test manual](agent-whole-role-manual-test.md) and
[blank results sheet](agent-whole-role-test-results.csv), prepared 2026-11-27.
Creating these procedures does not establish test execution or human acceptance.

Reviewed **2026-11-26** after the local merge `bd6b262`, combining
`51c6e79` (Pioneer/login) with `5f6e0ae` (HR/personnel and role workspaces).
The active checkout is `/home/jaycee/Projects/freshphonesph-agent-role`, branch
`feature/agent-role-review`. This supersedes the earlier 51c6e79-only review.

Jaycee requested access, review and planning first, then explicitly instructed
pulling/merging the newer branch before continuing with Agent. The
[current findings, phased plan and design notebook](agent-remaining-work-plan.md)
records the resulting baseline. Jaycee authorized implementation after this
review. The Phase 2 selected-intake status follow-up is now integrated and
technically verified. All four implementation phases pass technical checks;
human business/screen-reader acceptance remains unrecorded. No new permissions added.

## Purpose and reporting line

Agent handles assigned website membership applications, submits enrollment
requests, follows its assigned batches' withdrawal/replacement cases, and
reports its own assigned work. The reporting hierarchy is
**COO → Operations Coordinator → Pioneer Agent → Agent**. Its assigned Batch
Manager reviews enrollment requests; COO retains oversight and withdrawal
decisions. COO manages accounts, profiles and actual batch/team assignments.

## Current base permissions

These are the nine existing `AGENT` grants in
[`packages/contracts/src/index.ts`](../packages/contracts/src/index.ts), not
proposed permission additions. The 2026-11-25 Pioneer work already added
`TASK_SUBMIT` for Agent's own assignments.

| Permission                      | Existing capability                                                                         | Scope and limits                                                                                                                                                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ENROLLMENT_APPLICATION_READ`   | Read original website membership applications and answers                                   | Applications currently assigned to this Agent; immutable original form revision/answers remain separate from reviewed contact details. These are membership applications, not confidential employment applications.                                                             |
| `ENROLLMENT_APPLICATION_MANAGE` | Forward a received application, or close it with a reason                                   | Forwarding additionally requires `ENROLLMENT_SUBMIT`, the assigned active Agent/profile, an assigned open batch and an active assigned Manager. Closing is versioned/scoped; the Agent UI now requires a reason and explicit confirmation. Reassignment is explicitly COO-only. |
| `WITHDRAWAL_READ`               | Read withdrawal cases, history, financial context and recorded refund progress              | Cases whose memberships are in currently assigned batches. This includes due/verified-paid/remaining amounts and recorded payout details; it is not general payment/client access.                                                                                              |
| `WITHDRAWAL_AGENT_REVIEW`       | Add review notes, forward to COO and propose an eligible replacement                        | Forward only an `AWAITING_AGENT` case, never one's own withdrawal. Replacement requires an approved case, COO policy and the existing eligibility checks. No final decision or handover approval.                                                                               |
| `AGENT_NETWORK_READ`            | Read own Agent identity, profile/code, supervisor, assigned batches and enrollment progress | Self-only Agent account scope. Batch reads require an active linked profile/account. No peer/team directory or general member list.                                                                                                                                             |
| `ENROLLMENT_SUBMIT`             | Submit a new or existing member for enrollment and read own request status                  | Assigned `PLANNED`/`ACTIVE` batches. Existing-member lookup stays within assigned batches. Submission creates a request, not membership/account/schedule or a reserved position.                                                                                                |
| `TASK_READ`                     | Read own assigned tasks and authorized evidence                                             | Self-assignee scope; no other Agent's tasks or formal KPI evaluation contents.                                                                                                                                                                                                  |
| `TASK_SUBMIT`                   | Start and submit a report and/or evidence for own assigned work                             | Existing version/status checks apply. No assignment, completion or KPI decision powers.                                                                                                                                                                                         |
| `NOTIFICATION_READ`             | Read own notifications and authorized alerts                                                | Own inbox; existing read/mark-read/delete actions remain recipient-scoped. No notification-template administration or another person's inbox.                                                                                                                                   |

Session, active-account, legal-notice, current-assignment and API checks remain
independent of navigation. A visible link or copied component is not a grant.
Missing/inactive Agent profile can block batch-dependent work while own tasks
and account security remain separate capabilities.

## Current destinations

| Destination                             | Current screen                                                               | Review result                                                                                                                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/system`                               | Agent enrollment desk                                                        | Independent queues; authoritative full assigned-batch count, explicit profile readiness and own open-task summary. Failed counts remain unknown rather than zero.                  |
| `/system/agent-network`                 | Own profile/supervisor, request totals and searchable assigned batches       | Scoped server search/sorting/paging cover the full dataset. URL filters restore through Back/reload; current membership counts do not imply capacity.                              |
| `/system/enrollments`                   | Own request follow-up with a separate submission drawer                      | Independent failed/loading/empty reads; frozen original retries, saved-reference links and URL list/detail context are implemented in Phase 2.                                     |
| `/system/enrollments?view=applications` | Assigned intake, original answers and forwarding with preserved stale drafts | Refresh/conflict preserves edits; stale state blocks without a false busy label. Assigned received intake supports confirmed close; batch-choice failures retain original details. |
| `/system/withdrawals`                   | Assigned cases, Agent review and conditional replacement controls            | Agent-only review/proposals, retained stale/uncertain drafts and scoped replacement links are implemented and verified in Phase 3.                                         |
| `/system/tasks`                         | My tasks and own report/evidence drawer with activity                        | Own-assignee list, retained report/evidence, exact URL selection and explicit uncertain/stale recovery are verified. Cancelled is terminal; no KPI/assignment powers.                                                                |
| `/system/notifications`                 | Own scoped inbox                                                             | Both existing feeds, recognized URL filters/read receipts and exact intake/request/withdrawal/task links are verified. Unsupported destinations explain follow-up.                                                                |
| `/security`                             | Shared personal account security                                             | Own account utility; not personnel/account administration.                                                                                                                         |

The role manifest owns six `/system` routes. Applications and requests share the
Enrollments route. `/security` is a shared utility outside that manifest.

## Important distinctions

- **Forwarding an application is not enrollment approval.** Assigned Batch
  Manager approval or authorized COO review creates the membership/schedule
  under the existing capacity/terms checks. Agent cannot approve itself.
- **Closing an application is not rejecting a membership request.** It closes
  an unforwarded intake record with retained original evidence and a reason.
- **Request counts are not active-member counts.** Agent requests use
  `submittedById`; website intake uses `assignedAgentId`; batches/withdrawals
  follow current profile/batch assignment. Do not merge those scopes implicitly.
- **An approved withdrawal does not end dues.** Dues continue until successful
  replacement handover. Refund decision, payment and replacement are separate.
- **Financial context is read-only for Agent.** It cannot record/verify payment
  claims, change credit, approve a refund or record an external payout.
- Phase 1 desk/network views use authoritative paginated totals. The unused
  legacy network response still caps batches at 100; enrollment choices remain
  capped at 500 for later enrollment work. Neither list length is a capacity
  promise. Own open-task totals include TODO and IN_PROGRESS only.

## Explicitly unavailable

No general Payments, Clients, Reports, Personnel, Agent administration, batch
creation/assignment, account/role management, form publishing, job recruitment,
confidential HR, task assignment/completion, formal KPI review, final withdrawal
decision, refund approval or payout recording. Commission/payroll calculations
and new communication channels are outside this review's proposed scope.

## Source map

- Grants/routes: `packages/contracts/src/index.ts`,
  `apps/web/lib/workspace-access.ts`,
  `apps/web/app/system/_role-designs/manifest.json` and `system-navigation.ts`.
- Scope: `apps/api-ts/src/records/scope.ts`, `enrollment-scope.ts`,
  `role-workspace.controller.ts`, `role-workspace.service.ts` and
  `agent-network.controller.ts` / `agent-network.service.ts`.
- Website intake: `apps/api-ts/src/enrollment-forms/enrollment-form-tools.ts`,
  `enrollment-forms.controller.ts` / `enrollment-forms.service.ts`;
  [existing implementation guide](81-editable-public-enrollment-form.md).
- Withdrawals: `apps/api-ts/src/withdrawals/withdrawals.controller.ts`,
  `withdrawals.service.ts` and `withdrawal-handover.ts`;
  [existing implementation guide](77-member-withdrawals-main-demo.md).
- Tasks: `apps/api-ts/src/tasks/tasks.service.ts`,
  `apps/api-ts/test/pioneer-tasks.integration.test.ts` and Agent-owned task views.

## Verification boundary

Combined validation covers 260 web tests, 145 API units and 177 distinct database/API
scenarios, with passing targeted rechecks after observed failures. API suites
exercise actual server authorization in disposable databases, including Agent,
Pioneer, enrollment, withdrawal, Finance, HR and task-management boundaries.
Retained preview databases were not migrated or populated.

API/web types, API compilation, the optimized web build, client-secret scan,
scoped formatting and whitespace checks pass. Development and final optimized
browser fixture checks cover the new Agent desk, retained draft correction,
independent choices failure, own-task drawer and nine-pet login. Fixtures demonstrate
UI behavior rather than real-session login or human business/screen-reader
acceptance. Original main-run pending work and publication source are preserved.
See the notebook and `.local/hr-agent-merge-20261126/` for exact evidence.
No push or deployment was performed.

## Phase 1 verification — 2026-11-26

Current source passes 262 web tests and 17 real-database network/API cases,
including full Agent batch scope, missing/inactive profiles and own open-task
counts. Final role-isolation recheck, types, formatting and credential scan pass.
Optimized build **AsBcaTTDRQYUtDA2TzjHs** passed; 10 compiled browser groups,
17 captures and two scoped axe scans pass with zero violations/page errors,
unhandled reads or unexpected writes. Two additional compiled phone row crops
confirm full-width identity and visible status/count/paging at 320/393px.
Own disposable test database and temporary previews are removed/stopped.
Evidence: `../.local/agent-phase1-20261126/phase1-result.json`. Browser fixtures
are synthetic; actual human business/screen-reader acceptance is unrecorded.
Source is uncommitted locally on bd6b262; no push/deployment.

## Phase 2 verification — 2026-11-26

Close/recovery/list-context work is implemented and technically verified locally.
265 web tests and 22 isolated authenticated enrollment API cases pass, with six
focused recovery/isolation rechecks after the URL parser correction. The parser
uses exported contract validators; no new web dependency was added. API types,
17 focused web type entrypoints (zero diagnostics), full optimized-build types,
formatting and the credential scan pass. Build **2hbtiOUpo12qjnU-mzPmh** passes.
14 compiled workflow groups, 10 captures plus one close-confirmation crop and
four scoped axe scans pass with zero violations/page errors/unhandled API paths.
Nine synthetic writes were intercepted by the browser fixture; real API scope
and business writes were exercised only in an isolated disposable test database.
Its database and temporary previews are removed/stopped; original workspaces,
Phase 1 application/test files and installed hooks are preserved. Source remains
uncommitted; no push/deployment. Human business/screen-reader acceptance and
actual UI login remain unrecorded. Exact evidence:
`../.local/agent-phase2-20261126/phase2-result.json`.

## Phase 3 verification — 2026-11-26

Withdrawal/replacement follow-up is implemented and technically verified locally.
Reconciled the inspected parallel Phase 2 hardening while preserving the existing
contract parser and Phase 1 desk/network. Combined source passes 269 web tests,
nine isolated withdrawal / 22 enrollment API cases, API types, formatting,
credential scan and optimized build **ol2-4vdL2UpEM-8jKY6fy** with full web types. All 50
application/test source hashes match. Thirty-eight compiled browser groups and
eight scoped axe scans pass, with no page errors/unhandled API paths. Browser
fixtures use synthetic intercepted APIs; real authorization/business writes
were exercised in disposable databases, now removed. Own previews are stopped.

The replacement-link flag now applies the existing enrollment scope; a new
batch Agent sees an unavailable link when the linked request belongs to its
prior submitter. No read expansion, financial policy/schema/grant change.
Financial history stays read-only. Source remains uncommitted; no push/deploy.
Phase 4 own-task/notice work and human business/screen-reader acceptance remain.
Evidence: `../.local/agent-phase3-20261126/phase3-result.json`.

## Phase 4 combined verification — 2026-11-26

Implementation/automated acceptance is complete:274 web/48 isolated API cases,
API/full web types, formatting, credential scan and build **0v-BQ3yRWtsz1-SYMpFah** pass.
All65 source hashes match;92 compiled workflow groups/20 clean axe scans
cover Phase 4 in Chromium/Firefox/WebKit and prior Agent flows on the same build.
No Phase 4 API/schema/grant change. Own temporary services/database cleaned;
original workspaces/hooks preserved. Local source uncommitted; no push/deploy.
Human business/screen-reader approval and actual UI login remain unrecorded.
Use the [26-case manual](agent-quality-test-manual.md) and blank
[results sheet](agent-quality-test-results.csv). Exact evidence:
`../.local/agent-phase4-20261126/phase4-result.json`.

## Phase 2 follow-up resolved — 2026-11-26

The selected-intake duplicate status correction is integrated in the main
candidate.274 web tests, full types/build **snwxwlTrH-Oij_3A4l5ea**,72 compiled workflow groups
and16 clean axe scans pass. Only one Agent component changed; all64 other
captured source/test paths remain unchanged. All four implementation phases are
technically complete; human26-case acceptance remains Not run. Evidence:
`../.local/agent-phase2-followup-20261126/followup-result.json`.
