from rest_framework import serializers

from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    batch_number = serializers.CharField(source="batch.batch_number", read_only=True)

    class Meta:
        model = Client
        fields = [
            "id", "batch", "batch_number", "full_name", "contact_email",
            "unit_model", "status", "joined_at", "created_at",
        ]
        read_only_fields = ["id", "batch_number", "created_at"]
