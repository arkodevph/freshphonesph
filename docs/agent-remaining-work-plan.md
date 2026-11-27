# Agent — current findings, phased plan and design notebook

**Review refreshed 2026-11-26 after local merge `bd6b262`.**
Parents are 51c6e79 (completed Pioneer/login publication) and 5f6e0ae
(HR/personnel and role workspaces). Active source is
`/home/jaycee/Projects/freshphonesph-agent-role`, branch
`feature/agent-role-review`. Main-run retains its earlier pending work separately;
do not treat that recovery checkout as this merged Agent baseline.

Jaycee selected access → review → phase plan, then authorized integrating the
newer branch before continuing with Agent. The merge and refreshed review are
complete. **The Phase 2 incomplete part is now integrated and technically
verified, 2026-11-26. All four implementation phases pass technical verification.
Named-user business and screen-reader acceptance remain unrecorded.**
[Current access](agent-role-and-access.md) remains nine existing grants.

## What the incoming work already supplies

- A real Agent enrollment desk: assigned received applications, enrollment
  handoffs, profile/supervisor, assigned-batch preview and withdrawal follow-up.
  The previous generic payment home/empty Quick access finding is superseded.
- A list-first request workspace with a separate enrollment drawer. Request and
  batch-choice errors are independent; a choices failure retains healthy requests.
- Application draft preservation on background version changes and 409. Agent
  sees a stale notice and must explicitly discard/reload before acting.
- A richer own-task drawer/activity view and terminal cancelled-task behavior.
  Agent's own start/report/evidence path remains implemented; no new grant needed.

The merge retained Pioneer own/team tasks, scoped reads, assignment idempotency,
own-Agent submission, Finance boundaries and the completed nine-pet login. Task
filtering and overview totals include cancelled records without treating them as
outstanding/overdue. Existing inactive Agent assignments can be retained, while
new inactive selections remain denied. Incoming report/catalog visuals were
kept in role-owned copies to preserve the existing isolation contract.

## Current findings

| ID  | Current evidence                                                                                                                                                                                      | Proposed response                                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | **Implemented in Phase 1:** desk/network use full scoped totals and server search/paging, with explicit missing/inactive profile states. Own open tasks use scoped TODO + IN_PROGRESS counts.         | Verified against the final optimized build; see the Phase 1 record below.                                                                                      |
| A2  | **Phase 2 implemented:** assigned received intake has reason + explicit close confirmation, retaining original evidence and server version/scope checks.                                              | Verified against the final compiled build; retain these safeguards.                                                                                            |
| A3  | **Phase 2 implemented:** stale/409 retains drafts and blocks actions without claiming an active write; pending labels describe the actual operation.                                                  | Verified against the final compiled build; retain these safeguards.                                                                                            |
| A4  | **Phase 2 implemented:** uncertain manual sends freeze exact body/submissionId/key, lock edits and require an original retry before a different attempt. Saved references link to own exact requests. | Verified against the final compiled build; retain these safeguards.                                                                                            |
| A5  | **Phase 2 implemented:** application detail, choices and request-list reads fail independently; unknown/loading/failed reads are distinct from empty, and denied private snapshots clear.             | Verified against the final compiled build; retain these safeguards.                                                                                            |
| A6  | **Phase 2 implemented:** recognized request/application status/page/search/selection use URL state. Exact request reads do not erase list filters; return links retain context.                       | Verified against the final compiled build; retain these safeguards.                                                                                            |
| A7 | **Phase 3 implemented:** replacement-link availability now uses actual enrollment scope. Reassignment can retain case access while the prior Agent’s enrollment stays unavailable. | Nine isolated withdrawal cases pass, including reassignment and COO/Manager visibility; no request access expansion. |
| A8 | **Phase 4 implemented:** Agent own-task wording/recovery and conditional shell label now match its powers; both notification feeds expose exact current-access destinations. | Combined compiled checks pass; human acceptance remains unrecorded. |

These findings supersede the original 51c6e79-only report. The missing close
control and misleading stale button label were corrected in Phase 2. Source, API and browser evidence now cover A1–A7; A8’s task/shell
review is now implemented and verified in Phase 4.
Independent choices failure now works and must not be listed as still wholly
broken. No new Agent permissions or business policy are proposed.

## Goal and flow

Agent should identify work needing attention, review assigned membership intake,
submit a correct request, follow Manager/COO outcomes and report its own tasks.
Keep identity, assignment, version, status and the available next action together.
Actual Agent task frequency, device mix and usability outcomes remain unmeasured.

| Stage                    | Needed action                                                     | Success and recovery                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Start work               | Check assignment readiness and own queues                         | Complete scoped counts; partial failures remain distinct from zero.                                                                     |
| Review intake            | Read original answers; correct contact; forward or close          | Original evidence is immutable; stale edits survive until explicit reconciliation.                                                      |
| Submit/follow enrollment | Choose new/existing member and assigned batch; inspect outcome    | One reconciled attempt, persistent request reference and restored filters. Submission does not reserve a position or create membership. |
| Review withdrawal        | Add Agent context and forward to COO; follow eligible replacement | Dues continue until approved handover; refund, withdrawal decision and payout are separate.                                             |
| Report own work          | Start task and submit report/evidence                             | Own-assignee scope, retained draft, explicit result and terminal cancellation.                                                          |

## Revised phases

### Phase 1 — Complete the existing Agent desk and assigned-batch facts

Preserve the incoming enrollment-desk composition. Replace capped list lengths
with authoritative scoped totals and server paging/search. Explain missing or
inactive profile and no usable batch without blocking unrelated own tasks or
security. Add useful own-task summary using authorized reads if needed; do not
invent income, commissions, targets or capacity percentages. Remove the Agent
eyebrow and use current loading/error/refresh states.

Reuse `/agent-network/agents` and `/agent-network/batches`; the Pioneer-only
overview remains Pioneer-only. A dedicated Agent aggregate is justified only
where existing reads cannot provide required facts. No new grants are needed.

**Exit:** more than 100 assigned batches remain findable, counts reconcile with
the full dataset, readiness and partial failures are truthful, other Agents'
records remain denied, and both themes/phone layouts retain the desk hierarchy.

### Phase 2 — Finish application actions and enrollment recovery

Add the existing close-with-reason action for received assigned intake. Keep
forwarding, closing and Manager approval distinct. Separate stale from pending
mutation, preserve drafts on 409/refresh, and clear inaccessible private records
when current scope/session is lost. Reconcile ambiguous sends before edited
resubmission, show the saved request reference, distinguish failed/empty/loading
lists and retain filter/page/detail context.

**Exit:** new/existing member intake, forward/close, identical retry, uncertain
outcome, changed attempt, Manager approval/rejection, stale edits and assignment
loss pass in an isolated database and browser. No form publishing, reassignment,
self-approval, capacity reservation or cross-Agent access is added.

### Phase 3 — Withdrawal and replacement follow-up

Refine Agent queues and role-correct copy around the existing handoff. Keep case
facts, review notes and consequences beside the action. Verify both replacement
modes, stale policy/versions, retained drafts, null-versus-zero refund facts and
reassignment-sensitive links. Preserve Manager approval/atomic handover and
Finance-only payment/payout boundaries.

**Exit:** Agent → COO → eligible replacement → Manager outcome works without
stopping dues early, transferring verified credit or exposing unrelated requests.

### Phase 4 — Own tasks, notices and combined acceptance

Retain the incoming task drawer and own submission/activity behavior. Refine
Agent wording, evidence names and conflict/retry states; no assignment/edit/
cancel/completion/KPI powers are added to Agent. Verify notices open the exact
authorized intake/request/withdrawal/task and handle unavailable records.

Run combined intake/enrollment, withdrawal/replacement and Pioneer assignment →
Agent submission → authorized completion flows. Each phase gets relevant checks;
this phase consolidates cross-browser, keyboard, enlarged-text, reduced-motion,
assistive-technology and named-user business acceptance. Freeze source once for
the final build, preserving the saved Freshphones build-workflow lesson.

## Design direction and evidence

ROSS diary/shared standards and current Freshphones/Pioneer/Finance references
were read before design work. `user-expi` supplies the flow/recovery constraints;
`ui-design-index` routes to dashboards/design systems. Its referenced category
skill is not installed; the explicit fallback is inspected project patterns and
primary sources, not an invented gallery reference.

Keep three patterns: the current enrollment desk, identity-first scoped lists,
and details with instructions/actions beside relevant properties. Preserve the
current staff shell, role tokens and controls. Use clear headings, relative text,
consistent icon slots, tabular counts, full accessible identities/filenames and
readable dark-surface depth. No ornamental charts, eyebrow labels or decorative
numbers. New palette authoring follows OKLCH with measured contrast. Relevant
motion uses existing springs/0.97 feedback and a reduced-motion path.

Phones retain identity/status/next action together. Controls reflow; meaningful
wide tables stay contained. Batch columns are identity/model/status/current
member-position count, with identity left-aligned and counts right-aligned.
No spare-capacity or commission inference. Reuse native semantic tables and
existing controls; final density/sort fields must be recorded and verified.

| Evidence                                                                                                                                                                               | Limit and implication                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Cowan (2001) publisher abstract](https://www.cambridge.org/core/journals/behavioral-and-brain-sciences/article/magical-number-4-in-shortterm-memory/44023F1147D4A1D44BDC0AD226838496) | Strong memory synthesis, analogy-only for this workflow. Keep task context visible; it does not prescribe a card/menu count. Test actual context recovery.                    |
| [Scheibehenne (2010) institutional abstract](https://edoc.unibas.ch/entities/publication/1cd7cefa-8ab9-4be8-9a0f-5412feb5350d)                                                         | Consumer-choice synthesis finds context-dependent effects rather than universal option overload. Keep useful routes discoverable and test findability.                        |
| [W3C status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)                                                                                                | Accessibility guidance supports programmatic save/search/retry feedback. Validate semantics and actual assistive technology; false Forwarding text is not a successful write. |
| [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)                                                                                                                  | Check 320 CSS pixels/enlarged text. A table exception does not exempt surrounding actions or individual cell text.                                                            |

## Verification and actual visuals

Combined merge validation: 260 web tests, 145 API units and 177 distinct database/API
scenarios, with targeted reruns after fixes. Types, API compilation, optimized
web build, client-secret scan, scoped formatting and whitespace pass. Tests
use disposable databases; no retained preview database was migrated or populated.

Browser fixtures intercept every API read/write and use synthetic data; they
check presentation/recovery, not real-session login or human acceptance.
Current development and final optimized results, build logs, preservation hashes,
guard review and scoped test results are in `../.local/hr-agent-merge-20261126/`.

- [Current Agent desk, 1440px](../.local/hr-agent-merge-20261126/current-agent-home-1440.png).
- [Current Agent phone, 393px](../.local/hr-agent-merge-20261126/current-agent-home-393.png).
- [Preserved correction after version change](../.local/hr-agent-merge-20261126/current-agent-preserved-draft.png).
- [Independent choices failure](../.local/hr-agent-merge-20261126/current-agent-choice-error-independent.png).
- [Own-task drawer](../.local/hr-agent-merge-20261126/current-agent-task-drawer.png).

The old 51c6e79 review/captures remain in
`../.local/agent-role-audit-20261126/` as historical evidence: generic home is
superseded, draft loss is repaired, and choices/request coupling is repaired.
The old changed-payload409 is superseded by the new uncertain-outcome concern.
Business/screen-reader acceptance, production-scale performance, push and
deployment are not established by these checks. This section records merge-time verification before Phase 1; the implementation
record below supersedes its earlier review-only status.

## Next action

The one-file Phase 2 visual follow-up is integrated and verified. All four
implementation phases are technically complete. Next: run the26-case
[human acceptance walkthrough](agent-quality-test-manual.md) and record actual
outcomes in the [results sheet](agent-quality-test-results.csv). Human business/
screen-reader approval remains unrecorded. New permissions, commission/
payroll, CRM automation and external messaging remain separate scope.

## Phase 1 implementation decisions — 2026-11-26

Authorized after the refreshed plan. Keep the existing desk, profile rail and
identity-first lists. Use existing scoped paginated network endpoints, own task
status reads and existing Agent controls; add no library or permission.
Search/sort apply on the server before 20-row paging; browser history restores
recognized filters only. Missing/inactive profile is explicit; unrelated own
tasks/security stay available. Loading/failed reads are unknown, not zero.

Existing behavioral evidence/limits above still apply: visible task context
(Cowan, analogy-only) and no assumed universal option-overload threshold
(Scheibehenne, corrective finding). This phase tests findability/recovery rather
than claiming a measured usability gain. Agent frequency/device mix is unknown.
Use semantic headers/row identity, readable wrapped models, right-aligned tabular
counts, existing role colors, 16px panels and relative text. Phone rows retain
identity/model/status/count together; surrounding controls reflow. No new motion
needed; reused controls retain reduced-motion support.

Compared [TanStack server pagination](https://tanstack.com/table/v8/docs/guide/pagination)
and its open-source examples with current repository primitives. Its manual
pagination pattern fits the existing API, but importing a table library adds no
needed behavior for four columns. Adapt the pattern with the current table and
pagination controls. [W3C table guidance](https://www.w3.org/WAI/tutorials/tables/one-header/)
supports explicit column/row headers. Next 16.2.9's installed native-history guide
confirms pushState/useSearchParams integration; the route uses Suspense.

Acceptance: an Agent with 105 assigned batches can find the last batch, read
authoritative totals, page/sort and restore filters; missing/inactive profiles
and independent failed/denied reads stay truthful. Own TODO + IN_PROGRESS counts
exclude terminal/submitted records. Other Agent/Pioneer-only reads stay denied.
Check both themes, 320/393/1440 widths, keyboard, enlarged text and accessible
semantics, plus focused real API scope tests and final optimized build.

### Phase 1 implemented behavior and source

The desk keeps its incoming composition and uses independent profile, batch,
application, request, withdrawal and own-task reads. Full batch totals replace
the capped legacy response; preview rows explicitly say 3 of the total. Profile
readiness distinguishes unknown, missing, inactive and active linked profile
without promising a usable enrollment slot. Open tasks count TODO and
IN_PROGRESS only. Read failures show unknown counts and independent retries.

The batch route now uses recognized URL page/q/sort filters, server search and
sorting before 20-row paging, deterministic ordering and full totals. Unknown
URL keys never become scope overrides; invalid recognized values show an
explained default view with reset. Search/page/sort survive Back and reload.
Rows retain batch identity, model, status and current memberships; counts align
right. Phone rows span identity/model across the width and keep status/count
together. Request summary links stack consistently on phones. Role-wide table
styles initially overrode cell padding/width; scoped selectors now preserve
these row rules without changing any other role's styling.

The Agent resource hook associates loading/error/data with their request path,
ignores obsolete responses, and clears snapshots on 401/403/404. A denied read
cannot briefly reveal the previous rows when retried. Healthy independent
panels survive a failed read. Existing native buttons use 0.97 press feedback
when motion is allowed; reduced motion keeps their states without scaling.
Shared shell branding and other roles remain outside this slice.

Changed source:

- Agent desk: `agent-dashboard/AgentDashboard.tsx`, `useAgentDesk.ts`,
  `AgentDeskQueues.tsx`, `AgentDeskRail.tsx`, `AgentProfileCard.tsx`,
  `AgentReadFailure.tsx` and its existing CSS module.
- Agent network: `agent-network/page.tsx`, `AgentBatchWorkspace.tsx`,
  `AgentBatchTable.tsx`, `useAgentBatches.ts`, `batch-query.ts` and its CSS module.
- `apps/web/lib/useAgentResource.ts` and Agent file ownership in the role manifest.
- Meaningful URL-boundary web tests and Agent-specific cases in the existing
  real-database network suite. Production API/schema/grants are unchanged.

Phase 1 verification: **262 web tests**, **17 network/API integration cases**
(including the two new Agent scenarios), final role-isolation recheck, web/API
types, scoped formatting and client-secret scan pass. The isolated test database
is removed. Development browser checks cover 10 groups, 17 captures, both
themes/320–1440px, 200% text, keyboard feedback, stale search responses,
profile/task independence, denied snapshot clearing, retry and two scoped axe
scans with zero violations. Exact evidence is in
`../.local/agent-phase1-20261126/`. The final optimized build **AsBcaTTDRQYUtDA2TzjHs**
and the same 10 compiled browser groups/17 captures/two axe scans pass. Two
additional compiled 320/393px row crops confirm full-width identity and visible
status/count/paging. All 17 captured application/test source hashes still match
the build. Original pending/private files, publication checkout and 17 installed
hooks are preserved. Production API/schema/grants are unchanged. Temporary
previews are stopped; the build remains available for a later local walkthrough.
Browser fixtures use synthetic intercepted APIs, not a real login. Human
business/screen-reader acceptance remains unrecorded. Source is uncommitted;
no push/deployment.

Actual Phase 1 visuals:

- [Compiled Agent desk, 1440px](../.local/agent-phase1-20261126/desk-1440.png).
- [Compiled Agent desk, 393px dark](../.local/agent-phase1-20261126/desk-393.png).
- [Compiled batches, 1440px light](../.local/agent-phase1-20261126/batches-verified-1440-light.png).
- [Compiled batches, 393px dark](../.local/agent-phase1-20261126/batches-verified-393-dark.png).
- [Full batch row and controls, 320px](../.local/agent-phase1-20261126/phone-batch-content-320.png).
- [Independent read failures](../.local/agent-phase1-20261126/independent-profile-task-failures.png).

## Phase 2 decisions — 2026-11-26

Jaycee continued after Phase 1. Keep the list-first workspace, existing drawer
and original-answers detail. Close is an explicit secondary action with a
reason and confirmation, limited to received assigned intake; preserve evidence
and distinguish it from membership rejection. Stale blocks actions without
claiming a running write. An uncertain write freezes the original command and
requires an explicit identical retry or latest-record reconciliation before
editing; do not silently rotate its identity. Drafts stay in component memory
with departure warnings; no contact data is added to persistent browser storage.

[Stripe RequestSender source](https://github.com/stripe/stripe-node/blob/master/src/RequestSender.ts)
and [mutation guidance](https://github.com/TanStack/query/blob/main/docs/framework/react/guides/mutations.md)
were compared: fixed command identity and serial explicit retries fit existing
submissionId replay. Importing a payment SDK/query runtime adds no needed
business behavior. Adapt the frozen-command pattern to current API primitives,
without adding an offline queue. Existing Cowan/context and corrective
choice-overload evidence remains bounded as above; visible state/confirmation
feedback follows W3C status guidance. No measured usability gain is claimed.

Reuse role colors, controls, semantic lists/tables and native spring dialogs.
Keep failed reads distinct from empty; selection/filter/page live in recognized
URL values, with separate exact-request reads. Preserve phone reflow, clear
reference/status and retry feedback; no new visual direction/library/grant.
Verify actual response-loss replay, close/conflict/access loss, new/existing
member requests and Manager outcomes in isolated API tests and compiled browser.

### Phase 2 implementation and verification record

Implemented in the same merged checkout with all sixteen Phase 1 application/
test files outside the extended manifest byte-preserved. No production API,
schema or grant change. Added an Agent-specific detail hook so choices do not
suppress original evidence or close actions. Stale and operation state are
separate; only a running forward says Forwarding, only close says Closing.
Unknown mutations freeze their command; explicit original retry or confirmed
latest-record reload reconciles before editing. 401/403/404 clears originals.

Received assigned applications expose close with a trimmed reason and visible
confirmation. Closing retains the original form revision/answers/contact, ends
forwarding and does not reject an enrollment request or alter membership.
Manual enrollment uses a frozen normalized payload, submission reference and
HTTP key after unknown outcome. A known validation rejection permits correction
as a new deliberate attempt. Pending writes are serialized. After response
loss, an identical explicit retry returns the existing result. A kept attempt
is visible on the list with a resume action; it survives closing/reopening the
drawer while the workspace stays mounted. Saved receipts remain linked to an
exact own request and distinguish the response's status from later review.

Drafts and frozen contact payloads stay in component memory. Ordinary link and
document departure warn; there is no durable/offline draft queue or promise of
recovery after reload, crash, forced departure or component unmount. Permission
loss clears displayed private details/contacts and retained command payload.
Do not treat a server error as proof that no request was saved. Request and
application views restore recognized URL values only; exact detail reads are
separate from request list page/status. No client query adds scope privileges.

The own request detail uses existing native modal controls with scoped header/
body/footer spacing and focus return. Phone forms retain relative text, full
references, grouped contact/batch fields, clear close consequences and actions.
The first visual check caught missing dialog insets and a loading fallback
capture; corrected both, then waited for actual form headings/close controls
before narrow screenshots and axe. Existing colors/shell/table styles remain.

Source: `AgentEnrollmentRequests.tsx`, own `AgentRequestList.tsx` /
`AgentRequestDetail.tsx`, submission view/hook/frozen-attempt helpers, recognized
enrollment-location helpers, draft guard, own application detail/hook/close form,
forward form and local CSS; Agent-owned manifest includes the added files.
The shared detail hook and every other role remain unchanged.

Final verification: **265 web tests**, **22 isolated public-enrollment API
cases**, six focused recovery/isolation rechecks, API types, scoped formatting
and the credential scan pass. The first standalone web typecheck was stopped
to avoid overlapping compilation; an interrupted build and an undeclared direct
`zod` import failure were not counted as passing checks. Replaced that import
with existing contract validators, refroze only the parser change and reran the
focused tests. Seventeen focused web type entrypoints now have zero diagnostics.
The final optimized build **2hbtiOUpo12qjnU-mzPmh** passes its full typecheck and
71-page generation. All 36 pending application/test source hashes match it.

The final compiled browser pass covers **14 workflow groups**, **10 captures**
plus a close-confirmation crop and **four scoped axe scans**, all with zero
violations/page errors/unhandled API paths. Includes focus return, exact request
selection, filter/page restoration, failed/empty/loading distinction, lost
manual and forward responses, original retries, saved reference, definite
validation correction, existing member with blank saved phone, independent
choices error/loading, close confirmation, stale/409 draft retention, assignment
loss and unavailable request links. The browser intercepted nine synthetic
writes; the real authenticated API tests used only a disposable database.

That database and temporary previews are removed/stopped. Original workspaces,
private files, sixteen Phase 1 application/test files and all seventeen hooks
are preserved. Next-generated type-directory additions were selectively
removed, restoring the original config. No production API/schema/grant change,
commit/push/deployment. Human business/screen-reader acceptance and actual UI
login remain unrecorded. Evidence: `../.local/agent-phase2-20261126/phase2-result.json`.

Actual compiled visuals:

- [Original retry after response loss](../.local/agent-phase2-20261126/uncertain-enrollment.png).
- [Saved reference and own request detail](../.local/agent-phase2-20261126/saved-request-reference.png).
- [Close with reason and confirmation](../.local/agent-phase2-20261126/close-confirmation-content.png).
- [Preserved stale correction](../.local/agent-phase2-20261126/preserved-stale-application.png).
- [Application on a phone, 393px dark](../.local/agent-phase2-20261126/application-393-dark.png).

## Phase 3 decisions — 2026-11-26

Jaycee continued after Phase 2 technical closeout. Reconcile the inspected
12-file parallel Phase 2 hardening slice before final combined validation;
preserve this checkout's contract-based parser and all Phase 1 desk/network
files. Parallel results are supporting evidence, not compiled acceptance of
this integrated candidate.

Keep the current case/financial-history composition and existing tokens. Agent
reviews/forwards to COO and proposes replacements under recorded terms; no
COO/refund/payout editor is rendered in Agent-owned flows. Read-only financial
facts distinguish undecided refund from zero remaining after recorded payment.
Both replacement modes remain server-owned policy, with explicit pending/changed-policy/preview-error
states. Dues stop only after approved handover. Submission is never capacity
reservation or transfer of verified payments.

Use an Agent-owned read/mutation hook: independent list/detail errors, frozen
uncertain commands, stale draft preservation, current-scope clearing and explicit
latest-record reconciliation. Search/status/page/selection restore through URL
state. Reuse the Phase 2 command pattern and current ActionForm/details rather
than introducing a data/mutation library. W3C status/reflow guidance and the
bounded context/choice evidence above remain applicable. Existing role styles,
readable wrapped notes and adjacent consequences/actions define the visual
patterns; no new theme, chart or business policy. Verify 320/393/1440, both
themes, keyboard, enlarged text, stale/retry/denial and current authorization.

Fix replacement-link availability against the actual enrollment read scope,
with an isolated reassignment regression. Preserve request ownership rather
than broadening access when the current batch Agent changes. Test Agent → COO →
replacement → Manager in both modes, stale payment/policy blockers and Finance
payout boundaries using disposable databases. Final build/browser must cover
the reconciled Phase 2 source together with this slice.

### Phase 3 implementation and verification record

Implemented Agent-owned withdrawal list/detail state, recognized URL page/search/
status/selection, independent reads and explicit unavailable states. Review notes
forward to COO; proposals use recorded COO terms and assigned Manager approval.
COO decision/refund and Finance payout editors are absent. Financial context
remains read-only, with undecided distinct from zero remaining after recorded
payment. No financial rule, schema, grant or other-role view change.

Stale versions retain drafts and disable actions without false pending labels.
An unknown result keeps the original version/body/HTTP key, locks edits and
requires explicit unchanged retry or confirmed latest-record reconciliation.
Replacement submissionId replay preserves one proposal. No durable/offline draft
queue was added; contacts/commands remain in component memory with ordinary
link/document departure warnings. Access/session loss clears private details
and invalidates late results. Preview errors/changed policy remain distinct
from usable terms. Manager handover, continuing dues, immutable prior receipts
and Finance-only external payouts retain existing server behavior.

Replacement-link availability now checks the actual existing enrollment scope.
After reassignment, the new Agent can retain withdrawal access while the old
Agent’s enrollment request stays unavailable. The UI explains that state and
offers the COO/Manager follow-up path; request ownership was not expanded.

Reconciled the inspected 12-file parallel Phase 2 access-loss/frozen-command
hardening into this checkout, preserving the contract-based URL parser and all
Phase 1 desk/network source. Its earlier results were not attributed to this
candidate; the combined source is reverified below. The separate parallel
checkout and its historical evidence remain intact.

Final validation: **269 web tests**, **nine isolated withdrawal API cases** and
**22 isolated enrollment API cases** pass. Withdrawal cases cover Agent → COO →
Manager handover in both modes, stale policy/payment blockers, concurrent payout
limits, reassignment-sensitive reads and full refund payment with zero remaining
while dues continue. API types, scoped formatting, whitespace and the 1,933-file
credential scan pass. Initial test assumptions about a zero approved refund and
HTTP 201 were corrected to the existing positive-amount/HTTP 200 contract;
production policy was preserved. All disposable test databases were removed.

Optimized build **ol2-4vdL2UpEM-8jKY6fy** passes full types and 71-page generation. All **50
application/test source hashes** match the artifact. Compiled synthetic browser
checks pass **38 workflow groups**: 12 withdrawal, 16 enrollment and 10 desk/batch.
The checks include original-command retries, stale drafts, session-loss/delayed
save, denied enrollment contacts/references, late lookup, both replacement modes,
URL return/reload, keyboard/reduced-motion feedback and independent errors.
They record **38 screenshots plus three replacement-form crops and one closure
crop**, both themes, 320/393/1440px and enlarged text. **Eight scoped axe scans**
have zero violations; page errors/unhandled API paths are zero. Visual inspection
of compiled phone/form captures confirms readable fields and full action labels.
The first added session-loss assertion incorrectly expected an unavailable case
instead of the existing sign-in redirect; corrected only the fixture, then
reran all three suites against the same build.

Original pending/private work (47 captured paths), publication checkout, fifteen
Phase 1 desk/network/test files and seventeen hooks remain preserved. Generated
type-directory entries were selectively removed, restoring the original config.
Own temporary previews are stopped. Source is uncommitted; no push/deployment.
Fixtures intercept synthetic APIs; actual UI login, human business and
screen-reader acceptance remain unrecorded. Exact evidence:
`../.local/agent-phase3-20261126/phase3-result.json`.

Actual compiled visuals:

- [Withdrawal follow-up, 1440px light](../.local/agent-phase3-20261126/withdrawal-1440-light.png).
- [Withdrawal follow-up, 393px dark](../.local/agent-phase3-20261126/withdrawal-393-dark.png).
- [Replacement form, 320px](../.local/agent-phase3-20261126/replacement-form-320.png).
- [Reassignment and unavailable enrollment](../.local/agent-phase3-20261126/reassigned-enrollment-unavailable.png).
- [Preserved stale review note](../.local/agent-phase3-20261126/stale-note.png).

## Phase 4 decisions — 2026-11-26

Jaycee explicitly authorized Phase 4. Behavioral flow: identify an own task →
read its instructions/version/deadline → start or submit report/evidence →
confirm the saved submission → follow authorized completion. Recover from a
changed task without losing the report/file; an unknown write freezes its
original command and requires explicit unchanged retry or latest-record check.
Existing version checks reconcile task submissions; no new idempotency or
assignment/completion/KPI policy is introduced. Task status/page/selection use
recognized URL state; denial clears private snapshots and drafts. Read failures
stay distinct from empty assignment. Selected evidence retains its full filename
and extension, with wrapping/full-name access rather than edge truncation.

The current Agent page renders a COO/team task composition. Replace its entry
with an own-task list and retain the native task drawer, instructions/properties,
report/evidence and activity patterns. Use existing role tokens, sentence case,
relative text, grouped facts/action and no eyebrows. Labels describe actual
pending operations. Identity/status/action stay together on phones; long names
wrap; controls retain 44px targets and existing 0.97/reduced-motion feedback.

Notification inspection found two existing authorized feeds: `/staff/alerts`
contains current task reminders/enrollment outcomes; `/notifications` carries
received application/withdrawal updates. Agent's current page only shows the
first. Expose both with clearly labeled views, independent recognized page/
unread context and exact approved route shapes. Preserve server ownership checks;
unknown/unavailable links explain the next step. Opening a stale assignment
must reach the existing unavailable detail state, never confer access. No new
notification channel, permission, schema or cross-role UI change.

The existing evidence ledger still applies: Cowan is analogy-only for retaining
context; Scheibehenne is a corrective finding against removing useful choices
on a universal option-overload claim. [W3C modal guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
supports explicit initial/return focus, keyboard containment and a logical
fallback when the original row disappears. [Status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
supports announced success/error/uncertain states without false busy messages.
Compared [Radix's open dialog source](https://github.com/radix-ui/primitives/blob/main/packages/react/dialog/src/dialog.tsx)
(trigger reference/focus restoration) with the installed native spring-dialog
primitive. Keep the current primitive and adapt a logical trigger/heading fallback;
no new library. UI design route remains dashboard/design systems; its category
skill is absent, so use the inspected project primitives. These sources establish
constraints, not measured Agent usability. Device frequency and human outcomes
remain unknown.

Validation: own report/file, exact retry/409, changed/cancelled/transferred task,
access/session loss and late responses; both notification feeds/deep links;
Pioneer assignment → Agent submission → authorized completion, intake/enrollment
and both replacement modes in disposable API databases. Freeze combined source
once for production build and compiled browser checks across available engines,
320/393/1440, both themes, keyboard, enlarged text and reduced motion. Prepare
an honest manual acceptance checklist/results sheet; named-user business and
human screen-reader acceptance require actual human results and remain separate.

Phase 4 shared-shell boundary: a conditional Agent-only navigation label changes
Tasks & KPI to My tasks. Agent’s header uses a normal route context label and
removes its generic eyebrow; other role branches and navigation definitions
stay unchanged. This is a narrow presentation condition, not a new role grant.

Phase 4 review correction: a request-sequence guard now prevents an obsolete task
read from ending a newer selection’s loading state. The first owned build was
stopped before acceptance; only this hook delta was refrozen, with a rapid-
selection browser regression. Development passed sixteen workflow groups, but
the last narrow notification capture timed out; it is not final acceptance.
The compiled checks must complete against the exact frozen candidate. Native
file styling also hid the initial picker; the final form has a visible keyboard
button, full filename and an explicit scrollable action area. Local WebKit uses
the already-installed Finance/Pioneer dependency directory; no system package or
product dependency changed.

### Phase 4 implementation and combined verification record

Agent tasks now use an own-assignee list and the existing native drawer with
instructions, properties, report/evidence and independent activity. The view
contains no assignment/edit/cancel/completion/formal-KPI controls. Start retains
an already drafted report/file. Stale versions retain both until explicit reload;
unknown writes freeze the original multipart payload/version and lock editing.
An unchanged retry uses existing server version checks; a conflict leads to an
explicit latest-record check. Cancellation is terminal; denial/session loss
clears private drafts and ignores late responses. A sequence guard prevents an
obsolete read from ending the newer task selection’s loading state. File types/
5 MB limits, visible keyboard picker, full filename/extension, authorized download
and operation-specific labels are verified. No durable/offline draft queue.

Notifications now expose both existing feeds: current task/enrollment notices and
received application/withdrawal updates. Recognized URL view/type/page/unread
context survives navigation/reload. Exact shortcut shapes lead to current scoped
details; unsupported destinations explain follow-up. Denied receipt actions clear
private rows until an authorized reload. Received events are historical and never
grant record access. Agent-only shell labels remove the misleading KPI/team
wording and generic eyebrow; other-role branches/navigation definitions remain.
No Phase 4 production API, schema, grant or business-policy change.

Final checks: **274 web tests**, **48 combined isolated API cases** (Pioneer tasks,
combined scope/handoffs, public enrollment and withdrawals), API types, scoped
formatting, whitespace and the **1,939-file credential scan** pass. The first
new cancellation test ran after an intentional session-revocation case; corrected
test ordering and reran all48 successfully. Disposable database removed.

Build **0v-BQ3yRWtsz1-SYMpFah** passes full web types and71-page generation. All **65 source/
test hashes** match the artifact. The first owned build was stopped after a
review found the obsolete-read finalization race; refroze that single hook delta.
The interrupted build is not accepted evidence. A subsequent compiled keyboard
check caught native Tab wrap escaping the drawer. Added explicit first/last/
heading focus wrap in the Agent dialog, refroze only that additional file and
rebuilt. The failed HlMvi3eYAlZrP2LW2Oz-k check is retained as evidence.
Development reached16 workflow
groups but timed out on its final narrow notification capture; final acceptance
comes from the exact compiled candidate below. Initial WebKit launch lacked a
host library; the existing Finance/Pioneer local dependency directory supports
the final engine, with no system installation or product dependency change.

Compiled checks pass **92 workflow groups**, **65 screenshots** plus
form/action crops, and **20 scoped axe scans with zero violations**. Phase 4’s
18 groups pass in Chromium, Firefox and WebKit;38 desk/enrollment/withdrawal
regression groups pass on that same compiled build. No page errors/unhandled API
paths. Includes rapid selection, lost-response reconciliation, session/assignment
loss, both feeds/four exact destinations, native focus return/containment, Escape,
settled motion/reduced motion, 320/393/1440px, both themes and enlarged text.
Actual phone/form inspection confirms the visible picker, full filename and
reachable submit action. Synthetic browser fixtures are distinct from the real
isolated API cases and do not establish actual UI login or human acceptance.

Forty-seven prior Phase1–3 source/test files are byte-preserved; intentional
extensions are the existing enrollment/withdrawal tests and role manifest.
Original47 pending/private paths, publication checkout and seventeen hooks remain
preserved. Original web config restored; own temporary previews stopped. Source
uncommitted; no commit/push/deployment. The26-case manual/results sheet is ready;
all human outcomes remain Not run. Evidence:
`../.local/agent-phase4-20261126/phase4-result.json`.

Compiled visuals:

- [Task drawer, 393px](../.local/agent-phase4-20261126/task-form-393-chromium.png).
- [Task actions and full filename, 320px](../.local/agent-phase4-20261126/task-actions-320-chromium.png).
- [Received updates, 393px](../.local/agent-phase4-20261126/notifications-393-dark-chromium.png).
- [Stale report/evidence](../.local/agent-phase4-20261126/stale-task-draft-chromium.png).

## Completion audit — 2026-11-26

Jaycee requested checking whether all phases were done. All65 captured source/
test files still match build0v-BQ3yRWtsz1-SYMpFah and the recorded274 web/48 API/
92 compiled groups/20 axe passes remain valid for that snapshot. However, its
actual `closed-application.png` shows a duplicate selected list card saying
Received and offering Review application above the authoritative Closed detail.
The passing browser check asserted closure/absence of forwarding but missed that
contradictory summary. This is a Phase 2 presentation follow-up; the close
business transition itself is saved correctly.

The separate `freshphonesph-agent-phase-two` contains the reviewed one-file
`visual-fix.patch`, absent from this main candidate. It gates directory loading/
errors/rows to list mode and keeps the selected view on authoritative detail.
Its isolated results do not establish acceptance of the still-unpatched main
checkout. Integrate and reverify before calling all technical phases complete.
No application source changed during this audit. The26 manual outcomes remain
Not run; real UI login and human business/screen-reader acceptance are unrecorded.
No commit/push/deployment. Audit evidence:
`../.local/agent-phase4-20261126/phase-completion-audit.json`.

## Phase 2 incomplete part — authorized correction, 2026-11-26

Jaycee said “lets do the phase 2”, then clarified “phase 2’s incomplete part”.
Integrate only the reviewed one-file visual follow-up: directory snapshots,
loading and errors render in list mode; selection uses its authoritative detail.
This prevents Received/Review application from contradicting Closed, preserving
list search/status/page on return and independent original evidence. Existing
ROSS state guidance and the recorded Phase 2 recovery evidence apply; no new
visual style, permissions, API, schema or business rule. Preserve all64 other
captured application/test files and the previous build. Add compiled assertions
for no duplicate summary after close plus selected/list loading/error boundaries,
then verify three engines and the existing task/notification handoff on the new
artifact. Named-user business/screen-reader acceptance remains separate.

### Phase 2 incomplete part — final verification

Integrated only the three selected/list render guards in
`EnrollmentApplications.tsx`; all64 other captured app/test files are unchanged.
The selected page displays authoritative original evidence/status/actions and
return link. Directory loading/error/row snapshots appear only in list mode.
Closing no longer leaves a contradictory Received / Review application card.
This resolves the completion audit’s technical gap. Prior audit/failed captures
remain historical evidence; no Phase 2 redesign or other-phase implementation.

Final build **snwxwlTrH-Oij_3A4l5ea** passes full types and71-page generation; all65 source/
test hashes match.274 web tests, scoped formatting and whitespace pass. Compiled
checks cover18 enrollment groups in each of Chromium/Firefox/WebKit, including
explicit absence of the duplicate summary after close and selected/list loading/
error separation with filter restoration. The existing18 task/notification
groups also pass on the same artifact: **72 groups,16 clean scoped axe scans**,
zero page errors/unhandled API paths. The actual compiled desktop Closed capture and narrow application forms were
inspected. Browser fixtures use synthetic intercepted APIs. An initial WebKit run switched
theme through a raw document attribute and reported stale inherited colors plus
a route-prefetch error. Rechecking the same artifact through the real theme
button yields the expected dark foreground (rgb238/243/255),four clean axe
scans and zero page errors. Only the harness changed; the failed first run is
preserved.

Production API/schema/grants and their prior48-case API test source are unchanged;
those prior real API passes are preserved evidence, not a new API rerun. Source
scope and original-work/hook preservation are verified. Original web config
restored; owned compiled preview stopped. No commit/push/deployment. All26 human
outcomes remain Not run; business/screen-reader/actual UI login acceptance is
unrecorded. Evidence `../.local/agent-phase2-followup-20261126/followup-result.json`.

- [Before: Received above Closed](../.local/agent-phase2-followup-20261126/closed-application-before.png).
- [After: authoritative Closed detail](../.local/agent-phase2-followup-20261126/enrollment-chromium/closed-application.png).
- [Selected detail survives directory failure](../.local/agent-phase2-followup-20261126/enrollment-chromium/selected-directory-error-independent.png).
