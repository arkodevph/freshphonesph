# Build Status

Implementation status, including the Django baseline originally built on `foundation` and the
TypeScript work now moving through `staging`. The planning docs (00–16) describe the
*intended* system; this file describes what was built in the Django baseline. The suite contains
**80 tests** and was historically green; rerun it against a working local PostgreSQL service
before treating that result as current.

> **TypeScript migration:** This page records the existing Django baseline. The active target is
> a NestJS TypeScript API. Track migration gates in
> [17-full-scope-workflow.md](17-full-scope-workflow.md) and row-level coverage in
> [18-scope-traceability-matrix.md](18-scope-traceability-matrix.md).

## TypeScript foundation

The parallel `apps/api-ts` service now provides the first migration slice:

- NestJS API startup, configuration validation, PostgreSQL health check, and Prisma migrations.
- Access and refresh sessions in secure HTTP-only cookies, password reset, replay protection,
  account deactivation, and shared database-backed login throttling.
- Server-enforced role permissions for accounts, batches, clients, and audit reads.
- Batch and client CRUD with strict shared Zod contracts, optimistic concurrency, transactionally
  written audit entries, and customer record isolation.
- Role-filtered server-sent events backed by a PostgreSQL event cursor, including reconnect
  recovery and cross-instance delivery without Redis.
- External payment claims, Finance-only decisions, verified-only derived balances, duplicate
  reference warnings, immutable reviewed records, operational statements/confirmations, and
  customer-isolated verified history.
- Assistive receipt OCR for GCash, Maya, bank-transfer and cash templates. Images are processed
  transiently, extracted fields remain editable, and OCR never records or verifies money.
- Optional receipt proofs use randomized private keys outside the web tree. Upload and read are
  permission-scoped, customer access requires a verified own payment, and attachment is audited.
- Permission-gated reporting provides date/batch-filtered verified and pending dashboard totals
  plus a privacy-trimmed payment CSV that omits customer identity and payment references.

The records increment now adds decimal batch terms, atomic enrollment/schedule generation,
locked issued terms, idempotent legacy schedule issuance, and search/pagination. An opt-in
TypeScript API mode connects the existing login, Records, Clients, Owner user management,
dashboard and customer membership/schedule screens, with cookie refresh and live invalidation.

Current verification: 13 API unit tests, 16 PostgreSQL integration tests and 4 web client tests.
Next.js/NestJS typechecks and the production workspace build pass. Browser checks cover
the Owner account directory and creation dialog in light/dark/mobile layouts, plus enrollment,
schedule totals, live draft preservation, customer membership and mobile width.
The payments increment adds stale-response-safe client/receipt search, explicit unknown-date
review, and server-side payment search/date/status pagination plus privacy-trimmed filtered CSV.
The integration suite exercises both client search and payment pagination with 1,000 rows.
Owner user management adds server-side name/email search, role/status filters, bounded pagination,
audited role and activation changes, session revocation, and self-lockout protection.
See [19-records-typescript-preview.md](19-records-typescript-preview.md) for setup, evidence,
the fixed-day cadence policy, and remaining Gate 2 work. Django is still the default backend.

The 2026-09-25 TypeScript customer increment adds a responsive portal with release status,
customer document submission and Records review, support case tracking, and in-app notifications.
It uses audited database writes and private local files; customer-to-Records and cross-customer
authorization flows pass PostgreSQL integration tests. The document policy is in
[22-customer-portal-policy.md](22-customer-portal-policy.md). Customer email delivery,
Owner-managed templates, reminders and a private S3-compatible storage adapter are now
implemented and locally tested. Client-owned production services, privacy/retention decisions,
and named UAT remain open; see [23-customer-launch-uat.md](23-customer-launch-uat.md).

## Module status

| Module | Status | Key endpoints | UI |
|---|---|---|---|
| **M2 Auth / Users & Roles** | ✅ Built | Django `/api/employees/`; NestJS `/api/auth/*`, `/api/accounts` (list/create/update, ACCOUNT_MANAGE) | `/login`, Owner-only `/system/team` |
| **M3 Paluwagan Records & Clients** | ✅ Built | `/api/batches/`, `/api/clients/` (+ auto-schedule), `/api/clients/{id}/schedule` | `/system/records`, `/system/clients` |
| **M4 Payments & Finance** | ✅ Built | `/api/payments/` (record/list/verify), `/api/clients/{id}/balance|statement`, `/api/payments/{id}/proof|confirmation` | `/system/payments` |
| **M5 Customer Portal** | ✅ Built | `/api/portal/summary|schedule|payments|support`, `/api/clients/{id}/portal-account` | `/portal` |
| **M6 Employee Tasks & KPI** | ✅ Built | `/api/tasks/` (+ submit → late flag), `/api/kpi/queue`, `/api/kpi/reviews` | `/system/tasks` |
| **M7 Reporting & Analytics** | ✅ Built | `/api/reports/dashboard|collections`, `/api/reports/payments/export` (CSV/XLSX) | dashboard cards |
| **M8 Customer Service** | ✅ Built | `/api/support/cases/`, `/api/portal/support/` | `/system/support`, portal |
| **M9 Recruitment & Agents** | ✅ Built | public `/api/careers|careers/apply`, `/api/agents/verify`; internal `/api/recruitment/*`, `/api/agents/` | `/careers`, `/verify`, `/system/recruitment` |
| **M10 Notifications** | 🟡 Hook only | in-app + email fired on payment verify (`notify_payment_verified`) | — |
| **M1 Public Website** | 🟡 Partial | landing page + Careers + Verify pages | `/`, `/careers`, `/verify` |
| **M11 AI Assistant** | ⬜ Not started | — | — |

## What's real vs. contract-skeleton
Every module has **working, tested code**. A few models started as minimal **contract skeletons**
(owned by another teammate) and were fleshed out as needed:
- `auth_app` (Tambong/M2), `batches_app`/`clients_app` (Tambong/M3) — now have full CRUD + auth.
- `notifications_app` (Dela Rosa/M10) — model + the verify hook; no full delivery UI yet.
- `tasks_app`/`kpi_app`, `support_app`, `recruitment_app`, `agents_app` (Dela Rosa) — built out here.
- Teammates should review/extend their owned apps; field & permission names are the agreed contract.

## Cross-cutting, done
- **RBAC:** `auth_app/permissions_map.py` — 12 permission keys, per-role sets, server-enforced.
- **Role-aware UI:** sidebar + page guards via `/api/auth/me` (`lib/useMe`).
- **Audit trail:** `audit_app` — money verification, role changes, record edits.
- **Private files:** `storage_app` — Supabase Storage/MinIO, presigned GET, private bucket.
- **Email:** MailHog locally, Resend/SMTP in prod.

## Known follow-ups
- M11 AI assistant (assistive-only, guardrailed — see docs/05 M11).
- M1 public catalog / how-it-works / FAQ content beyond the current landing sections.
- M10 full notification center (staff/finance alerts, templates, read UI, deadline reminders).
- Task proof/attachments; report role-scoped field trimming; RLS hardening (optional, docs/15).
- Production provisioning (Supabase/Railway/Redis/VPS/Cloudflare/Resend) — client-owned accounts (§20).

## Test & run
`cd apps/api && source .venv/bin/activate && python manage.py test` → discovers 80 tests.
Run instructions: see [../AGENTS.md](../AGENTS.md). Dev accounts: [DEV_ACCOUNTS.md](DEV_ACCOUNTS.md).
