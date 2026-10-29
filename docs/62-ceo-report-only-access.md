# CEO report-only portal

**Current naming correction, 2026-10-28:** Owner and CEO are one business role,
displayed as Owner / CEO with report-only access. Technical maintenance uses internal
SYSTEM_ADMIN. [Current role merge](67-owner-ceo-role.md) supersedes conflicting
OWNER-as-administrator code references below.


Client rule confirmed and implementation requested on 2026-10-26: the CEO views
reports only. This supersedes V4's CEO executive approvals. Other client workflow
changes, deployment and third-party work remain outside this implementation slice.

## Access

The distinct `CEO` role has `REPORT_VIEW` only. The portal contains the executive
overview and Reports. Existing payment, collection, reconciliation, task/KPI and
support reports, filters, saved figures, submitted analysis and CSV/XLSX downloads
remain readable. Downloads do not change business records.

The CEO overview now includes interactive monthly collection comparisons,
payment-status counts and current batch-balance rankings. Detailed and saved
reports include charts built from their own figures. See
[CEO report visualizations](63-ceo-report-visualizations.md) for data definitions,
design rationale and validation.
The subsequent [client-portal design alignment](64-ceo-client-portal-design.md)
changes the CEO presentation while retaining these access rules.

The CEO cannot enter operational modules, view private operational details,
record/verify payments, enroll members, edit personnel, grant access, manage tasks,
approve HR actions, change settings or perform retention/deletion work. Report
saving and analysis submission require `REPORT_WRITE`, which existing non-CEO
report writers retain.

The API enforces permissions independently of navigation. CEO requests to
authenticated endpoints without explicit business permissions are denied by
default. Explicit own-account identity/security and privacy-notice actions remain
available. Public pages retain public access. The CEO overview uses report
aggregates, refreshed every 30 seconds and on window focus, without operational
event streams or staff work queues. Direct
operational page visits show No access without mounting the workspace.

## Existing accounts and migration

Two migrations add the enum value, then map legacy business `OWNER` accounts to
`CEO`. The second migration preserves IDs, names, credentials, financial records
and history; increments account versions; clears the separate confidential-HR
flag; and records `account.ceo_role_migrated` audit entries. The audit source
explicitly identifies the data migration. Existing database controls revoke
sessions when the role changes; the executive signs in again as CEO. Every
subsequent request checks the current database role. Operational notification
emails are no longer queued or delivered to the report-only CEO.

The legacy `OWNER` code is retained and labeled System administrator for separately
provisioned technical administration. No replacement administrator is created and
no administration is granted to CEO or COO. COO access-grant implementation is a
separate slice. Verify the account roster before any future deployment; deployment
remains deferred.

The ignored local demo helper maps the existing executive identity to the CEO
button and offers no technical-administrator preview. A fresh checkout still
needs the private helper and preview database documented in README.

## Verification

The focused PostgreSQL suite covers report families/history/exports, direct
operational read/write denial, report write denial, unchanged record counts after
denial, current-role checks after a writer becomes CEO, and Finance-only financial
verification. Run with a dedicated local database whose name ends in `_test`:

```bash
pnpm --filter @fresh/api-ts test:ceo
```

The web suite also checks the report-only grant and permitted workspace paths.
Local results: 64 API unit, 92 web, 77 core integration, 4 CEO integration, 8 report
integration, 1 report-analysis and 9 authentication/MFA tests passed (255 total).
Workspace typechecks, API/web builds, formatting and whitespace checks passed.
Migration rehearsal preserved credentials, identities and payment history. Browser
checks covered report families/CSV, all thirteen blocked operational routes,
light/dark/mobile, retained Finance authoring and the customer portal. Evidence is
in the ignored `.local/ceo-access/` directory. The local preview database has the
migrations; production deployment and client UAT remain separate.

## Local demonstration data — 2026-10-26

The local preview contains five clearly marked `CEO-DEMO-*` batches, 36 fictional
members, 135 payment records, 20 tasks, 16 support cases and 19 saved reports.
The examples cover September and October 2026, including partial payments,
pending/clarification/rejected claims, completed and planned batches, duplicate
GCash references, task timing and support outcomes. No real funds were received.

Twelve incorrectly generated planned-batch sample credits were reversed through
the existing Finance adjustment ledger. Original entries and earlier saved
figures were retained; updated snapshots explain the corrections. The planned
batch has zero net collections and the completed batch has zero outstanding
balance. Verification/adjustment actions belong to the existing Finance demo role,
not CEO. The initial stored entries plus twelve reversals are intentional history.

To explore, open the CEO overview, then Reports. Compare September with October,
select a `CEO-DEMO-*` batch and expand saved reports to read sample analysis or
compare figures before and after the corrections. A saved payment report without
analysis also demonstrates the CEO's read-only empty-analysis state.

The private fixture script and verification artifacts are in ignored
`.local/ceo-access/`. The loader requires an existing local development `_preview`
database and demo staff; it does not reset the database or change credentials or
role grants. Original core records were checked for changes, and a rerun creates
no duplicates. Database/API totals, report history, filters, CSV and mobile browser
checks passed. This is a data-only follow-up; no application access changes or
external deployment were made.
