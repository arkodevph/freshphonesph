# Fresh AI with OpenRouter

For the later read-only report brief and streaming endpoint, see [109-fresh-ai-report-brief-streaming.md](109-fresh-ai-report-brief-streaming.md). The descriptions below record the original integration increment.

Fresh AI now calls OpenRouter from the NestJS API using server-only `OPENROUTER_API_KEY`. The default test model is `google/gemini-2.5-flash-lite`; override it with `OPENROUTER_MODEL`. The local preview reads its ignored private API environment. Never expose the key through a `NEXT_PUBLIC_` variable or include it in committed files, transcripts, documentation or session memory.

The existing CEO/Owner endpoint, authentication and abuse protection remain in place. Requests contain only the question, optional period label, approved product knowledge and system instructions. No database records or report figures are retrieved. Responses are limited to 700 output tokens, use a 20-second timeout, and must contain a validated JSON paragraph array. Titles, links and policy flags stay server-owned. Raw provider errors are discarded.

Without a key, the curated offline guide remains available. With a configured key, change requests also reach the model for a concise explanation and useful preparation steps. There are no execution tools: a model response never creates or changes a record. Without a key, the original offline guidance remains available. The conservative keyword matcher labels possible changes for response metadata; it does not bypass the connected model. The model may explain guidance in the user's language and must decline unrelated requests; model scope is instruction-based rather than a guarantee of model behavior.

Local verification: API and web TypeScript checks, optimized preview build, all 115 API tests using the existing PDF Python environment, and live English, Filipino and unrelated-question smoke checks. Authenticated HTTP checks cover CEO model answers, blocked changes and anonymous denial. Production deployment and live business-data tools are outside this increment.

Adapter: `apps/api-ts/src/assistant/openrouter.ts`. Tests: `apps/api-ts/test/assistant-openrouter.test.ts` and `assistant.test.ts`. Existing knowledge/permission design: [106-fresh-ai-knowledge-permissions.md](106-fresh-ai-knowledge-permissions.md).

## Conversational reply correction

Removed obsolete provider-pending text from approved knowledge and replaced the long future-tool policy prompt with instructions matching current capabilities. Greetings and identity questions receive short conversational answers. The reporting-period label no longer triggers a disclaimer in every response. Batch questions reach the model, which can explain preparation and the existing Records > New batch workflow while making clear that creation cannot happen in chat. Model answers include a Reports link only for report-related questions; greetings have no irrelevant source footer or report link.

Regression verification replays `hey`, `who are you`, and `can u add a batch?` with the user's selected period, both directly against the adapter and through authenticated CEO HTTP requests. The focused automated test verifies that a connected batch request actually invokes the model without exposing execution tools. All 116 API tests pass; TypeScript and scoped formatting checks also pass.
