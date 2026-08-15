"""kpi_app models — KPI review of flagged tasks (M6, §8).

CONTRACT SKELETON — owned by HR/Dela Rosa. This is where a HUMAN records the
evaluation of a late/flagged task. There is deliberately NO deduction field: the
system never computes or applies wage actions (§8, §18.3, PH labor law).
"""
from django.db import models


class KPIReview(models.Model):
    class Decision(models.TextChoices):
        PENDING = "pending", "Pending"
        NOTED = "noted", "Noted"
        ACTION_RECOMMENDED = "action_recommended", "Action recommended"

    task = models.ForeignKey(
        "tasks_app.Task", on_delete=models.CASCADE, related_name="kpi_reviews"
    )
    reviewer = models.ForeignKey(
        "auth_app.Employee", on_delete=models.PROTECT, related_name="kpi_reviews"
    )
    factual_evidence = models.TextField(blank=True)   # auto-filled fact (e.g. "3h late")
    evaluation = models.TextField(blank=True)          # human, manual
    recommendation = models.CharField(max_length=200, blank=True)  # human, manual
    decision = models.CharField(max_length=24, choices=Decision.choices, default=Decision.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"KPI review of task {self.task_id} [{self.decision}]"
