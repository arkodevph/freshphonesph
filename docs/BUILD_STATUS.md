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

Earlier foundation verification: 13 API unit tests, 16 PostgreSQL integration tests and 4 web client tests.
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

The 2026-10-06 TypeScript records increment adds permission-gated client/batch editors and
record-specific change history. Editors retain captured versions and unsaved drafts, expose
issued-schedule locks, and require explicit discard before replacing a draft. History projects
approved fields from audited writes and supports bounded pagination. See [25-record-edit-history.md](25-record-edit-history.md).

The subsequent assignment increment adds versioned handler/agent batch assignment, assignment
filters, a minimal TypeScript agent directory and masked public verification. Handlers have
read-only access to assigned records only, including schedule reads, counts and SSE; reassignment
revokes access and refreshes the old handler without revealing removed record IDs. History shows
previous/new assignment names. The additive migration leaves existing batches unassigned. Local
verification passed 24 API unit tests, 29 PostgreSQL integration tests, 14 web tests, typechecks,
production builds and browser checks with synthetic responses. Combined unit/status/date filters
are now covered in [34-records-client-filters.md](34-records-client-filters.md). Legacy data import, production setup and named UAT remain open; see [26-batch-assignments.md](26-batch-assignments.md).

The Finance notification bell now shows current pending payments for Owner/Finance accounts,
with individual unread state, pagination, unread filtering and mark-all-as-read. Corrections
and proofs make alerts unread again; reviewed payments leave the queue. Read receipts do not
change money records, balances or customer notifications. Cross-instance invalidations are
private to each reviewer; payment links support same-page navigation and live payment refresh
preserves review drafts. See [27-finance-pending-alerts.md](27-finance-pending-alerts.md).
Finance alert verification passed 25 API unit tests, 33 PostgreSQL integration tests and
14 web tests (72 total), workspace typechecks and production builds, with no Prisma schema
drift. The additive read-state migration is applied locally; production and named UAT remain open.

The staff bell now also includes assignee-only task assignments and deadline reminders.
Assigned, due within 24 hours and overdue are one current reminder per active task; each
stage has independent read state and submission/completion removes the reminder. Tasks and
Finance filters share the total badge and selected-type mark-all. Exact task links open
authorized details even outside list filters/pages, and live changes preserve captured
report/review drafts. See [28-staff-task-alerts.md](28-staff-task-alerts.md).
Task alert verification passed 27 API unit tests, 38 PostgreSQL integration tests and
14 web tests (79 total), workspace typechecks and production builds. The fresh test database
has no Prisma schema drift, and the additive task read-state migration is applied locally.
Production browser checks with synthetic responses passed, including mobile/dark theme,
timer-driven reminder transitions, task drafts, revoked access and retry behavior.

Finance verification results now notify active Records employees and the eligible recorder,
with one immutable snapshot per recipient/payment decision. The Results filter and exact
payment/result links show saved notes alongside the current payment status; corrections
retain earlier decisions. Delivery is atomic with Finance verification and read state
remains private to each recipient. See [29-finance-result-alerts.md](29-finance-result-alerts.md).
Finance result verification passed 29 API unit tests, 43 PostgreSQL integration tests and 14 web
tests (86 total), workspace typechecks and production builds. Production browser checks
with synthetic responses passed, including filter changes during reads, historical notes,
exact links, recipient isolation, retry behavior and mobile/dark theme. The additive result
migration is applied locally; a fresh test database has no Prisma schema drift.

Staff email delivery now covers all seven task/Finance events with transactionally queued
recipients, scheduled deadline checks, current role/address/source validation and private
Finance links. Owner templates, enabled flags and timing are audited and versioned; delivery
history supports filters, 20-row pagination and bounded manual retries. Worker leases fence
stale completion, while captured provider payloads and idempotency keys prevent duplicate
sends within the delivery window. See [30-staff-email-delivery.md](30-staff-email-delivery.md).
Verification passed 32 API unit tests, 52 PostgreSQL integration tests and 14 web tests
(98 total), workspace typechecks and production builds. Browser checks with synthetic
responses passed filters, paging, pause/timing saves, draft/conflict preservation, delayed
retry/filter races, revoked access and mobile/dark layouts. The additive staff email
migration is applied to the local preview; the fresh test database has no Prisma schema drift.
No real provider email was sent during verification; inbox smoke tests and named UAT remain open.

Customer Service staff alerts now cover new cases, assignments and customer replies in the
shared bell's Support filter and three additional staff email templates. Unassigned cases
route to active CS heads, with active Owners as the fallback when no head is active;
assigned cases route to their current authorized assignee. Reassignment, staff responses
and resolution retire handled events. Case links update the already-open Support page,
preserve per-case reply/resolution drafts and reject stale resolution saves. See
[31-support-staff-alerts.md](31-support-staff-alerts.md).
Verification passed 33 API unit tests, 59 PostgreSQL integration tests and 14 web tests
(106 total), workspace typechecks and production builds. The additive Support migration
is applied to the local preview, and the fresh test database has no Prisma schema drift.
Browser checks with synthetic responses passed Support bell paging/read filters, exact links
while already on the page, status/page escape, delayed response races, retained drafts and
stale-version blocking, explicit replies, error recovery, revoked access and mobile/dark
layouts. Owner checks passed all ten email templates, Support pause and delivery filters,
retry/conflict preservation and permission changes. Real provider smoke tests remain open.

Owner account alerts now cover staff creation, actual role changes and sign-in activation or
deactivation in the Accounts bell filter and four additional staff email templates. Active
Owner recipients and immutable event snapshots are captured atomically with the account write,
audit and session revocation. Combined role/access changes create two events; unchanged updates
and customer account changes create none. Account links open current access outside directory
filters, preserve per-account drafts and block stale saves. See
[32-account-access-alerts.md](32-account-access-alerts.md).
Verification passed 34 API unit tests, 66 PostgreSQL integration tests and 14 web tests
(114 total), workspace typechecks and production builds. All twenty migrations apply to a
fresh test database without Prisma schema drift; the account migration is applied locally.
Browser checks with synthetic responses passed account paging/scoped reads, exact same-page
links, draft retention/conflicts, frozen writes, delayed responses, access-loss clearing,
late save responses, error recovery and mobile/dark/keyboard controls. Owner email checks
passed all fourteen templates, account pause/filtering, retries and retained drafts. Production
sender provisioning, real-inbox smoke tests, approved wording and named UAT remain open.

Staff email launch preparation now adds `staff-email:check`, which inspects email
configuration without provider requests or application writes. Explicit send mode sends one
synthetic message to a named test inbox, keeps private provider evidence and freezes the
payload/run ID for bounded retries. It does not drain application queues or record inbox
delivery/UAT as accepted. Eleven new mocked-provider/CLI checks pass; the API unit suite now
has 45 passing tests, and API typecheck/build pass. Sender provisioning instructions and the
fourteen-event Owner walkthrough are in [33-staff-email-launch.md](33-staff-email-launch.md).
The local check reports the missing Resend key, example sender and local web origin; the
Owner has confirmed the production service details are not available yet. Real provider
delivery and named Owner sign-off remain pending.
Production email setup and real-inbox testing are deferred at the Owner's request;
local setup tools and the prepared review checklist remain available.

Records and Clients now support combined unit/model, status, date and assignment filters
with PostgreSQL filtering, matching totals and 20-row pagination. Date ranges include both
endpoints and use batch start/client joined dates; client units fall back to the batch model
only when blank. Exact client links escape directory filters, while sequenced reads and
captured versions preserve drafts and reject stale release updates. See
[34-records-client-filters.md](34-records-client-filters.md). Verification passed 47 API unit
checks, 71 PostgreSQL integration tests and 17 web tests (135 total), workspace typechecks
and production builds. No new migration is needed; all twenty existing migrations apply to
the fresh test database without Prisma schema drift. Production-build browser checks with
synthetic responses pass filters/date validation, paging, same-page client/batch/document
links, draft retention, delayed reads, stale release blocking, failures/recovery, revoked
permissions, frozen explicit writes and mobile/dark/keyboard controls. Production deployment
and named UAT remain open.

The upstream operations/recruitment/landing commits `fd3ff14` and `05e2615` are
merged into the local feature branch while preserving all pre-merge local files.
Configured requirement revisions, public careers/private applications, internal
recruitment, task/Support aggregates, CSV/XLSX and report snapshots are integrated
with the existing Records, Finance, portal, tasks, Support and staff alerts. The
overlapping incoming migrations are preserved as reference SQL; one forward
reconciliation brings the active history to 21 migrations without replacing
existing tables. See [35-upstream-merge.md](35-upstream-merge.md).
Verification passes 47 API unit, 75 PostgreSQL integration and 19 web tests (141),
workspace typechecks, production builds and synthetic browser checks. A fresh
install and an existing-data upgrade have no Prisma drift; the backed-up local
preview upgrade preserves every row and field in all 29 existing application
tables. Reporting APIs are available, but the incoming commit supplies no Reports
page. Business policies, named UAT, production email and handover remain open.

| Module | Status | Key endpoints | UI |
|---|---|---|---|
| **M2 Auth / Users & Roles** | ✅ Built | Django `/api/employees/`; NestJS `/api/auth/*`, `/api/accounts` (list/create/detail/update, ACCOUNT_MANAGE) | `/login`, Owner-only `/system/team` |
| **M3 Paluwagan Records & Clients** | ✅ Built | `/api/batches/`, `/api/clients/` (+ auto-schedule), `/api/clients/{id}/schedule` | `/system/records`, `/system/clients` |
| **M4 Payments & Finance** | ✅ Built | `/api/payments/` (record/list/verify), `/api/clients/{id}/balance|statement`, `/api/payments/{id}/proof|confirmation` | `/system/payments` |
| **M5 Customer Portal** | ✅ Built | `/api/portal/summary|schedule|payments|support`, `/api/clients/{id}/portal-account` | `/portal` |
| **M6 Employee Tasks & KPI** | ✅ Built | `/api/tasks/` (+ submit → late flag), `/api/kpi/queue`, `/api/kpi/reviews` | `/system/tasks` |
| **M7 Reporting & Analytics** | ✅ Built | `/api/reports/dashboard|collections`, `/api/reports/payments/export` (CSV/XLSX) | dashboard cards |
| **M8 Customer Service** | ✅ Built | `/api/support/cases/`, `/api/portal/support/` | `/system/support`, portal |
| **M9 Recruitment & Agents** | ✅ Built | public `/api/careers|careers/apply`, `/api/agents/verify`; internal `/api/recruitment/*`, `/api/agents/` | `/careers`, `/verify`, `/system/recruitment` |
| **M10 Notifications** | 🟡 Partial | Customer delivery/read/templates; staff alert and task/Finance/Support/account email queues/settings | Portal notifications; shared Tasks/Finance/Results/Support/Accounts bell; fourteen Owner staff templates, timing and delivery controls |
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
- M10 approved wording/timing, production sender provisioning, inbox smoke tests and named UAT.
  TypeScript task reminders, Finance pending/results, staff email templates/timing/history/retries
  plus Support/account events and customer delivery/templates/read UI exist. Setup checks and
  the named Owner walkthrough are ready in [33-staff-email-launch.md](33-staff-email-launch.md).
- Task proof/attachments; report role-scoped field trimming; RLS hardening (optional, docs/15).
- Production provisioning (Supabase/Railway/Redis/VPS/Cloudflare/Resend) — client-owned accounts (§20).

## Test & run
`cd apps/api && source .venv/bin/activate && python manage.py test` → discovers 80 tests.
Run instructions: see [../AGENTS.md](../AGENTS.md). Dev accounts: [DEV_ACCOUNTS.md](DEV_ACCOUNTS.md).
