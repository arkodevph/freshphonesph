# Fresh AI execution and model boundaries

The dispatcher accepts only canonical operations from the actor's allowlist.
Writes additionally require the module-private confirmation capability, supplied
only after the confirmation endpoint atomically claims a pending action. The
existing session binding, expiry, audit, version and API authorization checks
remain in force. A direct dispatcher call or copied operation cannot authorize a
write.

Chat retains retention previews and proposed deletion requests for human review.
Retention approval/rejection and execution are absent from the tool registry;
humans perform those steps in the Retention workspace. Previously stored actions
for those removed operations also fail authorization before being claimed.
Catalog photo removal remains available through explicit confirmation.

Before provider calls, known credential fields are redacted recursively, including
history, tool results and error text. Known environment credentials and common
credential patterns in text are redacted. Questions containing recognized
credentials are rejected before provider access. This is best-effort minimization,
not a classifier for every possible secret. Provider authorization remains in the
server request header.

The connected agent retains its 12-round ceiling and adds a shared 90-second
abort deadline, a maximum of 24 model tool calls (including schema lookups),
30,000 UTF-8 bytes per tool result and 120,000 bytes of aggregate tool results.
Large results are labeled partial; the model is told not to calculate complete
totals from excerpts. Loopback API response consumption is capped at 1,000,000
bytes before JSON parsing. Existing provider/read timeouts and stream/input
bounds remain. Tool-call names and identifiers are bounded as well.

Verification: 31 focused assistant/guardrail tests and 9 PostgreSQL confirmation
integration cases pass, including old deletion proposals, exact-once concurrent
confirmation, revoked access, cancellation, expiry, unchanged partial-edit fields,
credential-free provider payloads, oversized response cancellation and call/data
budgets. API TypeScript and scoped formatting checks pass. No production/provider
load test or deployment was performed.
