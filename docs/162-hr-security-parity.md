# HR security validation against COO

Validated locally on 2026-11-20 on `feature/hr-personnel-workspaces`.

HR now receives the existing COO account request budgets: 300 reads per minute,
30 writes per minute and 300 writes per hour by default. The existing general
account limits also apply. Budgets are keyed by account and shared across API
instances through the existing abuse service; changing query parameters or retry
keys does not reset them. Existing `cooRead` / `cooWrite` configuration overrides
apply to both roles.

The existing transaction-based JSON write replay helper now supports HR_PAYROLL
as well as COO. Recruitment, personnel submissions, task/KPI and notification
writes already using that helper receive the same protection for keyed requests.
HR action proposals now call the helper after checking current confidential access,
inside the same transaction as their record, audit and change event.

Keys remain scoped to the authenticated account, bound to the request intent and
current confidential grant, validated and hashed before storage. Concurrent retries
return the committed result without repeating writes. Changed intent and expired
keys return 409; malformed keys return 400. Unkeyed clients retain their existing
contract. Authorization is checked before replay, and the current active role is
rechecked inside the transaction. The web API client already creates a key once
per request and preserves it through a session-refresh retry.

Existing role boundaries remain enforced: HR cannot create personnel accounts,
grant itself access or decide consequential HR requests. COO personnel enrollment
and the administrator's HR decision endpoint retain their separate permissions.
Confidential grants, revocation, MFA, origin checks and private file authorization
continue using the shared guards/services. Private HR responses remain `no-store`;
this change does not add an HR response cache.

## Evidence

Before the fix, six concurrent identical HR job requests created six records;
malformed keys were accepted, HR bypassed the stricter COO budget, and HR action
retries returned a duplicate-request conflict. The new tests reproduced these
failures before implementation. Revoked sessions already failed closed.

After the fix, **68 integration tests and 40 unit tests pass** against the isolated
`freshphones_hr_20261119_test` database. Integration coverage includes the COO
security baseline, the new HR security suite, confidential HR, consequential HR
actions, personnel onboarding, role access and MFA. API TypeScript, scoped repository
formatting and whitespace checks pass. Logs: `.local/hr-security-20261120/`.

Repeat the focused HR validation with a migrated dedicated `_test` database:

```bash
pnpm --filter @fresh/api-ts test:hr-security
pnpm --filter @fresh/api-ts test:coo-security
```

The new suite is also included in `test:integration`. No migration is required.
Production configuration, production capacity and named business/browser acceptance
were not established by these automated checks.

Local runtime check: started the API on 4101 and the protected existing web build
on 3000. The preview database lacked the earlier personnel onboarding migration,
causing its queue to return 500. Created a private local PostgreSQL backup and
verified its archive directory before applying the existing
`20261119090000_personnel_onboarding` migration. HR demo login, `/auth/me`,
`/personnel/onboarding` and `/hr-actions` now return 200. The backup is ignored at
`.local/hr-security-20261120/preview-before-onboarding.dump`; a full restore rehearsal
was not performed.

The implementation reuses the existing COO transactional locking/replay pattern.
Inspected captured upstream evidence: PostgreSQL `pg_advisory_xact_lock_int8`,
[`lockfuncs.c`](https://github.com/postgres/postgres/blob/00e67fb46d07467ff8e4f1c8ab2dab04c009a124/src/backend/utils/adt/lockfuncs.c)
from REL_18_1. Capture: `.local/coo-backend-security-20261113/primary-sources.json`.
The source shows an exclusive transaction-scoped advisory lock; the local PostgreSQL
integration tests verify the relevant concurrent replay behavior. Live OpenCLI
browser retrieval was unavailable, so no newly fetched upstream content is claimed.
