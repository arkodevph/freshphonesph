"""auth_app models.

CONTRACT SKELETON (Sprint 0) — owned by Tambong (M2, docs/13). Minimal fields the
other modules build against; extend (CustomerAccount, custom User, password reset)
in the M2 sprint without breaking these names.
"""
from django.conf import settings
from django.db import models


class Role(models.TextChoices):
    OWNER = "owner", "Owner"
    COO = "coo", "COO"
    GENERAL_MANAGER = "general_manager", "General Manager"
    HR_PAYROLL = "hr_payroll", "HR / Payroll"
    FINANCE_OFFICER = "finance_officer", "Finance Officer"
    RECORDS = "records_monitoring", "Records & Monitoring"
    ANALYTICS = "analytics", "Analytics"
    CS_HEAD = "cs_head", "Customer Service Head"
    CS_TEAM = "cs_team", "Customer Service Team"
    CORE_HANDLER = "core_handler", "Core Team / Handler"


class Employee(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="employee"
    )
    full_name = models.CharField(max_length=200)
    role = models.CharField(max_length=24, choices=Role.choices)
    status = models.CharField(max_length=12, default="active")  # active/inactive
    # Confidential HR/payroll is a separate explicit grant, not implied by role (§18.7).
    hr_confidential_access = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} ({self.role})"


class CustomerAccount(models.Model):
    """A customer's portal login, linked 1:1 to their Client record (M5)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="customer_account"
    )
    client = models.OneToOneField(
        "clients_app.Client", on_delete=models.CASCADE, related_name="portal_account"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"portal:{self.user.email} -> client {self.client_id}"
