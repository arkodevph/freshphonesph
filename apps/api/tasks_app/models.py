"""tasks_app models — Employee Tasks & Deadlines (M6, §8).

CONTRACT SKELETON — owned by Dela Rosa (M6). The late flag is an OBJECTIVE FACT
only (submission time vs deadline). It must NEVER drive an automatic wage action;
consequential decisions require separate human review (see kpi_app + §8 disclaimer).
"""
from django.db import models


class Task(models.Model):
    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    class Status(models.TextChoices):
        TODO = "todo", "To do"
        IN_PROGRESS = "in_progress", "In progress"
        SUBMITTED = "submitted", "Submitted"
        DONE = "done", "Done"

    title = models.CharField(max_length=200)
    instructions = models.TextField(blank=True)
    assignee = models.ForeignKey(
        "auth_app.Employee", on_delete=models.PROTECT, related_name="tasks"
    )
    creator = models.ForeignKey(
        "auth_app.Employee", on_delete=models.PROTECT, related_name="created_tasks"
    )
    priority = models.CharField(max_length=8, choices=Priority.choices, default=Priority.MEDIUM)
    deadline = models.DateTimeField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.TODO)
    submission_timestamp = models.DateTimeField(null=True, blank=True)
    # null = not submitted yet; True/False = objective on-time/late fact.
    late_flag = models.BooleanField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["assignee", "status"]), models.Index(fields=["status"])]

    def __str__(self):
        return f"{self.title} -> {self.assignee_id}"
