"""DRF serializers for payments (docs/11, docs/15)."""
from rest_framework import serializers

from .models import Payment


class PaymentReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id", "client", "batch", "schedule_item", "amount", "payment_date",
            "method", "reference_no", "status", "notes",
            "recorded_by", "verified_by", "verified_at", "created_at", "updated_at",
        ]
        read_only_fields = fields


class PaymentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "client", "batch", "schedule_item", "amount", "payment_date",
            "method", "reference_no", "notes",
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value

    def validate(self, attrs):
        client, batch = attrs["client"], attrs["batch"]
        if client.batch_id != batch.id:
            raise serializers.ValidationError(
                {"client": "Client does not belong to the given batch."}
            )
        item = attrs.get("schedule_item")
        if item and item.client_id != client.id:
            raise serializers.ValidationError(
                {"schedule_item": "Schedule item does not belong to the client."}
            )
        return attrs


class VerifyInputSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(
        choices=[
            Payment.Status.VERIFIED,
            Payment.Status.REJECTED,
            Payment.Status.NEEDS_CLARIFICATION,
        ]
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")
