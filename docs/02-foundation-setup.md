# 02 — Foundation & Setup

The repository contains a Next.js web app in `apps/web/`, a NestJS API in `apps/api-ts/`,
and shared Zod contracts in `packages/contracts/`. Prisma owns the schema and migrations.

## Local setup

```bash
pnpm install
cp apps/api-ts/.env.example apps/api-ts/.env
```

Configure the local PostgreSQL connection, a generated `BETTER_AUTH_SECRET`, `WEB_ORIGIN`,
private storage and Redis settings. Set `NEXT_PUBLIC_API_URL=http://localhost:4100` in
`apps/web/.env.local`. The frontend always uses the NestJS API.

```bash
docker compose up -d
pnpm db:generate
pnpm db:migrate
```

Run these commands in separate terminals:

```bash
pnpm --filter @fresh/api-ts dev
pnpm --filter @fresh/api-ts worker:dev
pnpm --filter @fresh/web dev
```

Alternatively, `./freshphones.sh` starts local infrastructure and all three processes.
The web app is at `http://localhost:3000`; the API defaults to `http://localhost:4100`.
Verify API connectivity with `GET /api/health` and Redis/worker readiness with
`GET /api/health/redis` when Redis is configured.

## Development accounts

For one-click access to all 11 roles, configure a local preview database with a name ending
in `_preview`. Set the same generated, server-only `LOCAL_DEMO_PASSWORD` in the API and web
environment files. Apply migrations to that database, then run:

```bash
pnpm --filter @fresh/api-ts seed:demo
```

The seed is repeatable and includes a linked customer and assigned handler. Open `/login`
and choose a workspace. The shortcut creates normal Better Auth sessions and is disabled
in production. Regular account provisioning uses `POST /api/accounts`.

## Verification

```bash
pnpm typecheck
pnpm test:api-ts
pnpm --filter @fresh/web test
```

Integration tests require a separate real PostgreSQL test database; see the test scripts in
`apps/api-ts/package.json`. Receipt OCR uses Python and Tesseract independently of the API framework.

## Account ownership

Fresh Phones PH owns production domain, hosting, database, email and third-party accounts.
Production provisioning, approved content and business acceptance remain tracked in
[BUILD_STATUS.md](BUILD_STATUS.md) and [20-v6-architecture-decision.md](20-v6-architecture-decision.md).
