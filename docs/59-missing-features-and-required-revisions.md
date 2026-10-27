# Fresh Phones PH missing features and required revisions

Updated 2026-10-16. This is the actionable gap list for the existing project, based on **Fresh_Phones_PH_Basic_Website_Workflow.docx** and **Fresh_Phones_PH_Organizational_Structure_V4.pdf**. Work through the sections in the PDF's development priority order. Existing functionality is listed as a starting point rather than as completed tasks.

The [detailed implementation checklist](58-workflow-v4-implementation-checklist.md) retains technical dependencies, migration work and supporting runbooks. This shorter list groups its work into deliverable features; the two documents are different views of the same backlog, not additional scope. Update both when a feature is delivered.

## Sources and task states

- **W1–W4:** [Basic Website Workflow](../../../../../Documents/PDFs/Fresh_Phones_PH_Basic_Website_Workflow.docx), numbered sections 1–4; **W Main:** its final customer portal paragraph.
- **O1–O8:** [Organizational Structure V4](../../../../../Documents/PDFs/Fresh_Phones_PH_Organizational_Structure_V4.pdf), numbered sections 1–8. Roles/access span pages 1–3; batch workflow is on page 3; payment workflow and priorities are on page 4.
- **Revise:** some functionality exists but its roles, scope or behavior must change.
- **Missing:** the required journey/model was not found in the inspected implementation.
- **Confirm:** the documents leave a detail open or conflict with existing approved scope. Resolve that detail before implementing dependent behavior.
- **Verify:** demonstrate the complete revised journey, including denied access and relevant concurrent requests.

Baseline: the current working tree on `feature/careers-job-board`, including existing uncommitted work. Contracts, schema and Records/Finance permissions were rechecked for this list. Other module baselines use the linked implementation runbooks. Existing features have not been retested in this documentation session; these statuses do not claim production acceptance.

## 1 Login roles and access permissions

**Already available:** individual login, sessions, MFA, backend permission guards, account management and audit history. **Gap:** stored roles and permissions do not match the twelve V4 roles.

Evidence: [role contracts](../packages/contracts/src/index.ts), [Prisma roles](../apps/api-ts/prisma/schema.prisma), [access guard](../apps/api-ts/src/auth/access.ts), [confidential HR policy](42-confidential-hr-access.md). Requirements: O1–O4. Detailed checklist: 01–04, 10–16.

- [ ] **G01 — Revise:** Align stored roles, account forms and labels with CEO, COO, Batch Manager, HR & Payroll, Records & Monitoring, Finance, KPI, Operations Coordinator & Moderator, CSR, Pioneer Agent, Agent and Batch Handler. Map existing accounts deliberately; keep customer accounts separate.
- [x] **G02 — Confirm:** Role specification resolved from V4: CEO has business oversight and executive approvals; technical administration is separately controlled and Finance alone verifies money. The legacy Owner-to-CEO migration specification is recorded in [the role matrix](61-v4-role-and-permission-matrix.md). Application changes remain G01/G03/G05.
- [ ] **G03 — Revise:** Split broad permissions into Batch ID creation, enrollment, activation, handler assignment, recording, Records review, Manager review and Finance verification. Match tasks and report access to the V4 matrix, including Finance/Records task creation and Agent read-only work views.
- [ ] **G04 — Missing:** Store the reporting hierarchy and assignment relationships. Restrict records, queues, files, counts, exports and live updates to each role's permitted scope.
- [ ] **G05 — Revise:** Make Finance the exclusive final financial verifier across all relevant endpoints. Update role navigation and test that CEO, COO, Managers, Records, Handlers and Agents cannot bypass their grants through API calls.

## 2 Batch ID member enrollment and activation

**Already available:** unique batch codes, client enrollment, documents, schedules, handler/agent assignment, search and edit history. **Gap:** no eight-confirmed-prospect gate or complete capacity/activation journey.

Evidence: [batch/client models](../apps/api-ts/prisma/schema.prisma), [Records service](../apps/api-ts/src/records/records.service.ts), [assignment runbook](26-batch-assignments.md). Requirements: W2; O1, O3, O5. Detailed checklist: 05, 23–36.

- [ ] **G06 — Missing:** Track prospective members and their confirmation to continue joining, before official customer enrollment. Preserve who confirmed them and any withdrawal; prevent duplicate people from inflating counts.
- [ ] **G07 — Revise:** Let Records assign the official unique Batch ID only after eight prospects are confirmed. Enforce this in the API and retain the confirmation evidence. Creating the ID must leave the batch unactivated.
- [ ] **G08 — Confirm:** Specify actual batch capacity, required documents/conditions, withdrawal/replacement rules and which changes require reapproval. Eight confirmations are the Batch ID trigger, not a documented capacity or activation rule.
- [ ] **G09 — Revise:** Let the Batch Manager enroll approved members under the existing Batch ID. Enforce capacity during simultaneous enrollments; keep enrollment unavailable to Handlers and Agents.
- [ ] **G10 — Missing:** Display confirmed prospects, enrolled members, remaining slots and outstanding requirements separately. Record a minimal manual acknowledgement that the member was added to the official GC.
- [ ] **G11 — Revise:** Add explicit Batch Manager activation with start-date confirmation and validated readiness. Prevent ordinary batch editing from bypassing activation conditions; align schedule issuance without changing existing issued agreements.
- [ ] **G12 — Revise:** Give the assigned Batch Manager handler assignment and authorized batch task/release oversight. Test reassignment, incomplete batches, overbooking, repeated activation and existing active-batch migration.

## 3 Handler payment recording

**Already available:** payment recording, private receipt upload, optional OCR and duplicate-reference checks for currently authorized roles. **Gap:** Handler lacks payment permissions, and Finance service staff scope does not enforce Handler assignments.

Evidence: [payment permissions](../packages/contracts/src/index.ts), [Finance service](../apps/api-ts/src/finance/finance.service.ts), [Finance endpoints](../apps/api-ts/src/finance/finance.controller.ts). Requirements: W3; O3–O4, O6. Detailed checklist: 37–43.

- [ ] **G13 — Revise:** Enforce assigned-batch scope on payment/client lookup, creation, correction, receipt access, totals, balance and document reads before granting Handler payment access. Reject guessed IDs and access after reassignment.
- [ ] **G14 — Revise:** Give Handlers an assigned-batch payment screen with member, amount, date, method/reference and receipt upload. Preserve drafts and show pending status clearly.
- [ ] **G15 — Confirm:** Specify when a receipt becomes mandatory, any allowed alternative evidence and who may correct submitted records. Define recovery when the payment saves but its upload fails.
- [ ] **G16 — Missing:** Add explicit submission for review, with recorder, timestamp and captured payment/proof version. Prevent repeated submissions from creating duplicate entries or review work.

## 4 Payment review Finance verification and task routing

**Already available:** final financial decisions, verified-only derived balances, private proof, rejection/clarification, audit, Finance alerts, tasks and durable notification workers. **Gap:** no separate Records → Batch Manager operational review chain or automatic tasks for those stages.

Evidence: [Payment model](../apps/api-ts/prisma/schema.prisma), [Finance decisions](../apps/api-ts/src/finance/finance.service.ts), [task alerts](28-staff-task-alerts.md), [Redis workers](53-redis-events-workers.md). Requirements: W3–W4; O3, O6, O8. Detailed checklist: 06, 44–58.

- [ ] **G17 — Missing:** Store operational review progress separately from financial payment status. Retain reviewer, time, reason and exact reviewed payment/proof version for every attempt.
- [ ] **G18 — Missing:** Add the Records review queue for completeness, accuracy and duplicates, with reasoned return or submission to the Batch Manager.
- [ ] **G19 — Missing:** Add the assigned Batch Manager cross-check queue and decision history. GC comparison is performed manually; an operational approval cannot financially verify a payment.
- [ ] **G20 — Confirm:** Resolve when Finance receives receipt tasks versus when final verification becomes eligible. The workflow document describes early receipt routing; the organizational document describes the ordered review chain.
- [ ] **G21 — Missing:** Automatically create linked Records, Manager and Finance review tasks at their approved triggers. Deduplicate tasks, route them to current authorized reviewers and close/supersede them consistently.
- [ ] **G22 — Revise:** Show Finance the receipt and operational review history; enforce final-verification prerequisites on the server. Retain the existing atomic Finance decision and verified-only balance calculation.
- [ ] **G23 — Missing:** Implement return → correction → resubmission, with affected approvals invalidated after material changes. Reject skipped/stale stages and preserve earlier reasons and decisions.
- [ ] **G24 — Verify:** Test the whole chain, task retries, revoked reviewers and concurrent Finance decisions. Only Finance confirmation updates verified payment status and collections; generic task completion must never move money.

## 5 CEO COO dashboards and reports

**Already available:** collection/reconciliation reports, filters, exports, snapshots, human analysis and live updates. **Gap:** the new workflow stages and executive access need alignment.

Evidence: [Reports](37-reports-page.md), [collections](38-batch-collection-reports.md), [reconciliation](39-reconciliation-reports.md), [analysis](49-submitted-report-analysis.md). Requirements: W3–W4; O3–O4. Detailed checklist: 59–64.

- [ ] **G25 — Revise:** Refresh authorized CEO/COO collection views after Finance commits. Display pending claims and operational approvals separately from verified collections.
- [ ] **G26 — Missing:** Show prospect counts, enrollment/slot progress, activation readiness and Records/Manager/Finance backlogs, using approved department scopes.
- [ ] **G27 — Revise:** Give COO operational oversight, scheduling/task coordination and escalations while retaining Finance-only verification. Trim report/export fields by role; keep KPI reporting distinct from general analytics.
- [ ] **G28 — Confirm:** List the executive/operational approvals that need website actions. Reuse existing HR approval history where appropriate; define other approval subjects and limits before creating generic approval powers.
- [ ] **G29 — Verify:** Check reports, balances, statements and dashboards agree after verification and adjustments; test live refresh and unauthorized field access.

## 6 Personnel onboarding payroll and commissions

**Already available:** Owner-controlled accounts, confidential HR grants and human HR request/approval history. **Gap:** constrained HR provisioning, trained-personnel enrollment and payroll/commission preparation are incomplete.

Evidence: [account endpoints](../apps/api-ts/src/records/records.controller.ts), [HR access](42-confidential-hr-access.md), [HR approvals](47-consequential-hr-action-approvals.md). Requirements: W1; O3 HR, Agents. Detailed checklist: 07, 14, 18–21, 67–70.

- [ ] **G30 — Revise:** Let HR create/update only authorized personnel accounts and roles. Prevent self-escalation or provisioning technical administrators through the personnel flow.
- [ ] **G31 — Missing:** Record the minimum approved evidence that external orientation/training is complete, then enroll the approved person and assign their role/supervisor. Recruitment, orientation and training remain on Facebook/Messenger.
- [ ] **G32 — Missing:** Provide HR with a personnel/agent onboarding directory and dated changes, limited to approved fields and access.
- [ ] **G33 — Confirm:** Resolve payroll/commission preparation against the existing scope exclusion of a payroll engine. Specify inputs, eligibility rules, human approval and visibility; record any deferral.
- [ ] **G34 — Missing:** After G33 is resolved, add approved payroll/commission records and preparation summaries with source evidence and controlled exports. No automatic wage deductions or payouts.

## 7 KPI and task tracking

**Already available:** tasks, deadlines, submissions, objective late flags, human KPI reviews and private evidence. **Gap:** V4 has a dedicated KPI Officer, while current confidential KPI access is limited to Owner and individually approved HR/COO.

Evidence: [contracts and confidential access](../packages/contracts/src/index.ts), [HR policy](42-confidential-hr-access.md), [HR actions](47-consequential-hr-action-approvals.md). Requirements: O1, O3 KPI, O4. Detailed checklist: 04, 65–66, 70.

- [x] **G35 — Confirm:** V4 authorizes necessary personnel KPI data and human evaluations. [The role matrix](61-v4-role-and-permission-matrix.md) specifies KPI projections separately from confidential payroll/HR/applicant material; existing private HR grants remain protected. Implement and verify this separation in G36–G37.
- [ ] **G36 — Revise:** Add the authorized KPI Officer journey for staff targets, productivity, deadline performance, human evaluations and progress reporting to COO. Do not grant Finance approval or broad analytics access.
- [ ] **G37 — Verify:** Test KPI field privacy, task permissions and COO reporting. A late task or evaluation must not automatically change salary or employment status.

## 8 Agent recruitment monitoring and coordination

**Already available:** an agent directory, masked public agent verification and employment recruitment tools. **Gap:** no logged-in Agent/Pioneer/Coordinator hierarchy or member-endorsement progress journey.

Evidence: [Agent model](../apps/api-ts/prisma/schema.prisma), [recruitment baseline](41-recruitment-directory.md). Requirements: O2–O4, O5. Detailed checklist: 23, 71–77.

- [ ] **G38 — Missing:** Link personnel accounts to Agent records and store Agent → Pioneer Agent → Operations Coordinator → COO relationships with reassignment history.
- [ ] **G39 — Missing:** Give Agents an own-endorsement/status/performance view linked to prospective members. Keep employment applications and Paluwagan member applications distinct.
- [ ] **G40 — Missing:** Give Pioneer Agents assigned-agent recruitment progress and training/performance update submission. Keep enrollment and payment editing unavailable.
- [ ] **G41 — Missing:** Give Operations Coordinator authorized team progress, coordination statuses, follow-ups and escalation to COO. Announcements/communication remain in existing external channels unless website messaging is separately specified.
- [ ] **G42 — Missing:** Show Agents their commission eligibility from approved rules or an authorized human decision. Keep eligibility distinct from actual commission payment and block cross-team access.

## 9 Complaint tracking and escalation

**Already available:** support cases, source tracking, assignment, replies, resolution and notifications. **Gap:** V4 CSR lookup permissions and the named escalation journey need alignment and acceptance.

Evidence: [support alerts](31-support-staff-alerts.md), [source tracking](48-support-concern-source-tracking.md). Requirements: O3 CSR/COO, O4. Detailed checklist: 78–80.

- [ ] **G43 — Revise:** Provide CSR only the approved minimal customer lookup and payment-status fields. Permit support-case creation/updates without financial record edits.
- [ ] **G44 — Revise:** Expose clear escalation to the authorized manager/COO and retain source, assignee, actions and resolution history using the existing support system.
- [ ] **G45 — Verify:** Walk through an external complaint → ticket → escalation → resolution/update; approve categories and response metrics with CSR/management.

## 10 Customer portal and device browsing

**Already available:** own membership, schedules, verified payment history, documents, release status, support, notifications, public catalog, sample installments and FAQ. **Gap:** new batch/review states, member applications and purchase scope.

Evidence: [portal policy](22-customer-portal-policy.md), [catalog](43-public-catalog.md), [installment samples](44-catalog-installment-breakdown.md), [public support](46-public-support-entry.md). Requirements: W Main; W2–W4; O7. Detailed checklist: 08, 81–85.

- [ ] **G46 — Revise:** Align membership/schedule/payment labels with pre-activation, active batches and pending operational reviews. Only financially verified payments count as verified history/collections.
- [ ] **G47 — Missing:** Add the approved customer application-to-join and own-status journey, reusing prospect confirmation and enrollment. Decide signed-in versus public entry and required fields before building it.
- [ ] **G48 — Confirm:** Define “purchase products.” The workflow mentions purchases, while existing scope excludes checkout/payment processing; settle the intended inquiry/order/payment boundary before implementation.
- [ ] **G49 — Revise:** Apply approved process, requirement, device availability, installment and contact content; test portal isolation for two customers and mobile/keyboard journeys.

## Completion and implementation order

The first implementation slice is planned in [Sprint 1 V4 roles and access](60-sprint-1-v4-roles-and-access.md), with stories, acceptance criteria and a proposed ten-working-day sequence.

- [ ] **G50 — Verify:** Rehearse migration of existing roles, active batches, pending payments and assignments. Preserve historical Finance decisions and audit records; do not fabricate earlier operational approvals.
- [ ] **G51 — Verify:** Run the complete hiring, batch and payment journeys with named business reviewers for all affected roles. Record failures, fix them and update both task lists with files, checks and acceptance evidence.

Start with **G01–G05**, followed by **G06–G12**, then **G13–G24**. Complete assignment enforcement in G13 before enabling Handler payment access. Resolve policy questions only for the dependent slice; other independent work can continue.

Deployment provisioning, capacity, email delivery, privacy/retention approval and release handover remain tracked in [the detailed checklist, Phase 13](58-workflow-v4-implementation-checklist.md#phase-13-migration-capacity-and-release). They are not additional document-specific feature gaps. AI remains deferred under the existing project decision.

## Progress log

| Date | Tasks | Result |
|---|---|---|
| 2026-10-16 | Gap baseline | Compared the two supplied documents with current role/schema/Records/Finance code and module runbooks. Listed 51 unchecked gap/decision/verification tasks in business priority order. No application implementation performed. |
| 2026-10-16 | G02, G35; S1 01 | Resolved role specification from the supplied V4 requirements in docs/61. Marked these two specification questions complete; application permissions, projections and migration remain open. |
| 2026-10-16 | G05 partial | Removed Owner's financial verification/adjustment grant and derived Finance-review queue/email authority. Finance remains the sole verifier; complete V4 role migration/navigation and other access work remain open. |
