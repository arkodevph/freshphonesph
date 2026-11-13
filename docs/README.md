# Fresh Phones PH — Integrated Web System & Portal

> **2026-10-09 architecture update:** Neon PostgreSQL and Better Auth replace the
> planned Supabase database/Auth stack. The user reaffirmed Redis for scopes #11–12.
> Better Auth/MFA, Redis Streams/BullMQ and shared abuse rate limits are implemented locally; production
> provisioning, proxy/quota acceptance and private storage selection remain open. See
> [the decision record](20-v6-architecture-decision.md) and [Redis runbook](53-redis-events-workers.md).

Planning documentation for the system defined in **Full Scope v5 (Revision 1.4, August 2026)**.

This repository (`freshphonesph`) is the **main repository** for the whole system. The
existing landing page becomes the public-website surface (§4) of a larger product.

> **Status:** Next.js and NestJS are the active TypeScript deployables. Work follows the
> [feature/fix → staging → main branch flow](24-branch-flow.md). Follow
> [17-full-scope-workflow.md](17-full-scope-workflow.md) for delivery gates and
> [18-scope-traceability-matrix.md](18-scope-traceability-matrix.md) for scope coverage.
> Current implementation and acceptance work are in [BUILD_STATUS.md](BUILD_STATUS.md).
> Setup and contributor guidance are in [../AGENTS.md](../AGENTS.md).

## UI design

Follow [Workspace UI patterns](UI-PATTERNS.md) for screen-specific patterns, current decisions and the People repair queue.

Latest verification: [Cloud — CEO assistant](155-cloud-ceo-assistant.md). Previous: [Clients checklist and Public catalog](154-clients-checklist-and-catalog-copy.md), [Handler dialogs, report controls and Fresh AI loading](153-handler-dialogs-report-controls-and-ai-loading.md).

## What this system is (and is not)

| It IS                                                 | It is NOT                                     |
| ----------------------------------------------------- | --------------------------------------------- |
| A centralized client + employee portal                | An online checkout / payment processor (V1)   |
| A source of truth for batches & **verified** payments | A BIR-compliant invoicing system              |
| A secure document & records repository                | A system that auto-deducts salaries           |
| A task, reporting & role-based dashboard              | An AI that decides HR/finance actions         |
| A customer status & support portal                    | A public repository of customer/employee data |

## The one decision that shapes everything

**Customers do NOT pay inside the website.** Payment coordination stays in Messenger /
external channels. The system's job starts _after_ payment: authorized staff **record**
it, Finance **verifies** it, and only then does it affect a customer's balance. See
[03-data-model.md](03-data-model.md) and the Payment module in [05-modules.md](05-modules.md).

## Documents

For a quick summary and full current scope of the Batch Handler role, use
[Batch Handler — role and portal access](batch-handler-role-and-access.md).
For the audited gaps, proposed home priorities and pending implementation phases,
use [Batch Handler — findings and remaining-work plan](batch-handler-remaining-work-plan.md).

Start with the [2026-10-27 client feature implementation backlog](62-client-feature-implementation-backlog.md)
for the latest role, receipt-review, membership and reporting clarifications.
It overrides conflicting assumptions in documents 58–61 and records deployment
and all third-party integrations as deferred. It is a requirements update, not
an implementation-completion report.

For the October 28 afternoon work, current role access and exact test-preview paths,
read the [afternoon handoff](68-2026-10-28-afternoon-handoff.md). It distinguishes
current main-demo availability from historical isolated previews and pending acceptance.

For the sequential task queue aligned with the Basic Website Workflow and Organizational
Structure V4, start with [the workflow implementation checklist](58-workflow-v4-implementation-checklist.md).
For a focused list of what is missing or needs revision, use
[missing features and required revisions](59-missing-features-and-required-revisions.md).
Begin implementation with [Sprint 1 V4 roles and access](60-sprint-1-v4-roles-and-access.md).
Its first task is specified in [the V4 role and permission matrix](61-v4-role-and-permission-matrix.md).
The 2026-10-26 CEO override and implementation slice are in [CEO report-only access](62-ceo-report-only-access.md).
Its chart follow-up is documented in [CEO report visualizations](63-ceo-report-visualizations.md).
The subsequent layout alignment is in [CEO client-portal design](64-ceo-client-portal-design.md).

| Doc                                                                                | Covers                                                                                                                                                  | Scope refs           |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| [00-roadmap.md](00-roadmap.md)                                                     | SDLC phases, milestones, payment schedule                                                                                                               | §17, §20, §21        |
| [01-architecture.md](01-architecture.md)                                           | Tech stack, system + payment flow, hosting                                                                                                              | §15                  |
| [02-foundation-setup.md](02-foundation-setup.md)                                   | Monorepo layout, setup order, environments                                                                                                              | §15, §16             |
| [03-data-model.md](03-data-model.md)                                               | Entities, fields, relationships                                                                                                                         | §6, §7, §A           |
| [04-roles-access.md](04-roles-access.md)                                           | Role matrix, permissions, least-privilege                                                                                                               | §3                   |
| [05-modules.md](05-modules.md)                                                     | Every functional module, feature by feature                                                                                                             | §4–§13               |
| [06-dev-responsibilities.md](06-dev-responsibilities.md)                           | Developer role vs client obligations                                                                                                                    | §14, §21             |
| [07-compliance-security.md](07-compliance-security.md)                             | Privacy (DPA/NPC), BIR boundary, security controls                                                                                                      | §14, §16, §B         |
| [08-commercials-boundaries.md](08-commercials-boundaries.md)                       | Fee, subscriptions, out-of-scope, handover                                                                                                              | §19, §20, §21        |
| [09-tech-stack.md](09-tech-stack.md)                                               | **Decided target stack** — NestJS + Prisma API and Next.js web, all TypeScript                                                                          | §15                  |
| [10-team-roles.md](10-team-roles.md)                                               | Developer team split & module ownership (internal)                                                                                                      | —                    |
| [11-payments-reporting-design.md](11-payments-reporting-design.md)                 | Design spec for M4 (Payments/Finance) + M7 (Reporting)                                                                                                  | §7, §9               |
| [12-records-schema-design.md](12-records-schema-design.md)                         | Design spec for M3 records (Batch/Client/ScheduleItem) — the balance interface                                                                          | §6                   |
| [13-auth-roles-schema-design.md](13-auth-roles-schema-design.md)                   | Design spec for M2 auth/roles (Employee, CustomerAccount, permission map)                                                                               | §3, §16              |
| [14-sprint-plan-payments-reporting.md](14-sprint-plan-payments-reporting.md)       | Sprint plan & stories for Justine Cane's role (M4 + M7)                                                                                                 | §7, §9               |
| [15-payments-reporting-architecture.md](15-payments-reporting-architecture.md)     | **Engineering plan** for M4+M7 — code structure, flows, DB schema (Justine Cane)                                                                        | §7, §9               |
| [16-how-payments-work.md](16-how-payments-work.md)                                 | **Explainer** (for team & client) — no payment button; claim → verify → balance                                                                         | §7, §19              |
| [17-full-scope-workflow.md](17-full-scope-workflow.md)                             | **How-to** — TypeScript full-scope delivery, migration, gates, evidence, UAT, handover                                                                  | §1–§21, §A–§B        |
| [18-scope-traceability-matrix.md](18-scope-traceability-matrix.md)                 | **Reference** — every PDF section mapped to current status and acceptance evidence                                                                      | §1–§21, §A–§B        |
| [19-records-typescript-preview.md](19-records-typescript-preview.md)               | Run the existing UI with TypeScript records, installments, customer membership and live updates                                                         | §3, §5, §6, §15, §16 |
| [20-v6-architecture-decision.md](20-v6-architecture-decision.md)                   | Approved v6 production architecture, capacity baseline, recovery model, and pending deployment choices                                                  | §15–§15.2            |
| [25-record-edit-history.md](25-record-edit-history.md)                             | Client/batch editing, schedule locks, safe conflicts, scoped change history and UAT checks                                                              | §6                   |
| [26-batch-assignments.md](26-batch-assignments.md)                                 | Handler/agent assignment, scoped record access, filters, agent directory, migration and UAT                                                             | §3, §6, §11          |
| [27-finance-pending-alerts.md](27-finance-pending-alerts.md)                       | Finance bell, per-account unread state, pending-payment links, read/decision races and UAT                                                              | §7, §12              |
| [28-staff-task-alerts.md](28-staff-task-alerts.md)                                 | Shared staff bell, task assignment/deadline reminders, scoped receipts, exact task links and UAT                                                        | §8, §12              |
| [29-finance-result-alerts.md](29-finance-result-alerts.md)                         | Recipient-scoped Finance decisions, historical notes, shared Results filter and UAT                                                                     | §7, §12              |
| [30-staff-email-delivery.md](30-staff-email-delivery.md)                           | Staff task/Finance emails, Owner templates/timing, delivery history, bounded retries and UAT                                                            | §8, §12              |
| [31-support-staff-alerts.md](31-support-staff-alerts.md)                           | Customer Service bell/email events, triage/assignee routing, exact case links, safe drafts and UAT                                                      | §5, §12              |
| [32-account-access-alerts.md](32-account-access-alerts.md)                         | Owner account creation/role/access bell and email events, historical snapshots, exact account links, safe drafts and UAT                                | §3, §12              |
| [33-staff-email-launch.md](33-staff-email-launch.md)                               | Client-owned sender setup, read-only configuration checks, isolated email smoke tests and named Owner sign-off                                          | §12, §16             |
| [34-records-client-filters.md](34-records-client-filters.md)                       | Combined model/status/date/assignment filters, accurate paging, exact client links, safe drafts and UAT                                                 | §3, §6               |
| [35-upstream-merge.md](35-upstream-merge.md)                                       | Operations/recruitment/landing import, local-work preservation, migration reconciliation and verification                                               | §4, §6, §9, §11      |
| [36-scope-handoff.md](36-scope-handoff.md)                                         | Completed local work, remaining implementation/client dependencies, coworker handoff and validation commands                                            | §1–§21               |
| [37-reports-page.md](37-reports-page.md)                                           | Staff Reports page, filters, CSV/XLSX, saved periods, permissions and verification                                                                      | §9                   |
| [38-batch-collection-reports.md](38-batch-collection-reports.md)                   | Batch client/agreement/balance totals, period collections, full-scope exports/saves and remaining reconciliation scope                                  | §7, §9               |
| [39-reconciliation-reports.md](39-reconciliation-reports.md)                       | Internal claim/verification-audit comparison, review flags, authorized payment exceptions, exports/history and remaining external matching scope        | §7, §9               |
| [40-payment-adjustments.md](40-payment-adjustments.md)                             | Finance-only append-only amount corrections/reversals, consistent balances/documents/reports, concurrency, audit evidence and handoff                   | §7, §9               |
| [41-recruitment-directory.md](41-recruitment-directory.md)                         | Full job/applicant search and paging, unfiltered counts, retained review drafts, explicit stale-review resolution and private access checks             | §11, §16             |
| [42-confidential-hr-access.md](42-confidential-hr-access.md)                       | Owner-approved HR/COO grants, private KPI/applicant access, decision history, revocation and UAT                                                        | §3, §8, §11, §16     |
| [43-public-catalog.md](43-public-catalog.md)                                       | Maintained public listings, prices, availability, photos, role controls and migration                                                                   | §4                   |
| [44-catalog-installment-breakdown.md](44-catalog-installment-breakdown.md)         | Staff-entered offer terms, exact sample installments, illustrative dates, fixed intervals and acceptance                                                | §4                   |
| [45-faq-topic-search.md](45-faq-topic-search.md)                                   | Public FAQ topics, combined question/answer search, reset behavior and accessible accordion                                                             | §4                   |
| [46-public-support-entry.md](46-public-support-entry.md)                           | Public help/contact page, customer support entry, preserved sign-in destinations and role routing                                                       | §4, §5, §10          |
| [47-consequential-hr-action-approvals.md](47-consequential-hr-action-approvals.md) | Approved HR/COO requests, Owner approve/reject decisions, immutable history and no automatic pay change                                                 | §3, §8, §16          |
| [48-support-concern-source-tracking.md](48-support-concern-source-tracking.md)     | Support case entry source, staff logging, immutable legacy backfill, filters and reporting                                                              | §10                  |
| [49-submitted-report-analysis.md](49-submitted-report-analysis.md)                 | Human analysis submitted with a saved period or attached to an older numeric report, immutable history and permissions                                  | §9                   |
| [50-privacy-notices-terms.md](50-privacy-notices-terms.md)                         | Draft customer, employee and applicant notices and portal terms, linked screens, versioned acknowledgement mechanism and approval checklist             | §14                  |
| [51-retention-deletion.md](51-retention-deletion.md)                               | Owner-managed retention policies, expiry previews, holds, approved erasure, durable private file removal, deletion ledger and backup/provider follow up | §14, §16             |
| [52-authentication-mfa.md](52-authentication-mfa.md)                               | Better Auth credential/session migration, TOTP/recovery codes, required staff enrollment, revocation, local evidence and production cutover/recovery    | §3, §16              |
| [53-redis-events-workers.md](53-redis-events-workers.md)                           | Redis Streams, committed event relay, separate BullMQ workers, recovery, operations and local setup                                                     | §12, §15, §18        |
| [54-abuse-rate-limits.md](54-abuse-rate-limits.md)                                 | Shared Redis/PostgreSQL abuse limits, public applications and lookup, upload/report protection, live caps, proxy setup and tests                        | §16, §18             |
| [55-sql-execution-index-design.md](55-sql-execution-index-design.md)               | SQL logical execution order, Finance query scope, composite index migrations and measured EXPLAIN plans                                                 | §7, §9, §15          |

## Legend (from the scope)

- ~~**Red / strikethrough**~~ — do NOT implement as written (removed from V1).
- **Green** — recommended replacement / the agreed behavior.
- **Blue** — explanation or client action.

The scheduled installment report is documented in [Scheduled installment earnings](65-scheduled-installment-earnings.md).

- [66 — Role access alignment](66-role-access-alignment.md): approved business roles, assigned scope and reviewed Agent enrollment.

- [67 — Owner / CEO role](67-owner-ceo-role.md): one report-only business role and explicit technical maintenance code.

- [GCash history in the main demo](69-gcash-history-main-demo.md): existing seeded Batch Handler/Records one-click logins, PDF review and current access.

| [71-workflow-in-app-notifications.md](71-workflow-in-app-notifications.md) | Main staff bell enrollment requests/outcomes, current recipient scope, read receipts, exact links and UAT | §3, §12 |

- [Multiple batch memberships](70-multiple-batch-memberships.md): one identity/login, independent batch histories, current approval flow and main-demo test guide.

- [GCash PDF reading and password uploads](72-gcash-pdf-reading.md): automatic text/OCR reading, per-revision transaction tables and source-review checks in the main demo.

- [GCash review workspace](73-gcash-review-workspace.md): original PDF comparison, audited transaction corrections, review history and reversible archive/restore.

- [Calendar schedules and Agent numbering in the main demo](74-calendar-numbering-main-demo.md): normal accounts, current permissions, preserved history and combined testing for checklist #6/#15.

- [Member withdrawal/refund and replacement review plan](76-member-withdrawal-review-plan.md): original member → Agent → COO requirements and source comparison, now implemented in docs/77.

- [Batch capacity and staff-only internal positions](75-batch-capacity-internal-positions.md): eight real memberships, four internal display positions, atomic/full and authorized manual activation, customer isolation and preservation checks.

- [Member withdrawals, replacement and separate refunds](77-member-withdrawals-main-demo.md): main-demo workflow, current role boundaries, unpaid continuation/restart, Finance external payout and 531-check verification.
- [Customer batch participation](78-customer-batch-participation.md): My membership aggregate count/fullness, privacy and main-browser evidence.
- [Printable application summary](79-printable-application-summary.md): My documents preview/PDF/Print, captured customer ownership, recorded plan fields, original schedule amount and verified local evidence.
- [Editable website enrollment form](81-editable-public-enrollment-form.md): public landing intake, COO/Records draft/publish builder, versioned answers, assigned Agent→Manager workflow, privacy/retention and verified main-demo evidence.

- [Payroll spreadsheet workflow v1](80-payroll-spreadsheet-workflow.md): blank template, fictional example, documented assumptions, preparation/review/payment flow and 18-scenario verification; client alignment remains separate.

- [Operations monitoring queue](125-operations-monitor.md): F03 queue, scoped Moderator metadata, source links, audited follow-ups and configurable COO review deadline.
- [126 — Workflow handoff notifications](126-workflow-handoff-notifications.md) — current-stage recipients, Finance-ready alerts, read state and local verification.

- [GCash payment match suggestions — F09](131-gcash-payment-match-suggestions.md)
- [F11/F12 withdrawal and replacement completion](132-withdrawal-replacement-verification.md): live continuation/restart, separate refunds and enrollment-link access fix.

- [F17 signed agreement upload verification](133-f17-signed-agreement-verification.md): selected PDF/image flow, private Records review/history and pending approved template.

- [F18 Excel payroll acceptance](134-f18-payroll-acceptance.md): retained workbook format, delivered artifact verification, calculation boundaries and manual Excel checklist.

- [145 — COO portal remodel continuation](145-coo-portal-remodel.md): searchable People directories, earnings containment, Analysis, shared controls and route verification.
- [156 — Independent role designs](156-independent-role-designs.md): separate page components and styles for each staff role, with shared business behavior and authorization.
- [157 — Cloud workspace and retrieval](157-cloud-workspace-and-retrieval.md): live 3D mascot, conversation/project controls, safe answer formatting, live-data recovery and browser deletion fix.
