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
- Staff can combine search/model/status/date/handler/agent filters and page through the
  Records/Clients tables with scoped totals; see [34-records-client-filters.md](34-records-client-filters.md). Batch choices load
  every page of eligible batches. Finance has read access and cannot submit record writes.
- Customer accounts see their own membership, schedule, release status, Finance-verified
  payment history and a derived remaining balance. Support remains unavailable in this preview.
- Authorized staff record external payment claims as pending. Owner/Finance decisions are
  versioned and audited; rejected and clarification records never affect balances. Duplicate
  references warn without blocking, and overpayments are shown separately from a zero floor.
- Staff may select a GCash, Maya, bank-transfer or cash template and scan a receipt image to
  prefill amount, date and reference. The Python/Tesseract process is transient and assistive:
  staff must review the fields and explicitly record a pending claim.
- The selected receipt can then be attached under a randomized private key outside the public
  web tree. Only payment readers can retrieve it; customers can retrieve only proof attached to
  their own verified payment. Replacing proof after a Finance decision is blocked and attachment
  writes an audit entry.
- Authorized reporting roles can read database-aggregated dashboard totals with optional date
  and batch filters. Verified and pending amounts remain separate; only verified money is
  presented as collected.
- The Payments screen exports a filtered CSV containing payment date, batch, status, method and
  amount. The migration export intentionally omits customer identity and payment references.
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
`PORT=4101`, and `WEB_ORIGIN=http://localhost:3001`. Provision local test accounts
privately after migrating the database.

```bash
pnpm install
pnpm --filter @freshphones/contracts build
pnpm db:generate
pnpm db:migrate
pnpm --filter @fresh/api-ts dev
```

Build/start the existing web app in another terminal:

```bash
NEXT_PUBLIC_API_BACKEND=typescript NEXT_PUBLIC_API_URL=http://localhost:4101 pnpm --filter @fresh/web build
pnpm --filter @fresh/web start --port 3001
```

Open `http://localhost:3001/login` and use a privately provisioned test account.

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
| `POST /api/payments` | `PAYMENT_RECORD`; creates a pending external-payment claim |
| `POST /api/payments/receipt-scan` | `PAYMENT_RECORD`; temporary image OCR and editable candidates only |
| `POST /api/payments/:id/proof` | `PAYMENT_RECORD`; one private proof while pending/clarification |
| `GET /api/payments/:id/proof` | `PAYMENT_READ`; staff scope or linked customer's verified own payment |
| `POST /api/payments/:id/verify` | `PAYMENT_VERIFY`; Owner/Finance decision with version guard |
| `GET /api/clients/:id/balance` | Staff or linked customer; verified-only derived balance |
| `GET /api/clients/:id/statement` | Operational statement, explicitly not a BIR invoice |
| `GET /api/payments/:id/confirmation` | Verified operational confirmation in caller scope |
| `GET /api/reports/dashboard?dateFrom=&dateTo=&batchId=` | `REPORT_VIEW`; verified/pending totals stay separate |
| `GET /api/reports/payments/export?dateFrom=&dateTo=&batchId=&status=` | `REPORT_VIEW`; privacy-trimmed CSV |

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

Eleven API unit tests (including executed Django schedule fixtures), thirteen PostgreSQL
integration tests and four web API-client tests cover totals, rounding, dates, missing terms,
rollback, concurrency, immutable schedules, role/customer isolation, report permissions,
verified/pending report totals, privacy-trimmed export and session refresh.
The fixture JSON was generated by calling the baseline's `generate_schedule` with only
`bulk_create` mocked; normal plans match exactly.

Browser verification on the local preview covered staff login, batch creation, enrollment,
schedule expansion, live updates while retaining a draft, customer membership/schedule,
logout and a 390px viewport. The full Next.js/NestJS workspace builds successfully.

## Remaining migration work

Gate 2 still needs requirement checklists, private customer documents/storage authorization,
document review, and the rest of the record-edit interface. Account administration and the
remaining role keys also need UI parity. The local proof provider must be replaced by production
S3-compatible private storage. Finance notifications, audited post-verification adjustments,
XLSX/PDF exports, collections reconciliation and reporting history still need parity; tasks/KPI,
support and other operational slices remain on Django until their own checks pass. There are
no dual writes between these databases.
