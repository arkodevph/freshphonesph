# Pioneer Agent — Phase 4 integration and acceptance plan

**Status: combined technical verification passed; human acceptance pending, 2026-11-25.**
Jaycee requested: “lets now proceed to phase 4, plan it first then show me.”
Jaycee subsequently accepted this plan with “lets then proceed.” The sections
below preserve the agreed sequence and criteria. Execution uses the separate
`freshphonesph-pioneer-phase-four` worktree; final evidence is recorded below.

The outcome is one verified local build combining the daily overview, Agent and
enrollment follow-up, and approved coaching/reporting workflow, followed by
Jaycee's hands-on review. The [main notebook](pioneer-agent-remaining-work-plan.md)
retains the overall four-phase checklist.

## Current baseline and prerequisites

| Phase                                  | Verified state at planning time                                                                                                                                                                                           | Phase 4 dependency                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1 — Daily overview                     | Implemented in `freshphonesph-main-run`, branch `feature/pioneer-agent-theme`; final evidence records 35 API checks, 250 web tests and an optimized build.                                                                | Preserve its count definitions, staff composition and scoped read APIs.                                                              |
| 2 — Agents and enrollment follow-up    | Implemented in `freshphonesph-pioneer-phase-two`, branch `feature/pioneer-agent-phase-two`; final evidence records 15 API checks, 252 web tests and an optimized build. Source-only patch is not yet applied to main-run. | Import only its owned changes; retain its full totals, minimal fields and safe filter return.                                        |
| 3A/3B — Tasks and own-Agent submission | The phase-three worktree contains implementation and passing scoped evidence, but its plan still says in progress and no final handoff result was present when checked.                                                   | Obtain its final source manifest, tests/build result, remaining issues and integration delta before freezing the combined candidate. |

All three worktrees currently have base `75d8771` and substantial uncommitted
work. A branch name or matching HEAD does not identify the feature snapshot.
Record hashes of the actual pending files and apply scoped deltas. Do not copy
one whole worktree over another or discard inherited Handler/Finance work.

Phase 3's approved policy is **Agent starts/submits only its own assigned task**;
an authorized Pioneer/Coordinator completes eligible submitted work. Human KPI
review for late submissions remains required. Earlier unresolved-policy wording
is historical. Phase 4 validates that decision without adding further grants.

The Phase 3 evidence also records three inherited notification/task-email tests
failing in both baseline and changed code. Their baseline parity is useful
diagnosis, not a passing result. Reproduce them with the required configuration,
distinguish fixture defects from application defects, and resolve relevant
failures before claiming the combined notification workflow is accepted.

## Proposed execution sequence

### 4A — Freeze and combine the three phases

1. Collect each phase's final owned-file manifest, source hashes, evidence and
   open issues. Recheck current files because another session may still edit 3.
2. Create an independent local Phase 4 worktree/branch from the current retained
   baseline. Record unrelated pending changes and copy a recoverable snapshot.
3. Integrate Phase 2 and final Phase 3 deltas over Phase 1. Review shared seams:
   API registration and test scripts, contract exports and the narrow Agent
   permission addition, role-file manifests, task/work authorization, common
   scope helpers, role CSS and documentation. Union compatible changes.
4. Check contracts/types and affected role-isolation tests before workflow QA.
   Record the combined candidate's hashes; use them for the later build.

**Exit:** one reviewable local candidate contains all three phases, preserved
unrelated source and a clear list of intentional changes. Separate phase test
counts are supporting evidence, not combined acceptance.

### 4B — Prepare isolated data and verify the complete business flow

Use a new migrated `_test` database and private local test storage. Seed two
Pioneer/Agent teams, Coordinator, authorized enrollment reviewer, KPI reviewer
and representative other roles. Include active/inactive/reassigned accounts,
missing/inactive Agent profiles, every request/task status, deadlines, versions
and owned/foreign attachments. Include more than 500 Agents, 100 scoped batches
and 20 requests/tasks so totals/search/paging exceed the old caps.

The retained Finance sandbox and its manual-test progress stay intact. Use a
separate synthetic-only review database, API/web ports and isolated browser
contexts or hostname/cookies; verify actual role shortcuts before handoff.
Send test notifications only to local/test infrastructure.

| Walkthrough                                                                       | Required result                                                                                                                                                         |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard → Agent → requests → return                                             | Scope and totals agree across the overview and directory; search/status/sort/page/selection survive detail and return. Request counts stay distinct from member counts. |
| Agent enrollment request → authorized reviewer decision → Pioneer follow-up       | Pending, approved and rejected outcomes and review notes agree between the existing request flow, Agent detail and team summary. Pioneer remains read-only.             |
| Pioneer assignment → Agent starts/submits report and evidence → Pioneer completes | Correct assignee/status/version, one saved transition and authorized evidence access. Completion requires eligible submitted work.                                      |
| Coordinator assignment → Pioneer own report → Coordinator completion              | My tasks/Agent team stay separate; Pioneer submits only its own work and Coordinator sees the permitted result.                                                         |
| Late submission → human KPI review → eligible completion                          | Completion is blocked until the required review exists; formal evaluation contents stay private and no wage action is automated.                                        |
| Reassignment or inactivation during the above                                     | Current-team rows/totals/direct links/files update consistently and former-team access disappears.                                                                      |

Reconcile counts against authoritative database reads at a fixed fixture state,
not against a single page or snapshots taken during different mutations.
Retain Phase 1 semantics: outstanding includes submitted work awaiting completion;
overdue means unsubmitted work past its deadline, not a formal KPI decision.

**Exit:** all connected flows pass against the combined real API and database,
with auditable expected statuses/counts and no edits to retained Finance data.

### 4C — Verify access boundaries, retries and recovery

- Exercise list, total, exact-ID, attachment and notification URLs directly for
  both teams. Test sessions/grants revoked, inactive users, changed supervisors
  and profile-state changes after a view has loaded. A requested ID is never
  authorization. Failed access clears inaccessible browser data.
- Confirm Agent cannot submit another assignee's work, assign/complete tasks,
  bypass evidence/report rules through a legacy task endpoint, or read another
  Agent's submissions. Pioneer cannot access financial actions, private HR,
  formal KPI evaluations or unavailable website-application destinations.
- Test double-clicks, simultaneous requests, lost successful responses, reloads
  and retried assignment keys. One task/audit/notification results from one
  logical assignment; conflicting key reuse fails. Recheck access before replay.
- Check stale task versions, simultaneous submissions/completion, concurrent
  refresh and out-of-order responses. Keep drafts/attachments on recoverable
  errors and require explicit reconciliation for changed versions.
- Distinguish initial loading/unknown, successful empty, stale refresh, failed
  filter read, denied read and explicit retry. A successful save plus failed
  refresh must say saved and must not resubmit the action.
- Verify notification recipient/scope, exact links, read state, deduplication,
  submission/deadline behavior and local worker/reconnect behavior where used.
  Resolve the known inherited tests with evidence instead of excluding them
  from an unconditional green result.

**Exit:** current authorization and once-only persistence are demonstrated at the
server/database level, with useful browser recovery and an explicit issue ledger.

### 4D — Check the complete interface in browsers

Use the existing staff theme and ROSS's recorded standards. This is a validation
pass; unrelated redesign, new dashboards or additional features are outside it.
Compare actual combined renders with the accepted direction and corrected
Pioneer composition. Retain headings without decorative eyebrows/numbers.

Check home, network, Agent detail, request outcome, tasks/assignment/report,
evidence and notifications in both themes at 1440/768/393/320 CSS pixels, plus
short landscape, large values and long names/codes. Test actual browser zoom
and enlarged text separately from viewport resizing. Keep numeric values
complete, touch actions visible and overflow within its intended region.

Run the core workflows in Chromium, Firefox and WebKit where available; record
engine/version and unavailable coverage explicitly. Test keyboard order,
dropdowns/dialogs, Escape, draft-discard behavior, focus return and reduced and
normal motion. Use axe alongside a manual accessibility walkthrough; human
screen-reader acceptance remains open until actually performed.

**Exit:** screenshots and observed browser results cover the agreed surfaces,
states and inputs. Automated scans do not establish human visual/AT acceptance.

### 4E — Run regressions and freeze the verified build

Run affected contracts/API/web types and builds, web/role-isolation checks and
isolated overview/network/task/access/notification tests against the final
combined source. Reuse the existing meaningful suites and add only missing
cross-phase assertions. Do not sum old phase test counts as a new result.

Smoke Finance, Handler, Agent and Coordinator on the combined candidate. Keep
financial smoke checks read-only; full task/enrollment mutations use only the
isolated fixtures. Verify that unrelated permission changes or financial/HR
mutations were not introduced. Compare protected source/data to the baseline.

Inspect scoped queries and representative `EXPLAIN (ANALYZE, BUFFERS)` plans
using the large fixture. Record observations without claiming production
latency. No index/schema change is proposed without a demonstrated need.
Run scoped formatting, whitespace and client-credential checks.

Build the optimized candidate, record its source manifest/build ID, then run
final browser checks against that exact served build. Fix relevant issues and
rerun the checks affected by each fix. Mark inherited, environmental and
unavailable checks separately; unresolved relevant failures prevent a full pass.

**Exit:** reproducible combined test/build/browser evidence, protected-source/data
comparison and no unacknowledged source drift after validation.

### 4F — Give Jaycee one reproducible review preview

Provide a working local role chooser, a concise manual guide and synthetic
fixture labels for enrollment follow-up, normal coaching, late submission and
Pioneer's own report. The guide specifies actors, actions, expected counts,
outcomes and how to resume without resetting progress.

Track three independent outcomes:

1. **Technical verification:** combined automated/live-browser checks and limits.
2. **Jaycee/client acceptance:** actual feedback on visual and business behavior.
3. **Integration/publication:** whether the reviewed candidate has been carried
   into the intended local integration branch; commit, push, PR/merge and
   deployment require their own instructions.

Retain the synthetic review environment if needed for Jaycee's test, remove only
owned disposable test databases/sessions/files and document recovery. Do not
replace the main preview or discard another session's work during handoff.

**Exit:** the user can test the complete workflow in one preview, relevant issues
are resolved or explicitly outstanding, and acceptance is recorded from actual
feedback. A technically ready preview alone is not full Phase 4 completion.

## Deliverables and work boundaries

- One combined, isolated local candidate and a scoped integration delta.
- A test matrix with expected outcomes, exact results and open issues.
- Matching source/build hashes, database/API evidence, browser captures and
  before/after preservation checks under the Phase 4 evidence directory.
- Updated Pioneer role/access reference, overall checklist and manual guide.
- A working review preview and separately recorded human acceptance.

Implementation ownership is integration glue, missing cross-phase tests and
demonstrated defects within these Pioneer/Agent workflows. Coordinate final
file ownership before editing active Phase 3 source. Financial policy, further
role grants, HR/coaching-log models, targets/commissions, schema redesign,
unrelated cleanup and publication are outside this plan.

## Planning evidence — historical checkpoint

Inspected the original Phase 4 checklist, actual worktree/status differences,
Phase 1 final evidence, Phase 2 final evidence/source patch/manual guide, Phase 3
plan/current task-contract-service changes, database/browser evidence and the
legacy-failure comparison. Consulted ROSS's notebook workflow and the project's
existing design decisions; no new external design direction was selected.

Phase 3 source/evidence was read only. No new application tests were run for this
planning-only document. No integration, database or runtime operation was made.
At that checkpoint the next action was to show Jaycee the proposal. His later
“lets then proceed” authorized the execution recorded below.

## Execution checkpoint — 2026-11-25

Phase1 baseline, Phase2 deltas and the captured Phase3 source are combined on
`feature/pioneer-agent-phase-four`, base75d8771. No original worktree was edited.
The Phase3 source was refreshed for its late UUID-casing retry fix and native
history filter navigation; affected task/combined checks and the final build
were rerun. Its assignment-form focus/scroll correction was also imported and
verified in the final web build. Source hashes identify the snapshot because all work remains
uncommitted.

The inherited three notification failures were reproduced, then repaired in
test fixtures: transient task-alert tests use Agent instead of the independently
persistent Handler inbox, and the timing scenario initializes its own config.
The original Handler product behavior is retained and its16-check suite passes.
87 isolated API/database checks across8 groups and252 web/145 configured API
unit checks passed on the first combined snapshot. Final updated-source results,
browser evidence and acceptance limits will supersede this checkpoint.

Preview is isolated at127.0.0.4:3004/API4104, with its own synthetic database and
private files. Current main/Finance and Phase2/3 previews remain separate. Ten
protected Finance tables have a saved baseline fingerprint. No schema/index or
additional permission change, source publication or deployment is included.
[Combined manual walkthrough](pioneer-agent-phase4-manual-test.md).

## Technical outcome and acceptance limits — 2026-11-25

The combined candidate passes 87 isolated API/database checks across eight
groups, 145 configured API unit tests, 252 web tests, API types/build, scoped
formatting and the optimized 72-page web build. The inherited three failures
were fixture defects; original failure logs and corrected passing results are
retained. No Handler notification behavior was changed. Client credential scan:
1,798 files, zero findings. Representative scoped query plans are saved; no
schema or index change was needed.

Connected real-API workflows cover enrollment submission/reviewer outcomes,
Pioneer assignment → Agent start/report/evidence → Pioneer completion, Pioneer's
own report → Coordinator completion, late submission → human KPI review and
completion eligibility, current-team changes, private-file boundaries and
once-only assignment/audit/notification persistence. Synthetic fixtures exceed
the former 500-Agent/100-batch/20-row caps. The review database is independent
of retained Finance data.

Browser evidence contains 60 captures and eight axe scans with zero violations.
Chromium 155, Firefox 141 and WebKit 26 pass core home/network/enrollment/task
views at dark 1440px/light 393px, keyboard dialog/focus return and short landscape.
The wider network/task harness covers both themes, 320/768/900/1000px cases,
long text, stale/denied/failed reads, retry and navigation recovery. Chromium's
actual browser zoom reaches 200% (1440 → 720 CSS pixels; DPR 1 → 2); enlarged
root text is checked separately. Normal-motion and reduced-motion interactions
are exercised. A settled-motion check caught the assignment input moving out
of view during expansion; the imported resize-observer correction keeps the
focused input visible. Final checks cover normal/reduced motion at1440/393/320px
in all three engines, plus origin rejection and session revocation.
Finance, Handler, Agent and Coordinator task-workspace smokes
pass. Earlier WebKit launch failures are retained as resolved local dependency
issues, alongside its clean final run. These are browser-engine checks, not a
claim of physical-device or human assistive-technology acceptance.

All 41 inherited main-run pending-file hashes remain unchanged in the original
worktree. Other roles' manifest entries are preserved. Ten protected retained
Finance tables have identical before/after counts and hashes. All owned
disposable test databases were removed; the separate synthetic preview/database
and its manual-test progress remain available.

Evidence: `../.local/pioneer-phase4-20261125/final-result.json`,
`database-results.json`, `integration-check.json`, `build-source-hashes.json`,
`engines/results-final.json`, `network/browser-result.json` and
`tasks/browser-results.json`. The source-only `phase4-source.patch` is checked
against the current main-run pending baseline, round-tripped byte for byte,
and left unapplied there. Candidate documentation is separate because parallel
sessions own their existing notes.

**Open acceptance:** Jaycee/client visual and business walkthrough, human
screen-reader review and any resulting corrections. No such acceptance has
been inferred from test passes. Commit, push, merge and deployment remain
separate instructions. The combined preview is
<http://127.0.0.4:3004/login> → **Preview a workspace → Pioneer agent**.

Combined build ID: `UcHOM2aexrAJp2sFO9i5t`. Source hashes are in the evidence directory.

## Technical closeout — final Phase3 reconciliation

The final Phase3 assignment-input normalization is included. Current39 candidate
source hashes match the optimized72-page build; captured final Phase3 hashes
match with no remaining delta.252 web tests pass. On the exact served build,
a real successful assignment response is lost, whitespace is edited and the
same key/task replays with one total increase. An uppercase-ID browser fixture
also submits the normalized UUID. The exact Agent then starts/submits its PDF
report and Pioneer downloads/completes the same task. Both sessions logout200
and original cookies return401. The earlier selector failure is retained and
resolved in the test harness; product source remained frozen.

All four phases’ coding and technical integration work is complete locally.
No code item remains. Actual visual/business and human screen-reader acceptance
remain unrecorded; no acceptance or deployment is inferred from these checks.
See `../.local/pioneer-phase4-20261125/phase-completion-status.json` and
`final-assignment-result.json`. The active directory is
`apps/web/.next-pioneer-phase4-final`; the earlier build is retained for recovery.
