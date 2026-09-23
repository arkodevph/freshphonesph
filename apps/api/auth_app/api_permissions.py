"""DRF permission for user/role administration (M2)."""
from rest_framework.permissions import BasePermission

from .permissions_map import ROLE_ASSIGN, has_permission


class RequireRoleAssign(BasePermission):
    def has_permission(self, request, view):
        return has_permission(getattr(request.user, "employee", None), ROLE_ASSIGN)
