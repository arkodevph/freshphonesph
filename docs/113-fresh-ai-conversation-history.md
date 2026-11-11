# Fresh AI conversation persistence and caching

Fresh AI previously kept exchanges only in React state. A browser replay answered a question, reloaded `/system/assistant`, and failed because the answer disappeared. There were no history reads/writes to restore it.

Conversations now belong to an account and are stored in PostgreSQL. The rail reopens saved chats; a mobile selector supplies the same operation. New conversation retains earlier chats. Drafts, reporting-context choice, completed replies and partial/interrupted replies restore. Interrupted responses never restore an endless spinner, and interrupted action confirmations direct the user to check the record.

## Rules from the user's brain studies

Read through `brain query` / `brain source` and the actual notes:

- `02-Studies/distributed-systems/backend-scaling-deep-dive/01-caching/cache-layers-and-invalidation.md`: cache-aside, authoritative database, schema-versioned/user-scoped keys, TTL jitter, validation, coalescing, the stale-fill timeline, bounded memory and metrics.
- `02-Studies/distributed-systems/backend-scaling-deep-dive/01-caching/http-cdn-and-edge-caching.md`: personalized content must not enter a public cache, and authorization-dependent variants must be separated.
- `00-Inbox/second-brain-sessions/qwen-kb-freshphones-939243/2026-10-29-freshphones-cache-learning-analysis.md`: authorization precedes cache hits, next reads must see committed changes, TTL plus deletion alone does not solve stale fills, failures need bounded fallback. Conversation history is separate from caching authorization or current financial balances.

## Data and request flow

`AssistantConversation` stores UUID, account UUID, title, revision, JSON state, creation and update timestamps. The migration is `20261106110000_assistant_conversations` and was applied only to the guarded local preview and dedicated local test databases.

The new controller supplies list/get/put/delete under `/api/assistant/conversations`. Existing session, legal, permission and browser-write controls apply. REPORT_VIEW plus Owner/CEO role is required. Every query filters by account; writes also carry an account ID checked against the current authenticated account, so a queued request from before account switching cannot populate another account. A deleted conversation cannot be recreated by a queued revision update.

Writes commit first in PostgreSQL. Updates require the previous revision and increment it atomically. Concurrent tabs receive 409 rather than overwrite each other; the UI keeps unsaved text and offers retry or an explicit choice to use the saved version. Browser saves are serialized per account, checkpoint a question before generation, checkpoint a complete reply, debounce other changes, and flush when switching/leaving. Small writes use keepalive, which is best effort rather than a durable offline queue. A save is acknowledged only by the API; failed writes remain visible and retryable.

The JSON request limit is 512 KiB; other endpoints retain their own validation bounds. Conversation state validates a maximum of 200 exchanges and 500,000 serialized UTF-8 bytes, including reply structure, actions, links and displayed report fields. At capacity the API rejects the save explicitly instead of silently dropping older exchanges. Start another conversation; if an unsaved over-capacity edit prevents saving, the explicit saved-version recovery restores the last committed state. The current list shows the 100 most recently updated conversations.

A per-account, versioned sessionStorage selection cache stores only the active conversation UUID (or new-chat selection), expiring after one day. It never stores auth credentials or transcript bodies. Actual history is loaded from the authorized API, including after a reload or in another browser.

## Cache contract

1. Authenticate and check executive access. Read owned conversation metadata and current revision from PostgreSQL **before** every payload-cache lookup.
2. Key: `<namespace>:assistant:v1:user:<account UUID>:conversation:<UUID>:revision:<revision>`.
3. On a hit, validate JSON with the shared state schema. Discard malformed entries and load from PostgreSQL. Database errors and missing conversations are never cached as empty history.
4. Coalesce concurrent payload misses per immutable revision key. A writer creates a new revision; a late reader can populate only the old key, so it cannot poison the next read after commit. Deletion/ownership/authorization remain gated by the database and guard.
5. Local fallback: at most 16 entries, 27–33 second TTL. At most 8 MB serialized UTF-8 payloads plus JavaScript/runtime overhead. Expired entries and oldest entries are removed.
6. Optional shared Redis: 270–330 second TTL, 150 ms per connect/command timeout, no offline command queue and no request retries. Cache failure falls back to the local cache or PostgreSQL. Redis is not required for durability. The active preview has no Redis URL and uses bounded process memory.
7. Counters: hit, miss, invalid, fallback and coalesced. No claimed production latency or load improvement: actual traffic remains unmeasured.
8. History HTTP responses use `Cache-Control: private, no-store`; public/CDN caches remain disabled.

## Local API port correction

The previous preview rebuild used the script default API URL at port 4100 while the existing API service listened on 4101. `preview-local-safe.sh` now selects the local `.env.preview` if present, applies the same database/credential guard, and derives its default browser API URL from the selected API environment's PORT. Explicit overrides remain supported. A temporary loopback forward restored access during the fix and is removed after the final direct-4101 preview check.

## Evidence

- Red replay: `.local/assistant-history/reproduce.cjs` originally failed `Fresh AI loses the saved answer after reload`; after implementation it passes.
- Dedicated PostgreSQL integration suite: `apps/api-ts/test/assistant-conversations.integration.test.ts`. Covers durable reopen, user/role isolation, optimistic concurrent writes, no resurrection, >100 KiB transcripts, malformed/oversized states, Redis outage fallback, genuine Redis-protocol cache tests against isolated local Valkey, stale-fill race, request coalescing, local-cache capacity/expiry and database errors not cached. Shared-cache test is optional when TEST_REDIS_URL is absent; all six tests were run with it configured.
- Browser fixture suite: `.local/assistant-history/browser.cjs`. All 11 checks pass on the optimized preview at port 3000, with requests targeting API port 4101. Covers reload, new chat/history selection, reloading an older selected chat on desktop and mobile, navigation retaining selection, draft recovery, interrupted partials, account isolation, failed saves/retry, stale-tab recovery and mobile history. Fixtures never write business records. Results: `.local/assistant-history/browser-checks.json` and `/tmp/assistant-history-browser-preview-final.log`.
- Final live-preview smoke check passes: local CEO login, authorized conversation-list loading directly from port 4101, `private, no-store` responses, enabled composer and no page errors. The temporary port-4100 forward was stopped; port 3000 now serves the completed `.next-preview-b` build. No business records were changed by this smoke check.
- Original assistant API tests and the web test suite pass. Source type, formatting, credential and optimized-preview checks are recorded in `/tmp/assistant-history-*` and `/tmp/assistant-*-types-*.log`.
- Source/evidence remains local; no production database migration, push or deployment is implied. Offline loss before an unacknowledged write, physical-device behavior and production/multi-instance load remain unverified.
