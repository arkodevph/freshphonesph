from rest_framework import serializers

from .models import Agent


class AgentSerializer(serializers.ModelSerializer):
    """Internal — full record (records team)."""

    class Meta:
        model = Agent
        fields = ["id", "full_name", "agent_code", "phone", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]
