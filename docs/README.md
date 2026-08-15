# Fresh Phones PH — Integrated Web System & Portal

Planning documentation for the system defined in **Full Scope v5 (Revision 1.4, August 2026)**.

This repository (`freshphonesph`) is the **main repository** for the whole system. The
existing landing page becomes the public-website surface (§4) of a larger product.

> **Status:** V1 core **implemented** on the `foundation` branch — 8 of 11 modules built
> end-to-end, 80 backend tests passing. These 00–16 docs are the *plan*; for what's actually
> built see **[BUILD_STATUS.md](BUILD_STATUS.md)**, and for the merge write-up see
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
| [09-tech-stack.md](09-tech-stack.md) | **Decided stack** — Django REST backend + Next.js frontend (from ARKO) | §15 |
| [10-team-roles.md](10-team-roles.md) | Developer team split & module ownership (internal) | — |
| [11-payments-reporting-design.md](11-payments-reporting-design.md) | Design spec for M4 (Payments/Finance) + M7 (Reporting) | §7, §9 |
| [12-records-schema-design.md](12-records-schema-design.md) | Design spec for M3 records (Batch/Client/ScheduleItem) — the balance interface | §6 |
| [13-auth-roles-schema-design.md](13-auth-roles-schema-design.md) | Design spec for M2 auth/roles (Employee, CustomerAccount, permission map) | §3, §16 |
| [14-sprint-plan-payments-reporting.md](14-sprint-plan-payments-reporting.md) | Sprint plan & stories for Justine Cane's role (M4 + M7) | §7, §9 |
| [15-payments-reporting-architecture.md](15-payments-reporting-architecture.md) | **Engineering plan** for M4+M7 — code structure, flows, DB schema (Justine Cane) | §7, §9 |
| [16-how-payments-work.md](16-how-payments-work.md) | **Explainer** (for team & client) — no payment button; claim → verify → balance | §7, §19 |
| [DEV_ACCOUNTS.md](DEV_ACCOUNTS.md) | Local dev login accounts + how to seed them | — |

## Legend (from the scope)

- ~~**Red / strikethrough**~~ — do NOT implement as written (removed from V1).
- **Green** — recommended replacement / the agreed behavior.
- **Blue** — explanation or client action.
