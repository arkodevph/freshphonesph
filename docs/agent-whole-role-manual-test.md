# Fresh Phones PH — whole Agent role manual test

Version 1.0 · Prepared 27 November 2026 · 104 manual cases

Use this manual to check the complete **Agent** role: sign-in and personal
security, daily desk, own profile and assigned batches, website applications,
enrollment requests, withdrawals and replacements, own tasks, notifications,
access boundaries, and accessibility. Other roles appear only to prepare data
or complete an Agent handoff. Pioneer Agent is a separate role.

This is a test procedure, not a test execution report. **Every result starts as
Not run.** Record actual human outcomes in the
[whole-role results sheet](agent-whole-role-test-results.csv).
The earlier [26-case acceptance summary](agent-quality-test-manual.md) remains
available with its original IDs and results sheet.

## Before you start

The review environment and the records below **must be prepared and checked**.
This documentation change does not start a server, seed records, create accounts,
or confirm that a previous preview is still available.

1. Ask the test operator for a dedicated local or authorized test environment
   running this Agent candidate and its real API. Use synthetic data. Keep
   existing Finance, Pioneer, and other testers' progress intact.
2. Record the web origin, API origin, build ID, branch/commit and any uncommitted
   candidate fingerprint. Use the same origins throughout. If the environment
   is not ready, mark dependent cases **Blocked**, with the missing prerequisite.
3. Use separate browser profiles for Agent A, Agent B, Manager, COO, Pioneer,
   KPI reviewer, Finance and Member. Ordinary private windows in the same browser
   can share one private session; they are not necessarily separate identities.
   Alternatively sign out fully before switching actors.
4. Verify **Agent A has only the nine base Agent permissions**, without extra
   COO/Finance/Manager grants. Have the operator confirm this against the role
   configuration. Record each actor's synthetic account label and relevant IDs.
5. Prepare the fixture register below and capture baseline totals before any
   writes. Replace every `<id>` in example URLs with a real fixture UUID; never
   type the angle-bracket placeholder literally.
6. For account-security cases, use a disposable Agent account with known test
   credentials, access to the local test mail inbox and a test authenticator.
   Keep passwords, QR secrets, recovery codes, reset links and cookies out of
   screenshots, CSV entries and defect reports.

| Run detail | Record before execution |
| --- | --- |
| Run ID / tester / date and time zone | __________________ |
| Web origin / API origin | __________________ |
| Build ID / branch / commit / candidate fingerprint | __________________ |
| Browser and version / OS / device | __________________ |
| Viewport / zoom or text scaling / theme | __________________ |
| Agent A / Agent B / helper-role account labels | __________________ |
| Staff MFA required? / legal acknowledgment required? | __________________ |
| Screen reader and version, when tested | __________________ |

For local launch/build instructions use [README.md](../README.md) and
[AGENTS.md](../AGENTS.md), with an isolated test configuration supplied by the
operator. Do not copy historical Pioneer preview URLs, fixed counts or account
shortcuts as proof that this candidate is ready. Preview shortcuts, when enabled,
do not replace credential/MFA tests.

## Required fixture register

These are **requested test fixtures**, not a claim that they already exist.
Use a run prefix such as `UAT-AG-20261127-R1` in synthetic names and notes. Record
actual IDs in a local working copy of the results sheet. Give destructive,
concurrent and response-loss cases separate records so they do not consume a
later case's prerequisite. Reset only this run's disposable fixtures; do not
reset a shared preview database.

| Fixture | Required starting state / preparation owner |
| --- | --- |
| Agent A and Agent B | Two active employee accounts with distinct Agent profiles and different assignments; COO prepares. A has a named Pioneer supervisor. B owns the foreign-record controls. |
| Profile variants | Separate active accounts with a missing profile, inactive profile, and active profile with no batches. Keep account suspension distinct from profile inactivity. |
| Batch catalog | A has at least 105 assigned batches with known code/model ordering, including eligible PLANNED/ACTIVE batches. Prepare inactive/closed, full, unassigned and missing/inactive-Manager examples. Record real current membership counts. |
| Existing members | An existing member in A's scope, one with a saved blank phone, and a member visible only to B. Use different target batches where required to avoid accidental duplicate membership. |
| Website applications | Separate RECEIVED records for new-member forwarding, existing-member forwarding, closing, stale changes, uncertain forwarding, uncertain closing and assignment loss; plus FORWARDED/CLOSED references and a B-only application. COO assigns them. Preserve a known original form revision and answers. |
| Enrollment requests | A-owned PENDING, APPROVED and REJECTED references; more than one list page; B-only request; separate requests for approval, rejection, full-capacity conflict and replacement handoff. |
| Withdrawal cases | A-scoped AWAITING_AGENT cases; an Agent's own-customer withdrawal if supported by fixture setup; rejected and approved references; approved CONTINUE_UNPAID and RESTART policies; no-policy, changed-payment, pending-claim and pending-proposal cases. Member/COO prepare through existing workflows. |
| Refund references | Undecided/null, approved positive/unpaid, partially paid and fully paid refund examples. A fully paid positive refund has zero remaining; approval requires a positive amount. COO decides; Finance records only synthetic external payouts. Preserve prior verified receipts and schedule snapshots for comparison. |
| Own tasks | Distinct TODO, IN_PROGRESS, SUBMITTED, DONE and CANCELLED tasks for A; future and past deadlines; more than one page. Separate tasks for text-only, file-only, combined submission, stale updates, response loss, cancellation and reassignment. Pioneer/authorized assigner prepares. |
| Private controls | B-only task with attachment/activity, application, enrollment request, withdrawal and notification. B/authorized helper first verifies each exists and is readable by its intended owner. |
| Notifications | Both feeds populated; task reminders and enrollment outcomes; received application/withdrawal updates; read/unread examples, more than one page and a now-unavailable destination. |
| Uploads | Valid small PDF/JPG/PNG/WebP; one long descriptive filename; a disallowed file such as TXT; a valid file exactly 5,242,880 bytes and one above it. The operator supplies genuine files of the stated type; do not rename an executable as an image. |
| Assisted controls | Ability to delay/fail a selected read, drop only a write response after server acceptance, and make a valid concurrent edit. Use a local test proxy or browser request controls; never alter the real production service. |

Capture the following **from this run**, before mutations: assigned-batch total;
received-application total; enrollment PENDING/APPROVED/REJECTED totals; withdrawals
awaiting Agent; own TODO/IN_PROGRESS/SUBMITTED/DONE/CANCELLED totals; current
membership counts; relevant dues/verified-paid/refund figures. After a change,
refresh both compared views. Agent home open tasks = **TODO + IN_PROGRESS**.
Request totals, current members, batch capacity and commissions are different
facts; none is a substitute for another.

Known scope limit: the assigned-batch directory is paginated beyond 100, while
enrollment batch choices currently cap at 500. This manual does not claim that
every batch beyond 500 can be selected. Record that limitation if it affects a
real test need; do not silently call missing choices a pass.

## Running and recording the tests

- **P0:** access, data integrity or an essential business flow. **P1:** other
  functional, recovery or usability coverage. Both require a recorded outcome.
- **Basic:** tester can use the interface, with named helper roles where stated.
  **Assisted:** operator/developer prepares a fault, concurrent change or API
  probe. **Specialist:** actual assistive-technology review. **Sign-off:** named
  business reviewer makes an acceptance decision.
- **Pass:** every stated step and expected outcome was observed. **Fail:** an
  observed result contradicts an expectation. **Blocked:** a prerequisite or
  test tool is missing. **Not run:** no execution yet. Do not mark an untested
  variant Pass. Put variant-level outcomes in notes or duplicate the case row
  with a distinct `variant` value.
- Record the actual result, fixture IDs, tester, build, browser/device, evidence
  and defect reference for each case. Keep original failures when retesting;
  add a dated row with a new attempt number.
- Start with AG-001 and read-only desk/list checks. Use fresh records for write
  flows. Run account-changing AG-004–012 last on the disposable account; AG-012
  specifically requires a live draft. Run dependent handoff pairs in order:
  AG-029 → AG-049, AG-043 → AG-050, AG-054 → AG-055,
  AG-059 → AG-060, AG-071/072 → AG-075, AG-076 in its own late-task branch.
- A quick first pass is AG-001, 013, 014, 020, 026, 029, 031, 043, 049, 054,
  059, 060, 070–072, 075, 084–085 and 097. It does **not** establish full acceptance.

### How to perform assisted recovery checks

**Failed read:** fail or block only the named GET request, reload/refresh that
view, capture its error, restore the request and use Retry. Repeat with a slow
response to see loading. Other healthy sections must remain usable. A network
failure differs from a legitimate successful response containing zero rows.

**Stale update:** leave Agent's form open with a draft. In a separate authorized
role session change that exact record so its version advances. Return to Agent,
refresh or attempt its original action. Record retained fields, conflict state,
and explicit discard/reload behavior. A 409 must not become a false success.

**Response lost after write:** the operator must let the real API commit the
command but suppress its response to Agent. Independently confirm the saved
state through an authorized helper or test database. Keep the original Agent
page open, restore connectivity and use **Retry original action** or the
corresponding latest-record action. Verify the final request/task/audit count.
Going offline *before* the write proves a different failure and does not complete
this check. If the setup cannot demonstrate the post-commit loss, mark Blocked.

**Access lost:** while Agent views private data or has a draft, the COO/assigner
changes the relevant assignment or revokes the disposable session. Refresh or
act in Agent. Let any deliberately delayed older read complete afterward.
Check that denied details/drafts stay cleared. A historical notification does
not restore the record's authorization.

Drafts live in component memory. They are not a durable/offline queue. Confirmed
departure, reload, unmount or a crash can discard them. For an uncertain write,
check the original outcome before making another attempt. Do not expect browser
history, refresh or signing in as another person to restore private drafts.

## Sign-in and personal security

### AG-001 — Sign in as Agent and open every allowed destination

**Priority:** P0 · **Mode:** Basic · **Changes:** Session only

**Start:** Active Agent A credentials; required MFA/legal setup completed.

1. Open `<web-origin>/login` and sign in using Agent A's credentials.
2. Open `/system`, `/system/agent-network`, `/system/enrollments`, `/system/withdrawals`, `/system/tasks`, `/system/notifications` and `/security`.
3. Return home and confirm the signed-in identity and Agent workspace.

**Expected:** All seven destinations are usable within current assignment. Agent sees its own work and **My tasks**, without Finance, account administration, task assignment or KPI-review controls.

### AG-002 — Invalid sign-in and password visibility

**Priority:** P0 · **Mode:** Basic · **Changes:** Session only

**Start:** Signed out; known disposable Agent credentials.

1. Submit empty credentials, then the known account with an incorrect password.
2. Use Show password / Hide password and verify the button works with keyboard input.
3. Correct the credentials and sign in once.

**Expected:** Invalid attempts grant no workspace or private data; useful errors allow correction. Visibility changes only the field display. The corrected login succeeds without a stuck busy state.

### AG-003 — Required notices cannot be bypassed

**Priority:** P0 · **Mode:** Assisted · **Changes:** Test acknowledgment

**Start:** Operator provides a disposable Agent requiring the configured legal acknowledgment.

1. Sign in and inspect the displayed notice/version before accepting.
2. Try opening `/system/tasks` directly before the required acknowledgment.
3. Accept through the supported control and reopen the workspace.

**Expected:** Required acknowledgment gates access and records the intended version; accepting restores normal access. If this deployment has no such gate, record that configuration and mark this variant Blocked rather than claiming a pass.

### AG-004 — Set up required or optional two-factor authentication

**Priority:** P0 · **Mode:** Basic · **Changes:** Disposable account security

**Start:** Disposable Agent without MFA; current password and a test authenticator; record whether staff MFA is required.

1. Open `/security`, enter Current password and choose Set up authenticator.
2. Add the account to the authenticator, securely save recovery codes and complete the saved-code acknowledgment.
3. Enter a current authenticator code, finish verification and open the workspace.

**Expected:** Setup completes only after valid verification; enabled status is clear. If MFA is required, staff access remains gated beforehand. Other sessions are signed out after enabling. Do not capture QR secrets or recovery codes as evidence.

### AG-005 — MFA errors, one-use recovery and code rotation

**Priority:** P0 · **Mode:** Basic · **Changes:** Disposable account security

**Start:** MFA-enabled disposable Agent; private access to its current password and unused recovery codes.

1. Sign out/in; enter an invalid authenticator code, then complete sign-in with an unused recovery code. Sign out and try reusing that code.
2. Sign in legitimately, generate new recovery codes in Security and confirm an unused old code no longer works on another sign-in.
3. If MFA is optional, cancel Disable first, then confirm disabling on this account. If required, verify the disable control is absent and have the operator test server denial.

**Expected:** Invalid/reused/superseded codes grant no access; a valid unused code works once. Required MFA cannot be disabled by bypassing the UI. Optional disabling requires the current password and confirmation; record each variant separately.

### AG-006 — Inspect and revoke only own sessions

**Priority:** P0 · **Mode:** Basic · **Changes:** Disposable sessions

**Start:** Same disposable Agent signed in in at least two separate browser profiles; more than five sessions for the paging variant.

1. Open Security → Active sessions; identify This session and page through entries when prepared.
2. Sign out one other session and refresh a protected screen in that browser profile.
3. Create another test session, then choose Sign out other sessions and retest it.

**Expected:** The selected/other sessions lose access; the initiating session remains usable. Counts/paging update truthfully, with no other user's session information or revocation authority.

### AG-007 — Validate own password change

**Priority:** P0 · **Mode:** Basic · **Changes:** No successful password change

**Start:** Disposable Agent → Security; MFA setup/recovery acknowledgment finished.

1. Submit empty password fields; try mismatched confirmation, the same old/new password and a new password rejected by the displayed policy.
2. Try an incorrect Current password with otherwise valid new fields.
3. Correct the inputs without submitting the successful change yet.

**Expected:** Errors identify the relevant field, focus supports correction and no invalid attempt changes the password. Busy controls recover. Passwords are excluded from test evidence.

### AG-008 — Change password and verify session consequences

**Priority:** P0 · **Mode:** Basic · **Changes:** Disposable account password

**Start:** Disposable Agent with a second active session; valid current and replacement test passwords.

1. Update the password successfully from Security.
2. Verify this session still works and the second session loses protected access.
3. Sign out and verify the old password fails while the new password works, completing MFA as configured.

**Expected:** Exactly the intended account password changes. Success is distinct from a subsequent sessions-list refresh error; no repeated password change is required merely to retry a read.

### AG-009 — Forgot-password and reset-link lifecycle

**Priority:** P0 · **Mode:** Basic · **Changes:** Disposable account password

**Start:** Disposable Agent and local test mail inbox; record the candidate's normal recovery response text.

1. From Forgot password request recovery for the test account; repeat with a nonexistent synthetic address and compare the outward acknowledgment.
2. Open the real test email link, exercise invalid confirmation/policy input, then reset successfully.
3. Try the consumed link and an operator-supplied expired/invalid link; verify new credentials and configured MFA on normal login.

**Expected:** Outward recovery responses do not disclose account existence. Only a valid unused unexpired link changes the password; invalid links explain the need for a new request. No reset token appears in recorded evidence.

### AG-010 — Sign out, history and protected links

**Priority:** P0 · **Mode:** Basic · **Changes:** Session only

**Start:** Agent A viewing a private detail with no unresolved write.

1. Sign out using the account control.
2. Use browser Back and directly open the previously copied private detail URL.
3. Try refreshing a protected read, then sign in as Agent B in the same browser profile.

**Expected:** Signed-out requests cannot read/change private records. A historical page cannot successfully act with the old session; refreshing under B applies B's scope and cannot repopulate A's private data or draft.

### AG-011 — Suspended account differs from an inactive profile

**Priority:** P0 · **Mode:** Assisted · **Changes:** Disposable account activity

**Start:** Operator controls a disposable active Agent account with an active session.

1. As COO, deactivate that test account through the existing authorized workflow.
2. In the Agent session refresh a private list and attempt an otherwise valid action.
3. Attempt a fresh sign-in while inactive; restore this test account when finished.

**Expected:** Account inactivity prevents protected access and writes. It is not presented as merely having no assigned batches. An inactive linked profile alone is tested separately in AG-017.

### AG-012 — Expired session clears sensitive drafts

**Priority:** P0 · **Mode:** Assisted · **Changes:** Disposable session; unsaved drafts

**Start:** Separate live draft variants in manual enrollment, application review, withdrawal review and task report/evidence.

1. Fill synthetic private data in one variant; keep an earlier read deliberately delayed.
2. Revoke/expire its session from an authorized test session, then refresh or submit in Agent.
3. Release the delayed response; sign back in and inspect the record before any retry. Repeat for each draft variant.

**Expected:** Denied session state clears private contacts/references/report/file and prevents action. Late responses cannot restore them. No success is invented; any potentially committed write is checked before another attempt.

## Daily desk, profile and assigned batches

### AG-013 — Reconcile full home counts

**Priority:** P0 · **Mode:** Basic · **Changes:** None

**Start:** Agent A; captured baseline; run before changing fixture state.

1. Refresh home; record assigned batches, received applications, enrollment outcomes, withdrawals awaiting Agent and own open tasks.
2. Open the corresponding unfiltered lists and compare full totals after refreshing both screens.
3. Calculate own open tasks from TODO + IN_PROGRESS; inspect submitted/completed/cancelled references.

**Expected:** Totals reflect the full authorized dataset, even when home shows only a few preview rows. Submitted, completed and cancelled tasks are excluded from the home open-task total; filtered counts are not substituted for global scoped totals.

### AG-014 — Home shortcuts open the exact work

**Priority:** P0 · **Mode:** Basic · **Changes:** Read state may change

**Start:** Home with at least one application, enrollment handoff, withdrawal and own task.

1. Open each visible Review/View shortcut from the desk and note the selected record's ID/name.
2. Use the All applications / All requests / assigned-batches / own-task navigation and return home.
3. Compare the opened record with the originating row rather than only its page title.

**Expected:** Each shortcut opens the intended authorized record or list. No link opens a random first row, another Agent's record or a team/KPI workspace.

### AG-015 — Own profile, code, supervisor and request totals

**Priority:** P0 · **Mode:** Basic · **Changes:** None

**Start:** Agent A with active linked profile and named supervisor.

1. Inspect the profile card on home and Your profile and batches.
2. Compare name/code/readiness/supervisor with the fixture register.
3. Open With Batch Manager, Approved and Rejected totals and inspect the resulting request filter.

**Expected:** Identity and reporting line are accurate and self-scoped. Outcome links show A's own submitted requests with the correct status; request totals are not called memberships, income or commissions.

### AG-016 — Missing linked profile

**Priority:** P0 · **Mode:** Basic · **Changes:** None

**Start:** Separate active Agent account deliberately lacking a linked profile.

1. Sign in and inspect home/profile and assigned batches.
2. Try to open Submit enrollment and inspect readiness guidance.
3. Open this account's own tasks and Security.

**Expected:** Missing profile has an explicit explanation and COO follow-up; batch-dependent work is unavailable without fabricating an identity or zero-read success. Own authorized tasks and security remain independently usable.

### AG-017 — Inactive linked profile

**Priority:** P0 · **Mode:** Basic · **Changes:** None

**Start:** Active Agent account with an existing inactive linked profile.

1. Sign in and inspect profile readiness and batches.
2. Attempt batch-dependent enrollment through normal controls.
3. Open own tasks/security and compare the explanation with AG-016 and AG-011.

**Expected:** The UI distinguishes inactive profile, missing profile and inactive account. Inactive profile blocks batch-dependent reads/actions; independent own-task/security capabilities are retained.

### AG-018 — Legitimate empty queues and no assigned batches

**Priority:** P1 · **Mode:** Basic · **Changes:** None

**Start:** Active profile with no batches and controlled empty application/request/task/withdrawal views.

1. Open home and each legitimately empty list; let successful reads finish.
2. Inspect available guidance and clear a status/search filter that produces zero matches.
3. Return to unfiltered views.

**Expected:** Genuine empty states are actionable and distinguished from no search matches, loading, unavailable profile and failed reads. No fictitious work or capacity is inferred.

### AG-019 — A failed home section does not hide healthy work

**Priority:** P0 · **Mode:** Assisted · **Changes:** None

**Start:** Agent A; operator can fail one home GET at a time.

1. Fail the profile, batches, applications, enrollments, withdrawals and each task-count read in separate variants.
2. Inspect the failed count and use another healthy section's shortcut.
3. Restore that read, use its Retry/Refresh and reconcile the recovered total.

**Expected:** The failed figure is unknown/unavailable, never a fabricated zero. Independent healthy sections remain usable; partial TODO/IN_PROGRESS availability cannot be misrepresented as a complete open-task total.

### AG-020 — Find batches beyond the first 100

**Priority:** P0 · **Mode:** Basic · **Changes:** None

**Start:** Agent A with at least 105 assigned batches and a known final code.

1. Open Your profile and batches; record the total and browse to the last page.
2. Find the known final batch by code and by its model search.
3. Clear search and compare the assigned total with home and the prepared register.

**Expected:** Batches beyond the former 100-record cap are discoverable. Full totals, matching totals and row membership counts describe their respective facts accurately.

### AG-021 — Batch search and no matches

**Priority:** P1 · **Mode:** Basic · **Changes:** None

**Start:** Assigned batches with recognizable code/model fixtures.

1. Search a partial batch code, then a known model; submit via Enter and Search.
2. Search a nonexistent synthetic string and inspect the result.
3. Use Clear search and repeat with surrounding spaces.

**Expected:** Search uses assigned scope, trims the submitted query and returns meaningful matches. No match has clear recovery; clearing restores the full assigned view without peer batches.

### AG-022 — Batch sorting and paging

**Priority:** P1 · **Mode:** Basic · **Changes:** None

**Start:** Multiple assigned-batch pages with different codes/models.

1. Test Batch code A to Z / Z to A and Model A to Z / Z to A.
2. Page forward/back and compare first/last entries with the prepared ordering.
3. Change search or sort from a later page.

**Expected:** The whole filtered dataset uses the selected server ordering; entries are not sorted only within one previously loaded page. Filter/sort changes return to page 1, and page controls stop at valid bounds.

### AG-023 — Batch URL restoration and invalid filters

**Priority:** P1 · **Mode:** Basic · **Changes:** None

**Start:** Assigned-batch list with search, sort and a later page selected.

1. Reload; use Back/Forward after changing filters and pages.
2. Open `/system/agent-network?page=-1&sort=unsupported`.
3. Use Reset filters and inspect a normal page again.

**Expected:** Recognized URL state restores accurately. Invalid filters are explained/reset to safe defaults without a crash, unauthorized reads or stale rows under a misleading filter label.

### AG-024 — Membership facts and enrollment readiness stay distinct

**Priority:** P0 · **Mode:** Basic · **Changes:** None

**Start:** Assigned eligible, closed/full and missing/inactive-Manager batch fixtures.

1. Inspect batch identity, model, status and Members/current-position values.
2. Compare them with the enrollment batch chooser and its guidance.
3. Confirm that no row or count promises a spare slot, reservation or commission.

**Expected:** Directory presence/current membership count does not promise enrollment eligibility. Enrollment requires recorded assignment/status/Manager checks and approval. Record the 500-choice cap if it affects the prepared dataset.

## Assigned website applications

### AG-025 — Application status, paging and selected context

**Priority:** P0 · **Mode:** Basic · **Changes:** None

**Start:** Agent A → `/system/enrollments?view=applications`; multiple pages/status references.

1. Inspect RECEIVED, FORWARDED and CLOSED filters and the default list.
2. Open an application from a later page, return and use Back/Forward/reload.
3. If using a supported query in the URL, confirm it remains associated with the selected view; use only filters actually offered by this screen.

**Expected:** Only A-assigned intake appears. Recognized status/page/selection context survives navigation; no task/job-recruitment application is mixed into membership intake.

### AG-026 — Original revision and answers remain immutable

**Priority:** P0 · **Mode:** Basic · **Changes:** Unsaved review draft

**Start:** RECEIVED application with known original form revision/answers.

1. Open the exact application and compare original answers, contact and revision with the source fixture.
2. Change a reviewed contact field in Agent review.
3. Compare original evidence with the edited review fields without forwarding yet.

**Expected:** The original submission remains visible and unchanged. Review corrections are clearly separate and cannot rewrite the original website answers or form revision.

### AG-027 — Forwarding validation

**Priority:** P0 · **Mode:** Basic · **Changes:** No successful forward

**Start:** Fresh RECEIVED application; available eligible batch.

1. Try forwarding with no batch and invalid/blank required new-member contact fields.
2. Test an invalid email and excessive values against the displayed field limits.
3. Correct each field and verify the form can be used again without sending yet.

**Expected:** Invalid data is explained and creates no enrollment request. The draft remains correctable; no false Forwarding state or claim of Manager approval appears.

### AG-028 — Forward using an existing scoped member

**Priority:** P0 · **Mode:** Basic · **Changes:** Application/request when submitted

**Start:** Dedicated RECEIVED application; existing scoped member, including blank-phone variant; eligible target batch.

1. Search Find an existing member with at least two characters and choose the intended match.
2. Inspect the saved identity/contact values; compare with a foreign-member search and an empty search result.
3. Forward to the eligible batch; repeat the blank-phone variant on a separate application.

**Expected:** Existing identity is reused with saved contact values, including a legitimately blank saved phone. Foreign members are absent. Each successful forward creates one linked request without duplicating the person or rewriting original answers.

### AG-029 — Forward a new applicant once

**Priority:** P0 · **Mode:** Basic · **Changes:** Application and enrollment request

**Start:** Dedicated RECEIVED application; record original answer snapshot and initial member/request counts.

1. Review/correct synthetic contact fields, select an eligible assigned batch and forward.
2. Observe completion, open the resulting exact enrollment reference and refresh intake history.
3. Preserve this PENDING request for AG-049.

**Expected:** One request is created; application becomes FORWARDED and retains original evidence/review linkage. Membership, account, schedule and capacity reservation are not created by forwarding. Approval stays with Manager/authorized COO.

### AG-030 — Closing reason and cancellation

**Priority:** P0 · **Mode:** Basic · **Changes:** Unsaved closing draft only

**Start:** Dedicated RECEIVED application for closing.

1. Enter fewer than three non-space characters in Reason for closing; inspect the disabled action.
2. Enter a valid reason and choose Close application once.
3. Inspect the named confirmation, choose Keep reviewing, then change the reason.

**Expected:** A meaningful reason and explicit second confirmation are required. Keep reviewing does not close anything; editing the reason resets confirmation. No enrollment rejection or membership change occurs.

### AG-031 — Confirm close and show one authoritative status

**Priority:** P0 · **Mode:** Basic · **Changes:** Application closes

**Start:** Same unclosed fixture from AG-030, or another fresh RECEIVED application.

1. Enter the final reason, choose Close application and then Confirm close application.
2. Inspect the selected detail immediately, including any nearby summary card/link.
3. Reload and find the record in CLOSED history.

**Expected:** Status and retained reason are CLOSED consistently; original answers remain. No stale Received/Review application summary contradicts the closed detail. Forwarding is unavailable and no membership/request rejection is invented.

### AG-032 — Changed application keeps drafts until explicit reconciliation

**Priority:** P0 · **Mode:** Assisted · **Changes:** Concurrent test record change

**Start:** RECEIVED application with edited contact/batch and closing reason variants.

1. Type a draft; have the operator make a valid version-changing update to that application.
2. Refresh or attempt the original forward/close; inspect the stale/409 state and retained fields.
3. Cancel the discard/latest prompt once, then explicitly confirm loading the latest record.

**Expected:** Drafts survive the conflict and cancellation; stale actions are blocked without pretending to be actively forwarding/closing. Only explicit confirmed reconciliation replaces the draft with authoritative current state.

### AG-033 — Batch-choice and directory failures do not hide selected intake

**Priority:** P0 · **Mode:** Assisted · **Changes:** Application closes in one variant

**Start:** Selected RECEIVED application; operator can fail the batch-choice read and directory read independently.

1. Fail batch choices while loading the selected application; inspect original answers and closing controls.
2. Restore choices and retry; then delay/fail only the directory list while selected detail remains healthy.
3. Close a separate selected fixture with a reason while choices remain failed.

**Expected:** Forwarding waits for valid choices; original detail and eligible close remain usable. List loading/errors do not replace selected detail or reintroduce a stale received summary. Closing does not depend on healthy batch-choice loading.

### AG-034 — Application read failure and missing detail

**Priority:** P1 · **Mode:** Assisted · **Changes:** None

**Start:** Valid selected application plus a nonexistent valid UUID fixture value.

1. Fail only the selected detail read, inspect the message and use Retry after restoring it.
2. Open a nonexistent valid UUID and a malformed application URL in separate variants.
3. Return to the authorized application list.

**Expected:** Loading, failed detail and unavailable record are distinct from an empty list. No other application's answers appear beneath the wrong selection; malformed state has safe recovery.

### AG-035 — Lost forward response reconciles the original action

**Priority:** P0 · **Mode:** Assisted · **Changes:** One application forward/request

**Start:** Dedicated RECEIVED application; operator can suppress only its committed forward response.

1. Fill the forward form, submit and have the operator verify server acceptance while withholding the response.
2. Inspect the unconfirmed state and locked original fields; restore transport and choose Retry original action.
3. Independently count resulting requests and inspect current application/reference.

**Expected:** The exact original payload/key is reused. The result is reconciled to one request/forward action, not another member or request. An edited attempt cannot bypass the unresolved original result.

### AG-036 — Lost close response and pending labels

**Priority:** P0 · **Mode:** Assisted · **Changes:** One application closes

**Start:** Dedicated RECEIVED application; valid close reason; response-loss control.

1. Confirm close, suppress its response after acceptance and observe pending/unconfirmed wording.
2. Restore transport and retry the original action or explicitly check the latest application.
3. Inspect CLOSED state/reason and retained original evidence.

**Expected:** Only the actual close operation is described as Closing. Retrying does not create a different reason/action; current authoritative CLOSED status is shown without a false received summary.

### AG-037 — Application reassignment clears private review data

**Priority:** P0 · **Mode:** Assisted · **Changes:** Fixture reassignment

**Start:** A-assigned RECEIVED application open with review draft; B available.

1. As COO reassign the application to B through the supported workflow.
2. Refresh or attempt an action in A while a prior read is delayed, then release that read.
3. Sign in as B and inspect the reassigned application.

**Expected:** A loses private detail/draft/action access; late responses cannot restore it. B's valid read confirms the fixture still exists. Reassignment does not silently forward, close or enroll the applicant.

### AG-038 — Agent cannot reassign or manage the website form

**Priority:** P0 · **Mode:** Assisted · **Changes:** No authorized Agent mutation

**Start:** Agent A; real application/form IDs; operator has valid authorized request shapes.

1. Inspect the application/enrollment UI for reassignment, form builder and publishing controls.
2. Perform the Agent API probes for assignment/form management in the access appendix.
3. Verify the application's assignment and published form revision did not change.

**Expected:** These controls are unavailable to Agent and valid attempted requests are server-denied. Hiding a button alone does not complete this boundary check.

### AG-039 — Leave an application draft deliberately

**Priority:** P1 · **Mode:** Basic · **Changes:** Unsaved draft discarded only on confirmation

**Start:** RECEIVED application with unsaved contact/closing-reason edits and no uncertain write.

1. Attempt ordinary in-app departure; cancel the draft warning.
2. Confirm that the draft remains, then deliberately confirm departure and return.
3. Separately test browser reload/Back while noting whether the browser presents a departure warning.

**Expected:** Supported guarded departure permits cancellation; confirmed unmount/reload does not promise draft recovery. There is no durable/offline draft queue; unexpected unguarded loss during a supported guarded action is recorded as a defect.

## Enrollment submission and request follow-up

### AG-040 — Request list, statuses and page context

**Priority:** P0 · **Mode:** Basic · **Changes:** None

**Start:** Agent A → Enrollments with multiple pages and all three outcomes.

1. Inspect All statuses, Pending approval, Approved and Rejected; use the available page controls.
2. Open/close a later-page request, reload and use Back/Forward.
3. Try a filter with no matches and recover with Show all statuses/first-page guidance.

**Expected:** List scope is A's submitted requests, not every request in A's current batches. Recognized context survives; empty, unavailable and loading states are truthful. No unsupported search/sort control is assumed.

### AG-041 — Exact request links work outside current filters

**Priority:** P0 · **Mode:** Basic · **Changes:** None

**Start:** Known own Approved request and a list currently filtered to Pending.

1. Copy the own request's exact link/reference and open it while preserving the conflicting list filter in URL context.
2. Inspect name, batch, status, outcome/reviewer/note where available.
3. Return to the list, then reopen a saved-reference link after a new submission.

**Expected:** Authorized exact detail can load even when absent from the current list page/filter. Returning retains list context. A failed directory read must not be mistaken for denial of an independently healthy exact request.

### AG-042 — Manual new-member field validation

**Priority:** P0 · **Mode:** Basic · **Changes:** No successful submission

**Start:** Submit enrollment drawer; no existing member selected.

1. Try empty fields/no batch, a one-character name, too-short phone and invalid email.
2. Test visible limits: name 2–100 characters, phone 7–25, optional email up to 254.
3. Correct to a valid synthetic name/phone, leave email blank and select an eligible batch without submitting yet.

**Expected:** Invalid input cannot create a request; errors/native validation support correction. Email is optional for a new member; required contact and batch remain enforced by the API as well as the interface.

### AG-043 — Submit a new member without creating membership early

**Priority:** P0 · **Mode:** Basic · **Changes:** One enrollment request

**Start:** Fresh valid synthetic contact, eligible assigned batch; capture membership/request baseline.

1. Choose Submit enrollment, fill new-member details and batch, then submit once.
2. Record the saved request reference, open its exact detail and refresh the list/home.
3. Verify the membership/current-position/schedule baseline with the helper; keep this request for AG-050.

**Expected:** One PENDING/With Batch Manager request is saved with the intended contact/batch. Submission alone creates no membership, customer account, schedule or reserved position; status/reference remain findable after closing the drawer.

### AG-044 — Reuse an existing member, including a blank saved phone

**Priority:** P0 · **Mode:** Basic · **Changes:** One request per prepared variant

**Start:** Existing scoped member and blank-phone member; distinct eligible target batches.

1. Search at least two characters, choose the intended member and inspect read-only saved identity/contact.
2. Submit to the eligible target batch and inspect the resulting member linkage.
3. Repeat with the blank-phone member; search a B-only member as a separate denied-lookup control.

**Expected:** Existing member ID/contact is reused without requiring an invented phone or creating a duplicate person. B-only members are absent. Blank saved phone remains blank; this differs from required phone for a new member.

### AG-045 — Clear existing-member selection and cancel a drawer draft

**Priority:** P1 · **Mode:** Basic · **Changes:** Unsaved draft only

**Start:** Manual enrollment drawer with an existing member selected.

1. Choose Use a new member instead and inspect identity/contact fields.
2. Enter a new draft, close/Escape, cancel the discard prompt and inspect preserved fields.
3. Confirm discarding, reopen the drawer and inspect it again.

**Expected:** Switching to new member removes the previous member ID and saved contact data. Cancel preserves the open draft; confirmed discard clears it and cannot silently submit the prior identity.

### AG-046 — Unusable and reassigned batch choices

**Priority:** P0 · **Mode:** Assisted · **Changes:** Fixture readiness/assignment only

**Start:** Eligible batch plus closed/unassigned/missing/inactive-Manager variants.

1. Inspect manual and application-forward choosers for eligible batches.
2. After selecting a previously eligible batch, have COO change its assignment/readiness.
3. Try the original submission, then restore legitimate readiness and retry through a new reconciled attempt.

**Expected:** Unsupported batch/Manager combinations cannot produce a valid enrollment. Server-side current scope/readiness overrides stale UI choices; no hidden capacity promise or permission expansion appears.

### AG-047 — Duplicate clicks and an uncertain manual submission

**Priority:** P0 · **Mode:** Assisted · **Changes:** One enrollment request

**Start:** Dedicated new-member draft; response-loss control; initial request count recorded.

1. Submit, click again while pending and suppress the accepted response.
2. Try editing during uncertainty, close/reopen within the still-mounted workspace and inspect the original reference/locked draft.
3. Restore transport and retry the original submission; independently verify the saved request count.

**Expected:** Pending blocks concurrent sends; unconfirmed data/reference remain frozen. Original retry reconciles one request with the same payload/submission identity, rather than creating a changed second attempt.

### AG-048 — Definite validation failure allows correction

**Priority:** P0 · **Mode:** Assisted · **Changes:** One corrected request after initial rejection

**Start:** Operator can produce a genuine pre-commit validation rejection, not a lost response.

1. Submit the controlled invalid/stale-choice attempt and confirm no request was committed.
2. Inspect its error, correct the relevant input/choice and submit a valid attempt.
3. Open the saved reference and inspect total requests for the fixture.

**Expected:** A definite failure permits correction and a new attempt; it is distinguished from an uncertain accepted write. Only the valid attempt creates a request.

### AG-049 — Manager approves an Agent-forwarded request

**Priority:** P0 · **Mode:** Basic · **Changes:** Request approval and membership

**Start:** PENDING request from AG-029; eligible capacity/terms; assigned Manager session.

1. As Agent inspect the pending request and confirm no approve/reject control.
2. As assigned Manager approve the exact request using the existing review workflow.
3. As Agent refresh exact detail, list, home/network totals and relevant notification; have Manager verify the resulting membership/schedule.

**Expected:** Authorized review changes outcome to APPROVED with truthful reviewer information; intended membership/schedule is created once under recorded rules. Agent only observes the outcome and cannot self-approve.

### AG-050 — Manager rejects without creating membership

**Priority:** P0 · **Mode:** Basic · **Changes:** Request rejection

**Start:** Separate PENDING request from AG-043; assigned Manager session; baseline member count.

1. As Manager reject the exact request with a factual synthetic reason.
2. As Agent refresh detail, rejected list and notification destination.
3. Confirm the outcome/reason and compare the helper's membership/schedule baseline.

**Expected:** Request is REJECTED with the authorized outcome; no membership/schedule is created. Rejection does not close an unrelated website application, erase source answers or grant Agent review power.

### AG-051 — Capacity conflict happens at approval, without reservation

**Priority:** P0 · **Mode:** Assisted · **Changes:** Dedicated capacity fixtures

**Start:** Isolated batch/requests prepared to reach capacity between request submission and review.

1. Submit a valid Agent request while capacity is available; record that no position was reserved.
2. Have the authorized helper fill remaining real capacity through a different valid approval.
3. Attempt approval of the original request and inspect both the Manager response and Agent follow-up.

**Expected:** Existing atomic capacity rules prevent over-enrollment. Agent never sees a false approved membership; the actionable request/conflict outcome remains truthful. Do not alter an existing shared full batch to prepare this case.

### AG-052 — Enrollment reads, access loss and invalid URL recovery

**Priority:** P0 · **Mode:** Assisted · **Changes:** Disposable scope/session variant

**Start:** Own exact request and open submission draft; operator can fail list, detail and choices separately.

1. Fail each read independently, restore it and use the corresponding Retry; compare healthy list/detail/choices behavior.
2. Open a foreign/nonexistent valid request ID and invalid page/status URL; recover using available controls.
3. Revoke the draft's relevant access, retry and let an older read complete.

**Expected:** Failed/loading/empty/denied states are distinct; independent healthy data remains usable. Denied private contacts/reference clear, malformed URL state is safe, and no delayed read resurrects the denied snapshot.

## Withdrawal and replacement follow-up

### AG-053 — Read assigned cases and preserve list context

**Priority:** P0 · **Mode:** Basic · **Changes:** None

**Start:** Agent A with multiple assigned withdrawal cases/statuses/pages.

1. Open Withdrawals; use the provided status, search and page controls.
2. Open exact case detail; inspect member/batch, reason, status/history and financial context.
3. Return/reload/use Back and compare the selected request and filters.

**Expected:** Cases follow current assigned-batch scope. Identity, history and recognized URL state remain consistent; current obligation/verified paid/remaining values are read-only and are not general customer-payment access.

### AG-054 — Review and forward a member withdrawal

**Priority:** P0 · **Mode:** Basic · **Changes:** Withdrawal forwarded to COO

**Start:** Member-created AWAITING_AGENT case; record current position/dues; Agent is not the withdrawing member.

1. Read the member's explanation and enter insufficient then valid Agent review notes.
2. Choose Forward to COO once and observe the actual saving state and result; this Agent review form has no separate confirmation step.
3. Refresh the case/history and compare current dues/position with the helper; keep for AG-055.

**Expected:** Only a valid forward advances to COO review. Agent context/history is retained; withdrawal/refund is not approved and installments/current position continue.

### AG-055 — Follow COO approval and rejection separately

**Priority:** P0 · **Mode:** Basic · **Changes:** Two dedicated withdrawal decisions

**Start:** Forwarded case from AG-054 plus a second equivalent case; COO session.

1. As COO approve one and reject the other using recorded reasons; set replacement policy on the approved case when required.
2. As Agent refresh both cases and inspect outcomes/actions/history.
3. Confirm obligations/current position before any replacement handover.

**Expected:** Agent sees truthful approved/rejected outcomes without a decision editor. Approval alone does not stop dues or pay a refund; replacement availability follows the approved recorded policy.

### AG-056 — Self-withdrawal and ineligible forwarding boundaries

**Priority:** P0 · **Mode:** Assisted · **Changes:** No prohibited forward

**Start:** Separate own-customer withdrawal if applicable, already-forwarded/terminal cases and B-only case; valid control exists.

1. Inspect Agent controls on each ineligible case under its actual accessible scope.
2. As Agent attempt a valid-shaped direct forward request for each prepared ineligible variant.
3. Compare status/history with the authorized helper.

**Expected:** Agent cannot forward its own withdrawal or bypass scope/status rules. A duplicate/terminal attempt makes no additional transition; helper verification distinguishes denial from a nonexistent fixture.

### AG-057 — Distinguish undecided refund from zero

**Priority:** P0 · **Mode:** Basic · **Changes:** None

**Start:** Undecided/null, approved-positive/unpaid and fully paid positive refund references; the last has zero remaining.

1. Open each case's Recorded external refund panel.
2. Compare approved amount, paid amount, still unpaid, target date and decision note with the register.
3. Compare Installment record values separately.

**Expected:** Null/undecided is not displayed as zero or as an approved refund. A fully paid positive refund shows zero remaining with the correct paid status; currency/date/status is factual. Do not fabricate a zero-amount approval, which the existing API disallows. Refund amounts do not overwrite dues, verified payments or membership history.

### AG-058 — Finance payout is visible context, without Agent payout power

**Priority:** P0 · **Mode:** Basic · **Changes:** Synthetic Finance payout only

**Start:** COO-approved positive refund; Finance session; no unresolved payment-policy variant.

1. As Agent inspect read-only refund facts and absence of payout/refund-decision controls.
2. As Finance record one partial then final synthetic external payout through the existing workflow.
3. Refresh Agent detail after each and compare paid/remaining/status with Finance.

**Expected:** Approved, partially paid and fully paid/zero remaining are accurate. Recording payout does not itself perform replacement handover, transfer credit or stop dues. Agent cannot record or approve the payout.

### AG-059 — Propose CONTINUE_UNPAID replacement

**Priority:** P0 · **Mode:** Basic · **Changes:** One replacement enrollment request

**Start:** Approved case with current COO CONTINUE_UNPAID policy, eligible new replacement and no competing proposal; snapshot schedules/receipts.

1. Read Recorded replacement terms, installment dates/amounts and consequences.
2. Enter valid synthetic replacement details and choose Submit replacement for Manager approval once; this form has no separate confirmation step.
3. Open the linked request and preserve it for AG-060; compare current dues/position before approval.

**Expected:** Proposal uses only the recorded unpaid installments and creates one PENDING linked request. Existing member keeps current position/dues until handover; no verified credit transfers and no extra position is reserved.

### AG-060 — Manager approves CONTINUE_UNPAID handover

**Priority:** P0 · **Mode:** Basic · **Changes:** Replacement handover

**Start:** Pending request from AG-059; assigned Manager; preserved original receipt/schedule snapshots.

1. As Manager inspect and approve the exact linked replacement request.
2. As Agent refresh withdrawal/request and inspect replacement status and financial context.
3. Have the helper compare old/new positions, remaining schedule and original verified receipts.

**Expected:** Existing atomic handover rules apply once. Original history/receipt ownership remains intact; unpaid obligation release is identified separately from payment/refund. Replacement schedule matches recorded unpaid terms and no extra real position is created.

### AG-061 — RESTART replacement uses the COO's recorded plan

**Priority:** P0 · **Mode:** Basic · **Changes:** Replacement proposal and handover

**Start:** Separate approved RESTART case with explicit new price/plan/dates; assigned Manager and snapshots available.

1. As Agent compare preview installment dates/amounts/total with the COO policy and propose a valid replacement.
2. Confirm original position/dues continue while PENDING; as Manager approve the exact request.
3. Refresh Agent case and have the helper inspect resulting schedule/history.

**Expected:** Agent cannot author new financial terms. Approved handover uses the recorded restart plan, preserves original receipts/history and does not reassign verified credit. Refund decision/payout remain separate.

### AG-062 — Existing replacement-member lookup and reset

**Priority:** P0 · **Mode:** Basic · **Changes:** One replacement request when submitted

**Start:** Eligible approved case; scoped existing member, blank-phone variant and B-only member control.

1. Find an existing replacement member; choose the scoped match and inspect saved identity/contact.
2. Clear the selection/use new member, then reselect the intended existing member.
3. Submit on a dedicated case; repeat blank-phone and foreign-lookup variants on separate prepared cases.

**Expected:** Saved identity/contact are respected, including blank saved phone. Clearing removes the old identity; foreign members are not exposed. Eligibility rules still apply and no duplicate person is invented.

### AG-063 — Missing, stale and financially blocked replacement terms

**Priority:** P0 · **Mode:** Assisted · **Changes:** Dedicated policy/payment fixtures

**Start:** No-policy, pending-payment-claim, financial-change-after-policy and version-mismatched preview variants.

1. Inspect each recorded-terms explanation and proposal availability.
2. Try the otherwise valid proposal while blocked; fail/restore the preview read separately.
3. Have COO/Finance resolve the actual prerequisite through existing workflows, reload current case/terms and retry only the eligible variant.

**Expected:** Missing/stale/blocked terms prevent proposal/cutover and explain the required authorized follow-up. Failed preview cannot become an empty/free plan; Agent cannot override policy or payment eligibility.

### AG-064 — Pending proposal and Manager rejection

**Priority:** P0 · **Mode:** Basic · **Changes:** Dedicated replacement rejection; later new proposal if eligible

**Start:** Approved withdrawal with one PENDING replacement request; Manager session.

1. Inspect Agent's linked request and attempt to create a competing proposal.
2. As Manager reject the existing request with a synthetic reason.
3. As Agent refresh; inspect unchanged current position/dues and submit a different proposal only if current eligibility permits.

**Expected:** A pending proposal cannot be duplicated or compete for handover. Rejection is visible without removing the original member or history. A later eligible proposal is a distinct reconciled attempt, not an automatic approval.

### AG-065 — Uncertain withdrawal and replacement actions

**Priority:** P0 · **Mode:** Assisted · **Changes:** One action per separate fixture

**Start:** Separate forward and replacement fixtures; post-commit response-loss control.

1. Submit each action and drop its accepted response; inspect locked review/proposal data and original command.
2. Restore transport and use Retry original action, or explicitly Check latest request before deciding what to do next.
3. Verify final history, replacement request count and dues/position with the helper.

**Expected:** Retries reuse the original body/key and reconcile one action. Unconfirmed edits cannot create another proposal; no duplicate request/history transition or premature handover occurs.

### AG-066 — Withdrawal conflicts preserve drafts

**Priority:** P0 · **Mode:** Assisted · **Changes:** Concurrent case/policy update

**Start:** Open review-note and replacement-contact draft variants.

1. Have the authorized helper advance the exact case/policy version while Agent is drafting.
2. Refresh/submit the original draft; inspect the stale/409 state and retained fields.
3. Cancel Check latest request once, then confirm the deliberate discard/reload.

**Expected:** Draft survives conflict/cancel; stale actions remain blocked. Confirmed latest load uses authoritative case/policy, with no false Saving state when no operation is active.

### AG-067 — Batch reassignment does not expand enrollment access

**Priority:** P0 · **Mode:** Assisted · **Changes:** Dedicated batch assignment

**Start:** Withdrawal with replacement request submitted by A; COO can assign the batch to B.

1. As COO move current batch assignment to B; preserve the original submittedBy relationship.
2. As B open the authorized withdrawal and inspect the replacement-enrollment link.
3. Try the old request's exact URL as B; refresh A's former batch-dependent case access.

**Expected:** B may see the newly assigned withdrawal while the prior Agent's enrollment remains unavailable. The UI explains that boundary; neither a link nor reassignment broadens request ownership. A's current withdrawal access is rechecked.

### AG-068 — Withdrawal independent read errors, access loss and departure

**Priority:** P0 · **Mode:** Assisted · **Changes:** Unsaved draft/disposable assignment

**Start:** Open case with draft; list/detail/terms read controls and separate assignment-loss fixture.

1. Fail list, detail and terms independently; restore/retry each and use an independently healthy exact case.
2. Cancel a draft-departure prompt, then deliberately confirm departure on the non-uncertain variant.
3. Revoke relevant assignment while a different case draft is open and release an older delayed read.

**Expected:** Healthy data is not hidden by unrelated read failure; genuine empty differs from failed. Cancel retains the draft; confirmed departure has no durable recovery promise. Denied private data clears and stays cleared after late responses.

## Own assigned tasks and evidence

### AG-069 — Own task list, details, history and URL state

**Priority:** P0 · **Mode:** Basic · **Changes:** None

**Start:** Agent A with multiple task pages and TODO/IN_PROGRESS/SUBMITTED/DONE/CANCELLED references.

1. Open My tasks; apply each status and page through the available list.
2. Open an exact task and inspect title, instructions, assigner, priority, deadline/status and activity.
3. Close/reload/use Back; open a direct task outside the current status/page filter.

**Expected:** Only own assignments appear; exact authorized detail works independently of list filtering. Status/page/selection restore; task history is factual without private KPI evaluation text or team-management powers.

### AG-070 — Starting work preserves report and file

**Priority:** P0 · **Mode:** Basic · **Changes:** TODO becomes IN_PROGRESS

**Start:** Dedicated TODO task, short report draft and valid evidence file.

1. Open the task and type Report; select evidence with Choose evidence.
2. Choose Start task and observe which action is pending.
3. Inspect status, report/file and activity after completion; keep this task for a submission variant.

**Expected:** Task becomes IN_PROGRESS once while retaining unsaved report/file. Only Start shows Starting task; submit is not falsely described as busy/successful.

### AG-071 — Submit a written report only

**Priority:** P0 · **Mode:** Basic · **Changes:** One task becomes SUBMITTED

**Start:** Fresh own TODO/IN_PROGRESS task with future deadline and no attachment requirement beyond current rules.

1. Enter a factual synthetic report and leave evidence empty.
2. Choose Submit work for review once; inspect saved report/status/time and activity.
3. Refresh/reopen and preserve for authorized completion in AG-075.

**Expected:** Report-only work is accepted once and becomes SUBMITTED, not Completed. Saved text/timing remain accurate; Agent receives no assignment/completion/KPI controls.

### AG-072 — Submit evidence only and combined work

**Priority:** P0 · **Mode:** Basic · **Changes:** One submission per separate task

**Start:** Separate own tasks for PDF/JPG/PNG/WebP file-only variants and a combined report/file variant.

1. Choose valid evidence with a long descriptive filename; inspect its full name/extension and Remove evidence, then choose again.
2. Submit file-only work; on a separate task submit both report and file. Repeat each allowed format using distinct records.
3. Reopen and download the authorized evidence; compare file content/name and saved report where supplied.

**Expected:** Each allowed file format works within the limit; file-only is valid. Filename/extension and download remain usable, combined work retains both parts, and each task is Submitted pending authorized review.

### AG-073 — Evidence size/type boundaries and failed upload

**Priority:** P0 · **Mode:** Assisted · **Changes:** Dedicated valid submission only

**Start:** Valid 5,242,880-byte file, larger file, disallowed type and a controlled upload-failure task.

1. Select the oversized and disallowed files; inspect rejection and retained report.
2. Select the genuine allowed file exactly at the 5 MiB boundary; submit on a dedicated task.
3. On another task fail a pre-commit upload, restore it and correct/retry; have the operator check server rejection of oversized/disallowed direct uploads.

**Expected:** UI/API enforce one allowed PDF/JPG/PNG/WebP file up to 5 MiB (shown as 5 MB). Invalid/failed upload causes no false saved submission; a valid boundary file is accepted. Preserve report/file for legitimate recovery.

### AG-074 — Report is bounded and cannot be empty without evidence

**Priority:** P0 · **Mode:** Basic · **Changes:** Dedicated valid submission variant

**Start:** Fresh own task; no evidence initially selected.

1. Try a blank and whitespace-only report with no file.
2. Enter a 5,000-character synthetic report; inspect field behavior beyond the limit, then submit the valid-length value on a dedicated task.
3. Remove a previously selected file from another empty-report draft and inspect submission availability.

**Expected:** At least report or permitted evidence is required; whitespace is not a report. Report limit is enforced without silent truncation of a saved result. Removing the only evidence restores the invalid/disabled state.

### AG-075 — Authorized completion of on-time Agent work

**Priority:** P0 · **Mode:** Basic · **Changes:** Task becomes DONE

**Start:** On-time SUBMITTED task from AG-071/072; authorized Pioneer/assigner session.

1. As Agent confirm the submitted report/evidence and absence of Mark complete.
2. As authorized assigner read/download the saved work and complete the eligible task.
3. Refresh Agent detail/activity/list/home and compare expected count changes.

**Expected:** Completion belongs to the authorized reviewer. Agent sees Completed with retained work/history; TODO/IN_PROGRESS open counts remain correct. Agent cannot complete its own task through a direct request.

### AG-076 — Late submission requires human KPI review without exposing it

**Priority:** P0 · **Mode:** Basic · **Changes:** Dedicated late-task submission/review/completion

**Start:** Own task with past deadline; authorized assigner and KPI reviewer sessions.

1. As Agent submit work after the deadline and inspect factual submitted/deadline timing.
2. As assigner attempt completion before formal review; as authorized KPI reviewer record the existing human review.
3. As assigner complete when eligible; inspect Agent task/activity/evidence afterward.

**Expected:** Late timing is factual. Existing completion review rules apply; formal evaluation text remains private to authorized reviewers. Agent cannot view/create KPI decisions, and no salary deduction or wage action is automatic.

### AG-077 — Cancelled and completed tasks are terminal

**Priority:** P0 · **Mode:** Assisted · **Changes:** Dedicated helper cancellation only

**Start:** Completed/cancelled references plus a separate own draft task that the assigner can cancel.

1. Inspect terminal reference detail and available actions.
2. While drafting the separate task, have its assigner cancel it; refresh/reconcile in Agent.
3. Try stale Start/Submit through a valid-shaped assisted request and inspect final status/history.

**Expected:** Cancelled/Completed have no new Start/Submit action and cannot be revived by stale requests. Cancellation is visible; private draft handling is deliberate and no report is falsely marked submitted/completed.

### AG-078 — Task conflict keeps report and evidence

**Priority:** P0 · **Mode:** Assisted · **Changes:** Concurrent fixture edit

**Start:** Own draft task with report/file; authorized assigner can update its version.

1. Make the concurrent edit while Agent drafts, then refresh or submit the stale version.
2. Inspect retained report/file and the stale notice; cancel Load latest task once.
3. Confirm Load latest task and inspect the authoritative instructions/status.

**Expected:** Conflict never silently overwrites the draft or submits stale work. Cancel retains the draft; explicit confirmed reload replaces it and reinstates only currently allowed actions.

### AG-079 — Lost task Start/Submit response reconciles safely

**Priority:** P0 · **Mode:** Assisted · **Changes:** One transition per separate task

**Start:** Separate Start and multipart Submit fixtures; response loss after acceptance, original version/report/file recorded privately.

1. Perform the action and suppress only its committed response; inspect locked uncertainty state.
2. Restore transport and use Retry original task action or Check latest task.
3. Compare saved status/report/attachment and audit/activity count with the helper.

**Expected:** Retry preserves the original report/file/version. Existing version checks reconcile the saved result and prevent duplicate submission/audit or a changed multipart command. There is no claim of a durable retry queue.

### AG-080 — Rapid selection and independent task read failures

**Priority:** P1 · **Mode:** Assisted · **Changes:** None

**Start:** Two own tasks; operator can delay detail A and fail list/activity/detail separately.

1. Start loading A, switch to B and release A's late response.
2. Fail each independent read, inspect the healthy portions and use the matching Retry after restoration.
3. Open a nonexistent valid ID and malformed task URL; return to a valid selection.

**Expected:** B stays selected with truthful loading until its own response completes; A cannot overwrite it or clear its loading early. Errors are distinct from empty/unavailable; healthy exact detail survives unrelated list failure.

### AG-081 — Task reassignment clears report/file and old responses

**Priority:** P0 · **Mode:** Assisted · **Changes:** Dedicated task reassignment

**Start:** Own task with report/file draft; authorized assigner and B session; delayed old detail read.

1. As assigner move the task from A to B through the existing workflow.
2. In A refresh/attempt submission; release the older delayed response.
3. In B verify the task is now accessible; in A retry exact detail and evidence.

**Expected:** A loses private detail/report/file and cannot submit or download; late results do not restore them. B's authorized read confirms the task still exists. Reassignment does not copy A's unsaved private draft to B.

### AG-082 — Evidence download checks current authorization

**Priority:** P0 · **Mode:** Assisted · **Changes:** None

**Start:** Own submitted attachment, B-only attachment, and local download-failure control.

1. Download own evidence and compare content/full filename; fail a later own download and restore/retry.
2. Try B's exact attachment endpoint while authenticated as A, with B first verifying the file exists.
3. Repeat a formerly own attachment link after assignment/session loss on a disposable variant.

**Expected:** Own authorized download works and a transient failure is recoverable without resubmission. Foreign/revoked reads are server-denied; no bytes or private file details leak through a copied URL.

### AG-083 — Task draft departure, Escape and explicit discard

**Priority:** P1 · **Mode:** Basic · **Changes:** Unsaved task draft

**Start:** Own task with report/file draft and no pending write.

1. Press Escape/close; cancel the discard prompt and inspect retained report/file.
2. Try supported ordinary link departure and cancel its warning.
3. Deliberately confirm discard/leave; reopen the task and inspect saved state.

**Expected:** Cancel retains the draft; intentional discard does not submit anything or promise recovery. Focus returns meaningfully; unmount/reload cannot be treated as durable report storage.

## Own notifications

### AG-084 — Inspect both notification feeds

**Priority:** P0 · **Mode:** Basic · **Changes:** None until opening a notice

**Start:** Both Tasks and enrollments and Received updates populated for A.

1. Open Notifications; inspect each view's help text and title/message/time/read state.
2. In Tasks and enrollments choose All reminders and outcomes, Tasks and Enrollments.
3. Compare selected notices with actual current task/request/application/withdrawal fixtures.

**Expected:** Current task reminders/enrollment outcomes and received application/withdrawal events are discoverable in their respective feeds. All records are recipient-scoped; displayed times are correctly labeled PHT.

### AG-085 — Notices open all four exact destination types

**Priority:** P0 · **Mode:** Basic · **Changes:** Own notices marked read

**Start:** Separate own task, enrollment request, assigned application and withdrawal notices.

1. Open one notice of each destination type and record the intended record ID.
2. Compare the destination's selected ID/name/status with the original notice.
3. Return to Notifications and confirm the originating notice's read status.

**Expected:** Links open the exact currently authorized task/request/intake/case, not a default list or unrelated record. Applications select the application view. Opening marks only the intended own notice as read.

### AG-086 — Unread and bulk read remain scoped

**Priority:** P0 · **Mode:** Basic · **Changes:** Own notice read state

**Start:** A has read/unread notices in both feeds/types; B has unread control notices.

1. Enable Unread only and open/mark one notice; refresh to verify persistence.
2. Choose Mark this type as read for Tasks, then compare untouched enrollment notices and Received updates.
3. Choose Mark received updates as read; inspect B's independent control inbox.

**Expected:** Only applicable own records change. Type bulk read does not silently consume other types/feeds; B's read state is unchanged. Read totals and filtered rows update after refresh.

### AG-087 — Notification paging, URL and empty recovery

**Priority:** P1 · **Mode:** Basic · **Changes:** None

**Start:** More than one page of notices plus an empty unread/type view.

1. Select feed/type/unread/page; reload and use Back/Forward.
2. Inspect an empty view and use Check the other view/turn off Unread only.
3. Open `/system/notifications?view=bad&page=-1&unreadOnly=maybe` and use Reset filters.

**Expected:** Recognized filters/page persist and page controls have valid bounds. Empty state explains recovery; invalid state is safe and does not expose another recipient's notices.

### AG-088 — Notification failures and denied access

**Priority:** P0 · **Mode:** Assisted · **Changes:** Disposable notice/session variants

**Start:** Operator can fail a feed GET and a mark-read operation independently.

1. Fail loading, restore and use Retry notifications; repeat on the other feed.
2. Fail a mark-read request before commit, then retry legitimately and inspect saved state.
3. Revoke access during a read/mark action and let an older feed response complete.

**Expected:** Failed differs from empty and marking success is not invented. Denial clears private rows, prevents actions and cannot be reversed by a late response.

### AG-089 — Historical or unsupported notice destinations

**Priority:** P0 · **Mode:** Assisted · **Changes:** Dedicated assignment or destination fixture

**Start:** A historical notice whose record is now outside A's scope, plus unsupported/malformed/no-link notice variants.

1. Inspect each notice and any unavailable-destination explanation.
2. Open a formerly valid link and verify the destination rechecks current access.
3. Mark an unavailable own notice as read using its supported control.

**Expected:** Historical delivery does not grant record access. Unsupported/unavailable targets explain Pioneer/COO follow-up rather than invent a link, redirect to an external origin or reveal private detail. Own read-state action can still work.

### AG-090 — Header notification shortcuts and read-state refresh

**Priority:** P1 · **Mode:** Basic · **Changes:** Own notice read state

**Start:** Agent shell/header notification control with prepared own unread task/enrollment notices.

1. Open the header notification control and inspect its available notices/full-inbox link.
2. Open an exact shortcut, then return to the full inbox and compare read state.
3. Mark a notice in the full inbox, reopen/refresh the header control and inspect its badge/list.

**Expected:** Existing header controls stay consistent with the same recipient and exact destinations after refresh. A header shortcut grants no additional powers; do not require an unimplemented delete action on the current Agent inbox screen.

## Server-enforced access boundaries

These cases require the API method in the appendix. Route visibility alone is
insufficient. Record each probe's method/path, authenticated actor, fixture
existence control, status and whether any state changed. Do not save cookies or
authorization headers. A validation error, wrong URL, network failure or CSRF
rejection alone does not prove the business-permission boundary.

### AG-091 — Restricted workspaces are unavailable

**Priority:** P0 · **Mode:** Assisted · **Changes:** None

**Start:** Agent with only base grants; operator provides current restricted route list from workspace access/navigation.

1. Inspect sidebar/mobile navigation for Payments, general Clients/Records, Reports, Personnel, accounts/roles, recruitment, form publishing and KPI administration.
2. Open each real restricted route directly; record safe redirect/no-access behavior.
3. Exercise valid underlying read probes for representative Finance, personnel and KPI resources from the operator's authorized controls.

**Expected:** No private rows or management powers are exposed through direct routing or APIs. A route component existing in the repository is not evidence of an Agent grant.

### AG-092 — Network reads remain self-only

**Priority:** P0 · **Mode:** Assisted · **Changes:** None

**Start:** A and B exist, have distinct batches and valid agent UUIDs.

1. Read A's network profile/batches through the actual Agent session as a positive control.
2. Request B's exact agent detail and try a peer/team network request copied from the authorized helper.
3. Inspect returned list IDs and scoped totals for cross-Agent contamination.

**Expected:** A can read its own identity and currently assigned batches only. Foreign detail is denied/unavailable; permitted list responses omit foreign records. Pioneer-only aggregates/directories remain unavailable.

### AG-093 — Intake authorization covers reads and mutations

**Priority:** P0 · **Mode:** Assisted · **Changes:** No prohibited mutation

**Start:** A/B application controls, valid versions and request bodies; A's own forward/close positive controls already observed.

1. As A read B's exact application and submit valid-shaped foreign forward/close requests.
2. Attempt assignment/form editing/publishing with A using current valid authorized request shapes.
3. Verify B's application, assignment, request count and published revision are unchanged.

**Expected:** Foreign read/forward/close and COO-only assignment/form-management attempts are server-denied. No private answers or mutation side effects leak through Agent's manage-intake grant.

### AG-094 — Enrollment scope and self-approval are blocked

**Priority:** P0 · **Mode:** Assisted · **Changes:** No prohibited enrollment/review

**Start:** B-only request/member, unassigned batch, own PENDING request and current valid review payload.

1. Probe B's request/member lookup as A; compare valid own lookup/list controls.
2. Submit a well-formed enrollment referencing the unassigned batch/foreign member.
3. Attempt approval/rejection of A's own pending request as Agent; compare unchanged outcome/member count with Manager.

**Expected:** Lookup/list scope omits unauthorized identities; invalid scope cannot create an enrollment request. Agent review attempts are denied and cannot self-approve or create membership.

### AG-095 — Withdrawal, refund and payout authority stay separate

**Priority:** P0 · **Mode:** Assisted · **Changes:** No prohibited case/financial mutation

**Start:** B-only case and A-readable approved case; valid versions/decision/policy/refund/payout payloads from authorized helpers.

1. As A read/forward/propose against B's case with valid request shapes.
2. Against A's readable case attempt final decision, replacement policy, refund decision and payout endpoints as Agent.
3. Compare case status, policy, refund totals, payments, position and audit with the helpers.

**Expected:** Foreign case actions and COO/Finance-only writes are denied with no side effects. Read-only financial context does not grant general payment recording/verification or transfer of verified credit.

### AG-096 — Task, evidence, KPI and inbox boundaries are enforced

**Priority:** P0 · **Mode:** Assisted · **Changes:** No prohibited mutation

**Start:** B's real task/attachment/activity and notice; A's own task; valid management/review/mark-read controls.

1. As A probe B's task/detail/activity/file and valid-shaped Start/Submit; try own task create/edit/cancel/complete management actions without grants.
2. Probe formal KPI queue/review reads and a well-formed review write as A.
3. Try B's notification mark-read and notification-template management as A; confirm B's state and A's task are unchanged.

**Expected:** Every foreign or ungranted action is denied, without file bytes/private KPI text or state change. Own authorized list/start/submit/read remain usable as positive controls. Record each probe separately inside this case.

## Keyboard, accessibility, devices and final acceptance

### AG-097 — Keyboard operation and focus recovery

**Priority:** P1 · **Mode:** Basic · **Changes:** Unsaved drafts; dedicated submission only if intended

**Start:** Keyboard only; Agent pages with a submission drawer, task drawer and confirmation controls.

1. Navigate all seven destinations, filters/selects, page controls, Choose evidence and action confirmations with Tab/Shift+Tab/Enter/Space.
2. Open each drawer/dialog; tab forward/backward through its boundaries and press Escape with/without a draft.
3. Cancel discard once, then deliberately close and inspect returned focus.

**Expected:** Controls have visible focus and meaningful labels; modal focus stays within its active dialog and returns sensibly on close. Cancelled discard retains edits; no keyboard trap or unreachable action occurs.

### AG-098 — Actual screen-reader walkthrough

**Priority:** P1 · **Mode:** Specialist · **Changes:** Dedicated synthetic workflow only

**Start:** Named reviewer with an actual screen reader; record tool/version/browser pairing.

1. Read headings/landmarks, profile/batch table and one selected application/request/withdrawal/task using screen-reader navigation.
2. Operate a drawer/confirmation, cause a validation error, recover a failed read and observe a completed save/status update.
3. Read exact notice links, unavailable states and long evidence filenames; verify focus order/return and announcements.

**Expected:** Names, relationships, table headers, errors and state announcements are understandable without sight. Record actual issues and each pairing; automated axe results or a sighted keyboard run cannot substitute for this case.

### AG-099 — Phone widths and both themes across the whole role

**Priority:** P1 · **Mode:** Basic · **Changes:** None required

**Start:** Desktop plus 393px and 320px viewports; use a real phone/touch device when available and record simulation separately.

1. Inspect all seven destinations, both enrollment views and selected withdrawal/task details at each phone width in light and dark themes.
2. Open drawers, menus, confirmations and file controls; scroll to their primary/close actions.
3. Inspect long names, status, counts, dates and any meaningfully wide tables.

**Expected:** Content and actions remain readable/reachable; no unintended document-wide horizontal overflow or clipped dialog action occurs. A wide table may scroll within its own labeled region; text/state is not communicated by color alone.

### AG-100 — Enlarged text and browser zoom

**Priority:** P1 · **Mode:** Basic · **Changes:** None required

**Start:** Agent forms/lists/dialogs with long synthetic content; record scaling method and effective CSS viewport.

1. Set text/browser zoom to 200% and inspect home, all workspaces and Security.
2. Open enrollment/task drawers and withdrawal replacement terms; exercise filters and bottom actions.
3. Inspect labels/errors/full filenames and table-region scrolling with keyboard/touch.

**Expected:** Meaningful text and controls remain available without overlap, cut-off labels or hidden primary actions. Enlarging text does not require shrinking it again to complete the workflow.

### AG-101 — Reduced motion preserves state feedback

**Priority:** P1 · **Mode:** Basic · **Changes:** Unsaved drafts/read state only

**Start:** OS/browser reduced-motion preference enabled; normal-motion comparison available.

1. Sign in, navigate, open/close drawers and use selects/confirmations with reduced motion.
2. Trigger loading, a validation error and a successful dedicated action/read-state update.
3. Compare focus/state announcements with the normal-motion variant.

**Expected:** Reduced motion suppresses nonessential movement while loading/errors/success/focus remain clear. No disappearing state, unusable dialog or dependence on animation timing occurs.

### AG-102 — Long content, amounts and dates stay truthful

**Priority:** P1 · **Mode:** Basic · **Changes:** None required

**Start:** Long synthetic names/notes/report/filename, zero/null/large amounts and known deadlines/notification times.

1. Inspect the same records in both themes on desktop and phone; expand/scroll only through supported controls.
2. Compare PHT-labeled dates/deadlines against the fixture timestamp and refund/schedule amounts against the source snapshots.
3. Compare status descriptions before/after the relevant approved/closed/cancelled transition.

**Expected:** Full meaningful identity, filename extension and content remain accessible. Dates/time-zone labels and amounts are accurate; null, zero, paid, released obligation, pending, submitted and completed are not conflated.

### AG-103 — Complete an Agent working-day walkthrough

**Priority:** P0 · **Mode:** Basic · **Changes:** Fresh integrated synthetic workflow

**Start:** Fresh run-specific records; Agent, Member, Manager, COO, Pioneer and Finance/KPI helpers as needed.

1. As Agent reconcile the desk, find an assigned batch, review/forward intake and submit/follow a manual enrollment through Manager approval/rejection.
2. Follow Member withdrawal → Agent review → COO decision/policy → Agent replacement → Manager handover; observe Finance refund status separately.
3. Follow Pioneer assignment → Agent Start/report/evidence → authorized completion (human KPI review for the late branch); use notifications to revisit exact outcomes and reconcile the desk afterward.

**Expected:** Cross-role handoffs complete on the same actual candidate/API with exact record continuity and correct final totals. Agent never crosses its powers; no premature membership/dues/refund/task-completion claim appears. Retain intermediate evidence rather than using this case to replace individual failures.

### AG-104 — Named business acceptance and unresolved findings

**Priority:** P0 · **Mode:** Sign-off · **Changes:** Acceptance record only

**Start:** Named Jaycee/client business reviewer; completed results and accessible defect/evidence list for this exact candidate.

1. Review Agent powers, reporting line, daily work, approval/refund/handover consequences and draft limits against observed walkthroughs.
2. Review all Fail/Blocked/Not run variants, specialist results and any known limitation such as the 500-choice cap.
3. Record Accepted, Rejected or Pending, with reviewer/date/build and explicitly scoped outstanding findings.

**Expected:** Acceptance is a human decision tied to actual results, not inferred from automation or document creation. Unresolved access/integrity failures prevent a claim of full acceptance; blocked/unrun cases stay visible.

## API probe appendix — for the test operator

Use the existing web-to-API path and session/CSRF mechanism from this candidate.
Controller paths below are **relative to the configured API prefix**, normally
`/api`; confirm the prefix rather than guessing a full host/port. Inspect the
browser Network panel for a legitimate same-origin positive control or use the
project's authorized local API client. Replay with the **Agent** session and a
well-formed body/current UUID/version; do not reuse a helper role's cookies.

For each restricted probe:

1. Confirm the fixture exists using its authorized owner/helper and capture an
   allowed comparable operation. Use a separate twin fixture for any successful
   helper mutation so the Agent probe still has valid status/version.
2. Perform the same valid-shaped action as Agent, preserving required request
   structure, content type, headers and CSRF handling. Record sanitized metadata
   and response. Do not put raw session-bearing HAR/cURL exports in evidence.
3. Verify a permission/scope denial (normally 403 or a privacy-preserving 404).
   A scoped list/lookup may return 200 with **only authorized rows**. A 401 proves
   session denial, not a permission check by a valid Agent; fix sign-in and
   rerun the permission case. A 400/409/422, missing route, CORS/CSRF error or
   network failure is not a passing permission proof by itself.
4. Independently check no prohibited record, membership, payment, audit action,
   notification state or file content changed/leaked. If request construction
   cannot be verified, mark the probe Blocked rather than Pass.

| Boundary | Valid method/path variants to exercise | Agent expectation |
| --- | --- | --- |
| Self network | `GET /agent-network/agents`; `GET /agent-network/agents/<B-id>`; `GET /agent-network/batches`; `GET /agent-network/requests` | Own-only list/totals; B detail denied; no peer/team expansion. |
| Assigned intake | `GET /enrollment/applications/<B-application-id>`; `POST /enrollment/applications/<B-id>/forward`; `POST /enrollment/applications/<B-id>/close` | Foreign read and mutations denied. Use real current forward/close schemas. |
| COO-only assignment | `POST /enrollment/applications/<id>/assign` | Denied despite Agent having intake-manage permission. |
| Form management | `GET /enrollment/form`; `PATCH /enrollment/form`; `POST /enrollment/form/publish` | Denied; published revision unchanged. |
| Member lookup/submission | `GET /enrollment/members?q=<encoded-query>`; `GET /enrollment/requests?requestId=<B-id>`; `POST /enrollment/requests` with foreign batch/member | No foreign identity; no foreign request detail or submission. Inspect actual response shape for exact-query reads. |
| Enrollment review | `POST /enrollment/requests/<id>/review` | Denied for Agent, including its own PENDING request. |
| Withdrawal scope | `GET /withdrawals/<B-id>`; `POST /withdrawals/<B-id>/forward`; `POST /withdrawals/<B-id>/replacement-request` | Foreign read/actions denied. |
| Decision/policy/refund/payout | `POST /withdrawals/<id>/decision`; `/policy`; `/refund`; `/payout` | All four denied for Agent even on an A-readable case. |
| Task scope | `GET /tasks/<B-id>`; `GET /tasks/<B-id>/activity`; `GET /tasks/<B-id>/attachment`; `PATCH /tasks/<B-id>/start`; `POST /tasks/<B-id>/submit` | No foreign detail/activity/file bytes or Start/Submit mutation. Submit uses multipart form and current version. |
| Task management | `GET /tasks/assignees`; `POST /tasks`; `PATCH /tasks/<id>`; `POST /tasks/<id>/cancel`; `POST /tasks/<id>/complete` | All denied without TASK_ASSIGN, including completion of Agent's own submitted task. |
| Formal KPI | `GET /kpi/queue`; `GET /kpi/reviews`; `POST /kpi/reviews` | Denied; private evaluation text absent from permitted task/activity responses. |
| Recipient inbox | `PATCH /notifications/<B-notice-id>/read`; own list/bulk-read positive controls | B's notice denied; own bulk actions cannot alter B. Use a received-update notification ID, not a synthetic reminder ID. |
| Notice administration | `GET /notifications/templates/list`; `POST /notifications/templates`; `PATCH /notifications/templates/<id>` | Denied; no template change. |

For other forbidden Finance/personnel/account endpoints in AG-091, capture
current valid paths/payloads from the corresponding authorized test interface;
do not invent routes or treat a generic 404 as proof. Record each probe variant
in the results sheet. These checks use synthetic test records only.

## Results, defects and acceptance record

Use [agent-whole-role-test-results.csv](agent-whole-role-test-results.csv).
It contains one initial **Not run** row for each case, with the steps/expected
result included. Duplicate rows for browser, theme, file-format, fault or API
variants; keep the case ID and distinguish `variant` / `attempt`.

For a defect record: case/variant; exact candidate/build; fixture IDs and starting
state; actor; reproduction steps; expected vs actual; impact; sanitized screenshot
or response; follow-up owner; retest result. Use P0 for a failed critical case
and also classify the observed impact; a privacy breach, unauthorized money
change or duplicate business transition blocks acceptance.

| Final review | Record after testing |
| --- | --- |
| Pass / Fail / Blocked / Not run, including all required variants | __________________ |
| Open critical findings and owners | __________________ |
| Screen-reader reviewer / result / pairing | __________________ |
| Business reviewer / Accepted, Rejected or Pending / date | __________________ |
| Exact accepted candidate/build and any scope limits | __________________ |
| Retest plan for unresolved cases | __________________ |

Full acceptance requires all applicable variants to be executed, critical
failures resolved and retested, outstanding coverage explicitly visible, and
named business/accessibility decisions recorded. Optional configuration variants
remain clearly identified when unavailable; they cannot silently become Pass.

## Source and earlier-checklist mapping

Reviewed locally against the nine-grant
[Agent role/access record](agent-role-and-access.md),
[remaining-work plan](agent-remaining-work-plan.md), current contracts,
`apps/web/app/system/_role-designs/agent/`, shared login/security pages, and
API enrollment/network/withdrawal/task/notification controllers. Latest recorded
technical build at authoring was `snwxwlTrH-Oij_3A4l5ea`; record the actual
candidate under test rather than assuming that historical build is running.
No application source change or manual execution is implied by this manual.

| Earlier summary IDs | Whole-role detail |
| --- | --- |
| A01–A02 | AG-001, AG-013–024 |
| A03–A05 | AG-025–039, AG-049–050 |
| A06–A08 | AG-040–052 |
| A09–A13 | AG-053–068 |
| A14–A19 | AG-069–083 |
| A20–A22 | AG-084–090 |
| A23–A25 | AG-097–102 |
| A26 | AG-103–104 |
| Additional whole-role coverage | AG-002–012 personal access/security; AG-091–096 explicit server boundaries |
