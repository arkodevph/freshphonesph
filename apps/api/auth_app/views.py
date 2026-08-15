from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import FlexibleTokenObtainPairSerializer


class FlexibleTokenObtainPairView(TokenObtainPairView):
    """Login by email or username (foundation phase). See serializers.py."""

    serializer_class = FlexibleTokenObtainPairSerializer
