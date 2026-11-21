# Finance Officer — work plan and implementation record

Current access reference: [Finance Officer — role and portal access](finance-officer-role-and-access.md).

Initial planning baseline: **2026-11-13**, against `85fdc12` in the authorized local
main-run checkout. Jaycee initially requested “lets plan first before tackling it,”
then explicitly authorized merging the coworker update and opening localhost.
**Current implementation: 2026-11-21, `feature/finance-officer-portal`, base `bf739e0`.**
Jaycee explicitly authorized committing and pushing the Finance work on 2026-11-21,
superseding the earlier hold recorded below. Publication does not imply final
hands-on acceptance. Earlier Batch Handler edits remain separate local work.
Jaycee authorized Phases 1–3 and selected the same style as the coworker’s other
role portals. All three slices are implemented locally; validation is recorded below.
Phase 4 technical verification is recorded below; Jaycee’s own testing and final
acceptance remain pending. The earlier audit and integration entries are dated
history, including their migration counts and runtime configuration.

**Remote update checked later on 2026-11-13:** a fresh fetch discovered
[`fcef646`](https://github.com/arkodevph/freshphonesph/commit/fcef646f8eb0aa47883709aae1e1a43c4607b555)
on `origin/feature/new`, authored by `nami` at 16:04 Manila time. This commit was
not included in the initial local audit. It adds independent role-owned views,
including 149 files under `apps/web/app/system/_role-designs/finance_officer/`.
Finance home, payment list and review-dialog comparisons show import/component
ownership changes while retaining their earlier core behavior. The original
gap analysis remains a baseline, not a runtime assessment of this incoming commit.

At that earlier check, fetched `main` was `845bca8` and localhost was `85fdc12`.
The later authorized integration below supersedes that local-only status.
Before implementing custom workspace features, recheck the findings against the
merged role views. Finance-only
visual changes should then target the Finance role folder; behavior shared across
roles stays in the shared hooks/API. See the incoming
`docs/156-independent-role-designs.md`. The commit also adds three migrations;
the seven migrations recorded below describe the initial planning checkout. All
ten pending migrations are now applied locally, as recorded below. Remote-check evidence is retained in
`../.local/finance-remote-check-20261113/`.

## Local integration checkpoint — 2026-11-13

At Jaycee's “update it,” “merge it” and “i wanna see” requests, fast-forwarded
`feature/batch-handler-workspace` from `85fdc12` to the freshly fetched `fcef646`.
The Finance plan and all protected local files survived the merge unchanged.
No remote push or deployment was performed.

Rehearsed all ten pending migrations on an isolated restored copy before applying
them to the existing local preview. All original values across **74 tables and
4,406 rows** matched their pre-migration hashes. The rehearsal database was removed;
a private dump and Git recovery ref remain. The preview now has zero pending
migrations and the required submission-evidence function.

Finance Payments and staff alerts now return HTTP 200. Its payment table shows
actual records at 1440px and 393px without document overflow; no page exceptions
or failed Finance API responses occurred in the final focused check. Handler,
Records and Manager payment-list/alert reads also return 200. New audit sessions were revoked; exact session-ID checks confirm their removal
and preservation of all other sessions. A cookie-path filter initially skipped
cleanup in the last harness; the affected five audit sessions were removed by
their exact IDs and the helper was corrected. No financial writes were performed.

Six role isolation/access tests, API and web type checks, contracts build, Prisma
generation, frozen install and client credential checks pass. Earlier instrumented
browser checks timed out; direct inspection and a corrected DOM-row check pass.
The first preview hit its 3 GiB cgroup limit during page compilation. The active
local web scope now has a **4 GiB memory limit**, zero swap and its existing CPU/task
limits; no application/helper source was edited for this runtime adjustment.

Evidence: `../.local/finance-merge-20261113/`, including `merge-result.json`,
`migration-result.json`, `final-browser-results.json`, validation logs and the
current payment-table screenshots. This verifies local integration and preview,
not completed custom Finance improvements or final business acceptance.

## Goal and existing role

Help Finance find payments it can actually review, inspect the evidence and prior
approvals, record an explicit financial decision, and reconcile collections and
external refunds. Amounts paid externally still need human checking outside the app.

The existing role already has these capabilities in source:

| Area                | Current capability and boundary                                                                                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Payments            | Read claims, receipts, duplicate-reference evidence, balances and review history. Finance alone verifies, rejects or requests clarification after the required Records and assigned Manager reviews. It has no `PAYMENT_RECORD` grant. |
| Credit corrections  | Audited correction, reversal and restoration of verified credit. Original payments and append-only adjustment history remain traceable.                                                                                                |
| Batches and members | Read batch/member records and schedules. No batch creation, enrollment, assignment, release-state edits or customer-ID review.                                                                                                         |
| GCash statements    | Read statement evidence and reconciliation context. Records retains statement review/correction authority.                                                                                                                             |
| Reports             | Payments, Collections, Reconciliation and the related installment-earnings view; authorized exports, saved snapshots and analysis. No Tasks/Support report-family access.                                                              |
| Withdrawals         | Read cases and record an external refund against the approved remaining amount. COO decides refund terms. Recording does not send money.                                                                                               |
| Work and account    | Existing task permissions, notifications, password/MFA/session controls and privacy notices. Finance receives neither confidential HR nor account administration access.                                                               |

Current navigation exposes Home plus eight workspaces: Payments, Reports, GCash
history, Withdrawals, Batches, Clients, Tasks and Customer work. Notifications and
Account security are shared utilities. Customer work now opens the same Finance-ready payment
queue; the route and existing permissions are retained.

## Initial planning baseline and limitations

Read-only browser inspection used a fresh local `FINANCE_OFFICER` preview session:

- Home, Payments, Reports and Withdrawals page shells returned HTTP 200 at 1440px.
- Payments was also inspected at 393px. These views had no document-level overflow
  or JavaScript page exceptions in this run; this is not a full responsive audit.
- **`GET /api/payments` and `GET /api/staff/alerts` returned HTTP 500.** Their
  workflows are not verified merely because the page shells loaded.
- The payment table displayed **0 matching payments / No payments** after its
  failed request, alongside an error toast. This is an incorrect empty-state signal.
- A read-only schema inspection found seven unapplied checked-in migrations and
  no `submission_evidence_blockers(uuid,date)` function. Current payment serialization
  and Finance-alert SQL call this function. This confirms an incompatible local
  schema; restore it before diagnosing remaining payment/alert behavior.
- The audit performed no financial writes. Its only new login was logged out;
  subsequent `/api/auth/me` returned 401. Existing sessions were untouched.

Pending local migrations:

```text
20261106080000_assistant_actions
20261106110000_assistant_conversations
20261109120000_operations_monitor
20261109130000_operations_monitor_rls
20261109140000_workflow_followup_alerts
20261110120000_submission_requirements
20261110121000_payment_alert_batch_codes
```

Evidence stays local in `../.local/finance-officer-audit-20261113/`:
`schema-status.json`, `browser-results.json`, the audit script, desktop screenshots
of all four routes and the Payments mobile screenshot. Screenshots with the failed
payment request must not be treated as acceptance of a functioning payment queue.

## Audit baseline findings — 2026-11-13

| ID  | Verified finding                                                                                                                                                                                                                                                               | Proposed response                                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F0  | Current source and local preview schema disagree; payment listing and alerts fail.                                                                                                                                                                                             | Back up the existing local preview, rehearse the seven migrations on an isolated copy, verify preservation, then align the preview and retest. No reset/reseed or remote database migration.                                                                               |
| F1  | Failed payment retrieval is displayed as an empty queue. The non-Handler table does not render its `listError` state.                                                                                                                                                          | Give Finance a persistent loading/error/retry/empty distinction. Keep existing rows visibly stale when a refresh fails; never convert an error into a zero count.                                                                                                          |
| F2  | Finance lands on `StaffDashboard`, including generic operations copy. `CustomerWorkService` counts every `PENDING` payment as a Finance check, while alert SQL uses `financeReadySql()`. The live generic home displayed eight such checks.                                    | A Finance home should distinguish actionable reviews from pending upstream work. Centralize authoritative eligibility for counts, lists and links, including current approvals, evidence and membership eligibility. Do not derive totals from one paginated browser page. |
| F3  | Payments has status/date/search filters but no review-stage filter. Its table is unsorted for Finance and lacks a Proof column and visible batch context. Sort controls and document actions added for Handler remain Handler-only.                                            | Add Finance review-stage filters, complete-result sorting, readable member/batch/reference/amount columns and explicit proof state. Preserve existing row access and export policy.                                                                                        |
| F4  | Receipt viewing, operational history and the final review form are separate dialogs. The review form shows client, amount, reference and date, but not the receipt, method, batch or prior reviewer details together. A required note and explicit confirmation already exist. | Consolidate evidence and decision context in a Finance review workspace, retaining the existing note, decision and stale-version protections. This is an improvement to an existing decision flow.                                                                         |
| F5  | Staff statement/confirmation endpoints and the shared document generator exist. Current staff UI entry points are in Handler-only tables.                                                                                                                                      | Expose authorized Statements of Account and verified-payment Confirmations to Finance, reusing fresh reads, PDF, print and existing non-BIR wording.                                                                                                                       |
| F6  | Reports and refund recording already exist. The Finance home has no focused refund/reconciliation handoff.                                                                                                                                                                     | Add relevant links and explicit financial labels to existing destinations; assess their details after F0. Do not rebuild these modules or change refund policy by default.                                                                                                 |

## Phases

Phase 0 records completed local setup. Phases 1 and 2 are implemented locally on
2026-11-20; unchecked later phases remain proposed.

### Phase 0 — Restore a trustworthy local baseline

**Completed locally on 2026-11-13 under the later merge/preview request.**

- [x] Preserve the preview database and private local configuration; rehearse all
      ten pending migrations on an isolated copy and compare original values.
- [x] Align the existing preview after the successful rehearsal, retaining all
      original rows and columns and the original Finance plan.
- [x] Verify Finance payment listing and alerts, plus Handler/Records/Manager read
      regressions, role isolation/access tests and the merged source type checks.
- [x] Capture the working Finance preview and retain the initial failure evidence.

Payment/alert reads now succeed with preserved data. No new role permission was
introduced by the local setup work. Proposed workspace improvements start below.

### Phase 1 — Finance home, priorities and reliable queues

- [x] Create a Finance-specific home with actionable reviews, upstream waiting work,
      clarification follow-ups, verified collections with a named period, approved
      refunds awaiting recording, and the user's relevant tasks.
- [x] Align dashboard, Customer work and alert terminology/readiness. Recheck the
      existing helper against the decision API's open-membership and evidence gates.
- [x] Add server-side readiness/stage filters before pagination. Keep all payments
      accessible for history and investigation; choose the default queue explicitly.
- [x] Add persistent retryable errors, genuine empty states, refresh indicators and
      direct links that retain the selected context.
- [x] Order existing navigation around payment review, reconciliation/reporting and
      refund recording. Preserve direct routes and authorized secondary work.

**Exit:** a displayed actionable count opens the same eligible records, and a failed
request cannot be mistaken for an empty queue. No undocumented overdue threshold.

### Phase 2 — Payment table and evidence-based review

- [x] Add Finance table sorting across all matching records, batch/member context,
      full-reference access, aligned currency, proof badges with words, review stage,
      duplicate evidence and clear action menus. Keep horizontal scrolling inside the
      table where necessary; preserve identity and reachable touch/keyboard actions.
- [x] Present receipt, amount/method/date/reference, duplicate warnings, Records and
      Manager decisions/notes and the submission checklist beside the Finance decision.
- [x] Keep Verify / Reject / Request clarification distinct. Preserve the required
      note and explicit confirmation, with a clear statement of the selected action's
      effect. Receipt scanning/matching is assistance and does not prove actual funds.
- [x] Preserve captured versions, drafts on error/cancel, conflict handling and
      current access checks. No bulk verification, automatic approval or silent retry
      against a newly fetched version.
- [x] Keep verified-credit adjustment history and correction controls available
      without confusing them with a transfer or external refund.

**Exit:** Finance can inspect the available evidence and record one deliberate
decision; stale or ineligible reviews cannot change credit. Existing role flows pass.

### Phase 3 — Account documents and supporting financial work

- [x] Add Finance entry points to existing SOA/verified-payment confirmation
      previews, PDFs and printing. Generalize the reusable component where necessary;
      keep endpoint authorization, verified eligibility and fresh-read behavior.
- [x] Connect collections/reconciliation exceptions and GCash evidence to their
      authorized underlying records. Preserve report periods, adjustments and exports.
- [x] Make approved refund amount, recorded payouts and remaining amount easy to
      distinguish. Keep undecided amount/date pending and preserve partial-payout,
      version and idempotent-retry behavior.
- [x] Review notification links and update/read state for Finance-specific work
      after the baseline is restored. Any historical-inbox behavior change is a
      separate decision; Handler retention behavior is not automatically a Finance rule.

**Exit:** documents and financial supporting views connect to existing workflows
without new policy, access grants or money-transfer functionality.

### Phase 4 — Acceptance and regression checks

- [x] Complete a normal-role Records → assigned Manager → Finance walkthrough in
      an isolated test environment, including returns, corrections and changed evidence.
- [x] Test verified-only balances, adjustments, refunds, report/export consistency,
      permissions, revocation and concurrent/stale decisions using isolated test DBs.
- [x] Check 320px, 393px, tablet, desktop and short landscape; light/dark themes;
      keyboard/focus, readable full labels, 200% text resizing/reflow and reduced motion.
      Real browser zoom and human assistive-technology checks remain in user acceptance.
- [x] Exercise loading, empty, API failure/retry, missing proof, blocked submission,
      duplicate evidence and permission loss without financial writes to the preview.
- [x] Check document PDF/print and the existing customer/Handler/Records/Manager
      workflows affected by shared components. Log out only newly created test sessions.
- [ ] Complete Jaycee/client acceptance. Commit/push, merge and deployment remain
      separate from implementation or local acceptance.

## UX rationale and design notes

**Behavioral goal:** identify the next eligible review, compare submitted evidence
with independently checked funds, understand blockers, make a deliberate decision,
and find its recorded result. Device mix and daily volume have not been confirmed.

| Step           | Information and action                                            | Error/recovery to support                                                |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Find work      | Actionable count, stage, age and link to the scoped list          | Error is visible; retry preserves the selected queue.                    |
| Inspect        | Receipt, method/reference/amount/date, prior reviews and blockers | Missing/stale evidence is explicit; access loss removes private content. |
| Decide         | Selected decision, required note, stated effect and confirmation  | Cancel retains draft; conflict requires a new human review.              |
| Follow through | Updated status, retained history, eligible documents/reports      | Exact links, stable context and clear credit/refund distinctions.        |

Evidence ledger, applied as constraints and testable hypotheses:

| Evidence                                                                                               | Finding, confidence and limits                                                                                                                                                                                                                              | Proposed implication and falsifier                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [W3C SC 3.3.4](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html) | **Strong normative guidance**, not a participant experiment: consequential submissions need an appropriate way to check/correct, confirm, or reverse. It does not demand a new confirmation for every save.                                                 | Retain existing deliberate decision/adjustment safeguards and put the relevant evidence with them. Usability testing should detect mistaken targets or repeated backtracking; a polished form alone is not proof of safe use. |
| [W3C SC 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)                               | **Strong normative guidance:** ordinary content must reflow at the specified narrow dimensions; meaningful two-dimensional tables have an exception.                                                                                                        | Reflow filters/forms while containing table scrolling. Failure: page-level horizontal scrolling, inaccessible row actions or hidden decision context at tested sizes/zoom.                                                    |
| [Scheibehenne et al., 2010](https://scheibehenne.de/ScheibehenneGreifenederTodd2010.pdf)               | **Strong synthesis for the studied consumer-choice tasks; analogy-only transfer here.** Across 63 conditions and 5,036 participants, the average choice-overload effect was near zero with substantial variation. It supplies no universal menu-item limit. | Group Finance work by meaningful stages and retain necessary choices. Compare task completion/findability; fewer controls alone is not a success measure.                                                                     |

`ui-design-index` routes this surface to **ui-design-systems**. That category guide
is not installed in the searched local skill locations; the index itself and
`user-expi` were read. This plan therefore uses inspected project patterns:

1. A role-specific home with authoritative queues, as already used by Handler/COO.
2. A readable financial table with scoped menus and stable identity.
3. A review view that groups evidence, history and a deliberate decision.

These are proposed interaction patterns. Existing Fresh Phones colors, type,
icons and accessible shared controls are the starting point. Choosing the Handler
shell versus the current staff shell remains open. Maintain this section and the
local visual evidence as the Finance design record when implementation begins.

Initial visual evidence:

- [Home baseline](../.local/finance-officer-audit-20261113/home-desktop.png)
- [Payments failure state](../.local/finance-officer-audit-20261113/payments-desktop.png)
- [Payments mobile](../.local/finance-officer-audit-20261113/payments-mobile.png)
- [Reports baseline](../.local/finance-officer-audit-20261113/reports-desktop.png)
- [Withdrawals baseline](../.local/finance-officer-audit-20261113/withdrawals-desktop.png)

## Decisions still open

- **Visual shell — resolved for Phase 1 on 2026-11-20:** retain the Finance staff
  shell and tokens; adapt the coworker’s COO dashboard composition.
- **Queue default/order — implemented:** Ready for Finance first, with upstream,
  clarification and all/history views available. Readiness timestamps, overdue
  thresholds and escalation policy remain undecided and were not invented.
- **Collections period — implemented:** this month to date by payment date in
  Asia/Manila, with last month/year-to-date options. Lifetime balances remain
  separate; this does not represent bank posting date or actual bank reconciliation.

Existing Finance authority, operational approval order, verified-only credit,
external payment/refund handling and COO refund decisions are established rules.
They do not need to be reopened to implement this plan. Actual bank receipt QA
and final Batch Handler sign-off remain deferred under the earlier instructions.

**Current slice:** Phases 1–3 are implemented locally; Phase 4 technical verification
is recorded below. Jaycee’s hands-on business/visual acceptance remains pending.
All work is local and uncommitted until he tests it and requests a further action.

## Source pointers

- [Merged Finance-owned views and styles](../apps/web/app/system/_role-designs/finance_officer/)
  and [role isolation guide](156-independent-role-designs.md). Original shared-view
  paths below record the initial audit baseline; visual implementation now belongs
  in the Finance role folder, while common behavior remains shared.

- [Current role grants and report families](../packages/contracts/src/index.ts)
- [Role-specific page routing](../apps/web/app/system/page.tsx) and
  [generic staff home](../apps/web/app/system/StaffDashboard.tsx)
- [Customer payment work queue](../apps/api-ts/src/portal/customer-work.service.ts),
  [alert rows](../apps/api-ts/src/staff/alert-queries.ts) and
  [Finance readiness predicate](../apps/api-ts/src/finance/payment-workflow-query.ts)
- [Payments hook](../apps/web/app/system/payments/usePaymentsWorkspace.tsx),
  [list panel](../apps/web/app/system/payments/PaymentListPanel.tsx),
  [review dialog](../apps/web/app/system/payments/FinanceReviewDialog.tsx) and
  [Finance service](../apps/api-ts/src/finance/finance.service.ts)
- [Payment review chain](123-payment-operational-review-chain.md),
  [credit adjustments](40-payment-adjustments.md),
  [shared account document reads](../apps/web/lib/account-documents.ts) and
  [refund recording](../apps/web/components/withdrawals/RefundActions.tsx)


## Phase 1 living design record — 2026-11-20

**Authorized:** Jaycee selected Phase 1, then explicitly required using existing
references and the same style his coworker used on other role portals. This
supersedes the earlier undecided visual-shell note for this slice. No new palette,
marketing hero, illustration or component library is being introduced. Phases2–4
remain separate.

**Primary composition:** coworker's COO dashboard, current role-owned source under
`_role-designs/coo/app/system/coo-dashboard/`. Inspected saved actual renders are
`../.local/finance-phase1-20261120/reference-coo-light.png` and
`before-finance-light.png`. Compare the current Batch Manager/HR dashboards as
secondary references for domain-specific counts and independent loading states.
Keep Finance's existing role tokens and shared staff shell.

**Fidelity map:** retain the greeting/action row; asymmetric overview with a left
featured collections card, two small figures and a waiting row; large right-hand
work panel; paired follow-up/task panels below; workspace shortcuts and the existing
footer rule. Replace only the COO content with Finance queues, approved refunds
and the signed-in officer's tasks. Preserve the reference's panel radii, spacing,
quiet dividers, typography and action placement. All copied presentation files
remain Finance-owned; no cross-role component imports or COO/HR/Manager edits.

**Behavior/flow:** Finance opens the home → reads current eligibility counts →
opens the matching server-filtered queue → inspects a claim using existing detail
and review controls. Period-scoped collections represent verified effective credit,
not scheduled earnings. Default Payments queue is Ready for Finance; All payments
remains available for history and investigation. Exact payment links bypass queue
filters. Waiting groups distinguish Records/proof, assigned Manager, submission
evidence and replacement-completed/read-only memberships. Refresh errors retain
same-query data with an explicit stale warning; changed-query failures cannot show
old rows as a new result. Denied access clears private data.

**Evidence ledger:** W3C status-message guidance supports announcing results and
errors without moving focus; reflow guidance supports one-column320px layout and
contained table scrolling. These are standards, not measured task-performance
claims. Sources rechecked2026-11-20:
https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html and
https://www.w3.org/WAI/WCAG22/Understanding/reflow.html.
Corrective finding: choice-overload research cited in this plan has heterogeneous
results; do not remove authorized workspaces merely to achieve an arbitrary menu
limit. Group and prioritize the current routes instead.

**Implementation comparison:** inspected existing coworker COO/HR/Manager dashboard
sources, the existing Prisma/manual pagination pipeline and TanStack Table's open
source pagination guide:
https://raw.githubusercontent.com/TanStack/table/v8/docs/guide/pagination.md.
Reuse the existing query/render pipeline and explicit server totals; a new table
library would duplicate current components and is not needed for Phase 1.
`ui-design-index` routes this to ui-design-systems; that category skill remains
unavailable locally. Existing role patterns supply the expression.

**Controls/states:** use existing Finance type and surface tokens, shared native
select treatment, equal icon slots and current focus behavior. No eyebrow labels
or decorative section numbers. Keep numeric figures beside their scope, wrap
labels, use44px phone actions and reduced-motion fallbacks. Apply ROSS's relevant
animation/typography/visual rules while retaining the controlling coworker style.

**Implemented presentation:** the Finance-owned CSS retains the COO 24px grid
rhythm, 16px featured-card radius/24px inset, translucent neutral panels and the
blue `#10264d` → `#163f85` collections card. Existing Finance shell font and green
actions remain in use; no new imagery or font was added. Greeting type is
27–36px, money uses tabular numerals, and long currency figures scale down on
phones. The header controls wrap below 700px, and the dashboard grid explicitly
uses `minmax(0,1fr)` so the hidden-overflow staff shell cannot clip its contents.
The reused arrival motion is 360ms; reduced-motion disables animations/press scale.
Existing table density remains unchanged; Phase 2 table redesign is still pending.

**Verification:** compare desktop/light/dark and phone renders to the inspected
reference; test full-result count/list consistency, stale approvals, replacement
memberships, role denial, period boundaries, adjustments, refunds, search/paging,
exact links, error/retry/access-loss and keyboard/reflow. Financial mutations only
in disposable isolated test databases. Record actual results and captures here.


### Phase 1 result and validation — 2026-11-20

**Implemented and checked locally**, on `feature/finance-phase-one`, base `bf739e0`.
The current optimized preview is running at <http://localhost:3000/login>; choose
Finance Officer. The existing Handler work is preserved; other role-owned views
were not edited. All original pending files match their backup except the intended
Finance plan/access updates and Finance entries in the role manifest.

- **241 web tests pass**, including period/session contracts and row-label blocking
  priority. Shared contracts build, API type check and optimized web build pass;
  Next generated 72 pages. Edited-source formatting, whitespace and credential checks
  pass (1,774 source files, zero credential findings).
- **48 unique database checks pass:** 9 Finance workspace, 37 existing payment/credit/
  reconciliation/withdrawal regressions, and 2 legacy queue/reset-prerequisite checks.
  Finance checks cover pagination beyond 20 ready records, matching counts/alerts/
  Customer work, stale/inactive reviewers, batch/evidence versions, read-only
  memberships, composed filters, one deliberate verification, effective collections,
  Manila period boundaries, approved refund remainders and own tasks. Every owned
  disposable test database was removed. The captured EXPLAIN uses fixture scope;
  it does not establish production-scale performance.
- **12 browser groups pass** on the served build: all queue/count links, collection
  period/status and refund drill-downs; same-query stale versus changed-query error;
  denied-access clearing; read-only/incomplete-evidence labels and actions; overview
  period failures/retry; visible keyboard order; light/dark at 1440/768/393/320px;
  and contained phone payment tables. No JavaScript page errors or financial writes.
  Its own session logged out 200 and then identity returned 401.
- Actual 320px inspection caught clipped header controls behind the staff shell's
  hidden overflow. The final check also measures `.system-content` scroll width,
  rather than relying only on document width; both themes now pass. Earlier
  harness startup/selector errors and fixture corrections are retained separately.

Actual final render evidence:

- [Finance desktop — light 1440px](../.local/finance-phase1-20261120/final-finance-light-1440.png)
- [Finance phone — light 320px](../.local/finance-phase1-20261120/final-finance-light-320.png)
- [Finance phone — dark 320px](../.local/finance-phase1-20261120/final-finance-dark-320.png)
- [Payment read failure](../.local/finance-phase1-20261120/fixture-payment-unavailable.png)
- [Synthetic incomplete-evidence action state](../.local/finance-phase1-20261120/fixture-incomplete-submission-actions.png)

The actual coworker COO render remains `current-coo-1440.png` in the same local
folder; its loading figures are not accepted data-state evidence. Compare its
composition, card treatment, spacing and hierarchy with Finance's final render.
Final JSON/logs and source hashes are in `../.local/finance-phase1-20261120/`.
The error/action fixtures are explicitly synthetic reads, not financial records
created in the preview. No preview migration, commit, push or deployment was done.
The unrelated incoming personnel-onboarding migration remains pending.

**At the Phase 1 checkpoint:** local home review and later phases were pending.
Jaycee subsequently authorized Phase 2, recorded below. Phase 3 and full Phase 4
acceptance remain separate. Phase 1 checks do not establish business acceptance.


## Phase 2 living design record — 2026-11-20

**Authorized:** Jaycee said “lets do it” after the Phase 2 explanation. Continue the
coworker's Finance portal style. Preserve Phase 1 and Handler WIP; no Phase 3 document
entry points or new financial policy. Branch `feature/finance-phase-two`; 52 pending
files were backed up before this slice (location in `.local/finance-phase2-20261120/`).

**Behavior and flow:** Finance scans/sorts matching claims → opens one review →
compares receipt, amount/method/date/reference, duplicate evidence, current Records/
Manager approvals and submission checklist → chooses a decision and writes a note →
confirms its stated effect. A changed record blocks submission until an explicit
reload/review; notes survive cancel/errors. Access denial clears review evidence.

**Reference and fidelity:** reuse the existing Finance-owned native table shell
and transaction-summary/adjustment components, inspected alongside coworker COO/
Finance surfaces and the saved Handler table notebook. Preserve current surfaces,
font, green actions, understated borders and framed native dialogs. Primary identity
is member, secondary batch; pin only member on phones. Amounts right/tabular/full;
proof and stage use words. One contextual action disclosure replaces action clusters.
No competing component library or palette. Names-only40/48/56row densities, default48;
client/payment-date server sort plus newest default; effective-credit sort stays
unavailable because the existing backend sorts stored fields. Filters stay before
pagination. The review becomes a wide evidence/decision layout, stacking on phones.

**Evidence ledger:** W3C SC3.3.4 supports reviewing/correcting/confirming consequential
submissions (strong normative constraint, not a measured productivity result):
https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html.
APG supports semantic sortable headers and dialog focus/Escape/return behavior:
https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/ and
https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/. Corrective finding: APG examples
are illustrative, not production guarantees; retaining native semantics still needs
actual keyboard/touch checks. Co-locating evidence reduces navigation in this flow;
its effect on review accuracy is an unmeasured design expectation.

**Skill route:** user-expi → ui-design-index → dashboard/design-system. The optional
ui-design-systems category remains unavailable locally; inspected project components
supply the implementation. Existing payment API/manual pagination versus a new table
library were compared in Phase 1; reuse wins on existing permission/version behavior.

**States and validation:** independent evidence loading/retry; no false “no duplicate”
on failed reads; explicit missing proof/blockers; stale review blocks decisions;
retained notes and explicit reload after conflict; role loss clears private context.
Check server sorting beyond one page, exact IDs, disabled incomplete verification,
required note, final confirmation, conflict/double-click protection, credit/history
regressions in disposable DBs, keyboard/focus,320/393/tablet/desktop, both themes,
long/large/adjusted values, both scroll axes and reduced motion. No preview financial
writes. Verification and actual captures will be appended here.


### Phase 2 implementation and corrective checks

Implemented table columns: pinned Member (secondary Batch on wide regions), full
right-aligned Credit/claim with original adjusted amount, Method, Reference and
possible duplicate warning, Attached/Missing proof, Payment date, Review stage,
Recorded date and a row action disclosure. Member/payment-date/recorded sorts are
server-backed and preserved in the URL. Row actions open the existing transaction,
combined review and eligible verified-credit adjustment; documents remain Phase 3.

The combined native dialog uses the existing1,120px media frame with 20px outer
radius and a two-column evidence/decision composition; below 760px it stacks. A
28px desktop/18px phone body inset and 16px decision panel preserve the existing
Finance surfaces/type/actions. Native focus trapping/Escape is retained; closing
returns to the row action. Only image proof is previewed inline; other authorized
files retain an original-file link. Private blobs are released when the review
changes or closes. Read failures block decisions and retain an explicit retry.

The note survives failed decisions and cancel/reopen within the mounted workspace.
A changed version requires an explicit reload and new decision; there is no retry
against a newer version. Current rights, version, proof, membership, approvals and
submission eligibility gate confirmation, followed by the existing server guards.
An explicit effect statement/checkbox and captured-version submission prevent an
accidental decision; a synchronous in-flight guard prevents duplicate submission.

Actual first-render correction: generic Finance table padding produced about 63px compact
rows. Generic table and coarse-pointer control selectors now exclude the specialized
Finance table so its own 40/48/56px density applies. This is scoped to this role-owned
component, preserving the staff shell elsewhere. A diagnostic script also attempted
to decide against a stale row after reopening; the correctly disabled action exposed
a harness assumption, fixed by explicitly reloading. Diagnostic logs do not establish
final density/focus/access-clearing acceptance; the final served-build check does.


### Phase 2 result and validation — 2026-11-20

**Implemented and checked locally** on `feature/finance-phase-two`, base `bf739e0`.
Optimized system preview: <http://localhost:3000/login> → Finance Officer → Payments.
Use the row action disclosure → **Open review workspace**. The final served bucket
is `.next-preview-b`; all 17 edited source hashes match its build input.

- **245 web tests pass**, with 7 focused review/role-isolation checks also passing
  after the final access/focus fixes. Format/whitespace pass; frontend credential
  scan checks 1,778 source files with zero findings. Optimized build and TypeScript
  pass, generating 72 pages. No production API/schema changes were required.
- **47 isolated DB checks pass:** 10 Finance workspace/sorting and 37 existing payment,
  credit-adjustment, reconciliation and withdrawal regressions. Sorting is checked
  across pages in both directions, with stable ties, preserved eligibility/filter
  scope and rejected unsupported amount sorts. All owned test databases were removed.
- **12 Finance browser groups pass** on the final build: server sort and URL reload,
  density/pinning/both scroll axes, light/dark at 1440/768/393/320px, visible touch
  actions, stale-versus-changed-query errors/retry, combined evidence and decision,
  conflict and failed-save draft retention, cancel/reopen, explicit confirmation,
  captured versions and double-click guard, blocked/read-only states, keyboard/
  Escape/focus return, denied clearing of review and rows, full-text hover/keyboard
  tooltips, and right-aligned tabular currency. Normal cases use actual preview
  reads; synthetic evidence/decision cases are clearly labeled and intercepted.
- **Three other-role read smoke checks pass:** Handler, Records and Manager Payments
  page/API each return 200 with no page exceptions. This is a focused read smoke
  check, not a full normal-role UI walkthrough. Existing financial integration
  regressions cover the server write flows. Full Phase 4 acceptance remains separate.
- No page exceptions or real financial preview writes. Three intercepted browser
  decisions exercised 409/503/success using captured versions 7/8/8; no decision
  request reached the real API. Every owned browser session logged out 200 then
  identity returned 401. Original Handler WIP, Phase 1 API/home and other role manifest
  entries are preserved. Of 52 previous pending files, 43 remain byte-identical; the
  nine intended changes are recorded in preservation-result.json.

Native keyboard boundary observation: Tab occasionally reports BODY while the
native dialog remains modal; no underlying app control receives focus. The initial
DOM-only assertion was corrected to test that boundary, preserving native browser
behavior. The WHATWG focus model includes document/viewport focus and a BODY fallback:
https://html.spec.whatwg.org/multipage/interaction.html#sequential-focus-navigation.
The final check also verifies Escape and return to the invoking row action.
Earlier density failures and harness selector/scroll/stale-row corrections remain
in local logs; diagnostic scripts are not treated as final acceptance evidence.

Actual final visual files:

- [Actual payment table — light 1440px](../.local/finance-phase2-20261120/actual-payments-initial-1440.png)
- [Actual touch table — 320px](../.local/finance-phase2-20261120/actual-touch-320.png)
- [Synthetic review evidence — dark 1440px](../.local/finance-phase2-20261120/fixture-review-dark-1440.png)
- [Synthetic review — light 320px](../.local/finance-phase2-20261120/fixture-review-light-320.png)

JSON/logs, source hashes, backup pointer and further captures remain in
`../.local/finance-phase2-20261120/`. Readability and composition were inspected
against the existing coworker Finance/COO surfaces and saved table reference.
Browser checks used reduced motion; broader cross-browser/assistive-technology,
normal-motion and business acceptance are not established by these checks.
No preview migration, commit/push or deployment was performed. Phase 3 documents
and supporting work, and full Phase 4 acceptance, remain outside this slice.


## Phase 3 living design record — 2026-11-20

**Authorized:** Jaycee selected Phase 3 after reviewing its documents, supporting
financial work and notification scope. Continue the coworker Finance portal style.
Branch `feature/finance-phase-three`, base `bf739e0`;63 pending files backed up first.

**Flow and references:** reuse the inspected Finance-owned account-document dialog/
sheet and existing PDF/print helpers; activate named Statement of Account and
verified Payment Confirmation actions in payment rows, plus member statement access
from Balance lookup. Keep the operational non-BIR notice and authoritative fresh
reads, scope/eligibility, abort and stale-export handling. Use current Finance modal
surfaces/type/green actions; native focus/Escape/return and 44px controls; no new
palette/dependency or decorative eyebrow. Read ROSS workflow, website/table standards
and the existing Phase 1/2 notebook; carry forward the internal-overflow and generic-
table selector lessons. Existing typography/mobile/motion/visual standards still apply.

Reports → scoped payment records → explicit return to the same report period/batch/
page. Reconciliation exceptions open exact IDs; GCash suggested matches return to
the originating statement. **Corrective domain finding:** Collections groups payments
by the member's current batch, while Payments/Reconciliation use the recorded batch.
Do not silently use recorded-batch filtering for a Collections drill-down. Add an
optional narrowing current-membership-batch read filter with existing authorization.
No effective-credit sorting or financial write-policy changes.

Refund presentation keeps approved amount, recorded external payouts and remaining
approval distinct. Undecided/declined amount/date stay explicit; preserve existing
partial payout, captured version, request-ID replay and confirmation behavior.
Review existing Finance notifications with exact targets and per-user read receipts;
keep current-source Finance alerts and existing retention policy.

**Evidence ledger:** W3C link-purpose guidance supports named destination/document
links with readable scope; financial error prevention supports reviewing consequences
and preserving confirmation/recovery:
https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html and
https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html.
These are standards, not measured task-speed claims. Return navigation is a task-based
expectation to verify, not a guaranteed cognitive effect. Skill route remains
user-expi → ui-design-index → dashboard/design-system; optional ui-design-systems
category is unavailable. Existing project primitives supply the expression.

**Validation:** new narrowing filter and report scopes; verified-only documents,
adjusted/zero balances and member identity; preview/PDF/print fresh reads, failures,
abort and revoked access; report/Gcash return links/periods; pending/partial/paid
refund states and idempotent retry; Finance alert destination/read status. Use actual
local reads and browser-only fixtures, with writes only in disposable test DBs.
Check 320/393/tablet/desktop, light/dark, keyboard/focus and print. Preserve Phase 1/2
and Handler WIP. Full Phase 4 business/cross-browser acceptance remains separate.

### Phase 3 implementation — 2026-11-20

Payment row actions now expose **Statement of Account** and, for verified rows,
**Payment Confirmation**. Balance lookup can open the selected member's SOA even
when the queue has no rows. The Finance-owned preview reuses existing authorized
reads, document sheet/PDF helpers and original brand asset. Preview, PDF and print
read current records; PDF rechecks immediately before download and print rechecks
after assets are ready. Changed content updates the preview and requires another
explicit action. Close aborts pending work; denied reads clear evidence; transient
failures have retry. Native modal focus/Escape/return and non-BIR notices remain.
Inherited decorative document labels were removed from the Finance preview.

Report URLs restore applied kind, dates, batch and page. Collections opens verified
payment records filtered by `membershipBatchId` (current `Client.batchId`); Payments
and Reconciliation retain recorded `Payment.batchId`. The optional filter narrows
existing authorization in both Prisma and Finance SQL paths, before pagination;
no schema/index/grant change. The existing Client batch index is available, with a
fixture EXPLAIN in the evidence directory; this is not a production-load benchmark.
The table labels that identity **Member batch**. Exact payment links bypass source
filters and retain an allowlisted local return destination. Collection membership
scope and exact-record views direct period exports to Reports; existing recorded-
batch exports still pass their batch filter. Report export and snapshot policy is
unchanged.

GCash suggested matches open the exact payment and retain history, PDF revision,
revision-history page and queue filters for return. Missing historical revisions
report an error instead of silently opening the latest PDF. Existing Finance
read-only GCash authority remains. Refund financials distinguish approved refund,
recorded external payouts, remaining approval and target date; pending/declined
amounts and dates stay explicit. Existing payout limits, captured version,
confirmation, request-ID replay and error draft retention are reused unchanged.
Finance notifications retain exact payment destinations and personal/versioned
read state; no Handler retention or deletion policy was adopted.

Only the named Finance-owned views, navigation/read-scope helpers and tests were
added to this phase. The shared payment hook activates these additions through
its Finance option. Handler WIP and other role-owned views remain preserved.

### Phase 3 verification and handoff — 2026-11-20

Final validation passes: **250 web tests**, **59 isolated database checks**
(12 Finance,10 report scope,37 financial regressions), contracts/API types and the
optimized 72-page web build with full TypeScript. All disposable test databases
were removed. **20 Finance browser groups** pass on the final served source,
covering real document preview/PDF/print, eligibility, changed-content export
blocking, access loss/retry/close cancellation, phone/tablet/desktop and themes,
keyboard focus/Escape, scoped Collections and Reconciliation round trips, exact
historical GCash return, malformed scope errors, empty-queue SOA access, notification
read state/retry and pending/partial/fully recorded refund states. Three other-role
payment read smoke checks pass (Handler,Records,Manager). Refund and notification
browser writes were intercepted synthetic fixtures; actual monetary writes occurred
only in disposable database tests. Actual SOA PDF and print are 2 pages; confirmation
PDF is 1 page, with non-BIR wording and document-only print content verified.

Scoped formatter checks pass for 29 edited source files; the credential scan reports
0 findings across1781 source files. Frozen hashes of 30 source/manifest files match
the final build and tests. Of 63 backed-up pending files,50 are byte-identical and13
have authorized Phase 3 changes; all pending paths are accounted for and other role
manifest entries are identical. The original Handler WIP remains preserved.

Local preview: <http://localhost:3000/login> → Finance Officer. Payment row **⋯** →
**Statement of Account** / **Payment Confirmation** (verified only); Balance lookup
also opens the selected member's SOA. Reports provide named record links and a
return link. GCash suggested matches retain statement revision context.
Branch `feature/finance-phase-three`, base `bf739e0`, served bucket `.next-preview-b`.
Final evidence: `.local/finance-phase3-20261120/final-result.json`, browser/connection/
support results, PDFs, source hashes, query plans and preservation record.

Visuals: [actual SOA desktop](../.local/finance-phase3-20261120/actual-statement-dark-1440.png),
[actual SOA 320px](../.local/finance-phase3-20261120/actual-statement-dark-320.png),
[GCash historical fixture](../.local/finance-phase3-20261120/fixture-gcash-historical-light-393.png),
[partial refund fixture](../.local/finance-phase3-20261120/fixture-partial-refund-dark-320.png).
These are observed checks; Jaycee's visual/business acceptance is pending.
Full Phase 4 business/cross-browser/assistive-technology and normal-motion acceptance
remains separate. No preview financial writes, migration, schema/grant change,
commit/push, merge or deployment occurred in this phase. Own test sessions logged out.


## Phase 4 technical acceptance — started 2026-11-20, resumed 2026-11-21

**Authorized:** Jaycee selected the acceptance/regression pass, explicitly adding
“dont commit it instantly” and “i want to test it myself”. Keep all work local and
uncommitted. His hands-on testing and acceptance remain separate from automated
technical checks. Branch `feature/finance-phase-four`, base `bf739e0`; all 82 pending
files were backed up and checksummed before work.

**Environment:** a new, synthetic-only Finance acceptance database and private
file directory serve the existing local preview. The prior preview database is
untouched. Seven normal role accounts and labelled review-stage claims support
actual role-based browser decisions and a later manual walkthrough. Separate
throwaway test databases cover financial/authorization regressions and are removed
after each group. No external email worker is running in the acceptance sandbox.

**Design checks and corrective changes:** consulted ROSS's notebook/standards and
the existing Phase 1–3 design record. Reuse the coworker's portal expression, native
modal focus and table primitives. Behavioral goal: identify work, inspect evidence,
make a deliberate decision and follow its recorded credit, with stable labels for
keyboard/screen-reader use. Existing W3C link-purpose/error-prevention/reflow
references remain the evidence basis; no claim of measured task-speed improvement.
Corrective finding: an attractive summary card layout can still have invalid list
semantics. The rendered axe check found invalid children in the Finance summary
`dl`; group each term/value in its own valid definition list, retaining card layout.
The review-note label also included its changing character/draft hint, making its
accessible name change with typing; keep the visible label stable and associate the
hint via `aria-describedby`. Verify the actual render and browser accessibility
checks after rebuilding. No new palette, animation, workflow or financial policy.


The full-page accessibility scan then found a 2.52:1 light-theme contrast failure
in the inherited decorative `.system-eyebrow`. The Finance-owned stylesheet now
hides that repeated brand eyebrow, applying Jaycee's established no-eyebrow rule
without changing other role portals. All three browser engines passed the earlier
functional pass; rebuild and repeat the final checks against this last scoped fix.


A conflict-recovery check exposed a functional edge case: **Reload for review**
captured the old in-memory record before its asynchronous refresh completed. A
single reload could therefore still show a changed-version block. The Finance-owned
evidence hook now distinguishes ordinary refresh from explicit reload: only a
successful current-generation read for the same payment invokes the reload
callback. Old in-flight requests are invalidated immediately, failures retain the
blocked state and draft, and closing/changing the payment drops the pending capture.
The decision and confirmation are reset around the fresh captured record. No
financial request is automatically retried. The browser regression must recover
with one explicit reload, retain the note and submit the new captured version.


Normal-motion tests also covered a live refresh that replaces table rows while a
review is open. The original native modal trigger can then be disconnected. The
Finance review now records its row identity and restores focus to the current row
action, falling back to the focusable table region when that row is gone. This is
Finance-owned behavior; the shared dialog spring and other role portals are unchanged.


The short-landscape check measured a 542px payment filter form with 630px of grid
content at 844px viewport width, clipping Search inside the workspace. The Finance
filter row now stacks until the wider breakpoint and uses a shrinkable search
column. Both the root and internal workspace widths are checked after layout has
settled; WebKit receives two animation frames after a viewport resize before the
measurement. The payment workspace is also checked after closing the modal at
844×390, so an inert background cannot hide a layout problem.


### Phase 4 technical result and user handoff — 2026-11-21

**Technical pass complete; Jaycee's hands-on acceptance is pending.** All source
remains local and uncommitted, as he explicitly requested. No push, merge or deployment.

- **250 web tests**, **145 API unit tests**, **161 isolated DB checks** pass.
  DB groups:37 financial workflow/adjustment/reconciliation/refund,22 Finance/reports,
  35 role/membership access,31 GCash evidence and36 related-role/handoff checks.
  All five disposable databases and the restricted RLS test role were removed.
- **37 browser groups** pass, plus 3 other-role read smokes. Actual normal-role browser
  decisions cover Records → assigned Manager → Finance, returns, corrections,
  renewed evidence/approvals, clarification and exactly one final verification.
  Customer credit, SOA and confirmation agree. The final verification audit count is 1.
- Chromium 155,Firefox 141 and WebKit 26 pass viewport, normal/reduced-motion, native
  modal/keyboard/focus-return, document download and guarded print checks. Widths:
  320/393/768/1440; short landscape 844×390; 200% text resizing/reflow. The payment
  workspace fits after the modal closes. Four full-page axe scans report 0 violations
  after the fixes; incomplete/manual checks remain recorded in the raw results.
  This does not establish full WCAG or real screen-reader conformance. Actual
  browser zoom and human assistive-technology acceptance remain user checks.
- Conflict recovery retains the note and submits captured versions 7→8→8; one
  explicit reload accepts fresh evidence and requires a new decision. Failure,
  retry, missing proof, blocked/closed memberships, duplicate evidence, revoked
  access, scoped report/Gcash returns and notification read-state checks pass.
  Browser failure/read-state fixtures intercept writes; real financial mutations
  are confined to the synthetic acceptance and disposable test databases.
- The full optimized build/types passes 72 pages; API types, scoped formatting for
  six edited Finance source files, client credential scan 1781 files/0 findings and
  whitespace checks pass. 35 source/manifest hashes match the final build. Of 82
  pending files backed up at phase start, 74 are byte-identical and 8 have authorized
  changes (six Finance sources and both Finance MDs); the new manual guide is
  accounted for. Backend, other role views, Handler WIP and role manifest are
  unchanged by Phase 4. Git HEAD remains `bf739e0`.

The prior preview's six financial-table fingerprints are unchanged. The synthetic
acceptance DB and its private files are intentionally retained for Jaycee's test;
reserved **PHASE4-MANUAL_READY** and **PHASE4-MANUAL_WORKFLOW** claims remain pending,
with matching synthetic receipts and the intended operational approval stages.
Automated sign-in counters were cleared only in this test DB; authentication limits
were not changed. Own test sessions were logged out; other sessions were not revoked.

Start: <http://localhost:3000/login> → Finance Officer.
[Jaycee's manual test guide](finance-officer-phase4-manual-test.md).
Final evidence: `.local/finance-phase4-20261120/final-result.json`, database/browser/
workflow/recovery/support/connection results, PDF/AX artifacts, hashes and preservation.
The folder retains its start date; final checks finished on 2026-11-21.

Final visuals: [Finance home](../.local/finance-phase4-20261120/chromium-home-dark-1440.png),
[phone review](../.local/finance-phase4-20261120/webkit-review-dark-320.png),
[short-landscape review](../.local/finance-phase4-20261120/firefox-review-short-landscape.png).
These are verified renders, not Jaycee's visual approval.


## Manual QA correction — Ready for Finance theme, 2026-11-21

Jaycee supplied a dark-theme screenshot of `/system/customer-work`, showing pale
queue rows and violet accents. Cause: the Finance-owned copied queue component
still used `bg-white/75`, white hover/empty backgrounds and violet utilities;
existing dark-theme rules did not cover those combinations. Earlier browser
palette checks covered home/payments, missing this separate queue route.

Apply the existing Finance tokens to row surface/border, primary/muted text,
hover/focus, icons/counts/action links, empty/error surfaces and page controls.
Preserve queue data, destinations, order, waiting labels and the coworker layout.
The UX goal is legible eligible work with familiar theme cues; this is a scoped
palette correction using the existing user-expi → ui-design-index dashboard route
and prior Finance design record, with no new gallery direction. Reuse the existing
contrast/focus guidance; verify actual computed colors, contrast, both themes,
hover/keyboard focus and narrow layout on this exact route. No financial writes,
fixture reset or commit. Jaycee's manual test progress must be retained.

Verified: production build including TypeScript and 72 routes; 3 role-isolation
checks; 10 focused browser groups across Chromium, Firefox and WebKit. Actual row,
text, badge, hover and keyboard-focus colors match Finance tokens in both themes
at 1920/1440/768/393/320px. Two axe scans report zero violations. Actual queue
destinations are preserved; empty/error/pagination states use browser-only GET
fixtures. No financial writes, page errors or test-data resets; only the three
check sessions were logged out. Scoped format, client-secret and whitespace
checks pass. All 80 unrelated pending files remain byte-identical; HEAD is still
`bf739e0`. Local 3000 now serves optimized bucket b. Work remains uncommitted,
and Jaycee's manual acceptance is pending.

Evidence: `.local/finance-ready-theme-20261121/browser-results.json`;
[dark desktop](../.local/finance-ready-theme-20261121/chromium-queue-dark-1920.png),
[light phone](../.local/finance-ready-theme-20261121/webkit-queue-light-393.png).
Both renders inspected; these are technical checks, not user visual approval.
