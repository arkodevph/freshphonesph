"""Role -> permission map (the shared authorization contract, docs/04 + docs/13).

CONTRACT SKELETON (Sprint 0) — owned by Tambong (M2). The permission KEYS here are
what every module's DRF permission classes reference; keep them stable.
"""
from .models import Role

# Permission constants (action strings).
PAYMENT_RECORD = "PAYMENT_RECORD"
PAYMENT_VERIFY = "PAYMENT_VERIFY"
BATCH_MANAGE = "BATCH_MANAGE"
CLIENT_MANAGE = "CLIENT_MANAGE"
DOCUMENT_REVIEW = "DOCUMENT_REVIEW"
TASK_ASSIGN = "TASK_ASSIGN"
KPI_REVIEW = "KPI_REVIEW"
HR_CONFIDENTIAL = "HR_CONFIDENTIAL"
REPORT_VIEW = "REPORT_VIEW"
ROLE_ASSIGN = "ROLE_ASSIGN"
SUPPORT_MANAGE = "SUPPORT_MANAGE"

ROLE_PERMISSIONS = {
    Role.OWNER: {"*"},
    Role.COO: {BATCH_MANAGE, CLIENT_MANAGE, PAYMENT_RECORD, DOCUMENT_REVIEW,
               TASK_ASSIGN, REPORT_VIEW, SUPPORT_MANAGE},
    Role.GENERAL_MANAGER: {BATCH_MANAGE, CLIENT_MANAGE, PAYMENT_RECORD,
                           TASK_ASSIGN, REPORT_VIEW},
    Role.HR_PAYROLL: {TASK_ASSIGN, KPI_REVIEW, REPORT_VIEW},
    Role.FINANCE_OFFICER: {PAYMENT_RECORD, PAYMENT_VERIFY, REPORT_VIEW},
    Role.RECORDS: {BATCH_MANAGE, CLIENT_MANAGE, PAYMENT_RECORD, DOCUMENT_REVIEW,
                   REPORT_VIEW},
    Role.ANALYTICS: {REPORT_VIEW},
    Role.CS_HEAD: {SUPPORT_MANAGE, REPORT_VIEW},
    Role.CS_TEAM: {SUPPORT_MANAGE},
    Role.CORE_HANDLER: set(),
}


def has_permission(employee, perm: str) -> bool:
    """True if the given Employee's role grants `perm`. Server-side gate (§16)."""
    if employee is None or getattr(employee, "status", None) != "active":
        return False
    perms = ROLE_PERMISSIONS.get(employee.role, set())
    if "*" in perms:
        return True
    if perm == HR_CONFIDENTIAL:
        return HR_CONFIDENTIAL in perms or employee.hr_confidential_access
    return perm in perms
