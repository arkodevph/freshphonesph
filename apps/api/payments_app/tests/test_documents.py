"""S2.4 — Statement of Account + Payment Confirmation (docs/11, docs/16)."""
from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from auth_app.models import Role
from payments_app import documents, services
from payments_app.models import Payment

from .factories import make_client_with_schedule, make_employee


class StatementTests(APITestCase):
    def setUp(self):
        self.member = make_client_with_schedule(contract_price="10000.00", num_installments=5)
        self.finance = make_employee(role=Role.FINANCE_OFFICER, username="fin")

    def _verified_payment(self, amount):
        p = services.record_payment(
            client=self.member, batch=self.member.batch, amount=amount,
            payment_date=date.today(), method="gcash", recorded_by=self.finance,
        )
        return services.verify_payment(
            payment_id=p.id, decision=Payment.Status.VERIFIED, actor=self.finance
        )

    def test_statement_totals_and_waterfall(self):
        # pay 2 of 5 installments' worth (2000 each = 4000 of 10000)
        self._verified_payment(amount="4000.00")
        doc = documents.build_statement(self.member)
        self.assertEqual(doc["document_type"], "Statement of Account")
        self.assertTrue(doc["not_official_bir_invoice"])
        self.assertEqual(doc["totals"]["remaining_balance"], "6000.00")
        statuses = [row["status"] for row in doc["schedule"]]
        # 4000 covers the first two 2000 installments -> paid, paid, then upcoming...
        self.assertEqual(statuses[0], "paid")
        self.assertEqual(statuses[1], "paid")
        self.assertIn(statuses[2], {"upcoming", "overdue"})

    def test_confirmation_requires_verified(self):
        pending = services.record_payment(
            client=self.member, batch=self.member.batch, amount="1000.00",
            payment_date=date.today(), method="cash", recorded_by=self.finance,
        )
        with self.assertRaises(documents.DocumentError):
            documents.build_payment_confirmation(pending)

    def test_confirmation_content(self):
        p = self._verified_payment(amount="2000.00")
        doc = documents.build_payment_confirmation(p)
        self.assertEqual(doc["document_type"], "Payment Confirmation")
        self.assertEqual(doc["payment"]["amount"], "2000.00")
        self.assertEqual(doc["balance_after"]["remaining_balance"], "8000.00")

    # --- API surface ------------------------------------------------------
    def test_statement_endpoint(self):
        self.client.force_authenticate(user=self.finance.user)
        r = self.client.get(f"/api/clients/{self.member.id}/statement/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["totals"]["total_due"], "10000.00")

    def test_confirmation_endpoint_400_when_pending(self):
        p = services.record_payment(
            client=self.member, batch=self.member.batch, amount="500.00",
            payment_date=date.today(), method="cash", recorded_by=self.finance,
        )
        self.client.force_authenticate(user=self.finance.user)
        r = self.client.get(f"/api/payments/{p.id}/confirmation/")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
