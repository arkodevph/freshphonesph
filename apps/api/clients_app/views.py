"""Client endpoints (M3). CLIENT_MANAGE required for writes; read = any staff.

Creating a client auto-generates their installment schedule from the batch terms.
"""
from django.db import transaction
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from batches_app.permissions import RequireClientManage
from batches_app.serializers import ScheduleItemSerializer
from batches_app.services import generate_schedule

from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.select_related("batch").order_by("-created_at")
    serializer_class = ClientSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "schedule"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), RequireClientManage()]

    def get_queryset(self):
        qs = super().get_queryset()
        if batch := self.request.query_params.get("batch"):
            qs = qs.filter(batch_id=batch)
        return qs

    def perform_create(self, serializer):
        with transaction.atomic():
            client = serializer.save()
            generate_schedule(client)

    @action(detail=True, methods=["get"])
    def schedule(self, request, pk=None):
        client = self.get_object()
        items = client.schedule.all().order_by("sequence_no")
        return Response(ScheduleItemSerializer(items, many=True).data)
