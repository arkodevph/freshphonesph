"""Employee/account provisioning (M2, M5)."""
from django.contrib.auth import get_user_model

from .models import CustomerAccount, Employee


def create_employee(*, email, full_name, role, password, status="active"):
    """Create (or re-provision) a staff login + employee profile."""
    User = get_user_model()
    user, _ = User.objects.get_or_create(username=email, defaults={"email": email})
    user.email = email
    user.is_staff = True
    user.set_password(password)
    user.save()
    employee, _ = Employee.objects.update_or_create(
        user=user,
        defaults={"full_name": full_name, "role": role, "status": status},
    )
    return employee


def create_customer_account(*, client, email, password):
    """Create (or re-provision) a customer's portal login, linked to their Client (M5)."""
    User = get_user_model()
    user, _ = User.objects.get_or_create(username=email, defaults={"email": email})
    user.email = email
    user.set_password(password)
    user.save()
    account, _ = CustomerAccount.objects.update_or_create(
        user=user, defaults={"client": client}
    )
    return account
