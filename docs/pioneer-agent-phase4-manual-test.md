# Pioneer Agent Phase 4 — combined review walkthrough

For the populated review dataset,28 individual cases, expected count changes
and a blank results sheet, use the
[Pioneer Agent quality test manual](pioneer-agent-quality-test-manual.md) and
[results template](pioneer-agent-test-results-template.csv). Its baseline
supersedes the initial counts in this earlier short walkthrough. The new
`UAT-PA-…` fixtures are separate from the existing `PA4-…` progress.

**Review preview:** <http://127.0.0.4:3004/login>. Use the exact host; it keeps
this synthetic sign-in separate from the main localhost and earlier previews.
Choose **Preview a workspace** and the required actor. Switch roles in separate
browser profiles/private windows or sign out before choosing the next actor.

This is one combined local candidate: Phase1 overview, Phase2 Agent/enrollment
follow-up and Phase3 own-Agent task submission. All fixture names below are
synthetic. Preserve progress between review sessions.

## Team and enrollment follow-up

1. Sign in as **Pioneer agent**. The team initially contains503 assigned active
   Agent accounts and105 scoped batches. Profile readiness is separate from
   account activity: one linked profile is inactive and one is missing.
2. Open **Agent network**. Search `PA-0501` to find an Agent beyond the former
   500-account cap. Open Agent details and inspect readiness and request totals.
   Search batches or go to the last page to find `PA-BATCH-104` beyond the old
   100-batch cap. Counts labeled Members differ from enrollment requests.
3. Open **Agent 0000** → **View enrollment requests**. Filter status/search/sort,
   inspect a request and its Outcome, then return. Network page/filter/selection
   should survive. Browser Back/Forward should restore the corresponding state.
4. As **Batch manager**, find request **PA4-ENROLLMENT-READY** and review it using
   the existing authorized enrollment form. Record a factual approval/rejection
   reason. Sign back in as Pioneer and refresh the Agent detail/dashboard. Both
   should show the same changed outcome; Pioneer has no submission/review action.

## Normal coaching loop

1. As Pioneer, open **Coaching and tasks → Agent team**. The list comes before
   assignment. **Assign task** deliberately opens the form. Give Agent0000 a
   task with a future deadline and retain the exact task title.
2. As **Agent**, open that assigned task, choose **Start task**, write a factual
   Report and optionally attach a synthetic PDF/image, then **Submit work**.
   Alternatively use seeded task **PA4-COACHING-READY**.
3. As Pioneer, open the submitted task, read the report, download its authorized
   evidence and choose **Mark complete**. The team list and dashboard should
   agree on submitted/completed/outstanding counts after refresh.
4. Try a peer/foreign task link as Agent: it must remain unavailable. Agent can
   start/submit only its own work and cannot assign or complete another task.

## Late submission and human review

1. As Pioneer, open **PA4-LATE-REVIEW**. It is submitted late and awaiting formal
   human KPI review. Completion must stay unavailable before that review.
2. As **KPI officer**, review the task using the existing review workflow.
3. As Pioneer, reload the task. The review's existence may establish eligibility,
   while the private evaluation text remains hidden. Complete eligible work.
   The system performs no automatic wage action.

## Pioneer's own report

1. As Pioneer, choose **My tasks** and open a seeded **PA4-OWN-…** task.
2. Start it, enter Report/evidence and submit. This updates own-task figures,
   leaving Agent-team figures separate.
3. As **Operations coordinator**, inspect and complete eligible submitted work
   through existing scoped access.

## Recovery and visual review

Check both themes on desktop and phone. Verify readable full names/codes and
amounts/counts, visible touch actions, keyboard dropdowns, focus return and
Escape. Cancel a draft-discard prompt to retain typed reports; confirm only
when intentionally discarding. A changed record requires explicit reconciliation.
A save that succeeds before a refresh failure must remain saved without another
submission. Initial errors must not claim zero records; denied access clears
private details.

Technical results and limits are recorded in the
[Phase4 plan](pioneer-agent-phase4-plan.md) and candidate evidence under
`.local/pioneer-phase4-20261125/`. Technical checks do not establish Jaycee/client
visual, business or human screen-reader acceptance.

## Human acceptance record

After the walkthrough, record the reviewer's name/date, browser and any issue:

- Visual/business: home totals, Agent/request follow-up, own/team task distinction,
  and Pioneer → Agent report/evidence → completion behave as expected.
- With the reviewer's screen reader and keyboard: headings and field labels are
  understandable; Agent/task dialogs announce their names; close returns focus
  to the initiating control; report errors and save/read outcomes are announced;
  evidence links have useful names. Record any obstacle and the reader/browser.

These items remain pending until an actual reviewer reports the result.

## Candidate ownership

Worktree `/home/jaycee/Projects/freshphonesph-pioneer-phase-four`, branch
`feature/pioneer-agent-phase-four`, base75d8771. API4104/web3004 bind only to
127.0.0.4. The retained Finance preview remains at localhost3000; its test data
is not reset. This guide does not authorize commit, push, merge or deployment.
