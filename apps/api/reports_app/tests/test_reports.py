"""Sprint 3 — reporting endpoints (dashboard, collections) + permissions."""
from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from auth_app.models import Role
from payments_app import services
from payments_app.models import Payment
from payments_app.tests.factories import make_client_with_schedule, make_employee


class ReportsTests(APITestCase):
    def setUp(self):
        self.member = make_client_with_schedule(contract_price="10000.00", num_installments=5)
        self.finance = make_employee(role=Role.FINANCE_OFFICER, username="fin")  # has REPORT_VIEW
        self.handler = make_employee(role=Role.CORE_HANDLER, username="handler")  # no REPORT_VIEW

    def _verified(self, amount):
        p = services.record_payment(
            client=self.member, batch=self.member.batch, amount=amount,
            payment_date=date.today(), method="gcash", recorded_by=self.finance,
        )
        services.verify_payment(payment_id=p.id, decision=Payment.Status.VERIFIED, actor=self.finance)

    # --- permissions ------------------------------------------------------
    def test_dashboard_requires_report_view(self):
        self.client.force_authenticate(user=self.handler.user)
        r = self.client.get("/api/reports/dashboard/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_dashboard_ok_for_report_role(self):
        self.client.force_authenticate(user=self.finance.user)
        r = self.client.get("/api/reports/dashboard/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("pending_verification", r.data)

    # --- content ----------------------------------------------------------
    def test_dashboard_counts(self):
        self._verified("2000.00")  # 1 verified
        # 1 pending
        services.record_payment(
            client=self.member, batch=self.member.batch, amount="500.00",
            payment_date=date.today(), method="cash", recorded_by=self.finance,
        )
        self.client.force_authenticate(user=self.finance.user)
        d = self.client.get("/api/reports/dashboard/").data
        self.assertEqual(d["verified_payments"], 1)
        self.assertEqual(d["pending_verification"], 1)
        self.assertEqual(d["verified_total"], "2000.00")
        self.assertEqual(d["active_batches"], 1)

    def test_collections_math(self):
        self._verified("2000.00")
        self._verified("1500.00")
        self.client.force_authenticate(user=self.finance.user)
        c = self.client.get("/api/reports/collections/").data
        self.assertEqual(c["total_expected"], "10000.00")
        self.assertEqual(c["total_verified"], "3500.00")
        self.assertEqual(c["remaining_balance"], "6500.00")

    def test_collections_date_filter_excludes_out_of_range(self):
        self._verified("2000.00")  # payment_date = today
        self.client.force_authenticate(user=self.finance.user)
        c = self.client.get("/api/reports/collections/?date_from=2000-01-01&date_to=2000-12-31").data
        self.assertEqual(c["collected_in_period"], "0")
        self.assertEqual(c["total_verified"], "2000.00")  # totals ignore the window
