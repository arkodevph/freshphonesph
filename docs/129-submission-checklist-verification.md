# Submission checklist verification — 2026-11-10

Company-wide submission requirements are implemented in the current workspace.
Records and COO declare expected receipts and statements by batch and reporting
period, link submitted evidence, and cancel mistaken expectations with a reason.
Writes use versions, authorization checks and audit entries.

Manager approval and Finance verification recheck completeness on the server.
Recorded claims with missing or returned evidence block their declared period;
unpaid scheduled installments are not treated as missing receipts. Required
statements need a current independent review by an active Records user. Archival,
corrections and revoked reviewer eligibility can invalidate readiness.

The Payments workspace includes the checklist and expectation controls. Company
statement cadence, account ownership and real expected receipt lists still require
operational input; no automatic reporting schedule is inferred.

## Verification continuation

The previous web run passed 197 tests and completed its production build. The
previous API failures exposed two verification setup problems: the default Python
interpreter lacked pypdf, and the monitor fixture created a statement without its
uploaded revision. This continuation installed the pinned PDF requirements in an
isolated temporary environment and added a synthetic uploaded revision to that
fixture. Application authorization and review rules were preserved.

The resumed API run uses a newly migrated database owned by the non-superuser
freshphones_rbac role. Its log is
`/tmp/freshphones-rbac-20261110/resume-tests.log`; type checking is recorded in
`resume-types.log`. The PDF interpreter is configured with `GCASH_PYTHON_BIN`
pointing to `/tmp/freshphones-rbac-20261110/pdf-venv/bin/python`.

No commit, push or deployment was performed. Browser acceptance with named users
and production acceptance remain unverified.

Final results: 63 scenarios outside the monitor suite passed in the combined
69-test run. All six monitor scenarios then passed on a fresh database after
fixing the overdue fixture to represent a pending submission and clear prior
review metadata. This covers all 69 targeted scenarios with no remaining failures.
The final monitor log is `monitor-verified-tests.log`.

API TypeScript and the edited test's Prettier check pass. Repository-wide custom
formatting reports 20 existing files needing formatting outside the edited test;
these were left untouched. This is a remaining repository check failure, not a
clean full-repository verification claim.
