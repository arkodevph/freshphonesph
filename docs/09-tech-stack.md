# 09 - Tech Stack (Decided)

**Decision:** use TypeScript for both the web frontend and backend API. The Full Scope v6
baseline uses Next.js on a Fresh Phones PH-controlled VPS and a separate NestJS API on Railway.
The settled architecture and pending VPS choices are recorded in
[20-v6-architecture-decision.md](20-v6-architecture-decision.md).

The current Django API remains a behavioral baseline during migration. New backend features
belong in the TypeScript service unless a short-lived Django change is required to keep the
baseline usable and is explicitly approved.

## Frontend - `apps/web` (VPS)

| Concern | Target | Notes |
|---|---|---|
| Framework | Next.js 16 App Router, deployed as a Node.js service | Public website, customer portal, and staff system |
| Language | TypeScript | Strict mode; no untyped API payloads |
| UI | React 19 and Tailwind CSS v4 | Follow current repository styling and components |
| Icons | Phosphor | Already used by the application |
| Server state | TanStack Query | Add when API migration work needs cache and mutation handling |
| Validation/contracts | Zod plus generated/shared API types | Client validation improves UX; the API remains authoritative |
| Authentication UX | Better Auth API facade | API authenticates Better Auth sessions and enforces current business permissions; local migration implemented; production cutover pending |

Before changing Next.js configuration or framework conventions, read the installed guides in
`node_modules/next/dist/docs/`; this repository uses Next.js 16.

## Backend - `apps/api-ts` during migration (Railway)

| Concern | Target | Notes |
|---|---|---|
| Runtime | Supported Node.js LTS | Pin the deployed major version in repository and Railway settings |
| Language | TypeScript | Strict mode |
| Framework | NestJS REST API | Module boundaries map to the business domains |
| Database | Neon PostgreSQL | System of record |
| ORM/migrations | Prisma | Decimal money types and committed migrations |
| Authentication | Better Auth + Prisma integration | Account/session/recovery migration and TOTP/recovery codes implemented locally; see docs/52-authentication-mfa.md |
| Authorization | Permission decorators and NestJS guards | Server-side enforcement on every protected route |
| Validation | NestJS DTO validation and explicit domain checks | Reject malformed data before service writes |
| API reference | OpenAPI through `@nestjs/swagger` | Source for typed clients and endpoint review |
| File storage | AWS S3 client against private object storage (provider pending) | Private buckets and short-lived signed URLs |
| Email | Resend | Sent by backend services after committed events |
| Live events | Redis Streams + authenticated SSE | Committed PostgreSQL outbox, shared reader per API replica, current permission checks and reconnect snapshots |
| Background jobs | Separate BullMQ worker process | Durable notification/reminder outboxes and already authorized private file cleanup; see docs/53-redis-events-workers.md |
| Server | NestJS HTTP adapter on Railway | Keep business rules out of the web client |

Controllers parse requests and call services. Services own writes, transactions, state
transitions, and audit events. Query functions/selectors own role-scoped reads. Prisma is the
only schema and migration owner after cutover.

## Domain layout

```text
apps/api-ts/src/
  auth/             # Better Auth sessions, MFA, role and permission guards
  batches/          # Paluwagan batches and schedules
  clients/          # client records and portal linkage
  documents/        # requirements and private document metadata
  payments/         # external-payment recording and Finance verification
  tasks/            # tasks, deadlines, objective late flag
  kpi/              # human-entered review workflow
  reports/          # authorized summaries and exports
  support/          # customer service cases
  recruitment/      # careers and applicant review
  agents/           # internal agents and limited public verification
  notifications/    # in-app and email delivery
  ai/               # assistive-only layer, added last
  audit/             # sensitive action history
  storage/           # signed private-file access
  common/            # configuration, validation, errors, test helpers
  prisma/            # schema, migrations, seed data
```

One module owns each domain. Cross-module writes use explicit service interfaces and a database
transaction where consistency matters. Payment verification must not depend on a client-side
sequence or a mutable balance column.

## Database and storage

- PostgreSQL is the source of truth.
- Prisma migrations own the TypeScript target schema.
- Monetary values use PostgreSQL/Prisma decimal types, never JavaScript floating-point math.
- `remaining_balance` is computed from contract total minus verified payment sum.
- Private files use opaque object keys; the API authorizes every signed URL request.
- Redis was reaffirmed for live events and workers on 2026-10-09. Redis Streams and BullMQ
  now use committed PostgreSQL events/outboxes as their recovery source. Reconnecting
  screens refetch authorized records; financial truth stays in PostgreSQL. Distributed
  rate limiting and production Redis provisioning remain open.

## Hosting and infrastructure

| Service | Role |
|---|---|
| VPS | Next.js web application |
| Railway | NestJS API |
| Neon | PostgreSQL; plan and recovery settings pending |
| Better Auth | Implemented in NestJS locally; production rollout pending |
| Private object storage | S3-compatible provider to be selected |
| Resend | Transactional email |
| Cloudflare | Domain, DNS, and optional edge controls |
| Redis | Streams/BullMQ implemented locally; client-owned production instance pending |

Fresh Phones PH owns and pays for production accounts. Developers receive the minimum access
needed to build and maintain the system. The VPS provider, deployment method, and production
region are not yet selected and must be decided before provisioning.

## Monorepo tooling

- pnpm workspaces and Turborepo
- ESLint and Prettier for TypeScript
- Prisma CLI for schema and migrations
- environment validation at API startup
- Docker Compose for local PostgreSQL, MinIO, and MailHog
- optional `packages/contracts` only when shared generated or Zod contracts remove real
  duplication between web and API

## Testing

| Layer | Evidence |
|---|---|
| Domain services | Unit tests for state transitions, calculations, and policy rules |
| API | NestJS integration tests with a real test PostgreSQL database |
| Authorization | Endpoint-by-role allow/deny matrix |
| Web | Component tests for role states and error paths |
| End to end | Browser journeys for staff, Finance, customer, HR/KPI, CS, recruitment, and public users |
| Migration parity | Equivalent Django and NestJS contract fixtures until each slice cuts over |

Payment tests must include pending, verified, rejected, needs-clarification, repeated decision,
concurrent decision, partial payment, overpayment, proof access, statement, confirmation,
notification, and audit behavior.

## Migration rule

Build NestJS beside Django under `apps/api-ts/`. Port one complete vertical slice at a time,
keep stable REST paths where practical, and switch traffic only after parity and reconciliation
tests pass. Do not dual-write money records. Remove Django only after every required scope row
has a TypeScript owner and accepted evidence.

See [17-full-scope-workflow.md](17-full-scope-workflow.md) for gates and
[18-scope-traceability-matrix.md](18-scope-traceability-matrix.md) for coverage.
