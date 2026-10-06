# Handler and agent batch assignment

The TypeScript records workspace now supports handler/agent assignment, filters and
server-enforced handler isolation for Full Scope v6 §3 and §6. Authorized Records staff can
use **Assign** on `/system/records`; the new `/system/agents` directory supports agent
creation, editing and deactivation.

## Access and assignment

- Owner, COO, General Manager and Records can manage assignments and the agent directory.
  Finance keeps read-only batch/client access.
- A batch has one optional handler and one optional agent. Clients inherit the handler scope
  of their batch. Only active `CORE_HANDLER` accounts and active agents can be newly assigned.
- Handlers have `BATCH_READ` and `CLIENT_READ`, with queries restricted to their assigned
  batches. Search, pagination, totals and handler/agent filters intersect this scope. Direct
  reads of unassigned batches, clients, schedules and release updates return 404.
- Handler dashboards show only assigned record counts. Handlers cannot edit records, read
  management change history, manage agents/accounts, access documents, or use Finance/report
  endpoints. An agent entry identifies a representative and grants no login or staff access.
- Unassignment and reassignment remove the previous handler's API access immediately after
  the transaction commits. SSE refreshes both handlers; the old handler receives only an
  access-invalidation event addressed to their own account, rather than a removed record ID.
- Deactivating an agent retains existing assignment/history and prevents new assignment.
  Existing inactive assignments can be retained or cleared. Handler account deactivation
  uses the existing session-revocation flow.

## Audit, concurrency and public verification

Assignment writes use the existing transaction lock and recheck the actor's current access.
The batch version increments when assignments change, so concurrent assignments or record
edits cannot overwrite one another. A no-op does not add a history entry or increment the
version. Schedules, plan terms, payments and derived balances remain untouched.

Batch History shows approved previous/new handler and agent names, actor and time. Raw nested
staff records are never returned. Agent create/edit/deactivation is audited. Agent and
assignment editors preserve drafts on live refresh/conflict and require a discard decision
before replacing an unsaved draft or closing it.

The existing public verification screen now works with the TypeScript API. Lookup accepts an
exact code or an unambiguous complete name; ambiguous/partial names do not confirm an arbitrary
agent. Responses expose only `found`, `full_name`, masked `agent_code` and `is_active`.
Directory outages show a retry message rather than a false no-match result.

| Endpoint | Access |
| --- | --- |
| `GET /api/records/assignment-options` | `BATCH_READ`; safe names/status, scoped for handlers |
| `PATCH /api/batches/:id/assignments` | `BATCH_MANAGE`; captured `version`, nullable `handlerId` and `agentId` |
| `GET /api/batches?handlerId=…&agentId=…` | `BATCH_READ`; filters intersect assignment scope |
| `GET /api/clients?batchId=…&handlerId=…&agentId=…` | `CLIENT_READ`; filters intersect assignment scope |
| `GET /api/agents`, `GET /api/agents/:id` | `AGENT_MANAGE`; internal directory |
| `POST /api/agents`, `PATCH /api/agents/:id` | `AGENT_MANAGE`; strict fields, versioned updates and audit |
| `GET /api/agents/verify?q=…` | Public; exact lookup and minimal masked result |

## Migration and verification

The additive Prisma migration `20261006120000_batch_assignments_agents` creates `Agent` and
nullable indexed handler/agent foreign keys on `Batch`. Existing batches start unassigned;
no assignment is inferred. Apply it with `pnpm db:migrate` before using this increment.
Existing Django agent data is not automatically copied into the TypeScript database.

Automated evidence lives in the assignment, directory and SSE tests in
`apps/api-ts/test/integration.test.ts`, history projection tests in
`apps/api-ts/test/records-history.test.ts`, and captured-version assignment tests in
`apps/web/test/record-edit.test.ts`. Integration checks use a dedicated local PostgreSQL
database and two API instances. Browser walkthroughs use synthetic API responses.

The 2026-10-06 verification passed 24 API unit tests, 29 PostgreSQL integration tests and
14 web tests, workspace typechecks and production builds. The migrated test schema matches
Prisma with no drift. Browser checks passed agent create/edit/deactivation, assignment on a
locked batch, inactive choices, named history, captured-version conflicts and explicit discard,
assignment filters, handler-only dashboard/records, revoked record/schedule removal, Finance
read-only visibility and a 390px dark-theme assignment dialog without overflow/runtime errors.
The public `/verify` walkthrough also passed masked inactive results, clearing an old result
when the query changes, and the retry state on directory failure.

Named UAT should cover:

1. Add an agent, assign an active handler and agent to a batch with an issued schedule, and
   confirm the names and previous/new values in History.
2. Sign in as two handlers; verify each sees only their own batches, clients and counts,
   including direct URLs and filters requesting the other handler.
3. Reassign while the previous handler has clients/schedule open; verify removed records
   disappear after live refresh and direct access is denied.
4. Save competing assignment drafts and confirm the second preserves its choices and offers
   explicit reload/discard. Repeat using mobile, dark theme and keyboard navigation.
5. Deactivate an agent; confirm prior assignment/history remains, new assignment is blocked,
   and public verification shows Inactive without contact/private fields.

Named client acceptance and production deployment remain open. Finance pending-payment
alerts are implemented in [27-finance-pending-alerts.md](27-finance-pending-alerts.md). Combined unit/status/date filters are implemented in [34-records-client-filters.md](34-records-client-filters.md).
Recruitment migration, target infrastructure and production data import remain separate work.
