# Agent — combined quality and acceptance manual

For step-by-step testing of the **whole Agent role**, use the
[104-case manual](agent-whole-role-manual-test.md) and its
[blank results sheet](agent-whole-role-test-results.csv), prepared 2026-11-27.
This earlier 26-case summary and its existing result IDs remain available below;
neither document records a human pass in advance.

Prepared 2026-11-26 for the locally integrated Agent candidate. Automated results
belong to the matching source/build record in `agent-remaining-work-plan.md`.
This checklist does not record a human pass. Use synthetic records in a separate
local review database; preserve existing Finance/Pioneer test progress. Do not
enter real customer contacts into fixture pages.

Record tester, date, build ID, browser/device, actual result and evidence in
[the results sheet](agent-quality-test-results.csv). All human outcomes begin
**Not run**. A missing permission is a passing boundary only when the API also
denies the action. Simulated browser fixtures do not prove real login, screen-
reader usability or business approval.

| ID | Role / flow | Expected behavior |
| --- | --- | --- |
| A01 | Agent login → desk | Own profile/supervisor and full assigned-batch/queue totals; missing/inactive profile differs from a failed read. |
| A02 | Agent → batches beyond the first 100 | Search/sort/page find the last assigned batch; totals reconcile with the scoped database. Back/reload retain recognized filters. |
| A03 | Agent → received application | Open exact original answers/revision; review corrections stay separate. No form publishing or reassignment. |
| A04 | Agent → forward original application | Only an assigned usable batch; one enrollment request. Manager reviews and approves/rejects through its own workspace. |
| A05 | Agent → close received application | Reason and confirmation required; original evidence remains. Forward ends; membership is not rejected or removed. |
| A06 | Agent → manual new/existing member | Existing identity/blank saved phone preserved; no capacity reservation or membership before approval. |
| A07 | Agent → enrollment response lost | Original payload/reference retained and locked; unchanged explicit retry reconciles one request. Definite validation failure permits a corrected new attempt. |
| A08 | Agent → changed/denied enrollment | Stale draft remains until confirmed reload; access loss clears private contacts/reference. Failed choices do not hide original application/close. |
| A09 | Member → Agent → COO withdrawal | Agent adds context/forwards; COO alone decides. Dues and current position continue pending handover. |
| A10 | Agent → continue-unpaid replacement → Manager | Recorded unpaid schedule; one pending proposal; Manager handover preserves prior receipts and changes no verified payment ownership. |
| A11 | Agent → restart replacement → Manager | Recorded new plan/dates/price; changed financial policy/pending claims block cutover. Original history retained. |
| A12 | Finance refund → Agent follow-up | Agent reads undecided/approved/paid values accurately, including zero remaining. No refund decision or payout editor; dues follow handover separately. |
| A13 | Reassigned batch → old replacement enrollment | Current Agent may see withdrawal while linked enrollment remains unavailable; no broader request access. |
| A14 | Pioneer assigns → Agent opens exact own task | My tasks, correct instructions/deadline/assigner. No assign/edit/cancel/complete/KPI controls. Status/page survive close and reload. |
| A15 | Agent report draft → Start task | Start changes status while retaining the unsaved report/file. Only the actual operation has a running label. |
| A16 | Agent report/evidence → submit → Pioneer completion | Report or permitted file required; full filename/extension readable and downloadable. Submitted differs from completed; authorized assigner completes eligible work. |
| A17 | Agent submission response lost | Lock original report/file/version; unchanged retry or explicit latest check. Version conflict never duplicates the saved report/audit. |
| A18 | Changed/cancelled/reassigned task | Keep stale draft; confirmed reload replaces it. Cancelled is terminal; assignment/session loss clears private draft/evidence and late responses cannot restore it. |
| A19 | Late Agent report → authorized KPI reviewer | Timing is factual; formal evaluation stays private. Completion follows existing review rules; no wage action is automated. |
| A20 | Agent → Tasks and enrollments notices | Exact own task/enrollment destination; current task reminders and enrollment outcomes shown, with scoped read status. |
| A21 | Agent → Received updates | Exact assigned intake/withdrawal destination. Event is historical; destination rechecks current access and explains unavailable records. |
| A22 | Notifications error/filter/read | Failed differs from empty; feed/type/page/unread survive reload. Mark-read affects own authorized notices. No administration or foreign inbox. |
| A23 | Keyboard and motion | Tab/Shift+Tab remain inside drawer; Escape warns on drafts; logical focus returns after close. Reduced motion suppresses movement without suppressing state. |
| A24 | Phone/dark/enlarged text | 320/393px, both themes, long report/filenames and 200% text remain readable; actions reachable; no document overflow. |
| A25 | Human screen-reader walkthrough | Named reviewer checks heading/order, labels, status/error announcements, drawer focus and unavailable states in an actual supported screen reader. Record tool/version and corrections. |
| A26 | Jaycee/client business acceptance | Named reviewer confirms Agent powers, handoffs, consequences and daily usability using the same compiled candidate. Record accepted/rejected and any follow-up. |

Report/file drafts stay in component memory. Confirmed departure, reload, crash
or unmount can discard them; there is no durable/offline recovery queue. After
an unconfirmed write, inspect the current record before starting another attempt.
