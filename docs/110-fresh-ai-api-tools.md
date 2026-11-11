# Fresh AI API tools

Fresh AI can retrieve authorized live data in chat and propose operational additions, edits and supported removals. This replaces the previous guidance-only capability described in documents 106–109. The screenshot's refusal came from explicit no-data/no-tools instructions, a narrow report-summary keyword branch, missing conversation history, and the earlier report-only Owner/CEO permissions. Changing prompt wording alone could not fix those missing backend capabilities.

## Access and data

Owner/CEO retains its original `REPORT_VIEW` permissions in `/auth/me`, normal APIs and portal navigation. The assistant has a separate explicit operational policy in `apps/api-ts/src/assistant/access.ts`: reports, batch/client records, agent and catalog management, task read/assign, support management, recruitment job management and retention management. This does not grant normal portal operational access. Account administration, password changes, Finance verification/payment recording, report authorship, confidential HR and KPI decisions remain excluded. Other roles still cannot use this assistant workspace.

The API registry is an explicit allowlist in `apps/api-ts/src/assistant/operations.ts`. It documents the method, path, permissions, data meaning and original Zod input contract. `GET /api/assistant/capabilities` returns the permitted operations and field schemas. The model receives only operation names/descriptions initially and can request exact schemas with `operation_schema`. `read_data` performs permitted reads; `propose_change` creates proposals. The model cannot provide arbitrary URLs, SQL, headers, cookies, roles or credentials.

Every data read and confirmed write calls the existing loopback API with the signed-in session and a random, server-issued, single-use delegation token. The token binds the actor, cookie hash, exact HTTP method/path, payload hash, allowed operation permissions and a 30-second expiry. Middleware consumes it once and creates an AsyncLocalStorage context only for that call. `allowed()` and record scopes recognize those narrowly delegated permissions only for that same actor and executive role. Normal requests, unknown/forged tokens and expired/replayed tokens receive the original role policy. Authentication, current permissions, MFA, legal acknowledgement, family/record scope, DTO validation, service reauthorization, optimistic versions and ordinary domain audit still apply. There is no administrator impersonation or direct model-to-database write. Delegation tokens and cookies never enter model context or browser responses. The server derives the loopback port from its own socket, forwards no model-controlled headers, rejects redirects and accepts JSON only.

Questions carry at most 12 recent user/assistant messages, each bounded to 6,000 characters. The latest question is limited to 2,000 characters. Prior text is context, not evidence of an executed change. Explicit periods such as “this month” take precedence over the selected date range; the model receives the current Manila date. Current figures must come from API results. The six-report visual brief remains available for general company-summary requests; specific or explicitly dated report requests use the tools.

## Confirmation and execution

A proposed change is stored as an `AssistantAction` with an immutable operation and validated payload, actor ID, SHA-256 hash of the current session ID, expiration and execution status. It expires after ten minutes. The reply includes the exact fields and a Confirm/Cancel control. Typing “yes,” forging history or adding `confirmed: true` does not execute anything.

`POST /api/assistant/actions/:id/decision` accepts only `{ "decision": "confirm" }` or `{ "decision": "cancel" }`. It rechecks executive access, actor/session binding and operation permission. A conditional database claim moves one pending unexpired proposal to executing/cancelled; duplicate requests cannot execute again. The stored payload alone is sent to the normal API. Version conflicts fail rather than overwriting newer records. Proposed, confirmed, cancelled, succeeded and failed actions create audit entries in addition to domain audit records. Financial or other consequential domain decisions remain subject to their existing separation of duties.

A failed/ambiguous execution is never retried automatically: a network failure can happen after a commit, so inspect the record before making a fresh proposal. Cancellation of text generation prevents further tool calls but does not undo an already confirmed action. Pending proposals expire if their response never reaches the browser.

## Supported data and actions

| Domain | Data available | Changes available |
| --- | --- | --- |
| Reports | Payments, collections, reconciliation, tasks, support, installment earnings, reporting batch lookup | None through the report tools |
| Records | Batch/client search, detail, membership schedule, eligible assignment IDs | Create/edit batches and memberships; use supported archive/status changes |
| Agents | Directory, exact profile and version | Add/edit/deactivate profiles |
| Catalog | Published/unpublished listings, item terms and version | Create/edit/publish/unpublish listings; remove a listing photo |
| Tasks | Scoped task lists and staff lookup | Create assigned tasks |
| Support | Support queue, case detail and messages | Create concerns; edit status, assignment and resolution |
| Recruitment | Job openings and current versions | Create/edit/close job openings; no confidential applicant decisions |
| Retention | Candidates, policy, legal holds, requests and exact deletion previews | Propose a deletion request for human review; approval/rejection and execution happen outside chat in the Retention workspace |

There is no general hard-delete endpoint for business/financial records. “Delete” uses the operation supported by the domain: photo removal, deactivation/unpublication/closure, or a retention review request. Chat cannot approve or execute retention erasure. Existing legal holds, evidence hashes, policy eligibility, backups, external-copy obligations and protected financial/audit history still apply. Arbitrary filesystem deletion, external messaging, exports, uploaded binary content, authentication secrets, account grants, Finance decisions and confidential HR records are outside this registry. New endpoints require an explicit registry entry, documented contract and tests; they do not become model tools automatically.

## Provider and streaming

The connected agent uses the existing server-side OpenRouter configuration. Live tool results and user-supplied conversation content are sent to that configured model to answer the user's question; cookies and credentials remain server-only. Tool/API text is treated as untrusted data. The loop permits at most eight model rounds and four tool calls per round, three proposals per answer, bounded argument/result size, and 30-second per-provider timeouts. Large results are explicitly marked partial with instructions to narrow filters/page. General responses continue streaming real provider text, and tool status events describe record retrieval or proposal preparation. Missing provider configuration produces an actionable connection error rather than pretending to have live access.

## Source and maintenance

- [Machine-readable operation contracts](110-assistant-api-operations.json) include fields, optional/default values, enums, limits and endpoint permissions. Original Zod refinements and service rules remain authoritative.
- [Database field dictionary](111-data-dictionary.md) covers every Prisma model and enumeration, including private storage and authentication fields that are deliberately outside tool access.
- Regenerate both artifacts with `pnpm --filter @fresh/api-ts exec tsx scripts/document-assistant.ts` after changing a contract or schema.
- Migration: `20261106080000_assistant_actions`. Deploy it before enabling this backend. No production migration or deployment is performed by this local change.
- Regression tests: `assistant-tools.test.ts`, `assistant-actions.integration.test.ts`, existing assistant/stream tests, and updated executive-role API/workspace tests. Integration tests require a dedicated migrated `TEST_DATABASE_URL` ending in `_test`.
