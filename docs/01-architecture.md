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
buttons" (§16). Authorization is enforced in the Django REST API (DRF permissions); Supabase
Row-Level Security is optional defense-in-depth, not the primary gate.

- **Frontend (Vercel):** rendering, session UX, calling the API. No trusted business rules.
- **Backend (Railway):** authorization, payment verification, balance calculation, audit
  logging, file access brokering, notifications, report generation.
- **Supabase:** Postgres system of record + private file storage. Django owns the schema
  (migrations) and connects with a privileged role; the browser never gets DB credentials.

## Backend framework (DECIDED — see [09-tech-stack.md](09-tech-stack.md))

**Django + Django REST Framework + SimpleJWT** (Python 3.12), adopted from the internal ARKO
system. Django brings its own ORM, migrations, and JWT auth, so no separate ORM (Prisma/Drizzle)
or Supabase Auth is used. Deployed on Railway via gunicorn. The frontend is a Next.js app that
calls this REST API over HTTPS. Full rationale and library list in
[09-tech-stack.md](09-tech-stack.md).

## Repository shape

This repo is the single source. It becomes a **monorepo** (see
[02-foundation-setup.md](02-foundation-setup.md)) with the current landing page moved under
the web app. Two deployables: Vercel web (Next.js) and Railway api (Django).

## Environments

| Env | Web (Vercel) | API (Railway) | DB (Supabase) | Purpose |
|---|---|---|---|---|
| Local | `next dev` | local api | Supabase local / dev project | development |
| Staging / UAT | Vercel preview | Railway staging | Supabase staging project | client acceptance testing (§21) |
| Production | Vercel prod | Railway prod | Supabase prod project | live |

Secrets live only in server environment variables (Vercel/Railway/Supabase), never in the repo
or frontend bundle (§16 secrets management).
