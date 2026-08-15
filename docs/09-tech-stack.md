# 09 — Tech Stack (Decided)

**Decision:** adopt the stack used by the internal **ARKO** system — **Django REST Framework**
backend + **React/TypeScript/Tailwind** frontend — mapped onto this project's PDF
infrastructure (§15: Vercel · Railway · Supabase · Resend · Cloudflare).

This supersedes the "backend framework (dev recommendation)" placeholder in
[01-architecture.md](01-architecture.md). Because Django ships its own ORM and auth, the earlier
open questions (Fastify vs NestJS, Drizzle vs Prisma, Supabase Auth) are now settled by this
choice.

## Frontend — `apps/web` (Vercel)

| Concern | Pick | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router) | Already in repo; also the public landing page |
| Language | **TypeScript** | |
| UI runtime | **React 19** | |
| Styling | **Tailwind CSS v4** | Already in repo (same as ARKO) |
| UI primitives | **Radix UI** (+ shadcn-style components) | Same as ARKO (`@radix-ui/*`) |
| Class utils | `clsx` + `tailwind-merge` + `class-variance-authority` | Same as ARKO |
| Server-state | **TanStack Query** | Same as ARKO — talks to the Django API |
| Validation | **Zod** | Shared shape with backend serializers |
| Icons | **Phosphor** (existing) / lucide-react | Keep existing landing icons |
| Auth (client) | JWT from Django, stored in httpOnly cookie; auth context/provider | Mirrors ARKO's `lib/` API-client + auth pattern |
| File upload | Supabase Storage via **S3 presigned URLs** (`@aws-sdk/client-s3`, `s3-request-presigner`) | Same as ARKO prod |
| Email | **Resend** SDK (where sent from the edge) | Primary email is backend-side |

> The frontend is a **Next.js app that calls the Django REST API** over HTTPS. It does not hold
> DB credentials or business rules (§16). ARKO's v1 uses a Vite SPA; we keep **Next.js** here
> because it is already the repo base and hosts the public site — the React/TS/Tailwind/Radix
> layer is identical.

## Backend — `apps/api` (Railway)

| Concern | Pick | Notes |
|---|---|---|
| Language | **Python 3.12** | Same as ARKO |
| Framework | **Django 6** | Same as ARKO |
| API layer | **Django REST Framework (DRF)** | Same as ARKO |
| Auth | **DRF SimpleJWT** (JWT access/refresh) | Same as ARKO — replaces Supabase Auth |
| ORM & migrations | **Django ORM** + Django migrations | Built-in — replaces Prisma/Drizzle |
| Authorization | **DRF permissions + per-viewset role checks** (server-side) | Enforced in the API, not the UI (§16) |
| DB driver | **psycopg** → Supabase Postgres | §15 |
| File storage | **django-storages + boto3** → Supabase Storage (S3 API) | §15; MinIO for local dev |
| CORS | **django-cors-headers** | `CORS_ALLOWED_ORIGINS` for the Vercel domain |
| Config | **django-environ** / env vars | Secrets in server env only (§16) |
| Server | **gunicorn** (uvicorn worker if async) | Runs on Railway |
| API docs | **drf-spectacular** (OpenAPI) — optional | Generates typed client if wanted |
| Email | **Resend** (SMTP/API) | §15; MailHog for local dev |
| Background jobs | none at launch | Redis optional later (§18.6) |

### Django app layout (mirrors ARKO's per-domain apps)

One Django app per functional module from [05-modules.md](05-modules.md):

```
apps/api/
  config/                 # settings (local + production), urls, wsgi/asgi
  auth_app/               # accounts, JWT, role assignment (§3)
  clients_app/            # clients + customer accounts (§5, §6)
  batches_app/            # paluwagan batches & records (§6)
  payments_app/           # payment recording + Finance verification (§7)
  documents_app/          # private document storage (§6)
  tasks_app/              # tasks, deadlines, on-time/late flag (§8)
  kpi_app/                # KPI review queue + manual evaluation (§8)
  reports_app/            # reporting & analytics (§9)
  support_app/            # customer service cases (§10)
  recruitment_app/        # careers + applicants (§11)
  agents_app/             # agent verification (public-limited) (§11)
  notifications_app/      # in-app + email notifications (§12)
  ai_app/                 # assistive AI layer (§13) — added last
  audit_app/              # cross-cutting audit log (§16)
  storage_app/            # S3/Supabase presign helpers
```

## Database & storage

- **Postgres:** Supabase Postgres (production), Docker Postgres (local) — same pattern as ARKO.
- **Schema owner:** managed by **Django migrations** (single source of truth for tables).
- **Row-Level Security:** optional defense-in-depth. Primary authorization is DRF (server-side);
  Django connects with a privileged role, so RLS is not the main gate here (differs from a
  Supabase-Auth design). Enable RLS on the most sensitive tables if desired.
- **Storage:** Supabase Storage via S3 API; private buckets; access via short-lived presigned
  URLs brokered by the backend (§16 private file storage).

## Hosting & infra (per PDF §15)

| Service | Role |
|---|---|
| **Vercel** | Next.js frontend (public site + portal) |
| **Railway** | Django REST API (gunicorn) |
| **Supabase** | Postgres + Storage |
| **Resend** | Transactional email |
| **Cloudflare** | Domain + DNS |
| **Redis** | Optional, later only |

> Note vs ARKO: ARKO runs Django as **Vercel serverless functions**; here the backend runs on
> **Railway** to match the signed PDF architecture. Same framework, different host.

## Monorepo tooling (same as ARKO)

- **pnpm** workspaces + **Turborepo** (JS side)
- **Prettier** (+ ESLint / `eslint-config-next`) for TS; **ruff/black** for Python
- Node **>= 20**, Python **3.12**
- Local infra via **docker-compose** (Postgres + MinIO + MailHog), mirroring ARKO

## Testing

| Layer | Tool |
|---|---|
| Frontend | Jest + React Testing Library (ARKO uses Jest) |
| Backend | Django `test` / pytest-django + DRF test client |
| E2E | Playwright (optional) |

## What this settles from earlier docs
- Backend framework question in `01-architecture.md` → **Django + DRF** (not Fastify/NestJS).
- Data-layer question → **Django ORM** (not Drizzle/Prisma/raw Supabase).
- Auth → **DRF SimpleJWT** (not Supabase Auth). RLS demoted to optional hardening.
- `apps/api` is a **Python/Django** service, not a TypeScript service.
