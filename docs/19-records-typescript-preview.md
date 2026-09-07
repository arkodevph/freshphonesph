# Records and installment schedules in TypeScript

This increment implements the batch → enrollment → schedule workflow from Full Scope v5
§§5–6 and connects it to the live-update behavior described in the v6 review draft §15.
The existing Next.js landing page, staff screens, and customer portal supply the interface.
This is a local migration preview, not a production cutover or completion of Gate 2.

## Implemented behavior

- Batches carry a decimal contract price, installment count and cadence. Creation and reads
  return monetary strings and date-only values.
- Enrollment creates the client, all installments, audit entries and live events atomically.
  Only planned/active batches with agreed terms accept new members.
- Installments sum exactly to the agreed total. Each amount is positive; there is no mutable
  balance column and no inference that scheduled amounts have been paid.
- Once installments exist, changes to model, dates or plan terms are rejected, as is moving
  that client to another batch. Profile/status changes retain optimistic concurrency checks.
- Authorized staff can issue a schedule for a legacy client after reviewing the batch terms.
  Repeating that command, including concurrently, returns the existing schedule without
  duplicate installments, audit entries or events.
- Staff can search and page through the existing Records/Clients tables. Batch choices load
  every page of eligible batches. Finance has read access and cannot submit record writes.
- Customer accounts see their own membership, scheduled total, schedule and release status.
  Unported Finance and support controls are unavailable in this preview.
- Login uses HTTP-only cookies. Refresh requests are shared within a tab and serialized
  across tabs using Web Locks where supported. Logout revokes the server session.
- SSE invalidates lists and open schedules without replacing form drafts. Ready/reconnect
  reloads the authoritative snapshot; only authorized record identifiers travel in events.

## Dates, rounding and legacy data

The migration leaves old terms and joining dates nullable. It does not invent contracts or
rebuild existing clients' schedules. Set all three agreed terms through a versioned batch
update, then issue each legacy client's schedule explicitly.

Cadence preserves the Django baseline: weekly = 7 days, semi-monthly = 15 days, monthly =
30 days, with the first due date one interval after batch start. These are fixed intervals,
not calendar-month anniversaries or the 15th/last day of a month. A calendar policy change
requires an approved policy and separate migration; the preview does not reinterpret dates.

Calculations use integer centavos and preserve baseline half-even rounding, placing the
remainder in the final installment. For very small plans where that would make the last
installment zero/negative, earlier installments round down instead. Plans with fewer
centavos than installments are rejected. Tests include maximum-size amounts and tiny totals.

## Run locally

Use a separate empty PostgreSQL database for the preview. Configure
`apps/api-ts/.env` from its example with that database URL, a local JWT secret,
`PORT=4101`, `WEB_ORIGIN=http://localhost:3001`, and a development `SEED_PASSWORD`
of at least 12 characters.

```bash
pnpm install
pnpm --filter @freshphones/contracts build
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm --filter @fresh/api-ts dev
```

Build/start the existing web app in another terminal:

```bash
NEXT_PUBLIC_API_BACKEND=typescript NEXT_PUBLIC_API_URL=http://localhost:4101 pnpm --filter @fresh/web build
pnpm --filter @fresh/web start --port 3001
```

Open `http://localhost:3001/login`. Seed accounts are `owner@freshphones.test`,
`records@freshphones.test`, `finance@freshphones.test`, and `customer@freshphones.test`;
they use the seed password for a new database. Rerunning the seed preserves existing passwords
and records.

The backend selection is fixed at web build time. Without `NEXT_PUBLIC_API_BACKEND=typescript`,
the web app retains its Django behavior. Changing the API URL alone is not a compatible
cutover: the two APIs have different identifiers, auth and response contracts.
Production cookie deployment requires HTTPS and web/API hosts under the same site.

## Endpoints and permissions

| Route | Access / effect |
|---|---|
| `POST /api/batches` | `BATCH_MANAGE`; optional terms must be supplied together |
| `PATCH /api/batches/:id` | `BATCH_MANAGE`; requires version; issued terms locked |
| `POST /api/clients` | `CLIENT_MANAGE`; enroll and generate schedule atomically |
| `GET /api/clients/:id/schedule` | `CLIENT_READ` or linked customer only |
| `POST /api/clients/:id/schedule` | `CLIENT_MANAGE`; idempotent issuance for legacy clients |
| `GET /api/clients?q=&page=&status=&batchId=` | `CLIENT_READ`; scoped search and pagination |
| `GET /api/events` | Authenticated; filtered by current role and customer linkage |

## Verification

```bash
pnpm --filter @fresh/api-ts test
pnpm --filter @fresh/web test
pnpm typecheck
# Create a dedicated database ending in _test, then:
DATABASE_URL="$TEST_DATABASE_URL" pnpm db:migrate
pnpm test:api-ts:integration
pnpm build
```

Eight API unit tests (including executed Django schedule fixtures), twelve PostgreSQL
integration tests and four web API-client tests cover totals, rounding, dates, missing terms,
rollback, concurrency, immutable schedules, role/customer isolation and session refresh.
The fixture JSON was generated by calling the baseline's `generate_schedule` with only
`bulk_create` mocked; normal plans match exactly.

Browser verification on the local preview covered staff login, batch creation, enrollment,
schedule expansion, live updates while retaining a draft, customer membership/schedule,
logout and a 390px viewport. The full Next.js/NestJS workspace builds successfully.

## Remaining migration work

Gate 2 still needs requirement checklists, private customer documents/storage authorization,
document review, and the rest of the record-edit interface. Account administration and the
remaining role keys also need UI parity. Finance, verified balances, tasks/KPI, support and
other operational slices remain on Django until their own parity and reconciliation checks
pass. There are no dual writes between these databases.
