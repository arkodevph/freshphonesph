# 15 — Payments & Reporting Architecture

The active modules are `apps/api-ts/src/finance/`, `apps/api-ts/src/records/` and
`apps/api-ts/src/reports/`. Prisma owns schema changes; shared Zod contracts validate input.

Thin NestJS controllers call services for writes and role-scoped query functions for reads.
Services own financial state transitions, transactions, captured-version checks and audit events.
PostgreSQL enforces relational and money constraints. Aggregate queries run in the database.

Payment claims become financially effective only after Finance verification. Verification is
atomic, permission checked and audited. Private proof content requires current authorization.
Balances are derived from agreed schedules and verified payments. No payment gateway, official
BIR invoicing or system-computed salary deduction belongs in this architecture.

Report query, export and snapshot paths apply the same permission and field limits. Financial
adjustments and reconciliation retain explicit human decisions. Notifications and committed
record events use durable outboxes; configured Redis Streams/BullMQ processes consume them
without changing authorization or financial truth.

See [11-payments-reporting-design.md](11-payments-reporting-design.md),
[40-payment-adjustments.md](40-payment-adjustments.md),
[53-redis-events-workers.md](53-redis-events-workers.md) and
[54-abuse-rate-limits.md](54-abuse-rate-limits.md).
