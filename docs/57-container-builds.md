# Production container builds

Build from the repository root. Both images use Node 22 and separate builder/runtime
stages. This workspace uses pnpm and `workspace:*` dependencies, so installations use
the frozen pnpm lockfile rather than npm commands or a new package lock.

```bash
docker build -f apps/api-ts/Dockerfile -t freshphones-api .
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://app.example.com \
  -t freshphones-web .
```

Set `NEXT_PUBLIC_API_URL` to the browser-accessible API origin or same-origin gateway.
Public Next.js variables are fixed at build time; changing the runtime environment does
not rebuild browser code. Next.js also downloads the configured Google font during build.

The API builder compiles shared contracts, generates Prisma using a placeholder URL,
compiles the API and deploys production dependencies into an isolated directory. Package
file lists include only compiled output and the receipt OCR helper/templates. The runtime
copies that output, not the workspace, build tools, dependency store or tests. Python,
Pillow and Tesseract remain installed because receipt scanning needs them. The same image
runs the background worker with `node dist/worker.js` as its command.

The web runtime copies Next.js standalone output, static assets and public assets. It
does not reinstall dependencies or copy the full source tree. Both containers run as the
existing `node` user. The root `.dockerignore` excludes local databases, dependencies,
build output, tests, logs and environment files from the build context.

Supply API environment configuration and secrets at runtime using your deployment
platform. Building the runtime image does not connect to the database or apply migrations.
When a migration release is approved, use the separate migration target with the real
database URL supplied at runtime:

```bash
docker build --target migrations -f apps/api-ts/Dockerfile -t freshphones-migrations .
docker run --rm --env-file /path/to/private/api.env freshphones-migrations
```

Apply the documented migration-history reconciliation before upgrading databases that
already recorded the conflicting September migrations.

## Run the real production services together

`docker-compose.production.yml` connects the prebuilt Next.js web image to the
NestJS API and its separate worker. This configuration does not use presentation
records or development servers. The web Docker build explicitly disables
`NEXT_PUBLIC_PRESENTATION_MODE`.

Copy `deploy/production.env.example` to the ignored root `.env.production` and
replace its placeholders with the intended production service configuration.
Use the real HTTPS system origin for `WEB_ORIGIN` and the matching
`BETTER_AUTH_URL` ending in `/api/auth`. The browser talks to that origin;
Next.js forwards `/api/*` to `http://api:4100` inside the Compose network.
Only API/worker receive the private environment file. The API is not published
directly on the host.

```bash
pnpm production:config
pnpm production:build
```

The public HTTPS gateway must forward to the loopback-only web listener
(`127.0.0.1:3000` by default). Configure TLS, streaming, upload limits and trusted
proxy handling for the actual host. Keep these processes running on a host that
does not suspend idle application services; a prebuilt image removes development
compilation, but cannot prevent hosting suspension or database wake-up delays.
This Compose file does not provision a gateway, PostgreSQL, Redis, S3 or email.

After confirming the intended database, backup and approved release, apply the
committed migrations explicitly:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml \
  --profile migrate build migrate
docker compose --env-file .env.production -f docker-compose.production.yml \
  --profile migrate run --rm migrate
pnpm production:start
```

Starting the stack does not automatically apply migrations. `production:start`
uses `up -d --wait`; the web and worker wait for a healthy API. API and web have
HTTP health checks, processes restart unless deliberately stopped, and shutdown
allows 30 seconds for NestJS hooks. The worker uses the API runtime image with
`node dist/worker.js`; verify `/api/health/redis` through the web gateway to check
Redis and the worker heartbeat, then perform the authenticated release checks.
A running worker container alone is not an end-to-end delivery check.

Stop application services without deleting data with `pnpm production:stop`.
All production build arguments are fixed when the image is built; rebuild the web
image when its origins change. Run the Compose wiring checks without creating
services using `node --test scripts/production-config.test.mjs`.

### Current readiness boundary

The API deliberately refuses `NODE_ENV=production` while the four legal documents
in `packages/contracts/src/legal.ts` remain drafts. Business-approved text,
versions and publication dates are required. Do not mark drafts published just
to start the service. Production also needs a real database, generated Better Auth
secret, MFA, authenticated Redis, verified email sender/key and private S3 storage.
The development `.env` and demo-account seeder are not production credentials or
an account-provisioning plan.

Use [the Render release checklist](56-render-deployment.md) and existing launch
acceptance documents for cookie/MFA checks, account provisioning, file access,
worker delivery, backup/restore and named business acceptance. Container wiring
and image builds alone do not establish readiness for customer data.
