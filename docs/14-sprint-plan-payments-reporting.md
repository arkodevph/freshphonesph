# 14 — Sprint Plan: Justine Cane's Role (M4 Payments/Finance + M7 Reporting)

> **Historical plan:** Use this for domain acceptance details only. The active TypeScript
> delivery sequence is [17-full-scope-workflow.md](17-full-scope-workflow.md).

Story-level sprint plan for **Justine Cane Bacurin**'s modules. Built on the design specs in
[11-payments-reporting-design.md](11-payments-reporting-design.md) and the interfaces in
[12-records-schema-design.md](12-records-schema-design.md) (M3) and
[13-auth-roles-schema-design.md](13-auth-roles-schema-design.md) (M2).

**Estimates:** story points (Fibonacci) + rough dev-hours. Your area ≈ **145–190 h** of build
(per the vault estimate). Sprints are **2 weeks**. Points legend: 1≈½day, 2≈1day, 3≈1.5day,
5≈2–3day, 8≈4–5day.

## Dependencies before you can start building (not just planning)
| Blocker | From | Needed for |
|---|---|---|
| Finance role key + `PAYMENT_VERIFY` permission | Tambong (M2, doc 13) | Sprint 2 verify |
| `Client` / `Batch` / `ScheduleItem` models | Tambong (M3, doc 12) | Sprint 1 record |
| `storage_app` presign helper | shared | proof-file upload |
| `audit_app` write contract | shared | every verification |
| Django project skeleton on Railway + Supabase Postgres | foundation (Month 2) | all |

> You can do **Sprint 0** in parallel with the foundation; Sprints 1–4 need the foundation +
> the M2/M3 contracts locked.

---

## Sprint 0 — Setup & contracts (alongside foundation)
**Goal:** unblock your build by nailing interfaces and standing up `payments_app`.

| ID | Story | Acceptance | Pts | Hrs |
|---|---|---|---:|---:|
| S0.1 | As a dev, I confirm the M2/M3 contracts with Tambong so my modules aren't coupled to his internals | Finance role key, `PAYMENT_VERIFY`/`PAYMENT_RECORD`/`REPORT_VIEW`, and `Client/Batch/ScheduleItem` field names are written down & signed off in docs 12/13 | 2 | 4 |
| S0.2 | As a dev, I scaffold `payments_app` + `reports_app` with test fixtures | apps registered; factory/seed data for a batch+client+schedule exists; CI runs the app's tests | 3 | 6 |
| S0.3 | As a dev, I agree the balance rule (verified-derived, no mutable "paid" field) | documented decision in doc 12; a unit test asserts `remaining = total_due - verified_paid` | 2 | 4 |

**Sprint 0 ≈ 7 pts / ~14 h**

---

## Sprint 1 — Payment recording (M4, part 1)
**Goal:** authorized staff can record an external payment; it stays **pending**; it's listable.

| ID | Story | Acceptance | Pts | Hrs |
|---|---|---|---:|---:|
| S1.1 | As authorized staff, I record a payment (client, batch, amount, date, method, ref, optional proof) so Messenger evidence becomes a searchable record | `POST /api/payments/` creates a **pending** record; requires `PAYMENT_RECORD`; amount>0 validated | 5 | 10 |
| S1.2 | As staff, I attach a proof file stored privately | proof uploads via `storage_app` presigned URL; file not publicly reachable; link stored on payment | 3 | 8 |
| S1.3 | As staff, I list/filter payments by client, batch, status, date range | `GET /api/payments/?client=&batch=&status=&range=`; results role-scoped; paginated | 3 | 6 |
| S1.4 | As the system, I reject invalid entries (amount≤0, dup reference warning, over-balance flag) | validation errors returned; duplicate reference for same client warns; overpayment flagged not blocked | 3 | 6 |

**Sprint 1 ≈ 14 pts / ~30 h** — *pending records must NOT move any balance (test it).*

---

## Sprint 2 — Finance verification (M4, part 2) ⭐ the core
**Goal:** Finance verifies; only verified payments move balances; everything audited.

| ID | Story | Acceptance | Pts | Hrs |
|---|---|---|---:|---:|
| S2.1 | As Finance, I verify/reject/needs-clarification a payment with notes | `POST /api/payments/{id}/verify/`; **`PAYMENT_VERIFY` only** (owner/finance); transaction-atomic | 5 | 10 |
| S2.2 | As the business, only **verified** payments change amount-paid/remaining balance | balance endpoint reflects verified only; reject/needs-clarification never touch balance (tests for each path) | 5 | 10 |
| S2.3 | As an auditor, every state change writes an audit entry (actor, before/after, ts) | `audit_app` entry on each transition; post-`verified` edits blocked (require new adjustment) | 3 | 6 |
| S2.4 | As Finance, the system generates a Billing Statement / SOA and a Payment Confirmation | operational-doc endpoints; wording never claims official BIR invoice (§7 boundary) | 3 | 8 |
| S2.5 | As a customer, I'm notified when my payment is verified | triggers M10 notification (email via Resend + in-app) on verify | 2 | 4 |

**Sprint 2 ≈ 18 pts / ~38 h** — *this is the highest-risk sprint; over-test the balance + permission rules.*

---

## Sprint 3 — Reporting foundation (M7, part 1)
**Goal:** dashboards & collection reports that count **verified** money only.

| ID | Story | Acceptance | Pts | Hrs |
|---|---|---|---:|---:|
| S3.1 | As management, I see dashboard cards (active batches, verified payments, **pending verification**, open concerns, late tasks) | `GET /api/reports/dashboard/?range=`; counts respect role visibility; uses DB aggregates | 5 | 10 |
| S3.2 | As Finance/ops, I run a collections report (verified vs expected, balances) filtered by range/batch | `GET /api/reports/collections/`; money = verified only; pending shown separately | 5 | 10 |
| S3.3 | As a user, I filter all reports by day/week/month/custom range | shared date-range filter; correct boundaries | 2 | 4 |
| S3.4 | As Analytics, I get aggregated data and only fields my role may see | role-scoped serializers; no private fields leak | 3 | 6 |

**Sprint 3 ≈ 15 pts / ~30 h**

---

## Sprint 4 — Reporting exports, history & hardening (M7, part 2)
**Goal:** exports, retention, performance, tests, UAT-ready.

| ID | Story | Acceptance | Pts | Hrs |
|---|---|---|---:|---:|
| S4.1 | As a user, I export a report to CSV/Excel (and PDF where needed) | `GET /api/reports/{name}/export/?format=`; exports contain only authorized fields | 3 | 8 |
| S4.2 | As management, historical reporting periods are preserved when new data arrives | prior periods queryable; no destructive overwrite | 2 | 4 |
| S4.3 | As a dev, reports are performant (indexes, aggregates, no row-loading) | `Payment` indexes in place; collection query uses `annotate/Sum`; basic perf check | 2 | 4 |
| S4.4 | As a dev, M4+M7 are covered by tests and pass hardening | unit + API tests for verify/balance/permissions/reports green; edge cases from doc 11 covered | 5 | 10 |

**Sprint 4 ≈ 12 pts / ~26 h**

---

## Summary

| Sprint | Focus | Pts | Hrs |
|---|---|---:|---:|
| 0 | Setup & contracts | 7 | 14 |
| 1 | Payment recording | 14 | 30 |
| 2 | Finance verification (core) | 18 | 38 |
| 3 | Reporting foundation | 15 | 30 |
| 4 | Reporting exports & hardening | 12 | 26 |
| **Total** | | **66** | **~138 h** |

~138 h lands inside the vault's 145–190 h estimate for your area (add buffer for coordination
+ revisions). Maps to the roadmap ([00-roadmap.md](00-roadmap.md)): Sprints 1–2 = **Month 3
Operations**; Sprints 3–4 = **Month 4 Management**.

## Definition of Done (every story)
- Server-side permission enforced (not UI-only); tests prove an under-privileged role is rejected.
- Money touches only **verified** payments; a test proves pending/rejected don't move balance.
- Sensitive changes write an `audit_app` entry.
- No private fields leak in responses/exports.
- API documented (drf-spectacular) and merged behind review.
