# 01 — Architecture

Based on Full Scope v6 §15 and the 2026-10-08 Neon/Better Auth documentation revision. The client does not need to understand the internals; each
service has one clear purpose. See [20-v6-architecture-decision.md](20-v6-architecture-decision.md)
for the approved production baseline and outstanding deployment choices.

## Services & roles (§15)

| Service | Role | Why |
|---|---|---|
| **Cloudflare** | Domain + DNS management; optional basic security/routing | Directs the domain to the correct services |
| **VPS** | Hosts the Next.js public website, customer portal, and staff interface | Keeps frontend deployment under Fresh Phones PH control |
| **Railway** | Hosts the **main backend / API** and server-side business logic | Keeps sensitive operations & validation away from the browser |
| **Neon** | PostgreSQL database | Production system of record; migration pending |
| **Better Auth** | Application authentication framework | Local credential/session/MFA integration; NestJS owns business authorization |
| **Private object storage** | S3-compatible provider pending | Stores private documents behind API authorization |
| **Resend** | Transactional email delivery | Sends account/status/task/support emails |
| **Redis** | Streams and BullMQ | Distributes committed refresh events to API replicas; separate workers deliver notifications and clean up authorized files |

> Better Auth/MFA and Redis Streams/BullMQ are implemented locally. Neon, production Redis,
> private storage and production deployment remain pending. See [53-redis-events-workers.md](53-redis-events-workers.md).

## System flow (§15)

```
Customer / Employee Browser
        │
        ▼
    VPS Next.js Web    ──►   Railway API   ──►   Neon PostgreSQL
                               │       │
                               │       └──► Private object storage (provider pending)
                               └──► Resend (email)
```

## Payment flow (§15) — the core workflow

```
Messenger / External Channel        (customer pays here — OUTSIDE the system)
        │
        ▼
Authorized Staff enters payment  ──►  Finance verifies  ──►  PostgreSQL stores VERIFIED record
                                                                        │
                                                                        ▼
                                                   Customer Portal shows updated history/balance
```

Only **Finance-verified** payments change a customer's amount-paid and remaining balance.
Unverified entries stay pending and do not move balances. See the Payment module in
[05-modules.md](05-modules.md).

## Why a separate backend (not all in Next.js)

The scope deliberately splits the VPS-hosted frontend from Railway (backend) so that **permission
checks, financial verification, and validation run on the server**, never "only by hiding
buttons" (§16). Authorization is enforced in the NestJS API through permission guards;
database policies are optional defense-in-depth, not the primary gate.

- **Frontend (VPS):** rendering, session UX, calling the API. No trusted business rules.
- **Backend (Railway):** NestJS authorization, payment verification, balance calculation, audit
  logging, file access brokering, notifications, report generation.
- **Neon:** PostgreSQL system of record. Private object storage is a separate service. Prisma owns the TypeScript
  target schema and migrations; the browser never gets DB credentials.

## Backend framework (DECIDED - see [09-tech-stack.md](09-tech-stack.md))

**NestJS + Prisma + PostgreSQL**, written in TypeScript and deployed as a separate Railway
service. The frontend is a Next.js TypeScript app that calls the REST API over HTTPS. During
migration, the current Django API remains the behavioral baseline until each NestJS slice passes
parity and cutover checks. Full details are in [09-tech-stack.md](09-tech-stack.md).

## Repository shape

This repo is the single source. It is a **monorepo** (see
[02-foundation-setup.md](02-foundation-setup.md)) with the current landing page moved under
the web app. The target has two TypeScript deployables: VPS web (Next.js) and Railway API
(NestJS). The existing Django API stays in place only during the controlled migration.

## Environments

| Env | Web (VPS) | API (Railway) | DB | Purpose |
|---|---|---|---|---|
| Local | `next dev` | local api | Local Docker PostgreSQL | development |
| Staging / UAT | VPS deployment | Railway staging | Isolated Neon staging database (planned) | client acceptance testing (§21) |
| Production | VPS deployment | Railway prod | Neon production database (planned) | live |

Secrets live only in server environment variables (VPS/Railway/Neon/storage provider), never in the repo
or frontend bundle (§16 secrets management).
