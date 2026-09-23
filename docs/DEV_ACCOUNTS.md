# Dev Accounts (local only)

> ⚠️ **LOCAL DEVELOPMENT ONLY.** These are throwaway accounts that exist only in
> each developer's local Docker Postgres. They are **not** real credentials, carry
> **no** access to any real/production system, and must **never** be reused for
> staging or production. Real accounts + role-based auth arrive in **M2**
> ([13-auth-roles-schema-design.md](13-auth-roles-schema-design.md)).

## Accounts

Shared dev password: **`freshphones123`**

| Login (email) | Username | Name | Modules |
|---|---|---|---|
| `justine.cane@freshphones.ph` | `justine.cane` | Justine Cane Bacurin | M4, M7 |
| `justine.rhey@freshphones.ph` | `justine.rhey` | Justine Rhey Tambong | M2, M3 |
| `rovic@freshphones.ph` | `rovic` | Rovic James Somontina | M1, M5 |
| `ralph@freshphones.ph` | `ralph` | Ralph Rowel Dela Rosa | M6, M8–M10 |

You can log in with **either the email or the username** (foundation login accepts
both — see `auth_app/serializers.py`).

## Recreate them on your machine

The accounts live in your local DB, not in git. After bringing up infra and the
API, seed them:

```bash
docker compose up -d                       # Postgres/MinIO/MailHog
cd apps/api && source .venv/bin/activate
python manage.py migrate
python manage.py seed_dev_accounts         # creates the accounts above (idempotent)
# custom password:  python manage.py seed_dev_accounts --password <pw>
```

For the NestJS preview, set `SEED_PASSWORD` and optionally `DEMO_PASSWORD` in
`apps/api-ts/.env`, then run `pnpm db:seed`. When `DEMO_PASSWORD` is set, the seed creates or
resets these local-only accounts. The seed refuses to run in production.

| Role | Login |
|---|---|
| Owner | `demo@freshphones.test` |
| COO | `demo.coo@freshphones.test` |
| General manager | `demo.manager@freshphones.test` |
| HR / Payroll | `demo.hr@freshphones.test` |
| Finance officer | `demo.finance@freshphones.test` |
| Records | `demo.records@freshphones.test` |
| Analytics | `demo.analytics@freshphones.test` |
| Customer service head | `demo.cs-head@freshphones.test` |
| Customer service team | `demo.cs-team@freshphones.test` |
| Core handler | `demo.handler@freshphones.test` |
| Customer portal | `demo.customer@freshphones.test` |

## Log in

1. Start the web app: `pnpm --filter @fresh/web dev` → http://localhost:3000
2. Go to **/login**, enter your email (e.g. `justine.cane@freshphones.ph`) +
   `freshphones123` → lands on **/system**.

> Note: roles are not enforced yet — every dev account currently reaches the same
> shell. Role-scoped access (Finance can verify payments, etc.) is M2 + per-module work.
