# 02 — Foundation & Setup

How the current landing-page repo becomes the foundation for the full system. This is the
**Month 2 – Core Foundation** groundwork (§17). Nothing here is built yet — this is the plan.

## Target monorepo layout

The existing flat Next.js app moves into `apps/web`; a backend service is added at `apps/api`;
shared code lives in `packages/`.

```
freshphonesph/
├─ apps/
│  ├─ web/                     # Next.js — public site (§4) + portal (§5) + staff dashboard  → Vercel
│  │  ├─ app/
│  │  │  ├─ (public)/          # landing (existing) + catalog, how-it-works, faqs,
│  │  │  │                     #   agent-verify, careers, requirements, login
│  │  │  ├─ (portal)/          # authenticated customer portal
│  │  │  └─ (staff)/           # authenticated employee dashboard (role-gated)
│  │  ├─ components/           # existing landing components + shared UI
│  │  └─ lib/                  # api client, auth session, feature flags
│  └─ api/                     # Django REST backend + business logic                       → Railway
│     ├─ config/               # Django settings (local+prod), urls, wsgi/asgi
│     └─ <domain>_app/         # one Django app per module (§4–§13):
│                              #   auth_app, clients_app, batches_app, payments_app,
│                              #   documents_app, tasks_app, kpi_app, reports_app,
│                              #   support_app, recruitment_app, agents_app,
│                              #   notifications_app, ai_app, audit_app, storage_app
├─ packages/                   # (JS-side shared packages, optional)
│  ├─ ui/                      # shared React components (Radix/shadcn)
│  └─ config/                  # eslint/tsconfig/tailwind presets
├─ docs/                       # this planning set
├─ docker-compose.yml          # local infra: Postgres + MinIO + MailHog (mirrors ARKO)
├─ turbo.json                  # JS build orchestration
├─ pnpm-workspace.yaml         # apps/*, packages/*
└─ package.json                # workspace root
```

> The Django schema lives in each app's `models.py`; migrations are the single source of truth
> for tables (no Prisma/Drizzle). See [09-tech-stack.md](09-tech-stack.md) for the full stack.

> Migrating the current app into `apps/web` is a mechanical move (files + import path
> `@/…` stays working via tsconfig paths). The landing page keeps rendering throughout.

## Foundation build order (Month 2)

Each step has a verification check (per CLAUDE.md goal-driven execution).

1. **Workspace init** → verify: `web` (Next.js) builds and the landing page still renders at
   `/`; `api` (Django) boots with `manage.py runserver`.
2. **Django project + Supabase Postgres** → verify: `migrate` applies against Supabase Postgres
   (Docker Postgres locally); admin loads.
3. **Auth (DRF SimpleJWT)** → verify: token obtain/refresh works; password reset flow; JWT
   accepted by a protected endpoint; email via Resend (MailHog locally).
4. **Role model + DRF permissions** (see [04-roles-access.md](04-roles-access.md)) → verify:
   the API rejects an under-privileged role on a protected endpoint (not just hidden in UI).
5. **(Optional) RLS on sensitive tables** → verify: policy blocks direct cross-tenant reads.
   Primary authz stays in DRF; RLS is defense-in-depth.
6. **Employee & customer account provisioning** → verify: an owner/HR can create an employee
   account with a role; a customer account maps to a client record.
7. **Batch & client records CRUD** (the core source of truth, §6) → verify: create batch,
   attach client, edit history logged to audit table.
8. **Audit logging** (DRF middleware/signals) → verify: sensitive changes (role, payment
   verification, record edits) write an audit entry with actor/action/before-after (§16).

Completing 1–8 = **Core Foundation acceptance** milestone (§20).

## Environment variables (`.env.example` to be added)

Server-only (never shipped to the browser):

```
# Django API (Railway)
DATABASE_URL=                 # Supabase Postgres connection string
SECRET_KEY=                   # Django secret
ALLOWED_HOSTS=
CORS_ALLOWED_ORIGINS=         # the Vercel web domain
# JWT (SimpleJWT) uses SECRET_KEY by default
# Supabase Storage (S3 API)
SUPABASE_S3_ENDPOINT=
SUPABASE_S3_ACCESS_KEY=
SUPABASE_S3_SECRET_KEY=
SUPABASE_S3_BUCKET=
# Email
RESEND_API_KEY=
# Web (Next.js, Vercel)
NEXT_PUBLIC_API_URL=          # web → Django API base URL
```

## Account ownership (§20)

Production **domain, hosting, database, email, and other third-party accounts should be owned
and paid by Fresh Phones PH**, with the developer given the access needed to build and
maintain. Provisioning these under client ownership is a Month-1 prerequisite.

## What is intentionally deferred

- Redis (add only if justified — §18.6).
- Payment gateway / checkout (out of scope — §19).
- Native mobile apps (V1 is a mobile-**responsive** web system — §19).
