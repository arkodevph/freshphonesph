# COO shared controls rollout

November 11, 2026. User explicitly extends [143](143-clients-controls-motion.md)
to all COO dropdowns, showing Operations monitor's native Batch menu and Clients'
expanded More filters as the motion target. Supplied references inspected:
`/tmp/codex-clipboard-LUr5uj.png`, `/tmp/codex-clipboard-L3tKK1.png`.

## Implementation

71 existing native selectors across 46 staff/shared feature files now use
WorkspaceNativeSelect. It preserves original option children, ids, refs, native
value/change/blur handlers and form validation. Only COO gets the visible shared
listbox; other roles keep the original native element and behavior. Retain disabled
choices, required state and inherited fieldset disabling. Dynamic choices preserve
the controlled value and a known selected label while choices load; unavailable
values are disabled, rather than silently showing All. Query/mutation logic and
server permissions are unchanged.

For new forms, use FormSelect directly. Both use Select and WorkspacePopover.
Menus use the browser popover top layer so they escape table/scroll clipping.
[MDN Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using)
was opened through OpenCLI and read November 11; actual Chromium `:popover-open`
state verified. Placement tracks anchor/viewport, flips above when needed and
closes if its anchor scrolls out of view. Long selected labels stay on one line
with full labels in the menu and title; menu options may wrap. Selected options
use a neutral fill/checkmark, with keyboard focus preserved.

20 existing disclosures across 16 files now use WorkspaceDetails over
AnimatedDisclosure. Preserve summary markup and native toggle handlers used for
lazy history reads. Report filter open state still follows dirty/validation changes;
GCash more-action closing is controlled explicitly instead of setting a native DOM
property behind React. Simple carets share the spring progress; structured summary
layouts retain their own markup. Existing Clients and COO action disclosures also
use the spring. Public-site and CEO-only native disclosures are outside this pass.
Shared report/detail components retain shared behavior across authorized roles.

Calendar integration uses the existing DateInput, including custom month dropdown
and nested modal focus/escape. Staff/component AST inventory finds no remaining
bare input with a literal date or datetime-local type. Dynamic question kinds and
all unrendered form variants are not established by this source inventory alone.

## Evidence

`/home/nami/.agent-reach/design-references/clients-controls-20261111/`:
`select-inventory.json`, `disclosure-inventory.json`, original inventory,
`monitor-verification.json`, `verification.json`, route audit and build/test logs.
71 is the number of migrated JSX selector sites, not 71 screens or independently
verified workflows. 20 likewise counts disclosure sites.

Optimized builds/TypeScript and 24 existing calendar, membership, record and role
checks passed before the last validation-focus polish. Operations monitor live:
five labelled shared controls, 10 Batch choices with search, Stage and Batch update
both native values and URL correctly; review-rule disclosure settles to auto height.
No rule update or record write performed. Final build and route sweep pending.

Test harness corrections: arbitrary `design` query parameters are rejected by the
monitor's strict query schema; use actual URLs/hash-only markers. Early audits
sampled document navigation before content mounted; wait for page headings. Multiple
live preview tabs delayed API loading; closing the agent's unused audit tabs restored
loads. Per-tab EventSource use is confirmed in source; the browser connection limit
was not independently profiled. No backend performance fix claimed.

## Remaining verification

Final build activation; native adapter required/disabled behavior; shared menu and
calendar regression; representative expanding sections and route sweep. Record
actual passes and inaccessible routes separately. Do not write or submit forms to
prove UI behavior. Other browsers, assistive technology and user acceptance remain
unverified.
