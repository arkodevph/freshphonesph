from django.urls import path

from .views import CollectionsView, DashboardView

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="report-dashboard"),
    path("collections/", CollectionsView.as_view(), name="report-collections"),
]
