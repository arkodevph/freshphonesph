# Fresh Phones PH — Pioneer Agent quality test manual

Version 1.0 · Prepared 2026-11-25 16:40 PHT · Review build `UcHOM2aexrAJp2sFO9i5t`

**Purpose:** manually verify the combined daily overview, Agent/enrollment follow-up, coaching and own-reporting workflow. The preview is populated with synthetic cases. This document is a test manual; it does not record a human pass in advance.

## Start here

1. Open http://127.0.0.4:3004/login → **Preview a workspace → Pioneer agent**. Keep the exact host; the original Finance preview is separate.
2. Use one browser profile/private window per role, or sign out before switching. Required role shortcuts: Pioneer agent, Agent, Batch manager, KPI officer and Operations coordinator. The Agent shortcut opens **Agent 0000**.
3. Keep this manual and `pioneer-agent-test-results-template.csv` open. Record Pass, Fail, Blocked or Not run for each case, the actual result and evidence. All human results start as Not run.
4. Run PA-01–09 before mutating data. Then run PA-10–20 in order, followed by PA-21–28. Suggested allowance: 45–75 minutes for the full review, longer when recording accessibility findings.
5. Save the supplied **demo-coaching-evidence.pdf** locally for upload. It contains synthetic text only. Use no real customer records or documents.

Reviewer: __________________ Date: __________ Browser/version: __________________

Device/OS/viewport: __________________ Theme: __________ Screen reader/version (if used): __________________

## Initial baseline — capture before workflow changes

Snapshot: 2026-11-25 16:40 PHT. These are starting values, not permanent expectations. The deadline reference is below the task catalog; normal-workflow tasks are due in December 2026. If testing after their deadlines, create a fresh future-dated task for the on-time scenario instead of resetting completed records.

| Figure                                                     | Starting value    |
| ---------------------------------------------------------- | ----------------- |
| Assigned active Agent accounts                             | 503               |
| Ready profiles / inactive profiles / missing profiles      | 501 / 1 / 1       |
| Scoped batches                                             | 106               |
| Enrollment requests: Pending / Approved / Rejected / Total | 19 / 15 / 15 / 49 |
| Demo-batch real Members                                    | 1                 |
| My tasks: To do / In progress / Submitted / Done           | 8 / 0 / 1 / 0     |
| My tasks: Total / Outstanding / Overdue to submit          | 9 / 9 / 0         |
| Agent team: To do / In progress / Submitted / Done         | 29 / 1 / 4 / 3    |
| Agent team: Total / Outstanding / Overdue to submit        | 37 / 34 / 1       |

After a write, use the case’s expected count changes. Compare screens after refreshing both; do not compare a stale screen with a newer one. Counts of enrollment requests are not counts of unique members.

The batch `UAT-PA-BATCH-01` was added for this review and initially has one approved reference member. Existing full batches and previous manual progress were preserved. Preset task states are seed references; they are not claims that a human already performed those transitions.

## Prepared task catalog

Pioneer links below open the exact task. As Agent, Coordinator or KPI officer, open Coaching/tasks in that role and select the matching **UAT-PA-…** title; those older role views may not use the same direct-link behavior.

| ID / Pioneer link                                                                                   | Assignee          | Initial state              | Scenario                                   |
| --------------------------------------------------------------------------------------------------- | ----------------- | -------------------------- | ------------------------------------------ |
| [UAT-PA-01](http://127.0.0.4:3004/system/tasks?view=team&task=7d4c1000-0000-4000-8000-000000000001) | Agent 0000        | TODO                       | Agent coaching: start and submit           |
| [UAT-PA-02](http://127.0.0.4:3004/system/tasks?view=team&task=7d4c1000-0000-4000-8000-000000000002) | Agent 0000        | IN_PROGRESS                | Agent coaching: already in progress        |
| [UAT-PA-03](http://127.0.0.4:3004/system/tasks?view=team&task=7d4c1000-0000-4000-8000-000000000003) | Agent 0000        | SUBMITTED                  | Submitted: ready for Pioneer completion    |
| [UAT-PA-04](http://127.0.0.4:3004/system/tasks?view=team&task=7d4c1000-0000-4000-8000-000000000004) | Agent 0000        | DONE                       | Completed coaching reference               |
| [UAT-PA-05](http://127.0.0.4:3004/system/tasks?view=team&task=7d4c1000-0000-4000-8000-000000000005) | Agent 0000        | TODO · overdue/unsubmitted | Overdue and not submitted                  |
| [UAT-PA-06](http://127.0.0.4:3004/system/tasks?view=team&task=7d4c1000-0000-4000-8000-000000000006) | Agent 0000        | SUBMITTED · late           | Late submission: human KPI review required |
| [UAT-PA-07](http://127.0.0.4:3004/system/tasks?view=own&task=7d4c1000-0000-4000-8000-000000000007)  | Pioneer           | TODO                       | Pioneer own weekly report                  |
| [UAT-PA-08](http://127.0.0.4:3004/system/tasks?view=own&task=7d4c1000-0000-4000-8000-000000000008)  | Pioneer           | SUBMITTED                  | Pioneer report ready for Coordinator       |
| [UAT-PA-09](http://127.0.0.4:3004/system/tasks?view=team&task=7d4c1000-0000-4000-8000-000000000009) | Agent 0001 (peer) | SUBMITTED                  | Peer Agent report: privacy check           |
| [UAT-PA-10](http://127.0.0.4:3004/system/tasks?view=team&task=7d4c1000-0000-4000-8000-000000000010) | Outside team      | TODO                       | Outside-team private task                  |
| [UAT-PA-11](http://127.0.0.4:3004/system/tasks?view=own&task=7d4c1000-0000-4000-8000-000000000011)  | Pioneer           | TODO                       | Pioneer draft and recovery practice        |

**Deadline reference:** normal cases are due 25 December 2026 at 16:30 PHT (UAT-PA-11 was created about three minutes later). UAT-PA-05 and UAT-PA-06 are due 23 November 2026 at 16:30 PHT. UAT-PA-06 was submitted one day after its deadline and awaits human review.

## Prepared enrollment catalog

| Request / Pioneer link                                                                                                                                         | Applicant                                  | Initial status | Use                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------- | ---------------------------- |
| [APPROVE](http://127.0.0.4:3004/system/enrollments?view=requests&agentId=164d8a34-1ab1-4ccb-8f54-5b30a68fb3e4&requestId=fed5b5c3-137f-4d30-8470-9637dddb0931)  | UAT-PA-ENROLL-APPROVE — Demo Lianne Cruz   | PENDING        | Manual action                |
| [REJECT](http://127.0.0.4:3004/system/enrollments?view=requests&agentId=164d8a34-1ab1-4ccb-8f54-5b30a68fb3e4&requestId=454b82b4-6445-4aaf-95ed-37daa6e501c7)   | UAT-PA-ENROLL-REJECT — Demo Paolo Lim      | PENDING        | Manual action                |
| [APPROVED](http://127.0.0.4:3004/system/enrollments?view=requests&agentId=164d8a34-1ab1-4ccb-8f54-5b30a68fb3e4&requestId=a6b028fc-19b1-42d0-8f18-20125601bce4) | UAT-PA-ENROLL-APPROVED — Demo Amara Santos | APPROVED       | Read-only reviewed reference |
| [REJECTED](http://127.0.0.4:3004/system/enrollments?view=requests&agentId=164d8a34-1ab1-4ccb-8f54-5b30a68fb3e4&requestId=9f7eabc4-7250-4561-bca6-47538ce216a9) | UAT-PA-ENROLL-REJECTED — Demo Nico Reyes   | REJECTED       | Read-only reviewed reference |

Find requests with search `UAT-PA-ENROLL` and the desired status. All four belong to Agent 0000 and the dedicated demo batch. Reviewed references have real reviewer outcomes created through the existing application workflow.

## Test cases

P0 = access/data-integrity or essential workflow. P1 = functional/usability/accessibility. “Changes data” means this case intentionally advances synthetic preview state.

### PA-01 — Sign in to the correct workspace

**Role:** Pioneer agent · **Priority:** P0 · **Changes data:** No saved task/enrollment change intended

**Starting point:** Use the review preview, not localhost:3000.

1. Open http://127.0.0.4:3004/login. Choose Preview a workspace → Pioneer agent.
2. Confirm the Pioneer home loads. Open Agent network and Coaching and tasks, then return home.

**Expected:**

- The correct role and workspace appear; each destination loads without a blank page or access error.
- The roster is populated. Do not enter real names, contact details or documents.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-02 — Reconcile the overview before changing data

**Role:** Pioneer agent · **Priority:** P0 · **Changes data:** No saved task/enrollment change intended

**Starting point:** Run before any workflow-changing case.

1. Refresh the home overview and compare it with the initial baseline below.
2. Open Agent network and Coaching and tasks; compare unfiltered totals with the home figures.

**Expected:**

- Agent/profile/request totals agree across the applicable screens.
- Own work and Agent-team work stay separate. Outstanding = To do + In progress + Submitted; completed work is excluded.
- Overdue to submit excludes work already submitted. A missing read must not be interpreted as zero.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-03 — Search and page beyond the former directory caps

**Role:** Pioneer agent · **Priority:** P1 · **Changes data:** No saved task/enrollment change intended

**Starting point:** Agent network; clear earlier filters.

1. Search PA-0501, open its Agent details and close them.
2. Clear search and move to the last Agent page. Switch to batches, search PA-BATCH-104, then clear the search.

**Expected:**

- Agent 0501 and PA-BATCH-104 are found even though they are beyond the former 500/100 list limits.
- The Agent total remains 503. The batch total is 106; page/search counts describe the current filter rather than replacing full-scope totals.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-04 — Distinguish inactive and missing profiles

**Role:** Pioneer agent · **Priority:** P1 · **Changes data:** No saved task/enrollment change intended

**Starting point:** The Agent accounts remain active; these are linked-profile conditions.

1. Find Agent 0501 / PA-0501 and inspect its readiness.
2. Find Agent 0502 by name and inspect its missing profile. Return to the directory.

**Expected:**

- The inactive profile and missing profile have different explanations.
- Neither condition is presented as an account suspension, KPI decision or commission entitlement.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-05 — Inspect the dedicated test batch

**Role:** Pioneer agent · **Priority:** P1 · **Changes data:** No saved task/enrollment change intended

**Starting point:** Agent network → Batches.

1. Search UAT-PA-BATCH-01 and inspect its row.
2. Compare its Members value with enrollment-request counts shown elsewhere.

**Expected:**

- Exactly one matching demo batch appears and initially has one real member.
- Members and enrollment requests are distinct. The extra batch provides room for the approval tests; existing full batches were not changed.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-06 — Read approved and rejected outcomes

**Role:** Pioneer agent · **Priority:** P0 · **Changes data:** No saved task/enrollment change intended

**Starting point:** Use the two prepared reference requests; do not change them.

1. Open approved reference: http://127.0.0.4:3004/system/enrollments?view=requests&agentId=164d8a34-1ab1-4ccb-8f54-5b30a68fb3e4&requestId=a6b028fc-19b1-42d0-8f18-20125601bce4. Inspect Outcome, reviewer and note.
2. Open rejected reference: http://127.0.0.4:3004/system/enrollments?view=requests&agentId=164d8a34-1ab1-4ccb-8f54-5b30a68fb3e4&requestId=9f7eabc4-7250-4561-bca6-47538ce216a9. Inspect the same fields.

**Expected:**

- The first reference is Approved and the second Rejected, with factual synthetic review notes and an authorized reviewer.
- Pioneer can read the outcome but cannot approve/reject requests or open private KPI/HR details.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-07 — Preserve filters, selected Agent and return navigation

**Role:** Pioneer agent · **Priority:** P1 · **Changes data:** No saved task/enrollment change intended

**Starting point:** Start in Agent network with a search or later page selected.

1. Open Agent 0000 → View enrollment requests. Apply a status, search and sort.
2. Open a request and return. Use browser Back and Forward, then clear the filter.

**Expected:**

- The selected Agent, meaningful query/page/sort and request context survive detail/return.
- A filter change deliberately returns to a valid page. Back/Forward restores the corresponding state without showing stale rows under a different label.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-08 — Inspect task statuses and completion eligibility

**Role:** Pioneer agent · **Priority:** P0 · **Changes data:** No saved task/enrollment change intended

**Starting point:** Use the direct links in the task catalog.

1. Open UAT-PA-01, UAT-PA-02, UAT-PA-03, UAT-PA-04 and UAT-PA-05 without saving changes.
2. Inspect the assignment, report, deadline and available actions.

**Expected:**

- Their initial states are To do, In progress, Submitted, Done and overdue/unsubmitted respectively.
- Only eligible submitted work offers completion. The completed reference has no new submission/completion action.
- Pioneer cannot start or submit an Agent’s report on the Agent’s behalf.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-09 — Deny another team’s task and private KPI access

**Role:** Pioneer agent · **Priority:** P0 · **Changes data:** No saved task/enrollment change intended

**Starting point:** Keep a normal authorized task open first.

1. Open outside-team task: http://127.0.0.4:3004/system/tasks?view=team&task=7d4c1000-0000-4000-8000-000000000010.
2. In a new tab, open http://127.0.0.4:4104/api/tasks/7d4c1000-0000-4000-8000-000000000010, then http://127.0.0.4:4104/api/kpi/reviews.

**Expected:**

- The task is unavailable; the direct task read returns 404 without its private title/report. KPI review listing returns 403.
- The previous authorized task’s details are not displayed under the denied ID. Do not attempt financial writes.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-10 — Validate and save one new assignment

**Role:** Pioneer agent · **Priority:** P0 · **Changes data:** Yes

**Starting point:** Record the Agent-team total before saving. Use a unique title such as UAT-PA-MANUAL-JC-1630.

1. Choose Coaching and tasks → Agent team → Assign task. Try an empty/whitespace-only title first.
2. Enter the unique title, choose Agent 0000, set a future deadline and enter: Follow up on demo enrollment requirements.
3. Choose Assign task once. While it is saving, confirm a second click cannot create another task. Refresh the list after success.

**Expected:**

- Invalid input is blocked or rejected with useful feedback and no task creation.
- The successful save gives a clear confirmation, resets completed text fields and creates exactly one task.
- Team To do, total and outstanding each increase by one. Repeatedly pressing Save after a completed successful save is a new action; do not use that as a duplicate-retry test.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-11 — Agent starts and submits the prepared coaching task

**Role:** Agent · **Priority:** P0 · **Changes data:** Yes

**Starting point:** Use UAT-PA-01. Demo evidence PDF is supplied beside the printable manual.

1. Sign out and choose Agent. Open the exact UAT-PA-01 task and choose Start task.
2. Try submitting a blank report, then enter: Demo enrollment requirements checked; next follow-up recorded.
3. Attach demo-coaching-evidence.pdf and choose Submit work once. Reopen the same task.

**Expected:**

- Blank reports do not submit. The valid report and permitted PDF save successfully.
- The exact task becomes Submitted; its report/evidence remain available to authorized roles.
- TODO → IN_PROGRESS → SUBMITTED keeps team total/outstanding unchanged; only status buckets move.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-12 — Pioneer reads evidence and completes the same task

**Role:** Pioneer agent · **Priority:** P0 · **Changes data:** Yes

**Starting point:** PA-11 must have submitted UAT-PA-01.

1. Sign back in as Pioneer and open http://127.0.0.4:3004/system/tasks?view=team&task=7d4c1000-0000-4000-8000-000000000001.
2. Read the report, download the PDF and verify it is the synthetic evidence file. Choose Mark complete, then refresh/reopen.

**Expected:**

- The report/download belong to the same task and are readable only through authorized access.
- The task becomes Done once. Team Submitted and outstanding each decrease by one; Done increases by one; total stays unchanged.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-13 — Complete an already-submitted reference

**Role:** Pioneer agent · **Priority:** P1 · **Changes data:** Yes

**Starting point:** Use UAT-PA-03, initially Submitted.

1. Open http://127.0.0.4:3004/system/tasks?view=team&task=7d4c1000-0000-4000-8000-000000000003 and read its preset synthetic report.
2. Choose Mark complete once. Reopen it and inspect the updated list/home figures.

**Expected:**

- Completion works without fabricating an Agent submission or accepting an unfinished task.
- Submitted/outstanding −1, Done +1, total unchanged. The completed record does not offer another completion.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-14 — Approve the pending demo enrollment

**Role:** Batch manager, then Pioneer agent · **Priority:** P0 · **Changes data:** Yes

**Starting point:** Use UAT-PA-ENROLL-APPROVE — Demo Lianne Cruz in UAT-PA-BATCH-01.

1. As Batch manager, open Enrollment requests and find the exact pending request. Open Review request.
2. Enter: Demo requirements verified during manual QA. Choose Approve enrollment once.
3. As Pioneer, refresh the request outcome, Agent 0000 detail and overview.

**Expected:**

- The review succeeds in the batch with available space; reviewer/note/status agree across screens.
- Pending −1, Approved +1, total requests unchanged. Demo-batch Members +1.
- Pioneer still has no approval action. Do not use an already-full original batch for this test.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-15 — Reject a separate pending demo enrollment

**Role:** Batch manager, then Pioneer agent · **Priority:** P0 · **Changes data:** Yes

**Starting point:** Use UAT-PA-ENROLL-REJECT — Demo Paolo Lim; separate from PA-14.

1. As Batch manager, find the exact pending request and open Review request.
2. Enter: Demo requirements incomplete during manual QA. Choose Reject request once.
3. As Pioneer, refresh the Outcome and Agent/request totals.

**Expected:**

- The request becomes Rejected with the reviewer and reason visible.
- Pending −1, Rejected +1, total requests unchanged. No new member is created by rejection.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-16 — Pioneer submits its own weekly report

**Role:** Pioneer agent · **Priority:** P0 · **Changes data:** Yes

**Starting point:** Use My tasks → UAT-PA-07, initially To do.

1. Open http://127.0.0.4:3004/system/tasks?view=own&task=7d4c1000-0000-4000-8000-000000000007. Confirm it is your own assignment, then choose Start task.
2. Enter: Demo weekly team follow-up summary and coaching outcomes recorded. Optionally attach the supplied PDF and choose Submit work.

**Expected:**

- The report is submitted as Pioneer’s own work, not as an Agent-team submission.
- Own status buckets move; own total/outstanding stay unchanged until Coordinator completion. Agent-team figures do not change.
- The Pioneer cannot treat its own report as already accepted by the Coordinator.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-17 — Coordinator completes Pioneer’s report

**Role:** Operations coordinator, then Pioneer agent · **Priority:** P0 · **Changes data:** Yes

**Starting point:** PA-16 submitted UAT-PA-07. UAT-PA-08 is an additional ready-to-review reference.

1. As Operations coordinator, open the exact UAT-PA-07 submitted report and inspect it.
2. Complete eligible work through the existing task action. Return as Pioneer and refresh My tasks.

**Expected:**

- The Coordinator can inspect/complete authorized submitted work.
- Own Submitted/outstanding −1 and Done +1; own total and Agent-team figures stay unchanged.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-18 — Block late completion before human KPI review

**Role:** Pioneer agent · **Priority:** P0 · **Changes data:** No saved task/enrollment change intended

**Starting point:** UAT-PA-06 is Submitted late with no review.

1. Open http://127.0.0.4:3004/system/tasks?view=team&task=7d4c1000-0000-4000-8000-000000000006. Read the deadline/submission context and completion explanation.
2. Confirm there is no action that completes the task before the required human review.

**Expected:**

- The page explains that completion is waiting for human KPI review.
- No automatic evaluation, recommendation or wage action is generated. A late submitted task does not count as overdue to submit.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-19 — Human KPI review enables eligible completion without leaking evaluation

**Role:** KPI officer, then Pioneer agent · **Priority:** P0 · **Changes data:** Yes

**Starting point:** Run after PA-18; use the same UAT-PA-06 task.

1. As KPI officer, open UAT-PA-06. In Human KPI review enter Evaluation: Synthetic manual QA: considered the recorded late submission context.
2. Enter Recommendation: Demo follow-up reminder; choose Decision: Noted and Record review.
3. As Pioneer, reopen the exact task and complete eligible work.

**Expected:**

- The human review is recorded by KPI. Pioneer sees that review eligibility is satisfied but not the confidential evaluation/recommendation text.
- Completion is now available; Submitted/outstanding −1, Done +1 and total unchanged. No automatic wage change occurs.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-20 — Agent cannot read a peer report

**Role:** Agent · **Priority:** P0 · **Changes data:** No saved task/enrollment change intended

**Starting point:** UAT-PA-09 belongs to Agent 0001; Pioneer can read it.

1. As Agent 0000, open http://127.0.0.4:4104/api/tasks/7d4c1000-0000-4000-8000-000000000009 in a new tab.
2. Return to your own UAT-PA-01 record and inspect the available actions.

**Expected:**

- The peer-task read returns 404 without its report or evidence.
- Own-task access still works. Agent has no task-assignment or completion action and cannot submit another assignee’s report.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-21 — Cancel/discard a draft deliberately

**Role:** Pioneer agent · **Priority:** P1 · **Changes data:** No saved task/enrollment change intended

**Starting point:** Use the untouched own task UAT-PA-11; do not submit it.

1. Open http://127.0.0.4:3004/system/tasks?view=own&task=7d4c1000-0000-4000-8000-000000000011 and type Draft retained during manual QA into Report.
2. Press Escape. Cancel the discard prompt and confirm the draft remains.
3. Close again and explicitly accept discarding. Reopen the task.

**Expected:**

- Cancel keeps the dialog and draft; explicit discard closes it. Focus returns to the initiating control where applicable.
- The unsent draft is not treated as a submitted/saved report. Task status/version are not advanced by merely closing the dialog.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-22 — Check both themes and responsive layouts

**Role:** Pioneer agent · **Priority:** P1 · **Changes data:** No saved task/enrollment change intended

**Starting point:** Home, Agent network/details, request outcomes and tasks.

1. Check light and dark themes at desktop, tablet and phone widths; include roughly 1440, 768, 393 and 320 CSS pixels.
2. Read long names/codes and counts; open dialogs, dropdowns and task details; try short landscape orientation.

**Expected:**

- Text and controls remain readable, actions reachable, and status distinctions clear in both themes.
- No document-wide horizontal overflow, clipped important counts or hidden modal actions. A genuinely wide table may scroll inside its own container.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-23 — Use actual browser zoom and larger text

**Role:** Pioneer agent · **Priority:** P1 · **Changes data:** No saved task/enrollment change intended

**Starting point:** Use browser controls, not only a smaller emulated viewport.

1. Set browser zoom to 200% and use home, network and task/assignment controls.
2. Restore zoom; separately increase browser text size where supported. Check with keyboard navigation.

**Expected:**

- Content reflows without hiding essential fields, counts or actions.
- Focus remains visible and forms usable. Record browser/version and any actual clipping.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-24 — Keep focus visible after assignment motion settles

**Role:** Pioneer agent · **Priority:** P1 · **Changes data:** No saved task/enrollment change intended

**Starting point:** Use a long task list on desktop and phone; no save is required.

1. Choose Assign task and wait for expansion to finish. Tab through fields, then close/reopen.
2. Repeat with the operating system/browser Reduce motion preference enabled.

**Expected:**

- The focused input stays in view after animation finishes; focus is not merely correct for the first frame.
- Normal and reduced-motion settings both leave controls usable, with no forced long animation.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-25 — Recover from a failed refresh and failed view change

**Role:** Pioneer agent · **Priority:** P1 · **Changes data:** No saved task/enrollment change intended

**Starting point:** Optional browser developer tools/network control; change no task data.

1. Load My tasks successfully, temporarily disable networking in browser developer tools and choose Refresh tasks.
2. Switch to Agent team while offline. Restore networking and choose Try again/refresh.

**Expected:**

- A failed same-view refresh labels retained data as the last successful update.
- A failed view change does not relabel old own-task rows as Agent-team rows; totals are unavailable rather than zero.
- Online retry restores the requested view without duplicating an application write. If network controls are unavailable, mark Blocked with the reason.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-26 — Show a truthful empty search and restore results

**Role:** Pioneer agent · **Priority:** P1 · **Changes data:** No saved task/enrollment change intended

**Starting point:** Agent network with no other filters.

1. Search UAT-NO-MATCH-000 and inspect the result.
2. Clear the search, then find Agent 0000 again.

**Expected:**

- A successful empty search is explicit and differs from a failed read.
- Full-scope summary totals are not replaced by the filtered zero. Clearing search restores results.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-27 — Sign out and recheck protected access

**Role:** Pioneer agent · **Priority:** P0 · **Changes data:** No saved task/enrollment change intended

**Starting point:** Finish or deliberately discard any open draft.

1. Sign out. Open /system and a task detail in a new tab; use Back and refresh any previous private page.
2. Open http://127.0.0.4:4104/api/auth/me while signed out.

**Expected:**

- A new authenticated read requires sign-in; /auth/me returns 401.
- Refreshing the old workspace does not restore an authorized session. Sign in again only if continuing the test.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

### PA-28 — Record a real screen-reader review

**Role:** Human reviewer using a screen reader · **Priority:** P1 · **Changes data:** No saved task/enrollment change intended

**Starting point:** Record reader, browser, versions and reviewer; do not mark Pass from automated checks alone.

1. Navigate headings, summaries, Agent rows and task fields with keyboard and reader.
2. Open/close Agent and task dialogs. Check dialog names, focus return, form labels, validation and read/save status announcements.
3. Read an enrollment outcome and an authorized evidence link.

**Expected:**

- Names, roles and states are understandable; focus and status feedback support completing the workflow.
- Record actual observations. If no reader/reviewer is available, mark Blocked/Not run rather than assuming acceptance.

**Result:** Not run / Pass / Fail / Blocked · **Actual/evidence:** ______________________________

## Defect log and acceptance

For each failure record: Case ID; exact role and record title/ID; browser/device/theme; steps; expected versus actual behavior; screenshot/error; whether reproducible. Do not include passwords or session cookies.

Suggested severity: Critical = unauthorized data/write or incorrect financial action; High = essential workflow blocked or duplicate/lost task; Medium = recoverable functional/accessibility problem; Low = cosmetic issue. Escalate actual money or privacy defects rather than continuing writes.

Acceptance requires the agreed critical workflows and access checks to pass, any exceptions to be recorded with their owner/decision, and actual visual/business feedback. Human screen-reader review must be recorded separately; automated accessibility checks do not fill that result.

Visual/business review: ☐ Accepted ☐ Issues found ☐ Not reviewed

Screen-reader review: ☐ Passed ☐ Issues found ☐ Not reviewed / blocked

Reviewer/date: __________________ Open issue IDs / accepted exceptions: __________________

## Resume and retest without resetting progress

- If a case is already Done/Approved/Rejected, record its current state; do not try to reverse it. Use the completed reference for read-only review or ask for an additional fresh synthetic case.
- Keep a unique suffix on tasks you create. A successful save followed by failed refresh is still a save: refresh/reconcile before trying another assignment.
- Reload both screens before comparing totals. Keep own and Agent-team totals separate.
- Seeding is additive and preserves existing records. Do not reset/reseed the retained Finance sandbox. This manual does not authorize publishing or deployment.

## Preparation evidence

The dataset and five role shortcuts were checked against the live combined preview without consuming the prepared manual actions. Task completion gates, request reference outcomes, foreign/peer task denial and private KPI denial were verified. These setup checks are separate from the blank human results sheet.

Canonical manual: `docs/pioneer-agent-quality-test-manual.md`. Results template: `docs/pioneer-agent-test-results-template.csv`. Local evidence and printable exports: `.local/pioneer-manual-20261125/`.
