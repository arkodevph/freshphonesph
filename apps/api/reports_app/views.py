"""Reporting endpoints (M7). Read-only; REPORT_VIEW required."""
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import selectors
from .permissions import RequireReportView


class DashboardView(APIView):
    permission_classes = [IsAuthenticated, RequireReportView]

    def get(self, request):
        return Response(selectors.dashboard_cards())


class CollectionsView(APIView):
    permission_classes = [IsAuthenticated, RequireReportView]

    def get(self, request):
        p = request.query_params
        return Response(
            selectors.collections(
                date_from=p.get("date_from") or None,
                date_to=p.get("date_to") or None,
                batch=p.get("batch") or None,
            )
        )
