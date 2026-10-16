# 14 — Payments & Reporting Acceptance Plan

The implementation uses NestJS, Prisma and PostgreSQL in `apps/api-ts/`, shared contracts
in `packages/contracts/`, and the Next.js interface in `apps/web/`.

1. Verify payment recording, private proof access, Finance-only verification and derived balances.
2. Verify captured-version corrections, adjustments, actor/reason audit evidence and reconciliation.
3. Verify role-scoped dashboards, collections, exceptions, CSV/XLSX exports and snapshots.
4. Have Finance accept business fields, formats, rounding and external-payment matching.
5. Record BIR document boundaries, approved policies and named user acceptance results.
6. Complete client-owned production provisioning, backup/restore, rollback and launch smoke checks.

Automated checks use the API unit and PostgreSQL integration suites plus frontend adapter
tests. A green suite establishes technical behavior; business acceptance remains explicit.
Current delivery and remaining work are in [BUILD_STATUS.md](BUILD_STATUS.md) and
[36-scope-handoff.md](36-scope-handoff.md).
