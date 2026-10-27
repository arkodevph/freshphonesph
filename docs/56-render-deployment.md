# Render system deployment

Deployment decision, 2026-10-22: host `apps/web`, the NestJS API, and the background
worker on Render. Keep `apps/landing` on Vercel. Neon remains the planned PostgreSQL
provider. Redis, private S3 storage and Resend remain required dependencies.
Older VPS/Railway references describe the previous hosting target.

Status: local deployment preparation only. No Render resources have been created,
no database migrations have been applied remotely, and no deployment is verified.

## Services

Connect the repository to Render and use the repository root as the Docker build
context for all three services. Leave Root Directory empty: both apps need the
workspace lockfile and `packages/contracts`. Place all services in the same region;
Singapore is the proposed region for the Philippine audience.

| Service | Render type | Dockerfile | Docker command | Health check |
| --- | --- | --- | --- | --- |
| System | Web Service | `apps/web/Dockerfile` | Default (`node apps/web/server.js`) | `/login` |
| API | Web Service | `apps/api-ts/Dockerfile` | Default (`node dist/main.js`) | `/api/health` |
| Worker | Background Worker | `apps/api-ts/Dockerfile` | `node dist/worker.js` | Inspect worker logs and `/api/health/redis` |

Use the final runner stage of each Dockerfile. Render supplies `PORT`; the
containers bind to `0.0.0.0`. The API image includes Python/Tesseract for receipt OCR.
Choose service plans in the dashboard after reviewing their cost and capacity;
these settings do not establish production sizing or replica acceptance.

Follow the existing feature -> staging -> main release flow. Test this setup on
staging first, and connect the production services to the reviewed `main` release.
The current local work includes uncommitted changes and is not yet a deployable
remote release. Keep automatic deployments disabled during initial provisioning.

## System environment

Set these before building the system Docker image:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Public HTTPS system origin, such as `https://system.example.com` |
| `API_PROXY_URL` | API origin, such as `https://your-api.onrender.com`; no `/api` suffix |
| `NEXT_PUBLIC_LANDING_URL` | Public HTTPS Vercel landing origin |

The system proxies `/api/*` to the API using Next.js rewrites. Browser requests
stay on the system origin so production session cookies and MFA use the expected
origin. The public API URL is a straightforward initial proxy destination; an
internal Render hostname can be used after validating the private network path.
Rebuild the system when any of these values changes: Next.js embeds the public
variables and rewrite destination at build time.

## API and worker environment

Use one Render environment group attached to the API and worker so both processes
share these values. Enter credentials in Render, outside Git.

| Variable | Required value |
| --- | --- |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `DATABASE_URL` | Production Neon PostgreSQL connection string with the provider's TLS settings |
| `WEB_ORIGIN` | Exactly the public HTTPS system origin; no trailing slash |
| `BETTER_AUTH_URL` | The same system origin followed by `/api/auth` |
| `BETTER_AUTH_SECRET` | Generated secret of at least 32 characters, shared by API and worker |
| `AUTH_REQUIRE_STAFF_MFA` | `true` |
| `REDIS_URL` | Authenticated Redis-compatible URL; use `rediss://` for a remote endpoint |
| `REDIS_NAMESPACE` | Unique environment namespace, such as `freshphones-production` |
| `RESEND_API_KEY` | Production Resend credential |
| `EMAIL_FROM` | Sender on the business's verified domain |
| `PRIVATE_STORAGE_PROVIDER` | `s3` |
| `PRIVATE_STORAGE_S3_ENDPOINT` | HTTPS S3-compatible endpoint |
| `PRIVATE_STORAGE_S3_REGION` | Bucket region |
| `PRIVATE_STORAGE_S3_BUCKET` | Private bucket name |
| `PRIVATE_STORAGE_S3_ACCESS_KEY` | Bucket access credential |
| `PRIVATE_STORAGE_S3_SECRET_KEY` | Bucket secret credential |

Redis must use persistence and `noeviction`. Render Key Value supports these
settings; enable authentication if using its internal endpoint. The application's
current private-host detection does not recognize every Render internal hostname,
so verify the exact URL against `apps/api-ts/src/config.ts` before choosing it.
An authenticated remote TLS endpoint satisfies the current URL validation.

Configure `TRUSTED_PROXY_CIDRS` only after inspecting the actual Render/Next.js
forwarding path and checking that client headers cannot spoof the source address.
Leaving it unset avoids trusting arbitrary headers but may group multiple clients
under a proxy address. Client-specific quota acceptance remains required.
Keep reminder timing unset until the business approves it. Do not copy local demo
passwords, preview database URLs or development storage settings into production.

## Database migrations

Use the existing migration stage from a secure deployment environment before
starting a new API/worker release:

```bash
docker build --target migrations -f apps/api-ts/Dockerfile -t freshphones-migrations .
docker run --rm --env DATABASE_URL freshphones-migrations
```

Supply the intended database URL privately in the calling environment. Confirm its
target and backup/restore readiness first. The final API runtime image does not
include the Prisma migration CLI or migration directory; do not configure a Render
pre-deploy command that assumes they are present. Automated migration integration
remains open. Do not use the preview demo-account seeder on production.

## Release blockers and acceptance

- `packages/contracts/src/legal.ts` still contains four draft notices/terms. The
  existing API configuration refuses production startup until the business
  approves and publishes those documents. Do not bypass that check.
- Render access, service URLs, domain choice and production credentials have not
  been established in this session. Private storage selection remains open.
- The API currently accepts only `WEB_ORIGIN` for CORS and state-changing Origin
  checks. Public Careers/Verify calls from the separate Vercel landing origin need
  a narrowly scoped public-origin integration before those features can go live.
- Verify `/api/health` through the system proxy, followed by
  `/api/health/redis` with the worker running. Test staff login/MFA, customer login,
  logout, account recovery, authenticated uploads/downloads, and streamed live
  events through Render. Inspect cookie flags, Origin forwarding, upload limits,
  stream reconnects and quota behavior. Local rewrite checks alone do not prove
  these production behaviors.
- Complete the existing named UAT, backup/restore, rollback, database-pool and
  multi-replica acceptance in the architecture/runbook documents before release.

After the system URL is accepted, set Vercel's `NEXT_PUBLIC_SYSTEM_URL` to that
origin and rebuild the landing site. This connects its Login Portal button to Render.

## Provider references

- [Render Docker deployment and build arguments](https://render.com/docs/docker)
- [Render Blueprint service configuration](https://render.com/docs/blueprint-spec)
- [Render Key Value authentication and persistence](https://render.com/docs/key-value)
