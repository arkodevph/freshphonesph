from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AgentViewSet, PublicAgentVerifyView

router = DefaultRouter()
router.register("agents", AgentViewSet, basename="agent")

# `agents/verify/` must precede the router so it isn't captured as agents/<pk>.
urlpatterns = [
    path("agents/verify/", PublicAgentVerifyView.as_view(), name="agent-verify"),
] + router.urls
