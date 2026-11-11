# COO requirements and remaining work — 2026-11-09

Source: client requirements F01–F20 in [62](62-client-feature-implementation-backlog.md),
current role rules in [66](66-role-access-alignment.md), feature delivery guides and the
[remaining-work review](116-remaining-system-work.md). This is a scoped backlog, not a
new acceptance test of all features. Existing implementation must not be recreated
because an older planning document calls it pending.

F03 monitoring is implemented locally, with a 24-hour default review deadline and
forced RLS on the new monitoring tables. See [implementation and security](125-operations-monitor.md).
F19 handoffs are implemented locally; see [126](126-workflow-handoff-notifications.md).
Operational assignment checks and a confirmed inactive-selection fix are verified locally
in [128](128-operational-assignment-verification.md); client acceptance remains separate.

## Implementation sequence

1. **F03: Operations monitoring queue — implemented locally.** See
   [125](125-operations-monitor.md): recorded-payment missing proof, stage/age/status,
   returned statements, authorized exact-record links, scoped Moderator metadata,
   manual follow-ups/history and COO-configured deadlines. Expected receipts for
   unrecorded payments and statement frequency still need business policy. The
   current review deadline defaults to 24 hours and is configurable by COO. Named-user and production acceptance
   remain open. F19 implementation is recorded below.
2. **F19: In-app handoffs — implemented locally.** Submission/completeness,
   returns/corrections, Manager cross-check, Finance-ready and open follow-ups now
   appear for current authorized recipients with exact links and deduplicated,
   versioned read/read-all state. Existing enrollment/Finance/task alerts remain.
   See [126](126-workflow-handoff-notifications.md) for verification. Any additional
   escalation timing and external delivery remain deferred.
3. **F01/F03/F07/F16: Operational assignments — locally verified and hardened.** Real Agent/Pioneer/Coordinator
   relationships, Agent-account/customer links, batch Manager/Handler assignments,
   unassigned/inactive staff and reassignment behavior. Account and assignment controls
   already exist. The API now rejects retained inactive/wrong-role Handlers and inactive
   Agent profiles, while allowing invalid assignments to be cleared. Hierarchy moves,
   session revocation, audit and stale edits are covered by API tests; see
   [128](128-operational-assignment-verification.md). Named-user roster acceptance
   remains open. Confirm Moderator task-assignment authority before exposing it.
4. **F06/F08: Submission checklist implemented; operational acceptance remains.**
   Company-wide declared receipt/statement requirements now gate Manager approval
   and Finance verification; see [129](129-submission-checklist-verification.md).
   Records/COO must supply actual expected evidence. Statement frequency and account
   ownership remain open; unpaid scheduled installments are not missing receipts.

Local demo workflow links are now verified on an isolated database; see
[130](130-demo-workflow-links.md). The running preview was not reseeded.

## Existing COO capabilities — acceptance or confirmed-gap fixes

- **F01/F02:** business account/role administration and audit, executive restrictions,
  CEO report-only boundaries and separate confidential-HR grants.
- **F04–F08:** assigned Handler receipts, private GCash PDF revisions, Records review,
  assigned Manager cross-check and Finance-exclusive final decisions. Accept corrections,
  retries, reassignment and representative statements end to end.
- **F10:** scheduled installment and collections reports, role-scoped exports and saved
  analysis. Approve report fields, period meanings and totals. Define commission/margin/
  profit inputs before labeling any figure as earnings or profit.
- **F11:** COO withdrawal/refund decisions, CEO consultation record, replacement admission
  and Finance-recorded external refunds. Both live replacement arrangements and
  partial/final refund recording were reverified; unauthorized Finance enrollment
  links were fixed in [132](132-withdrawal-replacement-verification.md).
  Approve company-wide wording and named-user acceptance.
- **F12:** replacement continuation/restart is implemented. Any additional non-replacement
  ongoing-batch join, catch-up obligation or release arrangement needs confirmed policy
  before implementation.
- **F13/F14/F20:** eight-member capacity, staff-only display positions, manual/automatic
  activation, installment calendars/first due dates and Agent-based numbering. Accept
  concurrency, historical-plan protection and the actual business settings.
- **F15/F16:** independent memberships, Agent enrollment and assigned Manager approval
  with COO oversight. Accept duplicate/capacity, correction and cross-membership isolation.
- **F17:** editable website intake, immutable versions, Agent forwarding, printable
  membership application summary. User selected existing signed PDF/image upload on
  November 10; private upload → Records clarification/replacement → approval is verified
  in [133](133-f17-signed-agreement-verification.md). Approved agreement template/wording
  is unavailable for now, so agreement-content acceptance remains pending;
  synchronization with Google Forms stays deferred.
- **F18:** user retained the current Excel workbook format on November 10. Delivered
  workbook integrity and expanded local calculation checks are in
  [134](134-f18-payroll-acceptance.md), with a concrete Excel acceptance checklist.
  Actual Excel runtime, company rules and named-user acceptance remain pending.
- **F19:** enrollment, Finance and task notifications already exist. Broader workflow
  handoffs are now implemented locally; named-user acceptance remains open.
- **F09:** strict local payment-match suggestions are implemented in the GCash review
  workspace; see [131](131-gcash-payment-match-suggestions.md). Duplicate references
  remain ambiguous and only Finance verifies payments. Accept real statement
  formats and the full review journey with named users.


## Decisions and launch acceptance

- HR role-grant delegation; legacy Analytics reassignment; catalog ownership.
- Moderator task-assignment authority, expected evidence, overdue thresholds and escalation.
- Any additional ongoing-batch/catch-up/release rules; company-wide refund policy.
- Approved agreement, public offer/catalog/contact content, privacy notices, retention,
  export/deletion/legal hold and incident/access-review ownership.
- Named COO/Records/Manager/Handler/Finance/Agent/customer acceptance; permissions/private
  files, mobile/keyboard/non-Chromium, realistic backlogs, concurrent changes and retries.
- Fresh AI acceptance, confirmation/cancellation/conflict handling, authorized data scope,
  provider failures and Redis-backed history. AI is implemented, not a missing module.
- Scope/documentation reconciliation, reviewed release commits, regression checks and
  handover/launch approval.

Hosting, staging/production provisioning, migration/restore rehearsal, live email,
GCash/bank APIs, external OCR, Google Forms/Sheets sync and SMS/messaging remain deferred
until separately resumed. A website payroll engine is outside the requirement.
