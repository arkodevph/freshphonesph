"""JWT auth serializers.

Foundation-phase login: accept an email OR a username in the same field, so the
portal works with what people naturally type. M2 (docs/13) replaces the default
user with an email-first custom user + roles; this is the bridge until then.
"""
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


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
