"""Employee/account provisioning (M2)."""
from django.contrib.auth import get_user_model

from .models import Employee


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
