"""URL configuration for the Fresh Phones PH API."""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenRefreshView

from auth_app.views import FlexibleTokenObtainPairView


def health(_request):
    return JsonResponse({"status": "ok", "service": "fresh-phones-api"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
    # Auth (JWT) — M2 will extend with password reset etc.
    path("api/auth/token/", FlexibleTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # API schema / docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    # Per-module routes
    path("api/", include("payments_app.urls")),
    path("api/reports/", include("reports_app.urls")),
]
