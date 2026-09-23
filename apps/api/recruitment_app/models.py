"""recruitment_app models — Careers & Applications (M9, §11).

CONTRACT SKELETON — owned by Dela Rosa/HR. Public can view openings and apply;
collect only necessary applicant fields (data minimization, §14).
"""
from django.db import models


class JobOpening(models.Model):
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=120, blank=True)
    employment_type = models.CharField(max_length=60, blank=True)  # full-time/part-time/agent
    is_open = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Applicant(models.Model):
    class Status(models.TextChoices):
        RECEIVED = "received", "Received"
        REVIEWING = "reviewing", "Reviewing"
        SHORTLISTED = "shortlisted", "Shortlisted"
        REJECTED = "rejected", "Rejected"
        HIRED = "hired", "Hired"

    job = models.ForeignKey(
        JobOpening, null=True, blank=True, on_delete=models.SET_NULL, related_name="applicants"
    )
    # Only necessary fields (data minimization).
    full_name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=40, blank=True)
    message = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.RECEIVED)
    reviewer_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} ({self.status})"
