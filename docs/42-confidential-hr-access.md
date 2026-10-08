# Owner-approved confidential HR access

Implemented locally on `feature/reports-page`, **2026-10-08**, using the policy
confirmed by the user: Owner access is automatic; HR / Payroll and COO require an
explicit Owner grant for that person. Every other role is denied. Named business
UAT and production rollout remain open.

## Owner workflow

Open **User management** (`/system/team`) and choose **Manage** for an account.
For an active HR / Payroll or COO account, enable **Confidential HR access**, enter
a reason, and choose **Save changes**. Disable it with a reason to revoke access.
Reasons must contain 3–1,000 characters after trimming. The person must sign in
again after an access change. Owner access is shown as automatic and cannot be
disabled with this switch; other roles cannot receive a grant.

The same dialog shows the decision, Owner name, reason and date, with 20 decisions
per page. It includes revocations caused by a role change or deactivation. Account
changes retain the version captured when editing began. A conflicting save returns
409 and keeps the draft; discard it and review current access before saving again.
There is no automatic retry against a newer version.

Changing any role clears an existing grant, including HR / Payroll to COO. An Owner
can explicitly approve the new eligible role in that same save with a fresh reason.
Deactivation clears the grant; reactivation does not restore it. Changing the role
or sign-in setting in an unsaved draft clears its proposed grant, so review the
final settings before approving access.

## Protected records and ordinary work

| Surface | Access |
| --- | --- |
| Private KPI queue, evaluations, recommendations and decisions | Owner or explicitly approved HR / Payroll or COO |
| KPI review data nested in either task API | Projected only to approved reviewers; other staff receive ordinary task facts and `review: null` |
| Applicant directory, exact records, review notes and attachment contents | Both `RECRUITMENT_MANAGE` and `HR_CONFIDENTIAL` |
| Applicant live event identifiers | Approved recruitment reviewers only |
| HR access management and decision history | Owner only |
| Ordinary tasks, job openings, aggregate reports, Finance and assigned handler records | Existing permissions and record scope |

Unapproved HR / Payroll and COO accounts can continue managing job openings and
seeing permitted aggregate recruitment counts. Their applicant panel explains that
Owner approval is required and makes no private applicant requests. Refreshed
permissions remove private applicant records and unsaved reviews from the mounted
workspace. Task and review state also clears when account identity or task/KPI
permissions change. Ordinary refreshes retain drafts while permissions stay the
same. Public careers still expose only approved opening fields.

## API, audit and migration

`PATCH /api/accounts/:id` accepts the captured `version`, optional `role` / `active`,
and an optional `hrConfidentialAccess` decision paired with `hrAccessReason`. Unknown
fields, missing reasons, invalid versions and grants to inactive or ineligible
accounts are rejected. Account creation cannot carry a confidential grant.

`GET /api/accounts/:id/hr-access-history?page=1` is Owner-only. Pages range from 1 to
100,000. It projects only decision ID, granted/revoked status, reason, Owner name
and date. Private account and session fields are excluded.

Successful decisions write `account.hr_access_granted` or
`account.hr_access_revoked` audit entries. Serialized transactions recheck the
Owner's current active role, enforce the captured account version, update access,
revoke existing sessions and record the audit/event together. Automatic revocations
record the role/deactivation reason. Repeated unchanged requests do not add a
decision, and even a stale no-op is rejected.

Authentication calculates permissions from the current database record. It ignores
client-supplied permission claims. Private reads recheck current access; writes
check it inside the existing serialized transaction. Both API instances use the
same current state, and already-open event streams close after session revocation
on their next session check.

Migration `20261008010000_confidential_hr_access` adds
`User.hrConfidentialAccess BOOLEAN NOT NULL DEFAULT false`. Existing non-Owner
accounts require a new explicit grant. A database check permits a stored grant only
for active HR / Payroll or COO accounts. The migration is additive and applied to
the local preview; production must apply it with the release. Owner access is
derived from the role and does not require the stored flag.

## Verification and business acceptance

This increment is packaged on `feature/reports-page` for review. Staging and
production deployment, including the new migration, remain release tasks.

Local verification includes the complete role/anonymous matrix, forged permissions,
strict request bodies, private applicant file reads, both task API projections,
Owner-only history, competing decisions, stale actors, role/deactivation resets,
database constraints and cross-instance event filtering/session revocation.
Integration checks use a dedicated real PostgreSQL database with all 24 migrations.
The local preview and fresh test database have no Prisma schema drift. Verification
passes **210 shared tests**: 53 API unit, 115 real PostgreSQL integration and 42 web
tests, plus workspace typechecks and the production workspace build in a clean
workspace. Local demo sign-in overlays and their configuration test are excluded
from the shared source. All 24 migrations apply to the fresh verification database
without Prisma schema drift.

Seven production-browser check groups using synthetic responses pass for reasoned
grant/revoke and history, role eligibility/reset behavior, retained conflicting
drafts, desktop/mobile dark layouts and keyboard focus, private applicant access
and draft removal, denial of HR account administration, and private KPI draft
removal on revocation with a clean start after reapproval.

Use a fresh dedicated PostgreSQL database ending in `_test`, set
`TEST_DATABASE_URL`, and apply the active migrations before the integration suite.
Its synthetic fixtures remain in that database after testing; repeated full runs
can accumulate notification recipients and outbox records.

```bash
pnpm db:generate
DATABASE_URL="$TEST_DATABASE_URL" pnpm db:migrate
pnpm typecheck
pnpm test:api-ts
pnpm test:api-ts:integration
NEXT_PUBLIC_API_BACKEND=typescript pnpm --filter @fresh/web test
NEXT_PUBLIC_API_BACKEND=typescript pnpm build
```

Before production acceptance, record named Owner/HR/COO UAT for:

- Grant, fresh sign-in, private KPI review and applicant attachment access.
- Revocation across two sessions/instances and removal of private mounted drafts.
- Eligible and ineligible role changes, deactivation and reactivation.
- Competing Owner saves, reason/history review and keyboard/mobile usability.
- Denied access for General Manager, Finance, Records, Analytics, Support,
  handlers and customers while their ordinary work remains available.

Consequential HR actions still need their separately approved human workflow.
This increment adds access control for existing records and does not automate
payroll deductions or hiring decisions. AI work remains deferred until funding and
API payment are available; see [36-scope-handoff.md](36-scope-handoff.md).
