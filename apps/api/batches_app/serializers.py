from rest_framework import serializers

from .models import Batch, ScheduleItem


class BatchSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(source="members.count", read_only=True)

    class Meta:
        model = Batch
        fields = [
            "id", "batch_number", "unit_model", "status", "contract_price",
            "num_installments", "cadence", "start_date", "end_date",
            "member_count", "created_at",
        ]
        read_only_fields = ["id", "member_count", "created_at"]


class ScheduleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleItem
        fields = ["id", "sequence_no", "due_date", "expected_amount"]
        read_only_fields = fields
