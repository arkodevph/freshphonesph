"""Batch/schedule business logic (M3).

generate_schedule builds a member's installment plan from the batch terms so the
schedule sums EXACTLY to contract_price (last item absorbs the rounding remainder).
"""
from datetime import timedelta
from decimal import Decimal

from .models import Batch, ScheduleItem

_CADENCE_DAYS = {
    Batch.Cadence.WEEKLY: 7,
    Batch.Cadence.SEMIMONTHLY: 15,
    Batch.Cadence.MONTHLY: 30,
}


def generate_schedule(client):
    """Create ScheduleItems for a client from its batch terms. Idempotent-safe:
    callers should only invoke on a client that has no schedule yet."""
    batch = client.batch
    n = batch.num_installments
    total = batch.contract_price
    per = (total / n).quantize(Decimal("0.01"))
    step = _CADENCE_DAYS.get(batch.cadence, 30)

    accumulated = Decimal("0")
    items = []
    for i in range(1, n + 1):
        amount = per if i < n else (total - accumulated)  # last absorbs remainder
        accumulated += amount
        items.append(
            ScheduleItem(
                client=client,
                sequence_no=i,
                due_date=batch.start_date + timedelta(days=step * i),
                expected_amount=amount,
            )
        )
    ScheduleItem.objects.bulk_create(items)
    return items
