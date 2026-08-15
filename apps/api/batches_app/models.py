"""batches_app models — Paluwagan batches + per-member installment schedule.

CONTRACT SKELETON (Sprint 0) — owned by Tambong (M3, docs/12). Minimal fields the
payments/reporting code builds against. Extend (handler/agent, requirements) in M3.
"""
from django.db import models


class Batch(models.Model):
    class Status(models.TextChoices):
        FORMING = "forming", "Forming"
        ACTIVE = "active", "Active"
        CLOSED = "closed", "Closed"
        CANCELLED = "cancelled", "Cancelled"

    class Cadence(models.TextChoices):
        WEEKLY = "weekly", "Weekly"
        SEMIMONTHLY = "semimonthly", "Semi-monthly"
        MONTHLY = "monthly", "Monthly"

    batch_number = models.CharField(max_length=40, unique=True)
    unit_model = models.CharField(max_length=120)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.FORMING)
    # Plan terms — drive each member's schedule and total_due.
    contract_price = models.DecimalField(max_digits=12, decimal_places=2)
    num_installments = models.PositiveIntegerField()
    cadence = models.CharField(max_length=16, choices=Cadence.choices, default=Cadence.MONTHLY)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.batch_number


class ScheduleItem(models.Model):
    client = models.ForeignKey(
        "clients_app.Client", on_delete=models.CASCADE, related_name="schedule"
    )
    sequence_no = models.PositiveIntegerField()
    due_date = models.DateField()
    expected_amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        unique_together = [("client", "sequence_no")]
        ordering = ["client", "sequence_no"]
