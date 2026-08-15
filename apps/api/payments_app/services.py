"""Payment business logic (docs/11, docs/15).

All writes go through here — views stay thin. Verification is atomic, row-locked,
audited, and only VERIFIED payments move balances.
"""
from django.db import transaction
from django.utils import timezone

from audit_app.services import log_action

from .models import Payment

_DECISIONS = {
    Payment.Status.VERIFIED,
    Payment.Status.REJECTED,
    Payment.Status.NEEDS_CLARIFICATION,
}


class PaymentStateError(Exception):
    """Raised on an invalid transition (e.g. verifying a non-pending payment)."""


@transaction.atomic
def record_payment(
    *, client, batch, amount, payment_date, method, recorded_by,
    reference_no="", schedule_item=None, notes="",
):
    """Staff records an externally-made payment. Starts PENDING; balance unchanged."""
    payment = Payment.objects.create(
        client=client,
        batch=batch,
        amount=amount,
        payment_date=payment_date,
        method=method,
        reference_no=reference_no,
        schedule_item=schedule_item,
        notes=notes,
        recorded_by=recorded_by,
        status=Payment.Status.PENDING,
    )
    log_action(
        actor=recorded_by, action="payment.record", record=payment,
        after={"status": payment.status, "amount": str(amount)},
    )
    return payment


@transaction.atomic
def verify_payment(*, payment_id, decision, actor, notes=""):
    """Finance decision. Locks the row, guards double-verify, audits, (later) notifies."""
    if decision not in _DECISIONS:
        raise PaymentStateError(f"Invalid decision: {decision!r}")

    payment = Payment.objects.select_for_update().get(pk=payment_id)
    if payment.status != Payment.Status.PENDING:
        raise PaymentStateError(
            f"Payment {payment_id} is '{payment.status}', not pending."
        )

    payment.status = decision
    if decision == Payment.Status.VERIFIED:
        payment.verified_by = actor
        payment.verified_at = timezone.now()
    if notes:
        payment.notes = notes
    payment.save()

    log_action(
        actor=actor, action=f"payment.{decision}", record=payment,
        before={"status": Payment.Status.PENDING}, after={"status": decision},
    )
    # TODO(M10): notifications_app.notify_payment_verified(payment) on VERIFIED.
    return payment
