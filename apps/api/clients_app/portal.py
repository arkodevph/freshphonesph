"""Customer portal endpoints (M5) — each customer sees ONLY their own record.

Read-only views over the customer's linked Client; scoping comes from
request.user.customer_account (never a client id from the request).
"""
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from payments_app import selectors as psel
from payments_app.serializers import PaymentReadSerializer


class IsPortalCustomer(BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, "customer_account", None) is not None


def _client(request):
    return request.user.customer_account.client


class PortalSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsPortalCustomer]

    def get(self, request):
        c = _client(request)
        return Response(
            {
                "full_name": c.full_name,
                "batch_number": c.batch.batch_number,
                "unit_model": c.batch.unit_model or c.unit_model,
                "status": c.status,
                "total_due": str(psel.total_due(c)),
                "verified_paid": str(psel.verified_paid(c)),
                "remaining_balance": str(psel.remaining_balance(c)),
            }
        )


class PortalScheduleView(APIView):
    permission_classes = [IsAuthenticated, IsPortalCustomer]

    def get(self, request):
        return Response(psel.schedule_with_status(_client(request)))


class PortalPaymentsView(APIView):
    permission_classes = [IsAuthenticated, IsPortalCustomer]

    def get(self, request):
        payments = psel.verified_payments(_client(request))
        return Response(PaymentReadSerializer(payments, many=True).data)
