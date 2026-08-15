"""S0.3 — balance rule: remaining = total_due - verified_paid; only verified moves it."""
from datetime import date
from decimal import Decimal

from django.test import TestCase

from payments_app import selectors, services
from payments_app.models import Payment

from .factories import make_client_with_schedule, make_employee


class BalanceTests(TestCase):
    def test_total_due_equals_contract_price(self):
        client = make_client_with_schedule(contract_price="10000.00", num_installments=5)
        self.assertEqual(selectors.total_due(client), Decimal("10000.00"))

    def test_pending_payment_does_not_move_balance(self):
        client = make_client_with_schedule(contract_price="10000.00")
        emp = make_employee()
        services.record_payment(
            client=client, batch=client.batch, amount=Decimal("2000.00"),
            payment_date=date.today(), method="gcash", recorded_by=emp,
        )
        self.assertEqual(selectors.verified_paid(client), Decimal("0"))
        self.assertEqual(selectors.remaining_balance(client), Decimal("10000.00"))

    def test_verified_payment_moves_balance(self):
        client = make_client_with_schedule(contract_price="10000.00")
        emp = make_employee()
        p = services.record_payment(
            client=client, batch=client.batch, amount=Decimal("2000.00"),
            payment_date=date.today(), method="gcash", recorded_by=emp,
        )
        services.verify_payment(
            payment_id=p.id, decision=Payment.Status.VERIFIED, actor=emp
        )
        self.assertEqual(selectors.verified_paid(client), Decimal("2000.00"))
        self.assertEqual(selectors.remaining_balance(client), Decimal("8000.00"))
