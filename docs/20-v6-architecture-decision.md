# 20 - Production Architecture Decision

Updated **2026-10-09** at the user's request: the planned database is **Neon PostgreSQL**
and the planned authentication framework is **Better Auth**. This documentation decision
supersedes the Supabase database/Auth choices in the earlier v6 architecture record.
On 2026-10-09 the user explicitly reaffirmed Redis for scopes #11–12; that renewed
direction supersedes the 2026-10-08 removal of mandatory Redis. The source [Full-Scope-v6.pdf](source/Full-Scope-v6.pdf) remains the
historical scope artifact; its business requirements and safeguards still apply.

The 2026-10-08 decision changed documentation. On 2026-10-09, the local NestJS API
implemented Better Auth credentials, sessions and MFA; see [the migration runbook](52-authentication-mfa.md).
Local PostgreSQL remains the system of record. Redis Streams now distribute committed
change events, and separate BullMQ workers process durable notification/reminder outboxes
and already authorized file cleanup. See [53-redis-events-workers.md](53-redis-events-workers.md).
Neon, production storage and production Redis cutovers have not been performed.

## Settled direction

| Concern | Decision |
|---|---|
| Capacity target | 1,000 registered users, 100 concurrent active sessions, and 20 requests/second |
| Web/API boundary | Browser calls the NestJS API; Next.js owns rendering and UI |
| Web host | A Fresh Phones PH-controlled VPS hosts the Next.js application |
| API availability | Railway target remains two NestJS replicas |
| Database | Neon PostgreSQL; Prisma retains schema and migration ownership |
| Identity | Better Auth is the target authentication framework; NestJS continues enforcing business permissions from current account state |
| Email | Resend; production sender setup remains pending |
| Files | Private S3-compatible object storage; production provider remains to be selected. Local MinIO/storage remains available |
| Live updates | Authenticated SSE with committed, permission-scoped refresh events and reconnect/refetch behavior |
| Events and jobs | Redis Streams + BullMQ, reaffirmed 2026-10-09 and implemented locally; committed PostgreSQL outboxes remain the recovery source |
| Rate limits | Login/password limits remain database-backed; broader atomic Redis limits with PostgreSQL fallback and shared SSE caps are implemented locally (scope #13); production proxy/quota acceptance remains open |
| Data recovery | Neon recovery plan, retention window and restore procedure must be selected and tested; earlier Supabase backup assumptions no longer apply |

Neon provides the PostgreSQL service. Better Auth is an authentication framework with
database-backed user/session support; its Prisma adapter supports PostgreSQL. Production
object storage, event distribution and job processing are separate architecture decisions.
See [Neon overview](https://neon.com/docs/introduction),
[Better Auth introduction](https://better-auth.com/docs/introduction) and
[Better Auth Prisma adapter](https://better-auth.com/docs/adapters/prisma).

## Required behavior

- Publish minimal, authorized refresh identifiers only after a successful database commit.
- Authenticate each API/SSE connection; stop restricted delivery on expiry, logout or revocation.
- Authorize subsequent reads again; customers receive only their own permitted records.
- Preserve unsaved input and refetch authoritative data after a connection gap or return to a page.
- Keep Finance verification synchronous, atomic, audited and idempotent. Background jobs never change balances.
- Preserve existing account/client links, role grants, confidential HR approvals, audit history and private-file isolation during any migration.
- Validate Better Auth password recovery, session revocation, API/web cookie boundaries and the required MFA flow before cutover. Do not assume existing password hashes or sessions migrate unchanged.

## Open implementation and deployment decisions

1. Neon plan, region, connection/pooling configuration, capacity and recovery settings.
2. Better Auth is implemented locally with Prisma mapping and credential/MFA parity tests.
   Production gateway/cutover, named UAT, lost-factor workflow and recovery rehearsal remain open.
3. Private S3-compatible storage provider, region, access credentials and file-copy verification.
4. Provision client-owned Redis with persistence, no eviction, credentials/private networking,
   replica fan-out and worker deployments. Rehearse outage/data-loss recovery and capacity in
   staging. Shared abuse controls are implemented locally; verify the deployment proxy and quotas
   using [54-abuse-rate-limits.md](54-abuse-rate-limits.md).
5. VPS provider/operating model, optional frontend high availability and cross-service region alignment.
6. Error tracking, uptime monitoring, alert routing and revised recurring budget.

Client production services and approved privacy/retention policies are not yet available;
prepare and verify locally until they are supplied. AI remains separately deferred for funding.

## Acceptance evidence

1. Load tests meet the capacity target and an authorized second screen refreshes within five seconds.
2. Anonymous, unrelated, expired and revoked sessions receive no restricted events or records.
3. Failed, repeated and concurrent payment decisions retain correct derived balances.
4. Event/worker interruptions preserve committed records; reconnects refetch and retries avoid duplicate effects.
5. Two-replica, database-pool, private storage, deployment rollback and backup-restore tests pass in staging.
6. Neon/Better Auth migration has explicit parity and recovery evidence before production traffic moves.
