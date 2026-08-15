"""Sprint 4 — report exports (CSV/XLSX) + permission gate."""
from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from auth_app.models import Role
from payments_app import services
from payments_app.models import Payment
from payments_app.tests.factories import make_client_with_schedule, make_employee


class ExportTests(APITestCase):
    def setUp(self):
        self.member = make_client_with_schedule(contract_price="10000.00")
        self.finance = make_employee(role=Role.FINANCE_OFFICER, username="fin")
        self.handler = make_employee(role=Role.CORE_HANDLER, username="handler")
        p = services.record_payment(
            client=self.member, batch=self.member.batch, amount="2000.00",
            payment_date=date.today(), method="gcash", recorded_by=self.finance,
            reference_no="GC1",
        )
        services.verify_payment(payment_id=p.id, decision=Payment.Status.VERIFIED, actor=self.finance)

    def test_csv_export(self):
        self.client.force_authenticate(user=self.finance.user)
        r = self.client.get("/api/reports/payments/export/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r["Content-Type"], "text/csv")
        self.assertIn("attachment", r["Content-Disposition"])
        body = r.content.decode()
        self.assertIn("Reference", body)   # header row
        self.assertIn("GC1", body)          # data row
        self.assertIn("2000.00", body)

    def test_xlsx_export_content_type(self):
        self.client.force_authenticate(user=self.finance.user)
        r = self.client.get("/api/reports/payments/export/?fmt=xlsx")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("spreadsheetml", r["Content-Type"])
        self.assertTrue(r.content[:2] == b"PK")  # xlsx is a zip

    def test_export_filtered_by_status(self):
        # add a pending one; export verified-only should exclude it
        services.record_payment(
            client=self.member, batch=self.member.batch, amount="99.00",
            payment_date=date.today(), method="cash", recorded_by=self.finance,
            reference_no="PENDINGREF",
        )
        self.client.force_authenticate(user=self.finance.user)
        r = self.client.get("/api/reports/payments/export/?status=verified")
        self.assertNotIn("PENDINGREF", r.content.decode())

    def test_export_requires_report_view(self):
        self.client.force_authenticate(user=self.handler.user)
        r = self.client.get("/api/reports/payments/export/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
