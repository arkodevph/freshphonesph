"""Sprint 4 hardening — edge cases from docs/11."""
from datetime import date
from decimal import Decimal

from django.test import TestCase

from payments_app import selectors, services
from payments_app.models import Payment

from .factories import make_client_with_schedule, make_employee


class HardeningTests(TestCase):
    def setUp(self):
        self.member = make_client_with_schedule(contract_price="10000.00")
        self.emp = make_employee()

    def _record(self, amount, method="gcash"):
        return services.record_payment(
            client=self.member, batch=self.member.batch, amount=Decimal(amount),
            payment_date=date.today(), method=method, recorded_by=self.emp,
        )

    def test_overpayment_is_allowed_not_blocked(self):
        p = self._record("12000.00")  # more than the 10000 due
        services.verify_payment(payment_id=p.id, decision=Payment.Status.VERIFIED, actor=self.emp)
        self.assertEqual(selectors.verified_paid(self.member), Decimal("12000.00"))
        # remaining goes negative => customer is in credit (overpaid), not an error
        self.assertEqual(selectors.remaining_balance(self.member), Decimal("-2000.00"))

    def test_needs_clarification_does_not_move_balance(self):
        p = self._record("2000.00")
        services.verify_payment(
            payment_id=p.id, decision=Payment.Status.NEEDS_CLARIFICATION, actor=self.emp,
            notes="blurry screenshot",
        )
        p.refresh_from_db()
        self.assertEqual(p.status, Payment.Status.NEEDS_CLARIFICATION)
        self.assertEqual(selectors.verified_paid(self.member), Decimal("0"))

    def test_partial_payment_marks_first_installment_partial(self):
        p = self._record("1000.00")  # half of the 2000 first installment
        services.verify_payment(payment_id=p.id, decision=Payment.Status.VERIFIED, actor=self.emp)
        rows = selectors.schedule_with_status(self.member)
        self.assertEqual(rows[0]["status"], "partial")
        self.assertEqual(rows[0]["paid_applied"], "1000.00")
