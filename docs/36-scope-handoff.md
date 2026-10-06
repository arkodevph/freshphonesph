# Fresh Phones PH — Completed scope and coworker handoff

Prepared **2026-10-06**. This is a summary of work completed or integrated locally,
plus the remaining implementation and launch tasks. Local verification does not
mean business UAT or production acceptance is complete.

## Current handoff state

- Repository: `freshphonesph`; branch: `feature/records-client-filters`.
- Upstream merge base: `05e2615`, including `fd3ff14` operations/recruitment/landing work.
- The handoff commit packages the feature work, merge adjustments, new source files,
  migrations and this documentation together on `feature/records-client-filters`.
  Continue from that branch rather than `main` or `staging`, which do not yet include
  the handoff changes. Share credentials separately through the team's private process.
- A coworker can fetch and check out the shared branch:

  ```bash
  git fetch origin
  git switch --track origin/feature/records-client-filters
  ```

  If the branch already exists locally, switch to it and pull with `--ff-only`.
  Review and merge through a PR into `staging` before promotion to `main`.
- Local seeded accounts and optional demo sign-in functions, UI and configuration
  are excluded from the shared commit and remain on the original machine.
  The shared application uses normal sign-in with privately provisioned accounts.
- All 97 pre-merge local files were preserved. The recovery stash and private
  database/file backups remain available locally; they are not project source.
- The local preview database has all **21 active migrations**, with existing data
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
| Recruitment | Public careers and application forms, private applicant attachments, job publication/closing and versioned internal applicant status/notes. Existing agent management remains available. | [Merge details](35-upstream-merge.md) |
| Reporting APIs | Verified/pending dashboard cards, payment exports, task/KPI and Support category/turnaround aggregates, CSV/XLSX operations exports and saved period snapshots. Task/Support exports contain aggregates. | [Merge details](35-upstream-merge.md) |
| Public site & integration | Imported landing/careers experience, mobile horizontal-overflow fix, reconciled API/contracts and migration history, and a working local web/API setup. | [Merge details](35-upstream-merge.md) |

Existing payment verification, derived balances, customer portal, task/KPI,
Support conversations and account administration were preserved and regression
tested. Do not rebuild those workflows as if they were absent.

## Remaining work

These are open workstreams, not estimates or a claim that every module is missing.
Use the [scope matrix](18-scope-traceability-matrix.md) for the section-by-section
acceptance record.

### 1. Reporting and Finance completion — next available implementation task

- [ ] Build `/system/reports`, with role-aware navigation, date/batch filters,
  loading/error states, export controls and saved-period history. The Reports
  sidebar item is currently disabled because no Reports page exists.
- [ ] Complete the remaining batch/collection/reconciliation report families and
  any additional formats required by the approved scope.
- [ ] Connect the payment XLSX UI to the imported export API. The older
  `downloadPaymentsExport` helper still rejects XLSX in TypeScript mode, although
  the newer `/api/reports/export` supports it.
- [ ] Confirm permitted fields for every reporting role and test both authorized
  exports and prohibited private details.
- [ ] Finish the approved audited post-verification adjustment/correction workflow
  and reconciliation evidence. Keep verified-payment changes explicit and audited.

### 2. Confidential HR access and consequential approvals

- [ ] Obtain the Owner-approved confidential-HR access matrix and implement the
  separate grants and negative permission tests.
- [ ] Complete the human approval/audit trail for consequential HR actions covered
  by the scope. Existing task timing and KPI notes are not that approval workflow.
- [ ] Preserve current role grants and handler isolation. Do not introduce payroll
  automation or automatic salary deductions.

### 3. Public site, documents and recruitment finishing work

- [ ] Connect the public catalog and payment breakdown to approved, maintained
  product/availability data; validate the complete support/contact entry points.
- [ ] Have the business approve process, document requirements, FAQ and public copy.
- [ ] Complete recruitment paging/search across full applicant/job backlogs; the
  current internal page loads a first page and filters its loaded applicants.
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

- [ ] Complete the approved Supabase Auth/session/MFA cutover. The application
  still uses its current cookie-session implementation.
- [ ] Implement/validate the target Redis event fan-out and background workers,
  including replica/reconnect/outage recovery and distributed rate limits.
- [ ] Provision client-owned VPS, Railway, Supabase database/private storage, Redis,
  domain/HTTPS and monitoring. Confirm provider/region/operating decisions first.
- [ ] Test two API replicas, private storage migration/access, secrets, access
  revocation, capacity, backup restoration, rollback and operational recovery.
- [ ] Obtain approved notices/terms, document/applicant requirements, retention and
  deletion rules, privacy contacts, access reviews and incident procedures. Implement
  notice/version tracking and retention/deletion against those approved decisions.

Architecture requirements and decisions: [20-v6-architecture-decision.md](20-v6-architecture-decision.md).
Client policy dependencies: [22-customer-portal-policy.md](22-customer-portal-policy.md).

### 6. Assistive AI — implement after core permissions and records are stable

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
pnpm --filter @fresh/web test
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
The active forward migration is `20261007010000_operations_reconcile`. Check an
environment's applied migration names before deploying this branch; details are
in [35-upstream-merge.md](35-upstream-merge.md).

Protect the existing boundaries: verified-only derived balances; human-entered
KPI/HR decisions; operational documents with non-BIR wording; masked public agent
results; server-side permissions; private files; and audited sensitive writes.
