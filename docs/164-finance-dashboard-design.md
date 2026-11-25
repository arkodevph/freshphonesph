# Finance dashboard — supplied reference

## Current direction, 22 November 2026

The user supplied `/tmp/codex-clipboard-vxB53A.png` (Finexy dashboard shown inside a laptop), then explicitly corrected: **use Baker and the FP theme, not orange**. The supplied image now controls composition; it supersedes the earlier COO-derived arrangement. Its publication date and source URL are unknown. Retained image: `/home/nami/.agent-reach/design-references/freshphones-finance-2026-11-22/user-finexy-reference.png`.

Audience: Finance staff reviewing payment evidence, external collections, approved refunds and assigned tasks. Preserve financial rules and the existing role navigation.

## Reference brief

The image's actual dashboard occupies approximately x=180–884, y=252–630 in the 1024×768 image. Measurements are image estimates, not native CSS dimensions. Its three top columns are approximately 228/228/228 image pixels with 12px gutters. A balance/action panel leads; four compact metrics form a middle 2×2; a paired-bar chart anchors the right. Beneath, a narrow support stack sits alongside a wide transaction table. Panels are white against a pale neutral canvas with small corners, compact labels, aligned figures and quiet contextual controls.

Implementation adapts this structure to Freshphones' existing 244px navigation and header; the laptop bezel and duplicate reference navigation are excluded. Use existing FP blue action, neutral surface/text/border tokens and the true-black dark canvas. Orange is explicitly excluded. Real collections replace bank balances; upstream stages replace unsupported currency wallets; approved refunds and assigned tasks replace spending limits and bank cards. Do not invent balances, payment instruments, trends or transactions.

Top grid: approximately 33%/31%/36%, 16px gutters, 20px panel insets, 14px section headings, 12px record labels, readable 26–36px primary numbers. Lower grid: 33% support stack / 67% activity table. Existing FP spring Select supplies collections period, chart months and payment status. Keep neutral selection and keyboard focus, no decorative selection edges.

Negative baseline: equally weighted repeated queue rows and duplicate ready counts made Finance's next action unclear. Replace with a blue ready metric, aligned supporting counts and real recent payments. Earlier Payno glass/translucent treatment remains a scoped negative example; no source images are used inside the application.

## Observable checks

- Render at 1440 desktop and 390/320px, light/dark; inspect full lower table and page.
- Top three-column balance/metrics/chart composition and bottom support/table structure match the reference's hierarchy in FP theme.
- Skeletons render inside the finished components, with identical panel/table geometry and directional glow wipe. No separate arbitrary placeholder cards. Identity/dynamic-role loading uses the same Finance layout.
- Independent overview/chart/activity requests; contextual errors and retry, explicit unknown values, no fake zero totals. Keep successful overview visible on period changes and refresh errors.
- Real chart endpoint `/reports/charts`; recent payments `/payments`, sorted newest first, first five returned records. Search/status filter the server result. Dates and amounts retain real meaning; pending claims are not verified collections.
- All three dropdowns: keyboard, Escape/focus return, rapid interruptions, reduced motion. Refund/task/history links, status filters, search and actual-payment navigation.
- Delayed requests: compare actual pending/loaded bounds. Check long amounts, empty records, errors/retry and no horizontal page overflow; table horizontal scrolling remains contained on phones.
- Validate exact port 3000 build and retain screenshots/build ID. Self-review is not user acceptance.

## Verification

Implementation is local. Rendered verification pending the current optimized build. Existing Finance tests previously passed 13/13; they do not establish the new composition's fidelity. Earlier screenshot/build evidence is superseded.

## Payment-page scrolling correction

User's second screenshot (`/tmp/codex-clipboard-KxOSb4.png`, retained as `user-payments-scroll.png`) is a negative reference: duplicate title/icon/subtitle, stacked queue/search/status rows and ten wide table columns push the review action out of sight. The user explicitly reports that scrolling makes this page hard to see.

Correction: remove the repeated content header; combine queue/search/date controls into a compact toolbar; use the existing spring Select for queue and status; group member+batch and reference+method+proof into six columns. Keep financial amount/adjustment context, review stage, date, direct Review/Open and row document actions. Original recorded timestamps remain in transaction details. Remove table's inner vertical height cap, retain bounded horizontal overflow only when needed, and collapse Balance lookup through the existing interruptible WorkspaceDetails. Keep external-payment and export-privacy consequences.

Checks: 1440 desktop first row and Review visible without sideways scrolling; single page vertical scroll; queue/status/search/date filters, sort/density, direct review and focus return, row documents, Balance disclosure interrupted/reduced motion, 390/320px contained table, light/dark. No Finance decisions or payments should be submitted during visual verification.

## Final rendered evidence

Optimized localhost:3000 build `7ELegp1EMnRYc4zzuVDKB` (`.next-preview-a`) passes webpack and TypeScript; edited source passes Prettier and whitespace checks; all 13 existing Finance navigation/workspace/review tests pass. Actual light/dark captures use the application's theme toggle, not only a DOM theme attribute.

Evidence directory above contains `reference-{light,dark}-{1440,390,320}.png`, bottom captures, `reference-loading-dark-1440.png`, `payments-{light,dark}-{1440,390,320}.png`, `reference-verification.json`, `reference-geometry.json` and the 320px long-amount fixture. The delayed 1440px skeleton/loaded comparison measures six finished sections: widths identical, heights differ at most 0.5px, downstream position differs at most 0.672px. Glow wipe is 1.65s; reduced-motion dropdown opens at full opacity with identity transform.

Visual comparison: the three-column top grid, four middle metrics, paired bars and lower support/activity arrangement carry the supplied composition. FP navigation, blue emphasis, financial labels and dark theme are deliberate adaptations. The reference's bank wallets, cards and unsupported income/spending claims are replaced with true Finance data. Truncated references retain full titles and open the exact payment through its supported link parameter. The chart range label is fully visible.

Payment ready queue: at 1440px, region client/scroll width are both 1084px, so all six columns fit. The table region has equal 104px client/scroll heights for the current ready row; no inner vertical scroll. The row begins around 416px, with Review visible. At 390/320px the page has no horizontal overflow; the actual data table retains contained horizontal scrolling. Density measures 52px Compact / 68px Comfortable. Review dismissal returns to its direct trigger. Queue Escape restores focus; Balance lookup survives rapid reversal and reduced motion.

Verified live behaviors: all three dashboard dropdown selections, rapid collection-dropdown reversal, reduced motion, empty search, failed overview refresh with retained figures/timestamp and successful retry, ready queue navigation, large peso amount on 320px and no page errors. Current data has no assigned tasks or outstanding refunds; populated task/refund workflows and financial submissions are not established by these checks. No financial decisions or records were submitted. User acceptance remains separate from this self-review. Changes remain local.

Additional final checks (`extra-verification.json`): delayed 390/320px overview/metrics/chart/activity bounds retain identical widths and heights within 0.063px; downstream offsets remain under 0.563px. Reduced-motion skeleton animation is `none`. Payment row menu exposes Statement of Account, View transaction and Open review workspace; Verified status selects All payments scope correctly; a nonmatching payment search shows the proper empty state. Page errors remain empty.

Brain persistence confirmed for Qwen-KB/freshphones and Baker. Audit reports zero stale sources, edge failures or generated-link failures; 58 existing unresolved source links remain elsewhere in the vault.

## COO parity correction after rejection

User rejected `/tmp/codex-clipboard-R7YuHh.png` as broken and then explicitly asked to validate **all Finance pages** against COO. The previous browser checks established behavior and overflow, not visual acceptance. Rejected details: orphaned status filter under the main row, excess framed panels, mismatched dark table material and a hover band stopping before Actions. Do not revive that arrangement.

The corresponding current COO pages are now the controlling product reference for shared shell/material, controls, tables, report presentation, task layout, loading and dialogs. The Finance dashboard retains the user-supplied composition in FP theme; Finance permissions, available actions, refund scope and URL restoration are preserved. Captured before comparisons for all ten routes at1705×933 in `/home/nami/.agent-reach/design-references/finance-coo-parity-20261122/` (audit.json, COO-*.png and FINANCE_OFFICER-*.png). The rejected screenshot's web viewport is approximately1705×933 after excluding native browser chrome; exact outer-display scaling remains an estimate.

Audit and corrections: restore COO shell eyebrow, current modal material and workspace search focus treatment; retain dedicated Finance table geometry so density controls work. Port COO Records table/disclosure, Client Records table/schedule loading, Notification list loading, and Withdrawal request-card loading. Finance Tasks uses the COO management composition with Finance wording and the existing server-scoped tasks/assignees/permissions. Finance Reports enables the same overview/charts and minimal heading for its already-allowed financial report families; its Finance query restoration stays intact. GCash presentation already matches apart from formatting and necessary Finance link/version behavior. Ready for Finance removes its duplicate wrapper title while retaining its own eligible-payment queue.

Payments now uses one aligned queue/status/search/date toolbar, one table surface in COO colors, an uninterrupted hover fill including Actions, and two secondary disclosures side by side. Export consequences remain beside the result count/actions. No backend authorization or financial calculations changed.

Validation contract: all ten routes at1705/390/320, light/dark, real theme toggles, page overflow and nested scroll checks; corresponding COO visual comparisons, actual record/card/table loading, filter menus/keyboard/reversal/reduced motion, task assignment and read-only detail dialogs, GCash detail, report views, and review focus return. No financial or task mutations submitted. Final build and after captures pending.

Source checks:41 targeted Finance/report/record/withdrawal/workspace tests pass. Existing global role-isolation test fails first in unchanged CEO ReportVisuals importing a shared Reports design; do not call that repository-wide check green or alter unrelated CEO work to hide it.

The rendered parity audit also exposed two issues that source/color checks missed. First, WorkspaceNativeSelect only enabled its spring adapter for COO/handler contexts; Finance filters on Records/Clients/GCash/Withdrawals retained native browser controls. Finance's own adapter now explicitly supports Finance, with the existing native event/validation bridge. Second, Finance's extra underlying-records nav introduced a fourth row into the executive report grid and collapsed the report-view track. The preserved payment-records link now lives inside the existing action toolbar, including a disabled, geometry-preserving pending state. Known Finance route loading now renders Finance's actual dashboard/client/report components through the shared loading entry point.

## Final COO parity verification

Active protected localhost:3000 build `57RnfGSuSRkbG17T4xTMT` (`.next-preview-a`) compiles and passes TypeScript.41 targeted tests pass. Final source formatting and whitespace checks pass. The pre-existing repository-wide role-isolation failure remains in unchanged CEO ReportVisuals/shared-report imports.

`after-audit.json` records60 final views: all ten Finance routes at1705/390/320px, light/dark via the actual theme toggle. There are zero page/document horizontal overflows, visible native selects, visible error alerts or page exceptions. All12 inspected shell/material/control properties match the current COO values in every view. Table horizontal containment and the executive report results region remain intentional adaptations, matching their actual task. Reviewed the final main views and representative narrow/bottom captures against the corresponding COO evidence.

The payment toolbar's five controls align at y124–166 at1705px. All six hovered row cells compute the same rgb(32,36,44) fill. Table client/scroll width are both1391px; client/scroll height both104px for the actual ready row. Density52px/68px and direct review focus return pass. Report-view buttons are44px high on desktop/390px and51.094px at320px; Overview, Detailed figures and Saved reports are usable. Their track is52px high on desktop rather than the rejected collapsed strip.

`interactions.json` records18 enabled, visible dropdowns including Records, Clients, Payments, GCash, Withdrawals, Reports filters and task assignment. All opened and returned focus on Escape. Task assignment preserves an unsaved title across close/reopen and works with reduced motion; no task was submitted. GCash submission reading opens/closes, and withdrawal detail opens. Payment review opens/closes without a financial decision. No page exceptions or visible server errors were observed. Known-role dashboard/client/report loading now uses the matching finished Finance components.

User acceptance remains unverified. Financial submissions, task creation, production behavior, PDF rendering/downloads and every possible populated/error combination are outside this observed pass. No other role UI, backend authorization or financial calculations were modified in this correction.

## November 23 payment table correction

The user's `/tmp/codex-clipboard-agbs7g.png` controls this scoped correction.
Rejected states: the payment action menu disappears without hover, and the last
row paints square corners over the panel's lower edge. Preserve the existing
COO material, typography, layout and blue Review action. Keep the muted three-dot
button visible and operable at rest; clip the scroll surface to the panel's
lower corners and remove its duplicate lower border.

Checks before delivery: desktop at 1705px and narrow 390/320px, light/dark via the
actual theme toggle, menu visibility without hover, open/Escape/focus return,
rounded lower corners at rest and on row hover, horizontal table containment,
and empty results. No payment mutations. Baker brain/profile and principles
reads timed out because the vault is unavailable; local DESIGNAGENT.md and the
existing project brief remain available. Brain persistence is not established.

Follow-up: user requests iOS motion as Peep. Reuse the existing velocity-preserving
style spring for native three-dot popovers, fading/scaling from the trigger edge.
Keep native light dismissal and Escape, retain the top layer during closing,
disable closed-menu input, and settle immediately for reduced motion. Verify
opening frames, rapid reversal, dismissal, focus return and mobile placement.

Final local build `0LO_o0n6y1ny0TVIR8_7d` is running at localhost:3000 and passes
webpack/TypeScript, scoped formatting and whitespace checks. All 13 existing
Finance tests pass. `.local/payment-edge-20261123/verification.json` records six
light/dark views at 1705/390/320px with the real theme toggle, visible operable
menus without hover, rounded clipped lower corners, no page overflow or inner
vertical scrolling, menu dismissal/focus return, empty results and no page errors.
Rendered before/after, hover, empty and opening frames were inspected against the
user's correction. Narrow tables retain horizontal scrolling and the pinned name.

Motion samples include intermediate spring positions and a settled identity
transform. A real pointer reversal during closing preserves a nonzero progress
(0.676 before input, 0.456 immediately after input, then settles open); it does
not restart from zero. Reduced motion opens at full opacity/identity immediately.
In a 500px-high window the menu flips above its trigger, origin `right bottom`,
and fits between y202–348. No financial mutations were submitted. User acceptance
is pending; brain/profile access remains unavailable, with local evidence retained.

## November 23 live payment search and semantic signals

Controlling reference: `/tmp/codex-clipboard-Vc6yIq.png`, with the user's request
for live search and red missing-data indications. Preserve the existing table,
toolbar, readable row density and menu motion. Negative example: all proof and
review labels currently share neutral gray, making missing proof hard to scan.
Use red for missing proof/rejection, amber for waiting/clarification/possible
duplicates, green for verified/attached proof, blue for ready, neutral for closed
memberships/unknown stages. Keep explicit text and evidence icons alongside color;
attached proof must not imply Finance verification.

Observable checks: typing/clearing updates server-filtered results after a short
debounce, Enter applies immediately, IME composition does not send partial text,
page resets to one while queue/status/date/sort scope survives, URLs restore the
query, and late responses cannot replace newer results. Show pending/error/empty
feedback and disable export while the typed query is pending. Inspect actual
light/dark colors and contrast, 1705/390/320px containment and existing menu motion.
No financial writes. Canonical vault reads still time out; record evidence locally.

Narrow-screen correction: the original pinned name column covers much of each
190px proof/stage column at 320/390px. On phones only, let the payment table scroll
as a whole and reset focus scroll margins, keeping each status fully readable.
Desktop retains pinned names. This supersedes the earlier mobile pin assumption
for this payment table; other role tables are unchanged.

Final local build `OOW-S1fcSNBZoO18neWDy` is running on localhost:3000. Webpack,
TypeScript, scoped formatting, whitespace and 13 existing Finance tests pass.
`.local/payment-search-20261123/verification.json` records typing/clearing,
debounce, IME composition, Enter, page reset, URL restoration, preserved queue,
status/date/sort scope, delayed-response protection, empty results and an injected
search failure followed by Enter retry. Six actual-theme views at 1705/390/320px
have no document overflow or page exceptions. Normal text contrast is at least
5.38:1; inspected missing-proof/neutral hover text is at least 4.79:1.

`extra-verification.json` and the signal captures confirm full, unobscured proof
and verified labels after horizontal scrolling at 390/320px in the final build.
Before-phone captures retain the rejected pinned-column obstruction. Inspected
deuteranopia/protanopia captures retain explicit proof/review labels and evidence
icons even when red and green hues converge. User acceptance remains pending;
no financial mutations, commit, push or deployment occurred. Vault persistence
remains unavailable; verified evidence and session progress are retained locally.
