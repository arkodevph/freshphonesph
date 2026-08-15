"""payments_app models — Payment Recording & Finance Verification (M4).

Owned by Justine Cane Bacurin. See docs/11 and docs/15.
Core rule: only VERIFIED payments affect a client's balance.
"""
from django.db import models


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"
        NEEDS_CLARIFICATION = "needs_clarification", "Needs clarification"

    client = models.ForeignKey(
        "clients_app.Client", on_delete=models.PROTECT, related_name="payments"
    )
    batch = models.ForeignKey(
        "batches_app.Batch", on_delete=models.PROTECT, related_name="payments"
    )
    # Intended installment — a hint/label only; balance is aggregate-derived (docs/12).
    schedule_item = models.ForeignKey(
        "batches_app.ScheduleItem", null=True, blank=True, on_delete=models.SET_NULL
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)  # PHP; never float
    payment_date = models.DateField()
    method = models.CharField(max_length=40)          # gcash/bank/cash/...
    reference_no = models.CharField(max_length=120, blank=True)  # not unique (dupes warned)
    # proof_file FK -> storage_app.StoredFile is added in S1 (private, presigned).
    status = models.CharField(
        max_length=24, choices=Status.choices, default=Status.PENDING
    )
    notes = models.TextField(blank=True)

    recorded_by = models.ForeignKey(
        "auth_app.Employee", on_delete=models.PROTECT, related_name="payments_recorded"
    )
    verified_by = models.ForeignKey(
        "auth_app.Employee", null=True, blank=True, on_delete=models.PROTECT,
        related_name="payments_verified",
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["client", "status"]),
            models.Index(fields=["batch", "status"]),
            models.Index(fields=["status"]),
            models.Index(fields=["payment_date"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gt=0), name="payment_amount_positive"
            ),
        ]

    def __str__(self):
        return f"Payment #{self.pk} {self.amount} [{self.status}]"
