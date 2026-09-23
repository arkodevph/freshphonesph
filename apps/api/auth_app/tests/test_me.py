"""/api/auth/me/ returns role + resolved permissions (drives role-aware UI)."""
from rest_framework import status
from rest_framework.test import APITestCase

from auth_app.models import Role
from payments_app.tests.factories import make_employee


class MeTests(APITestCase):
    def test_me_for_finance(self):
        emp = make_employee(role=Role.FINANCE_OFFICER, username="fin")
        self.client.force_authenticate(user=emp.user)
        r = self.client.get("/api/auth/me/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["role"], "finance_officer")
        self.assertIn("PAYMENT_VERIFY", r.data["permissions"])
        self.assertIn("PAYMENT_RECORD", r.data["permissions"])

    def test_me_for_cs_has_no_payment_perms(self):
        emp = make_employee(role=Role.CS_HEAD, username="cs")
        self.client.force_authenticate(user=emp.user)
        r = self.client.get("/api/auth/me/")
        self.assertNotIn("PAYMENT_VERIFY", r.data["permissions"])
        self.assertNotIn("PAYMENT_RECORD", r.data["permissions"])

    def test_me_owner_gets_all(self):
        emp = make_employee(role=Role.OWNER, username="own")
        self.client.force_authenticate(user=emp.user)
        r = self.client.get("/api/auth/me/")
        self.assertIn("PAYMENT_VERIFY", r.data["permissions"])
        self.assertIn("ROLE_ASSIGN", r.data["permissions"])
