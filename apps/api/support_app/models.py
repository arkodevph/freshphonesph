"""support_app models — Customer Service cases (M8, §10).

CONTRACT SKELETON — owned by Dela Rosa (M8). Concerns are tracked as cases with a
status lifecycle instead of getting lost in chat.
"""
from django.db import models


class SupportCase(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In progress"
        WAITING = "waiting_for_client", "Waiting for client"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"

    client = models.ForeignKey(
        "clients_app.Client", on_delete=models.CASCADE, related_name="support_cases"
    )
    category = models.CharField(max_length=80)
    description = models.TextField()
    assigned_staff = models.ForeignKey(
        "auth_app.Employee", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="assigned_cases",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    resolution = models.TextField(blank=True)
    date_received = models.DateTimeField(auto_now_add=True)
    closed_date = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date_received"]
        indexes = [models.Index(fields=["status"]), models.Index(fields=["client", "status"])]

    @property
    def turnaround_hours(self):
        if self.closed_date:
            return round((self.closed_date - self.date_received).total_seconds() / 3600, 1)
        return None

    def __str__(self):
        return f"Case #{self.pk} [{self.status}] {self.category}"
