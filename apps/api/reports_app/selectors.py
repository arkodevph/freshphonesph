"""Reporting read layer (M7). No models — aggregates over other apps.

Money metrics count VERIFIED payments only; pending is reported separately.
Uses DB aggregates (docs/15).
"""
from decimal import Decimal

from django.db.models import Sum

from batches_app.models import Batch, ScheduleItem
from payments_app.models import Payment


def dashboard_cards() -> dict:
    verified = Payment.objects.filter(status=Payment.Status.VERIFIED)
    return {
        "active_batches": Batch.objects.filter(status=Batch.Status.ACTIVE).count(),
        "verified_payments": verified.count(),
        "pending_verification": Payment.objects.filter(
            status=Payment.Status.PENDING
        ).count(),
        "verified_total": str(verified.aggregate(t=Sum("amount"))["t"] or Decimal("0")),
    }


def collections(*, date_from=None, date_to=None, batch=None) -> dict:
    """Collections report: expected vs verified-collected, with an optional date
    window (applied to collected-in-period) and batch scope.

    - total_expected / total_verified / remaining are scope totals (no date filter)
    - collected_in_period is the verified amount whose payment_date is in the window
    """
    schedule = ScheduleItem.objects.all()
    verified = Payment.objects.filter(status=Payment.Status.VERIFIED)
    if batch:
        schedule = schedule.filter(client__batch_id=batch)
        verified = verified.filter(batch_id=batch)

    total_expected = schedule.aggregate(t=Sum("expected_amount"))["t"] or Decimal("0")
    total_verified = verified.aggregate(t=Sum("amount"))["t"] or Decimal("0")

    in_period = verified
    if date_from:
        in_period = in_period.filter(payment_date__gte=date_from)
    if date_to:
        in_period = in_period.filter(payment_date__lte=date_to)
    collected_in_period = in_period.aggregate(t=Sum("amount"))["t"] or Decimal("0")

    return {
        "scope": {
            "batch": batch or "all",
            "date_from": date_from,
            "date_to": date_to,
        },
        "total_expected": str(total_expected),
        "total_verified": str(total_verified),
        "remaining_balance": str(total_expected - total_verified),
        "collected_in_period": str(collected_in_period),
        "verified_count_in_period": in_period.count(),
    }
