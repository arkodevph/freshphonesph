"""Thin DRF views — delegate all writes to services, reads to selectors."""
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from clients_app.models import Client

from . import documents, selectors, services
from .models import Payment
from .permissions import RequirePaymentRecord, RequirePaymentVerify
from .serializers import (
    PaymentCreateSerializer,
    PaymentReadSerializer,
    VerifyInputSerializer,
)


class PaymentViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Payment.objects.select_related(
        "client", "batch", "recorded_by", "verified_by"
    ).all()

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), RequirePaymentRecord()]
        if self.action == "verify":
            return [IsAuthenticated(), RequirePaymentVerify()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        return PaymentCreateSerializer if self.action == "create" else PaymentReadSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if v := p.get("client"):
            qs = qs.filter(client_id=v)
        if v := p.get("batch"):
            qs = qs.filter(batch_id=v)
        if v := p.get("status"):
            qs = qs.filter(status=v)
        if v := p.get("date_from"):
            qs = qs.filter(payment_date__gte=v)
        if v := p.get("date_to"):
            qs = qs.filter(payment_date__lte=v)
        return qs.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        payment = services.record_payment(
            recorded_by=request.user.employee, **ser.validated_data
        )
        return Response(
            PaymentReadSerializer(payment).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        form = VerifyInputSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        try:
            payment = services.verify_payment(
                payment_id=pk,
                decision=form.validated_data["decision"],
                actor=request.user.employee,
                notes=form.validated_data.get("notes", ""),
            )
        except services.PaymentStateError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        return Response(PaymentReadSerializer(payment).data)

    @action(detail=True, methods=["get"])
    def confirmation(self, request, pk=None):
        """Payment Confirmation document (verified payments only)."""
        payment = self.get_object()
        try:
            return Response(documents.build_payment_confirmation(payment))
        except documents.DocumentError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class ClientBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        client = get_object_or_404(Client, pk=client_id)
        return Response(
            {
                "client": client.id,
                "total_due": str(selectors.total_due(client)),
                "verified_paid": str(selectors.verified_paid(client)),
                "remaining_balance": str(selectors.remaining_balance(client)),
            }
        )


class ClientStatementView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        client = get_object_or_404(Client, pk=client_id)
        return Response(documents.build_statement(client))
