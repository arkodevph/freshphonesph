# Fresh Phones PH — Integrated Web System & Portal

Planning documentation for the system defined in **Full Scope v5 (Revision 1.4, August 2026)**.

This repository (`freshphonesph`) is the **main repository** for the whole system. The
existing landing page becomes the public-website surface (§4) of a larger product.

> **Status:** Discovery & Design (Month 1). No application code is built yet.
> Per scope §17 and §21, the modules, roles, data model, and boundaries below must be
> **reviewed and signed off** before development proceeds.

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

## Legend (from the scope)

- ~~**Red / strikethrough**~~ — do NOT implement as written (removed from V1).
- **Green** — recommended replacement / the agreed behavior.
- **Blue** — explanation or client action.
