"""Read model for balances (docs/12, docs/15).

Single source of truth: balance = total_due - verified_paid. No mutable "paid"
column, so it cannot drift. Uses DB aggregates (never Python loops).
"""
from datetime import date
from decimal import Decimal

from django.db.models import Sum

from .models import Payment


def total_due(client) -> Decimal:
    """Contract amount for the member = sum of their schedule (== batch.contract_price)."""
    return client.schedule.aggregate(t=Sum("expected_amount"))["t"] or Decimal("0")


def verified_paid(client) -> Decimal:
    """Sum of VERIFIED payments only. Pending/rejected are excluded."""
    return (
        client.payments.filter(status=Payment.Status.VERIFIED).aggregate(
            t=Sum("amount")
        )["t"]
        or Decimal("0")
    )


def remaining_balance(client) -> Decimal:
    return total_due(client) - verified_paid(client)


def verified_payments(client):
    """Verified payments, newest first — for statements & history."""
    return client.payments.filter(status=Payment.Status.VERIFIED).order_by("-payment_date")


def schedule_with_status(client, today: date | None = None) -> list[dict]:
    """Per-installment status by waterfall over VERIFIED payments (docs/12).

    Payment.schedule_item is a hint only; allocation here (not per-payment links)
    keeps balances correct under over/underpayment.
    """
    today = today or date.today()
    running = verified_paid(client)
    rows: list[dict] = []
    for item in client.schedule.all().order_by("sequence_no"):
        if running >= item.expected_amount:
            status = "paid"
            applied = item.expected_amount
            running -= item.expected_amount
        elif running > 0:
            status = "partial"
            applied = running
            running = Decimal("0")
        else:
            applied = Decimal("0")
            status = "overdue" if item.due_date < today else "upcoming"
        rows.append(
            {
                "sequence_no": item.sequence_no,
                "due_date": item.due_date.isoformat(),
                "expected_amount": str(item.expected_amount),
                "paid_applied": str(applied),
                "status": status,
            }
        )
    return rows
