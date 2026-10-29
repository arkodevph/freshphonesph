# Fresh Phones PH — October 28 afternoon handoff

Date: **October 28, 2026 · Asia/Manila**. Afternoon availability was checked at approximately **6:50 PM PHT**. **Evening update:** GCash history and workflow in-app notifications are integrated into the main local demo; see [GCash](69-gcash-history-main-demo.md) and [notifications](71-workflow-in-app-notifications.md).

**Formatted report — October 29:** [Editable Word document](../../../Documents/Reports/Fresh%20Phones%20PH/2026-10-29/Fresh_Phones_PH_Role_Access_and_Work_Status_2026-10-29.docx) · [PDF copy](../../../Documents/Reports/Fresh%20Phones%20PH/2026-10-29/Fresh_Phones_PH_Role_Access_and_Work_Status_2026-10-29.pdf). Local exports contain the full role-access tables, completed tasks with implementation/availability/acceptance status, the full checklist and deferred work.

**GCash reading update:** the main upload now accepts an optional PDF password and reads text/scanned statements into a revision-specific transaction table. 168 automated checks, builds/types and 11 browser groups pass. See [PDF reading and testing](72-gcash-pdf-reading.md).

**GCash feedback update:** the PDF password has a right-edge show/hide eye. File selection, reading, successful submission and duplicate batch/date submissions display dismissible pop-up feedback. See [the current GCash guide](72-gcash-pdf-reading.md#password-visibility-and-upload-feedback). Verified: 119 web tests, optimized build/types and nine browser groups; no extra duplicate period or financial changes.

**Multiple membership update (11:37 PM PHT): #10 is implemented and verified in the main demo**, using the existing Customer login. See [the implementation and test guide](70-multiple-batch-memberships.md).

This document brings together the work from the three Fresh Phones sessions: completed tasks, their purpose, where to test them, current role access, local commits, and remaining work.

## October 29 planned GCash follow-up — deferred

Jaycee is content with the current GCash iteration and explicitly requested **documentation only, with no implementation yet** for:

1. An expanded submission-queue and review-workspace design.
2. The original uploaded PDF visible beside the extracted transaction table for double-checking, with a suitable mobile comparison view.
3. Editable extracted transaction history with original evidence preserved and an audited correction workflow; permissions/approval rules to be agreed later.
4. Deletion/removal controls in a three-dot menu on each submission card and in the detail toolbar, with confirmation. Archiving submitted evidence with recovery is the recommendation; permanent deletion and exact role/status rules remain to be agreed within the existing retention workflow.

All four items are **planned, unimplemented and deferred**. Full scope and unresolved decisions: [GCash review workspace plan](72-gcash-pdf-reading.md#planned-review-workspace-improvements--deferred).

## Read this first: implemented does not always mean available in the main demo

**The completed features are not all integrated into one running application yet.** A checkmark below means the feature was implemented and verified locally. It does not mean Jaycee/client acceptance, combined integration, or production deployment is complete.

- **Main demo, port 3000:** installment earnings; current roles/access and Owner / CEO; Agent enrollment approval; GCash history PDF review; enrollment notifications; multiple batch memberships.
- **Calendar preview, port 3006:** calendar installment schedules and Agent batch numbering, plus the earlier earnings report. This preview does not include the full latest role/access changes.
- **GCash history is now in the main demo, port 3000:** use its existing one-click Batch Handler and Records logins. The older isolated preview is historical test setup.
- **Earlier earnings preview, port 3002:** retained for focused earnings testing; the earnings tab is also available in the main demo now.

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

| #   | Task and purpose                                          | Status on October 28                                           | Where it is available                                          |
| --- | --------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | Deployment and third-party setup                          | Deferred                                                       | No new deployment/integration                                  |
| 2   | Scheduled installment earnings for each batch/member      | ✅ Implemented locally; acceptance pending                     | Main demo and earnings/calendar previews                       |
| 3   | Member withdrawals and discretionary refunds              | Pending; policy unresolved                                     | No completed new workflow                                      |
| 4   | Joining an ongoing batch                                  | Pending; continuation/new-plan rules unresolved                | No completed new workflow                                      |
| 5   | Eight real members plus four displayed placeholders       | Pending                                                        | No completed new capacity/display workflow                     |
| 6   | Manual first due dates and calendar installment schedules | ✅ Implemented locally; main integration/acceptance pending    | Separate calendar preview                                      |
| 7   | Handler GCash history PDFs and Records review             | ✅ Integrated into main demo; acceptance pending               | Main demo, existing seeded role accounts                       |
| 8   | COO business role/access management                       | ✅ Implemented locally; acceptance pending                     | Main demo                                                      |
| 9   | Owner / CEO report-only access                            | ✅ Implemented locally; Owner/CEO merge verified               | Main demo                                                      |
| 10  | One member in multiple batches, with separate histories   | ✅ Implemented and verified in main; acceptance pending        | Main demo, existing Customer / Agent / Manager accounts        |
| 11  | Application/agreement through Google Forms                | Existing manual workflow; printable PDF proposed               | External Google Forms; no completed new PDF template           |
| 12  | Agent enrollment with assigned Manager approval           | ✅ Implemented locally; acceptance pending                     | Main demo                                                      |
| 13  | Payroll in spreadsheets                                   | Manual workflow retained                                       | External spreadsheets; no new app payroll calculation          |
| 14  | In-app notifications for the agreed client workflow       | ✅ Integrated into main demo; acceptance pending               | Main bell → Enrollments; existing payment/task alerts retained |
| 15  | Agent-prefixed batch numbering                            | ✅ Implemented and committed locally; main integration pending | Separate calendar preview; numbering source/checkpoints        |

**9 checklist items are implemented locally: #2, #6, #7, #8, #9, #10, #12, #14 and #15.**

## 2. Preview links and sign-in instructions

| Preview                       | Login                                               | Accounts and intended use                                                                                                                          |
| ----------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main integrated demo          | [localhost:3000/login](http://localhost:3000/login) | Expand **Preview a workspace**, then choose the current business role. Use this for current access, Owner / CEO, enrollment approval and earnings. |
| Calendar / numbering          | [127.0.0.1:3006/login](http://127.0.0.1:3006/login) | Expand **Preview a workspace**. Choose **COO** for creation/schedule tests or **CEO** for earnings. These are isolated synthetic records.          |
| GCash PDF reviews             | [localhost:3000/login](http://localhost:3000/login) | Expand **Preview a workspace**, then choose **Batch handler**, **Records & monitoring officer**, Finance or COO.                                   |
| Earlier earnings-only preview | [localhost:3002/login](http://localhost:3002/login) | Expand **Preview a workspace**, then choose CEO/COO for report testing. This is an older access baseline.                                          |

GCash uses the same main-demo workspace picker and accounts as the other integrated features. The older isolated fixture account file is no longer needed.

Use separate browser profiles/private windows for simultaneous Handler and Records sessions. Several localhost previews share a hostname and can replace one another's sign-in cookie. The calendar preview uses `127.0.0.1` to keep its cookie separate from localhost.

These links are local to this machine. Running-service availability can change after the snapshot above.

## 3. Completed features: purpose and test guide

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

**Test path:** [Calendar login](http://127.0.0.1:3006/login) → **COO → Paluwagan Records → New batch**.

1. Choose an Agent and enter the model, contract price, installment count and batch start date.
2. Select **Installment frequency** and **First installment due date**.
3. For monthly plans, choose **Same day of every month** or **Last day of every month**.
4. Try the first-day, 15th and month-end shortcuts, and inspect the schedule preview.
5. Create the batch. An eligible unissued batch can also be edited through its record editor.

The selected first due date is installment 1. Monthly dates follow the calendar, including short months and leap years. Bi-monthly alternates between the 15th and actual month end. Weekly scheduling remains available. The preview and server use the same date/centavo calculation; the last installment retains any rounding remainder.

Already-issued schedules and existing payment history are preserved. Existing batches without the new policy retain their old fixed intervals and display an existing-plan label. Schedules or payments lock financial plan terms; unrelated status edits retain the saved policy.

**Availability:** separate calendar preview only. It has the numbering prerequisite and earlier earnings baseline; it is not the reference for today's final role permissions. Main integration remains pending.

### #7 — Full GCash history PDF upload and Records review

**Purpose:** retain a complete GCash history PDF for a batch and covered dates, let Records review its completeness, and preserve corrections/history.

**Upload path:** [Main login](http://localhost:3000/login) → **Preview a workspace → Batch handler → GCash history** ([direct page](http://localhost:3000/system/gcash-history)).

1. Choose the assigned batch and enter **History from** / **History through**.
2. Choose **Full GCash PDF**, optionally add a Handler note, then **Submit PDF to Records**.
3. Use the same main workspace picker to sign in as **Records & monitoring officer** → **GCash history → Review submission**.
4. Choose **Reviewed** or **Needs clarification**, enter the required review note, then save.
5. If clarification was requested, return as Handler → **Submit corrected PDF**.
6. Open **PDF history** to inspect/download the retained original and corrected revisions.

New uploads are read automatically. Enter **PDF password (if required)** when needed; the password is used only for the current upload and is never stored. Use **View extracted transactions** on a period or inside Records review. History preserves a separate table for each corrected revision. Text is extracted directly when available; scanned pages use Tesseract, with uncertain results flagged. The original encrypted file remains unchanged. Older uploads remain reviewable without an extracted table.

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

**Availability:** main demo at port 3000. Calendar scheduling/numbering previews remain separate. Checklist #4's continuation, catch-up and prior-credit rules remain unresolved; this feature does not transfer an earlier batch's installments or credit.

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

**Availability:** main demo. The synthetic `ACCESS-DEMO-001` batch supports the seeded Agent → Manager walkthrough. Later capacity/activation rules are separate unfinished work.

### #15 — Agent-prefixed batch numbering

**Purpose:** generate a stable batch number from an Agent's code with a continuous sequence, rather than asking staff to type a batch code.

**Test path:** [Calendar login](http://127.0.0.1:3006/login) → **COO → Paluwagan Records → New batch → Choose Agent → Create batch**.

The server generates identifiers such as `AB-001`, `AB-002`, and so on. The sequence belongs to the original numbering Agent, does not reset by month/year, and grows past three digits. Reassignment changes the current Agent but preserves the generated identifier and numbering ownership. Existing batch codes/history are preserved; used legacy matching numbers are skipped.

The actual assigned code appears after successful creation. Failed/rolled-back creation does not consume a number. Generated identifiers are read-only in normal record editing.

**Availability:** isolated numbering source/checkpoints and the running calendar preview. It has not been integrated into the main demo. At integration, creation must preserve the main role model's `BATCH_CREATE` restriction; a Batch Manager must not gain batch creation from the older preview's broader grants.

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
5. **Payroll:** people continue using spreadsheets. Task facts and human KPI evaluations do not calculate salary or automatic deductions.

These completed slices do not establish the later eight-confirmation/capacity gate, batch activation stages or a new Records/Manager payment-review chain.

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

Jaycee/client acceptance is still pending. No claim is made that all implemented items have been tested together in the main demo, at production scale, or in a deployed environment.

For this document, the main Owner / CEO earnings tab and the four login pages were checked again. Main, earnings and calendar logins expose the workspace picker. The integrated GCash feature uses the main picker; the earlier isolated GCash login does not. Earlier same-session browser checks also opened main COO User Management, Agent/Manager Enrollments, calendar creation and the separate GCash Handler/Records page.

**Evening #10 validation:** all **22 focused PostgreSQL scenarios** pass, covering identity reuse, approval/concurrency, ownership, exact membership balances, private PDFs, support, notices, live events and retention boundaries. The existing **199-scenario PostgreSQL regression** had one retention-age failure: the profile bookkeeping timestamp was incorrectly counting as new activity. That was fixed and the **entire nine-case retention suite passed on rerun**; the other 198 scenarios passed. All **68 API unit**, **117 web** and **13 Redis** scenarios pass; one optional Redis interruption scenario is skipped. Current API types/build and optimized web build/types pass. Six final main-browser groups pass with zero page errors, plus the earlier actual Agent submission/Manager approval walkthrough. Desktop, 320/390px, dark theme, separate tabs, invalid-selection recovery and a new-tab statement PDF were checked. All 61 existing tables retained their original values during migration rehearsal/application; the new linkage column was excluded from comparison. These results do not establish user/client acceptance or production-scale acceptance.

## 8. Local source and commit handoff

| Slice                                                               | Local location / branch                                                                                                    | Saved state                                                                                                                           |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Main roles, Owner / CEO, enrollments, main earnings and memberships | `/home/jaycee/Projects/freshphonesph-main-run`, shared `feature/installment-earnings`                                      | Local working changes; not a combined clean release branch                                                                            |
| Earnings checkpoint                                                 | `/home/jaycee/Projects/freshphonesph-earnings-checkpoint`, `checkpoint/earnings-20261028`                                  | Feature `bc7f872`, prerequisite baseline `aa0f1cc`                                                                                    |
| Numbering checkpoint                                                | `/home/jaycee/Projects/freshphonesph-numbering-checkpoint`, `checkpoint/batch-numbering-20261028`                          | Feature `0bea0b8`, prerequisite baseline `35a2294`                                                                                    |
| Original numbering slice                                            | `/home/jaycee/Projects/freshphonesph-batch-numbering`, `feature/agent-batch-numbering`                                     | Feature `c05f18b`, prerequisite `8d11144`                                                                                             |
| Calendar schedules                                                  | `/home/jaycee/Projects/freshphonesph-calendar-installments`, `feature/calendar-installments`                               | Local/uncommitted; earnings baseline plus narrow numbering prerequisite; calendar-only patch/manifest in `.local/calendar-schedules/` |
| GCash PDFs — original slice and evening integration                 | `/home/jaycee/Projects/freshphonesph-gcash-history` originally; now also in `/home/jaycee/Projects/freshphonesph-main-run` | Local/uncommitted integration; normal seeded role accounts work on port 3000. [Guide](69-gcash-history-main-demo.md).                 |

Jaycee authorized local commits for the completed earnings/numbering work. The repository seed guard rejected inherited preview references, and Jaycee then approved a one-time local-only hook exception for the checkpoint commits. Original hooks were retained, private environment files/helpers were excluded, and nothing was pushed. That exception does not authorize later bypasses.

Earlier local preparation today also fetched the incoming main/staging/careers/integrated-site history, preserved dirty work in private backups, brought the local source base to `f2b67ee`, combined the existing CEO/local work, and restored the optimized main preview with the existing sample data/private files. Accounts/passwords were not reset. The existing Redis worker remains part of the main local runtime. The evening update integrates GCash into the main demo. Calendar/numbering remain separate.

**No new production deployment, remote push, external GCash connection, automated statement matching, payroll engine or third-party provisioning was completed this afternoon.**

## 9. Remaining work and decisions

- Calendar schedules and numbering still need integration into the current main access model. GCash now uses the normal role accounts in the combined main demo.
- Preserve the main role/assignment/enrollment fields, `BATCH_CREATE` guard, report-family restrictions, current storage, issued schedules, financial history and Finance-only verification during integration.
- Reconcile forward migrations before applying them, regenerate the database client, rebuild the main application and test the normal seeded accounts. Similar timestamps in separate feature branches do not mean the migrations have been combined.
- Complete user/client testing and record acceptance separately from implementation.
- Resolve #3 withdrawal/refund policy, #4 ongoing-batch financial rules, #5 capacity/placeholders and future notification events for workflows that are not implemented yet.
- Decide HR role-grant delegation, legacy Analytics reassignment and catalog ownership; do not infer those policies from existing screens.
- Keep #11 Google Forms and #13 spreadsheet payroll as manual workflows unless their scope is explicitly changed. Deployment/third-party work remains deferred.

## 10. Detailed references

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

This is a dated handoff snapshot. Where older source notes conflict, the verified current Owner / CEO correction and the explicit main-versus-separate-preview distinctions above take precedence for this document.
