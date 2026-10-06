# Customer Service staff alerts

Full Scope v6 §12 now includes recipient-scoped staff bell and email events for Customer
Service. The bell's **Support** filter and authenticated case links open
`/system/support?case=UUID`. Owner → Notification settings → **Staff email** adds three
Support templates to the existing seven task/Finance templates.
The subsequent [Owner account increment](32-account-access-alerts.md) adds four account
types, bringing the current total to fourteen; the verification below records this Support
increment's original ten-template state.

## Events and recipients

| Event | Recipients at the event |
| --- | --- |
| New unassigned case | All active CS heads; active Owners only when no active CS head exists |
| Assignment or reassignment | The active assigned staff member with `SUPPORT_MANAGE` |
| Customer reply | The active authorized assignee, or the same triage recipients when unassigned or the assignee has lost active Support access |
| Reopen a resolved case | A fresh assignment or triage event using the current assignee |

The existing assignment API accepts only active CS heads/team members. Recipient snapshots
are captured with each event; new hires receive no historical backfill. An inactive or
unauthorized assignee sends subsequent events to triage without changing the case assignment.
Owners remain able to manage all cases through the existing Support permission even when
they are not recipients of a triage alert. Other CS staff retain the existing case-list
access; private inbox/read receipts are limited to their own alerts.

Alerts remain visible only while their recipient has active Support access and still matches
the case's current assignment/triage policy. Reassignment permanently retires the case's old
events and queues a fresh event for the new recipient. A staff reply retires pending customer
reply events. Resolution/closure retires all events; reopening a resolved case produces a
new event instead of resurrecting handled ones. Closed cases remain immutable.

Bell and email previews contain generic event wording and an authenticated case link. They
omit customer names, contact details, category, concern and message bodies. The actual
conversation is retrieved through the existing permission-gated Support detail API.
Reading a bell alert updates only that recipient's receipt; it never assigns, replies,
changes case status, resolves the case or changes financial records.

## Storage, delivery and API

`SupportAlert` stores recipient, case, captured version, kind, creation time, read time and
handled time. The recipient/case/version/kind unique key prevents repeated notification
hooks from duplicating events. Its creation, private change event and staff email outbox
insert share the case/message/audit transaction. An outbox failure rolls back all of them.

Support emails reuse [30-staff-email-delivery.md](30-staff-email-delivery.md): Owner-managed
versioned/audited templates, enabled flags, private delivery history, five-attempt automatic
backoff, bounded manual retries, frozen provider payloads, idempotency and worker leases.
Delivery/retry rechecks the same current alert visibility, recipient access and captured
email address. Reassigned, answered, resolved, closed and revoked events are skipped.
Pausing a Support type suppresses new email events while bell events continue; re-enabling
does not backfill them. Staff email reads do not mark bell events as read.

| Endpoint | Support behavior |
| --- | --- |
| `GET /api/staff/alerts?scope=support` | Own currently eligible alerts, 20-row pages, global and scoped unread counts |
| `POST /api/staff/alerts/:id/read` | Strict `{ "entity": "support" }`; current authorized recipient only, idempotent |
| `POST /api/staff/alerts/read-all` | `{ "scope": "support" }` marks all eligible Support pages, preserves other categories |
| `GET /api/events` | Private Support alert IDs/read invalidations; no concern/message text |
| Existing staff notification settings routes | Three added kinds: `SUPPORT_NEW_CASE`, `SUPPORT_ASSIGNED`, `SUPPORT_CUSTOMER_REPLY` |

The case page follows query changes while already open and bypasses previous status/page
filters for a direct case link. Sequenced detail requests prevent a slow old case response
from replacing the current conversation. Reply drafts and resolution/status drafts remain
per case across focus updates and other case links. Resolution drafts retain their original
version; a live case change blocks saving until the draft is explicitly discarded/reviewed.
Mutations freeze editable controls and retain drafts on conflicts. Failed detail reads clear
the conversation, and access loss clears private rows, details and drafts. The conversation
panel fits mobile screens independently of the horizontally scrollable records table.

## Verification and UAT

Verification passed 33 API unit tests, 59 real PostgreSQL integration tests and 14 web tests
(106 total), workspace typechecks and production builds. Migration
`20261006220000_support_staff_alerts` is applied to the loopback local preview; all 19
migrations apply cleanly to a fresh test database with no Prisma schema drift.
Database coverage includes
every role, triage fallback, strict reads, foreign recipients, lifecycle/reopening, all-page
scoped reads, unchanged cases/messages/audits, private email contents, templates/pause,
bounded retries, current permissions, cross-instance SSE, concurrency/deduplication and
transaction rollback. Browser checks use synthetic fixtures; database tests use real local
PostgreSQL. No real provider email is sent during testing.

Production-browser checks passed Support filter/paging and scoped unread reads, same-page
links, case links outside previous status/page filters, slow-response races, per-case drafts,
stale-version blocking and explicit draft discard/save/reply. They also covered 403/503
clearing and recovery, role-specific bell tabs, 320/390px screens, dark theme and keyboard
controls. Owner email checks passed all ten templates, Support type pause and delivery
filtering, retry races, draft/conflict preservation, revoked access and mobile/dark layouts.

Named Customer Service/Owner UAT should confirm recipient routing with the operational
staff roster, approved wording, mobile conversations, exact links, draft conflicts, read
state, email pause/retry history and case lifecycle. Production sender/domain setup and an
authorized real-inbox smoke test remain launch work. Local development/test deliveries save
private previews under ignored `.local/mail`.
