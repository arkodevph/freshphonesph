from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ClientBalanceView, PaymentViewSet

router = DefaultRouter()
router.register("payments", PaymentViewSet, basename="payment")

urlpatterns = router.urls + [
    path("clients/<int:client_id>/balance/", ClientBalanceView.as_view(), name="client-balance"),
]
