# Fresh Phones PH

Integrated web system and portal for Fresh Phones PH's Paluwagan operations. The product
centralizes batches, clients, externally made payment records, Finance verification, customer
status, tasks and KPI review, reporting, support, recruitment, agent verification, and
notifications.

The stack uses TypeScript across these deployables:

- `apps/landing`: public Next.js 16 and React 19 site dedicated to Vercel
- `apps/web`: login, staff system and customer portal on Render
- NestJS REST API and background worker on Render
- Prisma migrations with Neon PostgreSQL; local PostgreSQL for development
- Better Auth sessions and MFA
- private S3-compatible storage; production provider selection pending
- Resend transactional email
- Redis Streams, BullMQ workers and shared abuse limits with PostgreSQL fallback

`apps/api-ts/` is the sole backend. Its Prisma schema and committed SQL migrations own the
database structure; `packages/contracts/` supplies shared API validation and types.

## Start here

**Current presentation deployment:** use Vercel with **Root Directory `apps/web`**.
The included configuration enables a read-only demo with fictional sample data and
role selection, without a database or API. Follow [the Vercel presentation guide](docs/57-vercel-presentation.md).

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

For one-click role previews, use a local database whose name ends in `_preview`, set the same
server-only `LOCAL_DEMO_PASSWORD` in both service env files, apply migrations, and run
`pnpm --filter @fresh/api-ts seed:demo`. All 11 roles are available on `/login` during development.

### Protected web preview on Linux

Run `bash scripts/dev-web-safe.sh --hostname 127.0.0.1` from the repository root
to preview the web app without starting the API or infrastructure. The equivalent workspace
command is `pnpm --filter @fresh/web dev:safe --hostname 127.0.0.1`.
This requires a systemd user manager and caps the complete preview process tree at 3 GiB
of memory, no swap, 1.5 CPU cores, and 128 tasks. Stop it with Ctrl+C or
`systemctl --user stop freshphones-web-preview.scope`.

Development uses Webpack because the local Turbopack landing-page compilation failed to
complete and exhausted task limits in protected reproduction runs on Node 26.8.2 with
Next.js 16.2.9. The same page returned HTTP 200 with Webpack under the same resource caps.
Phosphor package imports are optimized to avoid loading unused icons. Production still
uses `next build`. The exact internal cause of Turbopack's worker growth remains
unconfirmed; do not retry it without process-tree resource limits.

## Landing site and system deployments

The system, API and worker target Render; the public landing site stays on Vercel.
See [the Render deployment guide](docs/56-render-deployment.md) for service settings,
environment variables and the remaining production blockers.

Deploy **`apps/landing`** as the Vercel project root, with the Next.js preset and
`pnpm build` as the build command. Enable access to files outside the root directory:
this workspace reuses public presentation components from `apps/web` and the shared
contracts package. Install dependencies from the monorepo workspace. Do not deploy
`apps/web` to the landing Vercel project.

The landing app has its own route tree: `/`, `/about`, `/careers`, `/careers/apply`,
`/verify`, `/support`, `/privacy` and its notices, and `/terms`. Login, password recovery,
MFA, demo login, `/system/*` and `/portal/*` are absent and return 404. The system app
stays in `apps/web`; its root redirects to `/login`.

Set `NEXT_PUBLIC_API_URL` on the landing deployment to the separately hosted API for
careers, applications and public agent verification. Allow the landing origin in the
API's existing CORS configuration. The home page itself needs no API.

When the system has a URL, set `NEXT_PUBLIC_SYSTEM_URL` on the landing project (origin
only, without `/login`) and rebuild. This connects the Login Portal button and
customer support links to that host. The login button stays visible while the URL is
pending, with navigation disabled; customer portal support links remain hidden. Set
`NEXT_PUBLIC_LANDING_URL` on the system deployment for the login page's website links.
Local defaults are landing on port 3001 and system on port 3000.

For a protected local landing preview:

```bash
pnpm --filter @fresh/landing dev:safe --hostname 127.0.0.1
```

The command copies shared public assets, then starts Webpack with the same Linux
resource caps as the system preview. Stop with Ctrl+C or
`systemctl --user stop freshphones-landing-preview.scope`. Public assets remain authored
in `apps/web/public`; the landing copy is generated and ignored by Git. Use
`pnpm --filter @fresh/landing build` for a separate production build.
