# Fresh Phones PH — Completed scope and coworker handoff

> **2026-10-08 architecture update (documentation only):** Neon PostgreSQL and Better Auth
> replace the planned Supabase database/Auth stack. On 2026-10-09 the user reaffirmed Redis
> for live events and background workers; Redis Streams/BullMQ and Better Auth/MFA are
> implemented locally. Production provisioning, distributed rate limiting and private
> object storage selection remain open. See [the decision record](20-v6-architecture-decision.md)
> and [Redis runbook](53-redis-events-workers.md).

Updated **2026-10-08**. This is a summary of work completed or integrated locally,
plus the remaining implementation and launch tasks. Local verification does not
mean business UAT or production acceptance is complete.

## Current handoff state

- Repository: `freshphonesph`; review branch: `feature/reports-page`.
- This feature handoff builds on the previously published `4ae1337` handoff and
  packages the Reports follow-up, including Batch & Collections; see
  [37-reports-page.md](37-reports-page.md) and
  [38-batch-collection-reports.md](38-batch-collection-reports.md). Internal
  reconciliation and audited amount adjustments are also delivered; see
  [39-reconciliation-reports.md](39-reconciliation-reports.md) and
  [40-payment-adjustments.md](40-payment-adjustments.md). Recruitment backlog
  search/paging, complete counts and retained review drafts are included;
  see [41-recruitment-directory.md](41-recruitment-directory.md). Owner-approved
  confidential HR access, decision history and cross-instance revocation are also
  included; see [42-confidential-hr-access.md](42-confidential-hr-access.md).
- Upstream merge base: `05e2615`, including `fd3ff14` operations/recruitment/landing work.
- The handoff commit packages the feature work, merge adjustments, new source files,
  migrations and this documentation together on `feature/reports-page`.
  Continue from that branch rather than `main` or `staging`, which do not yet include
  the handoff changes. Share credentials separately through the team's private process.
- A coworker can fetch and check out the shared branch:

  ```bash
  git fetch origin
  git switch --track origin/feature/reports-page
  ```

  If the branch already exists locally, switch to it and pull with `--ff-only`.
  Review and merge through a PR into `staging` before promotion to `main`.
- Local seeded accounts and optional demo sign-in functions, UI and configuration
  are excluded from the shared commit and remain on the original machine.
  The shared application uses normal sign-in with privately provisioned accounts.
- All 97 pre-merge local files were preserved. The recovery stash and private
  database/file backups remain available locally; they are not project source.
- The local preview database has all **30 active migrations**, with existing data
  preserved and no Prisma schema drift.
- Local web: `http://localhost:3000`; API: `http://localhost:4101`;
  API/database health: `GET /api/health`.

## Completed or integrated locally

| Area | Delivered behavior | Reference |
| --- | --- | --- |
| Records & Clients | Batch/client editing, audited change history, schedule/term safeguards, model/status/date/assignment filters, accurate pagination, exact record links, retained drafts and stale-version rejection. | [Editing/history](25-record-edit-history.md), [filters](34-records-client-filters.md) |
| Assignments & Agents | Handler/agent batch assignment, server-enforced assigned-record access, agent creation/edit/deactivation and masked public verification. Reassignment revokes the previous handler's access. | [Assignments](26-batch-assignments.md) |
| Staff alerts | Shared notification bell for task assignment/deadlines, Finance pending/results, Support triage/assignment/customer replies and Owner account changes. Recipient-specific reads, private events and exact record links are retained. | [Finance pending](27-finance-pending-alerts.md), [tasks](28-staff-task-alerts.md), [results](29-finance-result-alerts.md), [Support](31-support-staff-alerts.md), [accounts](32-account-access-alerts.md) |
| Staff email preparation | Fourteen configurable templates, reminder timing, delivery history, bounded retries, recipient/access checks and a launch-check CLI. Local previews and mocked-provider checks pass. | [Email delivery](30-staff-email-delivery.md), [launch preparation](33-staff-email-launch.md) |
| Document requirements | Configurable approved document types, private uploads, revision history, approval and clarification notes. The existing customer Documents checklist remains intact alongside the imported configured requirements. | [Merge details](35-upstream-merge.md) |
| Recruitment | Public careers/application forms, private attachments, job publication/closing, full-backlog job/applicant search and pagination, global counts, retained review drafts and explicit stale-review resolution. Existing agent management remains available. | [Recruitment directory](41-recruitment-directory.md), [merge details](35-upstream-merge.md) |
| Confidential HR access | Owner automatic access; explicit reasoned per-person grants for HR / Payroll or COO, private KPI/applicant gates, decision history, stale-save rejection, role/deactivation resets and session revocation. | [Confidential HR access](42-confidential-hr-access.md) |
| Reporting | Permission-gated Reports page, payment and collection totals, internal verification-audit reconciliation, review flags with separately authorized payment exceptions, task/KPI and Support aggregates, CSV/XLSX and captured history. Paging preserves full-scope totals, exports and saves. | [Reports page](37-reports-page.md), [Batch & Collections](38-batch-collection-reports.md), [Reconciliation](39-reconciliation-reports.md), [merge details](35-upstream-merge.md) |
| Submitted report analysis | Existing report viewers can attach one immutable human interpretation when saving a period or later to an older snapshot. History shows it with the unchanged captured figures, author and time. | [Submitted analysis](49-submitted-report-analysis.md) |
| Finance adjustments | Finance-only amount corrections, full reversal/restoration, append-only reasons/actors/history, guarded retries and stale writes, consistent adjusted balances/schedules/customer documents/reports, and adjustment audit-gap evidence. Original verified records and saved snapshots remain unchanged. | [Payment adjustments](40-payment-adjustments.md) |
| Public site & integration | Imported landing/careers experience, mobile horizontal-overflow fix, reconciled API/contracts and migration history, and a working local web/API setup. | [Merge details](35-upstream-merge.md) |
| Public catalog | Owner/COO/General Manager/Records maintain published listings, daily rates, availability and photos. Public search/paging, audited versioned saves and private-file isolation are implemented locally. | [Public catalog](43-public-catalog.md) |
| Payment breakdown | Catalog staff enter per-offer totals, counts and intervals. Customers can preview every installment and optional sample dates, with exact totals and fixed 7/15/30-day spacing. | [Sample payments](44-catalog-installment-breakdown.md) |
| FAQ topic search | Public question/answer/topic search, four topic filters, counts, empty/reset states and keyboard-accessible accordion. | [FAQ search](45-faq-topic-search.md) |
| Public support entry | Help/contact page and website links; customer request/history destinations survive sign-in, with existing private cases and staff role routing. | [Support entry](46-public-support-entry.md) |
| Support source tracking | Portal origin is server-assigned; Customer Service logs external contacts with a chosen immutable source. Staff filters and support reports count source, while historical cases retain an honest `unrecorded` label. | [Source tracking](48-support-concern-source-tracking.md) |

Existing payment verification, derived balances, customer portal, task/KPI,
Support conversations and account administration were preserved and regression
tested. Do not rebuild those workflows as if they were absent.

## Remaining work

These are open workstreams, not estimates or a claim that every module is missing.
Use the [scope matrix](18-scope-traceability-matrix.md) for the section-by-section
acceptance record.

### 1. Reporting and Finance acceptance

- [x] Build `/system/reports`, with role-aware navigation, date/batch filters,
  loading/error states, export controls and saved-period history.
- [x] Complete batch/collection reporting with issued agreements, client counts,
  verified-only balances, separate period collections/pending figures, full-scope
  exports and immutable audited history.
- [x] Complete internal reconciliation reports: status/method totals, verification
  audit gaps, duplicate/schedule/batch review flags, authorized exception links,
  aggregate exports and saved history.
- [ ] Approve any additional required formats. External bank-statement matching
  needs approved source data and rules; it is not part of the internal comparison.
- [x] Connect the payment XLSX UI to the export API on Reports and Payments.
- [x] Test the existing report permission matrix and authorized exports with
  private identity, proof, notes, task evidence and Support concerns excluded.
- [ ] Obtain final business approval for permitted fields per reporting role and
  extend report coverage against that approved matrix.
- [x] Implement audited post-verification amount corrections/reversals and
  reconciliation evidence. Original verified rows remain immutable; see
  [40-payment-adjustments.md](40-payment-adjustments.md).
- [ ] Complete named Finance/Owner UAT and approve the adjustment procedure.
  Metadata/client reassignment and external statement matching need separate approved rules.

### 2. Confidential HR access and consequential approvals

- [x] Implement the user-confirmed policy: Owner access is automatic; HR / Payroll
  and COO require an explicit per-person Owner grant. Grant decisions are reasoned,
  audited and versioned, with negative role/private-file tests and session revocation.
  See [42-confidential-hr-access.md](42-confidential-hr-access.md).
- [ ] Complete named Owner/HR/COO UAT for grant, revoke, role change and reactivation.
- [x] Complete the human request → Owner approve/reject audit trail for consequential
  HR actions linked to a human KPI recommendation; see [47-consequential-hr-action-approvals.md](47-consequential-hr-action-approvals.md).
- [ ] Approve the written HR policy and complete named Owner/HR/COO action-decision UAT.
- [x] Preserve ordinary role grants and handler isolation while separately gating
  private KPI reviews and applicant data. No payroll automation or automatic deductions.

### 3. Public site, documents and recruitment finishing work

- [x] Connect public unit cards to maintained listings, daily rates, availability and photos,
  with Owner/COO/General Manager/Records management; see [43-public-catalog.md](43-public-catalog.md).
- [x] Complete per-offer installment breakdowns with staff-entered terms and public
  sample schedules; see [44-catalog-installment-breakdown.md](44-catalog-installment-breakdown.md).
- [x] Add FAQ topic filters and question/answer search with accessible result and
  reset behavior; see [45-faq-topic-search.md](45-faq-topic-search.md).
- [x] Complete public support/contact entry points and preserve request/history intent
  through sign-in; see [46-public-support-entry.md](46-public-support-entry.md).
- [ ] Obtain business approval of catalog content, availability, installment terms and
  public support contact details.
- [ ] Have the business approve process, document requirements, FAQ and public copy.
- [x] Complete recruitment paging/search across full applicant/job backlogs, with
  complete counts, retained drafts, explicit conflict resolution and private access
  tests; see [41-recruitment-directory.md](41-recruitment-directory.md).
- [ ] Finalize the approved customer/staff document journey across the existing
  checklist and imported configurable requirements; avoid adding a third system.
- [ ] Reconcile the approved Appendix A field checklist with models/validation,
  including outstanding contact/address and review-field decisions.
- [ ] Plan any required legacy agent/applicant/document import, with field mapping,
  counts, private-file verification and rollback evidence.
- [ ] Obtain recruitment privacy/retention approval and named human-review UAT.

### 4. Notifications and real email — production work deliberately deferred

The Owner does not yet have the sender/domain, Resend credentials, test inbox or
staging URL. Production email setup and real-inbox tests were explicitly skipped;
local email tools are ready, but real delivery is not accepted.

- [ ] Once those details exist, provision the client-owned verified sender and
  private deployment secrets using [the launch runbook](33-staff-email-launch.md).
- [ ] Approve all fourteen staff templates, customer templates and reminder timing.
- [ ] Send the isolated synthetic smoke email, verify inbox/spam placement and
  authenticated links, then record named reviewer results.
- [ ] Exercise actual event delivery, pause/retry behavior, deduplication and
  recipient isolation in dedicated staging.
- [ ] Review the imported generic notification subsystem alongside the established
  staff/customer outboxes before enabling production deliveries.

### 5. Production architecture, security and client policies

- [ ] Complete Neon and the production Better Auth/session/MFA cutover. Better Auth/MFA is implemented locally; see [52-authentication-mfa.md](52-authentication-mfa.md). The application
  uses Better Auth database sessions locally.
- [ ] Provision and validate production Redis Streams/BullMQ, replica/reconnect/outage
  recovery and capacity. Local implementation is complete; see [53-redis-events-workers.md](53-redis-events-workers.md).
  Broader distributed rate limiting remains scope #13.
- [ ] Provision client-owned VPS, Railway, Neon, selected private S3-compatible storage,
  domain/HTTPS, authenticated Redis, separate worker services and monitoring; Confirm provider/region/operating decisions first.
- [ ] Test two API replicas, private storage migration/access, secrets, access
  revocation, capacity, backup restoration, rollback and operational recovery.
- [ ] Obtain approved notices/terms, document/applicant requirements, retention and
  deletion rules, privacy contacts, access reviews and incident procedures. Draft
  notice screens, links and versioned acknowledgement infrastructure are implemented
  locally in [50-privacy-notices-terms.md](50-privacy-notices-terms.md); publication and
  retention policy activation still depends on those approved decisions. Owner-managed
  retention policies, previews, holds, deletion approvals, durable file cleanup and
  backup/provider follow up now exist locally in [51-retention-deletion.md](51-retention-deletion.md).

Architecture requirements and decisions: [20-v6-architecture-decision.md](20-v6-architecture-decision.md).
Client policy dependencies: [22-customer-portal-policy.md](22-customer-portal-policy.md).

### 6. Assistive AI — deferred until API funding is available

Deferred at the user's request on **2026-10-08** because there is no budget for
paid AI API usage. Exclude this workstream from current implementation priorities.
Resume only when funding is available and the user requests it; retain the following
requirements for future implementation after core permissions and records are stable.

- [ ] Implement approved-source, permission-aware summaries and task assistance.
- [ ] Test role/customer isolation, prompt injection, private-data handling and
  human review. Keep AI read-only for business actions.
- [ ] Resolve older deduction-suggestion wording against the project's stricter
  no-automatic-wage-action rule before implementation. AI is still an unimplemented
  scope area, not part of the completed work above.

### 7. Business UAT, release and final handover

- [ ] Run named desktop/mobile and keyboard/accessibility walkthroughs with realistic
  staging fixtures for each role, including private files, backlogs and conflicts.
- [ ] Obtain business acceptance of reports, Support metrics, recruitment, document
  requirements, notification wording and timing.
- [ ] Complete staging deployment, restore/rollback rehearsal and client-owned
  service smoke tests; close defects before production release.
- [ ] Record signed UAT/release approval, training, account ownership, operating
  runbooks, support/change-control arrangements and the warranty-start record.

Use [customer launch UAT](23-customer-launch-uat.md), the
[customer sign-off template](uat/customer-launch-signoff-template.md) and
[staff notification sign-off template](uat/staff-notifications-signoff-template.md).

## Verification and developer starting points

Original local validation: **47 API unit + 75 real PostgreSQL integration + 19 web
tests = 141 passing tests**, with workspace typechecks and production builds.
The shared snapshot excludes one local demo configuration test and passes
**46 API unit + 75 real PostgreSQL integration + 19 web = 140 tests**.
Workspace typechecks and a production build in a clean workspace also pass.
All 21 active migrations apply successfully to a fresh PostgreSQL test database.
The Reports follow-up passes **152 shared tests** (46 API unit, 80 PostgreSQL
integration and 26 web tests), typechecks and a clean production build; see
[37-reports-page.md](37-reports-page.md).
The Batch & Collections increment passes **157 shared tests** (46 API unit,
83 PostgreSQL integration and 28 web), workspace typechecks, production builds
and 11 browser check groups; see
[38-batch-collection-reports.md](38-batch-collection-reports.md). Its date filters
apply to period collections/pending payments; overall balances use current issued
schedules and verified records.
The internal reconciliation increment passes **164 shared tests** (46 API unit,
88 PostgreSQL integration and 30 web), typechecks, a clean production build and
16 browser check groups. The preview and fresh test databases have all 22
migrations, with no local schema drift. See
[39-reconciliation-reports.md](39-reconciliation-reports.md). External bank
statements are not matched by this internal report.
The Finance adjustment increment passes **178 shared tests** (48 API unit,
97 PostgreSQL integration and 33 web), typechecks, a clean production build and
25 browser groups; see [40-payment-adjustments.md](40-payment-adjustments.md).
Recruitment search/paging passes **194 shared tests** (50 API unit, 104 PostgreSQL
integration and 40 web), typechecks, a clean production build and six recruitment
browser check groups; see
[41-recruitment-directory.md](41-recruitment-directory.md). It adds no migration.
The confidential HR increment passes **210 shared tests** (53 API unit, 115 PostgreSQL
integration and 42 web), workspace typechecks, a production workspace build and
seven browser check groups. The shared suites, typechecks and production build
also pass in a clean workspace with the local demo overlays excluded. Both local preview
and fresh test databases have all 24 migrations and no Prisma schema drift. See
[42-confidential-hr-access.md](42-confidential-hr-access.md) for access and UAT details.
All follow-ups are packaged together on `feature/reports-page` for review.

Production-build browser checks used synthetic API responses for careers,
recruitment, requirements, Records/Clients filters, drafts/links, explicit writes,
revoked access and mobile layouts. Real staging UAT remains separate.

Work in `apps/api-ts/` (NestJS/Prisma), `apps/web/` (Next.js) and
`packages/contracts/`. Django under `apps/api/` is migration/parity reference.

From the repository root, after private local environment setup:

```bash
pnpm install
docker compose up -d
pnpm --filter @freshphones/contracts build
pnpm db:generate
pnpm --filter @fresh/api-ts db:migrate
pnpm --filter @fresh/api-ts dev
```

In another terminal:

```bash
pnpm --filter @fresh/web dev --hostname 127.0.0.1 --port 3000
```

The current local settings pair API `PORT=4101`, `HOST=127.0.0.1` and
`WEB_ORIGIN=http://localhost:3000` with web `NEXT_PUBLIC_API_BACKEND=typescript`
and `NEXT_PUBLIC_API_URL=http://localhost:4101`. Recreate ignored environment files
privately; use [the preview runbook](19-records-typescript-preview.md) for setup.

Validation commands:

```bash
pnpm typecheck
pnpm test:api-ts
NEXT_PUBLIC_API_BACKEND=typescript pnpm --filter @fresh/web test
pnpm build
```

For integration tests, create a dedicated fresh PostgreSQL database whose name
ends in `_test`, set `TEST_DATABASE_URL`, and apply the same active migrations:

```bash
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @fresh/api-ts db:migrate
pnpm test:api-ts:integration
```

**Migration handoff:** the two overlapping incoming September SQL scripts are
preserved under `apps/api-ts/prisma/migration-sources/operations-completion/`.
The latest forward migration is `20261009030000_better_auth_mfa`; the
earlier reconciliation/operations migrations remain unchanged. Recruitment search
and paging add no migration. Check an
environment's applied migration names before deploying this branch; details are
in [35-upstream-merge.md](35-upstream-merge.md).

Protect the existing boundaries: verified-only derived balances; human-entered
KPI/HR decisions; operational documents with non-BIR wording; masked public agent
results; server-side permissions; private files; and audited sensitive writes.
