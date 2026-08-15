from rest_framework import serializers

from .models import Applicant, JobOpening


class JobOpeningPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobOpening
        fields = ["id", "title", "description", "location", "employment_type"]


class JobOpeningSerializer(serializers.ModelSerializer):
    applicant_count = serializers.IntegerField(source="applicants.count", read_only=True)

    class Meta:
        model = JobOpening
        fields = [
            "id", "title", "description", "location", "employment_type",
            "is_open", "applicant_count", "created_at",
        ]
        read_only_fields = ["id", "applicant_count", "created_at"]


class ApplicantSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source="job.title", read_only=True, default="")

    class Meta:
        model = Applicant
        fields = [
            "id", "job", "job_title", "full_name", "email", "phone", "message",
            "status", "reviewer_notes", "created_at",
        ]
        read_only_fields = fields


class ApplicantCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Applicant
        fields = ["job", "full_name", "email", "phone", "message"]


class ApplicantUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Applicant.Status.choices, required=False)
    reviewer_notes = serializers.CharField(required=False, allow_blank=True)
