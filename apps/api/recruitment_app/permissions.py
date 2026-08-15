from rest_framework.permissions import BasePermission

from auth_app.permissions_map import RECRUITMENT_MANAGE, has_permission


class RequireRecruitmentManage(BasePermission):
    def has_permission(self, request, view):
        return has_permission(getattr(request.user, "employee", None), RECRUITMENT_MANAGE)
