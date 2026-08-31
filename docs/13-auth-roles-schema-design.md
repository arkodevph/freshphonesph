# 13 — Design: Auth, Accounts & Roles (M2)

> **Migration note:** This is the Django baseline contract. Keep the permission keys and
> behavior, but implement target authentication and authorization with NestJS guards.

Schema for **Auth, Accounts & Roles** ([05-modules.md](05-modules.md) M2, §3, §16) —
`auth_app`. **Owned by Justine Rhey Tambong** (core spine). Written here because **every gated
module depends on it** — in particular M4's `payment:verify` must resolve to the Finance role.
Roles/permissions match [04-roles-access.md](04-roles-access.md).

> **Status: proposed interface, pre-sign-off.** The **role keys** and **permission constants**
> below are the shared contract every developer codes against — agree these first.

---

## Accounts

Two account kinds sit on one custom user (email login + JWT via DRF SimpleJWT):
- **Employee** — internal staff, has a `role`.
- **CustomerAccount** — external portal user, linked 1:1 to a `Client` (M3).

```python
# auth_app/models.py
class User(AbstractBaseUser, PermissionsMixin):
    email      = models.EmailField(unique=True)
    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)   # Django admin only
    USERNAME_FIELD = "email"
    # password handled by AbstractBaseUser; SimpleJWT issues access/refresh

class Role(models.TextChoices):
    OWNER            = "owner"
    COO              = "coo"
    GENERAL_MANAGER  = "general_manager"
    HR_PAYROLL       = "hr_payroll"
    FINANCE_OFFICER  = "finance_officer"
    RECORDS          = "records_monitoring"
    ANALYTICS        = "analytics"
    CS_HEAD          = "cs_head"
    CS_TEAM          = "cs_team"
    CORE_HANDLER     = "core_handler"

class Employee(models.Model):
    user       = models.OneToOneField("auth_app.User", on_delete=models.CASCADE,
                                        related_name="employee")
    full_name  = models.CharField(max_length=200)
    role       = models.CharField(max_length=24, choices=Role.choices)
    status     = models.CharField(max_length=12, default="active")   # active/inactive
    # confidential HR/payroll access is a separate explicit grant, not implied by role
    hr_confidential_access = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class CustomerAccount(models.Model):
    user       = models.OneToOneField("auth_app.User", on_delete=models.CASCADE,
                                        related_name="customer_account")
    # linked to clients_app.Client via Client.customer_account (M3)
    created_at = models.DateTimeField(auto_now_add=True)
```

## Permissions (the shared contract)

Permissions are **action strings** on modules. Roles map to permission sets. This dict is the
single source both the API and the frontend read (mirrors the matrix in
[04-roles-access.md](04-roles-access.md)).

```python
# auth_app/permissions_map.py
P = {  # permission constants
  "BATCH_MANAGE", "CLIENT_MANAGE",
  "PAYMENT_RECORD", "PAYMENT_VERIFY",
  "DOCUMENT_REVIEW", "TASK_ASSIGN", "KPI_REVIEW",
  "HR_CONFIDENTIAL", "REPORT_VIEW", "ROLE_ASSIGN", "SUPPORT_MANAGE",
}

ROLE_PERMISSIONS = {
  Role.OWNER:           {"*"},                       # all
  Role.FINANCE_OFFICER: {"PAYMENT_RECORD", "PAYMENT_VERIFY", "REPORT_VIEW"},
  Role.RECORDS:         {"BATCH_MANAGE", "CLIENT_MANAGE", "PAYMENT_RECORD",
                         "DOCUMENT_REVIEW", "REPORT_VIEW"},
  Role.GENERAL_MANAGER: {"BATCH_MANAGE", "CLIENT_MANAGE", "PAYMENT_RECORD",
                         "TASK_ASSIGN", "REPORT_VIEW"},
  Role.COO:             {"BATCH_MANAGE", "CLIENT_MANAGE", "PAYMENT_RECORD",
                         "DOCUMENT_REVIEW", "TASK_ASSIGN", "REPORT_VIEW", "SUPPORT_MANAGE"},
  Role.HR_PAYROLL:      {"TASK_ASSIGN", "KPI_REVIEW", "REPORT_VIEW"},   # +HR_CONFIDENTIAL if granted
  Role.ANALYTICS:       {"REPORT_VIEW"},
  Role.CS_HEAD:         {"SUPPORT_MANAGE", "REPORT_VIEW"},
  Role.CS_TEAM:         {"SUPPORT_MANAGE"},
  Role.CORE_HANDLER:    set(),                        # only assigned-record scope
}
# COO/HR_PAYROLL get HR_CONFIDENTIAL only when Employee.hr_confidential_access is True.
```

### DRF enforcement (server-side, not UI)

```python
# auth_app/api_permissions.py
class HasPermission(BasePermission):
    required = None                       # e.g. "PAYMENT_VERIFY"
    def has_permission(self, request, view):
        emp = getattr(request.user, "employee", None)
        if not emp or emp.status != "active":
            return False
        perms = ROLE_PERMISSIONS.get(emp.role, set())
        if "*" in perms:
            return True
        if self.required == "HR_CONFIDENTIAL":
            return "HR_CONFIDENTIAL" in perms or emp.hr_confidential_access
        return self.required in perms
```

```python
# usage in payments_app (M4) — this is the dependency Justice Cane needs resolved:
class VerifyPayment(APIView):
    permission_classes = [IsAuthenticated, RequirePaymentVerify]   # -> "PAYMENT_VERIFY"
    # only OWNER + FINANCE_OFFICER pass, per ROLE_PERMISSIONS
```

## JWT / auth flow (SimpleJWT)
- `POST /api/auth/token/` → access + refresh (email/password)
- `POST /api/auth/token/refresh/`
- `POST /api/auth/password-reset/` → email via Resend (MailHog local)
- Access token carries `user_id`; the API loads `employee`/`customer_account` for role checks.
- **Customers** authenticate the same way but resolve to a `CustomerAccount` (own-data scope
  only, M5).

## Audit hook (§16)
Role assignment/changes (`ROLE_ASSIGN`) and confidential-access grants write to `audit_app`
with actor + before/after — same audit contract M4 uses for verification.

## The keys everyone must agree (blockers if unset)
| Contract | Value everyone codes against |
|---|---|
| Finance role key | `Role.FINANCE_OFFICER = "finance_officer"` |
| Verify permission | `"PAYMENT_VERIFY"` → OWNER + FINANCE_OFFICER only |
| Record permission | `"PAYMENT_RECORD"` → finance/records/GM/COO/owner |
| Report permission | `"REPORT_VIEW"` |
| Customer scope | `CustomerAccount` → `Client` (own data only) |

> **For Justine Cane:** once these keys are fixed, your M4 `verify` endpoint and M7 report
> endpoints just declare `required = "PAYMENT_VERIFY"` / `"REPORT_VIEW"` — no other coupling to
> Tambong's internals.
