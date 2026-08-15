# 12 — Design: Paluwagan Records Schema (M3)

Schema for **Paluwagan Records & Client Management** (§6, [05-modules.md](05-modules.md) M3) —
`batches_app` + `clients_app`. **Owned by Justine Rhey Tambong** (core spine). Written here as
the **interface that M4 (payments) and M7 (reporting) depend on**, so the balance math has a
concrete shape to attach to. Field names align with [03-data-model.md](03-data-model.md).

> **Status: proposed interface, pre-sign-off.** Tambong has final say on M3 internals; the
> **read contract** at the bottom (`total_due`, schedule items, balance) is the part M4/M7 rely
> on and should be agreed jointly.

---

## Entities

```
Batch (the plan template + group)
  └─< Client (a member of the batch)
        ├─< ScheduleItem (that member's installments)   ← Payment.expected_due points here
        ├─< Payment            (payments_app, M4)
        ├─< CustomerDocument   (private docs, §6)
        └─< RequirementItem    (requirements checklist, §6)
```

## Models (sketch)

```python
# batches_app/models.py
class Batch(models.Model):
    class Status(models.TextChoices):
        FORMING = "forming"; ACTIVE = "active"; CLOSED = "closed"; CANCELLED = "cancelled"
    class Cadence(models.TextChoices):
        WEEKLY = "weekly"; SEMIMONTHLY = "semimonthly"; MONTHLY = "monthly"

    batch_number   = models.CharField(max_length=40, unique=True)
    unit_model     = models.CharField(max_length=120)            # phone/unit offered
    status         = models.CharField(max_length=16, choices=Status.choices,
                                       default=Status.FORMING)
    # plan terms — drive each member's schedule
    contract_price = models.DecimalField(max_digits=12, decimal_places=2)  # total per member
    num_installments = models.PositiveIntegerField()
    cadence        = models.CharField(max_length=16, choices=Cadence.choices)
    start_date     = models.DateField()
    end_date       = models.DateField(null=True, blank=True)

    assigned_agent = models.ForeignKey("agents_app.Agent", null=True, blank=True,
                                        on_delete=models.SET_NULL, related_name="batches")
    handler        = models.ForeignKey("auth_app.Employee", null=True, blank=True,
                                        on_delete=models.SET_NULL, related_name="handled_batches")
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)


# clients_app/models.py
class Client(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active"; COMPLETED = "completed"; DEFAULTED = "defaulted"; WITHDRAWN = "withdrawn"

    batch            = models.ForeignKey("batches_app.Batch", on_delete=models.PROTECT,
                                          related_name="members")
    full_name        = models.CharField(max_length=200)
    contact_details  = models.JSONField(default=dict)     # phone/email/etc (approved fields)
    address_fields   = models.JSONField(default=dict, blank=True)   # approved only
    unit_model       = models.CharField(max_length=120)   # usually inherits batch.unit_model
    status           = models.CharField(max_length=16, choices=Status.choices,
                                         default=Status.ACTIVE)
    customer_account = models.OneToOneField("auth_app.CustomerAccount", null=True, blank=True,
                                             on_delete=models.SET_NULL, related_name="client")
    joined_at        = models.DateField()
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)


# batches_app/models.py  (a member's installment plan)
class ScheduleItem(models.Model):
    class Status(models.TextChoices):
        UPCOMING = "upcoming"; DUE = "due"; PAID = "paid"; PARTIAL = "partial"; OVERDUE = "overdue"

    client          = models.ForeignKey("clients_app.Client", on_delete=models.CASCADE,
                                          related_name="schedule")
    sequence_no     = models.PositiveIntegerField()        # 1..num_installments
    due_date        = models.DateField()
    expected_amount = models.DecimalField(max_digits=12, decimal_places=2)
    # status is DERIVED for display (see allocation below), stored only if you cache it
    class Meta:
        unique_together = [("client", "sequence_no")]
        ordering = ["client", "sequence_no"]
```

### Schedule generation (on client join)
When a `Client` is created in a `Batch`, generate `num_installments` `ScheduleItem`s from the
batch terms (`contract_price / num_installments`, stepped by `cadence` from `start_date`).
Last item absorbs any rounding remainder so the schedule sums **exactly** to `contract_price`.

## Requirements & documents (§6)

```python
# clients_app/models.py
class RequirementItem(models.Model):
    class Status(models.TextChoices):
        MISSING = "missing"; SUBMITTED = "submitted"; APPROVED = "approved"
        NEEDS_CLARIFICATION = "needs_clarification"
    client      = models.ForeignKey("clients_app.Client", on_delete=models.CASCADE,
                                     related_name="requirements")
    label       = models.CharField(max_length=120)         # e.g. "Valid ID (front)"
    status      = models.CharField(max_length=24, choices=Status.choices,
                                    default=Status.MISSING)
    document    = models.ForeignKey("documents_app.CustomerDocument", null=True, blank=True,
                                     on_delete=models.SET_NULL)
    reviewer    = models.ForeignKey("auth_app.Employee", null=True, blank=True,
                                     on_delete=models.SET_NULL)
    review_notes = models.TextField(blank=True)

# documents_app/models.py  — private file, brokered via storage_app presign
class CustomerDocument(models.Model):
    client       = models.ForeignKey("clients_app.Client", on_delete=models.CASCADE,
                                      related_name="documents")
    document_type = models.CharField(max_length=80)
    stored_file  = models.ForeignKey("storage_app.StoredFile", on_delete=models.PROTECT)
    upload_date  = models.DateTimeField(auto_now_add=True)
    reviewer     = models.ForeignKey("auth_app.Employee", null=True, blank=True,
                                      on_delete=models.SET_NULL)
    review_notes = models.TextField(blank=True)
```

---

## ⭐ The read contract M4/M7 depend on (agree this with Tambong)

This is the part **Justine Cane** builds against. Keep it stable.

### Totals
```python
def total_due(client) -> Decimal:
    # authoritative contract amount for the member
    return client.schedule.aggregate(t=Sum("expected_amount"))["t"] or Decimal("0")
    # (equals batch.contract_price by construction)
```

### Balance (verified-only — M4 owns the payment side)
```python
def verified_paid(client) -> Decimal:
    return client.payments.filter(status="verified").aggregate(
        t=Sum("amount"))["t"] or Decimal("0")

def remaining_balance(client) -> Decimal:
    return total_due(client) - verified_paid(client)
```

### Per-installment status = derived by waterfall (recommended)
Don't make each `Payment` rigidly "pay" one `ScheduleItem`. Instead allocate **verified**
payments across schedule items in `due_date` order:

```
running = verified_paid(client)
for item in client.schedule.order_by("sequence_no"):
    if running >= item.expected_amount:      item.status = PAID;    running -= item.expected_amount
    elif running > 0:                         item.status = PARTIAL; running = 0
    elif item.due_date < today:               item.status = OVERDUE
    else:                                      item.status = UPCOMING / DUE
```

- `Payment.expected_due` (FK to `ScheduleItem`) is a **hint/label** for what the payer intended,
  **not** the allocation authority. This keeps balances correct even with over/underpayment.
- **Single source of truth stays:** balance = `verified_paid` vs `total_due`. Schedule statuses
  are a *view* of that, not a second ledger that can drift.

### Interface summary (the API/service surface M4/M7 call)
| Need | Provided by M3 |
|---|---|
| Attach a payment | `Client` + `Batch` FKs, optional `ScheduleItem` |
| Contract amount | `total_due(client)` / `batch.contract_price` |
| Installment list & due dates | `client.schedule` (ordered) |
| Balance for portal & reports | `verified_paid` / `remaining_balance` (M4 computes; M3 provides `total_due`) |
| Role/permission for Finance | `auth_app` (M2, Tambong) — role key names agreed jointly |

## Coordination checklist (Tambong ↔ Bacurin)
- [ ] Confirm `Batch` terms fields (`contract_price`, `num_installments`, `cadence`) — these
      drive the schedule and therefore `total_due`.
- [ ] Confirm `ScheduleItem` shape (esp. `expected_amount`, `due_date`) — `Payment.expected_due`
      FKs to it.
- [ ] Agree the **Finance role key** in `auth_app` so `payment:verify` permission resolves.
- [ ] Agree that **balance is verified-payment-derived** (no separately mutable "paid" field),
      or if cached, that it's only written inside the verify transaction.
