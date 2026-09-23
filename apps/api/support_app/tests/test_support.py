"""M8 — customer service: customer raises, staff manages, scoping."""
from rest_framework import status
from rest_framework.test import APITestCase

from auth_app.models import Role
from auth_app.services import create_customer_account
from payments_app.tests.factories import make_client_with_schedule, make_employee
from support_app.models import SupportCase


class SupportTests(APITestCase):
    def setUp(self):
        self.cs = make_employee(role=Role.CS_HEAD, username="cs")       # SUPPORT_MANAGE
        self.finance = make_employee(role=Role.FINANCE_OFFICER, username="fin")  # not
        self.member = make_client_with_schedule()
        self.account = create_customer_account(
            client=self.member, email="maria@portal.ph", password="portalpass1"
        )

    # --- customer side ----------------------------------------------------
    def test_customer_creates_and_lists_own_case(self):
        self.client.force_authenticate(user=self.account.user)
        r = self.client.post(
            "/api/portal/support/",
            {"category": "Payment", "description": "My GCash payment isn't showing."},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["status"], "open")
        lst = self.client.get("/api/portal/support/")
        self.assertEqual(len(lst.data), 1)

    # --- staff side -------------------------------------------------------
    def test_cs_can_list_and_update_case(self):
        case = SupportCase.objects.create(
            client=self.member, category="Payment", description="issue"
        )
        self.client.force_authenticate(user=self.cs.user)
        self.assertEqual(self.client.get("/api/support/cases/").data["count"], 1)
        r = self.client.patch(
            f"/api/support/cases/{case.id}/",
            {"status": "resolved", "resolution": "Verified manually.", "assigned_staff": self.cs.id},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["status"], "resolved")
        self.assertIsNotNone(r.data["closed_date"])       # closed_date set on resolve
        self.assertIsNotNone(r.data["turnaround_hours"])  # computed

    def test_non_support_role_forbidden(self):
        self.client.force_authenticate(user=self.finance.user)
        r = self.client.get("/api/support/cases/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_cannot_hit_staff_cases(self):
        self.client.force_authenticate(user=self.account.user)
        r = self.client.get("/api/support/cases/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
