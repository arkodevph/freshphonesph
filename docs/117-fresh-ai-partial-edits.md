# Fresh AI partial edits and data fetching

Fresh AI retains its existing live API reads, confirmed writes, actor/session
binding, expiry, audit and version checks. This increment improves how the model
prepares edits and interprets paginated reads; it adds no operational permissions.

## Partial edits

The model can call `propose_edit` with an allowlisted update operation and
`{ id, changes }`. The server validates the field names, reads the current record
through its normal delegated API call, preserves unrequested editable fields and
validates the complete update with the existing domain schema. It supplies the
current version itself. Unknown/protected fields, empty changes, invalid values
and unchanged results are rejected. Nested objects require a complete replacement
value rather than a speculative recursive merge.

Supported operations:

- `records.update_batch`
- `records.update_client`
- `agents.update`
- `catalog.update`
- `jobs.update`
- `support.update`

`operation_schema` documents the supported partial-edit fields. Creates, photo
removal and retention workflows retain their existing exact input schemas.
The prepared payload is stored as the normal pending action and shown in the
existing Confirm/Cancel card. No write occurs during proposal. Confirmation uses
the captured version; concurrent changes fail rather than being overwritten.
Cancellation, expiry, cross-session denial and single execution remain intact.

Examples:

- “Find batch AB-001 and prepare a change to its model.”
- “Change only this listing's description to …”
- “Close the job opening named …”
- “Update this member's phone number to …”

The assistant should search names/codes, ask which record when ambiguous, and
ask for missing values. Those conversational behaviors depend on the model;
field, permission and version enforcement is performed by the server.

## Data fetching

Live tool results retain the API data under `data`. Paginated endpoints with
`page`, `pageSize` and `total` additionally supply `pagination.nextPage` (or null).
Instructions direct the model to continue when all records are requested, avoid
calculating whole-dataset totals from one page, and disclose incomplete coverage.
The tool loop allows twelve rounds for schema lookups, searches, comparisons and
follow-up reads. The existing bounded-result/truncation limit remains; large
requests may still need narrower filters. No claim of unlimited fetching is made.

## Verification

- New partial-edit tests failed before the implementation and pass afterward.
- All 23 focused AI tests and eight PostgreSQL assistant-action integration cases
  pass in the dedicated `freshphones_assistant_test` database.
- Real confirmation updates a synthetic job while preserving description,
  location, employment type and publication. A concurrent version change rejects
  a second proposal without overwriting the intervening edit.
- API TypeScript, changed-file formatting and whitespace checks pass.
- The running port-3000 browser calls the actual API4101 and model: catalog lookup,
  exact partial-edit preview, cancellation, unchanged catalog data and normal CEO
  operational denial pass with zero page errors or failed requests.
- Inspected `.local/assistant-repair/enhanced.png`. Evidence also includes
  `enhanced.cjs` / `enhanced.json` and `/tmp/freshphones-assistant-enhance-*.log`.

The API was restarted with the updated tools. No web source/build change was
needed. The live catalog proposal was cancelled; only isolated PostgreSQL test
fixtures were edited. A test conversation remains in local CEO history. Work is
local; no commit, push or deployment. Other-browser acceptance, production load
and guaranteed model behavior across arbitrary requests remain unverified.
