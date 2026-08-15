"""Verification state machine + audit (docs/11, docs/15)."""
from datetime import date
from decimal import Decimal

from django.test import TestCase

from audit_app.models import AuditLog
from payments_app import selectors, services
from payments_app.models import Payment

from .factories import make_client_with_schedule, make_employee


class VerifyTests(TestCase):
    def _pending(self, amount="2000.00"):
        client = make_client_with_schedule(contract_price="10000.00")
        emp = make_employee()
        payment = services.record_payment(
            client=client, batch=client.batch, amount=Decimal(amount),
            payment_date=date.today(), method="gcash", recorded_by=emp,
        )
        return client, emp, payment

    def test_double_verify_is_blocked(self):
        _, emp, p = self._pending()
        services.verify_payment(payment_id=p.id, decision=Payment.Status.VERIFIED, actor=emp)
        with self.assertRaises(services.PaymentStateError):
            services.verify_payment(payment_id=p.id, decision=Payment.Status.VERIFIED, actor=emp)

    def test_rejected_does_not_move_balance(self):
        client, emp, p = self._pending()
        services.verify_payment(payment_id=p.id, decision=Payment.Status.REJECTED, actor=emp)
        self.assertEqual(selectors.verified_paid(client), Decimal("0"))

    def test_invalid_decision_raises(self):
        _, emp, p = self._pending()
        with self.assertRaises(services.PaymentStateError):
            services.verify_payment(payment_id=p.id, decision="approved", actor=emp)

    def test_audit_entry_written_on_verify(self):
        _, emp, p = self._pending()
        services.verify_payment(payment_id=p.id, decision=Payment.Status.VERIFIED, actor=emp)
        self.assertTrue(
            AuditLog.objects.filter(action="payment.verified", record_id=str(p.id)).exists()
        )
