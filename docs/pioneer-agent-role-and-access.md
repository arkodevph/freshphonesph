# Pioneer Agent — role and portal access

Reviewed **2026-11-25** in the authorized local checkout
`/home/jaycee/Projects/freshphonesph-main-run`, branch
`feature/finance-officer-portal`, HEAD `75d8771`.
Jaycee initially selected **review the role and plan first**, then accepted the
plan and authorized applying the existing staff portal theme. Base permissions
are unchanged. The theme pass is on `feature/pioneer-agent-theme`; functional
workflow completion and hands-on acceptance remain separate.
The [work plan and design notebook](pioneer-agent-remaining-work-plan.md) contains
the findings, proposed phases, evidence and unresolved decisions.

## Purpose and reporting line

The Pioneer Agent supports its assigned Agents: see their member-enrollment
endorsement progress, coordinate coaching tasks and submit its own assigned work.
The hierarchy is **COO → Operations Coordinator → Pioneer Agent → Agent**.
COO maintains the actual account/profile/supervisor assignments; this role cannot
move Agents between teams or provision personnel accounts.

Here, enrollment progress means customer/member requests submitted by the
Pioneer's assigned Agents. It does not grant access to confidential employment
applicants, HR onboarding evidence or a staff-recruitment management console.

## Current permissions

The base `PIONEER_AGENT` role has six permissions in
[`packages/contracts/src/index.ts`](../packages/contracts/src/index.ts):

| Permission           | Current capability                                                               | Boundary                                                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STAFF_READ`         | Minimal personnel directory                                                      | Active self and directly assigned active Agent accounts; name, role, active state and supervisor name. No email, phone, salary, HR evidence or credentials. |
| `AGENT_NETWORK_READ` | Assigned Agent network, assigned batch summaries and enrollment-request progress | Current hierarchy only. Does not provide member/payment management or confidential website-application access.                                              |
| `TASK_ASSIGN`        | Assign scoped tasks and complete eligible submitted tasks                        | Assignees must be in current staff scope. Completion requires a submitted task, matching version and any required late-submission human KPI review.         |
| `TASK_READ`          | Read scoped tasks and permitted evidence attachments                             | Tasks assigned to self or currently assigned Agents. Formal KPI evaluation contents remain restricted.                                                      |
| `TASK_SUBMIT`        | Start and submit own assigned work                                               | Cannot submit a report or evidence as another assignee.                                                                                                     |
| `NOTIFICATION_READ`  | Own notices and authorized task alerts                                           | No notification administration or another person's inbox.                                                                                                   |

These are the base role grants, not a newly approved permission change. Session,
active-account, legal-notice, current-assignment and backend authorization checks
continue to apply independently of navigation visibility.

## Current portal routes

| Destination             | What currently exists                                                                                                     | Main limitation                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `/system`               | Pioneer-owned staff-theme dashboard with enrollment totals, assigned-Agent preview, recent tasks and authorized shortcuts | Full scoped Agent/profile/enrollment and own/team task aggregates; per-Agent progress/drilldown remains Phase2.                   |
| `/system/agent-network` | Agent directory, assigned-batch view and Pending/Approved/Rejected enrollment totals                                      | Aggregate progress only; no per-Agent drilldown. Agent/batch lists are capped server-side and then filtered/paged in the browser. |
| `/system/personnel`     | Searchable minimal team directory; initial failed reads no longer display a false empty total                             | Active-only backend results still make the Inactive filter unhelpful.                                                             |
| `/system/enrollments`   | Read-only scoped request list, status filter and request detail/review outcome                                            | No submit/approve/reject controls. No Agent filter; some source links need destination permission checks.                         |
| `/system/tasks`         | Scoped team-task view, collapsed assignment disclosure, own submission and eligible completion using the staff controls   | Agent submission limitation remains as described below; the theme pass changes no grant.                                          |
| `/system/notifications` | Own notifications and permitted staff alerts                                                                              | Read-only render inspected with browser fixtures, not a live Pioneer inbox.                                                       |
| `/security`             | Shared personal account-security utility                                                                                  | Own account only; not an account-administration grant.                                                                            |

The role manifest lists the first six routes. Copied Reports components inside
the role folder are not evidence of Reports access. Shared route policy and API
permissions continue to deny that workspace.

## Scope and data semantics

Sources:
[`records/scope.ts`](../apps/api-ts/src/records/scope.ts),
[`role-workspace.service.ts`](../apps/api-ts/src/records/role-workspace.service.ts),
[`role-workspace.controller.ts`](../apps/api-ts/src/records/role-workspace.controller.ts)
and [`tasks.service.ts`](../apps/api-ts/src/tasks/tasks.service.ts).

- Personnel and task scope include the Pioneer and its directly supervised,
  active Agents. Network Agent rows exclude the Pioneer itself.
- Batch summaries require an active Agent profile linked to an active Agent
  account whose current supervisor is this Pioneer. They expose batch identity,
  model, status and current member-position count, not financial balances.
- Network Agent rows can still contain a missing or inactive linked profile.
  The API supplies profile-active state, but the current view does not explain it.
  Account activity and profile readiness must not be treated as the same measure.
- Enrollment totals/requests follow the currently assigned active Agent submitter.
  They are not a fixed historical team snapshot, commission eligibility or a count
  of distinct active members. The aggregate has no date filter today.
- A team's enrollment history follows current assignment, so an Agent transfer
  changes which Pioneer can see its request progress. Preserve that policy unless
  the business explicitly changes it.
- Current network responses take at most **500 Agents and 100 batches**; personnel
  takes at most **500 staff**. The UI's ten-row pagination/search works on those
  returned lists. Displayed list length is not an uncapped organization/team total.
- Enrollment requests and tasks already use server pagination. Request pages are
  20 rows; list/count predicates must stay consistent when filters are extended.

## Coaching workflow — Phase 3 decision,2026-11-25

Jaycee approved allowing Agent to start and submit only its own assigned work.
The earlier read-only Agent policy is superseded by the narrow `TASK_SUBMIT`
addition. Pioneer assigns; Agent submits a report/evidence; an authorized
Pioneer/Coordinator completes eligible submitted work. Current team scope,
record version and any required human KPI review remain enforced. Pioneer
cannot submit as another assignee, and Agent cannot assign/complete tasks or
read another Agent’s records. Formal KPI evaluation contents remain restricted.

The [Phase3 plan](pioneer-agent-phase3-plan.md) records the approved option,
implementation boundaries and current verification status. External attestation,
a separate training/coaching log and confidential HR access were not approved.

## Actions outside this role

Pioneer has no payment recording/verification/adjustment, refund payout,
member enrollment submission or approval, customer-record editing, Batch ID
creation, batch assignment, role/account administration, confidential HR access,
formal KPI review, report management, job-board administration or Operations
monitor grant. Agent is a separate role with its own enrollment responsibilities.

Ongoing coaching is currently represented through tasks and submissions. The
private HR personnel-onboarding training record is a different workflow and
does not authorize Pioneer access. A separate training/performance record model,
commission figures, targets or rankings would require agreed scope and evidence.

## Initial review verification and limits

- Read the current contracts, scopes, controllers, services, role-owned views,
  workspace policy, assignment tests and current project/design notes.
- The retained Finance sandbox has seven other roles and **no Pioneer account**.
  The normal Pioneer preview shortcut returned **401**. No account was added,
  password changed, database seeded, migrated or reset to make the audit work.
- Captured **17 browser-fixture views**, plus two initial-read error cases,
  and inspected representative home/network/task renders from the existing build.
  Fixtures intercepted identity and all API
  reads locally in the isolated browser; no live Pioneer API access is established.
- Chromium fixtures covered light 1440/393px and dark 320px. No page exceptions,
  unexpected API fixtures, attempted application writes or measured document/
  `.system-content` overflow occurred. This is a narrow visual review, not full
  accessibility, cross-browser, populated-team or authorization acceptance.
- Historical role-access tests include Pioneer cross-team tasks/network and Agent
  reassignment. They were inspected, **not rerun**, in this documentation pass.
- The earlier Handler edits and current application source were preserved.
  No implementation, commit, push, merge or deployment is part of this review.

Evidence is local and ignored:
[`../.local/pioneer-agent-audit-20261125/`](../.local/pioneer-agent-audit-20261125/),
especially `visual-results.json`, `visual-review.log` and the `fixture-*` captures.
The failed live-login attempt is recorded separately in `audit-results.json`.

## Staff-theme implementation — 2026-11-25

Jaycee accepted the plan and authorized the existing staff theme. Implemented
the role-focused home, matching dropdowns, scoped light/dark semantic colors,
collapsed assignment, phone layout and honest read states. Fourteen Pioneer-owned
source files plus its manifest inventory changed; the backend/grants are unchanged.
The independent native-select wrapper also contains hidden validation controls
inside the workspace scroll area, with required-field validation preserved.

250 web tests pass;6 role/access checks rerun on final source pass. The optimized
72-page build/types, scoped formatting, credential scan and source-preservation
checks pass. Final browser fixtures cover17 views,2 error states and7 interaction/
recovery checks;2 axe scans have0 violations. Finance/Handler live read checks and
audit-session cleanup pass. Pioneer live authorization, full cross-browser/AT and
hands-on acceptance remain unverified; the Finance sandbox has no Pioneer account.

See the [current theme record and visuals](pioneer-agent-remaining-work-plan.md#staff-theme-application--2026-11-25).
The complete Phase1 aggregates and subsequent functional phases remain outstanding.

## Local preview login repaired — 2026-11-25

Jaycee reported that the Pioneer preview shortcut returned invalid credentials.
The retained Finance sandbox had no synthetic Pioneer preview account.
Added one active synthetic Pioneer identity using the existing private local
preview credential and normal credential-provisioning trigger. No existing
account/password, role grant, reporting assignment or financial record changed.
This is local preview setup, not a production personnel-provisioning change.

The actual **Preview a workspace → Pioneer agent** button now returns200 and
opens the real Pioneer dashboard. Network, Personnel, enrollment-progress and
Tasks reads/navigation pass with0 page errors. Financial/account-administration/
enrollment-submission option endpoints remain403. Own audit session logout200
and original-token401 pass. Ten protected financial/operational table fingerprints
are unchanged. The account starts without invented Agent/team assignments.

No application source edit, rebuild or service restart was needed. Existing
build `_YlV85bcUHTMR84lo82zF` remains active. Evidence:
`../.local/pioneer-login-fix-20261125/verification.json` and `provision-result.json`.
This supersedes the earlier account-absence limitation for local sign-in/read
checks; full cross-team/business/cross-browser/AT acceptance remains separate.

## Visual composition correction — 2026-11-25

Jaycee's subsequent screenshot/clarification identified the visual layout as the
problem, not the empty data. Corrected the home to follow the inspected Finance/
COO composition: featured left summary with paired small figures/total row,
larger Agent panel beside it, and compact task/workspace panels below. Retained
the reference's featured blue surface/green actions, Solar icons and panel rhythm;
empty states are intentional. No data was seeded and no grants/backend changed.

Only dashboard TSX/CSS changed. The72-page build/types and6 role/access checks
pass. The real Pioneer login,10 live theme/width renders,2 populated browser
fixtures,4 read-state checks and2 axe scans pass, with0 page errors/axe violations/
unexpected application writes. Audit logout200/original token401. Live1920px,
1440px and393px renders were inspected against the reference. Human visual
acceptance and full browser/AT/business checks remain separate.

Current preview is bucket a, build `J9XHdURgRuAsGsRAOnrLh`, at localhost3000.
See the [current visual record](pioneer-agent-remaining-work-plan.md). Evidence:
`../.local/pioneer-visual-revision-20261125/`. No commit/push/deployment.

## Related references

- [Role access alignment](66-role-access-alignment.md) — current role boundaries.
- [V4 role matrix](61-v4-role-and-permission-matrix.md) — dated organizational baseline;
  later access-alignment/enrollment decisions take precedence.
- [Operational assignment verification](128-operational-assignment-verification.md).
- [Independent role designs](156-independent-role-designs.md).
- [HR personnel onboarding](159-hr-personnel-onboarding.md) — separate private workflow.
- [Pioneer work plan and design notebook](pioneer-agent-remaining-work-plan.md).

## Phase 1 daily overview — 2026-11-25

The Pioneer home now uses independent `GET /pioneer/overview/team` and
`GET /pioneer/overview/tasks` reads with the existing `AGENT_NETWORK_READ` and
`TASK_READ` permissions respectively. Both additionally require the current active
Pioneer role, rechecked inside a repeatable-read transaction. Totals cover the full
current scope, independent of capped previews and list pages. No grant changed.

Agent total counts active accounts currently assigned to this Pioneer; linked
profile activity/missing linkage are separate counts. Enrollment request totals
remain all-time and follow current active submitter assignment. Task totals split
own work from current active direct Agents, retain each status, and include
submitted work in outstanding. Overdue means unsubmitted TODO/IN_PROGRESS work
past its deadline, without a formal KPI decision. Per-Agent filtering, uncapped
directory paging and Agent submission policy remain later work.

The full definitions, source links and verification evidence are recorded in the
[Phase1 notebook section](pioneer-agent-remaining-work-plan.md#phase-1-implementation--2026-11-25).

Phase1 technical verification:35 API integration checks,250 web tests, API
types/build,72-page optimized web build,20 live/isolated browser captures,5 read
states and4 axe scans pass. Live Pioneer sign-in and Finance/Handler reads pass;
retained operational data and assignments match baseline. Local3000 now serves
`.next-preview-b`, build `ZcN8LMqmIgNk6BXQnTZ_z`. Human acceptance remains pending.
Evidence: `.local/pioneer-phase1-20261125/final-result.json`.

## Phase 2 read-only network extension — 2026-11-25

Implemented separately in `freshphonesph-pioneer-phase-two` on
`feature/pioneer-agent-phase-two`, while the other session owns Phase 1 in
main-run. Existing endpoint contracts, grants, review/submission authority and
all other role views remain compatible. No financial fields or private account
contact details are added to the network response.

| Additive GET endpoint           | Existing permission  | Scope and response                                                                                                                                                                                                 |
| ------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/api/agent-network/agents`     | `AGENT_NETWORK_READ` | Current staff-scope active Agent accounts; validated name/code/Pioneer search, name/code sort and stable-ID tie-break; full filtered total and server page.                                                        |
| `/api/agent-network/agents/:id` | `AGENT_NETWORK_READ` | Stable account ID intersected with current staff scope; minimal name/code/profile activity and all-time per-status submitted request totals. Foreign/unavailable IDs return the same404.                           |
| `/api/agent-network/batches`    | `AGENT_NETWORK_READ` | Existing batch scope; full filtered total, code/model search/sort and server paging. Current member counts remain separate from enrollment request counts.                                                         |
| `/api/agent-network/requests`   | `AGENT_NETWORK_READ` | Existing enrollment scope intersected with optional authorized Agent, status, exact request and member/Agent/batch search; full total, oldest/newest stable paging, reviewer/reason and Manila-labeled timestamps. |

Each read rechecks current user access inside the same repeatable-read snapshot
as its scoped data. Filters never supply authorization. Overview/request totals
are computed before pagination. Search/status/sort changes reset page1; an
out-of-range existing page normalizes to the last available page. Global team
summary, selected-Agent scope counts and filtered totals have distinct labels.

Pioneer uses its own network route and read-only request component. Agent detail
and safe return URLs preserve network filters/selection. Website-application
source actions are absent, including for an otherwise visible request linked to
a real synthetic application. Replacement type is retained without adding an
unauthorized withdrawal/source destination. Original enrollment submission and
review endpoints are unchanged. Agent task submission remains a separate policy.

Review guide: [Phase 2 isolated walkthrough](pioneer-agent-phase2-manual-test.md).
Current verification and human-acceptance limits belong to the
[implementation notebook](pioneer-agent-remaining-work-plan.md#phase-2-implementation-notebook--2026-11-25).
