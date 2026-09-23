from rest_framework import serializers

from auth_app.models import Employee

from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.CharField(source="assignee.full_name", read_only=True)
    creator_name = serializers.CharField(source="creator.full_name", read_only=True)

    class Meta:
        model = Task
        fields = [
            "id", "title", "instructions", "assignee", "assignee_name",
            "creator", "creator_name", "priority", "deadline", "status",
            "submission_timestamp", "late_flag", "created_at",
        ]
        read_only_fields = [
            "id", "assignee_name", "creator", "creator_name", "status",
            "submission_timestamp", "late_flag", "created_at",
        ]


class TaskCreateSerializer(serializers.ModelSerializer):
    assignee = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all())

    class Meta:
        model = Task
        fields = ["title", "instructions", "assignee", "priority", "deadline"]
