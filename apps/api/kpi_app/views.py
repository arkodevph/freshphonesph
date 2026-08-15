"""KPI review endpoints (M6). KPI_REVIEW required. Human-entered; no auto-action."""
from rest_framework import mixins, status, viewsets
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from auth_app.permissions_map import KPI_REVIEW, has_permission
from tasks_app.models import Task
from tasks_app.serializers import TaskSerializer

from .models import KPIReview
from .serializers import KPIReviewCreateSerializer, KPIReviewSerializer


class RequireKpiReview(BasePermission):
    def has_permission(self, request, view):
        return has_permission(getattr(request.user, "employee", None), KPI_REVIEW)


class KpiQueueView(APIView):
    """Late submissions still needing a human review (factual queue only)."""

    permission_classes = [IsAuthenticated, RequireKpiReview]

    def get(self, request):
        tasks = (
            Task.objects.filter(status=Task.Status.SUBMITTED, late_flag=True)
            .exclude(kpi_reviews__isnull=False)
            .select_related("assignee")
        )
        return Response(TaskSerializer(tasks, many=True).data)


class KPIReviewViewSet(
    mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet
):
    queryset = KPIReview.objects.select_related("reviewer", "task").all()
    serializer_class = KPIReviewSerializer
    permission_classes = [IsAuthenticated, RequireKpiReview]

    def create(self, request, *args, **kwargs):
        form = KPIReviewCreateSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        task = form.validated_data["task"]
        # Auto-fill the factual evidence; the human supplies evaluation/recommendation.
        evidence = (
            f"Submitted {task.submission_timestamp:%Y-%m-%d %H:%M} "
            f"vs deadline {task.deadline:%Y-%m-%d %H:%M} "
            f"({'LATE' if task.late_flag else 'on time'})."
            if task.submission_timestamp
            else "Not yet submitted."
        )
        review = KPIReview.objects.create(
            task=task,
            reviewer=request.user.employee,
            factual_evidence=evidence,
            evaluation=form.validated_data.get("evaluation", ""),
            recommendation=form.validated_data.get("recommendation", ""),
            decision=form.validated_data["decision"],
        )
        return Response(KPIReviewSerializer(review).data, status=status.HTTP_201_CREATED)
