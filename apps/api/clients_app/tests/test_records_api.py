"""M3 — batch + client CRUD, schedule auto-generation, permissions."""
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from auth_app.models import Role
from batches_app.models import Batch, ScheduleItem
from clients_app.models import Client
from payments_app.tests.factories import make_employee


class RecordsAPITests(APITestCase):
    def setUp(self):
        self.records = make_employee(role=Role.RECORDS, username="rec")   # BATCH/CLIENT_MANAGE
        self.cs = make_employee(role=Role.CS_TEAM, username="cs")          # neither

    def _batch_payload(self, **over):
        data = {
            "batch_number": "B-2026-01",
            "unit_model": "iPhone 15",
            "status": "active",
            "contract_price": "10000.00",
            "num_installments": 5,
            "cadence": "monthly",
            "start_date": "2026-09-01",
        }
        data.update(over)
        return data

    def test_records_role_can_create_batch(self):
        self.client.force_authenticate(user=self.records.user)
        r = self.client.post("/api/batches/", self._batch_payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_unprivileged_cannot_create_batch(self):
        self.client.force_authenticate(user=self.cs.user)
        r = self.client.post("/api/batches/", self._batch_payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_creating_client_generates_schedule(self):
        self.client.force_authenticate(user=self.records.user)
        b = self.client.post("/api/batches/", self._batch_payload(), format="json").data
        r = self.client.post(
            "/api/clients/",
            {"batch": b["id"], "full_name": "Maria Cruz", "joined_at": "2026-09-01"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        client_id = r.data["id"]
        items = ScheduleItem.objects.filter(client_id=client_id)
        self.assertEqual(items.count(), 5)
        total = sum(i.expected_amount for i in items)
        self.assertEqual(total, Decimal("10000.00"))  # sums exactly to contract price

    def test_schedule_endpoint(self):
        self.client.force_authenticate(user=self.records.user)
        b = self.client.post("/api/batches/", self._batch_payload(), format="json").data
        c = self.client.post(
            "/api/clients/",
            {"batch": b["id"], "full_name": "Ana", "joined_at": "2026-09-01"},
            format="json",
        ).data
        r = self.client.get(f"/api/clients/{c['id']}/schedule/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 5)

    def test_batch_member_count(self):
        self.client.force_authenticate(user=self.records.user)
        b = self.client.post("/api/batches/", self._batch_payload(), format="json").data
        for name in ("A", "B"):
            self.client.post(
                "/api/clients/",
                {"batch": b["id"], "full_name": name, "joined_at": "2026-09-01"},
                format="json",
            )
        detail = self.client.get(f"/api/batches/{b['id']}/").data
        self.assertEqual(detail["member_count"], 2)
