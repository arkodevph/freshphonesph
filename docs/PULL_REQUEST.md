# PR review guide — NestJS API and Next.js system

The project has one NestJS/Prisma backend in `apps/api-ts/` and a Next.js frontend in
`apps/web/`. Shared role, validation and business contracts live in `packages/contracts/`.
See [BUILD_STATUS.md](BUILD_STATUS.md) for implemented scope and remaining acceptance work.

## Review and validation

- Install dependencies, configure service env files and apply committed Prisma migrations.
- Run `pnpm typecheck`, `pnpm test:api-ts` and `pnpm --filter @fresh/web test`.
- Run PostgreSQL integration tests against a separate test database.
- Check the role matrix, customer/handler record scope, private-file access and audit evidence.
- Exercise record creation, payment recording and Finance verification, balance reads,
  support conversations, reports/exports and public agent verification.
- Confirm verified-only money, BIR boundaries and human-only HR decisions.

Account and MFA provisioning remain explicit. Deployment, client policy approval and named UAT must
have their own evidence before release.
