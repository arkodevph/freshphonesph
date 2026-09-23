"""notifications_app models (M10) — in-app notifications.

CONTRACT SKELETON — owned by Dela Rosa (M10, docs/12). Minimal model so
payment verification can notify customers now; extend (staff/finance alerts,
templates, read tracking UI) in the M10 sprint.
"""
from django.db import models


class Notification(models.Model):
    class Channel(models.TextChoices):
        IN_APP = "in_app", "In-app"
        EMAIL = "email", "Email"

    client = models.ForeignKey(
        "clients_app.Client", null=True, blank=True, on_delete=models.CASCADE,
        related_name="notifications",
    )
    channel = models.CharField(max_length=12, choices=Channel.choices, default=Channel.IN_APP)
    title = models.CharField(max_length=160)
    body = models.TextField(blank=True)
    payment = models.ForeignKey(
        "payments_app.Payment", null=True, blank=True, on_delete=models.SET_NULL
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} -> client {self.client_id}"
