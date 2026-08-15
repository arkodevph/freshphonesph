from rest_framework import serializers

from auth_app.models import Employee

from .models import SupportCase


class SupportCaseSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    turnaround_hours = serializers.FloatField(read_only=True)

    class Meta:
        model = SupportCase
        fields = [
            "id", "client", "client_name", "category", "description",
            "assigned_staff", "status", "resolution", "date_received",
            "closed_date", "turnaround_hours",
        ]
        read_only_fields = fields


class SupportCaseCreateSerializer(serializers.Serializer):
    category = serializers.CharField(max_length=80)
    description = serializers.CharField()


class SupportCaseUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=SupportCase.Status.choices, required=False)
    assigned_staff = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), required=False, allow_null=True
    )
    resolution = serializers.CharField(required=False, allow_blank=True)
