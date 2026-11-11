# Operational staff assignments — 2026-11-10

F01/F03/F07/F16 already provide account hierarchy, Agent-profile linking, batch
Manager/Handler assignment and linked customer access. This work hardens the
existing assignment service and verifies reassignment through the real API.

## Behavior

Every submitted non-null Handler must be an active Handler account, and every
submitted non-null Agent profile must be active. Previously, validation ran only
when the ID changed, allowing a retained inactive Handler/profile or a former
Handler who changed roles to pass validation while another assignment changed.
Rejected updates leave the batch and its version unchanged. COO can clear invalid
assignments with null values and select valid replacements through the existing
controls. Historical assignments are not automatically rewritten.

The fix removes the two ID-change exceptions in `RecordsService.assignBatch`.
Controller authorization, transaction handling, role checks, audit history and
live invalidation remain in the existing service flow. No new abstraction,
dependency, permission, migration or UI was needed.

## Verification

The new regression reproduced an HTTP 200 response for a retained inactive
Handler before the fix; the fixed API returns 400. It also checks retained
wrong-role Handlers, inactive Agent profiles, rollback and clearing assignments.

A new API scenario moves an Agent between Pioneer teams. It verifies both
Pioneer and Coordinator networks, immediate Agent session revocation, one
assignment audit entry, rejection of stale versions and restoring the assignment
with the current version.

All **28 PostgreSQL integration tests** passed across:

- `apps/api-ts/test/role-access.integration.test.ts` (13 scenarios).
- `apps/api-ts/test/operational-handoffs.integration.test.ts` (6 scenarios).
- `apps/api-ts/test/payment-workflow.integration.test.ts` (9 scenarios).

These include batch/record scope, customer document isolation, enrollment
authority, Handler reassignment, current notification recipients, invalidation of
review readiness and Finance-only final verification. Tests used a freshly
migrated isolated `freshphones_assignments_green_test` database with a
non-superuser application role. None failed or skipped. API TypeScript and
repository formatting for the two edited code files passed.

Local logs: `/tmp/freshphones-rbac-20261110/assignments-before.log`,
`assignments-after.log` and `assignments-typecheck.log`.

## Remaining acceptance

No real reporting roster was supplied or invented. COO still needs to enter and
accept the actual staff hierarchy, Agent/customer links and batch assignments
with named users. Moderator task-assignment authority remains undecided. No
commit, push, preview rebuild or deployment was performed in this session.
