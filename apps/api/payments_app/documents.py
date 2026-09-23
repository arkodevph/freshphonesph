"""Operational documents — generated on demand from existing data (docs/15).

IMPORTANT (§7 BIR boundary): these are operational records only. A Statement of
Account shows what is owed; a Payment Confirmation shows a verified receipt. Neither
is the official BIR sales invoice — that stays in Fresh Phones PH's own process.
Every payload carries `not_official_bir_invoice: True` to make that explicit.
"""
from django.utils import timezone

from . import selectors
from .models import Payment


class DocumentError(Exception):
    """Raised when a document can't be produced (e.g. confirming an unverified payment)."""


def _client_block(client) -> dict:
    return {
        "id": client.id,
        "full_name": client.full_name,
        "batch_number": client.batch.batch_number,
        "unit_model": client.batch.unit_model,
    }


def build_statement(client) -> dict:
    """Statement of Account / Billing Statement — what the member owes + schedule."""
    return {
        "document_type": "Statement of Account",
        "not_official_bir_invoice": True,
        "client": _client_block(client),
        "schedule": selectors.schedule_with_status(client),
        "totals": {
            "total_due": str(selectors.total_due(client)),
            "verified_paid": str(selectors.verified_paid(client)),
            "remaining_balance": str(selectors.remaining_balance(client)),
        },
        "verified_payments": [
            {
                "id": p.id,
                "amount": str(p.amount),
                "payment_date": p.payment_date.isoformat(),
                "method": p.method,
                "reference_no": p.reference_no,
            }
            for p in selectors.verified_payments(client)
        ],
        "generated_at": timezone.now().isoformat(),
    }


def build_payment_confirmation(payment: Payment) -> dict:
    """Payment Confirmation — proof the business received a VERIFIED payment."""
    if payment.status != Payment.Status.VERIFIED:
        raise DocumentError(
            "A Payment Confirmation is only available for verified payments."
        )
    client = payment.client
    return {
        "document_type": "Payment Confirmation",
        "not_official_bir_invoice": True,
        "payment": {
            "id": payment.id,
            "amount": str(payment.amount),
            "payment_date": payment.payment_date.isoformat(),
            "method": payment.method,
            "reference_no": payment.reference_no,
        },
        "client": _client_block(client),
        "verified_by": payment.verified_by_id,
        "verified_at": payment.verified_at.isoformat() if payment.verified_at else None,
        "balance_after": {
            "verified_paid": str(selectors.verified_paid(client)),
            "remaining_balance": str(selectors.remaining_balance(client)),
        },
        "generated_at": timezone.now().isoformat(),
    }
