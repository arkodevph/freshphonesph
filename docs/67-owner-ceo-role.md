# Owner / CEO — one business role

On 2026-10-28, Jaycee corrected the role summary: Owner and CEO are the same
business role. The canonical account role is `CEO`, displayed as **Owner / CEO**.
Its permissions remain report-only: view/export the five report families and read
saved reports/analysis. It cannot author reports, perform operational work, manage
roles or verify payments. COO retains business operations and role administration;
Finance alone verifies/corrects financial credit.

## Compatibility and maintenance

Legacy `OWNER` input is normalized to `CEO` on account creation, account updates,
role filters and session identity. Legacy permission checks also give `OWNER` only
`REPORT_VIEW`, so old spelling cannot recover technical privileges. Account/login
choices contain one business Owner / CEO entry. Existing CEO account IDs, names,
credentials and history remain unchanged; this does not combine people or delete
accounts.

The old technical-maintenance permission set uses the explicit internal code
`SYSTEM_ADMIN`. It remains outside the business-role list, is unavailable to COO
provisioning and is excluded from business team/task scope. No administrator account
is created automatically. This preserves existing maintenance and approval endpoints
without treating the business Owner as a technical administrator.

Two forward migrations introduce the technical code and align any remaining `OWNER`
accounts to `CEO`. They audit each conversion, clear confidential grants, increment
its version and revoke current/legacy sessions. Historical references and enum values
remain readable, while a database constraint prevents new `OWNER` account rows.
Historical migrations are unchanged.

## Verification

Evidence is in ignored `.local/owner-ceo/`. The migration rehearsal starts from the
previous schema with a synthetic legacy Owner, existing credential linkage, sessions
and a recorded payment. It verifies the same identity/credentials/payment history,
canonical CEO, one audit, revoked sessions and zero provisioned administrators.

The focused authorization tests cover Owner/CEO equivalence, old API input,
report-only access, denied operational/financial/admin requests, COO creation of the
merged business role, and rejection of new legacy database rows. Web checks cover a
single business choice and direct navigation denial even with stale claimed grants.
Final validation: **375 automated scenarios pass**: 185 distinct PostgreSQL integration,
68 API unit, 109 web and 13 Redis. One optional Redis interruption case is skipped.
The full integration run passed 183 cases; two assertions still expected the old Owner
access-denial wording. After updating those assertions, both complete scenarios passed
in a fresh isolated database. The nineteen focused authorization cases are included in
the integration total, not counted twice.

Contracts/API/web typechecks, API and optimized-web builds, formatting and whitespace
checks pass. Three browser groups verify Owner / CEO report-only desktop/mobile access,
loaded reports/charts, denied administration, COO's single business role choice and
legacy role filter, and retained Finance workspace. Browser page errors: zero.
The preview migration is applied and backed up. Existing two CEO identities remain;
there are no OWNER account rows or automatically created technical administrators.
Local web/API/worker services run at http://localhost:3000/login and API port 4100.
See `.local/owner-ceo/validation-summary.json`, test/build/migration/browser logs and
screenshots; `owner-ceo-only.patch` isolates this follow-up from earlier shared work.

This update supersedes earlier documentation that called the technical `OWNER` code
a separate business Owner role. Other role grants and unresolved HR delegation,
Analytics reassignment and catalog ownership decisions are unchanged.

Work remains local; no push or deployment.
