# 02 — Foundation & Setup

How the repository establishes the TypeScript target foundation. This is the
**Month 2 - Core Foundation** groundwork (§17). A Django baseline already exists; the steps
below create its NestJS replacement without removing verified behavior early.

## Target monorepo layout

The Next.js application remains in `apps/web`. The TypeScript backend is built beside the
current Django service under `apps/api-ts` until cutover; shared contracts may live in
`packages/` when they remove proven duplication.

```
freshphonesph/
├─ apps/
│  ├─ web/                     # Next.js — public site (§4) + portal (§5) + staff dashboard  → client VPS
│  │  ├─ app/
│  │  │  ├─ (public)/          # landing (existing) + catalog, how-it-works, faqs,
│  │  │  │                     #   agent-verify, careers, requirements, login
│  │  │  ├─ (portal)/          # authenticated customer portal
│  │  │  └─ (staff)/           # authenticated employee dashboard (role-gated)
│  │  ├─ components/           # existing landing components + shared UI
│  │  └─ lib/                  # api client, auth session, feature flags
│  ├─ api/                     # Current Django behavioral baseline during migration
│  └─ api-ts/                  # NestJS TypeScript target API                               → Railway
│     ├─ src/                  # Domain modules, guards, services, controllers
│     └─ prisma/               # Target schema, migrations, seed data
├─ packages/                   # (JS-side shared packages, optional)
│  ├─ ui/                      # shared React components (Radix/shadcn)
│  └─ config/                  # eslint/tsconfig/tailwind presets
├─ docs/                       # this planning set
├─ docker-compose.yml          # local infra: Postgres + MinIO + MailHog (mirrors ARKO)
├─ turbo.json                  # JS build orchestration
├─ pnpm-workspace.yaml         # apps/*, packages/*
└─ package.json                # workspace root
```

> Prisma migrations are the target schema source of truth. Django migrations remain historical
> migration input until TypeScript cutover. See [09-tech-stack.md](09-tech-stack.md).

> Migrating the current app into `apps/web` is a mechanical move (files + import path
> `@/…` stays working via tsconfig paths). The landing page keeps rendering throughout.

## Foundation build order (Month 2)

Each step has a verification check (per CLAUDE.md goal-driven execution).

1. **Workspace init** → verify: `web` (Next.js) builds and the landing page still renders at
   `/`; `api-ts` health check boots under NestJS.
2. **NestJS + Prisma + Neon PostgreSQL** → verify: Prisma migrations apply to a clean
   PostgreSQL database and the API health check reads it.
3. **Better Auth integration (planned)** → verify: sessions, recovery, revocation and MFA
   preserve account/role behavior. Current cookie auth remains until parity passes.
4. **Role model + NestJS permission guards** (see [04-roles-access.md](04-roles-access.md)) → verify:
   the API rejects an under-privileged role on a protected endpoint (not just hidden in UI).
5. **Optional database policies on sensitive tables** → verify: policy blocks unauthorized
   direct reads. Primary authorization stays in NestJS guards.
6. **Employee & customer account provisioning** → verify: an owner/HR can create an employee
   account with a role; a customer account maps to a client record.
7. **Batch & client records CRUD** (the core source of truth, §6) → verify: create batch,
   attach client, edit history logged to audit table.
8. **Audit logging** (NestJS service/interceptors where appropriate) → verify: sensitive changes (role, payment
   verification, record edits) write an audit entry with actor/action/before-after (§16).

Completing 1–8 = **Core Foundation acceptance** milestone (§20).

## Environment variables

Copy `apps/api-ts/.env.example` to `apps/api-ts/.env` for local development.

Server-only (never shipped to the browser):

```
# NestJS API (Railway)
DATABASE_URL=                 # Current PostgreSQL connection; Neon planned for production
JWT_SECRET=                   # current cookie/JWT implementation; retain until auth cutover
WEB_ORIGIN=                   # exact VPS-hosted web origin
RESEND_API_KEY=
EMAIL_FROM=
```

The existing web app continues to use the Django API until a NestJS vertical slice passes its
parity and reconciliation gate. This prevents dual writes and preserves the current interface
during migration.

For the opt-in records and customer-schedule preview using the existing interface, see
[19-records-typescript-preview.md](19-records-typescript-preview.md).

## Account ownership (§20)

Production **domain, hosting, database, email, and other third-party accounts should be owned
and paid by Fresh Phones PH**, with the developer given the access needed to build and
maintain. Provisioning these under client ownership is a Month-1 prerequisite.

## What is intentionally deferred

- Production events/workers/rate limits: decision pending; Redis no longer mandatory.
- Better Auth/Neon cutover is planned, not implemented by the documentation update.
- Payment gateway / checkout (out of scope — §19).
- Native mobile apps (V1 is a mobile-**responsive** web system — §19).
