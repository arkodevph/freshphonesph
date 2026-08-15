"""Sprint 1 API tests — record, list/filter, verify, balance, permissions."""
from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from auth_app.models import Role
from payments_app.models import Payment

from .factories import make_client_with_schedule, make_employee


class PaymentAPITests(APITestCase):
    def setUp(self):
        self.member = make_client_with_schedule(contract_price="10000.00")
        self.finance = make_employee(role=Role.FINANCE_OFFICER, username="fin")
        self.cs = make_employee(role=Role.CS_TEAM, username="cs")

    def _payload(self, **over):
        data = {
            "client": self.member.id,
            "batch": self.member.batch_id,
            "amount": "2000.00",
            "payment_date": date.today().isoformat(),
            "method": "gcash",
        }
        data.update(over)
        return data

    def _record(self, emp, **over):
        self.client.force_authenticate(user=emp.user)
        return self.client.post("/api/payments/", self._payload(**over), format="json")

    # --- record (S1.1 / S1.4) ---------------------------------------------
    def test_record_creates_pending(self):
        r = self._record(self.finance)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["status"], "pending")

    def test_record_requires_auth(self):
        r = self.client.post("/api/payments/", self._payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_record_forbidden_for_unprivileged_role(self):
        r = self._record(self.cs)
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_amount_must_be_positive(self):
        r = self._record(self.finance, amount="0")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_client_batch_mismatch_rejected(self):
        other = make_client_with_schedule(contract_price="5000.00")
        r = self._record(self.finance, batch=other.batch_id)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    # --- list/filter (S1.3) -----------------------------------------------
    def test_list_filters_by_status(self):
        self._record(self.finance)
        self.client.force_authenticate(user=self.finance.user)
        r = self.client.get("/api/payments/?status=pending")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["count"], 1)

    def test_list_forbidden_for_role_without_payment_rights(self):
        self.client.force_authenticate(user=self.cs.user)  # CS_TEAM has no payment perm
        r = self.client.get("/api/payments/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    # --- verify (S2 preview) + balance ------------------------------------
    def test_finance_can_verify_and_balance_moves(self):
        pid = self._record(self.finance).data["id"]
        self.client.force_authenticate(user=self.finance.user)
        r = self.client.post(f"/api/payments/{pid}/verify/", {"decision": "verified"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["status"], "verified")
        b = self.client.get(f"/api/clients/{self.member.id}/balance/")
        self.assertEqual(b.data["verified_paid"], "2000.00")
        self.assertEqual(b.data["remaining_balance"], "8000.00")

    def test_non_finance_cannot_verify(self):
        pid = self._record(self.finance).data["id"]
        self.client.force_authenticate(user=self.cs.user)
        r = self.client.post(f"/api/payments/{pid}/verify/", {"decision": "verified"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_double_verify_conflicts(self):
        pid = self._record(self.finance).data["id"]
        self.client.force_authenticate(user=self.finance.user)
        self.client.post(f"/api/payments/{pid}/verify/", {"decision": "verified"}, format="json")
        r = self.client.post(f"/api/payments/{pid}/verify/", {"decision": "verified"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
