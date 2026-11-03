# Customer batch participation

October 30, 2026 follow-up to checklist #5. Jaycee requested that customers see how many actual members are in their batch, then clarified the placement as **My membership**. This is an addition to the existing membership screen; there is no new navigation entry or overview/dashboard widget.

## Behavior

The **Batch participation** card shows the selected membership's actual approved/enrolled count, capacity of eight, whether positions remain or the batch is full, and its separate Forming/Active/Completed/Cancelled status. For example, a batch manually activated early can show **6 of 8 members enrolled** and **Active**. Eight members shows **Batch full**. Legacy counts above eight are reported truthfully rather than clamped or inflated.

Four internal visual placeholders never appear in this count or the customer interface. No other members' names, contacts, installment details, payments or balances are returned. Pending enrollment requests do not count. The shared authoritative position predicate excludes a historical membership only after actual replacement admission marks its handover complete; withdrawal approval alone does not release the position.

The card refreshes on the existing live invalidation/reconnect mechanism. Each request captures its selected membership, late results are discarded after switching, and a failed refresh shows an error with Retry instead of silently presenting an old count as current.

## Server boundary

`GET /api/portal/batch-summary` requires a current customer account and an owned selected membership. The request's `X-Membership-Id` is validated by the existing selection/authentication path, then ownership is independently checked in the read helper. Staff, foreign or malformed membership selections are denied. The server reads the aggregate and batch status in one Repeatable Read transaction and returns an explicit small projection:

`membershipId`, `batchId`, `batchNumber`, `approvedMembers`, `capacity`, `remaining`, `isFull`, `batchStatus`.

No migration or financial write is introduced by this screen. Compatibility with the separately owned withdrawal/replacement schema is coordinated with that session.

## Design and validation

ROSS reused the existing portal colors, type and spacing, with a small semantic card under the membership banner and before key dates. Count and status are separate text labels; no color-only meaning or member roster is added. The async state helper covers membership switches, stale same-membership reads, unmount cancellation, refresh errors, retry and mismatched responses. YELYAH independently reviewed the authorization/privacy/placement/state handling and found no blocking defect; six async tests passed independently.

Isolated validation passed **10 PostgreSQL/API scenarios**, including scope/header tampering, real/full/legacy counts, pending requests, replacement exclusion, staff/customer/activation consistency, unchanged records and deactivated accounts. The full web suite passed **137 checks**, including six new async-state scenarios. API/web TypeScript and scoped formatting/whitespace checks passed. These counts overlap prior base-feature checks and must not be added to older totals.

The combined main-demo coordinator integrated the change with the withdrawal workflow, migrated its separately owned schema and completed the main API/worker/optimized web build and restart. The live API returned correct approved counts/status for the existing Customer's seven owned batches, including full8 and underfilled cases, with only the explicit aggregate fields.

**Seven read-only main-browser groups passed with zero page errors:** normal existing Customer My membership full8 display; own-batch switching and independent status; live/focus invalidation; 1440/390/320px light/dark layouts; injected503 error/Retry clearing stale data; aggregate privacy/staff-data denial and no overview widget; and unchanged own financial totals. The fault check temporarily intercepted only the browser's count response; normal data reads used the live API. No fixture, membership, schedule or financial data was changed by the walkthrough.

Evidence: isolated `.local/internal-capacity/portal-browser-readonly-results.json`, `portal-browser-readonly.log`, `portal-count-*.png`, `portal-batch-final-tests.log`, `portal-web-final.log`; main `.local/internal-capacity/portal-live-api-results.json`. The same afternoon handoff and shared #5 task record track this follow-up. Source remains local/uncommitted; user/client acceptance is pending.
