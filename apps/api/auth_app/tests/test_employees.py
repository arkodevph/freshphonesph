"""M2 — user & role administration (owner-only)."""
from rest_framework import status
from rest_framework.test import APITestCase

from auth_app.models import Employee, Role
from payments_app.tests.factories import make_employee


class EmployeeAdminTests(APITestCase):
    def setUp(self):
        self.owner = make_employee(role=Role.OWNER, username="own")       # ROLE_ASSIGN
        self.finance = make_employee(role=Role.FINANCE_OFFICER, username="fin")  # not

    def test_owner_can_create_employee(self):
        self.client.force_authenticate(user=self.owner.user)
        r = self.client.post(
            "/api/employees/",
            {
                "email": "newstaff@freshphones.ph",
                "full_name": "New Staff",
                "role": Role.RECORDS,
                "password": "supersecret1",
            },
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["role"], "records_monitoring")
        self.assertTrue(Employee.objects.filter(user__email="newstaff@freshphones.ph").exists())

    def test_non_owner_cannot_create(self):
        self.client.force_authenticate(user=self.finance.user)
        r = self.client.post(
            "/api/employees/",
            {"email": "x@y.ph", "full_name": "X", "role": Role.CS_TEAM, "password": "supersecret1"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_change_role(self):
        self.client.force_authenticate(user=self.owner.user)
        r = self.client.patch(
            f"/api/employees/{self.finance.id}/", {"role": Role.RECORDS}, format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.finance.refresh_from_db()
        self.assertEqual(self.finance.role, Role.RECORDS)

    def test_created_employee_can_log_in(self):
        self.client.force_authenticate(user=self.owner.user)
        self.client.post(
            "/api/employees/",
            {"email": "login@freshphones.ph", "full_name": "Login Test",
             "role": Role.ANALYTICS, "password": "supersecret1"},
            format="json",
        )
        self.client.force_authenticate(user=None)
        r = self.client.post(
            "/api/auth/token/",
            {"username": "login@freshphones.ph", "password": "supersecret1"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("access", r.data)
