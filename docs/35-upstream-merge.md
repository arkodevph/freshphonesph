# 35 — Local upstream merge

## Imported work

The local `feature/records-client-filters` branch includes `fd3ff14` (operations,
recruitment and landing) and `05e2615` (promotion to staging). Its HEAD matches the
fetched `origin/staging` and `origin/main` at merge completion. At that point the
local work remained unstaged; no push, deployment or feature commit was made as
part of the merge. The subsequent [coworker handoff](36-scope-handoff.md) packages
the reconciled work on the feature branch.

All 97 pre-merge changed/untracked files were recovered from the saved stash.
The stash remains available, with private tracked/untracked archives and a local
database backup outside the repository. Core Records and Finance services retain
their pre-merge contents, including scoped filters, audited edits and staff alerts.

## Compatibility decisions

- Preserve existing customer documents, portal notifications, task submissions,
  KPI reviews, support conversations, agents and staff delivery/read records.
- Add configured client requirements and revision history alongside the existing
  Documents checklist. New models use `RequirementDocument` and `StaffNotification`
  to avoid replacing existing models with incompatible schemas.
- Keep the existing `/tasks`, `/kpi`, `/agents`, portal and Support controllers.
  The imported work controller uses `/work/*`; recruitment's compatibility agent
  endpoints use `/recruitment/agents/*`. The staff Tasks page and agent directory
  continue using their established APIs.
- Preserve all existing role grants and add the new permission keys according to
  the incoming map. Core handlers retain assigned Records/Clients access; COO
  does not acquire the existing Support management permission through this merge.
- Retain local/S3 private storage and path/signature checks. Public applications
  may store an attachment without an authenticated upload actor; authenticated
  document uploads still record the actor.
- Import public careers and internal recruitment forms, private applicant files,
  task/support aggregates, CSV/XLSX exports and period snapshots. Task and Support
  exports contain aggregates rather than individual evidence or contact details.
  Reports navigation stays disabled because the incoming commit has no Reports
  page; the new reporting APIs remain available.
- Preserve the layered product artwork while clipping horizontal overflow at the
  product section boundary on narrow screens.

## Database reconciliation

The two incoming September migrations recreate tables and enums already created
by the existing history. Running them in either a fresh install or a populated
local database would conflict with established structures.

Their original SQL is preserved unchanged under
`apps/api-ts/prisma/migration-sources/operations-completion/`. The new active
`20261007010000_operations_reconcile` migration adds only the new structures after
the existing twenty migrations. Check migration history before using this branch
in an environment that applied the incoming September migration names.

All 21 active migrations apply to a fresh PostgreSQL test database. An upgrade
of the previous test database preserves every row and field checked across 16
existing tables. The backed-up local preview upgrade preserves every row and
field in all 29 existing application tables. Prisma reports no schema drift.

## Verification

- Original local validation: 47 API unit tests, 75 real PostgreSQL integration
  tests and 19 web tests pass (141 total), together with workspace typechecks
  and production builds. The shared handoff excludes one local demo configuration
  test; all 140 shared tests, workspace typechecks and a clean production build pass.
- Merge integration tests cover the full role matrix, public application/private
  attachment flow, versioned HR review, customer-owned configured requirements,
  unchanged legacy documents, aggregate reports, CSV/XLSX and snapshots.
- Production browser checks use synthetic API responses for careers retry and
  attachment application, HR job/review forms, requirement configuration/upload/
  review, existing Records/Clients filters, paging, date validation, drafts and
  linked records, explicit release writes, access clearing and mobile layouts.

These checks do not constitute named business UAT or production acceptance.
Production email setup remains deferred. Approved document requirements,
recruitment retention, final report families and field access, deployment and
handover remain subject to the scope matrix and client review.
