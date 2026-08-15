from rest_framework.routers import DefaultRouter

from .views import BatchViewSet

router = DefaultRouter()
router.register("batches", BatchViewSet, basename="batch")

urlpatterns = router.urls
