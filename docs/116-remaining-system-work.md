# Freshphones remaining system work — 2026-11-07

This is a consolidated review of current project records with targeted source checks,
not a fresh acceptance test of every feature. “Verify” means completeness is unknown;
it does not mean the feature is missing. Older checklists are superseded by newer
implementation guides. No deployment or external integration is authorized by this list.

## P1 — Finish or establish workflow completeness

- [ ] **Build/confirm:** define and enforce the complete Handler → Records completeness → assigned Manager cross-check → Finance payment review chain. GCash PDF review exists, but it is not evidence that payment verification requires both operational approvals. The inspected `FinanceService.decide()` checks permission, membership and PENDING/version state without those approvals. Decide per-payment versus package review, expected evidence, correction rights and approval invalidation.
- [ ] **Verify/build gaps:** Moderator/Operations Coordinator queue for missing receipts, incomplete submissions, old reviews and unresolved follow-ups; confirm task-assignment authority. A dedicated complete monitoring queue has not been established by this review.
- [ ] **Verify/build gaps:** notifications for each agreed operational handoff, returns/corrections and follow-ups. Enrollment and existing payment/task notifications are implemented; broader F19 coverage is not established.
- [ ] **Verify/fix:** every canonical demo account has its required Agent/customer/team/batch links. The demo seed still assigns a Handler batch under legacy `CORE_HANDLER`; current canonical account effects require runtime checking. Do not infer real reporting lines.
- [ ] **Verify:** all business roles against their allowed pages, direct API calls, private files and cross-team/customer denial cases on the current build.
- [ ] **Decide:** HR role-grant delegation, legacy Analytics reassignment and catalog ownership.
- [ ] **Decide only if needed:** additional ongoing-batch join/catch-up/release arrangements outside the implemented replacement continuation/restart path; company-wide refund rules remain human policy decisions.

## P2 — Acceptance of implemented local features

- [ ] Named COO/Finance/Records/Manager/Handler/Agent/customer acceptance of the complete enrollment-to-payment journey, including corrections and reassignment.
- [ ] Accept eight-member capacity, staff-only display positions, manual/automatic activation and concurrent enrollment behavior.
- [ ] Accept installment calendars, first due dates, Agent numbering and historical schedule protection.
- [ ] Accept independent multi-batch schedules, balances, document links and payment isolation.
- [ ] Accept withdrawal, Agent review, COO decision, replacement admission and separate Finance-recorded refunds.
- [ ] Accept GCash originals, password-protected/scanned PDFs, correction/review invalidation, history and archive/restore on representative statements.
- [ ] Accept public question builder, immutable application versions, Agent forwarding, Manager approval and customer printable summary. Approve signed agreement text/fields/signature process separately.
- [ ] Approve report fields and permitted families per role, CSV/XLSX/PDF formats, totals, scheduled installments versus collections, adjustments/refunds and saved analysis.
- [ ] Accept customer recovery/MFA, statements, documents, support, release milestones and notification journeys using separate customer accounts.
- [ ] Accept recruitment/application review, masked public Agent verification, support concern labels and human KPI/HR workflows.
- [ ] Verify mobile/desktop, keyboard/focus, zoom, reduced motion and non-Chromium behavior for critical journeys on the current integrated build.
- [ ] Verify realistic backlog sizes, concurrent/stale edits, retries, reconnects and assignment changes without losing drafts or leaking records.

## P3 — Business content, privacy and operating decisions

- [ ] Approve public business details, catalog/offer terms, FAQs, contact details and inquiry/enrollment destinations; check standalone public release versus integrated local intake behavior.
- [ ] Approve and publish customer/employee/applicant notices and portal terms with actual business identity, privacy contact, purposes, recipients and account rules.
- [ ] Approve required ID/agreement evidence and retention periods for originals, versions, receipts, recruitment files, messages, logs and backups.
- [ ] Approve legal-hold/deletion/export handling, incident contacts and periodic access reviews.
- [ ] Approve notification wording, recipients, reminder offsets and escalation expectations. Keep external delivery deferred until separately resumed.
- [ ] Align the existing payroll spreadsheet package with the client's chosen format, actual responsibilities and approved rules; test it in the chosen Excel/Sheets environment. Payroll calculation remains outside the website.

## P4 — Current AI and optional dashboard follow-ups

- [ ] Accept Fresh AI live reads and confirmation-bound actions, cancellation/expiry/version conflicts, cross-session isolation and interrupted/ambiguous execution. Review the documented executive delegation exception explicitly alongside ordinary CEO report-only access.
- [ ] Verify real provider failure/rate/quota behavior, data handling and approved access scope. AI is already implemented; older “funding deferred” tables are stale.
- [ ] Verify conversation history with Redis enabled and across browser engines; the last history report skipped the Redis-only integration case.
- [ ] Optional Better Auth dashboard: verify hosted signed connection and read views once a reachable URL is available. Local read-route/authentication checks pass; account mutations remain unavailable through Dash. User set tunnel work aside; no tunnel is running.

## P5 — Release preparation (deployment and integrations remain deferred)

- [ ] Reconcile BUILD_STATUS, role tables and scope traceability with current feature guides; remove misleading current-state claims about Owner permissions, absent AI and already completed features.
- [ ] Review and package the extensive local/uncommitted work into scoped changes, preserving existing business data and unrelated work. Follow feature → staging → main review flow when authorized.
- [ ] Run current invariant, authorization, unit/integration and build/type/format checks for the release candidate; do not add overlapping historical test counts.
- [ ] Record named client UAT, accepted/deferred scope, known limitations, handover/support ownership and launch approval.
- [ ] When resumed: provision client-owned hosting/domain/HTTPS, PostgreSQL, private object storage and Redis/worker services; finalize the currently selected deployment topology and quotas.
- [ ] When resumed: configure approved secrets, session/MFA settings, CORS/trusted proxies, health checks, job retries, monitoring and abuse limits in staging.
- [ ] When resumed: back up and migrate database/private files; verify hashes and authorization, rehearse restore and rollback, then run staging smoke/load tests with evidence.
- [ ] When resumed: configure verified email sender/domain and test actual inbox delivery, reminders, failures/retries and opt-outs where required.
- [ ] Keep GCash/bank APIs, Google Forms/spreadsheet sync, SMS/messaging and external OCR deferred unless specifically approved. No payroll engine is implied.

## Already implemented locally — do not recreate

Role/access alignment; Owner/CEO normalization; Agent enrollment with assigned Manager
approval; editable website forms; multiple batch memberships; capacity/internal positions;
calendar schedules and Agent numbering; scheduled installment reports; withdrawals,
replacement and recorded refunds; GCash PDF reading/review/correction/archive; printable
application summaries; payroll spreadsheet v1; in-app enrollment alerts; Fresh AI tools,
confirmations and saved conversation history. Each still needs relevant acceptance and
current-build regression checks.

## Evidence

- [Current integrated handoff](68-2026-10-28-afternoon-handoff.md), especially checklist and remaining work.
- [Client requested workflows](62-client-feature-implementation-backlog.md); older planning, not delivery evidence.
- [Role foundation and deliberate limits](66-role-access-alignment.md), [Owner/CEO](67-owner-ceo-role.md).
- [GCash review](73-gcash-review-workspace.md), [withdrawals](77-member-withdrawals-main-demo.md), [public intake](81-editable-public-enrollment-form.md).
- [Payroll package](80-payroll-spreadsheet-workflow.md), [customer UAT](23-customer-launch-uat.md), [scope/release checklist](18-scope-traceability-matrix.md).
- [AI actions/delegation](110-fresh-ai-api-tools.md), [history](113-fresh-ai-conversation-history.md), [latest history fix](114-fresh-ai-preview-save-recovery.md).
- [Standalone landing release boundary](110-landing-page-release.md), [Dash routing checks](115-better-auth-dashboard.md).
- Targeted source: `apps/api-ts/src/finance/finance.service.ts` (`decide`), `apps/api-ts/scripts/seed-demo.ts`, `packages/contracts/src/index.ts`.

Unknowns: current runtime completeness of every role/function; named client acceptance;
production readiness and any external deployment state not verified in this review.
