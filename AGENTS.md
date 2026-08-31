# Fresh Phones PH — Integrated Web System & Portal

> **For AI assistants & new developers.** Read this first. It describes what this repo is,
> how it's built, how to run it, and the conventions to follow. Full planning lives in
> [`docs/`](docs/README.md); current implementation status is in
> [`docs/BUILD_STATUS.md`](docs/BUILD_STATUS.md).

## What this is
A business operations & records platform for **Fresh Phones PH** (a Philippine iPhone/iPad
**Paluwagan** — group-savings installment — business). It is **NOT** an online payment gateway,
**NOT** a BIR POS, and **NOT** an autonomous HR decision-maker. Customers pay **externally**
(Messenger/GCash); the system **records** payments and Finance **verifies** them.

Source of truth for scope: **Full Scope v5 (Rev 1.4)** → summarized in [`docs/`](docs/README.md).

## 🔑 Golden rules (do not break these)
1. **Money:** only **Finance-verified** payments move a customer's balance. Balance is derived
   (`total_due − verified_paid`), never a mutable column. Verify is Finance-only, atomic, audited.
2. **No auto wage actions:** task on-time/late is an **objective fact only**; the system never
   computes or applies salary deductions (PH labor law, §8). KPI decisions are human-entered.
3. **BIR boundary:** the system may produce a "Statement of Account" / "Payment Confirmation"
   (operational docs, flagged `not_official_bir_invoice`), never the official BIR invoice (§7).
4. **Privacy-limited public:** the public agent verification returns only name + **masked** code
   + active status — never phone/address/IDs (§18.8). Collect only necessary data (§14).
5. **Server-side authz:** permissions are enforced in the API (NestJS guards in the target;
   DRF permission classes in the Django baseline), never UI-only. The role-aware UI is UX on
   top of that.
6. **Secrets** live only in env vars (`apps/api/.env`, `apps/web/.env.local`) — never committed.

## Monorepo layout
```
apps/web/    Next.js 16 + React 19 + Tailwind v4 (Vercel)  — landing, /system staff, /portal customer
apps/api/    Django 5 baseline (temporary migration source; no new feature work by default)
apps/api-ts/ NestJS + Prisma + TypeScript (Railway target) — one module per business domain
packages/    (reserved for shared UI/config)
docs/        planning (00–16) + BUILD_STATUS + PULL_REQUEST
docker-compose.yml   local infra: Postgres:5435 + MinIO + MailHog
```

## Stack (decided — see docs/09-tech-stack.md)
- **Backend target:** NestJS · TypeScript · Prisma · API-issued JWT · PostgreSQL (Supabase in
  prod) · private Supabase Storage/MinIO via S3 signed URLs · Resend email.
- **Backend baseline:** Django 5 + DRF remains under `apps/api/` only as parity/migration
  evidence until each TypeScript vertical slice passes its cutover gate.
- **Frontend:** Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · Radix/Phosphor.
- **Tooling:** pnpm workspaces + Turborepo · Python venv · pytest via `manage.py test`.

## Run it locally
```bash
# 1) infra
docker compose up -d                      # Postgres:5435, MinIO:9000/9001, MailHog:1025/8025

# 2) current baseline backend (apps/api; temporary during TypeScript migration)
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_dev_accounts        # staff logins + roles (see docs/DEV_ACCOUNTS.md)
python manage.py runserver 8000

# 3) frontend (repo root)
pnpm install
pnpm --filter @fresh/web dev              # http://localhost:3000  (API at :8000)
```
Local dev accounts (password `freshphones123`): `justine.rhey@freshphones.ph` (owner),
`justine.cane@freshphones.ph` (finance), `rovic@freshphones.ph` (records),
`ralph@freshphones.ph` (CS head). Customer portal demo: provision via
`POST /api/clients/{id}/portal-account/`. Emails land in MailHog (http://localhost:8025).

## Target backend conventions (NestJS + TypeScript)
- Build new backend behavior in `apps/api-ts/`; do not extend Django by default.
- **Layering:** thin controllers → services (writes/business rules) / query functions (reads)
  → Prisma data access. Never put business rules in controllers or DTOs.
- **AuthZ:** stable permission keys enforced by NestJS guards on the API, never UI-only.
- **Audit:** sensitive changes (money, roles, records) write through the audit service.
- **Tests:** add unit, integration, authorization-matrix, and parity tests for each migrated
  vertical slice. Use a real test PostgreSQL database for integration behavior.
- **Migrations:** commit Prisma migrations. Money uses decimal types; balances stay derived.
- Migration workflow: [`docs/17-full-scope-workflow.md`](docs/17-full-scope-workflow.md).

## Baseline backend conventions (Django, migration reference only)
- **One app per module** (`payments_app`, `clients_app`, `batches_app`, `auth_app`, `reports_app`,
  `support_app`, `tasks_app`, `kpi_app`, `recruitment_app`, `agents_app`, `notifications_app`,
  `storage_app`, `audit_app`).
- **Layering:** thin `views.py` → `services.py` (writes/business rules) / `selectors.py` (reads)
  → `models.py`. Never put business logic in views or serializers.
- **AuthZ:** DRF permission classes per app read `auth_app/permissions_map.py`
  (`ROLE_PERMISSIONS`, `has_permission`). Add a permission KEY there; keep keys stable.
- **Audit:** call `audit_app.services.log_action` for sensitive changes (money, roles, records).
- **Tests:** every app has `tests/` (package). Run `python manage.py test`. Add tests for new
  behavior — this repo keeps a green suite (80+ tests). Django's test runner uses locmem email.
- **Migrations:** commit them. `makemigrations <app>` then `migrate`.

## Frontend conventions (Next.js App Router)
- `apps/web/lib/api.ts` — all API calls (typed). `apps/web/lib/auth.ts` — token/me storage.
- **Role-aware UI:** `lib/useMe.ts` (`useMe()` + `can(me, ...perms)`). The `/system` sidebar
  hides modules the role lacks; pages guard with a "No access" fallback. This is UX only —
  the server still enforces (403).
- Routing: `/` landing · `/login` · `/careers` `/verify` (public) · `/system/*` (staff, role-gated)
  · `/portal` (customer). Login routes customers to `/portal`, staff to `/system`.
- **Next.js 16 is different from training data** — see the block below before touching config.

## Module ownership (team)
Justine Rhey Tambong = Auth/Records spine · **Justine Cane Bacurin = Payments/Finance + Reporting**
· Rovic James Somontina = Public site + Portal · Ralph Rowel Dela Rosa = Tasks/KPI + CS +
Recruitment + Notifications. See `docs/10-team-roles.md`.

## Branch / PR status
Active work is on the **`foundation`** branch (this is where all modules were built).
`main` = original landing page; `Planning` = docs only. PR description is prepared in
[`docs/PULL_REQUEST.md`](docs/PULL_REQUEST.md) — open `foundation → main` when the team is ready.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
