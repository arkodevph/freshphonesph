"""Report access — server-side role check via the shared permission map."""
from rest_framework.permissions import BasePermission

from auth_app.permissions_map import REPORT_VIEW, has_permission


class RequireReportView(BasePermission):
    def has_permission(self, request, view):
        return has_permission(getattr(request.user, "employee", None), REPORT_VIEW)
