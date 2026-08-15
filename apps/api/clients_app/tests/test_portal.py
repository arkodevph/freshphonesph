"""M5 — customer portal: own-data scoping + provisioning."""
from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from auth_app.models import CustomerAccount, Role
from auth_app.services import create_customer_account
from payments_app import services as pay
from payments_app.models import Payment
from payments_app.tests.factories import make_client_with_schedule, make_employee


class PortalTests(APITestCase):
    def setUp(self):
        self.records = make_employee(role=Role.RECORDS, username="rec")
        self.member = make_client_with_schedule(contract_price="10000.00")
        # a verified + a pending payment for this member
        p = pay.record_payment(
            client=self.member, batch=self.member.batch, amount="2000.00",
            payment_date=date.today(), method="gcash", recorded_by=self.records,
        )
        pay.verify_payment(payment_id=p.id, decision=Payment.Status.VERIFIED, actor=self.records)
        pay.record_payment(
            client=self.member, batch=self.member.batch, amount="500.00",
            payment_date=date.today(), method="cash", recorded_by=self.records,
        )
        self.account = create_customer_account(
            client=self.member, email="maria@portal.ph", password="portalpass1"
        )

    # --- provisioning -----------------------------------------------------
    def test_records_can_provision_portal_account(self):
        other = make_client_with_schedule(contract_price="5000.00")
        self.client.force_authenticate(user=self.records.user)
        r = self.client.post(
            f"/api/clients/{other.id}/portal-account/",
            {"email": "juan@portal.ph", "password": "portalpass1"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(CustomerAccount.objects.filter(client=other).exists())

    # --- portal scoping ---------------------------------------------------
    def test_summary_shows_own_balance(self):
        self.client.force_authenticate(user=self.account.user)
        r = self.client.get("/api/portal/summary/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["verified_paid"], "2000.00")
        self.assertEqual(r.data["remaining_balance"], "8000.00")

    def test_payments_shows_verified_only(self):
        self.client.force_authenticate(user=self.account.user)
        r = self.client.get("/api/portal/payments/")
        self.assertEqual(len(r.data), 1)  # the pending one is hidden
        self.assertEqual(r.data[0]["status"], "verified")

    def test_schedule_available(self):
        self.client.force_authenticate(user=self.account.user)
        r = self.client.get("/api/portal/schedule/")
        self.assertEqual(len(r.data), 5)

    def test_staff_without_customer_account_cannot_use_portal(self):
        self.client.force_authenticate(user=self.records.user)
        r = self.client.get("/api/portal/summary/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_cannot_hit_staff_payments_list(self):
        self.client.force_authenticate(user=self.account.user)
        r = self.client.get("/api/payments/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
