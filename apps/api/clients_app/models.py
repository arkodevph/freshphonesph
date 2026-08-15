"""clients_app models — Paluwagan members.

CONTRACT SKELETON (Sprint 0) — owned by Tambong (M3, docs/12). Minimal fields the
payments/reporting code builds against. Extend (contact/address JSON, customer
account link, documents) in M3.
"""
from django.db import models


class Client(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        DEFAULTED = "defaulted", "Defaulted"
        WITHDRAWN = "withdrawn", "Withdrawn"

    batch = models.ForeignKey(
        "batches_app.Batch", on_delete=models.PROTECT, related_name="members"
    )
    full_name = models.CharField(max_length=200)
    unit_model = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    joined_at = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} [{self.batch_id}]"
