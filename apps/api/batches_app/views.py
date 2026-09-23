"""Batch endpoints (M3). BATCH_MANAGE required for writes; read = any staff."""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Batch
from .permissions import RequireBatchManage
from .serializers import BatchSerializer


class BatchViewSet(viewsets.ModelViewSet):
    queryset = Batch.objects.all().order_by("-created_at")
    serializer_class = BatchSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), RequireBatchManage()]
