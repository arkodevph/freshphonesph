"""Test data helpers (docs/14 S0.2). Plain ORM — no extra deps."""
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model

from auth_app.models import Employee, Role
from batches_app.models import Batch, ScheduleItem
from clients_app.models import Client


def make_employee(role=Role.FINANCE_OFFICER, username="fin"):
    user = get_user_model().objects.create(username=username)
    return Employee.objects.create(user=user, full_name=username.title(), role=role)


def make_batch(contract_price="10000.00", num_installments=5):
    n = Batch.objects.count() + 1
    return Batch.objects.create(
        batch_number=f"B{n:04d}",
        unit_model="iPhone 15",
        status=Batch.Status.ACTIVE,
        contract_price=Decimal(contract_price),
        num_installments=num_installments,
        start_date=date.today(),
    )


def make_client_with_schedule(batch=None, contract_price="10000.00", num_installments=5):
    """Create a member + a schedule that sums EXACTLY to contract_price."""
    batch = batch or make_batch(contract_price, num_installments)
    client = Client.objects.create(
        batch=batch, full_name="Test Client", joined_at=date.today()
    )
    total = Decimal(contract_price)
    per = (total / num_installments).quantize(Decimal("0.01"))
    accumulated = Decimal("0")
    for i in range(1, num_installments + 1):
        # last installment absorbs the rounding remainder
        amount = per if i < num_installments else (total - accumulated)
        accumulated += amount
        ScheduleItem.objects.create(
            client=client,
            sequence_no=i,
            due_date=date.today() + timedelta(days=30 * i),
            expected_amount=amount,
        )
    return client
