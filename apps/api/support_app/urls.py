from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import PortalSupportView, SupportCaseViewSet

router = DefaultRouter()
router.register("support/cases", SupportCaseViewSet, basename="support-case")

urlpatterns = router.urls + [
    path("portal/support/", PortalSupportView.as_view(), name="portal-support"),
]
