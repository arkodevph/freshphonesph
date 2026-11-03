# Fresh Phones PH — October 28 afternoon handoff

Date: **October 28, 2026 · Asia/Manila**. Afternoon availability was checked at approximately **6:50 PM PHT**. **Evening update:** GCash history and workflow in-app notifications are integrated into the main local demo; see [GCash](69-gcash-history-main-demo.md) and [notifications](71-workflow-in-app-notifications.md).

**Historical formatted report — October 29, before the review-workspace enhancements:** [Editable Word document](../../../Documents/Reports/Fresh%20Phones%20PH/2026-10-29/Fresh_Phones_PH_Role_Access_and_Work_Status_2026-10-29.docx) · [PDF copy](../../../Documents/Reports/Fresh%20Phones%20PH/2026-10-29/Fresh_Phones_PH_Role_Access_and_Work_Status_2026-10-29.pdf). Local exports contain the full role-access tables, completed tasks with implementation/availability/acceptance status, the full checklist and deferred work.

**GCash reading update:** the main upload now accepts an optional PDF password and reads text/scanned statements into a revision-specific transaction table. 168 automated checks, builds/types and 11 browser groups pass. See [PDF reading and testing](72-gcash-pdf-reading.md).

**GCash feedback update:** the PDF password has a right-edge show/hide eye. File selection, reading, successful submission and duplicate batch/date submissions display dismissible pop-up feedback. See [the current GCash guide](72-gcash-pdf-reading.md#password-visibility-and-upload-feedback). Verified: 119 web tests, optimized build/types and nine browser groups; no extra duplicate period or financial changes.

**Multiple membership update (11:37 PM PHT): #10 is implemented and verified in the main demo**, using the existing Customer login. See [the implementation and test guide](70-multiple-batch-memberships.md).

This document brings together the work from the three Fresh Phones sessions: completed tasks, their purpose, where to test them, current role access, local commits, and remaining work.

## October 29 GCash review workspace — resumed and implemented locally

Jaycee explicitly resumed all four deferred enhancements with “lets do it now.” The main local checkout now contains:

1. A clearer submission queue with review/read status, metadata and a full comparison workspace.
2. The matching original PDF beside transactions on desktop, with page/zoom controls and source-page links. Narrow screens switch between PDF and transactions. Encrypted PDFs unlock temporarily in the browser.
3. Records corrections to date/time, description, reference, debit, credit and balance. Original PDF/extraction stay unchanged; editor, reason, before/after and prior reviews remain visible. Saving reopens review, recalculates checks and rejects stale writes.
4. Three-dot archive/restore controls on each card and in the workspace. Reasons, confirmation and current versions are required. Archival applies to the whole period, preserves evidence and reserves its batch/date key. Permanent deletion remains in the existing controlled retention workflow.

Implementation choices reuse existing Records review access; Finance/COO and Handler evidence reads remain scoped as before. No role grants or payment/balance rules changed. Verified: 452 automated checks, API/web builds/types and ten browser groups with zero page errors. All original data survived the migration, and final financial/member/assignment/source-evidence preservation checks pass. The main local demo is running; user/client acceptance and production deployment remain separate. [Current guide and evidence](73-gcash-review-workspace.md).

## October 30 calendar and numbering integration

At Jaycee's request, **#6 calendar schedules and #15 Agent-prefixed numbering are
now integrated into the main local demo on port 3000**, alongside current roles,
Manager approval, multiple memberships, notifications and the GCash workspace.
Use the normal seeded accounts; a separate preview is no longer needed.
Both migrations preserved every original value in 64 tables. Current access and
Finance-only payment verification remain enforced. See the
[combined guide](74-calendar-numbering-main-demo.md). User/client acceptance and
production deployment remain separate.

**Combined validation:** all **486 automated checks pass**: 86 API unit/reader
checks, 130 web checks and 270 PostgreSQL integration scenarios across 23 isolated
suites. API/web builds and TypeScript pass. Seven browser groups pass with zero
page errors, covering normal role logins, numbered monthly/Bi-monthly creation,
390/320px dark layouts, assignments, Agent submission/Manager approval, Customer
membership schedules, plan/identifier protection, CEO earnings and retained GCash
comparison. A final backup comparison preserves every original row/column in 17
identity, financial, assignment, enrollment and GCash evidence tables. These counts
describe this combined run; do not add the older overlapping feature counts.

## October 30 batch capacity and internal positions

**#5 is implemented and verified in the main local demo:** eight actual memberships, four staff-only visual placeholders, automatic activation at the eighth approved membership, and existing authorized manual activation before full. Internal positions create no accounts, installments, payments or report amounts. The customer portal remains limited to the customer's own records. Existing overcapacity/history is preserved; further additions to full batches are rejected atomically. [Staff workflow, scope and evidence](75-batch-capacity-internal-positions.md).

Validation: 375 distinct automated checks and eight main-demo browser groups passed; API/web builds/types and scoped formatting pass. All 756 original rows checked across 11 financial/member/evidence tables remain unchanged. User/client acceptance remains pending.

## October 30 member withdrawals, replacement and refunds

**#3 and the linked replacement-admission path in #4 are implemented and verified
in the main demo.** Member explanation → assigned Agent review → COO decision;
refund resolution remains separate and discretionary. Dues continue until actual
replacement admission by the assigned Manager. The COO records CEO consultation
and selects unpaid continuation or an explicit new plan. Finance records actual
external refunds separately from incoming installment receipts. Historical
payments remain intact, and replacement preserves current occupancy (a full
eight-member batch stays at eight). [Workflow, roles and verification](77-member-withdrawals-main-demo.md).

**Combined validation: 531 checks pass** (88 API unit/reader, 143 web, 300
PostgreSQL/API scenarios in 26 isolated suites), builds/types, scoped formatting,
nine withdrawal browser groups, seven live main-API checks and five independent
PostgreSQL review groups. The migration preserves all existing values across 65
business tables; final comparison preserves 875 original rows/columns in 17
financial/member/evidence tables. The customer **My membership** batch-count
follow-up also passes seven main-browser groups. [Count/privacy guide](78-customer-batch-participation.md).
Local/uncommitted; user/client acceptance and deployment remain pending.

## October 30 printable application summary (#11)

Jaycee approved the proposed summary export and corrected its entry point to My documents. Customers open **My documents → View application summary** for a captured owned membership, then preview, Download PDF or Print. It contains recorded member/contact/batch details and actual issued plan data; individual membership dates are preserved. The original Google Forms application and signed agreement remain separate. No schema, new dependency, external integration or financial record writes are introduced.

Verification: **43 PostgreSQL/API scenarios** (11 summary +22 multiple membership +10 batch aggregate), **150 web checks**, contracts/API/protected web builds, types and scoped repository formatting pass. Nine read-only main-browser groups pass with zero page errors, including mobile/dark, PDF/print text and recovery/ownership cases; own financial totals are unchanged. Independent YELYAH review and Unicode PDF bounds/extraction checks found no actionable defects. Main API/worker/web are healthy. Source remains local/uncommitted; user/client acceptance and deployment remain separate. [Feature guide](79-printable-application-summary.md).

**#11 placement correction:** Post-move verification: seven focused web checks, optimized web build/types, scoped formatting and three read-only live browser groups pass with zero page errors. My documents placement, removal from My membership, selected-batch changes, 1440/390/320px light/dark layout, captured PDF download and Back to documents were verified.

## October 30 editable website enrollment form (#11 follow-up)

Jaycee confirmed COO/Records editing and Agent→assigned Manager review. The landing **Apply to join** navbar/mobile-menu and Hero actions open a versioned public form; staff can add/edit/delete/reorder custom questions and explicitly save/preview/publish. Original submissions retain their exact questions/answers. Public receipt does not enroll or reserve seats. Agent forwarding links the current Manager approval workflow atomically; current assignment, Finance and CEO boundaries remain enforced. My documents retains the existing printable summary. [Usage, roles, sources and evidence](81-editable-public-enrollment-form.md).

**594 distinct automated checks**, builds/types/formatting and **ten live browser groups** pass with zero page errors. Rehearsal and actual migration preserve69existing tables/4,274rows; post-walkthrough comparison preserves1,019original business rows across21tables. Normal role accounts and a clearly named new local walkthrough batch were used. Main API/worker/web and separate landing preview are healthy. Local/uncommitted; user/client acceptance and deployment remain separate.

## Read this first: current main-demo availability

**The implemented checklist items below are integrated into the main local demo, including #3 and the replacement path in #4.** A checkmark records local implementation and verification. It does not establish Jaycee/client acceptance or production deployment.

- **Main demo, port 3000:** installment earnings; calendar installment schedules; Agent-prefixed numbering; current roles/access and Owner / CEO; Agent enrollment approval; GCash history PDF review; enrollment notifications; multiple batch memberships; withdrawals, replacement admission and separate refunds; My membership batch participation.
- **Historical calendar preview, port 3006:** retained source/evidence for isolated development. Use the main demo for current calendar/numbering testing and role permissions.
- **GCash history is now in the main demo, port 3000:** use its existing one-click Batch Handler and Records logins. The older isolated preview is historical test setup.
- **Historical earnings preview, port 3002:** retained source/evidence; use the main demo's earnings tab for current testing. Historical preview URLs are not a promise that those services are running.

**The existing seeded accounts now handle GCash.** On [main login](http://localhost:3000/login), expand **Preview a workspace**, then choose **Batch handler** to upload/correct or **Records & monitoring officer** to review. No separate fixture credentials are needed. This evening integration supersedes the earlier deferral.

The screenshot showing **Payments & Finance → Scan receipt to prefill** is the existing individual-payment receipt screen. It is different from **GCash history**, which accepts a full PDF covering a batch/date range.

Quick navigation:

- [Full task checklist](#1-complete-october-26-task-checklist).
- [Preview links and sign-in](#2-preview-links-and-sign-in-instructions).
- [Feature purposes and test guides](#3-completed-features-purpose-and-test-guide).
- [Every role's current access](#4-current-access-of-every-role).
- [GCash permissions in the main demo](#5-gcash-permissions-in-the-main-demo).
- [Checks and acceptance status](#7-verification-and-acceptance-status).
- [Local source and commits](#8-local-source-and-commit-handoff).
- [Remaining work](#9-remaining-work-and-decisions).

## 1. Complete October 26 task checklist

| #   | Task and purpose                                           | Current status                                                                                                     | Where it is available                                                                          |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 1   | Deployment and third-party setup                           | Deferred                                                                                                           | No new deployment/integration                                                                  |
| 2   | Scheduled installment earnings for each batch/member       | ✅ Implemented locally; acceptance pending                                                                         | Main demo and earnings/calendar previews                                                       |
| 3   | Member withdrawals and discretionary refunds               | ✅ Implemented and verified locally; acceptance pending                                                            | [Main demo workflow](77-member-withdrawals-main-demo.md)                                       |
| 4   | Joining an ongoing batch                                   | ✅ Replacement path implemented: COO chooses unpaid continuation or restart; other join terms remain case-specific | [Replacement admission](77-member-withdrawals-main-demo.md#replacement-decision-and-admission) |
| 5   | Eight real members plus four staff-only internal positions | ✅ Implemented and integrated locally; acceptance pending                                                          | Main demo; placeholders excluded from customer views and finances                              |
| 6   | Manual first due dates and calendar installment schedules  | ✅ Integrated into main demo; acceptance pending                                                                   | Main demo, existing COO / Records accounts                                                     |
| 7   | Handler GCash history PDFs and Records review              | ✅ Integrated into main demo; acceptance pending                                                                   | Main demo, existing seeded role accounts                                                       |
| 8   | COO business role/access management                        | ✅ Implemented locally; acceptance pending                                                                         | Main demo                                                                                      |
| 9   | Owner / CEO report-only access                             | ✅ Implemented locally; Owner/CEO merge verified                                                                   | Main demo                                                                                      |
| 10  | One member in multiple batches, with separate histories    | ✅ Implemented and verified in main; acceptance pending                                                            | Main demo, existing Customer / Agent / Manager accounts                                        |
| 11 | Application intake and printable summary | **Implemented locally:** editable website form + Agent→Manager review; My documents PDF/Print; signed agreement separate | [Public form](http://localhost:3001/enroll) · [Editor](http://localhost:3000/system/enrollments?view=form) · [Guide](81-editable-public-enrollment-form.md) |
| 12  | Agent enrollment with assigned Manager approval            | ✅ Implemented locally; acceptance pending                                                                         | Main demo                                                                                      |
| 13  | Payroll in spreadsheets                                    | ✅ Provisional v1 implemented and verified; client-format alignment and acceptance remain pending                  | [Template, worked example and guide](80-payroll-spreadsheet-workflow.md)                       |
| 14  | In-app notifications for the agreed client workflow        | ✅ Integrated into main demo; acceptance pending                                                                   | Main bell → Enrollments; existing payment/task alerts retained                                 |
| 15  | Agent-prefixed batch numbering                             | ✅ Integrated into main demo; acceptance pending                                                                   | Main demo, existing COO / Records accounts                                                     |

**12 checklist items are implemented locally in the main demo: #2, #3, #5, #6, #7, #8, #9, #10, #11, #12, #14 and #15. The agreed replacement path in #4 is also implemented. #13 is implemented as a separate provisional spreadsheet package; client-format alignment and acceptance remain pending.**

## 2. Preview links and sign-in instructions

| Preview              | Login                                               | Accounts and intended use                                                                                                                                  |
| -------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main integrated demo | [localhost:3000/login](http://localhost:3000/login) | Expand **Preview a workspace**, then choose the current business role. Use this for current access, Owner / CEO, enrollment approval and earnings.         |
| Calendar / numbering | [localhost:3000/login](http://localhost:3000/login) | Expand **Preview a workspace**. Choose **COO** or **Records** for batch creation; use the existing Agent/Manager/Customer accounts for approved schedules. |
| GCash PDF reviews    | [localhost:3000/login](http://localhost:3000/login) | Expand **Preview a workspace**, then choose **Batch handler**, **Records & monitoring officer**, Finance or COO.                                           |

GCash uses the same main-demo workspace picker and accounts as the other integrated features. The older isolated fixture account file is no longer needed.

Use separate browser profiles/private windows for simultaneous role sessions. Signing into another role in the same browser profile replaces its sign-in cookie.

These links are local to this machine. Running-service availability can change after the snapshot above.

## 3. Completed features: purpose and test guide

### #3 and the linked #4 replacement path — Withdrawals and refunds

**Purpose:** review a member's explanation before deciding withdrawal, while
tracking the refund and actual replacement separately.

**Test path:** normal Customer → **More → Withdrawals** (select a membership),
Agent → **Withdrawals**, COO → **Withdrawals**, Manager → linked **Enrollments**,
Finance → **Withdrawals** for an already paid external refund. Approval keeps dues
active until Manager admission. Continue unpaid transfers no old paid credit;
restart uses explicit new terms. Refund amount/date can remain undecided.
See the [complete guide](77-member-withdrawals-main-demo.md). User/client
acceptance remains pending.

### #2 — Scheduled installment earnings

**Purpose:** show expected installment amounts due in a selected period for every batch and member. Here, “earnings” means **scheduled installments**, not collected payments, verified credit or profit.

**Main test path:** [Main login](http://localhost:3000/login) → **Owner / CEO → Reports → Installment earnings**.

1. Choose the year, frequency and period.
2. Choose **Batch** or **Member** grouping; optionally filter a batch.
3. Select **Calculate earnings**.
4. Use **View members** on a batch to drill down.
5. Compare totals and try CSV/XLSX downloads.

Frequencies are **Monthly**, **Bi-monthly** (days 1–15 and 16–month end), and **Every two months** (Jan–Feb, Mar–Apr, etc.). Jaycee requested the Bi-monthly label in place of Twice monthly. The report's grouping does not change anyone's installment dates.

Only issued schedule rows supply amounts. A member without an issued schedule is identified as unknown and contributes zero; the report does not invent a schedule from the batch price. Totals/downloads cover the full filtered scope, including rows beyond the current 20-row page.

In the main access model, earnings belongs to the **Collections** report family: Owner / CEO, COO, Finance and legacy Analytics have access. KPI and CSR do not gain financial reports through their own report access.

**Availability:** present in the main demo; its earnings tab was opened successfully during this handoff check. The earlier 3002 preview and calendar 3006 preview also contain it.

### #6 — Manual dates and calendar installment schedules

**Purpose:** let staff select the real first installment date and preview calendar dates/amounts before issuing a member's schedule.

**Test path:** [Main login](http://localhost:3000/login) → **COO → Paluwagan Records → New batch**.

1. Choose an Agent and enter the model, contract price, installment count and batch start date.
2. Select **Installment frequency** and **First installment due date**.
3. For monthly plans, choose **Same day of every month** or **Last day of every month**.
4. Try the first-day, 15th and month-end shortcuts, and inspect the schedule preview.
5. Create the batch. An eligible unissued batch can also be edited through its record editor.

The selected first due date is installment 1. Monthly dates follow the calendar, including short months and leap years. Bi-monthly alternates between the 15th and actual month end. Weekly scheduling remains available. The preview and server use the same date/centavo calculation; the last installment retains any rounding remainder.

Already-issued schedules and existing payment history are preserved. Existing batches without the new policy retain their old fixed intervals and display an existing-plan label. Schedules or payments lock financial plan terms; unrelated status edits retain the saved policy.

**Availability:** main demo, using current role permissions and normal seeded accounts. The earlier isolated preview is historical. [Current integration/test guide](74-calendar-numbering-main-demo.md).

### #7 — Full GCash history PDF upload and Records review

**Purpose:** retain a complete GCash history PDF for a batch and covered dates, let Records review its completeness, and preserve corrections/history.

**Upload path:** [Main login](http://localhost:3000/login) → **Preview a workspace → Batch handler → GCash history** ([direct page](http://localhost:3000/system/gcash-history)).

1. Choose the assigned batch and enter **History from** / **History through**.
2. Choose **Full GCash PDF**, optionally add a Handler note, then **Submit PDF to Records**.
3. Use the same main workspace picker to sign in as **Records & monitoring officer** → **GCash history → Review submission**.
4. Choose **Reviewed** or **Needs clarification**, enter the required review note, then save.
5. If clarification was requested, return as Handler → **Submit corrected PDF**.
6. Open **PDF history** to inspect/download the retained original and corrected revisions.

New uploads are read automatically. Enter **PDF password (if required)** when needed; the password is used only for the current upload and is never stored. Use **Open submission** / **Review submission** on a period or inside Records review. History preserves a separate table for each corrected revision. Text is extracted directly when available; scanned pages use Tesseract, with uncertain results flagged. The original encrypted file remains unchanged. Older uploads remain reviewable without an extracted table.

PDFs are limited to 10 MB and 20 pages, with at most 1,000 extracted transactions. Current assignment, role and version checks run in the API. Failed submissions retain drafts; stale/concurrent decisions conflict instead of silently overwriting another review. A user cannot review their own upload. Reassignment removes the previous Handler's access to the batch's evidence.

Records review **does not verify a payment or change a balance**. Finance can read evidence; only the existing Finance payment actions change verified credit. CEO, customers and unrelated staff cannot read these PDFs.

**Availability:** integrated into the main demo. The current seeded Batch Handler and Records accounts expose GCash history directly. Synthetic `ACCESS-DEMO-001` examples support manual testing; the original isolated fixture credentials are unnecessary. See [main-demo integration](69-gcash-history-main-demo.md).

### #8 — COO role/access management

**Purpose:** give COO control over business staff accounts, roles, reporting relationships and operational assignments, with server-enforced limits.

**Test path:** [Main login](http://localhost:3000/login) → **COO → User Management** ([direct page](http://localhost:3000/system/team)).

- **Add staff account** shows the current business-role choices, including one Owner / CEO choice.
- Manage an existing account to review its role, hierarchy and eligible Agent-profile links.
- Use **Paluwagan Records** assignment controls for batch Manager/Handler/Agent assignments as allowed by the current role.
- Confirm another role cannot open User Management merely by typing its URL.

COO cannot provision technical administrators, change its own access, self-grant confidential HR access or finally verify money. Changes are versioned/audited and relevant access/session changes require fresh sign-in. Real team rosters were not guessed; the main demo includes clearly synthetic walkthrough assignments such as `ACCESS-DEMO-001`.

**Availability:** main demo, with the current Owner / CEO follow-up included.

### #9 — Owner / CEO report-only access and role consolidation

**Purpose:** provide executive visibility without operational, personnel-administration or financial-verification powers.

**Test path:** [Main login](http://localhost:3000/login) → **Owner / CEO → Dashboard / Reports** ([reports](http://localhost:3000/system/reports)).

Read charts/reports and download allowed exports. Confirm User Management, operational batch/payment screens, report authoring and payment verification are denied.

Jaycee corrected the earlier distinction: **Owner and CEO are one business role**, displayed **Owner / CEO**, with canonical code `CEO`. Legacy `OWNER` inputs normalize to CEO. Existing people/accounts were not combined or deleted; credentials and history were retained.

Technical maintenance now has a separate internal `SYSTEM_ADMIN` code. It is not a business Owner role, is not a COO-provisionable choice, and no technical administrator was automatically created.

The executive charts and client-portal-style layout were earlier completed work carried into today's main preview; they are not counted as additional October 26 checklist items.

**Availability:** main demo. This verified consolidation supersedes older notes saying the Owner / CEO follow-up was still under verification.

### #10 — One member, multiple batch memberships

**Purpose:** let one member join several batches through the same identity and Customer login, with separate installment schedules, payments, balances, documents, releases and support histories.

**Main test path:** [Main login](http://localhost:3000/login) → **Customer → Viewing batch**. The existing demo Customer has its original membership plus synthetic **MULTI-DEMO-A** and **MULTI-DEMO-B**, with independent PHP 12,000 and PHP 6,000 plans.

1. Select A and B and compare their unit, schedule, balance and payment pages. Selection stays in the current tab across portal navigation; another tab can select a different membership.
2. Open **Verified payments → Statement of account**, including in a new tab, and download the PDF. Its batch and figures must match the selection. Payment-confirmation links also carry their membership.
3. As **Agent → Enrollments → Find an existing member**, search the demo Customer, select the existing profile, choose another assigned open batch and submit for approval.
4. As the assigned **Batch Manager → Enrollments**, review and approve. Submission alone creates no membership or schedule; approval creates the new membership and its own plan.
5. Return as Customer: the approved batch appears under the same login. Existing schedules, payment IDs and verified credit remain with their original memberships.

The browser walkthrough has already approved synthetic batch B. To repeat enrollment, use another assigned batch the member has not joined; duplicate enrollment is deliberately rejected. Agent searches remain inside current assignment scope.

Name, contact email and phone belong to the shared member profile. Records/COO can update them across authorized memberships; a Manager cannot change shared identity in a batch outside its scope. Batch status, release status and financial histories remain independent. Existing people are never automatically merged by matching names, phone numbers or emails, and another portal login is unnecessary.

The API validates membership ownership per request and preserves the original account link. Account security and notice acknowledgments stay available even if a selected membership is invalid; the picker can recover to an owned batch. Finance-only verification is retained. Shared-profile erasure cannot run incidentally through one membership; the retention checks preserve financial facts and the original activity-age policy.

**Availability:** main demo at port 3000, including the integrated calendar schedules and numbering as of October 30. The linked #4 replacement path is now implemented: explicit unpaid continuation or restart, without transferring prior paid credit. Other ongoing-join terms remain case-specific.

### #12 — Agent enrollment with assigned Manager approval

**Purpose:** let an Agent submit a member for enrollment while requiring an assigned Batch Manager's approval, with COO oversight.

**Submit path:** [Main login](http://localhost:3000/login) → **Agent → Enrollments** ([direct page](http://localhost:3000/system/enrollments)).

1. Select an assigned open batch, enter the member's name/phone and submit **for approval**.
2. Submission creates a request, not an enrolled member or installment schedule.
3. Sign in as the assigned **Batch Manager → Enrollments**.
4. Enter a **Review reason** and choose **Approve enrollment** or reject.
5. Return as Agent and refresh to see the saved status. COO can oversee/review through Enrollments.

Approval creates the member and schedule atomically. Repeated decisions do not create duplicate members; stale/competing decisions conflict. A submitter cannot approve their own request. Requests and review visibility follow current assignment scope.

Operations Coordinators and Pioneer Agents have scoped progress visibility through their hierarchy; they do not become enrollment approvers. Records maintains records but does not directly enroll members under this new workflow.

**Availability:** main demo. The synthetic `ACCESS-DEMO-001` batch supports the seeded Agent → Manager walkthrough. The completed #5 capacity rules and the #3/#4 replacement handover also use this approval boundary.

### #15 — Agent-prefixed batch numbering

**Purpose:** generate a stable batch number from an Agent's code with a continuous sequence, rather than asking staff to type a batch code.

**Test path:** [Main login](http://localhost:3000/login) → **COO → Paluwagan Records → New batch → Choose Agent → Create batch**.

The server generates identifiers such as `AB-001`, `AB-002`, and so on. The sequence belongs to the original numbering Agent, does not reset by month/year, and grows past three digits. Reassignment changes the current Agent but preserves the generated identifier and numbering ownership. Existing batch codes/history are preserved; used legacy matching numbers are skipped.

The actual assigned code appears after successful creation. Failed/rolled-back creation does not consume a number. Generated identifiers are read-only in normal record editing.

**Availability:** main demo. Integration preserves the current `BATCH_CREATE` restriction; Batch Managers retain their current operational access without gaining creation. Original source/checkpoints remain historical references. [Current integration/test guide](74-calendar-numbering-main-demo.md).

### #14 — Workflow in-app notifications

**Purpose:** surface current enrollment work and decisions in the existing staff bell, alongside the existing payment, task, Support and account alerts.

**Availability:** integrated into the **main demo, port 3000** with the normal seeded workspace logins. No separate preview account or database is needed.

**Test path:** [Main login](http://localhost:3000/login) → **Agent / Batch Manager / COO → notification bell → Enrollments**.

1. As **Agent**, submit a clearly synthetic member to an assigned batch through **Enrollments**. `NOTIFY-DEMO-001` is the clearly labeled notification walkthrough batch.
2. In a separate browser profile/private window, sign in as its **Batch Manager**. Open the bell → **Enrollments**. **COO** also sees pending review work for oversight.
3. Click the alert. It opens the exact request, even when that request is older than the first list page. **View all requests** returns to the full list.
4. Approve or reject using the existing required review reason. Reading an alert alone does not approve enrollment.
5. Return to the **Agent** bell. The approved/rejected outcome appears; pending reviewer work is retired.
6. Try **Unread only**, opening an outcome and **Mark all as read** in the Enrollments filter. Reads are per recipient and selected type; tasks, payments and other people's receipts remain independent.
7. With authorized COO assignment controls, move a batch to another eligible Manager. Pending alerts follow the current assignment, including a new Manager who had no original notification row.

Owner / CEO remains report-only, without operational alerts. Other staff do not acquire enrollment access. Applicant contact details and review notes remain on the authorized request screen rather than in bell text. Existing generic notification reads and live hints also hide enrollment records after access is lost.

The main browser check completed **Agent submission → Manager notification → exact request → approval → Agent outcome/read controls**, plus COO, Finance/CEO boundaries, light/dark and 320/390px checks. One clearly synthetic pending example and one approved example were retained for manual testing. No payment or verified credit was created by this walkthrough.

The event/recipient matrix, current-assignment/read behavior and manual tests are documented in [71-workflow-in-app-notifications.md](71-workflow-in-app-notifications.md). This task adds no schema migration or external notification integration. Future unimplemented business stages need their own agreed notification events.

## 4. Current access of every role

**This table describes the current main demo on port 3000.** The separate calendar and original isolated GCash builds use older baselines. Their permissions must not overwrite this table during integration. Private GCash access is listed separately in section 5.

| Role / current code                                               | Purpose and permitted work                                                                                                                                                                       | Where to open it in the main demo                                                                                                          | Important limits                                                                                                                                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner / CEO** — `CEO`                                           | Executive dashboards; read/export all five report families and saved analysis; own-account security                                                                                              | Dashboard; Reports                                                                                                                         | Report-only. No operational writes, report authoring, role administration or payment verification.                                                                                          |
| **Chief operating officer** — `COO`                               | Business accounts/roles; operational records; Agent/team/batch assignments; enrollment oversight/review; support/recruitment job management; tasks; all report families; read GCash PDF evidence | User Management; Paluwagan Records; Clients; Agents; Personnel; Agent network; Enrollments; Reports; operational workspaces; GCash history | No final payment verification or new payment-claim recording. No technical-admin provisioning or self-access changes. Confidential HR access needs a separate grant.                        |
| **Batch manager** — `BATCH_MANAGER`                               | Manage assigned batches/members/documents; approve enrollment; assign Handlers within its team; monitor payments; assign scoped team tasks                                                       | Paluwagan Records; Clients; Enrollments; Payments & Finance; Tasks & KPI; existing catalog workspace                                       | Current assigned batches/team only. No new Batch ID creation, payment recording, final verification or COO role administration.                                                             |
| **HR & Payroll officer** — `HR_PAYROLL`                           | Minimal personnel directory; recruitment job management; personal tasks                                                                                                                          | Personnel; Recruitment; Tasks & KPI                                                                                                        | Private applicant/HR files and HR action workflows need an explicit confidential grant. Payroll stays in spreadsheets. HR role-grant delegation is not decided.                             |
| **Records & monitoring officer** — `RECORDS`                      | Create Batch IDs; maintain batches/client records; Agent directory; client documents and requirement review; payment monitoring; scoped task assignment; full GCash PDF review/clarification     | Paluwagan Records; Clients; Agents; Payments & Finance; Customer work; Tasks & KPI; existing catalog workspace; GCash history              | No payment-claim recording, direct member enrollment, Handler assignment, final verification or business-role administration. GCash PDF review does not verify payments or change balances. |
| **Finance officer** — `FINANCE_OFFICER`                           | Review payments/receipts; final verification, corrections/reversals; collection/reconciliation reports; department tasks; read GCash PDF evidence                                                | Payments & Finance; Reports; Paluwagan Records; Clients; Customer work; Tasks & KPI; GCash history                                         | No new claim recording, personnel account administration or Records GCash review. Verified credit changes remain Finance-only, atomic and audited.                                          |
| **KPI officer** — `KPI_OFFICER`                                   | Minimal personnel directory; task facts, targets and deadlines; human KPI evaluation; task assignment and task reports                                                                           | Personnel; Tasks & KPI; Reports → Tasks                                                                                                    | Task facts do not grant unrestricted private task bodies/files. No confidential HR/applicant/payroll records or financial reports. No automatic wage deductions.                            |
| **Operations coordinator & moderator** — `OPERATIONS_COORDINATOR` | Assigned Pioneer/Agent hierarchy, recruitment progress, minimal personnel directory and scoped tasks                                                                                             | Agent network; Personnel; Enrollments for scoped progress; Tasks & KPI                                                                     | No member/payment editing or enrollment approval. Progress visibility follows the assigned hierarchy.                                                                                       |
| **Customer service representative** — `CSR`                       | Support/inquiries; minimal customer lookup with payment status; personal tasks; support reports                                                                                                  | Customer Service; Device inquiries; Customer work; Tasks & KPI; Reports → Support                                                          | Lookup does not expose payment amounts or receipt files. No financial editing/verification or financial reports.                                                                            |
| **Pioneer agent** — `PIONEER_AGENT`                               | Own assigned Agents, recruitment progress, minimal team directory and scoped coaching tasks                                                                                                      | Agent network; Personnel; Enrollments for scoped progress; Tasks & KPI                                                                     | Own hierarchy only. No enrollment approval, payment editing or role administration.                                                                                                         |
| **Agent** — `AGENT`                                               | Own linked Agent profile/network, assigned open batches, enrollment submission/status, assigned-task reading                                                                                     | Agent network; Enrollments; Tasks & KPI                                                                                                    | Cannot approve enrollment, record/verify payments or manage roles. Assigned tasks are read-only; enrollment needs review before it takes effect.                                            |
| **Batch handler** — `BATCH_HANDLER`                               | Current assigned batches/members/schedules/balances; record pending payment claims; upload/correct receipts; see saved Finance results; personal tasks; full GCash PDF upload/correction         | Paluwagan Records; Clients; Payments & Finance; Tasks & KPI; GCash history                                                                 | Assignment-scoped. No enrollment, role management or final financial verification. Whole-history GCash PDFs are available in the main demo under GCash history.                             |
| **Customer** — `CUSTOMER`                                         | Own batch memberships with separate schedules, payment histories, documents, support and notifications                                                                                           | Customer login → `/portal` and its sections                                                                                                | Own linked member and selected batch membership only. No staff workspace or other customers' data. Payments still happen externally.                                                        |
| **Analytics (legacy)** — `ANALYTICS`                              | Existing report access/authoring for all five report families; personal tasks                                                                                                                    | Reports; Tasks & KPI                                                                                                                       | Retained compatibility role, excluded from new business-account choices. Not automatically converted to KPI Officer; reassignment remains undecided.                                        |
| **System administrator (internal)** — `SYSTEM_ADMIN`              | Explicit technical-maintenance permissions; existing maintenance/retention and access workflows                                                                                                  | Provisioned internal staff workspaces, including Retention & deletion                                                                      | Not the business Owner / CEO. Excluded from COO provisioning and ordinary business team scope. No automatic seeded administrator. Cannot finally verify payments.                           |

**Withdrawal module:** Customer submits/reads only the selected owned membership;
current assigned Agent forwards and proposes replacements; COO decides withdrawal,
refund and consulted replacement terms; assigned Manager reads the case/terms and
admits the replacement through enrollment; Finance records actual external refund
payments. System administrator has support reads without business decisions or
payouts. CEO remains report-only. Records and Handler payment access does not grant
withdrawal decisions or refund recording.

### Scope and confidentiality rules

- API permissions are enforced independently of hidden buttons/menus. Direct URLs, guessed IDs, private files, balances, history, task views and live events follow role and current assignment.
- Handler scope is the current assigned batch. Manager scope is its assigned batches/team. Agent, Pioneer and Coordinator visibility follows their linked, active hierarchy.
- COO must enter actual people, Agent-profile links and Manager/Handler assignments; synthetic demo assignments are not a real roster.
- Confidential HR access is a separate, audited grant for eligible HR/COO accounts, with a reason/version and fresh sign-in. No self-grant. Consequential HR actions keep their separate approval process.
- Public catalog ownership remains undecided. Existing administrator/COO/Records/Manager catalog grants were preserved; their presence is not a newly confirmed ownership decision.

### Report access

| Role                          | Report families                                       | Read/export             | Author/save analysis       |
| ----------------------------- | ----------------------------------------------------- | ----------------------- | -------------------------- |
| Owner / CEO                   | Payments, Collections, Reconciliation, Tasks, Support | Yes                     | No                         |
| COO                           | All five                                              | Yes                     | Yes                        |
| Finance                       | Payments, Collections, Reconciliation                 | Yes                     | Yes, within these families |
| KPI Officer                   | Tasks                                                 | Yes                     | Yes, within Tasks          |
| CSR                           | Support                                               | Yes                     | Yes, within Support        |
| Analytics (legacy)            | All five                                              | Yes                     | Yes                        |
| Internal System administrator | All five under maintenance permissions                | Yes                     | Yes                        |
| Other roles                   | No general staff Reports workspace                    | No general report grant | No                         |

Installment earnings is part of **Collections** in the main demo. These report-family limits cover direct reads, exports, snapshots, analysis and history.

### Legacy role names

| Older code/name      | Current business meaning         |
| -------------------- | -------------------------------- |
| `OWNER`              | `CEO` — Owner / CEO, report-only |
| `GENERAL_MANAGER`    | `BATCH_MANAGER`                  |
| `CS_HEAD`, `CS_TEAM` | `CSR`                            |
| `CORE_HANDLER`       | `BATCH_HANDLER`                  |

The role migrations preserve identities, credentials, links and financial history, record audit evidence and revoke old sessions where required. Old account names such as **Demo Core Handler** may remain display names; they do not create a second current role. Owner/CEO consolidation did not merge people or delete accounts.

## 5. GCash permissions in the main demo

| Current main account/role      | GCash access                                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Assigned Handler               | Upload a full PDF; read own currently assigned batch evidence; correct after clarification; inspect retained history |
| Records                        | Read/download; mark Reviewed or Needs clarification with a note; no self-review                                      |
| Finance                        | Read/download evidence; no Records review action                                                                     |
| COO                            | Read evidence in this slice; not the Records reviewer                                                                |
| CEO, Customer, unrelated staff | No private GCash access                                                                                              |

The main API and workspace policies now include `GCASH_HISTORY_READ`, `GCASH_HISTORY_UPLOAD`, and `GCASH_HISTORY_REVIEW`, mapped to current Batch Handler/Records/Finance/COO roles. Assignment scope and Finance-only verification are preserved. Owner / CEO remains report-only; internal `SYSTEM_ADMIN` keeps its existing maintenance policy and is not a seeded business role.

## 6. Workflows to keep separate

1. **Enrollment:** Agent request (new or authorized existing member) → assigned Batch Manager review, with COO oversight → approved batch membership and schedule.
2. **Money:** Handler records an external payment claim/receipt → Finance verifies or corrects it → verified credit changes the derived balance.
3. **GCash evidence:** Handler submits a full PDF → Records reviews/requests clarification → Handler supplies a retained correction if needed. This does not move money.
4. **Account access:** COO administers another business staff account within allowed roles/assignments → audited access changes and fresh sign-in where required.
5. **Payroll:** provisional spreadsheet workflow v1 is implemented. [Blank template, fictional worked example and guide](80-payroll-spreadsheet-workflow.md) include preparation, supported adjustments, review/approval records and separate actual-payment records. Eighteen synthetic calculation scenarios / 84 calculated assertions and 13 cached-example checks pass, with structural/visual checks. Per Jaycee’s direction, build uses documented working assumptions now; map the client’s format and company-specific rules later. Excel/Sheets platform acceptance is separate. Payroll remains spreadsheet-based.

The current #5 capacity/full activation and #3/#4 replacement-admission rules are implemented as described above. Payment verification remains Finance-only.

## 7. Verification and acceptance status

| Slice                             | Recorded engineering checks                                                                                                              | Practical boundary                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| #2 scheduled earnings             | 126 automated checks; types/build, ten browser groups, exports, pagination, SQL comparisons and mobile/error cases                       | Counts from the feature's isolated validation; main earnings tab additionally opened during this handoff             |
| #6 calendar schedules             | 302 automated checks; types/build/format; nine browser groups; migration/history preservation; final origin/cookie/mobile smoke          | Separate calendar database/preview; existing schedules/payments preserved                                            |
| #7 GCash PDFs                     | 202 automated checks; types/build/format; seven browser groups; retained byte-exact PDFs, conflicts, authorization, SQL/migration checks | Originally isolated; now integrated in main with existing seeded accounts; review leaves financial figures unchanged |
| #8/#12 role/enrollment foundation | 370 automated checks; types/build/format, migration preservation, 14 role previews and Agent → Manager browser walkthrough               | Foundation results; later Owner / CEO checks below supersede the earlier role snapshot                               |
| Owner / CEO follow-up             | 375 automated scenarios: 185 PostgreSQL integration, 68 API unit, 109 web, 13 Redis; three final browser groups                          | One optional Redis interruption scenario skipped; no identities/history lost                                         |
| #15 numbering                     | 260 automated checks; types/build/format, concurrency/rollback/legacy SQL cases and responsive browser checks                            | Separate numbering slice; available with the calendar preview prerequisite                                           |

**Do not add these counts together:** feature validations overlap and were performed on different source snapshots. They are not one combined end-to-end acceptance run.

**Evening GCash integration validation:** 228 automated checks passed (44 PostgreSQL integration, 68 API unit, 116 web), API types/build and optimized web build/types. The normal seeded role buttons and full PDF clarification/correction/review flow were browser-tested. Existing data in all 59 original tables was compared against the backup; original rows/columns were preserved. GCash now runs on port 3000 with the current role map. The membership migration and #10 workflow are now verified; see the membership validation below.

**Evening notification validation:** **375 isolated regression checks passed**: 68 API unit, 109 web and 198 PostgreSQL integration scenarios. The long integration process was interrupted after 173 passing scenarios; its remaining 25 passed in a persistent job, with coverage reconciled against all 198 source test names. On the combined main source, notification/role-access/CEO checks pass **28/28**, including the current membership and GCash migrations in a separate test database. API types/build, optimized web build, scoped formatting and document checks pass. Five real seeded-role browser groups and final built-preview checks passed, with zero page errors on the successful checks. Four small-fixture SQL plans were captured; production load acceptance is separate. The combined/focused/browser counts overlap and must not be added as distinct scenarios.

Jaycee/client acceptance is still pending. The October 30 combined run above verifies the current source and main-demo workflows; production-scale acceptance and deployed-environment testing remain separate.

Historical October 28 availability check: the main Owner / CEO earnings tab and four then-current login pages were opened. The October 30 integration supersedes the separate calendar/numbering test paths; use the main workspace picker for current tests.

**Evening #10 validation:** all **22 focused PostgreSQL scenarios** pass, covering identity reuse, approval/concurrency, ownership, exact membership balances, private PDFs, support, notices, live events and retention boundaries. The existing **199-scenario PostgreSQL regression** had one retention-age failure: the profile bookkeeping timestamp was incorrectly counting as new activity. That was fixed and the **entire nine-case retention suite passed on rerun**; the other 198 scenarios passed. All **68 API unit**, **117 web** and **13 Redis** scenarios pass; one optional Redis interruption scenario is skipped. Current API types/build and optimized web build/types pass. Six final main-browser groups pass with zero page errors, plus the earlier actual Agent submission/Manager approval walkthrough. Desktop, 320/390px, dark theme, separate tabs, invalid-selection recovery and a new-tab statement PDF were checked. All 61 existing tables retained their original values during migration rehearsal/application; the new linkage column was excluded from comparison. These results do not establish user/client acceptance or production-scale acceptance.

## 8. Local source and commit handoff

| Slice                                                                | Local location / branch                                                                                                    | Saved state                                                                                                                                                         |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current main demo, including calendar, numbering and GCash workspace | `/home/jaycee/Projects/freshphonesph-main-run`, `feature/gcash-review-workspace`                                           | Based on published `0f0560d`, with preserved GCash/calendar/numbering/capacity work and verified withdrawal/replacement/refund integration; no release-branch merge |
| Earnings checkpoint                                                  | `/home/jaycee/Projects/freshphonesph-earnings-checkpoint`, `checkpoint/earnings-20261028`                                  | Feature `bc7f872`, prerequisite baseline `aa0f1cc`                                                                                                                  |
| Numbering checkpoint                                                 | `/home/jaycee/Projects/freshphonesph-numbering-checkpoint`, `checkpoint/batch-numbering-20261028`                          | Feature `0bea0b8`, prerequisite baseline `35a2294`                                                                                                                  |
| Original numbering slice                                             | `/home/jaycee/Projects/freshphonesph-batch-numbering`, `feature/agent-batch-numbering`                                     | Feature `c05f18b`, prerequisite `8d11144`                                                                                                                           |
| Calendar schedules                                                   | `/home/jaycee/Projects/freshphonesph-calendar-installments`, `feature/calendar-installments`                               | Local/uncommitted; earnings baseline plus narrow numbering prerequisite; calendar-only patch/manifest in `.local/calendar-schedules/`                               |
| GCash PDFs — original slice and evening integration                  | `/home/jaycee/Projects/freshphonesph-gcash-history` originally; now also in `/home/jaycee/Projects/freshphonesph-main-run` | Local/uncommitted integration; normal seeded role accounts work on port 3000. [Guide](69-gcash-history-main-demo.md).                                               |

Jaycee authorized local commits for the completed earnings/numbering work. The repository seed guard rejected inherited preview references, and Jaycee then approved a one-time local-only hook exception for the checkpoint commits. Original hooks were retained, private environment files/helpers were excluded, and nothing was pushed. That exception does not authorize later bypasses.

Historical October 28 preparation fetched the incoming main/staging/careers/integrated-site history, preserved dirty work in private backups, brought the local source base to `f2b67ee`, combined the existing CEO/local work, and restored the optimized main preview with existing sample data/private files. Accounts/passwords were not reset. Calendar/numbering were separate then; both are integrated as of October 30. The main API, worker and optimized web preview are running on the current combined source.

**No new production deployment, remote push, external GCash connection, automated statement matching, payroll engine or third-party provisioning was completed this afternoon.**

## 9. Remaining work and decisions

- October 30 #3 and the #4 replacement path are implemented and verified. Refund amounts and dates remain human decisions for each case; no formula or CEO operational permissions were added. [Current workflow](77-member-withdrawals-main-demo.md).
- Calendar schedules and numbering are integrated into the current main access model as of October 30. The migrations, regenerated client and rebuilt application preserve current assignments, enrollment, issued schedules, financial history and Finance-only verification.
- Complete user/client testing and record acceptance separately from implementation.
- Record user/client acceptance of withdrawal/refund/replacement behavior. Any additional ongoing-join or company-wide refund rules require explicit decisions; future unimplemented workflow events remain separate.
- Decide HR role-grant delegation, legacy Analytics reassignment and catalog ownership; do not infer those policies from existing screens.
- #11 website form/question builder and My documents printable summary are implemented; signed agreements remain separate and user/client acceptance is pending. #13 spreadsheet payroll remains manual, with its separate draft work tracked independently. Deployment/third-party work remains deferred.

## 10. Detailed references

- [Implemented member withdrawal, replacement and separate refund workflow](77-member-withdrawals-main-demo.md).
- [Customer My membership batch participation](78-customer-batch-participation.md).
- [Original withdrawal/refund requirements and comparison](76-member-withdrawal-review-plan.md).
- [Batch capacity and staff-only internal positions](75-batch-capacity-internal-positions.md).
- [Calendar schedules and Agent numbering in the main demo](74-calendar-numbering-main-demo.md).
- [Workflow in-app notifications](71-workflow-in-app-notifications.md).
- [Scheduled installment earnings](65-scheduled-installment-earnings.md).
- [Multiple batch memberships](70-multiple-batch-memberships.md).
- [Current role access and enrollment](66-role-access-alignment.md).
- [Owner / CEO consolidation](67-owner-ceo-role.md).
- [Calendar schedule implementation and validation](../../freshphonesph-calendar-installments/docs/66-calendar-installment-schedules.md).
- [Agent numbering implementation and integration notes](../../freshphonesph-batch-numbering/docs/65-agent-batch-numbering.md).
- [GCash main-demo integration and current role testing](69-gcash-history-main-demo.md).
- [GCash PDF reading and password uploads](72-gcash-pdf-reading.md).
- [Original isolated GCash implementation evidence](../../freshphonesph-gcash-history/docs/66-gcash-history-pdfs.md).
- [Canonical October 26 checklist](/home/jaycee/Documents/Obsidian%20Vault/Tasks/Fresh%20Phones%20PH%20October%2026%20implementation%20checklist.md).

This handoff preserves dated implementation history. The October 30 integration update supersedes earlier statements that calendar schedules and numbering require separate previews; current main roles and acceptance/deployment boundaries remain authoritative.
