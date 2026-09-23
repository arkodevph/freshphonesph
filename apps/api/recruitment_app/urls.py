from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ApplicantViewSet,
    JobOpeningViewSet,
    PublicApplyView,
    PublicCareersView,
)

router = DefaultRouter()
router.register("recruitment/jobs", JobOpeningViewSet, basename="job")
router.register("recruitment/applicants", ApplicantViewSet, basename="applicant")

urlpatterns = [
    path("careers/", PublicCareersView.as_view(), name="public-careers"),
    path("careers/apply/", PublicApplyView.as_view(), name="public-apply"),
] + router.urls
