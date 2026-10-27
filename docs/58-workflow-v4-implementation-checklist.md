# Fresh Phones PH workflow and implementation checklist

Updated 2026-10-16. This is the sequential work queue for aligning the existing system with the Basic Website Workflow and Organizational Structure V4. Extend the existing NestJS API, Prisma database and Next.js application. Reuse working features and implement the missing operational stages one at a time.

For the shorter feature gap list in business priority order, use [missing features and required revisions](59-missing-features-and-required-revisions.md). Both views track the same work; this document retains the detailed implementation and release tasks.

The main change is the business workflow: Records creates a Batch ID after eight prospective members confirm, the Batch Manager enrolls and activates, Handlers record payments, Records and the Batch Manager perform separate operational reviews, and Finance alone performs financial verification. Facebook and Messenger remain the communication channels.

## Sources and baseline

| Reference | Source |
|---|---|
| W1 | [Basic Website Workflow](../../../../../Documents/PDFs/Fresh_Phones_PH_Basic_Website_Workflow.docx), section 1, hiring |
| W2 | Same DOCX, section 2, Paluwagan enrollment and activation |
| W3 | Same DOCX, section 3, payments |
| W4 | Same DOCX, section 4 and Main Idea, automation and customer portal |
| O1–O2 | [Organizational Structure V4](../../../../../Documents/PDFs/Fresh_Phones_PH_Organizational_Structure_V4.pdf), page 1, operating rules and reporting structure |
| O3–O4 | Same PDF, pages 1–3, twelve roles and access matrix |
| O5 | Same PDF, page 3, Batch ID and enrollment workflow |
| O6 | Same PDF, page 4, payment verification workflow |
| O7–O8 | Same PDF, page 4, priorities and implementation notes |
| Existing scope | [Scope matrix](18-scope-traceability-matrix.md), [handoff](36-scope-handoff.md), [build status](BUILD_STATUS.md), [architecture decision](20-v6-architecture-decision.md) |

Source fingerprints, SHA-256:

```text
Workflow DOCX: 7f9b9ea1cf309cad1543b8bc9323e7ea5d503264ff4289281ee2f2e65883bcab
Structure PDF: 9a28d803b3b6537c3a1a87c0e2939b058b3054abd475f7b70dbc0c5689c171bf
```

Baseline: branch `feature/careers-job-board`, HEAD `c6abb10`, with substantial existing modified and untracked work. Status below reflects the inspected working tree, including uncommitted work. Existing automated results in linked runbooks are historical evidence; application tests were not rerun for this planning document. No production or named business acceptance is claimed.

## Framework and capacity recommendation

Keep **NestJS**. The existing architecture target is **1,000 registered users, 100 concurrent active sessions and 20 requests/second**. These are targets, not measured capacity. One thousand simultaneously active users would be a different load profile.

The repository already uses NestJS guards, domain services, Prisma transactions, Better Auth, Redis Streams and BullMQ. Migrating the HTTP framework would require rechecking these integrations while leaving the workflow gaps unresolved. Hono is a viable lightweight, Web Standards framework for Node.js and other runtimes; its smaller router does not establish a capacity advantage for this database-backed application. See the [official Hono documentation](https://hono.dev/docs/).

Measure representative database, upload, report and live-connection traffic before changing infrastructure. Nest also supports Fastify if profiling later identifies HTTP processing as a material bottleneck; Express-specific integrations would need adaptation. See [Nest performance documentation](https://docs.nestjs.com/techniques/performance). This recommendation does not authorize a framework migration.

## How to work through the queue

- `Reuse` with a checked box means the capability exists in the inspected code and is a starting point. It does not mean V4 acceptance is complete.
- `Change` means existing behavior conflicts with, or only partly covers, the requested workflow.
- `New` means no matching implementation was found in the inspected schema, contracts and domain code.
- `Decision` means the business rule must be settled before its dependent implementation.
- `Verify` means a specific regression, staging or business acceptance check remains.
- `Deferred` means preserve the requirement without implementing it in the current sequence.

Each numbered item is a separate trackable task. Start at 01. Finish one unchecked task, record its changed files and relevant test evidence in the execution log, then move forward. A blocked decision pauses its dependent tasks; independent work may continue. Keep IDs stable. Do not calculate release completion from checked reuse items.

For every implementation task: update contracts/schema only as needed, enforce the rule in the API, connect the UI, test the authorized journey and relevant denied/concurrent cases, then update this checklist. Preserve existing financial records, audit history and private files. Run the relevant checks required by [AGENTS.md](../AGENTS.md). Use signed UAT separately from implementation completion.

## Phase 1 Confirm rules and role migration

| Task | State | Work and completion condition | Source or starting point |
|---|---|---|---|
| [ ] 01 | Decision | Record V4 as the target operating model and resolve differences with existing scope. Explicitly approve the role, finance and enrollment changes below before changing live grants. | O1–O8; [roles](04-roles-access.md) |
| [ ] 02 | Decision | Map all twelve V4 roles to stored roles. Decide whether General Manager becomes Batch Manager; keep Analytics distinct from KPI; map CS roles deliberately; define Operations Coordinator, Pioneer Agent and Agent accounts. Preserve existing user IDs and history. | O3–O4; [contracts](../packages/contracts/src/index.ts), [schema](../apps/api-ts/prisma/schema.prisma) |
| [ ] 03 | Decision | Separate CEO business oversight from technical administration. Decide how existing `OWNER` accounts map to CEO and separately controlled administration; do not grant CEO all permissions by default. | O3 CEO; current `OWNER: permissions` |
| [ ] 04 | Decision | Specify permitted fields/actions for each role and assignment scope, including CSR lookup, KPI personnel data and recruitment progress. Resolve the V4 KPI role against the existing per-person confidential HR policy. | O3–O4; [HR policy](42-confidential-hr-access.md) |
| [ ] 05 | Decision | Specify who confirms prospects, handles withdrawals and replacements, and resolves duplicate prospects. Eight confirmations permit Batch ID creation; define actual batch capacity and the other conditions required for activation separately. | W2; O1, O5 |
| [ ] 06 | Decision | Define payment review order, return paths and receipt requirements. Finance can receive an early receipt alert, but define when final verification becomes eligible after operational reviews. Decide who may correct each field and when reviews must restart. | W3–W4; O6 |
| [ ] 07 | Decision | Confirm minimal HR onboarding and payroll/commission summaries. Existing scope excludes a payroll engine; approve any new preparation scope and calculation rules before building it. No automatic wage deductions or payouts. | W1; O3 HR; [HR actions](47-consequential-hr-action-approvals.md) |
| [ ] 08 | Decision | Define portal join applications and the meaning of “purchase products.” Browsing exists; checkout/payment processing remains outside the existing scope unless separately approved. Also confirm which existing public careers features remain. | W4 Main Idea; [scope boundaries](08-commercials-boundaries.md) |

## Phase 2 Align authentication and permissions

Depends on 01–04. Payment permissions must remain closed until assignment enforcement is ready.

| Task | State | Work and completion condition | Source or starting point |
|---|---|---|---|
| [x] 09 | Reuse | Retain individual accounts, Better Auth sessions, MFA, deactivation, server guards and account audit infrastructure. | [access guard](../apps/api-ts/src/auth/access.ts); [auth runbook](52-authentication-mfa.md) |
| [ ] 10 | Change | Add approved V4 roles and shared labels/contracts; write additive migrations and an explicit mapping for existing accounts. Rehearse rollback and reject ambiguous mappings rather than guessing. | 02; Prisma `Role`, shared `roles` |
| [ ] 11 | Change | Split broad permissions into the required actions: Batch ID creation, enrollment, activation, handler assignment, payment recording, Records review, Manager review, financial verification and constrained personnel provisioning. | O3–O6; current `BATCH_MANAGE`, `CLIENT_MANAGE`, `ACCOUNT_MANAGE` |
| [ ] 12 | Change | Make Finance Officer the only financial verifier. Current Owner inherits `PAYMENT_VERIFY`; remove that implicit authority under the approved V4 mapping. Apply equivalent authorization to corrections/reversals and prevent alternate-route bypasses. | O1, O6; [Finance controller](../apps/api-ts/src/finance/finance.controller.ts), [adjustments](40-payment-adjustments.md) |
| [ ] 13 | New | Store approved reporting/assignment relationships for Batch Managers, Handlers, Operations Coordinator, Pioneer Agents and Agents. Enforce scoped reads and writes, including files, search, counts, exports and live hints. | O2–O4; [existing batch scope](../apps/api-ts/src/records/scope.ts) |
| [ ] 14 | Change | Let HR provision only approved personnel and permitted roles. Prevent executive/admin self-escalation; preserve separately approved confidential access and customer account isolation. | W1; O3 HR; current account endpoints require Owner-held `ACCOUNT_MANAGE` |
| [ ] 15 | Change | Update navigation, landing destinations, forms and role previews to match backend grants. Show each department its authorized work queue and retain drafts on live refresh. | O3–O4; `apps/web/app/system/`, `apps/web/lib/useMe.ts` |
| [ ] 16 | Verify | Test every V4 role and anonymous/inactive/revoked users. Include CEO/COO denied financial verification, Handler denied enrollment/Batch ID creation, Agent denied payment writes, and assignment change revocation. | O4; extend existing authorization integration suites |

## Phase 3 Hiring and personnel onboarding

Depends on 07, 10–14. Recruitment, orientation and training remain outside the website; store only the approved evidence needed for enrollment.

| Task | State | Work and completion condition | Source or starting point |
|---|---|---|---|
| [x] 17 | Reuse | Retain job listings, applicant review, private attachments and existing account creation services where they serve the approved hiring process. | [recruitment](41-recruitment-directory.md); `src/recruitment/` |
| [ ] 18 | New | Add minimal, auditable external orientation/training approval evidence, with approved fields and no unnecessary Messenger transcript collection. | W1; O3 HR |
| [ ] 19 | Change | Give HR a trained-personnel enrollment flow that links approved evidence to an individual account and authorized role; prevent duplicate enrollment and unauthorized activation. | W1; 14, 18 |
| [ ] 20 | New | Assign supervisor/team and employment or agent onboarding status using the approved hierarchy; preserve dated changes. | O2–O3; 13 |
| [ ] 21 | Verify | Walk through external applicant → training confirmation → HR enrollment → correct first login. Check unapproved personnel cannot start work through account-creation bypasses. | W1 |

## Phase 4 Prospect confirmation and Batch ID creation

Depends on 05 and Phase 2. Do not treat the eight-prospect threshold as batch capacity or an activation command.

| Task | State | Work and completion condition | Source or starting point |
|---|---|---|---|
| [x] 22 | Reuse | Keep unique batch codes, existing client records, audit/version infrastructure and batch search. | [schema](../apps/api-ts/prisma/schema.prisma), [records service](../apps/api-ts/src/records/records.service.ts) |
| [ ] 23 | New | Add minimal prospective-member endorsements before official enrollment, with approved source/agent attribution and confirmation/withdrawal history. Do not force prospects into active client records. | O5; 05 |
| [ ] 24 | New | Provide Records with the confirmed-prospect queue and a distinct count of people continuing to join. Handle duplicate submissions and withdrawn confirmations. | O1, O5 |
| [ ] 25 | Change | Restrict official Batch ID creation to Records after the approved eight-confirmation condition. Enforce the threshold, unique ID and one-time prospect association transactionally. | O5; current generic `createBatch` and `BATCH_MANAGE` |
| [ ] 26 | New | Store approved capacity and display confirmed, enrolled, remaining-slot and requirements counts separately. Preserve the originating confirmation evidence. | W2; O5 |
| [ ] 27 | Verify | Test seven/eight confirmations, duplicate prospects, withdrawals, simultaneous Batch ID creation and wrong-role requests. Creating an ID must leave the batch unactivated. | O1, O5 |

## Phase 5 Enrollment and explicit activation

Depends on Phase 4. Resolve how existing issued schedules survive the new activation boundary before changing schedule generation.

| Task | State | Work and completion condition | Source or starting point |
|---|---|---|---|
| [x] 28 | Reuse | Retain client documents/checklists, exact decimal schedules, batch assignments and audited edit/history UI. | [records preview](19-records-typescript-preview.md), [assignments](26-batch-assignments.md), [history](25-record-edit-history.md) |
| [ ] 29 | Change | Give the Batch Manager approved member enrollment under a Records-created Batch ID. Records reviews/maintains permitted fields; Handlers and Agents cannot enroll. | O3–O5; `createClient` currently requires broad `CLIENT_MANAGE` |
| [ ] 30 | New | Record a minimal manual acknowledgement that the member was added to the official GC; define required evidence without integrating Facebook or storing private chats by default. | W2; O5 |
| [ ] 31 | Change | Enforce available slots during enrollment with concurrency protection. Provide withdrawal/replacement handling according to 05 without orphaning payment or schedule history. | O5; current enrollment only checks planned/active status |
| [ ] 32 | New | Show an activation checklist for required slots, documents and other approved conditions, visible to the Batch Manager and Records. | O5; 05, 26 |
| [ ] 33 | Change | Add a separate Batch Manager activation action with start-date confirmation, version checks, audit and idempotency. Block generic status edits from bypassing its conditions. | O5; current batch schema accepts `status` directly |
| [ ] 34 | Change | Align official schedule issuance to the approved activation/start-date rule. Current `createClient` generates schedules at enrollment; protect existing agreements, verified amounts and issued-term locks during migration. | O5; `RecordsService.createClient`, `generateSchedule` |
| [ ] 35 | Change | Let the authorized Batch Manager assign/reassign eligible Handlers, with correct batch access and immediate revocation for removed assignments. | O3 Batch Manager; existing assignment/version mechanism |
| [ ] 36 | Verify | Test enrollment → full checklist → activation → schedule visibility; include overbooking races, incomplete batches, repeated activation, reassignment and existing active-batch migration. | W2; O5 |

## Phase 6 Handler payment entry and receipt upload

Depends on 06, 11–13, 35. Granting Handler payment permissions alone is unsafe: the current Finance service scopes customer reads but returns unrestricted staff payment scope, and payment creation looks up any client ID.

| Task | State | Work and completion condition | Source or starting point |
|---|---|---|---|
| [x] 37 | Reuse | Retain pending payment claims, private receipt storage, optional assistive OCR, duplicate-reference warnings, versioned edits and audited writes. | [Finance service](../apps/api-ts/src/finance/finance.service.ts), [Finance controller](../apps/api-ts/src/finance/finance.controller.ts) |
| [ ] 38 | Change | Scope payment lists, totals, client pickers, exact reads, balance/document reads and duplicates to the Handler's authorized assignments. Avoid exposing unrelated duplicate transaction identities. | O3 Handler; Finance `scope()`; 13 |
| [ ] 39 | Change | Enforce current assignment on payment create/correct/proof upload/read and submission, including guessed IDs and reassignment races. Preserve broader permissions only where approved. | O3–O4; current Handler lacks `PAYMENT_RECORD` and `PAYMENT_READ` |
| [ ] 40 | Change | Build the assigned-batch recording screen: member, date, amount, method/reference and receipt. Keep local drafts; clearly distinguish saved entries, submitted entries and financial verification. | W3; O6; existing Payments components |
| [ ] 41 | Change | Require proof at the approved submission point, or an explicitly approved alternative for an allowed payment method. Define safe retry behavior when entry save succeeds but upload fails. | W3; O6; current proof attachment is optional and separate |
| [ ] 42 | New | Submit an entry to operational review with captured version, recorder, submission time and immutable review history. Prevent accidental duplicate submissions. | W3–W4; O6 |
| [ ] 43 | Verify | Test assigned/unassigned recording and files, revoked assignments, duplicate references, failed uploads, repeated submission and immutable reviewed entries. Handler entry must not change the verified balance. | O4, O6 |

## Phase 7 Records and Batch Manager operational reviews

Depends on Phase 6. Keep operational review progress separate from the existing financial payment status. A completed operational check is never a financially verified payment.

| Task | State | Work and completion condition | Source or starting point |
|---|---|---|---|
| [ ] 44 | New | Add a versioned operational review model with submitted, Records review, Manager review, returned and Finance-ready progress. Record actor, timestamp, decision, reason and reviewed payment/proof version. Final names follow 06. | W3; O6; current `Payment` has only financial status/verifier fields |
| [ ] 45 | New | Give Records a queue to check completeness, accuracy and duplicates; allow reasoned return or submission to the Batch Manager. | O3 Records; O6 |
| [ ] 46 | New | Give the assigned Batch Manager a queue to cross-check against the official GC manually and record a reasoned operational decision. No automatic Facebook verification. | O3 Batch Manager; O6 |
| [ ] 47 | New | Reject skipped, repeated or stale review transitions server-side. Scope exact actions and evidence to authorized departments/assignments and retain all previous attempts. | O6; existing transaction/version patterns |
| [ ] 48 | New | Implement return → correction → resubmission. Material payment/proof changes invalidate affected reviews; never silently overwrite a previous approval. | O6; 06 |
| [ ] 49 | New | Route only eligible records to final Finance decisions. If Finance sees receipts earlier, show the missing operational checks and reject premature verification on the server. | W4 early receipt alert; O6 ordered review |
| [ ] 50 | Verify | Test both review queues, cross-batch denial, stale approvals, evidence changes, returns and attempted stage skipping through direct API requests. Neither operational reviewer can move money. | W3; O4, O6 |

## Phase 8 Finance verification and automatic task routing

Depends on Phase 7. Extend existing task, bell and outbox mechanisms rather than building a second notification system.

| Task | State | Work and completion condition | Source or starting point |
|---|---|---|---|
| [x] 51 | Reuse | Retain atomic versioned financial decisions, verified-only derived balances, immutable Finance adjustments, operational statements and payment confirmations. | [Finance service](../apps/api-ts/src/finance/finance.service.ts), [ledger](../apps/api-ts/src/finance/ledger.ts), [adjustments](40-payment-adjustments.md) |
| [ ] 52 | Change | Show Finance the receipt, payment details and both operational reviews. Finance records actual-funds confirmation or a reasoned rejection/clarification; only Finance can commit final verification. | O6; 12, 49 |
| [ ] 53 | Change | Preserve review history through rejection, clarification, correction and Finance adjustment. Define how new operational review affects existing Finance decisions without rewriting verified history. | O6; 06, 48, 51 |
| [ ] 54 | New | On Handler submission, create one linked Records review task using a durable database write/outbox and a stable deduplication key. | W4; existing work tasks/outboxes |
| [ ] 55 | New | On Records submission, create one assigned Batch Manager review task; resolve or supersede the preceding stage task consistently. | W4 |
| [ ] 56 | New | Route the approved receipt/Finance-ready event to Finance's task dashboard and queue. Tie task completion to the authoritative payment decision; completing a generic task must not verify money. | W3–W4; 06, 49 |
| [ ] 57 | Change | Add approved in-app/email event wording and stage links for returns, resubmission and final Finance outcomes. Recheck recipients after role/assignment changes; preserve retry/idempotency behavior. | W4; [staff email](30-staff-email-delivery.md), [Redis workers](53-redis-events-workers.md) |
| [ ] 58 | Verify | Exercise the whole payment chain with real test PostgreSQL and Redis. Include double decisions, worker restarts, duplicate events, revoked reviewers and failed transactions. No duplicate tasks, credits or private notifications. | W3–W4; O6–O8 |

## Phase 9 Executive reports and operational oversight

Depends on 03–04 and Phases 5–8.

| Task | State | Work and completion condition | Source or starting point |
|---|---|---|---|
| [x] 59 | Reuse | Retain payment/batch collections, internal reconciliation, report filters, CSV/XLSX exports, saved periods and immutable human analysis. | [reports](37-reports-page.md) through [adjustments](40-payment-adjustments.md); [analysis](49-submitted-report-analysis.md) |
| [ ] 60 | Change | Give CEO and COO automatic authorized collection updates after Finance commits. Show pending/operationally reviewed claims separately from financially verified collections. | W3–W4; O3 CEO/COO |
| [ ] 61 | New | Add operational counts for prospects, batch slots, activation readiness, Records/Manager/Finance backlogs and returned entries. Use the approved role-specific fields. | O3, O5–O7 |
| [ ] 62 | Change | Provide COO oversight and escalation/task assignment without final financial verification or implicit access to restricted HR information. | O1–O4; 04 |
| [ ] 63 | Change | Review report/export field access for CEO, COO, Finance, Records, KPI and CSR. Keep personnel KPI and general analytics distinct; avoid private receipt/customer evidence in aggregate exports. | O3–O4; existing single `REPORT_VIEW` gate |
| [ ] 64 | Verify | Confirm dashboard/report/balance/statement agreement after verification and adjustments, including failed decisions. Verify authorized second-screen refresh within the existing five-second target and denied data leakage. | W4; [capacity acceptance](20-v6-architecture-decision.md) |

## Phase 10 Personnel summaries and KPI

Depends on 04, 07 and Phase 3. Payroll/commission preparation requires approved scope and rules; automatic deductions and payouts remain excluded.

| Task | State | Work and completion condition | Source or starting point |
|---|---|---|---|
| [x] 65 | Reuse | Retain task assignment/submission, objective deadline facts, human KPI review, private evidence and separate human HR request/approval history. | [task alerts](28-staff-task-alerts.md), [HR access](42-confidential-hr-access.md), [HR actions](47-consequential-hr-action-approvals.md) |
| [ ] 66 | Change | Give the approved KPI Officer access to necessary performance facts and human evaluations, with a COO reporting journey. Do not map KPI to broad Analytics or silently remove existing confidential restrictions. | O1, O3 KPI; 04 |
| [ ] 67 | New | Provide the approved HR personnel directory and onboarding history, limited to required fields and permitted supervisors. | O3 HR; Phase 3 |
| [ ] 68 | Decision | Approve payroll-preparation inputs, commission eligibility rules, reviewers, visibility and output formats. If excluded from this release, record the deferral explicitly. | O3 HR/Agents; 07 |
| [ ] 69 | New | If 68 approves it, implement human-reviewed preparation summaries with source references, audit and controlled exports. No bank disbursement, automatic wage action or unsupported calculated entitlement. | O3 HR; 68 |
| [ ] 70 | Verify | Run named HR/KPI/COO acceptance for evaluations, privacy, summaries and approval separation. A late task or review must not automatically alter wages or employment. | O3; existing safeguards |

## Phase 11 Agent endorsements and coordination

Depends on 02, 04, 13 and 23. Existing employment applicants are not automatically prospective Paluwagan members.

| Task | State | Work and completion condition | Source or starting point |
|---|---|---|---|
| [x] 71 | Reuse | Retain the agent directory, versioned active status, private recruitment tooling and privacy-limited public agent verification. | [recruitment](41-recruitment-directory.md); [agent controller](../apps/api-ts/src/records/agents.controller.ts) |
| [ ] 72 | New | Link approved Agent/Pioneer personnel accounts to agent records; store Agent → Pioneer → Operations Coordinator supervision, with scoped access and history. | O2–O3; current `Agent` has no user/supervisor link |
| [ ] 73 | New | Give Agents an own-endorsement view and permitted prospect statuses. Recruitment/interviews stay in Messenger; no enrollment or payment writes. | O3 Agents; 23 |
| [ ] 74 | New | Give Pioneer Agents assigned-agent progress plus training/performance updates. Block access to other teams and enrollment/payment actions. | O3 Pioneer |
| [ ] 75 | New | Give Operations Coordinator authorized recruitment/team progress, coordination statuses, follow-ups and escalation to COO. Keep private HR files separately gated. | O2–O4 |
| [ ] 76 | New | Display commission eligibility only from approved rules/evidence or an authorized human decision; distinguish eligibility from payment and link HR preparation if approved. | O3 Agents/HR; 68 |
| [ ] 77 | Verify | Test Agent/Pioneer/Coordinator hierarchy boundaries, reassignment, own-status visibility and denied financial/enrollment actions; retain masked public results. | O3–O4 |

## Phase 12 Complaints customer portal and public content

Depends on 04 and 08; customer-facing financial changes also depend on Phase 8.

| Task | State | Work and completion condition | Source or starting point |
|---|---|---|---|
| [x] 78 | Reuse | Retain support tickets/replies, source tracking, status/resolution, customer isolation, support alerts and the public help entry. | [support alerts](31-support-staff-alerts.md), [public entry](46-public-support-entry.md), [source tracking](48-support-concern-source-tracking.md) |
| [ ] 79 | Change | Give CSR the approved minimal customer/payment-status lookup, ticket handling and escalation to COO. Do not grant payment editing or unrestricted financial records. | O3 CSR/COO; 04 |
| [ ] 80 | Verify | Walk through Messenger complaint → staff ticket/source → escalation → resolution/customer update. Approve categories, response metrics and access scope with named reviewers. | O3 CSR; existing support reports |
| [x] 81 | Reuse | Retain own membership/schedule, verified payment history, document review, release status, notifications, catalog browsing, installment samples, FAQ and sign-in support entry. | [portal](22-customer-portal-policy.md), [launch UAT](23-customer-launch-uat.md), docs 43–46 |
| [ ] 82 | Change | Align portal labels and membership state with the new pre-activation/active batch lifecycle. Never show an operational review as a financially verified payment. | W2–W4; O5–O6 |
| [ ] 83 | New | After 08, add the approved customer Paluwagan application/status journey, reusing prospect endorsements and Records confirmation rather than creating duplicate client/application systems. | W4 Main Idea; 08, 23 |
| [ ] 84 | Decision | Obtain approved device availability, installment terms, process/requirements/FAQ content and Facebook/Messenger contacts. Retain the purchase-scope decision from 08 before adding a purchase journey. | W4; public catalog/FAQ runbooks |
| [ ] 85 | Verify | Run mobile/desktop/keyboard public and portal journeys with two different customers. Verify private files and own financial records stay isolated, including after account revocation. | W4; customer launch UAT |

## Phase 13 Migration capacity and release

Prepare independent infrastructure work earlier where useful; release requires all applicable preceding verification tasks and business decisions.

| Task | State | Work and completion condition | Source or starting point |
|---|---|---|---|
| [ ] 86 | Change | Plan and rehearse migration of roles, reporting relationships, active batches, prospects, existing pending payments and review tasks. Record counts, mappings, file checks and rollback; do not invent historical approvals for old payments. | Phases 1–8; [migration workflow](17-full-scope-workflow.md) |
| [x] 87 | Reuse | Retain local private storage adapters, session/MFA mechanisms, Redis Streams/BullMQ, durable outboxes, shared abuse limits and measured Finance index work. Production acceptance remains open. | docs 51–55; [index evidence](evidence/2026-10-13-finance-index-plans.json) |
| [ ] 88 | Verify | Establish load acceptance criteria and realistic fixtures, then test the documented 1,000-account/100-active-session/20-RPS workload, bursts, live connections, uploads and reports. Record p95 latency, error rate, pool pressure, CPU/memory, queue delay and tested infrastructure. Agree thresholds before declaring a pass. | [architecture capacity target](20-v6-architecture-decision.md) |
| [ ] 89 | Verify | Test two API replicas, assignment/session revocation, reconnects, worker/Redis interruptions and database/storage/provider failures. Separate any 1,000-simultaneous-user request into an explicitly sized capacity target. | docs 52–54; 88 |
| [ ] 90 | Decision | Obtain client-owned deployment accounts, provider/region choices, recurring budget and approved private storage/email configuration. Confirm privacy text, retention, personnel/applicant rules and operating contacts. | [handoff](36-scope-handoff.md), docs 23, 33, 50–53 |
| [ ] 91 | Verify | Provision staging and verify HTTPS/proxy/cookies/MFA, private file access, real-inbox delivery, monitoring, database pooling, backups, restore and rollback against the deployed configuration. Keep secrets outside Git. | 90; existing launch/Redis/abuse runbooks |
| [ ] 92 | Verify | Run named UAT for all twelve staff roles and the customer journey, using the complete hiring, batch and payment chains. Record reviewer, date, result and defects; fix blockers before release. | W1–W4; O3–O8 |
| [ ] 93 | Verify | Reconcile this checklist with BUILD_STATUS, role documentation and scope/handoff records; obtain release sign-off, training, runbooks and account ownership handover. Follow the existing staging → main release process. | [branch flow](24-branch-flow.md); [handoff](36-scope-handoff.md) |
| [ ] 94 | Deferred | Keep assistive AI deferred until funding is available and the user requests resumption. Keep an online payment gateway, official BIR invoicing, automatic wage actions and an autonomous payroll engine outside the current work queue. | Existing scope/2026-10-08 AI deferral; 07–08 |

## First implementation slice

Start with **01–04**, then **10–12** after the approved role mapping is recorded. This establishes who may do each action before opening Handler writes or adding review transitions. The first demonstrable result is an approved V4 role matrix plus an account migration plan and API authorization tests. Keep unrelated existing work intact.

Business questions still open:

1. Does CEO replace Owner as a business role while administration becomes separate, and who controls administrative provisioning?
2. Does Batch Manager replace General Manager, and how should existing Analytics/Customer Service accounts map?
3. What is actual batch capacity, and which conditions beyond eight confirmed prospects are mandatory for activation?
4. Can Finance inspect receipts before both reviews, and which exact event makes final verification eligible?
5. Which roles can correct or return entries, and which changes restart operational reviews?
6. What confidential KPI fields may the new KPI Officer see under the existing separately approved HR policy?
7. Are payroll/commission preparation, customer join applications and purchases included now, deferred, or separately scoped?

## Execution log

| Date | Task IDs | Result and verification | Remaining dependency |
|---|---|---|---|
| 2026-10-16 | Planning baseline | Read both supplied documents; inspected shared role/permission contracts, Prisma models, Records and Finance services/controllers, and current runbooks. Created this ordered checklist. Existing feature tests were not rerun. | Rules and mappings in 01–08; no application implementation performed in this session |
