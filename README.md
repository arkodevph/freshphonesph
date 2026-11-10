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

## Real production runtime

Use the built Next.js web app with the NestJS API and worker through
`docker-compose.production.yml`. Configure `.env.production` from
`deploy/production.env.example`, then run `pnpm production:config` and
`pnpm production:build`. See [production startup and current blockers](docs/57-container-builds.md#run-the-real-production-services-together)
for the explicit migration step, HTTPS gateway, startup and readiness checks.
This runtime disables fictional presentation data. Current legal drafts and
production-service configuration still block a real customer release.

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

For fast browsing with fictional, read-only data, use the prebuilt presentation:

```bash
pnpm --filter @fresh/web preview
```

This builds all pages once with Webpack and starts the standalone server at
`http://localhost:3000`. It requires no API or database and performs no deployment.
The build and server run within a 4 GiB memory / 2 CPU resource limit. Stop with
Ctrl+C or `systemctl --user stop freshphones-web-presentation.scope`.
An optional port can be supplied, for example `pnpm --filter @fresh/web preview 3002`.
Restart this command after changing source files to rebuild the presentation.

For live code editing, use the development server below; its first visit to each
page is slower because Next.js compiles that page on demand.

Run `bash scripts/dev-web-safe.sh --hostname 127.0.0.1` from the repository root
to preview the web app without starting the API or infrastructure. The equivalent workspace
command is `pnpm --filter @fresh/web dev:safe --hostname 127.0.0.1`.
This requires a systemd user manager and caps the complete preview process tree at 3 GiB
of memory, no swap, 1.5 CPU cores, and 128 tasks. Stop it with Ctrl+C or
`systemctl --user stop freshphones-web-preview.scope`.

The web preview allows a 2 GiB Node heap within that 3 GiB process-tree limit.
It keeps the 20 most recently visited routes ready, retains other inactive entries
for ten minutes, and enables development-only Webpack memory optimizations. This
reduces repeated compilation when switching between workspace pages. A route's
first visit after startup can still require compilation.

Development uses Webpack because the local Turbopack landing-page compilation failed to
complete and exhausted task limits in protected reproduction runs on Node 26.8.2 with
Next.js 16.2.9. The same page returned HTTP 200 with Webpack under the same resource caps.
Phosphor package imports are optimized to avoid loading unused icons. Production still
uses `next build`. The exact internal cause of Turbopack's worker growth remains
unconfirmed; do not retry it without process-tree resource limits.

### Fast local demo preview

The local demo runs prebuilt pages to avoid development compilation during a
walkthrough. Build once, then start the two apps in separate terminals:

```bash
pnpm --filter @fresh/web preview:build
pnpm --filter @fresh/landing preview:build
pnpm --filter @fresh/web preview:local       # localhost:3000
pnpm --filter @fresh/landing preview:local   # localhost:3001
```

Keep the development API and worker running as described above. The protected
preview binds to loopback and uses the same memory, CPU and task limits as the
development preview. The web command checks for the private local demo helper,
its server-only credential and a local database ending in `_preview`. Its explicit
local-preview flags retain the workspace buttons; normal deployment builds keep
their usual login behavior. The ignored helper accepts loopback hosts only.

Source edits require a new `preview:build`; restarting an unchanged preview only
requires `preview:local`. Stop these servers with
`systemctl --user stop freshphones-web-preview.scope freshphones-landing-preview.scope`.

## Landing site and system deployments

For the combined Vercel presentation, deploy **`apps/web`** with the Next.js preset
and its checked-in `vercel.json` commands. Enable access to source files outside
the root directory. This includes the landing page at `/`, login at `/login`, staff
workspaces at `/system/*` and the customer portal at `/portal/*` on one domain.
See [the Vercel presentation guide](docs/57-vercel-presentation.md). Login and
website links stay on this origin without separate landing/system URL settings.

For a real backend deployment, the system, API and worker can target Render.
See [the Render deployment guide](docs/56-render-deployment.md) for service settings,
environment variables and the remaining production blockers.

For an optional standalone public site, deploy **`apps/landing`** as the Vercel
project root, with the Next.js preset and `pnpm build` as the build command.
Enable access to files outside the root directory:
this workspace reuses public presentation components from `apps/web` and the shared
contracts package. Install dependencies from the monorepo workspace.

The landing app has its own route tree: `/`, `/about`, `/careers`, `/careers/apply`,
`/verify`, `/inquire`, `/support`, `/privacy` and its notices, and `/terms`. Login, password recovery,
MFA, demo login, `/system/*` and `/portal/*` are absent and return 404. The system app
stays in `apps/web`, which also serves the landing page at its root.

Set `NEXT_PUBLIC_API_URL` on the landing deployment to the separately hosted API for
the public catalog, careers, applications and public agent verification.
Configure the landing origin with `PUBLIC_SITE_ORIGIN` on the API. It allows public-site
reads, career applications and device inquiry submissions; account and financial writes still require the
system origin and their existing authentication and permissions.

When the system has a URL, set `NEXT_PUBLIC_SYSTEM_URL` on the landing project (origin
only, without `/login`) and rebuild. This connects the Login Portal button and
customer support links to that host. The login button stays visible while the URL is
pending, with navigation disabled; customer portal support links remain hidden. The
system deployment's root serves the landing page for the login page's website
links. Local defaults are the optional standalone landing on port 3001 and the
integrated site on port 3000.

For a protected local landing preview:

```bash
pnpm --filter @fresh/landing dev:safe --hostname 127.0.0.1
```

The command copies shared public assets, then starts Webpack with the same Linux
resource caps as the system preview. Stop with Ctrl+C or
`systemctl --user stop freshphones-landing-preview.scope`. Public assets remain authored
in `apps/web/public`; the landing copy is generated and ignored by Git. Use
`pnpm --filter @fresh/landing build` for a separate production build.
