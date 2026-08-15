"""Agent endpoints (M9). Public verification is privacy-limited; internal CRUD is
records-only."""
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Agent
from .permissions import RequireAgentManage
from .serializers import AgentSerializer


class PublicAgentVerifyView(APIView):
    """Public lookup by code or name. Returns ONLY name, masked code, active status."""

    permission_classes = [AllowAny]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if not q:
            return Response({"found": False, "detail": "Provide ?q=<code or name>."})
        agent = Agent.objects.filter(
            Q(agent_code__iexact=q) | Q(full_name__icontains=q)
        ).first()
        if not agent:
            return Response({"found": False})
        return Response(
            {
                "found": True,
                "full_name": agent.full_name,
                "agent_code": agent.masked_code,   # masked — never the raw code
                "is_active": agent.is_active,
            }
        )


class AgentViewSet(viewsets.ModelViewSet):
    queryset = Agent.objects.all()
    serializer_class = AgentSerializer
    permission_classes = [IsAuthenticated, RequireAgentManage]
