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
│  └─ api/                     # backend/API + business logic                              → Railway
│     └─ src/
│        └─ modules/           # one folder per functional module (§4–§13)
│           ├─ auth/  batches/  clients/  payments/  documents/  tasks/  kpi/
│           ├─ reports/  support/  recruitment/  agents/  notifications/  ai/  audit/
├─ packages/
│  ├─ db/                      # Supabase schema, migrations, generated types, RLS policies
│  ├─ shared/                  # shared TypeScript types + zod validation (contract between web & api)
│  └─ config/                  # eslint/tsconfig/tailwind presets
├─ supabase/                   # local Supabase config + migrations
├─ docs/                       # this planning set
├─ turbo.json                  # or pnpm workspaces build orchestration
└─ package.json                # workspace root
```

> Migrating the current app into `apps/web` is a mechanical move (files + import path
> `@/…` stays working via tsconfig paths). The landing page keeps rendering throughout.

## Foundation build order (Month 2)

Each step has a verification check (per CLAUDE.md goal-driven execution).

1. **Workspace init** → verify: `web` and `api` both build from the repo root; landing page
   still renders at `/`.
2. **Supabase project + `packages/db`** → verify: migrations apply; generated types compile.
3. **Auth (Supabase Auth)** → verify: sign-up/sign-in/password-reset flows work; sessions
   persist; email via Resend.
4. **Role model + RBAC guard** (see [04-roles-access.md](04-roles-access.md)) → verify:
   server rejects an under-privileged role on a protected route (not just hidden in UI).
5. **RLS policies** on core tables → verify: a customer can read only their own rows; a
   handler sees only assigned records.
6. **Employee & customer account provisioning** → verify: an owner/HR can create an employee
   account with a role; a customer account maps to a client record.
7. **Batch & client records CRUD** (the core source of truth, §6) → verify: create batch,
   attach client, edit history logged to audit table.
8. **Audit logging middleware** → verify: sensitive changes (role, payment verification,
   record edits) write an audit entry with actor/action/before-after (§16).

Completing 1–8 = **Core Foundation acceptance** milestone (§20).

## Environment variables (`.env.example` to be added)

Server-only (never shipped to the browser):

```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=            # web (public, RLS-guarded)
SUPABASE_SERVICE_ROLE_KEY=    # api only — privileged, server env only
# Resend
RESEND_API_KEY=
# API
API_BASE_URL=
JWT_/SESSION_SECRET=
# App
NEXT_PUBLIC_API_URL=          # web → api
```

## Account ownership (§20)

Production **domain, hosting, database, email, and other third-party accounts should be owned
and paid by Fresh Phones PH**, with the developer given the access needed to build and
maintain. Provisioning these under client ownership is a Month-1 prerequisite.

## What is intentionally deferred

- Redis (add only if justified — §18.6).
- Payment gateway / checkout (out of scope — §19).
- Native mobile apps (V1 is a mobile-**responsive** web system — §19).
