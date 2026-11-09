# COO requirements and remaining work — 2026-11-09

Source: client requirements F01–F20 in [62](62-client-feature-implementation-backlog.md),
current role rules in [66](66-role-access-alignment.md), feature delivery guides and the
[remaining-work review](116-remaining-system-work.md). This is a scoped backlog, not a
new acceptance test of all features. Existing implementation must not be recreated
because an older planning document calls it pending.

## Implement first

1. **F03: Operations monitoring queue.** Missing receipts, incomplete submissions,
   overdue Records/Manager/Finance reviews, returned evidence and unresolved follow-ups;
   batch, responsible staff, stage, age and status; filters and authorized exact-record
   links; manual flags and follow-up history. Establish the source of expected receipts
   and the overdue thresholds. Moderator monitors and follows up without approving money.
2. **F19: Complete in-app handoffs.** Submission/completeness, returns/corrections,
   Manager cross-check, Finance-ready and unresolved follow-ups. Preserve existing
   enrollment/Finance/task alerts; authorize recipients and deep links, dedupe events,
   support unread/read state. Confirm timing and escalation rules. External delivery
   stays deferred.
3. **F01/F03/F07/F16: Verify operational assignments.** Real Agent/Pioneer/Coordinator
   relationships, Agent-account/customer links, batch Manager/Handler assignments,
   unassigned/inactive staff and reassignment behavior. Account and assignment controls
   already exist; fix confirmed gaps rather than rebuilding them. Confirm Moderator
   task-assignment authority before exposing it.
4. **F06/F08: Agree package completeness.** The per-payment approval chain is implemented
   in [123](123-payment-operational-review-chain.md). Decide expected receipt lists,
   whether period statements are required, frequency/account ownership and whether a
   package must be complete before a payment can advance. Add package enforcement only
   for confirmed rules.

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
  and Finance-recorded external refunds. Approve rules and named-user acceptance.
- **F12:** replacement continuation/restart is implemented. Any additional non-replacement
  ongoing-batch join, catch-up obligation or release arrangement needs confirmed policy
  before implementation.
- **F13/F14/F20:** eight-member capacity, staff-only display positions, manual/automatic
  activation, installment calendars/first due dates and Agent-based numbering. Accept
  concurrency, historical-plan protection and the actual business settings.
- **F15/F16:** independent memberships, Agent enrollment and assigned Manager approval
  with COO oversight. Accept duplicate/capacity, correction and cross-membership isolation.
- **F17:** editable website intake, immutable versions, Agent forwarding, printable
  membership application summary. Signed agreement text/fields/signature evidence still
  need approval; synchronization with Google Forms stays deferred.
- **F18:** spreadsheet payroll package exists. Align it with the chosen spreadsheet format
  and approved human rules; verify it in the client's Excel/Sheets environment.
- **F19:** enrollment, Finance and task notifications already exist. Broader workflow
  coverage is the implementation gap listed above.
- **F09:** local PDF extraction, correction/review and reconciliation assistance exist.
  Verify statement formats and any missing automatic match suggestions against confirmed
  reference/amount/date rules. Assistance never automatically verifies a payment.

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
