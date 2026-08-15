from django.urls import path
from rest_framework.routers import DefaultRouter

from .portal import PortalPaymentsView, PortalScheduleView, PortalSummaryView
from .views import ClientViewSet

router = DefaultRouter()
router.register("clients", ClientViewSet, basename="client")

urlpatterns = router.urls + [
    path("portal/summary/", PortalSummaryView.as_view(), name="portal-summary"),
    path("portal/schedule/", PortalScheduleView.as_view(), name="portal-schedule"),
    path("portal/payments/", PortalPaymentsView.as_view(), name="portal-payments"),
]
