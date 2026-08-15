"""Seed local development accounts (idempotent).

LOCAL DEV ONLY — do not run against staging/production. See docs/DEV_ACCOUNTS.md.
Run from apps/api:  python manage.py seed_dev_accounts
Override the shared password:  python manage.py seed_dev_accounts --password <pw>
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

# username, email, full name, module ownership (docs/10-team-roles.md)
TEAM = [
    ("justine.cane", "justine.cane@freshphones.ph", "Justine Cane Bacurin", "M4, M7"),
    ("justine.rhey", "justine.rhey@freshphones.ph", "Justine Rhey Tambong", "M2, M3"),
    ("rovic", "rovic@freshphones.ph", "Rovic James Somontina", "M1, M5"),
    ("ralph", "ralph@freshphones.ph", "Ralph Rowel Dela Rosa", "M6, M8-M10"),
]


class Command(BaseCommand):
    help = "Seed local dev accounts (idempotent). LOCAL DEV ONLY."

    def add_arguments(self, parser):
        parser.add_argument("--password", default="freshphones123")

    def handle(self, *args, **opts):
        User = get_user_model()
        pw = opts["password"]
        for uname, email, name, _modules in TEAM:
            user, _ = User.objects.get_or_create(
                username=uname, defaults={"email": email}
            )
            first, *rest = name.split(" ", 1)
            user.email = email
            user.first_name = first
            user.last_name = rest[0] if rest else ""
            user.is_staff = True
            user.set_password(pw)
            user.save()
            self.stdout.write(f"  {email}  ({name})")
        self.stdout.write(
            self.style.SUCCESS(f"Seeded {len(TEAM)} dev accounts (password: {pw}).")
        )
