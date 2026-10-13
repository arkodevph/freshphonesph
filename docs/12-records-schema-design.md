# 12 — Records Schema Design

The implemented schema is `apps/api-ts/prisma/schema.prisma`. Changes require committed
Prisma SQL migrations in `apps/api-ts/prisma/migrations/` and shared-contract validation.

## Records

`Batch` owns agreed model, status, dates, price, cadence and installment count. A batch may
have an assigned handler and agent. `Client` links to its batch, requirements, schedule,
payments and optional customer account. UUIDs identify records; captured versions prevent
concurrent edits from silently replacing newer data.

Schedules use the agreed fixed-day cadence: weekly = 7 days, semimonthly = 15 days,
monthly = 30 days. Installments preserve the total, with any rounding remainder assigned
according to the tested schedule policy. Issued financial terms are locked by the API.

Requirements, private documents and review decisions retain actor, status and history.
Customer reads are limited to their own linked client; handler reads are limited to assigned
records. Sensitive changes are audited server-side.

See [03-data-model.md](03-data-model.md), [25-record-edit-history.md](25-record-edit-history.md)
and [26-batch-assignments.md](26-batch-assignments.md).
