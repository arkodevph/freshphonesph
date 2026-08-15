from rest_framework.permissions import BasePermission

from auth_app.permissions_map import CLIENT_MANAGE, has_permission


class RequireAgentManage(BasePermission):
    """Agents are records-domain; the Records team (CLIENT_MANAGE) manages them."""

    def has_permission(self, request, view):
        return has_permission(getattr(request.user, "employee", None), CLIENT_MANAGE)
