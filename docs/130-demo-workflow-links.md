# Local demo workflow links — 2026-11-10

The private local `apps/api-ts/scripts/seed-demo.ts` helper now assigns DEMO-001
to canonical BATCH_HANDLER and BATCH_MANAGER accounts, creates or reuses the
DEMO-AGENT profile, links its AGENT account to PIONEER_AGENT and then
OPERATIONS_COORDINATOR, and preserves the existing linked customer.

Previously the helper assigned only the legacy CORE_HANDLER account and did not
establish the current Manager/Agent team links. The helper remains ignored by Git
and retains its local development, loopback and `_preview` database restrictions.
No real staff reporting relationships are inferred.

Verified by running the seed twice against newly migrated isolated
freshphones_seed_verify_preview, then checking the stored Handler/Manager roles,
Agent profile, full supervisor chain, customer membership and absence of duplicate
batch/Agent/customer records. Evidence:
`/tmp/freshphones-rbac-20261110/seed-verify.log`.
The existing running preview was not reseeded or rebuilt.

The 20 existing source formatting differences were also normalized using the
repository formatter, which checks runtime syntax equivalence before writing.
API and web TypeScript checks passed after that formatting pass. Final formatting
and API TypeScript logs are `next-final-format.log` and `next-final-types.log` in
the same temporary evidence directory.

Real operational inputs and named-user/browser acceptance remain pending. No
commit, push or deployment was performed.
