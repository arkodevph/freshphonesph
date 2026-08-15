# 10 — Team Roles & Module Ownership

**Internal** — this is the developer team split, not part of the client scope document.
Complements [06-dev-responsibilities.md](06-dev-responsibilities.md) (which covers the
developer-vs-client boundary). Module IDs map to [05-modules.md](05-modules.md).

Team: **4 developers, full-time.** Client point-of-contact / project representative:
**Justine Rhey Tambong.**

## Ownership

| Developer | Owns (modules) | Module IDs | Area |
|---|---|---|---|
| **Justine Rhey Tambong** | Auth/roles + Paluwagan Records & Client Mgmt | **M2, M3** | Core spine (auth, records source-of-truth). Also **client point-of-contact**. |
| **Justine Cane Bacurin** | Payment Recording & Finance Verification + Reporting & Analytics | **M4, M7** | Money/verification core + reporting. Design detail: [11-payments-reporting-design.md](11-payments-reporting-design.md) |
| **Rovic James Somontina** | Public Website + Customer Portal | **M1, M5** | Public-facing + customer-facing surfaces |
| **Ralph Rowel Dela Rosa** | Tasks/KPI + Customer Service + Recruitment/Agent Verification + Notifications | **M6, M8, M9, M10** | Operations & people modules |

**Unassigned / shared:**
- **M11 — AI Assistant** (§13): built last, assistive-only. Owner TBD; likely shared or taken by
  whoever finishes their spine first, since it layers on top of stable modules.
- **Audit & security cross-cutting** (`audit_app`, §16): shared — each owner writes audit
  entries for their own module's sensitive actions.

## Shared by everyone (~50 h each)
- **Discovery & design** (Month 1): schema, wireframes, acceptance criteria, role matrix.
- **Privacy & security** hardening (§14, §16): private storage, permissions, validation,
  audit, backups, secrets.
- **Testing & hardening** (Month 5).
- **UAT, deployment, docs, training, handover** (Month 6).

## Dependencies between owners (build order matters)

```
Tambong (M2 auth/roles) ──► everyone (all gated modules depend on auth + RBAC)
Tambong (M3 records: batch/client) ──► Bacurin (M4 payments attach to client/batch)
                                   └─► Somontina (M5 portal reads membership/balance)
Bacurin (M4 verified payments)  ──► Somontina (M5 portal shows verified history/balance)
                                └─► Bacurin  (M7 reporting reads verified payment data)
Dela Rosa (M6 tasks)            ──► Bacurin (M7 reporting reads task/KPI metrics)
```

**Implication for Justine Cane (you):** M4 depends on Tambong's `auth_app` (roles/permissions,
esp. the Finance role) and `batches_app`/`clients_app` (a payment attaches to a client + batch).
Coordinate the **client/batch schema and the role names** with Tambong early so M4 isn't
blocked. M7 depends on M4 being done first (and on M6 for task/KPI metrics).

## Notes
- Module-to-person mapping is a **starting assignment** — swap freely by strength. The *split
  structure* (4-way, these groupings) is what's locked, per the team decision (2026-08-15).
- Commercials, timeline, and rate context are internal and live in the Obsidian vault
  (`Projects/Fresh Phones PH.md`), not in this repo.
