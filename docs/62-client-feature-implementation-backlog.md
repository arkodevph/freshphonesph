# Client clarifications: feature implementation backlog

Recorded 2026-10-27 from the client's session notes. This is a planning update;
no application features are claimed implemented or tested by this document.

Use these latest instructions over conflicting assumptions in documents 58–61:
COO controls role access, CEO views reports only, Agents can enroll members,
payroll stays in spreadsheets, and deployment and all third-party integrations
are deferred. Other existing requirements remain unless explicitly changed here.
Items marked **Confirm** need a business decision before their dependent behavior
can be implemented. Proposed technical safeguards are identified below.

## Implementation list

| ID | Feature | Required behavior | Completion / unresolved decision |
|---|---|---|---|
| F01 | COO role-access administration | COO Executive grants and manages access to roles. Record who granted or revoked access, the affected account, role and time. Enforce access through the API and reflect it in navigation. | **Confirm:** who initially provisions the COO, whether multiple roles per account are permitted, and restrictions on changing executive access. Do not infer unrestricted access to private HR information. |
| F02 | CEO reports-only access | CEO can view reports and dashboards containing those reports. Remove inherited account administration and operational write privileges. | Verify CEO cannot enroll, upload, review, verify payments or grant access through direct API calls. **Confirm:** whether report export/download is included in viewing access. |
| F03 | Moderator monitoring workspace | Moderator manually monitors overlooked items: missing receipts, incomplete submissions, overdue reviews and unresolved follow-ups. Provide a queue with batch, responsible staff, age and status. | Moderator flags and follows up; this role does not automatically approve records or verify payments. **Confirm:** whether the Moderator may assign tasks or only flag issues. |
| F04 | Handler receipt uploads | Assigned Batch Handler uploads receipts received from members and associates each payment claim with the correct member, batch, amount, date and reference where available. | Show drafts, uploaded proof, submission status and missing items. A receipt upload alone does not change a balance. |
| F05 | Handler GCash statement uploads | Batch Handler uploads a complete GCash transaction-history PDF for the relevant account and reporting period. Finance may request this supporting statement. | Keep the original PDF private and record uploader, period and submission time. **Confirm:** statement frequency, account ownership, password-protected PDF handling and whether statements supplement or can substitute for individual receipts. |
| F06 | Records submission and completeness checks | Records Officer monitors whether each Handler has submitted the expected receipts and statement. Manually review completeness, member/batch associations and potential duplicates. Return incomplete submissions with a reason. | Show expected, received, missing and returned items separately. **Confirm:** what establishes the expected receipt list and when a submission is considered complete. |
| F07 | Batch Manager cross-check | After Records confirms the required receipts are complete, the assigned Batch Manager cross-checks the submission and forwards it to Finance, or returns it with a reason. | Save reviewer, time and exact submitted version. Proposed safeguard: changes to reviewed evidence require renewed review rather than retaining stale approvals. |
| F08 | Finance final verification | Finance Officer performs final verification after the required operational reviews. Only Finance-verified payments affect derived member balances and verified collection reports. | API guards must prevent every other role from bypassing this stage. Record decisions, reasons and evidence. **Confirm:** who may correct returned submissions and whether review/verification is per payment, per submission package, or both. |
| F09 | PDF reconciliation assistance | Proposed enhancement: parse the uploaded GCash PDF locally and suggest matches using reference, amount and date. Surface missing, duplicate, ambiguous and unmatched transactions for review. | **Conditional:** confirm supported statement formats and matching rules. Automatic matching assists Finance; it does not automatically verify a payment. Third-party OCR, bank connections and GCash APIs are deferred. |
| F10 | Monthly / twice-monthly batch collections and earnings reports | Calculate installment-based totals for members in each batch and reporting period. Distinguish scheduled amounts, submitted claims, verified collections, refunds and outstanding amounts. | **Confirm:** whether “earnings” means collections, commission, margin or profit; formula/cost inputs; and whether “bi-monthly” means twice per month or every two months. Until defined, label received money as collections, not profit. |
| F11 | Mid-batch withdrawal and discretionary refund workflow | A member can request withdrawal during installments. Record reason, paid amounts, proposed refund, decision, financial-situation rationale and eventual refund evidence. Preserve the original payment and membership history. | Refunds are manual decisions; do not invent a fixed rate or automatically promise payment. **Confirm:** decision-maker, deductions, approval rules, business-policy wording, payout timing and who records/confirms actual disbursement. Approval and disbursement are separate states. |
| F12 | Enrollment into an ongoing batch | Allow a new member to join an active batch. The agreed payment arrangement determines whether the member follows the remaining batch installments or starts a new installment schedule. | Store join date, agreed total, opening obligation, payment arrangement and schedule without rewriting existing members' agreements. **Confirm:** calculation rules, catch-up payments, release eligibility and whether replacement of a withdrawn member is a separate process. |
| F13 | Eight real members and twelve public slots | Record the stated internal limit of eight actual members and a customer-facing layout with twelve slots, including four placeholders. | **Confirm before implementation:** whether twelve represents display positions or an actual enrollment promise, and what the four slots mean. Proposed transparent design: label placeholders as display slots; never fabricate members, payments or occupancy. Only actual memberships affect totals and capacity. |
| F14 | Manual batch start and schedule templates | Authorized staff manually choose the initial installment date. Provide templates/defaults for start-of-month, end-of-month and the confirmed twice-monthly arrangement. | Preview dates and amounts before confirmation. **Confirm:** who sets/changes the date, exact due days, short-month/weekend rules and how start-date templates relate to payment cadence. Defaults must not activate a batch automatically. |
| F15 | Multiple batch memberships per member | One member can enroll in multiple batches, with a distinct agreement, schedule, balance and status for each membership. Let the member switch between their batches in the portal. | Scope receipts, withdrawals and refunds to the correct membership. Prevent one payment from being counted in multiple batches. **Confirm:** duplicate enrollment in the same batch and any limit across batches. |
| F16 | Agent-assisted member enrollment | Agent can enroll a member, recording the responsible Agent and intended batch. This revises the earlier Manager-only enrollment assumption. | Enforce the Agent's permitted batches and duplicate/capacity checks. **Confirm:** direct enrollment versus endorsement awaiting Manager activation, Pioneer Agent privileges and required documents. |
| F17 | Application / agreement records and printable template | Current intake is a client-completed Google Form. Record the resulting agreement/application and its version. Proposed addition: a printable or downloadable PDF template for offline completion and later upload. | Google Forms synchronization and other third-party connections are deferred. **Confirm:** approved fields, agreement text, signature method, whether the PDF is blank or prefilled, and whether this replaces or supplements the external form. |
| F18 | Spreadsheet-based payroll boundary | Keep payroll calculations and processing in the existing spreadsheets. Do not add a website payroll engine under this request. | **Confirm:** whether a basic authorized report/export is needed to support the existing spreadsheet process. Spreadsheet integration, synchronization and third-party connectors are deferred. |
| F19 | In-app notifications | Provide an in-app notification inbox/bell, following the interaction pattern requested from OCD. Cover submissions, missing evidence, review returns, Manager cross-check, Finance decisions and relevant membership follow-ups. | Reuse existing notification infrastructure where suitable. Scope recipients, link to authorized records and support unread/read states. Email, SMS and external messaging integrations are deferred. Confirm visual details against the OCD reference when implementing. |
| F20 | Agent-based batch numbering | Generate batch numbers from Agent code name plus sequential order: `AB-001`, `AB-002`, etc. Keep codes unique and searchable. | Proposed safeguard: generate numbers atomically and retain historical codes. **Confirm:** sequence per Agent, whether numbering resets, leading-zero overflow, renamed/reassigned Agents and who may issue the official code. |

## Manual review sequence

1. Batch Handler records received payments, uploads receipts and the requested
   GCash transaction-history PDF, then submits the evidence for review.
2. Records Officer checks whether the Handler submitted everything expected,
   reviews completeness and returns missing or incorrect items for correction.
3. Once the required evidence is complete, the Batch Manager cross-checks it.
4. Finance Officer compares evidence and performs final payment verification.
   Optional local PDF matching may suggest matches; Finance retains the decision.
5. Verified payments update the derived membership balance and verified reports.

Moderator monitors overlooked items and follows up across this process. Moderator
monitoring is not an additional financial approval stage. In-app notifications
direct responsible staff to the appropriate work queue. The exact return paths,
correction rights and per-payment versus package review granularity remain open.

## Deferred work

- Deployment, publishing, infrastructure provisioning and production cutovers.
  This instruction supersedes the earlier request to continue Vercel deployment;
  existing PR #14 remains available for later review. No merge or deploy is part
  of this backlog-writing task.
- All third-party integrations, including GCash APIs, Google Forms sync, external
  spreadsheet sync, third-party OCR, email, SMS and messaging connectors.
- Payroll-engine implementation; payroll remains in spreadsheets.

Manual uploads, local PDF processing if approved, printable templates and in-app
notifications can be planned without connecting those external services. Existing
deployments and configured services are not removed by this deferral.

## Suggested implementation order

1. Resolve the open business rules, then align COO/CEO/Moderator/Agent permissions
   and the membership-to-batch model: F01–F03, F12–F16 and F20.
2. Build and verify the manual receipt workflow end to end: F04–F08, with F19
   notifications and assignment-scoped access to evidence.
3. Add the confirmed period-reporting and withdrawal/refund workflows: F10–F11.
4. Add approved printable agreement support and optional local PDF matching:
   F17 and F09. Retain the F18 spreadsheet payroll boundary.
5. Resume deployment and external integrations only after the client lifts the
   deferral; they are not prerequisites for documenting or locally verifying
   the manual workflow.

This order is a recommendation, not a claimed implementation commitment. Older
documents' eight-confirmed-prospect trigger is distinct from the newly stated
eight-member operating limit; confirm whether the trigger still applies.
