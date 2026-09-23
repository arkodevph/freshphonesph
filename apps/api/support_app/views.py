"""Customer Service endpoints (M8). Staff manage cases; customers raise/track own."""
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SupportCase
from .permissions import IsPortalCustomer, RequireSupportManage
from .serializers import (
    SupportCaseCreateSerializer,
    SupportCaseSerializer,
    SupportCaseUpdateSerializer,
)

_CLOSED = {SupportCase.Status.RESOLVED, SupportCase.Status.CLOSED}


class SupportCaseViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """Staff view of all cases (SUPPORT_MANAGE)."""

    queryset = SupportCase.objects.select_related("client", "assigned_staff").all()
    serializer_class = SupportCaseSerializer
    permission_classes = [IsAuthenticated, RequireSupportManage]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if v := p.get("status"):
            qs = qs.filter(status=v)
        if v := p.get("client"):
            qs = qs.filter(client_id=v)
        return qs

    def partial_update(self, request, pk=None):
        case = self.get_object()
        form = SupportCaseUpdateSerializer(data=request.data, partial=True)
        form.is_valid(raise_exception=True)
        data = form.validated_data
        if "status" in data:
            case.status = data["status"]
            if case.status in _CLOSED and not case.closed_date:
                case.closed_date = timezone.now()
        if "assigned_staff" in data:
            case.assigned_staff = data["assigned_staff"]
        if "resolution" in data:
            case.resolution = data["resolution"]
        case.save()
        return Response(SupportCaseSerializer(case).data)


class PortalSupportView(APIView):
    """Customer's own cases: list + create a concern."""

    permission_classes = [IsAuthenticated, IsPortalCustomer]

    def get(self, request):
        cases = request.user.customer_account.client.support_cases.all()
        return Response(SupportCaseSerializer(cases, many=True).data)

    def post(self, request):
        form = SupportCaseCreateSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        case = SupportCase.objects.create(
            client=request.user.customer_account.client,
            category=form.validated_data["category"],
            description=form.validated_data["description"],
        )
        return Response(SupportCaseSerializer(case).data, status=status.HTTP_201_CREATED)
