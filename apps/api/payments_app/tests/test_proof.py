"""S1.2 — private proof-file upload + presigned view URL (storage mocked)."""
from datetime import date
from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from auth_app.models import Role
from payments_app import services

from .factories import make_client_with_schedule, make_employee


class ProofTests(APITestCase):
    def setUp(self):
        self.member = make_client_with_schedule()
        self.finance = make_employee(role=Role.FINANCE_OFFICER, username="fin")
        self.cs = make_employee(role=Role.CS_TEAM, username="cs")
        self.payment = services.record_payment(
            client=self.member, batch=self.member.batch, amount="2000.00",
            payment_date=date.today(), method="gcash", recorded_by=self.finance,
        )

    def _file(self):
        return SimpleUploadedFile("receipt.png", b"fake-image-bytes", content_type="image/png")

    @patch("storage_app.services._client")
    def test_attach_proof(self, client_mock):
        client_mock.return_value = MagicMock()
        self.client.force_authenticate(user=self.finance.user)
        r = self.client.post(
            f"/api/payments/{self.payment.id}/proof/", {"file": self._file()}, format="multipart"
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(r.data["proof_file"])
        self.payment.refresh_from_db()
        self.assertIsNotNone(self.payment.proof_file_id)

    @patch("storage_app.services._client")
    def test_proof_requires_record_permission(self, client_mock):
        client_mock.return_value = MagicMock()
        self.client.force_authenticate(user=self.cs.user)  # no PAYMENT_RECORD
        r = self.client.post(
            f"/api/payments/{self.payment.id}/proof/", {"file": self._file()}, format="multipart"
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_proof_missing_file_is_400(self):
        self.client.force_authenticate(user=self.finance.user)
        r = self.client.post(f"/api/payments/{self.payment.id}/proof/", {}, format="multipart")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("storage_app.services._client")
    def test_proof_url_returns_presigned_link(self, client_mock):
        m = MagicMock()
        m.generate_presigned_url.return_value = "http://minio/signed-link"
        client_mock.return_value = m
        self.client.force_authenticate(user=self.finance.user)
        self.client.post(
            f"/api/payments/{self.payment.id}/proof/", {"file": self._file()}, format="multipart"
        )
        r = self.client.get(f"/api/payments/{self.payment.id}/proof-url/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["url"], "http://minio/signed-link")

    def test_proof_url_404_when_none_attached(self):
        self.client.force_authenticate(user=self.finance.user)
        r = self.client.get(f"/api/payments/{self.payment.id}/proof-url/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
