# Staff task assignment alerts and deadline reminders

Full Scope v6 §8 and §12 now have task alerts in the TypeScript staff notification bell.
Every employee sees their own active assigned tasks; Owner and Finance also retain their
pending-payment alerts in the same bell. All, Tasks and permission-gated Finance filters
share the total unread badge. Mark-all-as-read applies to the selected alert type across
all its pages, while unread-only narrows the displayed list.

## Reminder behavior

Each `TODO` or `IN_PROGRESS` task produces one current alert for its assignee:

| Time relative to the task deadline | Current alert |
| --- | --- |
| More than 24 hours remaining | Task assigned to you |
| From 24 hours remaining through the exact deadline | Task due within 24 hours |
| Deadline has passed | Task overdue |

An alert becomes unread when its reminder stage advances. Reading it acknowledges only the
captured stage and deadline, so an assigned-task read does not silence the later deadline
reminder. Starting a task retains its read state. A changed deadline requires a fresh read,
even if the reminder stage is the same. Submission and completion remove the active alert.
Existing active tasks are covered automatically after migration, without a separate backfill.

Stages are calculated from the current time on the server. No background job or duplicated
notification rows are required. The bell fetches on open, focus, event/reconnect and every
30 seconds in a visible tab, including when the deadline changes stage without a task write.
This increment provides in-app reminders. Staff email was added separately in
[30-staff-email-delivery.md](30-staff-email-delivery.md); OS push remains outside this increment.

## Access and read receipts

Task alerts are always restricted to the current assignee, including managers who can view
all tasks elsewhere. Customers cannot access the staff alert routes. Finance entries and
the Finance filter require `PAYMENT_VERIFY`. Alert projections omit instructions, reports,
private evidence and KPI evaluations; those stay on the authorized task detail screen.

| Endpoint | Contract |
| --- | --- |
| `GET /api/staff/alerts?page=1&unreadOnly=false&scope=all` | Employee only; 20 entries, assignee-scoped tasks and authorized Finance queue |
| `POST /api/staff/alerts/:id/read` | Task: `{ "entity": "task", "kind": "TASK_DUE_SOON", "deadline": "2026-10-07T04:00:00Z" }`; payment: `{ "entity": "payment", "version": 1 }` |
| `POST /api/staff/alerts/read-all` | Strict `{ "scope": "all" }`, `tasks` or `finance`; captures current visible stages/versions |

An outdated task stage/deadline returns 409; a submitted, completed or foreign task alert
returns 404. Repeated reads preserve the original receipt timestamp. Per-account task read
receipts use a separate table; Finance reads reuse `FinanceAlertRead`, so the earlier Finance
API and the shared bell have the same unread state. Writes use the existing transaction
lock and recheck current staff access. Reads never change task status, task version, report,
submission timing, late flags, KPI decisions, money records or customer notifications.

Cross-instance task events reach the assignee and staff with task-assignment access. Read
events reach only that account's tabs. Customer and unrelated employee feeds omit task IDs
and task alert reads. Reminder reads cannot silently apply or recommend wage action.

## Exact links and task drafts

Task alerts open `/system/tasks?task=UUID`, including when already on the task page. The
authorized detail is loaded independently of list filters and pagination. Closing the task
clears its URL target. Unknown/unavailable task links display the API error.

Live refresh preserves an open task's captured version and unsaved report/review if the
task changes. Actions stay disabled until the employee explicitly loads the latest task;
discarding a draft requires confirmation. Losing detail access clears the open task.
Deadlines and alert dates display in Philippine time. Reading an alert does not submit or
complete the task.

## Migration and acceptance

Apply `20261006190000_staff_task_alert_reads` using `pnpm db:migrate`. It adds the task
reminder-stage enum and per-account task read receipts, with cascading foreign keys. It does
not change existing tasks, deadlines, submissions or KPI reviews.

Automated evidence is in `apps/api-ts/test/unit.test.ts` and
`apps/api-ts/test/integration.test.ts`: exact time boundaries, SQL/JavaScript parity across
database timezones, every-role access, foreign task/Finance denial, private projection,
backlog pagination, idempotent reads, unchanged task/financial records, shared Finance read
state, selected-type mark-all, deadline transitions, submission, deactivation and
cross-instance event isolation. Browser checks use synthetic API responses.

Verification passed 27 API unit tests, 38 PostgreSQL integration tests and 14 web tests
(79 total), workspace typechecks, the workspace production build and the final web production
build. All 16 migrations applied successfully to a fresh test database, with no Prisma schema
drift. The task read-state migration is also applied to the local preview database.
The production browser walkthrough passed combined counts and pagination, selected-type
mark-all, unchanged pending payments, same-page task links, draft preservation and explicit
reload, submission removal, 30-second deadline refresh without task writes, mobile widths
of 320/390 pixels, dark theme, keyboard dismissal, failure/retry, revoked detail access and
independent employee read state, with no browser runtime errors.

Named UAT should cover:

1. Assign a task to an employee and confirm only their bell contains it, even when another
   manager can view the task list. Open two different alerts on the same task page.
2. Read an assigned task, move through due-soon and overdue, and confirm one current alert
   becomes unread at each stage. Starting the task must not reset that acknowledgement.
3. Submit work and confirm its reminder disappears while late submission still goes through
   the existing human KPI review/completion flow.
4. Use Tasks and Finance filters as Owner/Finance; mark one type read and confirm the other
   type and total unread badge remain accurate.
5. Change a task in another tab while a report/review is being drafted; check preservation,
   blocked stale actions and explicit discard/reload. Try an unavailable direct task link.
6. Repeat on phone widths, dark theme, keyboard navigation and during alert API failure.

Finance verification-result alerts are covered by [29-finance-result-alerts.md](29-finance-result-alerts.md).
Staff email delivery is implemented in [30-staff-email-delivery.md](30-staff-email-delivery.md).
Production provisioning and named client acceptance remain open.
