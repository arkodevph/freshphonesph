# 01 — Architecture

Faithful to scope §15. The client does not need to understand the internals; each service has
one clear purpose.

## Services & roles (§15)

| Service | Role | Why |
|---|---|---|
| **Cloudflare** | Domain + DNS management; optional basic security/routing | Directs the domain to the correct services |
| **Vercel** | Hosts the **public website** and **portal frontend** interface | Fast delivery of the screens users interact with |
| **Railway** | Hosts the **main backend / API** and server-side business logic | Keeps sensitive operations & validation away from the browser |
| **Supabase** | PostgreSQL database, authentication, private file storage | Stores accounts, records & documents with access controls |
| **Resend** | Transactional email delivery | Sends account/status/task/support emails |
| **Redis** | *Optional, later* — caching, queues, rate limiting, temp job state | Added only when real load/use-cases justify it |

> Redis is **not** in the launch stack. Do not assume it as part of the production stack — add
> only if queue/cache/rate-limiting needs justify it (§18.6).

## System flow (§15)

```
Customer / Employee Browser
        │
        ▼
   Vercel Web Portal   ──►   Railway API   ──►   Supabase (DB + Auth + Private Storage)
                                  │
                                  └──►   Resend (email)
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

The scope deliberately splits Vercel (frontend) from Railway (backend) so that **permission
checks, financial verification, and validation run on the server**, never "only by hiding
buttons" (§16). Authorization is enforced in the NestJS API through permission guards;
database policies are optional defense-in-depth, not the primary gate.

- **Frontend (Vercel):** rendering, session UX, calling the API. No trusted business rules.
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

This repo is the single source. It becomes a **monorepo** (see
[02-foundation-setup.md](02-foundation-setup.md)) with the current landing page moved under
the web app. The target has two TypeScript deployables: Vercel web (Next.js) and Railway API
(NestJS). The existing Django API stays in place only during the controlled migration.

## Environments

| Env | Web (Vercel) | API (Railway) | DB (Supabase) | Purpose |
|---|---|---|---|---|
| Local | `next dev` | local api | Supabase local / dev project | development |
| Staging / UAT | Vercel preview | Railway staging | Supabase staging project | client acceptance testing (§21) |
| Production | Vercel prod | Railway prod | Supabase prod project | live |

Secrets live only in server environment variables (Vercel/Railway/Supabase), never in the repo
or frontend bundle (§16 secrets management).
