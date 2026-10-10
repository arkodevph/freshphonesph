# Fresh Phones PH — Integrated Web System & Portal

> **2026-10-09 architecture update:** Neon PostgreSQL and Better Auth replace the
> planned Supabase database/Auth stack. The user reaffirmed Redis for scopes #11–12.
> Better Auth/MFA, Redis Streams/BullMQ and shared abuse rate limits are implemented locally; production
> provisioning, proxy/quota acceptance and private storage selection remain open. See
> [the decision record](20-v6-architecture-decision.md) and [Redis runbook](53-redis-events-workers.md).

Planning documentation for the system defined in **Full Scope v5 (Revision 1.4, August 2026)**.

This repository (`freshphonesph`) is the **main repository** for the whole system. The
existing landing page becomes the public-website surface (§4) of a larger product.

> **Status:** The repository has a working Django baseline originating on `foundation`. Current work
> follows the [feature/fix → staging → main branch flow](24-branch-flow.md). The approved target
> now uses **TypeScript for both web and API**. Follow
> **[17-full-scope-workflow.md](17-full-scope-workflow.md)** for the migration and delivery gates,
> and use **[18-scope-traceability-matrix.md](18-scope-traceability-matrix.md)** for scope status.
> For the existing baseline see **[BUILD_STATUS.md](BUILD_STATUS.md)**, and for its merge write-up see
> **[PULL_REQUEST.md](PULL_REQUEST.md)**. New here (human or AI)? Start with
> **[../AGENTS.md](../AGENTS.md)**.

## What this system is (and is not)

| It IS | It is NOT |
|---|---|
| A centralized client + employee portal | An online checkout / payment processor (V1) |
| A source of truth for batches & **verified** payments | A BIR-compliant invoicing system |
| A secure document & records repository | A system that auto-deducts salaries |
| A task, reporting & role-based dashboard | An AI that decides HR/finance actions |
| A customer status & support portal | A public repository of customer/employee data |

## The one decision that shapes everything

**Customers do NOT pay inside the website.** Payment coordination stays in Messenger /
external channels. The system's job starts *after* payment: authorized staff **record**
it, Finance **verifies** it, and only then does it affect a customer's balance. See
[03-data-model.md](03-data-model.md) and the Payment module in [05-modules.md](05-modules.md).

## Documents

| Doc | Covers | Scope refs |
|---|---|---|
| [00-roadmap.md](00-roadmap.md) | SDLC phases, milestones, payment schedule | §17, §20, §21 |
| [01-architecture.md](01-architecture.md) | Tech stack, system + payment flow, hosting | §15 |
| [02-foundation-setup.md](02-foundation-setup.md) | Monorepo layout, setup order, environments | §15, §16 |
| [03-data-model.md](03-data-model.md) | Entities, fields, relationships | §6, §7, §A |
| [04-roles-access.md](04-roles-access.md) | Role matrix, permissions, least-privilege | §3 |
| [05-modules.md](05-modules.md) | Every functional module, feature by feature | §4–§13 |
| [06-dev-responsibilities.md](06-dev-responsibilities.md) | Developer role vs client obligations | §14, §21 |
| [07-compliance-security.md](07-compliance-security.md) | Privacy (DPA/NPC), BIR boundary, security controls | §14, §16, §B |
| [08-commercials-boundaries.md](08-commercials-boundaries.md) | Fee, subscriptions, out-of-scope, handover | §19, §20, §21 |
| [09-tech-stack.md](09-tech-stack.md) | **Decided target stack** — NestJS + Prisma API and Next.js web, all TypeScript | §15 |
| [10-team-roles.md](10-team-roles.md) | Developer team split & module ownership (internal) | — |
| [11-payments-reporting-design.md](11-payments-reporting-design.md) | Design spec for M4 (Payments/Finance) + M7 (Reporting) | §7, §9 |
| [12-records-schema-design.md](12-records-schema-design.md) | Design spec for M3 records (Batch/Client/ScheduleItem) — the balance interface | §6 |
| [13-auth-roles-schema-design.md](13-auth-roles-schema-design.md) | Design spec for M2 auth/roles (Employee, CustomerAccount, permission map) | §3, §16 |
| [14-sprint-plan-payments-reporting.md](14-sprint-plan-payments-reporting.md) | Sprint plan & stories for Justine Cane's role (M4 + M7) | §7, §9 |
| [15-payments-reporting-architecture.md](15-payments-reporting-architecture.md) | **Engineering plan** for M4+M7 — code structure, flows, DB schema (Justine Cane) | §7, §9 |
| [16-how-payments-work.md](16-how-payments-work.md) | **Explainer** (for team & client) — no payment button; claim → verify → balance | §7, §19 |
| [17-full-scope-workflow.md](17-full-scope-workflow.md) | **How-to** — TypeScript full-scope delivery, migration, gates, evidence, UAT, handover | §1–§21, §A–§B |
| [18-scope-traceability-matrix.md](18-scope-traceability-matrix.md) | **Reference** — every PDF section mapped to current status and acceptance evidence | §1–§21, §A–§B |
| [19-records-typescript-preview.md](19-records-typescript-preview.md) | Run the existing UI with TypeScript records, installments, customer membership and live updates | §3, §5, §6, §15, §16 |
| [20-v6-architecture-decision.md](20-v6-architecture-decision.md) | Approved v6 production architecture, capacity baseline, recovery model, and pending deployment choices | §15–§15.2 |
| [25-record-edit-history.md](25-record-edit-history.md) | Client/batch editing, schedule locks, safe conflicts, scoped change history and UAT checks | §6 |
| [26-batch-assignments.md](26-batch-assignments.md) | Handler/agent assignment, scoped record access, filters, agent directory, migration and UAT | §3, §6, §11 |
| [27-finance-pending-alerts.md](27-finance-pending-alerts.md) | Finance bell, per-account unread state, pending-payment links, read/decision races and UAT | §7, §12 |
| [28-staff-task-alerts.md](28-staff-task-alerts.md) | Shared staff bell, task assignment/deadline reminders, scoped receipts, exact task links and UAT | §8, §12 |
| [29-finance-result-alerts.md](29-finance-result-alerts.md) | Recipient-scoped Finance decisions, historical notes, shared Results filter and UAT | §7, §12 |
| [30-staff-email-delivery.md](30-staff-email-delivery.md) | Staff task/Finance emails, Owner templates/timing, delivery history, bounded retries and UAT | §8, §12 |
| [31-support-staff-alerts.md](31-support-staff-alerts.md) | Customer Service bell/email events, triage/assignee routing, exact case links, safe drafts and UAT | §5, §12 |
| [32-account-access-alerts.md](32-account-access-alerts.md) | Owner account creation/role/access bell and email events, historical snapshots, exact account links, safe drafts and UAT | §3, §12 |
| [33-staff-email-launch.md](33-staff-email-launch.md) | Client-owned sender setup, read-only configuration checks, isolated email smoke tests and named Owner sign-off | §12, §16 |
| [34-records-client-filters.md](34-records-client-filters.md) | Combined model/status/date/assignment filters, accurate paging, exact client links, safe drafts and UAT | §3, §6 |
| [35-upstream-merge.md](35-upstream-merge.md) | Operations/recruitment/landing import, local-work preservation, migration reconciliation and verification | §4, §6, §9, §11 |
| [36-scope-handoff.md](36-scope-handoff.md) | Completed local work, remaining implementation/client dependencies, coworker handoff and validation commands | §1–§21 |
| [37-reports-page.md](37-reports-page.md) | Staff Reports page, filters, CSV/XLSX, saved periods, permissions and verification | §9 |
| [38-batch-collection-reports.md](38-batch-collection-reports.md) | Batch client/agreement/balance totals, period collections, full-scope exports/saves and remaining reconciliation scope | §7, §9 |
| [39-reconciliation-reports.md](39-reconciliation-reports.md) | Internal claim/verification-audit comparison, review flags, authorized payment exceptions, exports/history and remaining external matching scope | §7, §9 |
| [40-payment-adjustments.md](40-payment-adjustments.md) | Finance-only append-only amount corrections/reversals, consistent balances/documents/reports, concurrency, audit evidence and handoff | §7, §9 |
| [41-recruitment-directory.md](41-recruitment-directory.md) | Full job/applicant search and paging, unfiltered counts, retained review drafts, explicit stale-review resolution and private access checks | §11, §16 |
| [42-confidential-hr-access.md](42-confidential-hr-access.md) | Owner-approved HR/COO grants, private KPI/applicant access, decision history, revocation and UAT | §3, §8, §11, §16 |
| [43-public-catalog.md](43-public-catalog.md) | Maintained public listings, prices, availability, photos, role controls and migration | §4 |
| [44-catalog-installment-breakdown.md](44-catalog-installment-breakdown.md) | Staff-entered offer terms, exact sample installments, illustrative dates, fixed intervals and acceptance | §4 |
| [45-faq-topic-search.md](45-faq-topic-search.md) | Public FAQ topics, combined question/answer search, reset behavior and accessible accordion | §4 |
| [46-public-support-entry.md](46-public-support-entry.md) | Public help/contact page, customer support entry, preserved sign-in destinations and role routing | §4, §5, §10 |
| [47-consequential-hr-action-approvals.md](47-consequential-hr-action-approvals.md) | Approved HR/COO requests, Owner approve/reject decisions, immutable history and no automatic pay change | §3, §8, §16 |
| [48-support-concern-source-tracking.md](48-support-concern-source-tracking.md) | Support case entry source, staff logging, immutable legacy backfill, filters and reporting | §10 |
| [49-submitted-report-analysis.md](49-submitted-report-analysis.md) | Human analysis submitted with a saved period or attached to an older numeric report, immutable history and permissions | §9 |
| [50-privacy-notices-terms.md](50-privacy-notices-terms.md) | Draft customer, employee and applicant notices and portal terms, linked screens, versioned acknowledgement mechanism and approval checklist | §14 |
| [51-retention-deletion.md](51-retention-deletion.md) | Owner-managed retention policies, expiry previews, holds, approved erasure, durable private file removal, deletion ledger and backup/provider follow up | §14, §16 |
| [52-authentication-mfa.md](52-authentication-mfa.md) | Better Auth credential/session migration, TOTP/recovery codes, required staff enrollment, revocation, local evidence and production cutover/recovery | §3, §16 |
| [53-redis-events-workers.md](53-redis-events-workers.md) | Redis Streams, committed event relay, separate BullMQ workers, recovery, operations and local setup | §12, §15, §18 |
| [54-abuse-rate-limits.md](54-abuse-rate-limits.md) | Shared Redis/PostgreSQL abuse limits, public applications and lookup, upload/report protection, live caps, proxy setup and tests | §16, §18 |

## Legend (from the scope)

- ~~**Red / strikethrough**~~ — do NOT implement as written (removed from V1).
- **Green** — recommended replacement / the agreed behavior.
- **Blue** — explanation or client action.
