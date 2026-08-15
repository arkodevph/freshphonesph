from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .permissions_map import permissions_for
from .serializers import FlexibleTokenObtainPairSerializer


class FlexibleTokenObtainPairView(TokenObtainPairView):
    """Login by email or username (foundation phase). See serializers.py."""

    serializer_class = FlexibleTokenObtainPairSerializer


class MeView(APIView):
    """Current user's identity + resolved permissions (drives the role-aware UI)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee = getattr(request.user, "employee", None)
        return Response(
            {
                "id": request.user.id,
                "email": request.user.email,
                "full_name": employee.full_name if employee else request.user.get_username(),
                "role": employee.role if employee else None,
                "permissions": sorted(permissions_for(employee)),
            }
        )
