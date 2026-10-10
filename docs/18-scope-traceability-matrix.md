# 18 - Full Scope v6 Traceability Matrix

> **2026-10-08 architecture update (documentation only):** Neon PostgreSQL and Better Auth
> replace the planned Supabase database/Auth stack. On 2026-10-09 the user reaffirmed Redis
> for live events and background workers; Redis Streams/BullMQ and Better Auth/MFA are
> implemented locally. Production provisioning, distributed rate limiting and private
> object storage selection remain open. See [the decision record](20-v6-architecture-decision.md)
> and [Redis runbook](53-redis-events-workers.md).

This reference maps every section of **Full Scope v6, Revision 1.5** to the repository's
current implementation evidence and the evidence required for acceptance. Rows include
TypeScript increments through 2026-10-08; the historical Django evidence is preserved below.
The v6 target architecture is recorded in
[20-v6-architecture-decision.md](20-v6-architecture-decision.md).

## How to maintain this matrix

- Update a row in the same PR that changes its implementation or evidence.
- Use `Built` only when the complete scoped behavior has automated evidence.
- Use `Accepted` only after named Fresh Phones PH reviewers pass UAT.
- Use `Deferred - funding` for work postponed by an explicit user decision because
  funding is unavailable; retain the requirement and evidence needed when work resumes.
- Link evidence to stable tests, endpoints, screens, runbooks, or signed acceptance records.
- A row may move backward when a regression or newly confirmed requirement invalidates evidence.

## Scope coverage

| Scope | Requirement | Current baseline | Status | Target acceptance evidence |
|---|---|---|---|---|
| §1 Executive Summary | Centralize clients, batches, verified payments, documents, tasks, reports, support, recruitment, and agents while external payment remains familiar | Core records and operations exist; public, document, and notification coverage is incomplete. AI is deferred until API funding is available | Partial | End-to-end journeys for current delivery modules plus signed scope review recording the AI deferral |
| §2 Product Vision | Operations and records platform; not payment gateway, BIR POS, autonomous HR, or public private-data store | Core code follows the payment, BIR, HR, and public-agent boundaries | Built | Boundary tests remain green in NestJS and appear in UAT scripts |
| §3 Users and Roles | Individual accounts, least privilege, separately approved confidential HR access | Cookie-backed accounts, 10 employee roles, server-side checks and audited account administration exist. Handlers now have read-only access to assigned batches/clients, including scoped counts and live events. Owner-approved per-person confidential HR grants for HR/Payroll or COO, audited reasons/history, private KPI/applicant gates and revocation are implemented locally; see [42-confidential-hr-access.md](42-confidential-hr-access.md) | Partial | Endpoint-by-role matrix; inactive-user, self-lockout, cross-role, assignment-isolation and confidential-HR negative tests plus Owner UAT |
| §4 Public Website | Catalog, breakdown, process, requirements, FAQs, careers, agent verification, login, support entry | Landing, process/requirements/FAQ content, careers, verification and login exist. Public catalog listings, daily rates, availability, photos and role-gated management are implemented locally; see [43-public-catalog.md](43-public-catalog.md). Staff-entered per-offer terms and public sample installments/dates are implemented locally; see [44-catalog-installment-breakdown.md](44-catalog-installment-breakdown.md). FAQ topic filtering and question/answer search are implemented; see [45-faq-topic-search.md](45-faq-topic-search.md). Public help/contact entry and preserved support destinations through login are implemented; see [46-public-support-entry.md](46-public-support-entry.md). Business content acceptance and named UAT remain open | Partial | Responsive/accessibility checks and public API tests for every listed feature |
| §5 Customer Portal | Own membership, schedule, verified history, documents, release status, support, notifications | The TypeScript portal covers all eight customer features, including key dates, installment allocation, private document review, release/support status, and notifications. Client UAT and production service/policy setup remain open. | Partial | Named mobile/desktop UAT, client-owned private storage/sender, approved privacy and retention |
| §6 Records and Client Management | Batches, clients, checklist, private documents, schedules/balance, history, search/filter | TypeScript covers CRUD, schedules, private requirements/review, edit dialogs, change history, handler/agent batch assignment, combined search/model/status/date/assignment filters, accurate pagination and handler record isolation. Production setup and named UAT remain open | Partial | Batch-to-client journey, private document authorization, filters, assignment isolation and audit evidence |
| §7 Payment Recording and Finance Verification | External payment claim, pending state, Finance decision, verified-only balance, history, proof, audit, operational documents | Core workflow, proof, balance, statement, confirmation, notification hook, and audit tests exist | Built | NestJS parity tests for state, permission, concurrency, documents, proof, balance, notification, and audit |
| §8 Tasks, Deadlines, and KPI | Assignment, employee submission, timestamp, objective late flag, human review, approval trail; no automatic wage action | The TypeScript staff page and API cover assignment, progress, report/private evidence submission, timestamp-based late flag, human KPI review, completion and audited transitions. Approved HR/COO staff can now submit an action request from a human recommendation; the Owner approves/rejects with an immutable reasoned history. Approval has no automatic payroll or employment effect; see [47-consequential-hr-action-approvals.md](47-consequential-hr-action-approvals.md). | Partial | Named policy/UAT approval, timestamp/private-file checks and no-wage-action verification |
| §9 Reporting and Analytics | Cards, date filters, batch/payment, task/KPI, support metrics, exports, history and submitted analysis | TypeScript has a permission-gated Reports page, payment/collection totals, internal reconciliation, task/KPI and Support aggregates, CSV/XLSX and captured history. Report viewers can submit one immutable human analysis with a saved period or attach it later to an older numeric snapshot; history retains author and time. See [49-submitted-report-analysis.md](49-submitted-report-analysis.md). Business field/format acceptance and any external statement matching remain open | Partial | Approved field matrix, remaining approved formats, any approved external statement matching and named report UAT |
| §10 Customer Service | Create with source, assign, status lifecycle, resolution, recurring issue/turnaround reporting | Customer portal source is server-assigned; staff log external contacts with explicit source and minimal customer lookup. Existing cases are `unrecorded`; source is immutable, filterable and counted in Support reports/exports. Case lifecycle, customer isolation and category/turnaround metrics remain intact; see [48-support-concern-source-tracking.md](48-support-concern-source-tracking.md) | Partial | Named lifecycle UAT and business acceptance of source labels, category/turnaround reporting and retention |
| §11 Recruitment and Agent Verification | Careers, minimized applications, internal status, private-safe agent result | TypeScript has the audited agent directory and masked verification plus public careers/application forms, private applicant attachments, job visibility, full-backlog job/applicant search and paging, global counts, retained drafts and explicit versioned review-conflict resolution. API role/private-file/concurrency and browser checks pass; confidential applicant access is now separately gated by an Owner grant; retention/import and named UAT remain open; see [41-recruitment-directory.md](41-recruitment-directory.md) and [35-upstream-merge.md](35-upstream-merge.md) | Partial | Approved data minimization/retention, legacy recruitment import and named workflow UAT |
| §12 Notifications | In-app/email, deadline, Finance, customer status, templates | TypeScript customer in-app/email events, retries, due reminders, read state and Owner-managed email templates are implemented. The shared staff bell includes assignee-only task reminders, Finance pending alerts, recipient-scoped immutable Finance results, Customer Service triage/assignment/reply events and Owner account creation/role/access snapshots. Staff task/Finance/Support/account email outboxes now provide Owner-managed templates, pause/timing controls, delivery history and bounded audited retries with recipient/access rechecks and provider idempotency. | Partial | Approved wording/timing, production sender provisioning, provider inbox smoke test and client UAT; setup checks and sign-off preparation are in [33-staff-email-launch.md](33-staff-email-launch.md) |
| §13 AI Assistant | Permission-aware, approved-source assistant added after stable core; summaries and task help only | `ai_app` is an empty skeleton. Deferred at the user's request on 2026-10-08 because paid AI API funding is unavailable; excluded from current implementation priorities | Deferred - funding | Resume when API funding is available and the user requests it; then verify approved-source retrieval, role isolation, no-write, prompt-injection, privacy, and human-review tests |
| §14 Privacy, Documents, Compliance | Notices, terms, employee/applicant notice, DPA, DPO, PIA, NPC assessment, retention, breach process | Draft customer, employee and applicant notices and portal terms now have public screens and entry links. A tested versioned acknowledgement mechanism is ready for approved publications, but all texts remain inactive drafts while the controller/contact, bases, recipients, retention and business rules are unknown; see [50-privacy-notices-terms.md](50-privacy-notices-terms.md). Owner-managed retention policy drafts/approval, expiry previews, legal holds, reasoned erasure approvals, durable private file removal and backup/provider follow up now exist locally; policies start inactive; see [51-retention-deletion.md](51-retention-deletion.md). DPA, DPO, PIA, NPC assessment and incident work remain open. | Partial — approval blocked | Approved text and publication, named UAT, retention policy activation and backup/provider disposition/restore rehearsal, DPA/DPO/PIA/NPC decisions and incident runbooks |
| §15 Technical Architecture | VPS web, Railway API, Neon PostgreSQL, Better Auth, private storage, Resend and Redis Streams/BullMQ; production provisioning pending | Architecture is approved in [20-v6-architecture-decision.md](20-v6-architecture-decision.md); Better Auth/MFA identity and Redis Streams/BullMQ are implemented locally; production provisioning is pending | Partial | Two API replicas, approved event/worker recovery, Neon/Better Auth parity, web/API/storage/email smoke tests and client-owned account record |
| §16 Security Requirements | Auth, backend checks, private files, HTTPS, audit, validation/rate limits, backup/recovery, secrets, least privilege | Auth, server permissions, private signed files, audit, validation, and env-based secrets exist; rate-limit and recovery evidence is missing | Partial | Security checklist, all-route permission scan, rate-limit tests, backup/restore rehearsal, production HTTPS evidence |
| §17 SDLC and Timeline | Discovery through UAT/handover with change-controlled scope | Planning docs exist and much of the Django baseline was built; formal gate evidence is incomplete | Partial | Gate records from the implementation workflow and accepted release plan |
| §18 Scope Revisions | Enforce ten revisions covering payments, BIR wording, wages, AI, Redis, access, public agents, privacy, and budget | Most boundaries are documented and represented in code; older AI wording still conflicts with the stricter project rule | Partial | Conflict removed from active docs and regression tests cover every technical revision |
| §19 Out of Scope | Exclude checkout, official BIR invoicing, auto wage action, native apps, payroll, paid messaging, large migration, BI warehouse, unlimited revisions, 24/7 support | No excluded technical feature is present in the baseline | Built | Release review confirms no excluded capability or misleading product copy |
| §20 Commercial and Subscription Boundaries | Separate one-time development, recurring services, maintenance, and client-owned production accounts | Commercial details and ownership guidance are documented; accounts are not provisioned | Blocked - client | Signed commercial terms and production account ownership checklist |
| §21 Acceptance, Handover, Change Control | Sign-off, prototype approval, staging/UAT, criteria, warranty defects, change requests, handover, maintenance | Process is documented; formal UAT, handover, and warranty start are not complete | Not started | Signed UAT, deployment/handover record, warranty start, change log, and maintenance decision |
| Appendix A Data Fields | Minimized fields for customers, documents, batches, payments, tasks, KPI, support, applicants, agents, audit | TypeScript models cover core records, customer documents and handler/agent assignments. Approved address/contact details and some review fields remain incomplete | Partial | Schema-to-field checklist approved in discovery and covered by migrations/validation tests |
| Appendix B Compliance Notes | Keep privacy, NPC, automated decision, breach, BIR, and wage boundaries visible without treating docs as legal advice | Boundaries are summarized in `docs/07`; final legal interpretation belongs to client advisers | Blocked - client | DPO/counsel review record and technical controls mapped to approved policy |

## Current implementation evidence

### TypeScript increments (updated 2026-10-08)

| Scope | Target implementation and evidence | Status |
|---|---|---|
| §3, §16 Auth/access | Cookie sessions, audited account/role administration and the API role matrix exist. Core handlers are restricted to assigned batches/clients for lists, direct reads, schedules, dashboard counts and SSE; reassignment revokes access. Confidential HR grants are implemented with Owner-only audited decisions, strict eligibility, default-off migration, current database checks and private KPI/applicant isolation. Better Auth credential/session migration, TOTP/recovery codes, required staff gates and revocation are implemented locally; production rollout and named UAT remain open; see [52-authentication-mfa.md](52-authentication-mfa.md); see [42-confidential-hr-access.md](42-confidential-hr-access.md). | Partial |
| §5 Portal | TypeScript portal now shows membership and key dates, verified-only installment allocation and history/balance, printable non-BIR account documents, private document checklist/history/upload, release/support status, in-app/email updates, and optional due reminders. Cross-customer access and delivery are covered in API tests. Client-owned production storage/sender, approved privacy/retention and reminder policy, and named UAT remain open. | Partial |
| §6 Records | Atomic enrollment/schedules, issued-term locks, private document review, edit/history dialogs and handler/agent assignment exist. Combined model/status/start-or-joined-date/assignment filters and accurate totals intersect the handler's server-enforced scope. Concurrent edits/assignments and release drafts reject stale versions and preserve browser drafts. Production storage and named UAT remain open; see [25-record-edit-history.md](25-record-edit-history.md), [26-batch-assignments.md](26-batch-assignments.md) and [34-records-client-filters.md](34-records-client-filters.md). | Partial |
| §9 Reports, §11 Recruitment | The reconciled import adds task/Support aggregate reports, CSV/XLSX, snapshots and public applications/private files. Local follow-ups add the Reports UI, Collections/Reconciliation and full-backlog recruitment search/paging, complete counts, retained drafts and explicit stale-review resolution. Existing agent editing/assignments and masked verification remain intact. Business reporting acceptance, recruitment privacy/retention, legacy import and named UAT remain open; see [37-reports-page.md](37-reports-page.md) and [41-recruitment-directory.md](41-recruitment-directory.md). | Partial |
| §7 Finance | Payment claims remain pending until an Owner/Finance decision; only verified sums affect balances. Verified decisions queue customer in-app and email updates. Tests cover permissions, concurrency, audit, private proof access, duplicate warnings, overpayment, customer isolation, and non-BIR documents. Finance-only append-only amount corrections/reversals now update derived credit, schedules, operational documents and reports, with stale/idempotency guards and adjustment audit evidence; see [40-payment-adjustments.md](40-payment-adjustments.md). Named adjustment UAT and client-owned production services remain open. | Partial |
| §12 Staff alerts | Shared bell combines assignee-only task assignment/deadline reminders, authorized Finance pending alerts and recipient-scoped historical Finance results plus current Customer Service triage/assignment/reply events. Case/message writes atomically capture recipients, private events and emails; reassignment, staff replies and resolution retire handled events. Exact case links preserve drafts and reject stale resolution saves. Task/payment writes now atomically queue staff emails; scheduled reminders stop after submission. Owner email templates/timing and private delivery history/retries enforce current access, recipient addresses, captured versions and duplicate prevention across API workers. Account writes also capture private immutable creation/role/access snapshots for active Owners, with four email types and exact account links that preserve drafts and block stale saves. Tests preserve financial records, human KPI decisions and unread state. Approved wording, production sender provisioning and named UAT remain open; see [27-finance-pending-alerts.md](27-finance-pending-alerts.md), [28-staff-task-alerts.md](28-staff-task-alerts.md), [29-finance-result-alerts.md](29-finance-result-alerts.md), [30-staff-email-delivery.md](30-staff-email-delivery.md), [31-support-staff-alerts.md](31-support-staff-alerts.md) and [32-account-access-alerts.md](32-account-access-alerts.md) and [33-staff-email-launch.md](33-staff-email-launch.md). | Partial |
| v6 draft §15.1–15.2 | Existing screens refetch on live events/reconnect and retain unsaved drafts. Cross-instance and customer-isolation SSE tests remain green. | Partial |

Runbook and detailed limits: [19-records-typescript-preview.md](19-records-typescript-preview.md).
The table below remains evidence for the Django baseline.

| Area | Evidence |
|---|---|
| Authentication and roles | `apps/api/auth_app`, `auth_app/permissions_map.py`, `auth_app/tests/` |
| Batches, clients, schedules, portal | `apps/api/batches_app`, `apps/api/clients_app`, `clients_app/tests/` |
| Payment invariants | `apps/api/payments_app/services.py`, `payments_app/tests/` |
| Audit | `apps/api/audit_app`, audit assertions in payment and role tests |
| Private files | `apps/api/storage_app`, payment-proof API tests |
| Tasks and human KPI review | `apps/api/tasks_app`, `apps/api/kpi_app`, `tasks_app/tests/` |
| Reports | `apps/api/reports_app`, `reports_app/tests/` |
| Support | `apps/api/support_app`, `support_app/tests/` |
| Recruitment and public agent privacy | `apps/api/recruitment_app`, `apps/api/agents_app`, recruitment tests |
| Notifications | `apps/api/notifications_app/services.py`, notification tests |
| Web surfaces | `apps/web/app`, typed requests in `apps/web/lib/api.ts` |

The Django test runner discovers **80 tests**. A verification attempt on 2026-09-01 could not
execute them because the configured PostgreSQL service at `127.0.0.1:5433` was not running.
Treat the passing claim in older status documents as historical until the suite is rerun in a
working local or CI environment.

## Known documentation conflicts to resolve during migration

1. `docs/09-tech-stack.md` and several design drafts describe Django. The target is now a
   TypeScript NestJS API; older Django material remains useful only for behavioral parity.
2. Full Scope v6 contains optional AI deduction-suggestion wording in §13/§18.4, while §8 and
   the project's approved safeguard prohibit system-computed wage recommendations. The stricter
   no-computation rule wins.
3. Some old docs describe all M1-M11 acceptance criteria as developer responsibility even when
   client policies or content are missing. Those rows stay `Blocked - client` until supplied.
4. `BUILD_STATUS.md` records the Django baseline, not the completion state of the TypeScript
   migration.

## Release-level acceptance checklist

- [ ] Every scope row is `Built`, `Accepted`, or explicitly `Deferred - funding` or
      `Blocked - client`, with deferred/blocked rows covered by a signed launch decision.
- [ ] Payment, BIR, HR, public-agent, server-auth, secret, and private-file invariant tests pass.
- [ ] The role matrix has a negative test for every protected endpoint.
- [ ] Client-provided privacy, retention, incident, and commercial decisions are recorded.
- [ ] Production accounts are owned by Fresh Phones PH.
- [ ] Backup restore, deployment rollback, reconciliation, and smoke tests have evidence.
- [ ] UAT sign-off, handover, and warranty start dates are recorded.

## Related

- [Full-scope implementation workflow](17-full-scope-workflow.md)
- [Build status](BUILD_STATUS.md)
- [Modules](05-modules.md)
- [Compliance and security](07-compliance-security.md)
- [Commercial boundaries and handover](08-commercials-boundaries.md)
