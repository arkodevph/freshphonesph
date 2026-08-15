from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from audit_app.services import log_action

from .api_permissions import RequireRoleAssign
from .models import Employee
from .permissions_map import permissions_for
from .serializers import (
    EmployeeCreateSerializer,
    EmployeeSerializer,
    EmployeeUpdateSerializer,
    FlexibleTokenObtainPairSerializer,
)
from .services import create_employee


class FlexibleTokenObtainPairView(TokenObtainPairView):
    """Login by email or username (foundation phase). See serializers.py."""

    serializer_class = FlexibleTokenObtainPairSerializer


class MeView(APIView):
    """Current user's identity + resolved permissions (drives the role-aware UI)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee = getattr(request.user, "employee", None)
        customer = getattr(request.user, "customer_account", None)
        account_type = "employee" if employee else ("customer" if customer else None)
        return Response(
            {
                "id": request.user.id,
                "email": request.user.email,
                "full_name": (
                    employee.full_name if employee
                    else customer.client.full_name if customer
                    else request.user.get_username()
                ),
                "role": employee.role if employee else None,
                "account_type": account_type,
                "client_id": customer.client_id if customer else None,
                "permissions": sorted(permissions_for(employee)),
            }
        )


class EmployeeViewSet(viewsets.ModelViewSet):
    """User & role administration — owner-only (ROLE_ASSIGN)."""

    queryset = Employee.objects.select_related("user").order_by("full_name")
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated, RequireRoleAssign]
    http_method_names = ["get", "post", "patch"]

    def create(self, request, *args, **kwargs):
        ser = EmployeeCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        employee = create_employee(**ser.validated_data)
        log_action(
            actor=request.user.employee, action="employee.create",
            record=employee, after={"role": employee.role, "status": employee.status},
        )
        return Response(EmployeeSerializer(employee).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        employee = self.get_object()
        ser = EmployeeUpdateSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        before = {"role": employee.role, "status": employee.status}
        for field, value in ser.validated_data.items():
            setattr(employee, field, value)
        employee.save()
        log_action(
            actor=request.user.employee, action="employee.update", record=employee,
            before=before, after={"role": employee.role, "status": employee.status},
        )
        return Response(EmployeeSerializer(employee).data)
