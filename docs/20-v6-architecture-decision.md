# 20 - Full Scope v6 Architecture Decision

This record translates Full Scope v6 §§15–15.2 into the production baseline approved during
architecture review. It is a target-state decision, not evidence that every part is implemented.
The source scope is [Full-Scope-v6.pdf](source/Full-Scope-v6.pdf).

## Settled decisions

| Concern | Decision |
|---|---|
| Capacity target | 1,000 registered users, 100 concurrent active sessions, and 20 requests/second |
| Web/API boundary | The browser calls the NestJS API directly; Next.js owns rendering and UI only |
| Web host | A Fresh Phones PH-controlled VPS hosts the Node.js Next.js application |
| API availability | Railway runs two NestJS replicas from launch |
| Identity | Supabase Auth owns accounts, password recovery, sessions, and MFA; NestJS validates its JWTs and enforces business permissions |
| Database | Supabase Pro with Small compute and Supavisor pooling |
| Data recovery | Supabase Pro daily backups plus Finance reconciliation; point-in-time recovery is not in the launch budget |
| Live updates | Authenticated SSE from NestJS to the browser; Redis fans committed minimal refresh events to every API replica |
| Background work | Redis-backed workers process email, notifications, exports, document processing, reminders, and AI tasks after the request commits |
| Redis recovery | Standard Redis at launch. API/payment writes continue through a Redis outage; live screens reconnect and refetch, while workers retry queued work after recovery |

## Required behavior

- The API publishes an event only after its database transaction commits.
- An event contains only an authorized refresh identifier, never private documents, file URLs, or unnecessary personal data.
- SSE connections authenticate with a current Supabase session; revoked, expired, or logged-out sessions stop receiving events.
- The subsequent API read is authorized again. Customers can receive events for only their own records.
- Clients preserve unsaved form input, expose reconnecting/unavailable state, and refetch authoritative data after reconnecting or returning to the page.
- Payment verification stays synchronous, atomic, audited, and idempotent. Redis events and workers never change a balance.

## Deployment decisions still required

The following were intentionally not assumed and must be approved before production provisioning:

1. VPS provider, region, and operating model (Docker/Caddy, PM2/Nginx, or static export).
2. Whether the frontend needs a second VPS/load balancer for high availability.
3. Region alignment for VPS, Railway, Redis, and Supabase.
4. Error tracking, uptime monitoring, and alert-routing provider.
5. Redis high-availability/SLA level.

## Acceptance evidence

1. Load tests demonstrate the capacity target under normal and peak workflows.
2. A committed payment verification updates a second authorized screen within five seconds.
3. Cross-customer, unrelated employee, unauthenticated, expired, and revoked sessions receive no restricted event or record.
4. A Redis interruption leaves verified balances unchanged; reconnecting clients refetch current permitted data and jobs retry safely.
5. API-replica, worker, database-pool, deployment, backup-restore, and health-check failure paths are exercised in staging.
