"""Reporting endpoints (M7). Read-only; REPORT_VIEW required."""
from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import exports, selectors
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


class PaymentsExportView(APIView):
    """Export the payments report as CSV (default) or XLSX (?format=xlsx)."""

    permission_classes = [IsAuthenticated, RequireReportView]

    def get(self, request):
        p = request.query_params
        rows = selectors.payments_report(
            status=p.get("status") or None,
            date_from=p.get("date_from") or None,
            date_to=p.get("date_to") or None,
            batch=p.get("batch") or None,
        )
        columns = selectors.PAYMENT_REPORT_COLUMNS
        # NB: use `fmt`, not `format` — DRF reserves `?format=` for content negotiation.
        fmt = (p.get("fmt") or "csv").lower()
        if fmt == "xlsx":
            content = exports.rows_to_xlsx(rows, columns, title="Payments")
            resp = HttpResponse(
                content,
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            resp["Content-Disposition"] = 'attachment; filename="payments.xlsx"'
            return resp
        content = exports.rows_to_csv(rows, columns)
        resp = HttpResponse(content, content_type="text/csv")
        resp["Content-Disposition"] = 'attachment; filename="payments.csv"'
        return resp
