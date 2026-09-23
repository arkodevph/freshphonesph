from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import EmployeeViewSet, StaffDirectoryView

router = DefaultRouter()
router.register("employees", EmployeeViewSet, basename="employee")

urlpatterns = router.urls + [
    path("staff/", StaffDirectoryView.as_view(), name="staff-directory"),
]
