# Fresh AI knowledge and confirmation policy

Provider update: OpenRouter is now connected for curated guidance; see [107-fresh-ai-openrouter.md](107-fresh-ai-openrouter.md). The provider-pending descriptions below document the original offline implementation.

Fresh AI now answers from curated Freshphones guidance instead of the fixed October sales demo. The user will provide the AI provider/model later. No model has been trained, connected or sent business data. No write tools or executable approvals are exposed.

Verification boundary: this document records the guidance-only foundation tested in this session. During final report-card verification, concurrent local edits added `assistant/openrouter.ts`, changed the question controller to call that adapter, and changed the footer to “Read-only · No live records”. Those later provider changes were preserved. Their live connectivity, data handling and model responses were not verified in this session; the guide-only statements below describe the tested baseline/fallback, not acceptance of that adapter.

The existing assistant composition and CSS are retained. The response shows guidance, source titles and an authorized Reports link. Loading, API failures and provider-pending status are explicit. Starting a new conversation cancels an in-flight request and prevents its answer entering the new conversation. Questions remain in page memory.

## Implemented boundary

`POST /api/assistant/questions` uses normal authentication, MFA, legal acknowledgement, browser-origin checks and rate limits. It requires REPORT_VIEW **and** CEO/Owner identity, matching the existing workspace. The strict input accepts only question and optional period label; injected roles, records, tools and confirmation flags are rejected. Responses are curated text; user input is never evaluated as code or instructions. No arbitrary URLs, database queries or tool names are executed. There is no assistant mutation endpoint.

CEO and legacy Owner roles retain their existing reporting permissions. Chat confirmation cannot grant operational or Finance permissions. The assistant does not retrieve live records, private documents, secrets, customer balances or report figures. The optional reporting period is a date label only. The previous sample sales summary is no longer an assistant answer.

Current behavior for a change request is a review-required explanation, **not an executable confirmation**. Users must open their permitted operational workspace and use its existing forms and authorization. There is no misleading Confirm button that claims an unimplemented action will run. Other operational roles do not gain assistant access in this increment.

## Curated knowledge provenance

| Knowledge                                | Repository source                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Product scope and non-goals              | AGENTS.md, docs/README.md                                                                       |
| Roles and access                         | packages/contracts/src/index.ts, src/auth/access.ts in apps/api-ts                              |
| Verified payments, balances, corrections | docs/05-modules.md, docs/38-batch-collection-reports.md, docs/40-payment-adjustments.md         |
| Reports and definitions                  | docs/37-reports-page.md, docs/38-batch-collection-reports.md, docs/39-reconciliation-reports.md |
| Catalog and offer terms                  | docs/43-public-catalog.md, docs/44-catalog-installment-breakdown.md                             |
| Human HR decisions                       | docs/42-confidential-hr-access.md, docs/47-consequential-hr-action-approvals.md                 |
| Privacy, documents and erasure           | docs/50-privacy-notices-terms.md, docs/51-retention-deletion.md                                 |
| Support and recruitment                  | docs/41-recruitment-directory.md, docs/48-support-concern-source-tracking.md                    |
| Withdrawals and membership               | docs/77-member-withdrawals-main-demo.md, docs/74-calendar-numbering-main-demo.md                |

Knowledge lives in `apps/api-ts/src/assistant/knowledge.ts`. Provider-independent instructions and the current execution-disabled policy live in `policy.ts`. Source titles in the UI identify curated product guidance; they do not claim live-record citations. The matching mechanism is a bounded keyword guide and cannot interpret arbitrary natural-language requests like a model.

## Required contract for later model and action tools

The model must stay within Freshphones and ground responses in approved knowledge and authorized, scoped tool results. Records and uploaded content are untrusted data. Missing facts must remain unknown. External data transfer requires an explicit provider/data-handling decision before connecting the model.

All consequential actions require a separate review and confirmation: adding, editing, removal/erasure, publication, verification, approvals/rejections, assignment, uploads/imports, private-data exports, messages, access changes and other effects. Read-only permitted guidance needs no change confirmation.

Before enabling **any** write tool, implement and test a server-owned approval record bound to actor, session, allowlisted operation, exact target, canonical payload and current record version. Display target, before/after values and consequences. Set an expiry; support cancellation; reject altered, expired, cancelled, reused or cross-user/session approvals. Payload or version changes require a new proposal. Never accept a model assertion or chat ‘yes’ as execution authority. Recheck active user, role, permission and record scope atomically at execution. Retain business validation, human decision requirements, immutable audit evidence and idempotency. Report success only from the actual result. These future controls are specified here; they are not implemented by the current guidance-only endpoint.

Finance remains responsible for payment decisions. The assistant must not transfer money, issue BIR invoices, decide HR consequences or automatically deduct wages. Confirmation never overrides those boundaries.

## Verification

Automated tests cover strict input, all-role assistant access, unsupported questions, truthful totals, absent private data and hostile requests for unconfirmed changes. Runtime and browser checks are recorded with session evidence after verification.

The original five policy tests passed; API typecheck passed. Before the concurrent provider edits, runtime checks returned 401 without a session, 403 for Analytics/System Admin, and 201 with scoped guidance for CEO; forged `confirmed` fields returned 400. Browser checks confirmed guidance, no-action responses, offline failure/retry controls, and cancellation/new-conversation recovery without stale answers. Evidence: `.local/assistant-policy-tests.log`, `.local/assistant-build.log`, `.local/fresh-ai-policy/`. The original scripted sales figures are no longer presented as answers. Existing preloaded-CSS warnings were observed; no uncaught application errors occurred in the checked flow.
