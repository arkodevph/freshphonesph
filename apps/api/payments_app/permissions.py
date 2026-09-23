"""DRF permission classes — server-side role checks (§16), not UI-only.

Resolve the caller's Employee and consult the shared ROLE_PERMISSIONS map.
"""
from rest_framework.permissions import BasePermission

from auth_app.permissions_map import PAYMENT_RECORD, PAYMENT_VERIFY, REPORT_VIEW, has_permission


class _RequirePerm(BasePermission):
    perm: str = ""

    def has_permission(self, request, view):
        employee = getattr(request.user, "employee", None)
        return has_permission(employee, self.perm)


class RequirePaymentRecord(_RequirePerm):
    perm = PAYMENT_RECORD


class RequirePaymentVerify(_RequirePerm):
    perm = PAYMENT_VERIFY


class RequireReportView(_RequirePerm):
    perm = REPORT_VIEW
