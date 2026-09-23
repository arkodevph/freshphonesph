"""M9 — recruitment (public careers/apply, internal HR manage) + agent verify."""
from rest_framework import status
from rest_framework.test import APITestCase

from agents_app.models import Agent
from auth_app.models import Role
from payments_app.tests.factories import make_employee
from recruitment_app.models import Applicant, JobOpening


class RecruitmentTests(APITestCase):
    def setUp(self):
        self.hr = make_employee(role=Role.HR_PAYROLL, username="hr")   # RECRUITMENT_MANAGE
        self.finance = make_employee(role=Role.FINANCE_OFFICER, username="fin")
        self.job = JobOpening.objects.create(title="Field Agent", is_open=True)
        JobOpening.objects.create(title="Closed role", is_open=False)

    # --- public ----------------------------------------------------------
    def test_public_careers_lists_open_only(self):
        r = self.client.get("/api/careers/")   # no auth
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["title"], "Field Agent")

    def test_public_can_apply(self):
        r = self.client.post(
            "/api/careers/apply/",
            {"job": self.job.id, "full_name": "Ana Reyes", "email": "ana@example.com"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Applicant.objects.filter(email="ana@example.com").exists())

    # --- internal --------------------------------------------------------
    def test_hr_can_list_and_update_applicant(self):
        a = Applicant.objects.create(job=self.job, full_name="Ana", email="a@x.ph")
        self.client.force_authenticate(user=self.hr.user)
        self.assertEqual(self.client.get("/api/recruitment/applicants/").data["count"], 1)
        r = self.client.patch(
            f"/api/recruitment/applicants/{a.id}/",
            {"status": "shortlisted", "reviewer_notes": "Strong fit"},
            format="json",
        )
        self.assertEqual(r.data["status"], "shortlisted")

    def test_non_hr_cannot_manage(self):
        self.client.force_authenticate(user=self.finance.user)
        self.assertEqual(
            self.client.get("/api/recruitment/applicants/").status_code,
            status.HTTP_403_FORBIDDEN,
        )


class AgentVerifyTests(APITestCase):
    def setUp(self):
        self.records = make_employee(role=Role.RECORDS, username="rec")  # CLIENT_MANAGE
        self.agent = Agent.objects.create(
            full_name="Jose Santos", agent_code="AG-2026-0042", phone="0917xxxxxxx", is_active=True
        )

    def test_public_verify_returns_masked_and_no_private_fields(self):
        r = self.client.get("/api/agents/verify/?q=AG-2026-0042")  # no auth
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertTrue(r.data["found"])
        self.assertEqual(r.data["full_name"], "Jose Santos")
        self.assertNotIn("phone", r.data)                  # private field hidden
        self.assertNotEqual(r.data["agent_code"], "AG-2026-0042")  # masked
        self.assertTrue(r.data["agent_code"].startswith("AG"))

    def test_verify_not_found(self):
        r = self.client.get("/api/agents/verify/?q=nope")
        self.assertFalse(r.data["found"])

    def test_records_can_manage_agents(self):
        self.client.force_authenticate(user=self.records.user)
        r = self.client.post(
            "/api/agents/",
            {"full_name": "New Agent", "agent_code": "AG-2026-0100", "is_active": True},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
