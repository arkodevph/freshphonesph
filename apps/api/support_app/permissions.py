from rest_framework.permissions import BasePermission

from auth_app.permissions_map import SUPPORT_MANAGE, has_permission


class RequireSupportManage(BasePermission):
    def has_permission(self, request, view):
        return has_permission(getattr(request.user, "employee", None), SUPPORT_MANAGE)


class IsPortalCustomer(BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, "customer_account", None) is not None
