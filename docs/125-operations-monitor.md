# COO operations monitoring queue

Implements F03's queue for existing payment and GCash statement records at
`/system/operations-monitor`. This is an operational follow-up workspace; it
cannot approve receipts, verify payments or change customer balances.

## Access and data

COO and System Admin can monitor all batches. Operations Coordinator / Moderator
sees only the active Agent → Pioneer → Coordinator network, using the same scope
as existing batch access. Other roles are denied by both route and API policy.
The list/detail payload contains batch codes, source IDs, stage, age, responsible
staff and follow-up metadata. It omits customer details, amounts, references,
receipt contents and file IDs. Source links require the corresponding read
permission; Moderator receives no payment/statement links. Notes explicitly ask
staff to keep private financial/customer details out of operational handoffs.

## Stages and time

- Payment without proof or returned for correction → assigned Handler.
- Current evidence without a valid Records approval → Records team.
- Current evidence without a valid assigned Manager approval → Manager.
- Current valid Records and Manager approvals → Finance team.
- Submitted statements → Records; returned statements → Handler.
- Final payments and reviewed/archived statements leave the active queue unless
  an open manual follow-up remains. Resolved follow-ups can be viewed separately.

Reviewer deactivation, role changes, batch revisions and corrected evidence are
re-evaluated on every read. Finance eligibility remains enforced by the existing
payment service. Records and Finance are team queues, not invented individual
assignments. The UI reports unavailable/inactive Handler and Manager assignments.

Declared submission-checklist blockers keep payments at Records even when their
individual receipt has already passed Records review. These rows belong to the
Records team, carry no Manager assignment, and retain the payment's evidence
waiting time until the package is complete. They do not appear in a Manager's
responsible-staff filter merely because receipt review has finished.

The user set a 24-hour review deadline on 9 November 2026. It is the default
when no saved rule exists; COO can configure another interval. Explicit follow-up
due dates also produce overdue flags. Policy changes use version
checks and an audit trail; the singleton policy has a stable UUID audit identity.
Dates in the follow-up form are Philippine time regardless of browser timezone.
Expected missing payments/receipts and statement frequency remain undecided; the
queue detects absent proof on recorded payments, not hypothetical submissions.

## Follow-ups

Open, update, resolve and reopen a follow-up with a required note and optional due
date. Every write creates append-only history and an audit entry. Source and
follow-up version checks reject stale changes. The write uses the existing
operations advisory lock shared with payment/GCash writes. Conflicts preserve
the note and require refreshing source details. Resolving a flag does not resolve
the underlying review. Lists/counts are filtered in PostgreSQL before pagination;
detail history is paginated. Lists refresh on live invalidations, focus and a
30-second interval. Background refresh retains an unsaved deadline draft.

## UI reference and verification

Primary: [Untitled UI tables](https://www.untitledui.com/react/components/tables),
reopened through OpenCLI on 9 November 2026; screenshot
`/home/nami/.agent-reach/design-references/freshphones-monitor-table.png`. Uses its compact panel heading, neutral
column headers, readable rows and restrained row separators with Freshphones
theme tokens. Queue categories replace reference selection controls; filters,
follow-up actions and source type reflect actual operations. Negative pattern:
the retained 12-second border scorecard at
`/home/nami/.agent-reach/design-references/nami-principles-2026-11-07/borders-frame-12.png`
uses redundant vertical/horizontal partitions. Keep one panel and useful row separators,
without boxing every value. Narrow screens scroll the table. No new dependency.
The Linear views URL returned 404 and the alternate CRM capture had an unloaded image;
neither supplied visual implementation evidence.

Run `test:monitor` in `apps/api-ts` with an isolated local `TEST_DATABASE_URL`
ending in `_test`, after migrations. The integration suite covers role/network
scope and privacy, stage/filter derivation, assignment/reviewer invalidation,
append-only/audited history, concurrent/stale saves, unchanged payment data,
COO-only policy configuration and query validation. A synthetic 2,500-item test
backlog also exercises EXPLAIN ANALYZE for COO and Coordinator list queries;
local timings do not establish production performance. Web tests cover route denial
and Philippine-time round trips. Runtime/visual acceptance is recorded separately
in project memory; do not infer it from test source.

F19 in-app workflow handoffs and declared submission checklists are implemented
locally; see [126](126-workflow-handoff-notifications.md) and
[129](129-submission-checklist-verification.md). External messaging, unapproved
escalation rules and automatic statement-frequency rules remain deferred.

### Verification update — 10 November 2026

F03 was rechecked against the current submission-checklist implementation. A
regression test first reproduced a Records-stage item retaining the Manager's
responsible ID. The query now applies the same completeness gate to the review
stage, responsible staff and Manager waiting-time calculation. The regression
also checks the staff filter and return to Manager after a declared blocker is
cancelled.

All six monitoring integration tests passed on a freshly migrated, isolated
PostgreSQL database using a non-superuser without BYPASSRLS. Five focused web
tests passed for monitoring dates and workspace access. The 2,500-item query-plan
checks passed; measured list queries were approximately 469ms for COO and 494ms
for Coordinator on this local test run. Logs are in
`/tmp/freshphones-f03-20261110/`. This update does not establish named-user or
production acceptance.

## Row-level security

Migration `20261109130000_operations_monitor_rls` enables and forces PostgreSQL RLS
on `OperationsMonitorPolicy`, `OperationsFollowUp` and `OperationsFollowUpEvent`.
It follows the original table migration without editing its applied checksum.
The API rechecks the active account and sets `app.monitor_actor_id` with
transaction-local `set_config(..., true)`. Missing context is denied; context does
not survive pooled connection reuse. The server supplies this identity, never an
HTTP request field. Database credentials remain server-only; principals must not
have superuser or BYPASSRLS privileges.

COO/System Admin can view monitoring records across batches. Coordinator access
requires the current active Agent → Pioneer → Coordinator hierarchy. The same
policy scopes inserts/updates and event history; forged event authors are denied.
Only COO can insert/update the review policy. There are no follow-up DELETE or
history UPDATE/DELETE policies; the history trigger remains append-only.

These policies cover the three new monitoring tables. Existing payment and GCash
source endpoints retain their existing server-side permission/assignment checks;
this change does not claim RLS has been installed on every business table.

## Nami UI pass

Nami retained Untitled UI's single-table hierarchy and corrected the filter layout
so the follow-up selector no longer sits alone on desktop. Inputs group into a
responsive grid, the search action stays with its field, and empty results render
outside the wide table so mobile users can read them without scrolling sideways.
The follow-up dialog keeps its header/actions visible while history scrolls, with
a full-width primary action on narrow screens. Interactive controls use at least
44px height. Dark navigation and primary-button foregrounds use explicit readable
state colors; the parent shell's older light-state tokens do not hide the active link.
