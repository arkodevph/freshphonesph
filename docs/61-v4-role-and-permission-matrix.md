# V4 role and permission matrix

Completed S1 01 documentation on 2026-10-16. The user directed that the supplied files provide the role requirements; use Organizational Structure V4 as the target business model. Existing code differences are implementation work, not a reason to request the same role decisions again.

Sources: [Organizational Structure V4](../../../../../Documents/PDFs/Fresh_Phones_PH_Organizational_Structure_V4.pdf), sections 1–6, and [Basic Website Workflow](../../../../../Documents/PDFs/Fresh_Phones_PH_Basic_Website_Workflow.docx), sections 1–4. The access table below transcribes V4 section 4; the action rules use the more specific role descriptions and workflows. This document records the target; it does not claim the current API already enforces it.

## Roles and reporting relationships

| Business role | Reports to | Required responsibility and scope |
|---|---|---|
| CEO | Executive role | Company-wide financial, operational, personnel, KPI and audit reports; executive approvals. Technical administration is controlled separately. |
| COO | CEO | Supervise all operational departments/officers; operational dashboards, tasks, schedules, authorized approvals and escalated complaints. No final financial verification. |
| Batch Manager | COO | Approved enrollment, assigned batches, Handler assignment, batch tasks, delivery/release monitoring, GC cross-check and operational payment approval. |
| HR & Payroll Officer | COO | Approved/trained personnel enrollment, personnel accounts and authorized roles, HR records, payroll preparation and commission summaries. |
| Records & Monitoring Officer | COO | Confirm prospects, create Batch IDs at eight confirmations, maintain/review batch/member records, check payment entries and forward to Batch Manager. |
| Finance Officer | COO | Actual-funds checks, receipt review, exclusive financial approval/rejection, reconciliation and collection reports. |
| KPI Officer | COO | Necessary personnel KPI information, targets, deadlines, productivity, human evaluations and progress reporting to COO. KPI work does not grant general analytics access. |
| Operations Coordinator & Moderator | COO | Coordinate tasks, recruitment progress, Pioneer Agent activity, coordination updates and operational escalation. |
| CSR | COO | Minimal customer lookup/payment status, support tickets and escalation of unresolved concerns. No financial record edits. |
| Pioneer Agent | Operations Coordinator & Moderator | Assigned Agents, recruitment progress, training/coaching and performance updates. No enrollment/payment editing. |
| Agent | Pioneer Agent | Own recruitment performance, endorsed applicant statuses and commission eligibility. No member enrollment or payment editing. |
| Batch Handler | Batch Manager | Assigned batches/GCs, payment entry and receipt upload, pending verification, balance monitoring and escalation. No enrollment, Batch ID creation or final financial verification. |

Customer remains a separate external role: own membership, schedule, payments, documents, support and notifications under the existing portal policy. It is not one of the twelve staff roles.

## V4 access table

`V` = view; `E` = create/edit; `A` = operational approval; `*` = restricted scope; `—` = no access. Finance's payment approval is the sole final financial verification. A broad table cell does not replace the specific action rules below or grant every action in a module.

| Role | Personnel | Batches | Payments | Tasks / KPI |
|---|---|---|---|---|
| CEO | V | V | V | V/A |
| COO | V | V/A | V | E/A |
| Batch Manager | — | E/A | V/A* | E |
| HR & Payroll | E | — | — | V |
| Records & Monitoring | — | E* | V/A* | E |
| Finance | — | V | V/A | E |
| KPI Officer | V* | V* | — | E |
| Operations Coordinator & Moderator | V* | V* | — | E |
| CSR | — | V* | V* | E |
| Pioneer Agent | V* | V* | — | E* |
| Agent | — | V* | — | V* |
| Batch Handler | — | V* | E* | E* |

## Action permissions

The following action owners come from V4 sections 1, 3, 5 and 6. Unlisted roles receive no implicit permission for these actions. A proposed future capability remains disabled until its workflow and scope checks are implemented.

| Action | Permitted role | Required conditions |
|---|---|---|
| Create the official Batch ID | Records & Monitoring | Eight distinct prospective members confirmed to continue; before official enrollment; unique ID; recorded evidence. No automatic activation. |
| Enroll approved members | Batch Manager | Records-created Batch ID, approved members and applicable capacity/requirement conditions. |
| Activate batch and confirm start | Batch Manager | Required slots and conditions complete; explicit action and start-date confirmation. |
| Assign/manage Handlers | Batch Manager | Own assigned batch/team; preserve assignment history. |
| Record payment and upload receipt | Batch Handler | Current assigned batch and member; capture recorder/evidence; remain pending verification. |
| Review payment accuracy/completeness/duplicates | Records & Monitoring | Submitted entry; record operational decision and forward to Batch Manager. |
| Cross-check payment against official GC | Batch Manager | Assigned batch; Records review available; manual GC check and operational decision. |
| Approve/reject final financial verification | Finance Officer only | Actual funds checked; authorized review chain; versioned atomic decision with reason/audit. CEO and COO cannot use this action. |
| View executive financial/operational reports | CEO, COO | Role-specific reporting fields; recorded/pending money separated from financially verified collections. |
| Prepare collections and reconcile receipts | Finance Officer | Financial work scope, private proof and recorded decisions. |
| Create/update personnel accounts and authorized roles | HR & Payroll | Approved/trained personnel; personnel scope only; no technical-admin self-escalation. |
| Maintain HR/payroll/commission preparation | HR & Payroll | Necessary personnel records, human decisions, existing confidentiality controls and approved preparation rules. No automatic deductions or payouts. |
| Evaluate targets/deadlines/productivity and report KPI | KPI Officer | Necessary personnel performance data; evaluations/progress reported to COO. No Finance approval or broad analytics grant. |
| Coordinate operational tasks and escalations | COO; Operations Coordinator within its scope | COO oversees departments; Coordinator follows assigned work/Pioneer activity and escalates to COO. |
| Track recruitment/train assigned Agents | Pioneer Agent | Assigned Agent team; coaching/training/performance updates. |
| View endorsement progress/commission eligibility | Agent | Own endorsed applicants and own performance/eligibility only. |
| Look up customer/payment status for support | CSR | Minimal fields necessary for the concern; no payment/financial edits. |
| Create/update/escalate complaints | CSR; COO for escalated operational handling | Support workflow, permitted cases and retained resolution history. |

V4 does not assign payment recording to every role with payment visibility. Do not carry the current broad COO/General Manager/Records recording grants forward simply because they already exist. Finance verification and operational review remain different actions.

The Tasks/KPI column covers multiple functions. Derive actual task creation, assignment, submission and evaluation actions from the role's duties: Batch Manager manages batch tasks; Records/Finance create department work; Handler/Pioneer work is restricted; Agent views own work; HR has a view cell; KPI creates evaluations. Do not translate every `E` cell into global task assignment or confidential KPI access.

## Existing role migration specification

These are implementation mappings for the existing vocabulary, not claims that the files name legacy role codes or identify individual users. Verify account identities and preserve IDs/history during S1 02. Do not infer a person's technical administration privileges from their business role.

| Existing code | V4 target | Migration treatment |
|---|---|---|
| `OWNER` | CEO for the business oversight role | Replace the all-permissions business grant. Handle any separately provisioned technical administration capability independently. |
| `COO` | COO | Retain identity; apply V4 action grants and field scope. |
| `GENERAL_MANAGER` | Batch Manager as the V4 operational replacement | Convert the role vocabulary; establish actual batch assignments rather than granting every batch automatically. |
| `HR_PAYROLL` | HR & Payroll Officer | Retain identity; add constrained personnel provisioning and remove unrelated grants. |
| `FINANCE_OFFICER` | Finance Officer | Retain identity; exclusive final verification. |
| `RECORDS` | Records & Monitoring Officer | Retain identity; Batch ID creation and operational review, without enrollment or final financial authority. |
| `ANALYTICS` | Legacy role outside V4 | No automatic conversion to KPI. Preserve existing identity/history, disable legacy broad grants on V4 cutover and list affected accounts for explicit per-account reassignment from recorded staff duties. |
| `CS_HEAD`, `CS_TEAM` | CSR | Normalize customer-service role vocabulary; do not inherit global management rights from the former Head label. |
| `CORE_HANDLER` | Batch Handler | Retain identity and assignments; payment permissions become available only after assigned-payment enforcement is implemented. |
| No matching role | KPI Officer | Add a distinct role with necessary KPI permissions. Existing HR private records are not the KPI dataset. |
| No matching role | Operations Coordinator & Moderator | Add the distinct role and Pioneer reporting scope. |
| No matching role | Pioneer Agent | Add the distinct role and assigned-Agent scope. |
| No matching role | Agent | Add the distinct role with own-endorsement/performance scope. |
| `CUSTOMER` | Customer | Keep separate; preserve client links and own-account isolation. |

This supplies the engineering mapping without pretending the documents provide an employee roster. Any unmapped account is a migration exception to report during rehearsal, not a reason to reopen the documented business roles.

## CEO administration and KPI confidentiality

**CEO:** V4 explicitly provides oversight and executive approvals and explicitly separates technical administration. Therefore `OWNER: permissions` is not a suitable CEO grant. Implement administration with separately controlled capabilities; do not add automatic Finance verification or unrestricted configuration writes to CEO. Existing specifically scoped executive approval workflows can remain where consistent with V4.

**KPI Officer:** V4 explicitly authorizes necessary personnel KPI data and human evaluations. Provide a distinct KPI data scope: staff identity needed for evaluation, assigned targets, deadlines, submission/completion facts, objective timeliness, productivity and relevant evaluation/progress records. This is an implementation interpretation of “necessary” data, not permission to expose all personnel fields or attachments.

Keep salary/payroll details, unrelated disciplinary/HR files and private employment applicant documents behind their existing confidentiality rules. When a shared response mixes KPI and confidential-HR fields, separate its projection and authorization. Do not require the KPI Officer to acquire the current all-or-nothing confidential HR grant just to perform the V4 KPI job, and do not use the new role to bypass that grant for HR material. Preserve existing explicitly approved HR/COO confidential access while separating these datasets.

## Scope and implementation checks

- Match assignment scope on list, detail, search, count, write, document, export and live-event paths. Client-supplied IDs cannot expand scope.
- Technical administration cannot be obtained through HR personnel provisioning or a CEO business role alone.
- Current assignment/role changes revoke stale access. Audited actions retain actor, reason, time and version.
- Payment recording, Records operational review, Manager operational approval and Finance verification use distinct grants/stages.
- Maintain verified-only balances, private receipts, immutable reviewed history and correction reasons.
- Preserve the customer policy and existing extra modules; V4's coarse table is not permission to expose sensitive files or silently delete historical features.

Document-defined role/action requirements are ready for implementation. Actual account migration, permission changes, tests and UAT remain S1 02–07. This matrix does not activate a new role or grant access by itself.

## Implemented conflict removals

2026-10-16: removed `PAYMENT_VERIFY` from the existing Owner role. Finance Officer alone
can verify payments, correct/reverse verified credit, access the Finance receipt-review
queue and receive pending financial-review emails. Existing permission-based review and
adjustment controls follow the revised grant. Owner retains permitted read/report access.
Historical records are unchanged. The remaining role, payment-recording and batch-workflow
changes are still tracked in the sprint and gap list; this removal does not complete them.

Validation: 63 API unit tests, 87 web tests, 77 main PostgreSQL integration tests and
5 reconciliation tests passed. Workspace typechecks, API production compilation,
formatting and changed-file whitespace checks passed. The initial 153-case PostgreSQL
run had five failures: three older test expectations/fixtures were corrected for the new
authority model, and two reconciliation assertions were affected by reused synthetic
duplicate-reference data. The complete main suite and reconciliation suite then passed
on the fresh rerun baseline; the other suites passed in the initial full run. This is
local evidence, not production deployment or named business UAT.
