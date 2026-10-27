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
