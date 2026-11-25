# Pioneer Agent — Phase 3 plan

**Phase4 integration checkpoint, 2026-11-25:** this source snapshot, including
approved own-Agent start/submission, late UUID/history/assignment-focus fixes
and final assignment-input normalization,
is combined and independently verified in `freshphonesph-pioneer-phase-four`.
See [Phase4 outcome](pioneer-agent-phase4-plan.md). Earlier staged-policy and
in-progress wording below is retained as dated Phase3 history; human acceptance
is still pending.

**Status: Phase3A and selected3B implemented in the combined Phase4 candidate, 2026-11-25.** Jaycee requested Phase3 while Phase2 was
in progress, then asked to plan it. This document defines **Phase3A** as the
first implementation slice and records the later policy-dependent work.
Jaycee subsequently accepted the recommended3B own-Agent submission workflow
and instructed “lets proceed then.” This authorizes3A and that narrow3B capability;
prior planning-only/read-only statements below describe the original3A boundary.

The [main Pioneer notebook](pioneer-agent-remaining-work-plan.md) owns the overall
four-phase plan. Phase1's daily overview is implemented and technically checked;
Phase2's Agent/enrollment work is integrated in the separate Phase4 candidate. Neither
is to be repeated or overwritten here. This plan builds on existing task
assignment, evidence, versioning and audit behavior.

## Phase 3A — Task workspace and Pioneer's own reporting

**Outcome:** the Pioneer can distinguish personal work from Agent follow-ups,
assign scoped tasks deliberately, and submit its own reports with clear results
and recovery. Existing Agent access remains read-only.

### 1. Make the task list the starting point

- Keep the existing staff shell, Pioneer theme, typography and controls. Use
  the page title **Coaching and tasks** and explicit **My tasks** / **Agent team**
  views. Proposed default: My tasks; retain an explicitly selected view on return.
- Put the list and status filter first. A visible **Assign task** action opens
  the existing disclosure/form deliberately; retain entered values while it is
  collapsed. Do not put the expanded assignment form ahead of the phone list.
- Show task title, assignee, real status, priority, deadline and a visible detail
  action. Use text with status colors, readable wrapping and full accessible
  titles. Preserve useful information at320px rather than hiding necessary fields.
- Display authoritative result totals and20-row server pages; keep view/status/
  page in the URL. Reset page on filter changes and recover an invalid page after
  reassignment. Never split or count only a returned page in the browser.
- Keep exact task links from the home/notifications. An authorized linked task
  may open even if absent from the current page/filter; closing returns to the
  retained list context. A filtered result is not a permission decision.

### 2. Separate personal work from current Agent follow-ups on the server

- Extend the task-list query with an optional validated `view=own|team` for the
  current Pioneer role. Omitted view preserves the existing API contract for
  all roles. Other roles do not gain new team semantics through this parameter.
- `own`: intersect `taskScope(current)` with `assigneeId=current.id`.
- `team`: intersect that scope with an active AGENT assignee whose current
  `supervisorId` is this Pioneer. Keep own tasks out of team totals.
- Apply the identical predicate to rows and total, with deterministic ordering.
  Keep direct task/file reads subject to existing current scope. Do not use a
  requested ID, cached Agent list or Phase2 selection as authorization.
- Continue using Phase1 aggregates for dashboard facts; do not recreate them
  from task pages or change their outstanding/overdue definitions.

### 3. Make assignment and submission results dependable

- Assignment retains existing title, instructions, scoped assignee, priority and
  future deadline fields. Verify current assignee activity/assignment at save,
  not only when the form loads. Label the deadline in the actual displayed zone;
  convert and validate the instant consistently with the existing API.
- Keep an immediate in-flight guard and disabled controls for repeated clicks.
  For new Pioneer assignments, add keyed server replay protection scoped to
  current actor/action/payload: same key and payload returns the original result;
  conflicting reuse fails; one task/audit/notification is created. Recheck current
  authorization before returning a replay. Existing unkeyed clients retain their
  contract. Reuse the durable receipt mechanism only after confirming its scope;
  the current COO-only replay helper does not cover Pioneer requests.
- Preserve a stable request key for an uncertain assignment response so retrying
  cannot silently create another task. A save success followed by a list-refresh
  failure must distinguish **saved** from **view could not refresh**.
- Keep start/submit/complete guarded by current status and version. Recheck
  `TASK_SUBMIT` for start/submission inside the transaction as well as at the HTTP
  guard; test revocation between guard and write. Current start/submit methods
  verify ownership/version but need this explicit permission recheck.
- Preserve typed reports and selected attachments on validation/network/conflict
  errors. Live updates indicate that the task changed without replacing a draft;
  an explicit reload explains any draft discard. Repeated submissions produce one
  transition/audit, even when the client missed the first success response.

### 4. Use existing tasks for Pioneer's report to its supervisor

- Under My tasks, Pioneer starts and submits only tasks assigned to its own
  account, using the existing report/evidence workflow. Preserve attachment
  validation, download authorization and meaningful file names/extensions.
- A supervisor sees the submission through its existing current staff/task scope.
  Do not promise an additional report destination, custom report editor, scheduled
  digest, permanent local draft storage or coaching-log model in this slice.
- Explain completion eligibility from real server facts: submitted status, current
  version, permission and any required human KPI review for late submission.
  Preserve current completion policy; do not bypass review or expose formal
  evaluation text to Pioneer.
- Agent-team rows remain assignments/follow-ups under current grants. Explain
  that Agent in-app submission is unavailable. Do not show Agent submission or
  external-attestation controls and do not call this a completed coaching loop.

### 5. Separate read states and recovery from successful empty results

| State                                   | Required behavior                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| Initial load                            | Progress message and unknown total; no false zero or empty claim.                     |
| Successful empty view                   | Explain whether My tasks, Agent team or a status filter has no matches.               |
| Refresh failure in the same view        | Preserve explicitly stale results and provide retry.                                  |
| View/status change fails                | Do not relabel old-view rows or counts as the new view.                               |
| Assignee lookup fails                   | Keep assignment draft and show lookup retry; do not claim no eligible Agents.         |
| Detail version changes                  | Keep draft and captured version; require explicit reconciliation before writes.       |
| Forbidden, revoked or reassigned detail | Clear inaccessible rows/details/evidence; retain only a useful safe recovery message. |
| Mutation succeeds but refresh fails     | Confirm the successful action and offer read retry; do not resubmit it.               |

## Phase 3B — Agent coaching-completion policy

**Selected by Jaycee,2026-11-25:** Agent may submit its own assigned work.
The original base AGENT lacked `TASK_SUBMIT`; this implementation adds only that
capability. Pioneer completion still requires `SUBMITTED`, current scope/version
and any required KPI review. The alternatives below remain historical options:

| Choice                                            | Plan consequence                                                                                                                                                                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Selected: Agent submits its own assigned work** | Approved narrow role capability; update Agent UI, permission contracts and current-actor checks; verify own-task evidence, team isolation, conflicts and late review. Then test Pioneer assigns → Agent submits → authorized completion. |
| Pioneer records external completion               | Define a separate audited attestation action, evidence, actor, version and late-review rules. Do not impersonate Agent or silently skip SUBMITTED.                                                                                       |
| Keep Agent assignments read-only                  | Retain assignment/follow-up semantics. Do not claim an end-to-end Agent coaching-completion workflow.                                                                                                                                    |

An ongoing training/performance log, HR training evidence, monetary figures,
commission rules, targets or rankings need separate business/data decisions.

## Design rationale and evidence

ROSS's design notebook workflow, website/table standards, typography lessons and
the current Pioneer notebook were consulted first. The controlling reference
remains the existing COO/Finance staff composition and the corrected Pioneer
theme, not a new gallery direction.

USER-EXPI flow: find work → understand owner/status/deadline → open detail → act
within role → inspect saved result → return to the same list. Likely failures
are confusing own/team ownership, losing drafts during live refresh, duplicated
assignment after an uncertain save and mistaking failed reads for no work.

`ui-design-index` route: dashboard/design systems. Its `ui-design-systems`
category file remains absent from the installed paths searched. Use the already
inspected repository primitives: list with scoped view controls, deliberate
assignment disclosure, and task-detail/evidence dialog. No new UI dependency.

| Evidence / confidence                                                                                                                                         | Scope and limit                                                                                                                                | Planned decision and validation                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [W3C status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), strong standards guidance, checked2026-11-25                         | Feedback about results, progress or errors can be announced without moving focus. This does not establish product usability by itself.         | Put saving/saved/retry/version messages near the action with appropriate status/alert semantics; verify keyboard/focus and assistive-technology announcements.                                                              |
| [W3C error prevention](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html), strong corrective guidance, checked2026-11-25 | The guidance explicitly does not require confirmation for every ordinary save/create. Consequence and reversibility matter.                    | Keep a direct reviewed assignment form; reserve discard confirmation for losing an unsaved draft and explicit conflict/review handling for consequential changes. Do not add a routine confirmation modal to every click.   |
| Existing role source, strong local evidence for behavior; no measured usability result                                                                        | Current source contains list paging, ownership/version checks and draft handling, but no own/team list query and no Pioneer assignment replay. | Preserve working behavior, test new server filters/retries and compare both themes at desktop/phone sizes. Verify list-first placement and retained context through actual tasks; do not infer usability from a screenshot. |

Keep current tokens and relative type sizes. Use tabular counts, left-aligned
names, consistent icon slots, visible touch controls and text status labels.
Keep report fields comfortable to read; full instructions/report text remains
available. Filename shortening preserves extensions. Existing0.97 press behavior,
disclosure motion, focus return and reduced-motion paths are retained. No eyebrow
labels, decorative numbers, speculative charts or new financial/KPI information.

## Implementation ownership and sequence

Planning updates only this file and a link in the main notebook. For subsequent
implementation, use a separate Phase3 worktree with a hashed snapshot of Phase1's
uncommitted baseline and an independently named preview/build/test database.

1. **3A.1 — Read model and state:** backward-compatible task query, scope/count
   tests and a Pioneer feature hook/API module. Keep routing files compositional.
2. **3A.2 — Workspace:** Pioneer-owned list/view controls, URL/detail return,
   deliberate assignment and recovery states. Extract feature components from
   the current large StaffTasksDashboard instead of adding more concerns to it.
3. **3A.3 — Writes and own report:** scoped permission rechecks, keyed assignment
   replay, drafts, evidence, conflicts and truthful save/refresh feedback.
4. **3A.4 — Acceptance evidence:** isolated real-server tests, browser walkthrough,
   source preservation, role regression, build and review handoff.

Primary ownership: Pioneer-owned `app/system/tasks/` components, task feature
hook/API helpers, bounded `apps/api-ts/src/tasks/` changes and focused tests.
Any shared contract/receipt migration must be narrow and recorded explicitly.
Phase2 owns Agent-network/enrollment UI and its read-query work; do not edit that
worktree, records queries, Phase1 overview or global role/sidebar policy for3A.
Integrate only scoped deltas after both worktrees' final changes are known.
Re-read source before implementing because Phase2 is active concurrently.

## Required validation and completion criteria

- A separate local migrated Pioneer test database: coordinator, two Pioneer/Agent
  teams, inactive/reassigned accounts, owned/foreign evidence, enough tasks to
  cross several pages and every relevant status/deadline/version.
- List/detail/count/file scope, view/status paging, stable ordering, exact links,
  reassignment, inactive accounts, permissions revoked mid-write and own versus
  other-assignee start/submission. Never seed/reset the retained Finance sandbox.
- Concurrent/retried assignment, same-key conflict, duplicate notification/audit
  prevention, submitted version conflicts and uncertain save outcomes. A busy
  button alone is not evidence of once-only persistence.
- Pioneer's own TODO → IN_PROGRESS → SUBMITTED → eligible completion walkthrough,
  with report/evidence visible only to authorized actors. Late submission stays
  blocked until required KPI review. Agent remains read-only throughout3A.
- Initial/refresh/filter errors, denied reads, drafts, focus return, keyboard,
  reduced motion, light/dark,1440/768/393/320px, enlarged text and short landscape.
  Record actual browser/assistive-technology checks separately from axe/width tests.
- API/web types/build, affected tests, scoped formatting/credential scan, Phase1
  totals reconciliation and Finance/Handler/Agent/Coordinator regression smokes.
  Compare source and protected data to baseline; save reproducible screenshots.

**3A is implemented only when those workflows and checks pass.** Human acceptance
is a separate status. The planning pass ran no implementation tests and made no
application/data/runtime changes. Agent policy is unresolved; Phase3 as a whole
must not be called complete merely because3A ships.

## Implementation note — assignment retries

Pioneer keyed creation derives a namespaced task UUID from current actor/key.
The existing Task primary key is the durable assignment receipt; immutable
assignee/creator/title/instructions/priority/deadline are checked on replay.
Current permissions and assignee scope are checked before returning a retry.
Same payload returns the same task with its current state; conflicting reuse
fails. There is no new replay table/schema or grant to reuse COO-only helpers.
Task assignment identity fields have no edit/delete endpoint in this module;
future edits/deletion must preserve the retry contract rather than allowing an
old key to execute again. This records the implementation choice replacing the
original proposal to reuse a separate durable receipt infrastructure.
