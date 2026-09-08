# 01 — Architecture

Faithful to Full Scope v6 §15. The client does not need to understand the internals; each
service has one clear purpose. See [20-v6-architecture-decision.md](20-v6-architecture-decision.md)
for the approved production baseline and outstanding deployment choices.

## Services & roles (§15)

| Service | Role | Why |
|---|---|---|
| **Cloudflare** | Domain + DNS management; optional basic security/routing | Directs the domain to the correct services |
| **VPS** | Hosts the Next.js public website, customer portal, and staff interface | Keeps frontend deployment under Fresh Phones PH control |
| **Railway** | Hosts the **main backend / API** and server-side business logic | Keeps sensitive operations & validation away from the browser |
| **Supabase** | PostgreSQL database, authentication, private file storage | Stores accounts, records & documents with access controls |
| **Resend** | Transactional email delivery | Sends account/status/task/support emails |
| **Redis** | Cross-instance change events, background-work queues, rate limiting, and short-lived cache data | Keeps live updates and retriable work independent of API instances |

> Redis is launch infrastructure for the v6 deployment. It is not a source of truth: if it is
> unavailable, the API and payment workflow continue, open screens refetch after reconnecting,
> and queued work retries when Redis recovers.

## System flow (§15)

```
Customer / Employee Browser
        │
        ▼
    VPS Next.js Web    ──►   Railway API   ──►   Supabase (DB + Auth + Private Storage)
                               │       │
                               │       └──► Redis (events + queues)
                               └──► Resend (email)
```

## Payment flow (§15) — the core workflow

```
Messenger / External Channel        (customer pays here — OUTSIDE the system)
        │
        ▼
Authorized Staff enters payment  ──►  Finance verifies  ──►  Supabase stores VERIFIED record
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
- **Supabase:** Postgres system of record + private file storage. Prisma owns the TypeScript
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

| Env | Web (VPS) | API (Railway) | DB (Supabase) | Purpose |
|---|---|---|---|---|
| Local | `next dev` | local api | Supabase local / dev project | development |
| Staging / UAT | VPS deployment | Railway staging | Supabase staging project | client acceptance testing (§21) |
| Production | VPS deployment | Railway prod | Supabase prod project | live |

Secrets live only in server environment variables (VPS/Railway/Supabase), never in the repo
or frontend bundle (§16 secrets management).
