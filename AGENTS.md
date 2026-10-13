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
5. **Server-side authz:** permissions are enforced by NestJS guards in the API, never UI-only. The role-aware UI is UX on
   top of that.
6. **Secrets** live only in env vars (`apps/api-ts/.env`, `apps/web/.env.local`) — never committed.

## Monorepo layout
```
apps/web/    Next.js 16 + React 19 + Tailwind v4 (client-owned VPS) — landing, /system staff, /portal customer
apps/api-ts/ NestJS + Prisma + TypeScript (Railway) — one module per business domain
packages/    (reserved for shared UI/config)
docs/        planning (00–16) + BUILD_STATUS + PULL_REQUEST
docker-compose.yml   local infra: Postgres:5435 + Redis:6380 + MinIO + MailHog
```

## Stack (decided — see docs/09-tech-stack.md)
- **Backend:** NestJS · TypeScript · Prisma · Neon PostgreSQL · Better Auth ·
  private S3-compatible object storage (production provider pending; MinIO locally) · Resend ·
  Redis Streams and BullMQ background workers (reaffirmed by the user on 2026-10-09).
  Broader Redis abuse limits with PostgreSQL fallback are implemented locally (scope #13).
  Production provisioning, proxy setup and quota/load acceptance remain open. The v6 decisions and pending deployment choices are in
  [`docs/20-v6-architecture-decision.md`](docs/20-v6-architecture-decision.md).
- **Frontend:** Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · Radix/Phosphor.
- **Tooling:** pnpm workspaces + Turborepo · TypeScript · Node.js test runner.
  Receipt OCR uses a separate Python/Tesseract helper in `apps/api-ts/scripts/`.

## Run it locally
```bash
# 1) infra
docker compose up -d                      # Postgres:5435, Redis:6380, MinIO:9000/9001, MailHog:1025/8025

# 2) install dependencies and prepare the API
pnpm install
cp apps/api-ts/.env.example apps/api-ts/.env  # configure local connection and generated auth secret
pnpm db:generate
pnpm db:migrate

# 3) start services in separate terminals
pnpm --filter @fresh/api-ts dev           # http://localhost:4100
pnpm --filter @fresh/api-ts worker:dev
pnpm --filter @fresh/web dev              # http://localhost:3000
```
Create local test accounts with a private seed script or through the application; keep
account details outside Git. Provision employee and linked customer accounts through `POST /api/accounts`.


For the active TypeScript preview, run `pnpm --filter @fresh/api-ts dev` and
`pnpm --filter @fresh/api-ts worker:dev` in separate terminals with the same database,
Redis namespace and private storage configuration. See [docs/53-redis-events-workers.md](docs/53-redis-events-workers.md).

## Backend conventions (NestJS + TypeScript)
- Build backend behavior in `apps/api-ts/`. Prisma owns the database schema and migrations.
- **Layering:** thin controllers → services (writes/business rules) / query functions (reads)
  → Prisma data access. Never put business rules in controllers or DTOs.
- **AuthZ:** stable permission keys enforced by NestJS guards on the API, never UI-only.
- **Audit:** sensitive changes (money, roles, records) write through the audit service.
- **Tests:** add unit, integration, authorization-matrix, and contract tests for each
  vertical slice. Use a real test PostgreSQL database for integration behavior.
- **Migrations:** commit Prisma migrations. Money uses decimal types; balances stay derived.
- **SQL performance:** match indexes to actual WHERE/JOIN/ORDER BY predicates and verify
  representative EXPLAIN plans. Keep row filters before aggregation and aggregate filters
  in HAVING; preserve lifetime balances and global duplicate evidence. Follow
  [docs/55-sql-execution-index-design.md](docs/55-sql-execution-index-design.md) when changing queries or indexes.
- Migration workflow: [`docs/17-full-scope-workflow.md`](docs/17-full-scope-workflow.md).

## Frontend conventions (Next.js App Router)
- `apps/web/lib/api.ts` — all API calls (typed). `apps/web/lib/auth.ts` — HTTP-only sessions and cached display identity.
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
`main` is the production release branch and remains the GitHub default. `staging` is the shared
integration branch. Develop on short-lived `feature/<scope>` or `fix/<issue>` branches, merge
reviewed work into `staging`, and promote tested `staging` changes to `main` by pull request.
See [`docs/24-branch-flow.md`](docs/24-branch-flow.md). The older `foundation` branch remains
as historical migration work; do not use it as the active integration branch.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
