# 165 — Freshphones scalability study and review

Inspected November 22, 2026 by Peep, followed by a Khuket review pass in the same
assistant session. Local worktree baseline: `75d87710497af218c1cd2daa9e3650d8716ea4bb`,
branch `feature/hr-personnel-workspaces`. Existing HR, frontend and other local
changes were present before this study and were preserved. No commit, push,
deployment or production operation was performed.

## Outcome

The authorized payment page now batches duplicate-reference and submission
readiness evidence into one parameterized SQL statement. A 20-row staff page
previously performed 40 evidence queries when all references were nonempty;
the new path performs one. Customer pages previously performed 20 duplicate
queries and now perform one. Empty pages need no evidence query.

Changed implementation: `apps/api-ts/src/finance/payment-read-evidence.ts` and
the two list paths in `apps/api-ts/src/finance/finance.service.ts`.
Single-record/mutation responses retain their original fresh evidence reads.
The regression is registered in the existing API integration-test script;
pre-existing package script edits remain intact.

## Source-backed codebase map

| Boundary | Current behavior and relevant source |
| --- | --- |
| Browser/API | Next.js calls NestJS. Shared schemas/types live in `packages/contracts`. `apps/api-ts/src/app.ts` composes the domain services, API prefix, CORS, ingress abuse controls, auth guards and error handling. |
| Identity/authorization | Better Auth resolves sessions; `src/auth/auth.service.ts` rechecks current session/user state. `src/auth/access.ts` enforces permissions, MFA, membership and required notices; `src/records/scope.ts` restricts batch/client/staff/task queries. UI permissions are not authoritative. |
| Records | Controllers validate input; `src/records/records.service.ts` owns record changes. Prisma models link Member → Client memberships → Batch, schedules and payments. Capacity and replacement helpers preserve real membership occupancy. |
| Payment reads | `FinanceController.payments` validates query schemas and requires PAYMENT_READ. `FinanceService.payments` applies role/client/batch/date filters, bounded pagination and ordering before fetching evidence. Finance queues filter eligibility before pagination inside RepeatableRead. |
| Money writes | `FinanceService.write` acquires the shared transaction advisory lock and rereads the active actor's permission. Reviews, verification, adjustments, audit and change events stay transactional. `src/finance/ledger.ts` derives verified effective credit from original decimal amounts plus signed adjustments. Pending claims do not change balances. |
| Read models/reports | `src/reports/collections.ts` aggregates scoped schedules, verified/pending payments and adjustments; lifetime balance and period totals are deliberately different. Full-scope totals are computed before taking detail pages. See doc 55 for query/index constraints. |
| Database | `src/database.ts` uses Prisma 7.10.0 with the PostgreSQL adapter and a pool maximum of 10 per Database instance. API and worker are separate application contexts; a deployment must budget connections across replicas/workers. Existing indexes support payment client/status/date/order patterns. |
| Recovery/jobs | Writes persist ChangeEvent/outbox rows. `src/redis/event-relay.ts` selects committed unpublished rows with SKIP LOCKED and publishes IDs to Redis; a crash can repeat a hint. `src/jobs/background-worker.service.ts` uses separate bounded-concurrency workers, retries and database reconciliation. Notifications never independently verify payments. |
| Live reads/cache | SSE reauthenticates, checks entity visibility and bounds pending hints; reconnects cause snapshot refetch. `src/coo-security/read-cache.*` is an existing read-cache layer, not a substitute for money authorization or durable storage. |
| Deployment | Doc 20 specifies 1,000 registered users, 100 concurrent active sessions and 20 requests/second, with two planned API replicas. Production Neon, pool/region choices, private storage, Redis, restores and full capacity acceptance remain open. |

This is a traced architecture map with sampled related paths, not exhaustive
verification of every domain. UI composition, OCR/PDF generation, all report
queries, production infrastructure and unrelated worktree changes were not
reviewed completely.

## Three priority weaknesses

1. **Payment list evidence query fan-out — reproduced and fixed.** The old list
   rendered each row with a checklist query plus a case-insensitive duplicate
   lookup. Promise.all did not remove the database work; Finance's interactive
   transaction uses one connection. The batched helper preserves the authorized
   page and returns booleans rather than loading unrelated payment records.
2. **Task reminder coverage above 500 eligible tasks — reproduced, not fixed.**
   `src/notifications/notifications.service.ts:330` takes 500 without a cursor,
   deterministic continuation or exclusion of already-issued reminders. Enqueue
   deduplicates notifications but does not advance the task selection. A rollback
   probe inserted 501 overdue synthetic tasks and invoked the unchanged method
   twice. Both invocations considered 500 records. Only 497 synthetic tasks got
   reminders after either run; four stayed omitted because other pre-existing
   synthetic eligible tasks also occupied the selected page. **[P2] Repeated
   reminder runs can leave eligible tasks unnotified.** Smallest credible fix:
   traverse a stable `(deadline,id)` cursor in bounded transactions, retaining
   current-state checks and deduplication. Sorting the same first page alone
   would not resolve coverage. No application change was made for this finding.
3. **Cross-domain write serialization — confirmed mechanism, capacity impact
   unmeasured.** Finance writes (`src/finance/finance.service.ts:151`), Records
   writes (`src/records/records.service.ts:164`) and reminder work
   (`src/notifications/notifications.service.ts:340`) use advisory key 740015.
   A two-session probe confirmed the same key cannot be acquired concurrently,
   while a different key can. This is an intentional integrity fence, not proof
   of an authorization bug or failure at 20 requests/second. Profile wait time
   under mixed writes before considering per-resource locks; preserve lock order,
   cross-domain invariants and revocation/retention fencing.

An additional unmeasured pressure is one-second session revalidation on active
SSE connections. Caching identity without revocation guarantees is not an
acceptable shortcut. It was inspected but not changed or load-tested here.

## Experiment contract and results

Local artifacts: `.local/autoresearch-scaling-20261122/` (ignored by Git).
The local autoresearch runner pins the benchmark, evaluator, required checks,
timeout and source hashes. Primary score: evidence-query count for 20 staff
payments, minimized subject to behavioral equivalence and reserved-case checks.

Synthetic fixture: one authorized page, two client identities, 1,000 historical
payments, null/empty/case/underscore/percent/Unicode/quoted references, historical
rejected duplicates, and a dated missing-receipt requirement. Tests compare
against the original Prisma lookup and original SQL checklist function, then
check a reversed subset. The reserved subset is a correctness check over the
same fixture, not an independently sampled production distribution.

| Evidence workload | Original | Batched candidate |
| --- | --- | --- |
| Staff page, 20 nonempty references | 40 queries | 1 query |
| Customer page, 20 nonempty references | 20 queries | 1 query |
| Staff median, first measurement | 87.522 ms | 13.258 ms |
| Staff median, repeated baseline | 63.893 ms | Candidate above |
| Customer median, first measurement | 29.750 ms | 5.466 ms |
| Customer median, repeated baseline | 16.791 ms | Candidate above |

Each timing uses two warmups and seven samples. Counts come from Prisma query
events. Runtime: Node 24.22.1, Prisma 7.10.0, isolated local PostgreSQL 18.6 with C
locale. Both baseline measurements are retained to expose timing variation.
No other test suite ran concurrently with those benchmark measurements.

These measure the evidence-enrichment phase, not complete HTTP response latency,
throughput, production hardware or network RTT. The correlated EXISTS/checklist
work still executes within the batched SQL; one round trip is not constant-cost
database computation. No index or schema migration was needed for this change.
Production/local Compose plans use PostgreSQL 16; compatibility and capacity
acceptance on that deployment remain unverified.

Trial receipts under `experiment-v2/runs/`:

- `20261122T232615-b7b3c805`: baseline, score 40.
- `20261122T232726-53e4d9ce`: candidate, score 1, retained.
- `20261122T232810-f9bff709`: intentionally broken cross-client candidate,
  rejected by a boolean-equivalence assertion; never applied to application code.
- `20261122T232812-415a3138`: repeated baseline, score 40, correctly not selected.

The earlier `experiment/` directory retains an initial benchmark-harness import
failure. The evaluator was corrected before establishing the successful fixed
contract; failed setup is not counted as an application performance result.

## Khuket review and verification

No confirmed issue was found in the batching change's reviewed scope. Reviewed:
input binding, selected-row ownership, same-client/full-history duplicate lookup,
self-exclusion, null/empty references, original Prisma ILIKE behavior, database
date conversion, customer projection, false-versus-missing evidence, Finance
transaction boundary and unchanged mutation paths. The additional pre-existing
reminder defect above is reported separately.

Executed validation:

- API TypeScript check passed.
- Repository formatter restricted to the four new/edited TypeScript files passed.
- Targeted whitespace/diff checks passed.
- 38 integration tests passed across payment-read evidence, Finance workspace,
  operational verification and signed/idempotent adjustments. Authentication,
  role denial, queue filtering/sorting, customer data privacy, workflow
  invalidation, historical credits and transaction rollback are exercised.
- A negative cross-client mutation failed the fixed benchmark, showing that its
  behavior checks can reject a semantically wrong low-query candidate.
- Advisory-lock and actual reminder-method probes passed their reproduction
  assertions; their fixtures and outbox rows were rolled back. No email was sent.

Evidence: `integration.log`, `typecheck.log`, `review-probes.json`, experiment
ledgers, snapshot hashes and each run's logs/benchmark-results.json.
The reminder probe calls the actual service on real tables inside one outer
rollback transaction, adapting only transaction entry; it does not exercise
normal job scheduling, separate production commits or delivery providers.

There is no independently labeled, held-out review benchmark in this study, so
Khuket's review accuracy/false-positive rate was not measured or tuned. The
negative mutation validates the task evaluator, not the reviewer's general skill.

## Research provenance and next actions

OpenCLI's browser connection was unavailable; agent-reach's GitHub CLI fetched
Prisma's official `insensitive_scalar_filter` implementation at
`query-compiler/query-builders/sql-query-builder/src/filter/visitor.rs`, blob
`366f89e36d3850222a51921fa17adebd8ad66d3a`. It uses PostgreSQL ILIKE for insensitive
equality. That fetched source was main, not a verified 7.10.0 tag; the installed
7.10.0 behavior was therefore checked directly by differential database tests.
https://github.com/prisma/prisma-engines/blob/main/query-compiler/query-builders/sql-query-builder/src/filter/visitor.rs

Next: address reminder traversal with a 501+task coverage regression; then test
mixed payment/record/reminder writes and 100 SSE sessions against the documented
20-request/second target. Retain the shared lock until scoped alternatives prove
the same integrity behavior. This study does not certify overall scalability.
