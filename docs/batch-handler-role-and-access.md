# Batch Handler — role and portal access

Last verified: **2026-11-11**, against local merge `020aa4c` plus the Handler
Phase 1 workspace, Phase 2 document controls, Phase 3 review notifications and
Phase 4 staff password form on `feature/batch-handler-workspace`.
Role code: `BATCH_HANDLER`. Legacy alias: `CORE_HANDLER`.

This reference records current permissions and implementation. It does not grant
new authority or establish new business policy. Recheck the source when access
rules change.

## Quick summary

The Batch Handler manages payment submissions and assigned operational work.

- Sees only **currently assigned batches, members, schedules and balances**.
- Records external payments as **pending claims**, attaches receipts, and corrects
  eligible pending or returned claims.
- Tracks **Records → assigned Manager → Finance** review progress and results.
- Opens **bell → View all notifications → Payment reviews** for Records/Manager approvals and returns,
  saved reviewer notes and the current payment status.
- Uploads GCash statement PDFs, reads their history, and resubmits returned PDFs.
- Works on their own assigned tasks and reads personal notifications.
- Changes their own password in Account security, manages MFA/sessions and portal preferences.
- Cannot approve payments, change verified credit, administer accounts, edit
  batches/members, or access unrelated records.

Only Finance-verified payments affect the customer's balance. Recording or
scanning a receipt does not verify it or move money.

## Access boundary

Batch, client, payment, receipt and GCash access follows the batch's **current
Handler assignment**. Changing an assignment changes access, including access to
historical files and operational review detail access. Saved inbox cards remain
personal history after reassignment, with identifying context redacted and the
record link removed. Task detail access remains limited to the Handler’s own
assignments.

Payment writes also require an open membership. An assignment does not permit
editing verified/rejected payments or overriding another role's review.

## Current capabilities

| Area | What the Handler can access and do |
| --- | --- |
| Dashboard | Dedicated Handler home using the customer portal's theme/layout. View assigned active-batch, member and ready-for-release counts; returned claims/notes; complete pending missing-proof counts; recent review stages; and own open tasks. Open exact claims and filtered queues. Additional scoped payment summary data remains available through the API. |
| My Batches | Search/filter assigned batches and sort Batch, Unit, Price or Installments across all matching records. Right-aligned tabular numbers, single-line text with full tooltips, 40/48/56px row density, pinned batch identity and sticky headers keep the table readable. Open View members from each row's action menu; the touch menu stays visible. |
| Members & Schedules | View assigned members' profiles/contact details, membership status and release status. View schedule opens a themed read-only modal with member/batch/unit context and installment cards for due dates, current expected amounts and original/released obligations when applicable. Refresh, loading/retry/empty/access-loss states, keyboard/phone support and focus return are included. Statement of account remains a separate action. |
| Payment records | Search/filter assigned payments by status, member, batch, date or reference. A Proof column shows green With proof / amber No proof badges with text labels in both themes, based on the current receipt attachment and independently of verification status. Read pending, clarification, verified and rejected records, receipt proof, recording/decision notes, review history and read-only credit-adjustment evidence. |
| Record payment | Create a pending claim for an assigned member. Receipt proof and scanning are optional at entry; the Handler confirms recording without proof. The saved claim provides Attach proof for later, and it does not affect credit/balance before Finance verification. Payments happen through external channels. |
| Receipt assistance | Scan supported receipt images to help fill payment details, check/correct extracted values and see scoped duplicate-reference warnings. A scan or warning is assistance, not approval. |
| Receipt proof | Attach later from the saved-payment notice, row menu or Transaction details. Upload failure retains the image for retry against the existing payment ID; a fresh scoped read checks current proof/status/access first and recognizes an already successful attachment. View/replace proof through eligible payment flows. Attachment alone does not resubmit a clarification claim. |
| Correct/resubmit payment | Correct eligible pending or clarification claims within assigned batches and open memberships. The current implementation does not restrict this to the original recorder. Corrections return the claim to pending and invalidate previous approvals. |
| Review progress | Read Records and Manager approval states, reviewer notes, evidence revisions and history; follow the payment through the Finance result. |
| GCash history | Upload a PDF for an assigned batch and covered period, with a note and optional PDF password. View extracted transactions/warnings, original/current readings, PDFs, revisions, correction/review history, activity and archived submissions. |
| GCash resubmission | Submit a replacement PDF for a period returned by Records as needing clarification, using the current version. Submitted, approved or archived periods cannot simply be overwritten. |
| My Tasks | View their own task instructions, status, priority and deadline; start a new task; submit a report or evidence attachment; read their authorized task attachments. Submission requires a report or attachment. |
| Notifications | The bell previews three recent saved updates. View all notifications opens `/system/notifications` with type filters, unread-only view, read controls and pagination. Received Handler notifications stay after reading or completing work until the recipient deletes them using a themed confirmation modal. Hover/focus includes the entire row and trash action area. Deletion affects only that inbox copy and is not reversed by refresh. Original received text supports backtracking; current payment/task access stays enforced. Retained cards are redacted/unlinked after access loss, and privacy erasure removes related copies. Review notes/current status still open through the exact record. Other staff retain their current queue behavior. |
| Account & security | View their identity/role, change their own password with current/new/confirmation fields, manage MFA/recovery codes and active sessions, read employee privacy notices and acknowledge applicable notices, switch light/dark themes, search accessible pages and log out. |

The Handler's My batches, Payments and Members & schedules lists use the saved
customer-theme table pattern: right/tabular numeric columns, hairline rows,
names-only Compact/Default/Comfortable density, pinned identity/sticky headers,
full-text tooltips and contextual row menus. Payment menus retain details, proof
and eligible claim edits; member menus retain schedule access and already granted
requirements access. Handler schedule details now open as a modal information
card, with full member/batch/unit context and an installment card list. Expected
amounts remain complete, right-aligned and tabular; zero and missing dates are
explicit. No schedule writes or new grants are introduced. Other staff views
keep their existing tables and schedule behavior.

Receipt-scanner coverage: Maya and generic Bank transfer have passed controlled
synthetic OCR/API/form checks. MariBank currently uses Bank transfer; actual
Maya/MariBank/other-bank layouts still need representative samples before QA
acceptance. A labeled ISO date (`YYYY-MM-DD`) now retains its accompanying clock
time; absence of a clock does not generate a time. Scans remain editable
candidates and do not verify payment or save a claim by themselves.

Receipt type and payment Method use themed dropdowns with local GCash/Maya
logos and bank/cash/other icons. Receipt-type changes retain scan cancellation
and extracted-field clearing;this adds no payment integration or verification
authority.

All current Handler dropdowns share searchable options, full-text hover/keyboard
previews for clipped labels and selected values, and wrapped labels on touch.
This covers batch/member status and assignment filters, both Payments client
pickers and method selectors, GCash batch/status/queue/reading/PDF controls, task
status and notification type. Escape closes the dropdown before its containing
dialog; the input keeps focus and arrows scroll only the result list. Menus fit
above/below their fields with an opaque themed surface. Original IDs/values,
required/disabled validation and scoped options remain intact. The Handler
layout enables this behavior; other staff keep native/standard controls.

Payment Client/Date and member Name/Batch sorting run over all scoped matches
before pagination. The credit/claim column preserves current and original
adjusted values; it is not misleadingly sorted by the original stored amount.

Replacing receipt proof invalidates approvals, but does **not** by itself change a
clarification claim back to pending; the correction/resubmission flow does that.
Old evidence and review history remain preserved.

## Restrictions

The Batch Handler cannot:

- Access unassigned batches, members, payment records or their private files.
- Create, edit, activate or reassign batches; enroll/edit members; issue/change
  schedules; or update release status.
- Approve Records completeness, perform the Manager cross-check, or make a
  Finance verification/rejection/clarification decision.
- Edit verified/rejected claims, adjust/reverse verified credit, or delete
  payment/review history.
- Correct extracted GCash transaction rows, approve/return statements, or
  archive/restore them. Those actions require Records review permission.
- View/upload/review customer ID and requirement documents. **Payment receipt
  permission is separate from customer-document permission.**
- Assign tasks, change task deadlines, approve reviewed completion or evaluate KPIs.
- Administer staff/accounts/roles, HR/payroll, Agents, recruitment, support/inquiries,
  withdrawals/refunds, catalog, notification templates or retention/deletion.
- Open company-wide report/export workspaces.

## Existing support versus portal work still needed

| Item | Current status |
| --- | --- |
| Dedicated Handler home | Implemented and verified locally on 2026-11-10. Customer shell/glass/card styles and mascot reused; desktop sidebar and phone navigation expose the six existing workspaces. Jaycee confirmed Phase 1 complete on 2026-11-10. |
| Account statements and payment confirmations | Member menus now open assignment-scoped Statements of Account; verified-payment menus open Payment Confirmations. Each preview has PDF download and print, using the shared customer sheet/generator. Fresh reads and export checks preserve current assignment and verified eligibility. The shared A4 document format includes the actual Fresh Phones logo, plain member details, aligned amounts and complete adjustment/release context. Operational records only; the non-BIR-invoice notice remains in preview, PDF and print. |
| Handler review-stage updates | Implemented and verified locally on 2026-11-10: bell → View all notifications → Payment reviews shows Records/Manager approvals and returns for currently assigned batches, exact-payment links, notes/current status, per-user reads and live refresh. Next-reviewer queue policy and overdue/escalation rules remain separate follow-up work. |
| Staff password-change form | Implemented and verified locally on 2026-11-10. Profile menu → Account security → Change password, using the existing 12–128 character new-password policy, optional visibility, field validation and success/error feedback. Success renews the current session, ends others and refreshes sessions; enabled/required MFA stays enforced. |
| Handler AI workspace | Not confirmed in the current route grants/source; do not present it as existing access. |

## Portal navigation

Currently permitted staff pages (Handler navigation labels):

| Handler label | Existing route |
| --- | --- |
| Home | `/system` |
| My Batches | `/system/records` |
| Members & Schedules | `/system/clients` |
| Payments | `/system/payments` |
| GCash History | `/system/gcash-history` |
| My Tasks | `/system/tasks` |

Workspace search uses the Handler theme,filters the same six accessible pages,
and supports Ctrl/Cmd-K,keyboard navigation and explicit hover/focus feedback.

Notifications and the account menu are shared controls. Account security is at
`/security`; employee privacy notices are available from the account menu.
The employee notice uses the workspace theme and existing cloud mascot, with a
section index and a **Return to workspace** header button. Its current draft
wording/version and review status are preserved.
Account security uses the shared customer/Handler theme, logo toolbar and
responsive password/MFA/session cards. It stays accessible before mandatory MFA
enrollment; workspace return is offered only when enrollment permits it. Active
sessions show five rows per page, current session first, with counts and Previous/Next
controls. Individual and all-other-session sign-out retain their existing scope.

The dedicated home prioritizes actual returned claims, missing proof on recorded
pending payments, review progress and assigned tasks. Counts come from scoped
server queries; recent lists are explicitly labeled. Expected unsubmitted
receipts and overdue-review/escalation thresholds still need confirmed rules.

The [remaining-work plan](batch-handler-remaining-work-plan.md) records verification
of all four implemented phases. Phases 1–2 are user-confirmed; Phases 3–4 are
implemented and verified locally, with manual acceptance pending.

## Effective permission keys

```text
BATCH_READ
CLIENT_READ
PAYMENT_READ
PAYMENT_RECORD
GCASH_HISTORY_READ
GCASH_HISTORY_UPLOAD
TASK_READ
TASK_SUBMIT
NOTIFICATION_READ
```

## Source and maintenance

- [Role permissions](../packages/contracts/src/index.ts): Handler grants,
  effective permissions and legacy role normalization.
- [Workspace access](../apps/web/lib/workspace-access.ts): allowed staff pages.
- [Assignment scope](../apps/api-ts/src/records/scope.ts): current batch/client
  scope and own-task scope.
- [Finance controller](../apps/api-ts/src/finance/finance.controller.ts) and
  [service](../apps/api-ts/src/finance/finance.service.ts): payment entry, proof,
  corrections, review progress, scoped statements and confirmations.
- [GCash controller](../apps/api-ts/src/gcash-history/gcash-history.controller.ts)
  and [service](../apps/api-ts/src/gcash-history/gcash-history.service.ts): PDF
  submission/read access and Records-only correction/review/archive actions.
- [Tasks controller](../apps/api-ts/src/tasks/tasks.controller.ts): own-work
  actions versus assignment/completion/KPI authority.
- [Notifications page](../apps/web/app/system/notifications/page.tsx),
  [bell preview](../apps/web/components/StaffAlerts.tsx) and
  [shared notification state](../apps/web/components/useStaffNotifications.ts).
- [Staff alerts](../apps/api-ts/src/staff/staff-alerts.controller.ts),
  [notifications](../apps/api-ts/src/notifications/notifications.controller.ts),
  [authentication](../apps/api-ts/src/auth/auth.controller.ts) and
  [account security screen](../apps/web/app/security/page.tsx),
  [staff password form](../apps/web/app/security/PasswordChangeForm.tsx) and
  [password helper](../apps/web/lib/password-change.ts): personal controls.
- [Payment review chain](123-payment-operational-review-chain.md): current
  review sequence and evidence invalidation.

When asked for **“Batch Handler roles and access”**, start with the Quick summary,
then explain the requested area. Keep existing access, UI gaps and proposed work
distinct. Update this reference and its verification date after access changes.

Jaycee selected this role as the next portal on 2026-11-09. His co-worker is
working on COO; keep role-specific work separate and coordinate shared edits.
