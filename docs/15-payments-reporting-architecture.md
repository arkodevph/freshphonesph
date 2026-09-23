# 15 — Architecture & Database: My Part (M4 Payments/Finance + M7 Reporting)

> **Migration note:** This architecture records the Django baseline. The active target is
> NestJS + Prisma; preserve the payment invariants through parity tests during migration.

**Owner: Justine Cane Bacurin.** Engineering plan for `payments_app` + `reports_app`.
Builds on: [11-payments-reporting-design.md](11-payments-reporting-design.md) (features),
[12-records-schema-design.md](12-records-schema-design.md) (M3 interface I depend on),
[13-auth-roles-schema-design.md](13-auth-roles-schema-design.md) (roles/permissions),
[09-tech-stack.md](09-tech-stack.md) (Django REST). Pre-sign-off design.

---

## 1. Scope & boundaries

**I own (write):** `payments_app`, `reports_app`.

**I consume (read-only contracts — do not modify these apps):**

| Depend on | For | Owner |
|---|---|---|
| `auth_app` | `PAYMENT_RECORD`, `PAYMENT_VERIFY`, `REPORT_VIEW` permission keys; `Employee`, `CustomerAccount` | Tambong (M2) |
| `clients_app` / `batches_app` | `Client`, `Batch`, `ScheduleItem`, `total_due(client)` | Tambong (M3) |
| `storage_app` | presigned upload/serve for private payment proof files | shared |
| `audit_app` | `AuditLog` — write an entry on every verification/edit | shared |
| `notifications_app` | trigger customer/staff notification on verify | Dela Rosa (M10) |

**Dependency graph**

```
auth_app ─┐
clients_app / batches_app ─┼─► payments_app ─► audit_app
storage_app ──────────────┘        │  └─► notifications_app
                                    ▼
                               reports_app  (reads payments + tasks/support/batches)
```

---

## 2. Code structure (Django app layout)

**Layering rule:** `views` (thin) → `services` (writes/business rules) / `selectors` (reads)
→ `models`. Business logic never lives in views or serializers. This keeps the
verification rules and money math in one testable place.

```
payments_app/
  models.py            # Payment (+ enums, constraints, indexes)
  serializers.py       # DRF: PaymentCreate, PaymentRead, VerifyInput
  services.py          # record_payment(), verify_payment() — atomic + audit + notify
  selectors.py         # verified_paid(), remaining_balance(), payment lists
  permissions.py       # RequirePaymentRecord, RequirePaymentVerify (-> auth_app map)
  filters.py           # django-filter: client, batch, status, date range
  views.py             # PaymentViewSet + verify action + balance + statement/confirmation
  urls.py              # router -> included in config/urls.py
  admin.py             # read-mostly admin for support/debug
  documents.py         # Billing Statement / SOA / Payment Confirmation builders
  tests/
    test_services.py   # state machine, verified-only balance, audit written
    test_permissions.py# finance-only verify, record scope
    test_api.py        # endpoints + edge cases (doc 11)
    factories.py       # test data (payment/client/batch)

reports_app/
  selectors.py         # dashboard_cards(), collections(), payment_report() — aggregates
  serializers.py       # response shapes (read-only)
  permissions.py       # RequireReportView; role-scoped field filtering
  exports.py           # CSV/XLSX/PDF builders
  views.py             # ReportViewSet (dashboard/collections/payments/exports)
  urls.py
  tests/
```

`reports_app` has **no models in V1** — it is a read layer over `payments_app` (and, later,
tasks/support/batches). Add tables only if a summary/materialized view is needed for speed.

---

## 3. Architecture — request & data flows

### 3.1 Record a payment (staff)
```
POST /api/payments/  (PAYMENT_RECORD)
  view -> serializer(validate: amount>0, client/batch exist)
       -> services.record_payment(...)     # status=PENDING, optional proof via storage_app
       -> audit_app.log("payment.record")
  <- 201 pending payment  (balance UNCHANGED)
```

### 3.2 Verify a payment (Finance) — the core
```
POST /api/payments/{id}/verify/  (PAYMENT_VERIFY: owner/finance only)
  view -> services.verify_payment(payment, decision, actor, notes)
        @transaction.atomic:
          - SELECT ... FOR UPDATE on the payment row  (lock; guard double-verify)
          - assert status == PENDING
          - set status = decision (verified|rejected|needs_clarification)
          - if verified: set verified_by, verified_at
          - audit_app.log("payment.<decision>", before/after)
          - if verified: notifications_app.notify_payment_verified(payment)
  <- 200 updated payment
```
Only `verified` payments are counted by `selectors.verified_paid()`, so the balance moves
**only** as a consequence of verification — never on record.

### 3.3 Balance (read model)
`remaining_balance = total_due(client) [from M3] − verified_paid(client) [my aggregate]`.
Computed on read via `selectors` (DB `Sum`, not Python loops). No mutable "paid" column —
single source of truth, no drift (see doc 12).

### 3.4 Reporting read model
Query-time aggregation over `payments` (+ later tasks/support). Money metrics filter
`status="verified"`; pending is reported separately as "awaiting verification." Date filters
push down to SQL. **Upgrade path if slow:** nightly summary table or Postgres materialized view
— not needed for V1 volumes.

### 3.5 Concurrency & idempotency
- `verify_payment` locks the row (`select_for_update`) so two Finance users can't both flip it.
- Verify is a no-op-safe guard: re-verifying a non-pending payment returns a clear 409/400.
- Statement/confirmation generation is read-only and side-effect free.

---

## 4. Database design

### 4.1 `payments_app.Payment`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | bigint PK | no | |
| `client_id` | FK → clients_app.Client | no | `on_delete=PROTECT` (never lose money records) |
| `batch_id` | FK → batches_app.Batch | no | `PROTECT` |
| `schedule_item_id` | FK → batches_app.ScheduleItem | yes | `SET_NULL`; intended installment (hint only) |
| `amount` | numeric(12,2) | no | **CHECK `amount > 0`**; PHP; never float |
| `payment_date` | date | no | when the client paid (external) |
| `method` | varchar(40) | no | gcash/bank/cash/… |
| `reference_no` | varchar(120) | yes | provider ref; **not unique** (dupes warned, not blocked) |
| `proof_file_id` | FK → storage_app.StoredFile | yes | `SET_NULL`; private, presigned |
| `status` | varchar(24) | no | enum: pending/verified/rejected/needs_clarification; default `pending` |
| `notes` | text | yes | |
| `recorded_by_id` | FK → auth_app.Employee | no | `PROTECT` |
| `verified_by_id` | FK → auth_app.Employee | yes | `PROTECT`; set on verify |
| `verified_at` | timestamptz | yes | set on verify |
| `created_at` | timestamptz | no | auto |
| `updated_at` | timestamptz | no | auto |

**Constraints**
- `CHECK (amount > 0)` (Django `CheckConstraint`).
- `CHECK (status IN (...))` (enforced by `TextChoices` + optional DB check).
- App-level invariant (tested, not DB): `verified_by`/`verified_at` non-null **iff**
  `status = verified`.

**Indexes** (chosen for the actual queries)
- `(client_id, status)` → balance / customer history.
- `(batch_id, status)` → batch collections report.
- `(status)` → the "pending verification" queue + dashboard card.
- `(payment_date)` → date-range reports.
- `(created_at)` → default ordering.

### 4.2 Statements & confirmations
Billing Statement / Statement of Account / Payment Confirmation are **generated on demand**
from existing data (`documents.py`) — no heavy table. If sequential document numbers are
required later, add a small `StatementCounter`/sequence then. **Never** label these as the
official BIR invoice (doc 11 §7 boundary).

### 4.3 `reports_app`
No tables in V1. (Optional future: `report_export_log` for audit of who exported what, or a
materialized view for collections — deferred.)

### 4.4 Audit (shared, `audit_app.AuditLog`)
I write, I don't own the schema. The shape I rely on:
`actor_id, action, record_type, record_id, before(jsonb), after(jsonb), created_at`.
Actions I emit: `payment.record`, `payment.verified`, `payment.rejected`,
`payment.needs_clarification`, `payment.adjustment`.

### 4.5 Migration order (dependencies)
`auth_app` (User/Employee) → `clients_app`/`batches_app` (Client/Batch/ScheduleItem) →
`storage_app` (StoredFile) → **`payments_app`** → `reports_app` (no migration). My FKs won't
apply until the M2/M3 migrations exist — hence Sprint 0 coordination (doc 14).

---

## 5. Permissions & security (my endpoints)

| Endpoint | Permission class | Who |
|---|---|---|
| `POST /api/payments/` | `RequirePaymentRecord` → `PAYMENT_RECORD` | finance/records/GM/COO/owner |
| `GET /api/payments/` (+filters) | `IsAuthenticated` + role-scoped queryset | staff (own scope) / customer (own) |
| `POST /api/payments/{id}/verify/` | `RequirePaymentVerify` → `PAYMENT_VERIFY` | **owner/finance only** |
| `GET /api/clients/{id}/balance/` | `IsAuthenticated` + scope | staff / owning customer |
| `GET /api/payments/{id}/statement|confirmation/` | `IsAuthenticated` + scope | staff / owning customer |
| `GET /api/reports/*` | `RequireReportView` → `REPORT_VIEW` | per role; Analytics = aggregated |

- Enforced **server-side** (DRF permission classes + queryset scoping), never UI-only (§16).
- Customer requests are filtered to their own `Client` (via `CustomerAccount`).
- Report exports strip fields the role may not see.

---

## 6. Testing strategy (my part)
- **Services (unit):** state machine transitions; verified-only balance; audit written; double-verify guarded.
- **Selectors (unit):** `verified_paid`/`remaining_balance` correct under over/underpayment; report aggregates.
- **API:** permission enforcement (under-privileged role → 403), edge cases from doc 11
  (amount≤0, duplicate ref, post-verify edit blocked, overpayment).
- **Factories** for Payment/Client/Batch/ScheduleItem to build scenarios fast.
- Target: every "Definition of Done" bullet in [14-sprint-plan-payments-reporting.md](14-sprint-plan-payments-reporting.md) has a test.

---

## 7. Build order → sprints (doc 14)
Sprint 0 contracts → **S1 record** (models, create/list/filter, validation) → **S2 verify**
(services.verify_payment, balance, audit, statements, notify) → **S3 reporting** (selectors,
dashboard/collections, verified-only) → **S4 exports/hardening** (exports, indexes, tests).

## 8. Open decisions (recommend now, confirm at kickoff)
1. **Reporting compute:** query-time aggregation for V1 (recommended) vs summary/materialized
   view. → start query-time; measure; upgrade only if needed.
2. **Statement numbering:** generate-on-demand (recommended) vs stored sequence. → on-demand V1.
3. **Money type:** `Decimal(12,2)`, PHP only, half-up rounding on schedule remainder (doc 12).
4. **Adjustments after verify:** new audited `payment.adjustment` entry (recommended) vs
   editable record. → new entry; verified rows are immutable.
