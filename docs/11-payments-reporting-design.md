# 11 — Payments & Reporting Design

The active payment implementation is in `apps/api-ts/src/finance/`; reporting is in
`apps/api-ts/src/reports/`. The source of truth for fields and relations is the Prisma
schema in `apps/api-ts/prisma/schema.prisma`, with validation in `packages/contracts/`.

## Payment lifecycle

Staff record externally made payments through `POST /api/payments`. Claims remain pending
until Finance verifies them through `POST /api/payments/:id/verify`. Rejection and requests
for clarification keep the claim out of the verified total. Corrections and adjustments use
captured versions, transactions and audits; a previously verified record is not silently overwritten.

Only verified payments affect the derived balance: `total_due - verified_paid`.
Money uses decimal database types and explicit rounding. Do not store a mutable paid balance,
dual-write financial records, or permit the UI to authorize verification.

Private payment proofs are uploaded through the API. File authorization is checked when the
proof is read. Proofs, reference numbers and customer identity are excluded from aggregate exports.

## Reporting

NestJS report queries enforce role and field scope before aggregation, export and snapshot
creation. Collection totals use verified payments. Reconciliation exceptions and adjustments
retain actor, reason and record version. CSV/XLSX exports use the active filters and permission scope.

Statements of Account and Payment Confirmations are operational documents, never official
BIR invoices. They must carry the required boundary flag. Human business acceptance of fields,
formats and reconciliation remains separate from automated checks.

## Evidence

See [39-reconciliation-reports.md](39-reconciliation-reports.md),
[40-payment-adjustments.md](40-payment-adjustments.md), the finance/report integration tests,
and [BUILD_STATUS.md](BUILD_STATUS.md) for acceptance work.
