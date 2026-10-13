# Records and Clients filters

The TypeScript staff workspace supports combined search, unit/model, status, date,
handler and agent filters for Full Scope v6 §6. Every facet is applied in PostgreSQL
before counting and paging. Handler access remains limited to currently assigned
records; requesting another handler, agent, batch or client cannot widen that access.

## Filter meaning

| Facet | Records / batches | Clients |
|---|---|---|
| Search | Part of batch number or model | Part of name, email, phone or batch number |
| Unit / model | Part of batch model | Part of the client's own unit; batch model is used only when the unit is blank |
| Status | Forming (`PLANNED`), Active, Closed (`COMPLETED`), Cancelled | Active, On hold (`ON_HOLD`), Completed |
| Date range | Batch start date | Client joined date |
| Handler / agent | Current batch assignment | Assignment inherited from the client's batch |
| Linked batch | Member link opens Clients | Intersects every directory filter |

Search and model matching are case insensitive. Date boundaries are inclusive, use
calendar dates (`YYYY-MM-DD`) and allow either endpoint alone. Impossible dates and
an end before the start are rejected. Clients without a legacy joined date remain
visible without a date filter and are excluded when either date bound is present.
Created date, release date and payment dates do not substitute for the joined date.

## API and permissions

`GET /api/batches` requires `BATCH_READ`; `GET /api/clients` requires `CLIENT_READ`.
Both accept `q`, `model`, `status`, `dateFrom`, `dateTo`, `handlerId`, `agentId` and
`page`. Clients additionally accept `batchId` and an exact `id`. IDs must be UUIDs;
unknown keys, repeated string facets, invalid status values and pages outside
1–100000 are rejected. Search/model inputs are trimmed and bounded to 100 characters.

For example, `/api/clients?model=iPhone&status=ON_HOLD&dateFrom=2028-02-29&dateTo=2028-03-01`
returns matching joined clients rather than all clients created during those dates.

The response contains `items`, `total`, `page` and `pageSize` (20). Rows and totals
share the same scope and filter predicates in one repeatable-read transaction.
Ordering uses creation time then ID, both descending, so ties paginate consistently.
An out-of-range page returns no rows while preserving the actual filtered total.
Filters are reads: they do not change schedules, payments, balances, records,
notifications, audit entries or live events.

No schema migration is needed. All twenty existing migrations apply to the fresh
`freshphones_record_filters_test` database with no Prisma schema drift.

## Staff interface

Records and Clients have labelled filter panels, clear/refresh actions, result
counts and page totals. Text inputs wait 300 ms after typing; other facets apply
immediately. Changing any facet resets to page 1. Live changes that shorten the
list move a now-empty page to the last available page. Invalid ranges show an
inline error and clear the result view without requesting an invalid query.
Sequenced reads prevent delayed responses from replacing the current selection.

Exact `?client=<id>` links load that authorized client independently of directory
filters or the previous page. The banner explains that filters apply on return.
Same-page navigation updates the linked client. Changing a filter returns to the
directory and removes linked client/document context; clearing filters also removes
batch context. Removing only batch context preserves the other active facets.

Creating a client loads eligible batch choices separately from the directory.
Changing filters cannot reset those choices or a creation draft. Choice failures
clear obsolete options while retaining the selected ID and text draft for explicit
recovery. Failed directory reads clear rows and counts. Permission loss clears
private rows, open details, schedules, document views and creation/release drafts.

Open source editors and creation/release drafts survive filter and live refreshes.
Release drafts retain the version captured when opened; a changed client blocks
posting until the draft is explicitly discarded and current data reviewed. Source
forms are disabled during their own writes. Schedule requests are sequenced so an
old client's response cannot replace the selected client's schedule.

## Verification and acceptance

Automated checks pass: 47 API unit tests, 71 real PostgreSQL integration tests and
17 web tests (135 total). Workspace typechecks and production builds pass.
Integration cases cover all roles, strict HTTP validation, leap-day boundaries,
one-sided dates, null legacy dates, own-unit overrides and blank-unit fallback,
combined assignments, reassignment across API instances, exact-client isolation,
read-only side effects, matching totals and 20-row pagination with tied timestamps.

Production-build browser checks with synthetic responses pass combined facets, date
validation, page resets/clamping, exact same-page client/batch/document links, retained
creation/edit/release drafts, delayed list/schedule reads, stale release blocking,
independent batch choices, retry recovery, access-loss clearing and document privilege
revocation while record reads remain allowed. Mobile 320/390, desktop, dark-theme
contrast and keyboard controls pass. Filters perform zero writes; separately tested
explicit creation/release writes freeze the source fields and retain captured versions.
Named business acceptance and production deployment remain open. Production email
setup and real-inbox testing remain deferred as recorded in
[33-staff-email-launch.md](33-staff-email-launch.md).

For named UAT, an authorized Records employee and a handler should:

1. Combine model/status/dates/handler/agent, compare the count and every page against
   known memberships, and clear the filters.
2. Verify both date endpoints, a blank legacy joined date and a client's unit that
   differs from its batch model.
3. Follow a batch member link and a client notification link while other filters
   and page 2 are active; return to the filtered directory.
4. Keep an unsaved draft through a live change, confirm stale release updates are
   blocked, and recover from an unavailable directory or batch choice request.
5. Reassign a batch and confirm the former handler immediately loses both rows and
   counts, including direct client and schedule links.
