"""Audit helper — one call to record a sensitive change (§16)."""
from .models import AuditLog


def log_action(*, actor, action, record, before=None, after=None):
    return AuditLog.objects.create(
        actor=actor,
        action=action,
        record_type=record.__class__.__name__,
        record_id=str(record.pk),
        before=before or {},
        after=after or {},
    )
