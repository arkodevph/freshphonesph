from rest_framework.permissions import BasePermission

from auth_app.permissions_map import TASK_ASSIGN, has_permission


class RequireTaskAssign(BasePermission):
    def has_permission(self, request, view):
        return has_permission(getattr(request.user, "employee", None), TASK_ASSIGN)
