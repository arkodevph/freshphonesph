# 70 — Multiple batch memberships

October 26 checklist **#10**, selected by Jaycee during the October 28 evening continuation. Extends the same [afternoon handoff](68-2026-10-28-afternoon-handoff.md).

## Behavior

One member can join several batches using the same identity and customer login. Each membership has its own installment schedule, payments, balance, documents, release status and support history.

Agent → **Enrollments → Find an existing member** searches members in the Agent's currently assigned batches. Selecting a result reuses its identity. The Agent chooses another assigned open batch and submits for review. The assigned Batch Manager, or COO oversight, approves through the existing workflow; approval creates only the new membership and schedule. A member cannot enroll twice in the same batch. Repeated and concurrent approvals cannot issue duplicate memberships or schedules.

Customer → **Viewing batch** switches the portal to that membership. Selection stays in the current tab across portal sections, with a separate value for each customer account. Notification links select their originating membership. The normal seeded Customer workspace remains usable; another login is unnecessary.

## Data preservation and access

- Existing `Client` IDs remain membership IDs. Payments, schedules, releases, documents and support keep their original foreign keys.
- `Member` is the shared profile. The migration creates one profile per existing client; matching names, emails and phone numbers never merge people automatically.
- `User.clientId` remains its original primary membership. `User.memberId` uniquely links the shared profile to that one portal account. Database constraints prevent a second login through another membership.
- Compatibility name/email/phone fields mirror the shared profile, including existing Prisma inserts. Identity changes update the other memberships and their versions. Staff can change shared identity only when all live memberships are inside their current access scope; otherwise Records/COO must handle the edit.
- A customer request selects a membership with `X-Membership-Id`. The API validates current account ownership, role and active state. This is request-local: it never changes the stored primary link or role permissions. Live streams validate the equivalent query parameter and recheck ownership on reconnect/heartbeat.
- Customer support/document writes recheck the selected membership within their transaction. Staff access continues to follow batch assignments. Finance remains the sole final payment verifier; credit and balances remain membership-specific.
- Existing customer reminders and in-app notifications resolve the shared account and retain the originating membership in secondary-batch links. No new delivery integration was added.
- Existing retention erasure is blocked when another live membership shares the profile, so it cannot erase another batch's identity/account incidentally. Coordinated disposition of such profiles needs its own reviewed workflow. A sole-profile erasure also anonymizes the new profile.

The independent membership uses the current enrollment/scheduling rules. Checklist #4's ongoing-batch continuation, prior-credit and catch-up policy remains unresolved. No old schedule, credit or payment is moved into the new membership.

## Local review

Target: the **main local demo at http://localhost:3000/login**, using its normal role workspace picker. Synthetic `MULTI-DEMO-A` and `MULTI-DEMO-B` provide different plans for the existing demo Customer identity. Existing primary membership and credentials are retained.

1. **Customer → Viewing batch:** compare the original membership and the synthetic A/B plans. The latter have separate PHP 12,000 and PHP 6,000 schedules. Each page shows the selected batch.
2. **Customer → Verified payments → Statement of account:** open the statement, including in another tab, and download its PDF. The batch and figures must match the selection.
3. **Agent → Enrollments → Find an existing member:** search the demo Customer's name, select the existing profile, choose another assigned open batch and submit.
4. **Assigned Batch Manager → Enrollments:** review and approve. Submission alone must not create a membership or schedule.
5. **Customer:** the approved batch appears under the same login. Existing installment/payment histories remain attached to their original memberships.

The automated browser walkthrough may already have approved synthetic batch B. To repeat the submission/approval steps, use another assigned batch that the member has not joined. Selecting an already joined batch deliberately returns a conflict. Staff can only search identities within their authorized batch scope; no new global Agent lookup was granted.

Implemented and available in the main demo. **22 focused PostgreSQL scenarios**, **68 API unit tests**, **117 web tests** and **13 Redis scenarios** pass; one optional Redis interruption scenario is skipped. The 199-scenario existing PostgreSQL regression had one retention-age failure; it was corrected, and all nine retention cases passed on rerun. API types/build and optimized web build/types pass. Six final browser groups pass with no page errors, plus the earlier Agent submission/Manager approval flow. Checked desktop, 320/390px, dark theme, independent tabs, error recovery and a real statement PDF download. The membership lookup uses the new composite index on the small synthetic test database; production-scale acceptance is not established.

The retention correction excludes shared-profile bookkeeping timestamps from membership activity age; real identity edits still update mirrored membership activity/version. New profile PII is included in the existing erasure disposition. Account-wide security/notices ignore batch selection so an invalid selection cannot block recovery.

User/client acceptance remains pending. Work is local and uncommitted; no new commit, remote push or deployment.

Private preparation, migration preservation, test logs and browser evidence live under ignored `.local/multi-batch/`. Source was archived before work under the private Fresh Phones backup directory recorded there. The additive migration rehearsal compared all 61 existing tables while excluding only the new linkage column; their existing values were preserved.
