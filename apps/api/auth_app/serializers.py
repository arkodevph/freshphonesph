"""JWT auth serializers.

Foundation-phase login: accept an email OR a username in the same field, so the
portal works with what people naturally type. M2 (docs/13) replaces the default
user with an email-first custom user + roles; this is the bridge until then.
"""
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Employee, Role


class FlexibleTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        login = attrs.get(self.username_field)
        # If they typed an email, resolve it to the account's username first.
        if login and "@" in login:
            User = get_user_model()
            match = User.objects.filter(email__iexact=login).first()
            if match:
                attrs[self.username_field] = match.get_username()
        return super().validate(attrs)


class EmployeeSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Employee
        fields = ["id", "email", "full_name", "role", "status", "created_at"]
        read_only_fields = fields


class EmployeeCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=200)
    role = serializers.ChoiceField(choices=Role.choices)
    status = serializers.ChoiceField(choices=["active", "inactive"], default="active")
    password = serializers.CharField(write_only=True, min_length=8)


class EmployeeUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=Role.choices, required=False)
    status = serializers.ChoiceField(choices=["active", "inactive"], required=False)
