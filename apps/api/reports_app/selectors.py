"""Reporting read layer (M7). No models — aggregates over other apps.

Money metrics count VERIFIED payments only; pending is reported separately.
Uses DB aggregates (docs/15).
"""
from decimal import Decimal

from django.db.models import Sum

from batches_app.models import Batch
from payments_app.models import Payment


def dashboard_cards() -> dict:
    verified = Payment.objects.filter(status=Payment.Status.VERIFIED)
    return {
        "active_batches": Batch.objects.filter(status=Batch.Status.ACTIVE).count(),
        "verified_payments": verified.count(),
        "pending_verification": Payment.objects.filter(
            status=Payment.Status.PENDING
        ).count(),
        "verified_total": verified.aggregate(t=Sum("amount"))["t"] or Decimal("0"),
    }
