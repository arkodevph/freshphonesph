# CEO report workspace: context stays visible

## Task and reference

November 10, 2026: user identified `/system/reports` in their screenshot, rejecting
an entire report page moving in one scroll. Nami owns visual direction; explicitly
requested user-expi owns interaction constraints. This clarification supersedes
an initial dashboard interpretation. No dashboard geometry is changed.

Primary visual: the existing supplied Pay Key frame was reopened at
`.local/ceo-home-glass/primary-pay-key-reference.png`. Keep the established floating
navigation, quiet neutral panels, readable financial hierarchy and meaningful
series colors; the explicit black canvas correction supersedes the former navy.
Negative example: user screenshot `.local/ceo-reports-20261110/user-before.png`
shows a scrolled reconciliation report with title, period and report selection
out of sight. Those are the specific properties being corrected.

## Behavior and evidence ledger

Flow: select report -> inspect/edit period and scope -> apply -> read results ->
export or inspect history. Risk: losing applied context while reading long tables,
confusing draft filters with applied results. Preserve dirty warnings, validation,
loading/error/empty states and read-only financial behavior.

- Working memory: Cowan, 2010, *The Magical Mystery Four*,
  https://pmc.ncbi.nlm.nih.gov/articles/PMC2864034/ (OpenCLI full-text extraction
  inspected November 10). Review of experimental memory tasks reports central
  storage limits around 3–5 meaningful items in young adults, with task and
  individual differences. Strong evidence for constrained memory; only promising
  inference for this app: visible period and report selection may reduce recall.
  It does not prescribe a number of widgets. Falsifier: users still misidentify
  applied scope or take longer to locate figures after this change.
- Corrective boundary: W3C Reflow,
  https://www.w3.org/WAI/WCAG22/Understanding/reflow.html, inspected through OpenCLI
  and web November 10. Strong normative accessibility constraint: fixed desktop
  panes must give way to reflow at narrow/zoomed sizes; tables may need horizontal
  movement, ordinary text should not. Check 320 CSS-pixel width and zoom.
- W3C Keyboard, https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html,
  inspected November 10. Strong normative constraint: results pane is focusable
  and named, native keyboard scrolling and focus visibility must work.

Route: user-expi -> ui-design-index -> ui-design-systems. Patterns: persistent
workspace shell, grouped filter controls, independent dense-data viewport.
Desktop >=1100px wide and >=640px tall: title/tabs fixed in content area;
240px filter column and separate results/history viewport. Actions/applied period
stick at the top of results. Report, applied-scope and page changes reset the
results viewport. Narrow/short views use natural stacked reflow. No scroll hijack,
new packages, reduced type sizes or removed records.

Verification evidence and remaining unknowns are recorded after the final render.

## Verification

Optimized preview `http://localhost:3000/system/reports`, inspected desktop
1440x1000 plus actual browser viewport 1725x933, light/dark, 390x844 and 320x800.
Before the final menu-height adjustment, build zZQvqeHLmaIfCGZv7xf30 passed;
TypeScript, formatting, diff whitespace and seven existing report summary/comparison
tests passed. Main viewport measured clientHeight=scrollHeight=837 with hidden
outer scrolling; results measured 627px high with 1330px of payments content.
At results scrollTop=1600 in reconciliation, main scrollTop remained zero and
heading, tabs, filters, applied period and actions stayed visible. Switching
reports reset results to zero. The named results pane accepts focus and shows
an explicit focus outline. Dropdown Escape closes and returns focus to its
trigger. Captured console messages: none.

Inspected screenshots retained in `.local/ceo-reports-20261110/`: final, scrolled,
reconciliation, expanded table, mobile, 320px reflow, dropdown and light theme.
Compared against the supplied failure frame: the lost report identity/period is
corrected; table-only horizontal scrolling is retained. Native paging-key
scrolling was not established by OpenCLI: it delivered unprevented keydown events
with an empty code but did not trigger Chromium's default movement. Do not claim
that automation as a passed keyboard-scroll check. Physical keyboard/assistive
technology usability, reduced-motion emulation, other engines, user acceptance
and deployment remain unverified. No new motion was introduced.

Final menu correction: expanded dropdowns let the filter column occupy its full
available height. Rebuilt successfully and refreshed the actual optimized preview
on localhost:3000, build ggTfRpKc2a8dP3k_No8gT (.next-preview-b). Final dropdown
capture inspected; filter height=625px, results=627px at 1725x933, mainScroll=0,
CEO canvas rgb(0,0,0). Final screenshot: ceo-reports-dropdown-final.png.

## Rejected rail; replacement

The user rejected the first implementation as "so hard to look at". Treat the
240px filter rail plus oversized metric cards as rejected, not accepted or a
reusable default. Retained captures document verification only, not acceptance.

Replacement: one wide workspace with a compact collapsed filter strip above it.
Overview shows unboxed, smaller metrics and charts; Detailed figures and Saved
reports are separate explicit views, rather than one long combined report.
Keep heading, report choice, scope, actions and view controls outside the content
scroll region. On desktop content alone scrolls; narrow/short screens reflow.
The Pay Key reference still controls the broad financial hierarchy, while this
interaction split deliberately improves readability for real report content.
This supersedes the rail geometry and two-column highlight treatment above.
