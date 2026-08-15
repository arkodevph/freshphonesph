"""Records permissions (M3) — server-side role checks."""
from rest_framework.permissions import BasePermission

from auth_app.permissions_map import BATCH_MANAGE, CLIENT_MANAGE, has_permission


class RequireBatchManage(BasePermission):
    def has_permission(self, request, view):
        return has_permission(getattr(request.user, "employee", None), BATCH_MANAGE)


class RequireClientManage(BasePermission):
    def has_permission(self, request, view):
        return has_permission(getattr(request.user, "employee", None), CLIENT_MANAGE)
