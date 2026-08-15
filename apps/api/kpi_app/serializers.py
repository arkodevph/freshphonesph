from rest_framework import serializers

from tasks_app.models import Task

from .models import KPIReview


class KPIReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source="reviewer.full_name", read_only=True)

    class Meta:
        model = KPIReview
        fields = [
            "id", "task", "reviewer", "reviewer_name", "factual_evidence",
            "evaluation", "recommendation", "decision", "created_at",
        ]
        read_only_fields = ["id", "reviewer", "reviewer_name", "created_at"]


class KPIReviewCreateSerializer(serializers.Serializer):
    task = serializers.PrimaryKeyRelatedField(queryset=Task.objects.all())
    evaluation = serializers.CharField(allow_blank=True, required=False)
    recommendation = serializers.CharField(max_length=200, allow_blank=True, required=False)
    decision = serializers.ChoiceField(
        choices=KPIReview.Decision.choices, default=KPIReview.Decision.NOTED
    )
