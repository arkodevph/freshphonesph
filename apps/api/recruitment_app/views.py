"""Recruitment endpoints (M9). Public: view openings + apply. Internal: HR manages."""
from rest_framework import mixins, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Applicant, JobOpening
from .permissions import RequireRecruitmentManage
from .serializers import (
    ApplicantCreateSerializer,
    ApplicantSerializer,
    ApplicantUpdateSerializer,
    JobOpeningPublicSerializer,
    JobOpeningSerializer,
)


class PublicCareersView(APIView):
    """Open job listings (public, no auth)."""

    permission_classes = [AllowAny]

    def get(self, request):
        jobs = JobOpening.objects.filter(is_open=True)
        return Response(JobOpeningPublicSerializer(jobs, many=True).data)


class PublicApplyView(APIView):
    """Submit a job application (public, no auth). Data minimization applies."""

    permission_classes = [AllowAny]

    def post(self, request):
        ser = ApplicantCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(
            {"detail": "Application received. Thank you!"},
            status=status.HTTP_201_CREATED,
        )


class JobOpeningViewSet(viewsets.ModelViewSet):
    queryset = JobOpening.objects.all()
    serializer_class = JobOpeningSerializer
    permission_classes = [IsAuthenticated, RequireRecruitmentManage]


class ApplicantViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    queryset = Applicant.objects.select_related("job").all()
    serializer_class = ApplicantSerializer
    permission_classes = [IsAuthenticated, RequireRecruitmentManage]

    def get_queryset(self):
        qs = super().get_queryset()
        if v := self.request.query_params.get("status"):
            qs = qs.filter(status=v)
        return qs

    def partial_update(self, request, pk=None):
        applicant = self.get_object()
        form = ApplicantUpdateSerializer(data=request.data, partial=True)
        form.is_valid(raise_exception=True)
        for field, value in form.validated_data.items():
            setattr(applicant, field, value)
        applicant.save()
        return Response(ApplicantSerializer(applicant).data)
