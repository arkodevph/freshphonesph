# 11 — Design: Payments/Finance (M4) + Reporting (M7)

Technical design for **Justine Cane Bacurin's** modules. Owner-facing detail for
[05-modules.md](05-modules.md) M4 & M7, on the decided stack (Django REST + DRF SimpleJWT,
[09-tech-stack.md](09-tech-stack.md)).

> **Status: design draft, pre-sign-off.** Model sketches below are illustrative Django, not yet
> scaffolded into `apps/api`. Field names finalize in Discovery ([03-data-model.md](03-data-model.md)).
>
> **New to this module?** Read [16-how-payments-work.md](16-how-payments-work.md) first — a
> plain-language explainer (for teammates & the client) of why there's no payment button and how
> the claim → verify → balance flow works.

---

## Part A — Payment Recording & Finance Verification (M4) · `payments_app`

### The one rule everything protects
Clients pay **outside** the system (Messenger). Staff **record** the payment; it stays
**pending**; **Finance verifies** it; **only verified payments move a client's balance.** Every
state change is audited. No payment gateway in V1 (§7, §19).

### State machine

```
                 record (staff)
   [ pending ] ─────────────────────────────────┐
        │                                        │
        │ Finance decision                       │
        ├──► verified            (affects balance) ✅
        ├──► rejected            (no balance effect)
        └──► needs_clarification (no balance effect) ──► staff edits ──► pending
```

Only `pending → verified` changes `amount_paid` / `remaining_balance`. `verified` is terminal
for balance purposes; a correction after verified must be a new audited adjustment, never a
silent edit.

### Models (sketch)

```python
# payments_app/models.py
class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending"
        VERIFIED = "verified"
        REJECTED = "rejected"
        NEEDS_CLARIFICATION = "needs_clarification"

    client        = models.ForeignKey("clients_app.Client", on_delete=models.PROTECT,
                                       related_name="payments")
    batch         = models.ForeignKey("batches_app.Batch", on_delete=models.PROTECT,
                                       related_name="payments")
    expected_due  = models.ForeignKey("batches_app.ScheduleItem", null=True, blank=True,
                                       on_delete=models.SET_NULL)   # which installment
    amount        = models.DecimalField(max_digits=12, decimal_places=2)   # never float
    payment_date  = models.DateField()
    method        = models.CharField(max_length=40)                 # gcash/bank/cash/etc.
    reference_no  = models.CharField(max_length=120, blank=True)
    proof_file    = models.ForeignKey("storage_app.StoredFile", null=True, blank=True,
                                       on_delete=models.SET_NULL)    # private, presigned
    status        = models.CharField(max_length=24, choices=Status.choices,
                                       default=Status.PENDING)
    notes         = models.TextField(blank=True)

    recorded_by   = models.ForeignKey("auth_app.Employee", on_delete=models.PROTECT,
                                       related_name="payments_recorded")
    verified_by   = models.ForeignKey("auth_app.Employee", null=True, blank=True,
                                       on_delete=models.PROTECT, related_name="payments_verified")
    verified_at   = models.DateTimeField(null=True, blank=True)

    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["client", "status"]),
                   models.Index(fields=["batch", "status"])]
```

Balance is **derived from verified payments** (single source of truth — avoids drift):

```python
# on the Client (clients_app) or a service:
def verified_paid(client):
    return client.payments.filter(status="verified").aggregate(
        total=Sum("amount"))["total"] or Decimal("0")

def remaining_balance(client):
    return client.total_due - verified_paid(client)   # total_due from the batch schedule
```

> If reporting performance later demands it, cache `amount_paid` on the client and update it
> **only** inside the verify transaction — but the verified-payment aggregate stays authoritative.

### Verification is a transaction + audit

```python
# payments_app/services.py
@transaction.atomic
def verify_payment(payment, *, decision, actor, notes=""):
    assert payment.status == Payment.Status.PENDING
    payment.status = decision                 # verified | rejected | needs_clarification
    if decision == Payment.Status.VERIFIED:
        payment.verified_by, payment.verified_at = actor, timezone.now()
    payment.notes = notes or payment.notes
    payment.save()
    audit_log(actor=actor, action=f"payment.{decision}", record=payment,
              before={"status": "pending"}, after={"status": decision})
    if decision == Payment.Status.VERIFIED:
        notify_customer_payment_verified(payment)   # M10
    return payment
```

### DRF endpoints & permissions

| Method | Endpoint | Who | Notes |
|---|---|---|---|
| `POST` | `/api/payments/` | `payment:record` (staff/records/finance/assigned) | creates **pending** |
| `GET` | `/api/payments/?client=&batch=&status=&range=` | staff (role-scoped) | list/filter |
| `GET` | `/api/payments/{id}/` | staff (role-scoped) / owning customer (own only) | detail |
| `POST` | `/api/payments/{id}/verify/` | **`finance_officer` / `owner` only** | body: `decision`, `notes` |
| `GET` | `/api/clients/{id}/balance/` | staff / owning customer | verified paid + remaining |
| `GET` | `/api/payments/{id}/statement/` | staff | Billing Statement / SOA (operational) |
| `GET` | `/api/payments/{id}/confirmation/` | staff / customer | Payment Confirmation (after verify) |

- **Verify is Finance-only** — enforce with a DRF permission class, not UI hiding (§16).
- Customers see only their **own verified** payments (M5); pending/rejected are staff-only unless
  a `needs_clarification` is surfaced to them deliberately.

### BIR boundary (§7, §19) — do NOT cross
- The system MAY produce a **"Billing Statement" / "Statement of Account"** (amounts due) and a
  **"Payment Confirmation"** (after verify). These are **operational records**.
- It must **NOT** claim to be the official BIR sales invoice. Keep the wording "Billing
  Statement / Payment Confirmation" in code, templates, and UI. Official BIR invoicing stays in
  Fresh Phones PH's own process.

### Edge cases to handle
- Amount `<= 0`, or exceeding remaining balance → validate / flag, don't silently accept.
- Duplicate reference number for the same client → warn (possible double-entry).
- Overpayment / partial payment → allowed; balance math must not go negative silently.
- Editing a payment after `verified` → blocked; require a new adjustment entry (audited).
- Proof file: store in **private** storage; serve via short-lived presigned URL only.

### Acceptance criteria (from M4)
- Pending record does not move balance; on Verify, balance updates and the portal reflects it.
- Reject / needs-clarification paths work and never touch balance.
- Every transition writes an audit entry (actor, before/after, timestamp).
- Only Finance can verify (API-enforced).

---

## Part B — Reporting & Analytics (M7) · `reports_app`

Summarize **authorized** operational data without exposing private info to those who don't need
it. Finance/collection metrics read **verified** payments only.

### Dashboard cards
Active batches · verified payments (count/sum) · **pending verification** (your queue signal) ·
open concerns · late tasks. Each respects the caller's role visibility.

### Endpoints

| Method | Endpoint | Returns |
|---|---|---|
| `GET` | `/api/reports/dashboard/?range=` | counts/sums for cards |
| `GET` | `/api/reports/collections/?range=&batch=` | verified collections vs expected, balances |
| `GET` | `/api/reports/payments/?range=&status=` | payment report (record vs verified) |
| `GET` | `/api/reports/tasks-kpi/?range=` | completion, lateness, review status (reads M6) |
| `GET` | `/api/reports/support/?range=` | open/closed, categories, turnaround (reads M8) |
| `GET` | `/api/reports/{name}/export/?format=csv\|xlsx\|pdf` | export where genuinely needed |

### Rules
- **Verified-only for money:** collections/balances aggregate `status="verified"` payments.
  Pending is shown separately as "awaiting verification," never counted as collected.
- **Role-scoped:** Analytics prefers **aggregated** data; exports contain only fields the role
  may see (§3, §9).
- **Historical retention:** prior reporting periods are preserved when new data arrives (§9).
- **Date filters:** day / week / month / custom range.
- **Exports:** CSV/Excel via `openpyxl`/`csv`; PDF via a server-side renderer. Add only formats
  actually requested.

### Performance notes
- Use DB aggregates (`Sum`, `Count`, `annotate`) — never load rows into Python to total them.
- Add the indexes shown on `Payment` (`client,status` / `batch,status`) for collection queries.
- Redis is **not** required for V1; only add caching if a report is genuinely slow (§18.6).

### Acceptance criteria (from M7)
- Reports respect role visibility; exports contain only authorized fields.
- Money metrics reflect **verified** payments only; pending shown separately.
- Historical periods retained; date filters work.

---

## Coordination for Justine Cane
- **Depends on Tambong:** the `Client`/`Batch`/`ScheduleItem` models (M3) and the role names +
  Finance permission (M2). Agree these schemas/role keys **before** building M4.
- **Feeds Rovic:** M5 customer portal reads your verified history + balance endpoint.
- **M7 needs M4 first** (and M6 for task/KPI metrics from Dela Rosa).
- Write audit entries for every verification — the `audit_app` contract is shared (§16).
