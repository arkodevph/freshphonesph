# Finance Officer — your Phase 4 test

Status: ready for Jaycee’s hands-on testing; final acceptance is pending.
Jaycee authorized committing and pushing the Finance work to
`feature/finance-officer-portal` on 2026-11-21. The earlier no-commit hold is
superseded; hands-on acceptance remains pending. The local sandbox is unchanged.

Open <http://localhost:3000/login>, then **Preview a workspace → Finance Officer**.
This session uses a separate synthetic-only acceptance database, identified by
`FINANCE-PHASE4-SANDBOX` / **Synthetic Phase 4 Member**. The earlier preview database
has been preserved. Every sample receipt states that it is synthetic and no funds
were transferred. Signing into another role changes the workspace for that browser;
use separate browser profiles/private windows if you want to compare roles.

## Quick Finance walkthrough

1. On the dashboard, open **Ready for Finance**. Find reference
   **PHASE4-MANUAL_READY**, then scroll the table to the far-right **⋯** action.
2. Open **Open review workspace**. Check receipt proof, amount/date/reference,
   duplicate-reference evidence, Records/Manager approvals and submission evidence.
3. Enter a review note, choose **Verify**, read the stated effect and tick the
   evidence-confirmation checkbox. Confirm only this clearly synthetic claim.
   The sandbox member's verified credit should increase by **₱100.00 exactly once**.
   The starting balance shown before your decision is your comparison point.
4. Find that payment in **All payments**. Its **⋯** menu should offer a
   **Payment Confirmation** and **Statement of Account**. Open, download and print
   preview; compare member, reference, verified credit and remaining balance.
   Each document retains its operational, non-BIR notice.
5. Try **Reports → Collections**, with November 2026 dates and the sandbox batch.
   **Open verified payment records** should retain the period and member-batch
   scope. **Back to report** should restore the same filters. Use the report for
   exports of a current-membership batch scope. Open **GCash history** as well:
   its synthetic October statement provides a real PDF/transaction-reading example.
   GCash reading does not verify or credit the member's installment payments.
6. Open the synthetic approved partial refund in **Withdrawals**. It starts with
   approved **₱500.00**, recorded external payouts **₱100.00**, remaining **₱400.00**
   and **Date pending**. If you try recording **₱50.00**, use a unique synthetic
   reference and note; the remaining approval becomes **₱350.00**. This only records
   evidence in the sandbox and does not send money. The pending refund must show
   **Not decided / Awaiting approval**, with no payout action.

## Try the whole review chain

Use the sample reference **PHASE4-MANUAL_WORKFLOW**. It has proof but has not yet
received operational approvals.

1. **Finance Officer:** it should be waiting for Records, with Verify unavailable.
2. **Records:** open Payments, locate the reference and choose **Review completeness**.
   Add a note and approve. No verified credit should change.
3. **Batch Manager:** locate the same reference and choose **Cross-check**. Add a note
   and approve. No verified credit should change yet.
4. **Finance Officer:** the payment should now be ready. Inspect and verify it, or
   request clarification. A clarification keeps its amount out of verified credit.
5. To test a return, use **Return for correction** as Records or Manager. Sign in as
   **Batch Handler**, correct the returned sample and save. The old review history
   should remain, and current Records and Manager approvals must be renewed. If
   you change the amount/reference, attach a matching synthetic receipt before
   asking for new approvals.
6. **Customer:** the sandbox member should see only its own account and verified
   credit. Pending or returned claims must not reduce the remaining balance.

## Appearance and recovery

- Try light/dark themes, phone width, short landscape, enlarged text and keyboard
  navigation. Table content may scroll within the table; filters/forms should fit.
- Open a review, type a note, close and reopen it on the same page. The note should
  remain until that page/session state ends. Escape should return focus to the row.
- A missing receipt must block verification. A changed record requires one
  explicit **Reload for review**, retained notes and a new decision; errors should say what failed and offer retry rather than claim no data.
- Automated accessibility, semantic tree and keyboard checks do not establish
  real screen-reader usability. A human assistive-technology walkthrough remains
  available as part of acceptance.

Please note the reference, role, action, expected result and actual result for any
problem. Your acceptance is not assumed from technical checks. Nothing will be
committed, pushed, merged or deployed as part of this test pass.
