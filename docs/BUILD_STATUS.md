# Build Status

Current implementation state of the `foundation` branch. The planning docs (00–16) describe the
*intended* system; this file describes what was built in the Django baseline. The suite contains
**80 tests** and was historically green; rerun it against a working local PostgreSQL service
before treating that result as current.

> **TypeScript migration:** This page records the existing Django baseline. The active target is
> a NestJS TypeScript API. Track migration gates in
> [17-full-scope-workflow.md](17-full-scope-workflow.md) and row-level coverage in
> [18-scope-traceability-matrix.md](18-scope-traceability-matrix.md).

## Module status

| Module | Status | Key endpoints | UI |
|---|---|---|---|
| **M2 Auth / Users & Roles** | ✅ Built | `/api/auth/token`, `/api/auth/me`, `/api/employees/` (CRUD, ROLE_ASSIGN), `/api/staff/` | `/login`, `/system/team` |
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
- Production provisioning (Supabase/Railway/Vercel/Cloudflare/Resend) — client-owned accounts (§20).

## Test & run
`cd apps/api && source .venv/bin/activate && python manage.py test` → discovers 80 tests.
Run instructions: see [../AGENTS.md](../AGENTS.md). Dev accounts: [DEV_ACCOUNTS.md](DEV_ACCOUNTS.md).
