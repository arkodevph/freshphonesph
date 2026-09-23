"""audit_app models — cross-cutting audit trail (§16).

CONTRACT SKELETON (Sprint 0) — shared. Every module writes here for sensitive
changes (payment verification, record edits, role changes). See services.log_action.
"""
from django.db import models


class AuditLog(models.Model):
    actor = models.ForeignKey(
        "auth_app.Employee", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="audit_entries",
    )
    action = models.CharField(max_length=64)          # e.g. "payment.verified"
    record_type = models.CharField(max_length=64)     # model class name
    record_id = models.CharField(max_length=64)
    before = models.JSONField(default=dict, blank=True)
    after = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["record_type", "record_id"])]

    def __str__(self):
        return f"{self.action} {self.record_type}#{self.record_id}"
