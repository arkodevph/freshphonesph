"""agents_app models — Agent Verification (M9, §11).

CONTRACT SKELETON — owned by Records. The PUBLIC verification result exposes only
the agent's name, a MASKED code, and active/inactive status — never phone, address
or other private fields (§18.8 privacy-limited public result).
"""
from django.db import models


class Agent(models.Model):
    full_name = models.CharField(max_length=200)
    agent_code = models.CharField(max_length=60, unique=True)  # public identifier
    phone = models.CharField(max_length=40, blank=True)        # internal only
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["full_name"]

    @property
    def masked_code(self) -> str:
        code = self.agent_code
        if len(code) <= 4:
            return "*" * len(code)
        return f"{code[:2]}{'*' * (len(code) - 4)}{code[-2:]}"

    def __str__(self):
        return f"{self.full_name} ({self.agent_code})"
