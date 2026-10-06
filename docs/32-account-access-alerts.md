# Owner account and access alerts

Full Scope v6 §12 now includes staff account creation, role changes and sign-in activation
or deactivation. Active Owners receive private bell events under **Accounts** and optional
emails. Links open `/system/team?account=UUID` to review the account's current access.
Owner → Notification settings → **Staff email** now contains fourteen templates: seven
task/Finance, three Support and four account types.

## Events and recipients

| Event | When captured |
| --- | --- |
| `ACCOUNT_CREATED` | A staff account is created |
| `ACCOUNT_ROLE_CHANGED` | An existing staff account's role actually changes |
| `ACCOUNT_ACTIVATED` | Staff sign-in access changes from inactive to active |
| `ACCOUNT_DEACTIVATED` | Staff sign-in access changes from active to inactive |

Recipients are all active Owners inside the account-write transaction, including a newly
created or promoted active Owner. A deactivated or demoted Owner receives no new events.
New recipients receive no historical backfill. Customer account creation and customer
activation changes are excluded; the existing API prohibits staff/customer role transitions.
An unchanged update creates no alerts. A combined role/access change creates two distinct
events with the same captured account version.

Each recipient has an immutable snapshot of the account name, actor name, old/new role and
access, version and event time, plus their own read receipt. Later account changes retain
that history. Current active Owner access is required to list, read or receive it through
SSE. Bell previews show the staff name, event/role description and actor; they omit email
addresses, passwords, hashes, sessions, reset tokens and customer information. Reading an
alert changes only its receipt, never account access, sessions or financial records.

## Storage, email and API

`AccountAlert` has recipient and subject account foreign keys, snapshot constraints and a
unique recipient/account/version/kind key. Account writes, existing audit entries, session
revocation, private change events and email outbox inserts commit together. Outbox failure
rolls back the account change. Existing Owner self-lockout safeguards remain enforced.

The four email types reuse [30-staff-email-delivery.md](30-staff-email-delivery.md):
versioned/audited wording and pause controls, private delivery history, five-attempt automatic
backoff, bounded manual retries, frozen provider requests, idempotency and worker leases.
Email previews contain generic event wording and an authenticated account link, without the
subject's identity, role, actor, address or credentials. Delivery/retry rechecks the recipient's
current active Owner permission and captured email address. Later subject changes do not
suppress a saved historical event. Pausing a type suppresses new emails while bell events
continue; re-enabling does not backfill. Email reads do not mark bell events as read.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/staff/alerts?scope=accounts` | Own historical events, 20-row pages and global/scoped unread counts; Owner only |
| `POST /api/staff/alerts/:id/read` | Strict `{ "entity": "account" }`, own recipient only, idempotent |
| `POST /api/staff/alerts/read-all` | `{ "scope": "accounts" }` reads all own account pages, preserving other categories |
| `GET /api/accounts/:id` | Current sanitized account details, `ACCOUNT_MANAGE` required |
| `GET /api/events` | Own account-alert IDs and read invalidations, without snapshot contents |
| Existing staff notification settings routes | Four additional account kinds; fourteen total templates |

The account page follows same-page query links and retrieves the exact account independently
of directory search, role/status filters and pagination. Sequenced reads prevent a delayed
previous account response from replacing the selected account. Unsaved role/access drafts
remain per account across other links and live refreshes. Each draft retains its original
version; a newer account version blocks saving until the Owner explicitly discards the draft
and reviews current access. Editable controls freeze during writes. Detail failures clear
the modal and allow retry; access loss clears private rows, details, drafts and forms. Late
write responses cannot restore cleared private data or account-name success messages.

## Migration, verification and UAT

Apply `20261006230000_account_access_alerts` with `pnpm db:migrate` and regenerate Prisma
with `pnpm db:generate`. This additive migration creates no historical events and does not
modify existing accounts or customer notifications. All twenty migrations apply to a fresh
dedicated database with no Prisma schema drift; the account migration is also applied to the
loopback local preview.

Verification passed 34 API unit tests, 66 real PostgreSQL integration tests and 14 web tests
(114 total), workspace typechecks and production builds. Database coverage includes every
role, exact sanitized account reads, strict/foreign receipt rejection, customer exclusion,
historical snapshots, no-op and combined changes, session revocation, scoped all-page reads,
email privacy/templates/pause, bounded frozen retries, current role/address eligibility,
cross-instance private SSE, concurrency/deduplication and atomic rollback. Read/delivery
tests preserve account access, audit data, other unread categories and verified-only balances.

Production-browser checks use synthetic fixtures and cover the Accounts filter, 20-row
paging, scoped receipts, exact same-page links outside directory filters, per-account drafts,
stale-version blocking/discard, frozen controls, delayed response races, 403/503 clearing and
recovery, late writes after access loss, keyboard controls, 320/390px screens and dark theme.
Owner email checks cover all fourteen templates, account type pause/filtering, delivery
paging, retry/filter races, draft/conflict preservation, revoked access and mobile/dark layouts.
No real provider email is sent during verification; local deliveries save private previews
under ignored `.local/mail`.

Named Owner UAT should confirm the real staff roster, all four events, combined changes,
self-lockout safeguards, recipient isolation, historical wording, account links, draft
conflicts, read state and email pause/retry history. Production sender/domain provisioning,
approved wording and an authorized real-inbox smoke test remain launch work.
