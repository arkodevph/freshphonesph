"""M6 — tasks: assign, scoped list, submit + late flag, KPI queue (no auto-action)."""
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from auth_app.models import Role
from kpi_app.models import KPIReview
from payments_app.tests.factories import make_employee
from tasks_app.models import Task


class TaskTests(APITestCase):
    def setUp(self):
        self.manager = make_employee(role=Role.GENERAL_MANAGER, username="gm")  # TASK_ASSIGN
        self.hr = make_employee(role=Role.HR_PAYROLL, username="hr")            # KPI_REVIEW
        self.staff = make_employee(role=Role.CORE_HANDLER, username="worker")   # neither

    def _assign(self, deadline):
        return Task.objects.create(
            title="Follow up batch B1", assignee=self.staff, creator=self.manager,
            deadline=deadline,
        )

    # --- assign & scope ---------------------------------------------------
    def test_manager_can_assign(self):
        self.client.force_authenticate(user=self.manager.user)
        r = self.client.post(
            "/api/tasks/",
            {"title": "Call client", "assignee": self.staff.id,
             "deadline": (timezone.now() + timedelta(days=1)).isoformat()},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_worker_cannot_assign(self):
        self.client.force_authenticate(user=self.staff.user)
        r = self.client.post(
            "/api/tasks/",
            {"title": "x", "assignee": self.staff.id,
             "deadline": timezone.now().isoformat()},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_worker_sees_only_own_tasks(self):
        self._assign(timezone.now() + timedelta(days=1))
        other = make_employee(role=Role.CORE_HANDLER, username="other")
        Task.objects.create(title="theirs", assignee=other, creator=self.manager,
                            deadline=timezone.now() + timedelta(days=1))
        self.client.force_authenticate(user=self.staff.user)
        r = self.client.get("/api/tasks/")
        self.assertEqual(r.data["count"], 1)

    # --- submit + late flag (FACT only) -----------------------------------
    def test_submit_on_time_sets_flag_false(self):
        task = self._assign(timezone.now() + timedelta(hours=1))
        self.client.force_authenticate(user=self.staff.user)
        r = self.client.post(f"/api/tasks/{task.id}/submit/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["status"], "submitted")
        self.assertFalse(r.data["late_flag"])

    def test_submit_late_sets_flag_true(self):
        task = self._assign(timezone.now() - timedelta(hours=1))  # already past due
        self.client.force_authenticate(user=self.staff.user)
        r = self.client.post(f"/api/tasks/{task.id}/submit/")
        self.assertTrue(r.data["late_flag"])

    def test_non_assignee_cannot_submit(self):
        task = self._assign(timezone.now() + timedelta(hours=1))
        self.client.force_authenticate(user=self.manager.user)
        r = self.client.post(f"/api/tasks/{task.id}/submit/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    # --- KPI queue + review (human, no deduction) -------------------------
    def test_late_task_appears_in_kpi_queue_and_review_records(self):
        task = self._assign(timezone.now() - timedelta(hours=2))
        self.client.force_authenticate(user=self.staff.user)
        self.client.post(f"/api/tasks/{task.id}/submit/")
        # HR sees it in the queue
        self.client.force_authenticate(user=self.hr.user)
        q = self.client.get("/api/kpi/queue/")
        self.assertEqual(len(q.data), 1)
        # HR records a manual review
        r = self.client.post(
            "/api/kpi/reviews/",
            {"task": task.id, "evaluation": "Traffic delay, first offense.",
             "recommendation": "Verbal reminder", "decision": "noted"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertIn("LATE", r.data["factual_evidence"])
        # reviewed task leaves the queue
        self.assertEqual(len(self.client.get("/api/kpi/queue/").data), 0)

    def test_non_reviewer_cannot_see_queue(self):
        self.client.force_authenticate(user=self.manager.user)  # GM has no KPI_REVIEW
        r = self.client.get("/api/kpi/queue/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
