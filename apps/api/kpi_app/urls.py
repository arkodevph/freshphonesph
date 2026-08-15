from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import KpiQueueView, KPIReviewViewSet

router = DefaultRouter()
router.register("kpi/reviews", KPIReviewViewSet, basename="kpi-review")

urlpatterns = router.urls + [
    path("kpi/queue/", KpiQueueView.as_view(), name="kpi-queue"),
]
