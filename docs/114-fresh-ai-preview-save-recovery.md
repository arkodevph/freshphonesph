# Fresh AI browser saves and cleared drafts

The preview review found two conversation-persistence failures that earlier
mocked browser checks did not cover.

The web calls the API on another origin and saves conversation state with `PUT`.
The API allowed only GET, POST, PATCH and OPTIONS in its CORS response. A real
browser rejected the save at preflight, showing “Failed to fetch”; direct API
requests and intercepted browser requests bypassed this failure. CORS now also
permits PUT for the existing configured browser origins. Authentication, account
ownership, role checks and revision conflict checks still govern the endpoint.
The PostgreSQL/API history suite includes a real OPTIONS preflight regression.
It failed before the policy change and passed afterward.

Once browser saves worked, clearing the only draft in a saved conversation
restored the old text after reload. The history hook skipped all empty states.
It now skips only untouched empty sessions with no pending write. Existing
conversations save their empty draft, and a clear queues behind an in-flight
first save so its eventual revision is respected. Untouched blank chats still
produce no save.

## Verification

Evidence for this review is retained under `.local/assistant-draft-recovery/`
and `/tmp/freshphones-continue-*.log`. The browser regression uses the actual
port-3000 optimized preview and API4101, without mocking saves. One scenario
delays delivery of the first real save response to test clearing during that
write. It covers draft reload, clearing/reload, untouched empty chats and mobile
clearing. It never submits a question to the AI provider or changes financial
records. Synthetic draft-only conversation records remain in the local CEO
preview account.

The dashboard and report review also reuses the existing Nami flow and Total
collections browser scripts against port3000. These verify chart geometry,
zero periods, shared scales, theme/mobile bounds, search recovery/focus,
refresh feedback, retained report dates and the assistant composer label.

Production deployment, other browser engines and Redis-backed history caching
are separate acceptance checks. This work is local and uncommitted.

## Completed verification

- 192 web tests pass. API and web TypeScript pass, as does the optimized preview
  build. Repository formatting and whitespace checks pass; the frontend secret
  check scans 384 source files with zero findings.
- History PostgreSQL/API suite: six pass and one Redis-only case is skipped.
  The preflight regression fails before the CORS fix and passes afterward.
- Five real-API browser groups pass: untouched blank chat, draft save/restore
  and clearing, clearing while the first save response is pending, mobile
  clearing/overflow, and zero failed requests/page errors. The deleted draft
  regression failed on the previous build once CORS was fixed.
- All 11 existing mocked history groups pass on the rebuilt preview, including
  account isolation, save retry, conflict recovery and interrupted responses.
  These supplement the real-API checks rather than replace them.
- Actual port3000 runs `.next-preview-a`, build
  `okpo8JWFP0D-MdPoXkVzc`, with API4101 and the existing local preview database.
  The mobile assistant screenshot was inspected; composer labels, empty draft
  and bottom navigation are visible without horizontal overflow.
- The rebuilt preview also passes the Nami dashboard/report/assistant flow
  checks and all five Total collections checks, including twelve months at
  320px. Inspected desktop chart and 320px dark dashboard captures retain the
  existing composition and signed/zero-value chart behavior.
