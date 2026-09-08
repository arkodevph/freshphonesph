# 18 - Full Scope v6 Traceability Matrix

This reference maps every section of **Full Scope v6, Revision 1.5** to the repository's
current implementation evidence and the evidence required for acceptance. Status describes the
current Django baseline as reviewed on 2026-09-01; v6 target architecture is recorded in
[20-v6-architecture-decision.md](20-v6-architecture-decision.md).

## How to maintain this matrix

- Update a row in the same PR that changes its implementation or evidence.
- Use `Built` only when the complete scoped behavior has automated evidence.
- Use `Accepted` only after named Fresh Phones PH reviewers pass UAT.
- Link evidence to stable tests, endpoints, screens, runbooks, or signed acceptance records.
- A row may move backward when a regression or newly confirmed requirement invalidates evidence.

## Scope coverage

| Scope | Requirement | Current baseline | Status | Target acceptance evidence |
|---|---|---|---|---|
| §1 Executive Summary | Centralize clients, batches, verified payments, documents, tasks, reports, support, recruitment, and agents while external payment remains familiar | Core records and operations exist; public, document, notification, and AI coverage is incomplete | Partial | End-to-end journeys for every module plus signed scope review |
| §2 Product Vision | Operations and records platform; not payment gateway, BIR POS, autonomous HR, or public private-data store | Core code follows the payment, BIR, HR, and public-agent boundaries | Built | Boundary tests remain green in NestJS and appear in UAT scripts |
| §3 Users and Roles | Individual accounts, least privilege, separately approved confidential HR access | JWT accounts, 10 employee roles, 12 stable permission keys, server-side checks, and explicit HR grant exist | Partial | Endpoint-by-role matrix; inactive-user, cross-role, and confidential-HR negative tests |
| §4 Public Website | Catalog, breakdown, process, requirements, FAQs, careers, agent verification, login, support entry | Landing, process/requirements/FAQ content, careers, verification, and login exist; catalog data and complete support entry remain incomplete | Partial | Responsive/accessibility checks and public API tests for every listed feature |
| §5 Customer Portal | Own membership, schedule, verified history, documents, release status, support, notifications | Membership, schedule, verified history/balance, and support exist; customer documents, fulfillment status, and notification center do not | Partial | Cross-client denial plus full portal journey covering all eight features |
| §6 Records and Client Management | Batches, clients, checklist, private documents, schedules/balance, history, search/filter | Batch/client CRUD and schedules exist; requirement records, document review, handlers, complete search/filter, and edit history are incomplete | Partial | Batch-to-client journey, private document authorization, filters, and audit evidence |
| §7 Payment Recording and Finance Verification | External payment claim, pending state, Finance decision, verified-only balance, history, proof, audit, operational documents | Core workflow, proof, balance, statement, confirmation, notification hook, and audit tests exist | Built | NestJS parity tests for state, permission, concurrency, documents, proof, balance, notification, and audit |
| §8 Tasks, Deadlines, and KPI | Assignment, employee submission, timestamp, objective late flag, human review, approval trail; no automatic wage action | Assignment/submission/late flag and human KPI review exist; task attachments and broader approval trail are incomplete | Partial | Lifecycle, timestamp boundary, attachment access, human-only review, audit, and no-wage-action tests |
| §9 Reporting and Analytics | Cards, date filters, batch/payment, task/KPI, support metrics, exports, history | Dashboard, collection totals, date filters, and payment CSV/XLSX exist; remaining report families and history are incomplete | Partial | Role-scoped report tests, every required report family, exports, and retained period evidence |
| §10 Customer Service | Create, assign, status lifecycle, resolution, recurring issue/turnaround reporting | Case creation, assignment/update, customer isolation, resolution fields, and turnaround calculation exist; recurring issue reporting is incomplete | Partial | Full lifecycle and role tests plus category and turnaround reports |
| §11 Recruitment and Agent Verification | Careers, minimized applications, internal status, private-safe agent result | Public careers/apply, internal applicant management, and masked agent verification exist; applicant attachments are not implemented | Partial | Data-minimization review, private attachment access, status workflow, and exact public response-shape test |
| §12 Notifications | In-app/email, deadline, Finance, customer status, templates | Verification creates a customer in-app record and optional email; no center, templates, Finance alerts, deadline reminders, or general status events | Partial | Delivery, retry/idempotency, template authorization, read state, and event coverage tests |
| §13 AI Assistant | Permission-aware, approved-source assistant added after stable core; summaries and task help only | `ai_app` is an empty skeleton | Skeleton | Approved-source retrieval, role isolation, no-write, prompt-injection, privacy, and human-review tests |
| §14 Privacy, Documents, Compliance | Notices, terms, employee/applicant notice, DPA, DPO, PIA, NPC assessment, retention, breach process | Private storage and minimization patterns exist; client policy documents, consent/version tracking, retention deletion, and incident workflow remain open | Blocked - client | Approved client policies plus implemented notice/version, retention/deletion, and incident runbooks |
| §15 Technical Architecture | VPS web, Railway API, Supabase database/Auth/private storage, Resend, Redis launch infrastructure | Architecture is approved in [20-v6-architecture-decision.md](20-v6-architecture-decision.md); backend identity and production provisioning are pending | Partial | Two API replicas, Redis event/worker recovery, web/API/storage/email smoke tests, client-owned account record |
| §16 Security Requirements | Auth, backend checks, private files, HTTPS, audit, validation/rate limits, backup/recovery, secrets, least privilege | Auth, server permissions, private signed files, audit, validation, and env-based secrets exist; rate-limit and recovery evidence is missing | Partial | Security checklist, all-route permission scan, rate-limit tests, backup/restore rehearsal, production HTTPS evidence |
| §17 SDLC and Timeline | Discovery through UAT/handover with change-controlled scope | Planning docs exist and much of the Django baseline was built; formal gate evidence is incomplete | Partial | Gate records from the implementation workflow and accepted release plan |
| §18 Scope Revisions | Enforce ten revisions covering payments, BIR wording, wages, AI, Redis, access, public agents, privacy, and budget | Most boundaries are documented and represented in code; older AI wording still conflicts with the stricter project rule | Partial | Conflict removed from active docs and regression tests cover every technical revision |
| §19 Out of Scope | Exclude checkout, official BIR invoicing, auto wage action, native apps, payroll, paid messaging, large migration, BI warehouse, unlimited revisions, 24/7 support | No excluded technical feature is present in the baseline | Built | Release review confirms no excluded capability or misleading product copy |
| §20 Commercial and Subscription Boundaries | Separate one-time development, recurring services, maintenance, and client-owned production accounts | Commercial details and ownership guidance are documented; accounts are not provisioned | Blocked - client | Signed commercial terms and production account ownership checklist |
| §21 Acceptance, Handover, Change Control | Sign-off, prototype approval, staging/UAT, criteria, warranty defects, change requests, handover, maintenance | Process is documented; formal UAT, handover, and warranty start are not complete | Not started | Signed UAT, deployment/handover record, warranty start, change log, and maintenance decision |
| Appendix A Data Fields | Minimized fields for customers, documents, batches, payments, tasks, KPI, support, applicants, agents, audit | Core models cover many fields; customer documents, handlers, approved address/contact details, and some review fields remain incomplete | Partial | Schema-to-field checklist approved in discovery and covered by migrations/validation tests |
| Appendix B Compliance Notes | Keep privacy, NPC, automated decision, breach, BIR, and wage boundaries visible without treating docs as legal advice | Boundaries are summarized in `docs/07`; final legal interpretation belongs to client advisers | Blocked - client | DPO/counsel review record and technical controls mapped to approved policy |

## Current implementation evidence

### TypeScript increment (2026-09-07)

| Scope | Target implementation and evidence | Status |
|---|---|---|
| §3, §16 Auth/access | Existing login uses cookie sessions in opt-in mode; web refresh/error tests and API role matrix pass. Account/role administration parity remains open. | Partial |
| §5 Portal | Existing portal reads own membership, immutable schedule total and release status. API cross-customer tests deny other clients. Verified Finance and support remain on baseline. | Partial |
| §6 Records | Batch terms, atomic enrollment/schedules, protected issued terms, legacy issuance, audit/events, search/pagination. Eight unit tests include Django parity fixtures; twelve API integration tests cover security/concurrency. Private documents/checklists and remaining edit UI are open. | Partial |
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

- [ ] Every scope row is `Built`, `Accepted`, or explicitly `Blocked - client` with a signed
      launch decision.
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
