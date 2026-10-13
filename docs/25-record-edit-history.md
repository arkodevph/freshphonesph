# Client and batch editing with change history

The TypeScript staff interface now provides **Edit** and **History** actions on
`/system/clients` and `/system/records`. This closes the general record-correction UI gap
in Full Scope v6 §6. Handler/agent assignment and assignment filters are covered by the
subsequent [batch assignment increment](26-batch-assignments.md). Combined unit/status/date
filters are covered by [34-records-client-filters.md](34-records-client-filters.md). Named client UAT remains open.

## Permitted changes

- Client editors require `CLIENT_MANAGE`. They can correct the name, contact email/number,
  unit/model, joined date and status. The existing release-update workflow remains available
  on the client list. Contact email is separate from the account's sign-in email.
- Batch editors require `BATCH_MANAGE`. They can correct the batch number and status.
  Unit, start/end dates, price, installment count and cadence can be edited until a schedule
  has been issued. The existing fixed 7/15/30-day schedule policy still applies.
- Clients with issued schedules cannot move to another batch. Changes never edit a balance,
  verified payment or installment directly.
- Legacy records retain absent dates/payment terms when other details are corrected.

## Concurrency and history

Opening an editor captures the authoritative record and its version. Saves use that version;
they do not silently fetch a replacement version or retry a conflicting write. Live refreshes
leave the draft intact and flag a changed record. Loading newer details or closing a dirty form
requires an explicit discard decision.

History is paginated and scoped to the selected record. It shows the actor, timestamp in
Philippine time, and approved previous/updated field values. Raw audit snapshots, private file
data, nested accounts and unrelated records are not returned. History uses the same management
permission as the corresponding editor; customers and read-only Finance users cannot read it.

| Endpoint | Permission / behavior |
| --- | --- |
| `GET /api/batches/:id` | `BATCH_READ`; includes version and `termsLocked` |
| `GET /api/clients/:id` | Existing staff/customer isolation; includes `scheduleIssued` |
| `PATCH /api/batches/:id` | `BATCH_MANAGE`; version, issued-term locks and audit enforced |
| `PATCH /api/clients/:id` | `CLIENT_MANAGE`; version, batch-move lock and audit enforced |
| `GET /api/batches/:id/history?page=1` | `BATCH_MANAGE`; 20 entries per page |
| `GET /api/clients/:id/history?page=1` | `CLIENT_MANAGE`; 20 entries per page |

## Verification and client acceptance

Automated checks are in `apps/api-ts/test/records-history.test.ts`, the records/history and
concurrent-edit cases in `apps/api-ts/test/integration.test.ts`, and
`apps/web/test/record-edit.test.ts`. They cover projection/privacy, every role on the new read
routes, pagination, stale writes, legacy values, and unchanged schedules/verified balances.

The 2026-10-06 verification passed 23 API unit tests, 26 PostgreSQL integration tests and
13 web tests, plus workspace typechecks and the production build. The integration run used
a dedicated local test database; the browser walkthrough uses synthetic API responses.
Browser checks passed batch/client saves, readable history, stale-write rejection, explicit
discard, legacy/locked terms, plain-language contact validation, live draft preservation,
new schedule locks, Finance action visibility, and a 390px dark-mode history view with no
horizontal overflow or browser runtime errors.

Schedule issuance also invalidates an open editor when it changes the schedule lock without
incrementing the batch/client version.

For named UAT, an authorized reviewer should:

1. Correct a synthetic client's contact details and confirm the old/new values in History.
2. Edit an unissued batch; then enroll a client and confirm the payment terms become locked.
3. Open the same record in two sessions, save one correction, and confirm the other draft is
   preserved while the stale save is blocked.
4. Try Cancel/Escape after editing and confirm the discard prompt.
5. Repeat on mobile, with keyboard navigation, and with a read-only Finance/customer account.

No named client acceptance or production deployment is implied by local verification.
