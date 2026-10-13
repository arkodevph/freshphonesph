# Fresh Phones PH

Integrated web system and portal for Fresh Phones PH's Paluwagan operations. The product
centralizes batches, clients, externally made payment records, Finance verification, customer
status, tasks and KPI review, reporting, support, recruitment, agent verification, and
notifications.

The stack uses TypeScript for both deployables:

- Next.js 16 and React 19 web app on a client-owned VPS
- NestJS REST API on Railway
- Prisma migrations with Neon PostgreSQL; local PostgreSQL for development
- Better Auth sessions and MFA
- private S3-compatible storage; production provider selection pending
- Resend transactional email
- Redis Streams, BullMQ workers and shared abuse limits with PostgreSQL fallback

`apps/api-ts/` is the sole backend. Its Prisma schema and committed SQL migrations own the
database structure; `packages/contracts/` supplies shared API validation and types.

## Start here

- [Project documentation](docs/README.md)
- [Full Scope v5 implementation workflow](docs/17-full-scope-workflow.md)
- [Scope traceability matrix](docs/18-scope-traceability-matrix.md)
- [Implementation status](docs/BUILD_STATUS.md)
- [Contributor and AI-agent guide](AGENTS.md)
- [Branch flow: feature and fix → staging → main](docs/24-branch-flow.md)

## Non-negotiable boundaries

- Customers pay outside the website. Staff record claims; Finance verifies them.
- Only verified payments affect the derived customer balance.
- The system never computes or applies wage deductions.
- Statements and confirmations are operational documents, not official BIR invoices.
- Public agent verification exposes only name, masked code, and active status.
- Authorization is enforced by the API, not only by the interface.

## Run locally

```bash
./freshphones.sh
```

This starts the local infrastructure (including Redis), TypeScript API at
`http://localhost:4100`, separate background workers, and web app at
`http://localhost:3000`. See [AGENTS.md](AGENTS.md) for setup details and local accounts,
and [the Redis runbook](docs/53-redis-events-workers.md) for configuration and recovery.
Abuse quotas, live connection caps and trusted proxy setup are documented in
[the rate limiting runbook](docs/54-abuse-rate-limits.md).

For initial setup, install with `pnpm install`, configure `apps/api-ts/.env` from its example,
and run `pnpm db:generate` and `pnpm db:migrate`. The frontend uses
`NEXT_PUBLIC_API_URL=http://localhost:4100` in `apps/web/.env.local`.
