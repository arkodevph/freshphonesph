# Pioneer Agent — findings, work plan and design notebook

**Status: Phases 1–3 combined and Phase 4 technical checks passed; human acceptance pending, 2026-11-25.**
Jaycee asked to work on Pioneer Agent, then selected **review the role and plan
first**. Initial review baseline was `75d8771` on `feature/finance-officer-portal`;
current work is on `feature/pioneer-agent-theme`.
Jaycee subsequently confirmed “got it, then thats the plan” and instructed
applying the existing design theme. The four-phase direction and existing staff
portal theme are accepted. The combined Phase4 candidate includes the daily overview, scoped Agent and
enrollment follow-up, coaching tasks and own reporting. Jaycee approved Agent
submission of its own assigned tasks in Phase3 and authorized Phase4 execution
with “lets then proceed.” The isolated candidate is in
`freshphonesph-pioneer-phase-four`; original worktrees remain separate. The [role/access reference](pioneer-agent-role-and-access.md)
documents current grants, reporting line, source paths and review limits.

**Earlier visual feedback and correction:** Jaycee showed the live1920px Pioneer dashboard and explicitly
identified the **visual design/layout**, not the empty data, as the problem. The
earlier technical theme completion is not visual acceptance. Its broad metric
strip and equally weighted cards did not preserve the established composition.

Current correction uses the inspected actual Finance dark dashboard
(`.local/finance-phase4-20261120/chromium-home-dark-1440.png`) and the retained COO
reference (`.local/finance-phase1-20261120/reference-coo-light.png`). Fidelity map:
greeting/actions; asymmetric overview with a220px featured count card, paired
small figures and a total row on the left; larger assigned-team panel on the
right; recent tasks and compact workspace tools below. Retain24px rhythm,
16px dark-panel radii, the existing blue featured-card treatment/green actions,
Solar icons and clear empty states. Omit decorative brand eyebrows and charts
without a data source. The visual-only correction preserved all reads and counts. Phase1 subsequently
adds authoritative reads while preserving permissions, accounts and Finance
test progress. No sample data was added to the retained preview.

Evidence/baseline: `../.local/pioneer-visual-revision-20261125/`, including Jaycee's
actual feedback image and the inspected controlling reference. The composition
is implemented and checked; human visual acceptance is not inferred.

The final live1920px render was inspected against the feedback and Finance
reference, with1440px and393px renders also inspected. The former wide metric
strip/equal panels are superseded. In that earlier visual-only pass, only the Pioneer dashboard TSX/CSS changed;
existing read hooks, endpoints, role grants, records, accounts, navigation and
other role views remain unchanged. No sample data was added.

That visual-only build/types passed (72 pages), as did6 focused role/access checks. Live
Pioneer login200,10 actual-data captures across1920/1440/768/393/320px in both
themes,2 separately labeled populated browser fixtures,4 read-state/recovery
checks and2 axe scans pass. No measured document/internal horizontal overflow,
page exceptions, axe violations or unexpected application writes. Own audit
session logs out200; its original token returns401. These checks do not establish
full browser/assistive-technology/business acceptance.

The visual-only pass served bucket a, build `J9XHdURgRuAsGsRAOnrLh`. The current
Phase1 preview below supersedes that build; its screenshots remain dated evidence.

- [Corrected live dark layout,1920px](../.local/pioneer-visual-revision-20261125/live-empty-dark-1920.png).
- [Corrected live dark layout,1440px](../.local/pioneer-visual-revision-20261125/live-empty-dark-1440.png).
- [Corrected live phone layout,393px](../.local/pioneer-visual-revision-20261125/live-empty-dark-393.png).
- [Original feedback screenshot](../.local/pioneer-visual-revision-20261125/feedback-before-1920.png).

## Current Phase 1 preview and verification

Local3000 serves bucket b, build `ZcN8LMqmIgNk6BXQnTZ_z`. The live Pioneer
chooser/login and aggregate reads work against the retained API4100. No sample
roster was added there; populated tests use a separate Pioneer database.

- [Current live dark dashboard,1920px](../.local/pioneer-phase1-20261125/live-dark-1920.png).
- [Separate populated test database,1440px](../.local/pioneer-phase1-20261125/isolated-dark-1440.png).
- [Populated phone task summary,393px](../.local/pioneer-phase1-20261125/isolated-light-393-tasks.png).
- [Final technical evidence](../.local/pioneer-phase1-20261125/final-result.json).

35 API integration checks (Pioneer8, role-access13, Finance12, queue/reset2),
250 web tests, API types/build and the72-page optimized web build pass. The new
scope checks cover503 assigned Agents,123 enrollment requests,24 own and100
team tasks, reassignment, inactive accounts, role/session revocation and all
other roles' denials. Representative plans are saved; no new index was needed.

20 actual-server browser captures cover live/isolated data in both themes at
1920/1440/768/393/320px. Five read-state/retry checks,4 axe scans, keyboard
refresh and Finance/Handler live read smokes pass.0 axe violations, page errors,
unexpected browser application writes or measured document/internal horizontal
overflow. Three extra task-panel captures support the inspected mobile/desktop
layout. Own audit sessions log out200 and original tokens return401. The isolated
QA API is stopped; its database/artifacts remain separate from Finance data.

All unrelated source and pre-existing pending work match the phase baseline;
11 protected operational tables plus account assignments remain unchanged.
No grant/schema/index change, commit, push or deployment. Cross-browser, actual
zoom/assistive-technology and Jaycee/client acceptance remain separate.

## Goal and daily flow

Help a Pioneer understand its current Agent team, find enrollment follow-up,
coordinate coaching and submit its own assigned work. The existing staff portal
is the visual base. Financial operations and confidential HR stay in their
authorized workspaces.

| Stage                       | Information and action                                                                 | Recovery and success signal                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Start the day               | Current team, pending enrollment requests and scoped task facts                        | Unknown/loading differs from zero. A failed card can retry without removing healthy content.              |
| Find an Agent               | Name/code/profile readiness, matching enrollment progress and task context             | Search/filter state survives a detail visit; missing profile or removed assignment has an explicit state. |
| Inspect enrollment progress | Applicant/request identity, submitted Agent, batch, status and existing review outcome | Retain filters and exact request; no submit/approval action or inaccessible application link.             |
| Follow up or coach          | Scoped task, assignee, deadline, instructions and permitted submitted evidence         | Explicit save/submit result, retained drafts and conflict recovery; completion uses the agreed workflow.  |
| Report own work             | Pioneer's own task/report to its supervisor                                            | Only own-assignee submission; no private KPI or HR evidence is exposed.                                   |

Task frequency and the real team size are not established by the synthetic
fixtures. Named Pioneer/Agent usability testing must validate the proposed
ordering; no conversion, productivity or adoption improvement is claimed.

## Audit findings

| ID   | Finding and evidence                                                                                                                                                                                                        | Priority / proposed response                                                                                                                                                 |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PA01 | Home describes schedules/payments/support, displays a payment workflow and has an empty Quick access panel. `DashboardCards` excludes Pioneer; permitted shortcuts filter to none. Confirmed in the fixture desktop render. | High: replace the generic content with current team, enrollment follow-up, task context and useful authorized shortcuts.                                                     |
| PA02 | Pioneer can assign Agent tasks, but Agent lacks `TASK_SUBMIT`; completing a task requires `SUBMITTED`. Contracts, both role dialogs and API guards agree.                                                                   | Business decision before end-to-end coaching implementation. Do not silently change Agent rights or invent completion.                                                       |
| PA03 | Network has only team-wide enrollment totals. Agent rows contain identity/code/supervisor, with no individual progress/detail. Requests have status/page/exact-ID filters, but no Agent filter.                             | High: scoped Agent detail and truthful progress drilldown; extend read queries rather than filtering only a returned page.                                                   |
| PA04 | Network truncates to 500 Agent accounts / 100 batches; personnel truncates at 500. Browser search and ten-row pages operate on those subsets.                                                                               | Medium, scaling-sensitive: server totals, search and deterministic paging before claiming complete lists/counts. No truncation incident demonstrated on a real team.         |
| PA05 | Initial Personnel read failure displays the error together with “0 of 0 staff” and “No personnel in your scope.” Confirmed by intercepted 503 response.                                                                     | High: explicit failed-read state and retry; unknown totals remain unknown. Network failure currently shows error + Refresh, which should be retained.                        |
| PA06 | Tasks says “All staff tasks” although scope is self/direct Agents; generic copy promises human review the role cannot author. Assignment form is expanded before the task list, occupying most of the phone screen.         | Medium: scope-correct labels, list first and a deliberate assignment disclosure; separate own work from team coaching.                                                       |
| PA07 | Network ignores returned profile-active state; Personnel offers Inactive despite active-only scope.                                                                                                                         | Medium: expose missing/inactive profile readiness without conflating it with account activity; simplify filters to data actually available.                                  |
| PA08 | Enrollment detail renders a Website application link whenever `publicApplicationId` exists; Pioneer lacks `ENROLLMENT_APPLICATION_READ`.                                                                                    | Medium: verify with a linked-request fixture, then hide unavailable destinations while retaining authorized request context. No private application access was demonstrated. |
| PA09 | Generic dashboard and Tasks retain eyebrow labels, unsupported blanket “Live data”/database-connected claims, and role-irrelevant operational guidance.                                                                     | Medium: useful headings and real refresh/error feedback; retain project theme and remove decorative labels.                                                                  |

## Design direction and evidence

ROSS's Design Notebook Workflow, Website Design Standards, Data Table Design,
Mobile Design, Typography Design, Visual Design and Animation Design were read
before this design review. Current project records used were
[UI patterns](UI-PATTERNS.md), [independent role designs](156-independent-role-designs.md)
and the [Finance implementation notebook](finance-officer-remaining-work-plan.md).

`user-expi` supplies the flow/state rationale; `ui-design-index` routes this to
dashboard/design-system patterns. Its referenced `ui-design-systems` category
skill was not found in the installed skill directories searched. The fallback
is the inspected repository patterns and primary accessibility sources below;
no missing skill content or gallery research is claimed.

### Proposed composition

- Keep the existing Pioneer light/dark token palette, shared staff shell,
  typography and component language. Use the local COO dashboard composition
  as a structural reference: greeting, task-relevant summary, adjacent follow-up
  and work content. Its financial metrics/charts do not belong in Pioneer.
- Select three compatible patterns: a task-focused daily overview; searchable
  identity-first team/progress directory; task detail with instructions/evidence
  beside properties and a list-first assignment flow.
- Reuse existing search, Select/FormSelect, DateInput, pagination, spring dialog,
  disclosure and progress primitives through Pioneer-owned view files. No new
  UI/table/chart dependency is proposed.
- Use clear headings, relative body text and a bounded fluid heading scale;
  retain full identity/code access and tabular right-aligned counts. No eyebrow
  labels, ornamental numbers, fabricated charts, rankings or commission totals.
- On phones, show Agent identity, meaningful progress and the available next
  action together. Keep the existing labeled-row directory pattern where it
  fits; only genuinely wide tables get contained horizontal scrolling. The
  saved mobile product-card references inform hierarchy, not tall imagery cards
  for an operational directory.
- Use lighter raised surfaces for dark-mode depth, readable focus, matching
  icon/label weight and inset-aware corners. Preserve brand tokens; any added
  palette ramp should follow the saved OKLCH guidance with measured contrast.
- Relevant motion uses existing spring/disclosure behavior, transform-based
  movement, 0.97 press feedback, instant theme switching and a reduced-motion
  path. No carousel, stepper, drag gesture or decorative entrance is needed for
  this plan; do not add one to exercise unrelated saved rules.

### Evidence ledger

These sources support constraints and hypotheses, not proof that the proposed
portal is usable. Findings are paraphrased; no study measured this product.

| Principle / evidence                                                                                                                                                                                                                                                                | Strength and limits                                                                                                                                      | Application and falsification                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Working memory is limited and depends on task/chunking conditions. [Cowan, 2001 abstract](https://pubmed.ncbi.nlm.nih.gov/11515286/) synthesizes short-term-memory evidence.                                                                                                        | Strong underlying research; analogy-only for this staff workflow. It does not prescribe four cards or a menu-item maximum.                               | Keep Agent identity, filter context and relevant progress visible. A named-user test finding unchanged/worse context recovery would challenge the proposed layout.                 |
| [W3C status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) should be programmatically available without forcing focus.                                                                                                                                 | Strong accessibility guidance; not a productivity experiment.                                                                                            | Announce results/retries/saves, retain persistent inline errors and avoid an error plus false zero. Check the accessible tree and an actual assistive-technology walkthrough.      |
| [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) addresses 320 CSS-pixel presentation; genuinely two-dimensional tables have a scoped exception.                                                                                                               | Strong conformance guidance. Table exceptions do not exempt headings, controls or individual cell text.                                                  | Measure the internal workspace as well as document width. Do not remove needed data to make a screenshot fit.                                                                      |
| Choice overload is context-dependent, rather than an automatic consequence of more options. [Scheibehenne et al., 2010 indexed abstract](https://doi.org/10.1086/651235), 50 experiments / 63 conditions / 5,036 participants, reports a near-zero mean with substantial variation. | Strong synthesis, consumer-choice contexts; analogy-only for navigation. Search-indexed abstract reviewed; full publisher/PDF retrieval was unavailable. | Keep useful team, enrollment and task destinations discoverable. Group them by purpose rather than hiding them to meet an arbitrary option count; validate findability with users. |

### Local implementation references inspected

- `_role-designs/coo/app/system/coo-dashboard/CooDashboardLayout.tsx` — greeting,
  content grouping and permission-filtered shortcuts; composition reference only.
- `_role-designs/pioneer_agent/workspace.css` — current independent role tokens.
- `_role-designs/pioneer_agent/app/system/people/AgentNetworkDirectory.tsx` and
  `PersonnelDirectory.tsx` — existing directories and mobile labeled rows.
- `_role-designs/pioneer_agent/app/system/enrollments/EnrollmentRequests.tsx` —
  existing list, outcomes, exact-request detail and dialog recovery.
- `_role-designs/pioneer_agent/app/system/tasks/StaffTasksDashboard.tsx`,
  `TaskFiltersPanel.tsx`, `StaffTaskDialog.tsx` — assignment/submission flow.

## Agreed implementation phases

Unchecked boxes remain outstanding; plan acceptance does not establish feature completion.

### Phase 1 — Useful daily overview and honest states

- [x] Replace the generic Pioneer home and empty shortcuts with current-team,
      enrollment-progress and task sections linked to authorized workspaces.
- [x] Define each count: active assigned Agent accounts; readiness separately;
      pending/approved/rejected requests submitted by the current team; own versus
      team task facts. Label all-time/current-team scope. Add a period only with
      matching server date predicates and stated Manila boundaries.
- [x] Use authoritative scoped aggregates for totals. Do not count capped network
      arrays or a single tasks/enrollment page. Derive outstanding work from real
      statuses; a due deadline is not a formal KPI judgment.
- [x] Add independent loading, empty, stale, failed and denied states with retry;
      fix the confirmed Personnel failed-read/false-empty presentation in its owned view.
- [x] Keep the shared sidebar/routes initially; make role-specific labels or
      ordering only through a bounded role-aware adapter with other-role checks.

**Exit:** totals reconcile to current scope on a populated isolated fixture;
shortcuts work, failures do not assert zero, and both themes/phone widths fit.
This phase does not depend on deciding the Agent submission policy.

### Phase 2 — Agent network and enrollment follow-up

- [x] Server-scoped totals/search/sort/paging cover more than 500 Agents and 100 batches.
- [x] Agent detail separates account activity, missing/inactive profile and enrollment outcomes.
- [x] Request filters/detail/return and browser Back/Forward preserve meaningful context.
- [x] Pioneer reads only authorized minimal fields and existing review outcomes; inaccessible application actions are omitted.
- [x] Counts, identity, readiness and actions remain readable on desktop/phone with keyboard and touch access.

Implementation is integrated into the separate Phase4 candidate. Human review
remains pending. Optional density/pinning controls were not introduced.

### Phase 3 — Coaching tasks and own reporting

- [x] Work list comes first; assignment opens deliberately with visible focus.
- [x] My tasks and Agent team use distinct scoped reads and clear labels.
- [x] Reports, authorized evidence, retained drafts, explicit version recovery and idempotent assignments use the existing task model.
- [x] Approved policy: Agent starts/submits only its own assigned task. Authorized Pioneer/Coordinator completes eligible submitted work.
- [x] Late submissions require human KPI review before completion; private evaluation contents remain hidden.
- [x] Pioneer's own report reaches its authorized Coordinator.

The [Phase3 plan](pioneer-agent-phase3-plan.md) retains the earlier staged
proposal and implementation notes. A structured coaching/HR log is outside
this task-model implementation; it needs its own fields and access decision.

### Phase 4 — Integration checks and hands-on acceptance

[Detailed plan and outcome](pioneer-agent-phase4-plan.md) ·
[Combined manual walkthrough](pioneer-agent-phase4-manual-test.md).

- [x] Separate synthetic databases and private files preserve retained Finance progress.
- [x] Combined API/database workflows, current-team authorization, totals, exact IDs, evidence, role denials, retries and once-only saves pass.
- [x] Meaningful query plans, API types/build, scoped formatting, client credential scan, web tests and optimized build pass.
- [x] Chromium/Firefox/WebKit core views, both themes, keyboard/focus, normal/reduced motion, narrow/short screens, actual Chromium zoom and enlarged text are checked.
- [x] Finance, Handler, Agent and Coordinator task-workspace smokes pass.
- [x] Source-only integration patch round-trips exactly and checks against main-run without applying it.
- [x] Isolated combined preview and reproducible role walkthrough are available.
- [ ] Jaycee/client visual and business acceptance.
- [ ] Human screen-reader acceptance and any required corrections.

Technical evidence is saved under `.local/pioneer-phase4-20261125/`, including
87 isolated API/database, 145 API unit and 252 web checks, 60 browser captures
and eight axe scans with zero violations. The optimized build has72 pages.
Original pending main source and ten protected Finance tables are unchanged.
These results do not establish physical-device or user acceptance. No commit,
push, merge or deployment was performed.

Preview: <http://127.0.0.4:3004/login> → **Preview a workspace → Pioneer agent**.
Use the exact hostname to keep this session separate from other local previews.

## Phase 1 implementation — 2026-11-25

Two independent Pioneer-only reads now back the daily overview:
`GET /pioneer/overview/team` requires `AGENT_NETWORK_READ`, and
`GET /pioneer/overview/tasks` requires `TASK_READ`. The service rechecks the
current active role/permission inside a repeatable-read transaction. No grant,
write workflow, schema or index change. Unknown query filters are rejected.

| Figure                                                | Meaning                                                                                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Assigned Agents                                       | All currently assigned active AGENT accounts; independent of linked profile state and the old500-row list cap.                                                                                               |
| Active profile / no linked profile / inactive profile | Disjoint linked-profile states within those accounts. Profile activity does not establish training, performance or commission eligibility.                                                                   |
| Enrollment counts                                     | All-time request counts submitted by the current active Agent team, using the same shared scope as enrollment lists/review. Current reassignment changes visibility; these are requests, not unique members. |
| Own / Agent team task totals                          | Full scoped counts by TODO, IN_PROGRESS, SUBMITTED and DONE; current active direct Agent team is separate from own assignments.                                                                              |
| Outstanding                                           | TODO + IN_PROGRESS + SUBMITTED. Submitted work still awaits eligible completion.                                                                                                                             |
| Overdue to submit                                     | TODO or IN_PROGRESS with deadline strictly before the server snapshot time. Excludes submitted/completed work and is not a formal KPI judgment.                                                              |
| Agent preview / recent tasks                          | Four deterministically ordered Agent identities and the existing recent-task page; neither supplies a total.                                                                                                 |

The corrected featured/asymmetric composition, existing palette, typography,
controls and routes are retained. Added compact profile totals within the Agent
panel and two task-summary columns within the existing task panel; tabular
numerals and wrapping labels adapt to narrow widths. Loading/error/stale/denied
reads retain independent recovery. Current Agent submission policy is unchanged.

Implementation: [overview service](../apps/api-ts/src/records/pioneer-overview.service.ts),
[controller](../apps/api-ts/src/records/pioneer-overview.controller.ts),
[shared request scope](../apps/api-ts/src/records/enrollment-scope.ts),
[contracts](../packages/contracts/src/pioneer-overview.ts),
[task summary](../apps/web/app/system/_role-designs/pioneer_agent/app/system/pioneer-dashboard/PioneerTaskSummary.tsx).
Evidence: `.local/pioneer-phase1-20261125/`. Integration checks use a new isolated
Pioneer database, preserving the retained Finance acceptance sandbox and accounts.
The technical checks above pass; human acceptance is pending.

## Open decisions and next action

1. **Acceptance:** use the combined manual walkthrough and record Jaycee/client
   feedback on the actual visual and business flow, plus human screen-reader
   review. The candidate remains local and unapplied to main-run.
2. **Structured coaching:** existing task reports are implemented. A separate
   training/performance log needs fields, visibility and retention decisions;
   confidential HR onboarding is not reused.
3. **Metrics:** targets, quotas, commission eligibility and monetary reporting
   remain outside this implementation.

## Final technical closeout — 2026-11-25

The final Phase3 normalization delta is integrated and verified in build`UcHOM2aexrAJp2sFO9i5t`. All four phases’ coding/technical integration is complete; no pending source reconciliation. Final252 web tests,72-page build and real lost-response retry→Agent PDF/report→Pioneer completion pass. Human visual/business and screen-reader acceptance remain open. No publication.
