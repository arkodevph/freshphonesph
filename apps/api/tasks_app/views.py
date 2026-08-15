"""Task endpoints (M6). Managers assign; employees update their own & submit."""
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.permissions_map import TASK_ASSIGN, has_permission

from . import services
from .models import Task
from .permissions import RequireTaskAssign
from .serializers import TaskCreateSerializer, TaskSerializer


class TaskViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Task.objects.select_related("assignee", "creator").all()

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), RequireTaskAssign()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        return TaskCreateSerializer if self.action == "create" else TaskSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employee = getattr(self.request.user, "employee", None)
        # Managers see all; everyone else sees only their own assigned tasks.
        if not has_permission(employee, TASK_ASSIGN):
            qs = qs.filter(assignee=employee)
        if v := self.request.query_params.get("status"):
            qs = qs.filter(status=v)
        return qs

    def create(self, request, *args, **kwargs):
        ser = TaskCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        task = Task.objects.create(creator=request.user.employee, **ser.validated_data)
        return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        """The assignee submits — records timestamp + objective late flag."""
        task = self.get_object()
        employee = getattr(request.user, "employee", None)
        if task.assignee_id != getattr(employee, "id", None):
            return Response(
                {"detail": "Only the assignee can submit this task."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(TaskSerializer(services.submit_task(task)).data)
