# Fresh Phones PH — Integrated Web System & Portal

Planning documentation for the system defined in **Full Scope v5 (Revision 1.4, August 2026)**.

This repository (`freshphonesph`) is the **main repository** for the whole system. The
existing landing page becomes the public-website surface (§4) of a larger product.

> **Status:** The repository has a working Django baseline on `foundation`. The approved target
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

## Legend (from the scope)

- ~~**Red / strikethrough**~~ — do NOT implement as written (removed from V1).
- **Green** — recommended replacement / the agreed behavior.
- **Blue** — explanation or client action.
