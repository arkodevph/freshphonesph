# Workflow in-app notifications — October 28 evening

October 26 checklist **#14**. Implementation was developed in `freshphonesph-notifications` on `feature/workflow-notifications`, then merged narrowly into the current main checkout while preserving concurrent multiple-membership and GCash changes. Verification is recorded in the afternoon handoff and `.local/workflow-notifications/`.

## Result

The existing staff notification bell now includes **Enrollments**, with pending review work for the current assigned Batch Manager and COO, and approved/rejected outcomes for the submitting Agent. Clicking an alert opens that exact enrollment request, including an older request beyond the first list page. **View all requests** returns to the full workspace.

Enrollment notifications already existed in the database; the staff bell previously omitted them. The implementation connects this gap without adding another inbox or changing who can approve enrollments. Customer creation, schedules and Finance-only verified balances continue to follow their existing workflows.

## Event and recipient coverage

| Event                                                   | Recipient and visibility                                                                                                             | Behavior                                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Pending enrollment                                      | Currently assigned Batch Manager and active COO; technical maintenance retains its existing authorized access                        | One current alert per request and recipient. Self-submitted requests are excluded from reviewer work. |
| Enrollment approved/rejected                            | Original submitting Agent while they retain Agent access                                                                             | One outcome linked to the current request and existing review note. Unrelated Agents receive nothing. |
| Task assignment, due within 24 hours, overdue           | Current task assignee                                                                                                                | Existing task alerts/reminder boundaries are retained; no automatic KPI or wage action.               |
| Payment awaiting Finance                                | Active authorized Finance reviewers                                                                                                  | Existing pending queue and version-aware receipts are retained.                                       |
| Finance verification, rejection or clarification        | Authorized recording staff and Records under existing current batch scope; customers retain their existing own-payment notifications | Existing Finance result history is retained. Reading an alert never verifies money.                   |
| Customer Service concern, assignment and customer reply | Existing responsible Support staff and case scope                                                                                    | Existing Support alerts are retained.                                                                 |
| Staff account/access changes                            | Existing authorized account administrators                                                                                           | Existing account alerts are retained.                                                                 |
| Customer document/release/support updates               | Existing customer notification mechanisms and own-account scope                                                                      | Existing behavior is retained; this change does not invent new customer delivery rules.               |

These are the currently implemented workflows. Future withdrawal/refund, late-join and additional payment-review stages need their own agreed events when those workflows are implemented. This task does not add an unapproved Records → Manager → Finance payment chain or claim a new GCash-review notification event.

## Current access, reads and refresh

- Eligibility is checked from the current request, active account, role and batch assignment. Stored notification ownership alone does not grant access. A replacement Manager inherits pending requests even if no notification row was originally created for them; the previous Manager loses the alert.
- Approved/rejected requests leave the review queue and appear as Agent outcomes. Bell text omits applicant contact details and private review notes; those remain on the authorized enrollment screen.
- Read state is separate per recipient. Existing `StaffNotification` rows hold receipts using the established dedupe keys. The generic notification API and the bell share those receipts, and the generic API/live hints also hide enrollment records after access is lost.
- **Mark all as read** applies to the selected alert type across all pages. Enrollment-only reads leave tasks, Finance receipts, source requests, schedules, payments, audits, email deliveries and other recipients unchanged.
- Read/version/review operations use the existing transaction lock. Stale request versions return a conflict; concurrent/repeated reads do not create duplicate receipts or decisions. Failed transactions roll back receipts.
- Existing live events refresh the bell and enrollment workspace. The bell retains its visible-page 30-second refresh and manual refresh/retry controls.
- No new database migration, role grant, identity merge, email/SMS/push integration or deployment was introduced by #14.

## Manual test on the main demo

Use the normal **Preview a workspace** roles at [localhost:3000/login](http://localhost:3000/login).

1. Choose **Agent** → **Enrollments**. Submit a clearly synthetic member to an assigned batch.
2. In a separate browser profile/private window, choose **Batch Manager**. Open the notification bell → **Enrollments**. Only requests in that Manager's current batches appear. COO sees pending requests for oversight.
3. Click an enrollment alert. Confirm the matching request opens directly and offers **View all requests**.
4. Enter a review reason and approve/reject. The pending reviewer alert disappears; the Agent receives the corresponding outcome.
5. On the Agent bell, try **Unread only**, opening an outcome, and **Mark all as read** in the Enrollments tab. The Manager/COO's receipts and unrelated task/payment alerts are independent.
6. With authorized COO assignment controls, assign a batch to another eligible Manager. Confirm pending requests move to the current Manager and old direct reads are denied.
7. Check Finance and ordinary task alerts still open their existing workspaces. Owner / CEO remains report-only and has no staff bell or enrollment actions.

Use clearly labeled synthetic examples. A tested demo request may already be approved/rejected; create another synthetic request to repeat the review path. Availability and final test totals are stated in [the expanded handoff](68-2026-10-28-afternoon-handoff.md).

## Engineering verification

- **375 isolated automated checks pass:** 68 API unit, 109 web and 198 PostgreSQL integration. The integration run was interrupted after 173 passes; the remaining 25 passed in a persistent job, and all 198 source test names are accounted for.
- **28 combined main-source integration checks pass**, covering notifications, current role access and report-only CEO against the current membership/GCash schema. These overlap the isolated scenarios.
- Five seeded-role browser groups and a final built-preview check passed: normal Manager/Agent/COO accounts, review/outcome loop, exact request links, read controls, Finance/CEO boundaries, 320/390px and dark theme. Successful checks have zero page errors.
- API types/build, optimized web build, scoped formatting/whitespace and documentation navigation/links pass. Four small-fixture PostgreSQL plans were captured; no production load claim is made.
- Proof and notification-only patch/manifest: `freshphonesph-notifications/.local/workflow-notifications/`. Source is local and uncommitted. User/client acceptance, later business workflows and deployment remain separate.
