# Staff task and Finance email delivery

Full Scope v6 §12 now has staff email delivery for task assignments, task due-soon and
overdue reminders, pending Finance review and verified/rejected/clarification results.
The Owner controls wording, enabled types and task reminder timing under
`/system/notification-settings` → **Staff email**. Customer settings remain separate.

The subsequent [Customer Service increment](31-support-staff-alerts.md) adds three Support
events using this delivery system. The [Owner account increment](32-account-access-alerts.md)
adds four creation/role/access events. The settings endpoint now returns fourteen templates;
the seven-event verification below records the original task/Finance increment.

## Events and recipients

| Event | Recipient | When queued |
| --- | --- | --- |
| Task assigned | Active staff assignee | Inside the task assignment transaction |
| Task due soon | Active staff assignee | Scheduled check, default 24 hours before deadline |
| Task overdue | Active staff assignee | Scheduled check, default strictly after deadline |
| Finance pending review | Active Owner and Finance officers | Payment creation, pending correction or pending proof attachment |
| Finance verified/rejected/clarification | Existing result recipients | Inside the Finance decision transaction |

Result recipient policy matches [29-finance-result-alerts.md](29-finance-result-alerts.md):
all active Records staff plus an eligible recorder, deduplicated. Recipients are captured
at the event, and new hires do not receive past assignment/payment emails. Existing open
tasks are eligible for one deadline reminder when the worker starts; historical assignments,
pending payments and Finance results are not backfilled.

Finance email messages contain a short status and an authenticated link, with no customer
identity, amount, receipt references, Finance notes or attachments. Result links open the
recipient's saved result, including when later corrections changed the current payment.
Task emails contain the task title, priority and Philippine deadline; instructions, reports
and evidence remain behind login. Email reads do not acknowledge the in-app bell.

Assignment and payment writes, audits and email outbox inserts commit atomically. Outbox
failure rolls back the business write. Only verified payments change derived balances;
email scheduling/retries do not change tasks, reviews, payments or wage decisions.

## Scheduling and delivery

The existing notification worker checks every 30 seconds while the API is running, and
staff queues use their own tables. Tests disable automatic scheduling and drive it directly.
Owner reminder timing permits 1–168 hours before a task deadline and 0–168 hours after.
The in-app due-soon window remains 24 hours. A reminder is queued only for the current
deadline stage; downtime crossing a stage does not replay an obsolete reminder.

Database keys prevent duplicate queue rows per recipient/payment version/result or
recipient/task/deadline/stage. Starting a task does not queue a second assignment or deadline
email. Rescheduling a task permits a reminder for its new deadline. Pausing a type stops new
event emails and holds queued sends without consuming attempts. Re-enabling a deadline type
allows the next scheduled check to queue the current stage, never multiple overdue emails.

Before claiming delivery, the worker rechecks active staff status, the captured email address,
current role permissions and source eligibility. Submitted/completed, reassigned/rescheduled
tasks and reviewed/superseded pending payments are skipped. Result emails remain valid as
historical decisions while the original recipient retains current result access. An address
change skips the old email instead of redirecting a previously attempted provider request.
Once a send is claimed, a subsequent account/source change cannot recall that in-flight email.

Workers claim a two-minute lease with a unique attempt token. Final writes require that token,
so an old worker cannot overwrite a replacement's result. Five automatic attempts use
exponential backoff of 2, 4, 8, 16 and 32 minutes. Error messages exclude provider responses,
credentials and message contents. Paused rows defer their next check and do not block the queue.

The captured recipient, template wording and first-rendered URL, body, subject and sender
stay fixed across retries. Each provider call uses `notification/UUID` as its idempotency key.
Retries stop within a 23-hour window, inside Resend's 24-hour key retention period; the provider
also requires the same request payload. Source: [Resend idempotency keys](https://resend.com/changelog/idempotency-keys).

`SENT` means provider acceptance in production or a private local message file in development
and tests. It is not an inbox delivery/bounce receipt. Local messages use `.local/mail/UUID.txt`
with private directory/file modes. No real email is sent by development/test worker delivery.
Production requires the existing validated `RESEND_API_KEY`, `EMAIL_FROM` and `WEB_ORIGIN`.

## Owner controls and API

| Endpoint | Behavior |
| --- | --- |
| `GET /api/staff-notification-settings` | Fourteen defaults/stored templates, timing and local/provider mode (including Support and accounts) |
| `PATCH /api/staff-notification-settings/templates/:kind` | Strict, versioned, audited wording and enabled flag |
| `PATCH /api/staff-notification-settings/timing` | Strict, versioned, audited before/after hours |
| `GET /api/staff-notification-settings/deliveries` | Status/type filters, stable 20-row pagination and retry eligibility |
| `POST /api/staff-notification-settings/deliveries/:id/retry` | Versioned, audited retry of an eligible failed email |

Every route requires `ACCOUNT_MANAGE`; services recheck current active Owner access under the
same write lock used by role changes. Retry cannot change recipient, message, source or provider
key. Sent/sending/queued/skipped, expired, paused and now-unauthorized deliveries cannot be
manually retried. Total attempt history is retained when the per-cycle retry count resets.
Delivery reads omit message bodies, templates, private source IDs and attempt tokens.

The Staff email tab keeps drafts during delivery refreshes, filter changes and audience switches.
A save conflict retains the draft; **Discard changes and reload settings** deliberately loads
current wording. Inputs freeze during a save so its response cannot erase newer edits. Delivery
responses are sequenced to protect quick filter changes and delayed retry completion.

## Migration, validation and acceptance

Apply `20261006210000_staff_email_delivery` with `pnpm db:migrate`. It adds the staff queue,
templates and timing; it does not alter existing business rows or customer notification data.
Generate Prisma with `pnpm db:generate` before compiling.

Local verification passed 32 API unit tests, 52 real-PostgreSQL integration tests across
two API instances and 14 web tests (98 total), workspace typechecks and production builds.
All 18 migrations applied to a fresh dedicated test database with no Prisma schema drift;
the additive staff email migration is also applied to the local preview database.
Production browser checks with synthetic responses passed seven templates, delivery/type
filters, 20-row paging, pause/timing saves, preserved drafts on focus/audience changes and
conflicts, explicit discard/reload, delayed retry/filter races, error recovery, revoked access,
keyboard controls and 320/390-pixel mobile/dark layouts with no runtime errors. Dark success
and error message text also passed a minimum 4.5:1 contrast check.
PostgreSQL tests cover all seven kinds, every role, strict/origin validation, current recipient
access, timing, pause/resume, duplicate workers, stale leases, bounded retries, frozen provider
requests, outbox rollback, pagination, privacy and unchanged records/unread state.

Client acceptance should use active staff test accounts to check all seven email types,
recipient isolation, actual provider acceptance, inbox/spam placement, approved template wording
and reminder timing. Provider provisioning, inbox smoke tests and named client UAT remain open.
Use [33-staff-email-launch.md](33-staff-email-launch.md) for the client-owned sender setup,
read-only configuration check, isolated one-message smoke command and named Owner sign-off.
Subsequent Support/account coverage and its verification are recorded in
[31-support-staff-alerts.md](31-support-staff-alerts.md) and
[32-account-access-alerts.md](32-account-access-alerts.md).
