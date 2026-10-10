# Build Status

> **2026-10-08 architecture update (documentation only):** Neon PostgreSQL and Better Auth
> replace the planned Supabase database/Auth stack. On 2026-10-09 the user reaffirmed Redis
> for live events and background workers; Redis Streams/BullMQ and Better Auth/MFA are
> implemented locally, together with shared abuse rate limiting. Production provisioning, proxy/quota acceptance and private
> object storage selection remain open. See [the decision record](20-v6-architecture-decision.md)
> and [Redis runbook](53-redis-events-workers.md).

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

### Redis live events and background workers — 2026-10-09

Scopes #11–12 now use Redis Streams for committed event distribution and a separate BullMQ
worker process for notification delivery, reminders and already authorized file cleanup.
One stream reader per API replica replaces per-browser event polling when Redis is enabled;
current Better Auth sessions and business permissions still govern each hint. Durable database
outboxes, bounded attempts, fenced leases, frozen email payloads, provider idempotency,
reconciliation and reconnect snapshots protect restart/outage recovery. Local Redis has AOF
persistence, authentication, no eviction and loopback exposure. Production provisioning,
capacity/UAT and deployment quota acceptance remain open. See [53-redis-events-workers.md](53-redis-events-workers.md).

### Broader abuse rate limiting — 2026-10-09

Scope #13 now covers ingress, public forms and both agent lookup aliases, authenticated
reads/writes, uploads/OCR, reports/exports, test email and live connections. Atomic shared
Redis counters fall back to bounded PostgreSQL protection; no shared backend yields a
safe 503. HMAC keys, expiration, trusted proxy allowlists, positive Retry-After responses
and browser backoff are implemented locally. Production gateway verification and
load/quota acceptance remain open. See [54-abuse-rate-limits.md](54-abuse-rate-limits.md).
Local evidence: 23 focused abuse checks, 152 business regressions, 14 Redis regressions,
63 API unit checks and 63 web checks passed. Typechecks, API build, schema drift, browser
wait-message behavior and all four seeded demo sessions passed. Details and the final
download annotation verification boundary are recorded in the runbook.

### Authentication and MFA — 2026-10-09

Scope #10 now uses the approved Better Auth/Prisma direction. Migration preserves
account IDs, roles, client links and existing password hashes while ending legacy
sessions/reset links. The `/security` screen, authenticator codes, recovery codes,
required production staff enrollment, database session revocation, password recovery,
audited writes and retention cleanup are implemented locally. Demo roles remain
available; enabled MFA cannot be bypassed by demo sign-in. Production services,
gateway, lost-both-factor workflow and named UAT remain open. See
[52-authentication-mfa.md](52-authentication-mfa.md).

### Retention and deletion — 2026-10-09

Scope item #9 now has an Owner-only `/system/retention` workspace and guarded NestJS
workflow: inactive versioned policy drafts/approval, paged expiry previews, legal holds,
content-fingerprinted deletion requests, reasoned decisions, typed execution, audit/copy
cleanup and durable private file removal with retry/lease recovery. Customer monetary
amounts and schedules remain intact; immutable Finance/HR evidence blocks profile
erasure where its disposition is unresolved. Backup/provider follow up confirmation
and private deletion-ledger export accompany application erasure. No policies or
periods are seeded and no deletion is automatically scheduled. Business approval,
named UAT and restore/provider rehearsal remain open; see
[51-retention-deletion.md](51-retention-deletion.md).

### Foundation modules

The parallel `apps/api-ts` service now provides the first migration slice:

- NestJS API startup, configuration validation, PostgreSQL health check, and Prisma migrations.
- Better Auth database sessions in secure HTTP-only cookies, password reset, MFA/recovery codes,
  account deactivation, and shared database-backed login throttling.
- Server-enforced role permissions for accounts, batches, clients, and audit reads.
- Batch and client CRUD with strict shared Zod contracts, optimistic concurrency, transactionally
  written audit entries, and customer record isolation.
- Role-filtered server-sent events distributed through Redis Streams from a committed
  PostgreSQL outbox, with reconnect snapshots and shared readers across API replicas.
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
tables. The incoming commit supplies reporting APIs; the subsequent Reports
follow-up adds the dedicated page described below. Business policies, named UAT,
production email and handover remain open.

The `feature/reports-page` follow-up adds `/system/reports` with permission-gated
navigation, inclusive date/batch/status filtering, payment summaries, Tasks/KPI
and Support aggregates, CSV/XLSX and captured period history. Analytics uses a
report-only batch picker without gaining Records access. Saved payment periods
retain filters and captured batch codes; later record changes leave their figures
intact. Every report endpoint enforces the existing report grants and omits private
fields. Both export formats are also available on Payments. See
[37-reports-page.md](37-reports-page.md). Verification passes 152 shared tests
(46 API unit, 80 PostgreSQL integration and 26 web), typechecks, a clean production
build and synthetic browser checks. Additional report families, business field
approval and named UAT remain open.

The subsequent Batch & Collections increment adds per-batch clients, issued
agreements, verified/pending totals, per-client-derived outstanding balances and
overpaid/unapplied figures. Date filters apply only to period collections and
pending payments; overall totals use current records and client membership.
Batch paging retains full-scope totals, CSV/XLSX and immutable audited snapshots.
Missing schedules are flagged for Records review. Verification passes **157 shared
tests** (46 API unit, 83 PostgreSQL integration and 28 web), workspace typechecks,
production builds and 11 browser check groups. See
[38-batch-collection-reports.md](38-batch-collection-reports.md). Reconciliation
reports, final field/format approval and named UAT remain open. This increment is
packaged on `feature/reports-page` for review; deployment remains a release task.

Internal reconciliation is now delivered with recorded claim/status/method totals,
matching verification-audit amounts, evidence gaps and duplicate/schedule/batch
review flags. Aggregates require `REPORT_VIEW`; individual exception rows and
exact Finance links also require `PAYMENT_READ`. CSV/XLSX and saved history retain
every scoped aggregate group. Reports do not change payments or match external
bank statements. The new audit lookup index brings the preview and fresh test
databases to **22 active migrations**, with no local Prisma drift. Verification
passes **164 shared tests** (46 API unit, 88 PostgreSQL integration and 30 web),
workspace typechecks, a clean production build and 16 browser check groups. See
[39-reconciliation-reports.md](39-reconciliation-reports.md). The adjustment increment
below completes local amount correction implementation. Field/format approval,
external statement matching and named UAT remain open. This follow-up is packaged
on `feature/reports-page` for review.

Finance can now explicitly correct verified credit, reverse it to zero and restore it
through immutable signed `PaymentAdjustment` entries. Original payment amounts,
verification and versions stay unchanged. Current Finance grants, captured revisions,
unique retry IDs, the cross-instance transaction lock and database credit-chain constraints
guard writes. Reasons, audit evidence, live events and customer notices commit together.
Derived balances, installment allocation, reminders, summaries, portal history, statements,
confirmations, PDFs and reports consistently use adjusted credit. Report periods use the
original payment date; saved snapshots remain immutable. Reconciliation separately flags
missing/malformed adjustment audit evidence. Staff reasons/actors are omitted from new
customer adjustment history. The forward migration brings the local preview and fresh test
databases to **23 migrations**, with no local schema drift. See
[40-payment-adjustments.md](40-payment-adjustments.md). Verification passes **178 shared
tests** (48 API unit, 97 PostgreSQL integration and 33 web), workspace typechecks, a clean
production build and 25 browser check groups, including downloaded customer PDFs.
Named Finance/Owner UAT and the
remaining reporting/service acceptance work are still open; the changes are packaged
on `feature/reports-page` for review.

The 2026-10-07 recruitment increment replaces first-page filtering in the TypeScript
workspace with complete job/applicant search, status/role facets, 20-row paging and
unfiltered backlog counts. Applicant-specific drafts retain their captured versions
across selection, paging, filtering and refresh; competing reviews require explicit
comparison and a human choice before saving. Private attachments and existing agent
management retain their grants. The role/anonymous matrix, tied-timestamp paging,
concurrent reviews, audited writes and revoked actors pass PostgreSQL checks.
Verification passes **194 shared tests** (50 API unit, 104 PostgreSQL integration and
40 web), workspace typechecks, a clean production build and six production-browser
check groups covering drafts/conflicts, retries, mobile/keyboard and revocation. There is no new schema
migration. Named recruitment UAT, privacy/retention and import remain open; the
confidential grants are addressed below. See [41-recruitment-directory.md](41-recruitment-directory.md).
Changes are packaged on `feature/reports-page` for review.

The 2026-10-08 confidential HR increment implements the user-confirmed policy: Owner
access is automatic, while HR/Payroll and COO need a per-person Owner grant. `/system/team`
provides a reasoned grant/revoke decision and private paged history. Changes reject stale
versions, revoke sessions, and clear grants on role changes or deactivation. The default-off
additive migration and database eligibility constraint prevent inherited access. Both task
API families redact private KPI reviews; applicant directories, exact details, notes/files
and applicant live events require the grant. Ordinary tasks, job publication, aggregate
reports, Finance and handler isolation retain their existing permissions. Verification
passes 210 shared tests (53 API unit, 115 PostgreSQL integration and 42 web), clean-workspace
typechecks, the production workspace build and seven browser groups. All 24 migrations
apply with no local schema drift. Consequential HR approvals and named UAT remain
separate; see [42-confidential-hr-access.md](42-confidential-hr-access.md).

The public catalog increment adds `/system/catalog` for Owner, COO, General Manager and
Records to maintain listings, decimal daily rates, availability, publication and photos.
Public cards now read published records with search and pagination; six existing offers
are preserved with unconfirmed availability. Writes are audited and versioned, competing
edits retain drafts, and public photos are isolated from private customer files. Local
verification passes **220 tests** (57 API unit, 121 PostgreSQL integration and 42 web,
including existing local demo-auth checks), workspace typechecks, production builds and
desktop/mobile browser checks against an isolated API. All **25 migrations** apply with
no schema drift in fresh and local preview databases. Content approval, named UAT and
production release remain open; installment breakdowns are covered by the subsequent increment below.
See [43-public-catalog.md](43-public-catalog.md).

The subsequent public payment breakdown increment lets catalog staff enter each offer's
total payable, installment count and fixed 7/15/30-day interval. Published offers expose
an illustrative schedule, optional sample dates, exact regular/final amounts and complete
paging. Draft/version/audit controls cover terms as part of the listing. Existing daily
rates do not infer full terms; all six carried-over offers start without a sample plan.
The additive migration brings fresh and local preview databases to **26 migrations**,
with no Prisma schema drift. Existing customer agreements and balances stay unchanged.
Verification passes **227 local tests** (59 API unit, 123 PostgreSQL integration and
45 web, including existing local demo-auth checks), workspace typechecks and production builds.
Five browser check groups pass against an isolated API, including desktop/mobile, dark
editing, keyboard focus, date/paging behavior and clearing removed plans.
See [44-catalog-installment-breakdown.md](44-catalog-installment-breakdown.md).

The public FAQ now supports four topic filters plus combined question/answer/topic search,
result counts, empty/reset states and a keyboard-accessible accordion. Existing public
questions remain available, and the payment answer follows the saved per-offer terms.
Filtering works locally in the browser without an API or migration. See
[45-faq-topic-search.md](45-faq-topic-search.md). Business content approval remains open.
Verification passes **48 web tests**, the Next.js production build with TypeScript checks,
and four browser check groups covering combined filters, keyboard/reset behavior, offline
search and desktop/390px/320px layouts. No API or database change is included.

The public support increment adds `/support`, website/FAQ/footer links, existing contact
channels and direct customer request/history entry. Signed-out visitors return to the
selected support section after login; session expiry and exact case links retain that
intent. Known-destination validation and role-based landing behavior prevent arbitrary
redirects or new access grants. The existing private support workflow handles cases and
replies. No API or migration is added. **52 web tests**, a production build and four
PostgreSQL-backed browser groups pass, including mobile, customer/staff and private
access flows. See [46-public-support-entry.md](46-public-support-entry.md).

The consequential HR increment adds `/system/hr-actions` and a separate request and
Owner decision record tied to a human KPI recommendation. Only individually approved
HR/COO accounts submit; only the Owner approves or rejects. Rejected proposals can
be revised as new requests while earlier decisions remain immutable and audited.
No payroll amount, task fact or employee status is changed by approval. The additive
`20261008040000_hr_action_approvals` migration brings fresh test and local preview
databases to **27 migrations**. Local verification passes 59 API unit, 126 broad PostgreSQL
integration and 52 web tests, the final four-case HR integration check, production
builds and three browser groups. See [47-consequential-hr-action-approvals.md](47-consequential-hr-action-approvals.md).

| Module | Status | Key endpoints | UI |
|---|---|---|---|
| **M2 Auth / Users & Roles** | ✅ Built | Django `/api/employees/`; NestJS `/api/auth/*`, `/api/accounts` (list/create/detail/update, ACCOUNT_MANAGE) | `/login`, Owner-only `/system/team` |
| **M3 Paluwagan Records & Clients** | ✅ Built | `/api/batches/`, `/api/clients/` (+ auto-schedule), `/api/clients/{id}/schedule` | `/system/records`, `/system/clients` |
| **M4 Payments & Finance** | ✅ Built | `/api/payments/` (record/list/verify), `/api/payments/{id}/adjustments`, `/api/clients/{id}/balance|statement`, `/api/payments/{id}/proof|confirmation` | `/system/payments` with audited credit corrections |
| **M5 Customer Portal** | ✅ Built | `/api/portal/summary|schedule|payments|support`, `/api/clients/{id}/portal-account` | `/portal` |
| **M6 Employee Tasks & KPI** | ✅ Built | `/api/tasks/` (+ submit → late flag), `/api/kpi/queue`, `/api/kpi/reviews` | `/system/tasks` |
| **M7 Reporting & Analytics** | 🟡 Partial | `/api/reports/` dashboard, payments, collections, reconciliation, authorized reconciliation exceptions, tasks, support, export, snapshots and batches; business field/format acceptance and external matching open | dashboard cards and `/system/reports` |
| **M8 Customer Service** | ✅ Built | `/api/support/cases/`, `/api/portal/support/` | `/system/support`, portal |
| **M9 Recruitment & Agents** | 🟡 Partial — implemented, acceptance open | public `/api/careers`, `/api/careers/apply`, `/api/agents/verify`; guarded recruitment search/paging/summary/detail/review and `/api/agents/` | `/careers`, `/verify`, `/system/recruitment` with retained review drafts; privacy/retention/import and named UAT open |
| **M10 Notifications** | 🟡 Partial | Customer delivery/read/templates; staff alert and task/Finance/Support/account email queues/settings | Portal notifications; shared Tasks/Finance/Results/Support/Accounts bell; fourteen Owner staff templates, timing and delivery controls |
| **M1 Public Website** | 🟡 Partial | maintained published catalog, photos and per-offer sample payments; guarded catalog management; Careers + Verify | `/`, `/system/catalog`, `/careers`, `/verify`; remaining public-service scope and content acceptance open |
| **M11 AI Assistant** | Deferred — paid AI API funding unavailable (user request, 2026-10-08) | — | — |

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
- Customer, employee and applicant privacy notices plus portal terms have linked review-draft
  screens. Published-version acknowledgement, role gating and applicant evidence are
  implemented and tested locally, but no text is approved or active. Exact business identity,
  privacy contact, purposes/bases, recipients, retention and account rules are still needed;
  see [50-privacy-notices-terms.md](50-privacy-notices-terms.md).
- M11 AI assistant is deferred from current implementation priorities until paid AI
  API funding is available and the user requests resumption (2026-10-08 decision;
  see docs/05 M11).
- M1 maintained catalog and per-offer installment breakdowns are implemented locally;
  see [43-public-catalog.md](43-public-catalog.md) and [44-catalog-installment-breakdown.md](44-catalog-installment-breakdown.md).
  FAQ topic search is implemented; see [45-faq-topic-search.md](45-faq-topic-search.md).
  Public support entry is implemented; see [46-public-support-entry.md](46-public-support-entry.md).
  Business approval of content, terms and contact details remains open.
- Consequential HR request/Owner decision history is implemented locally; see
  [47-consequential-hr-action-approvals.md](47-consequential-hr-action-approvals.md).
  Named UAT, written policy and retention approval remain open.
- Support concern source tracking is implemented locally: customer portal origin is assigned
  by the server, staff log external contacts with an explicit source, historical cases are
  `unrecorded`, and staff lists/reports can group or filter by source. See
  [48-support-concern-source-tracking.md](48-support-concern-source-tracking.md). Channel
  labels, named UAT and retention approval remain open.
- Submitted report analysis is implemented locally: report viewers can include a human
  interpretation when saving a period or add it to a numeric-only snapshot later.
  One immutable submission per snapshot retains author and time; see
  [49-submitted-report-analysis.md](49-submitted-report-analysis.md). Named report UAT,
  approved role-specific fields and additional approved formats remain open.
- M10 approved wording/timing, production sender provisioning, inbox smoke tests and named UAT.
  TypeScript task reminders, Finance pending/results, staff email templates/timing/history/retries
  plus Support/account events and customer delivery/templates/read UI exist. Setup checks and
  the named Owner walkthrough are ready in [33-staff-email-launch.md](33-staff-email-launch.md).
- Task proof/attachments; report role-scoped field trimming; RLS hardening (optional, docs/15).
- Production provisioning (Neon/Railway/VPS/Cloudflare/Resend plus selected private storage and event/job infrastructure) — client-owned accounts (§20).

## Test & run
`cd apps/api && source .venv/bin/activate && python manage.py test` → discovers 80 tests.
Run instructions: see [../AGENTS.md](../AGENTS.md). Dev accounts: [DEV_ACCOUNTS.md](DEV_ACCOUNTS.md).
