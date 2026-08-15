"""Read model for balances (docs/12, docs/15).

Single source of truth: balance = total_due - verified_paid. No mutable "paid"
column, so it cannot drift. Uses DB aggregates (never Python loops).
"""
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
