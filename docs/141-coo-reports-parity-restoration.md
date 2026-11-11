# COO Reports parity and dashboard restoration

November 10, 2026. User rejects the newly added COO payment-record donut/card,
says the old version was better, reiterates that work belongs on other pages,
and supplies a COO Reports screenshot requesting the same presentation as CEO.
This supersedes docs/140's dashboard ring/switch direction.

## Controlling evidence

Rejected card: `/tmp/codex-clipboard-QFoo4L.png`, visually inspected.
COO Reports before: `/tmp/codex-clipboard-XF3AJT.png`, visually inspected.
Prior dashboard: `.local/coo-components-20261110/before-dashboard.png`, reopened:
green collections card with integrated segmented record rail and period dropdown.
Latest live CEO report was opened via OpenCLI in a dedicated session on November 10:
`.local/coo-reports-match-20261110/ceo-reference.png` and `.json`. This is the
controlling Reports composition, superseding the older rejected filter-rail capture.

The current CEO report has a compact collapsed filter strip; open metric row;
charts; Overview, Detailed figures and Saved reports views; and independently
scrolling content. Keep the COO's own sidebar shell, report kinds and access gates.
No new internet design direction is needed for an explicit same-as-CEO request.

## Changes

- Restore the prior green collections card and segmented real-count rail.
  Remove the new ring component and native period switch; restore the prior
  period dropdown. Keep the no-decorative-selection-edge rule and task dialog's
  right-hand properties rail. Dashboard redesign is outside the continuing scope.
- Enable the already shared executive report presentation for COO as well as CEO.
  Reuse the same ReportHighlights, ReportVisuals, ReportResultsPanel and history
  views. Do not fork report calculations, permissions, filters, save or export logic.
- Extend the independent-scrolling report layout to the COO shell. Supply scoped
  report material/chart tokens for COO because it does not inherit CEO shell CSS.
  Keep neutral surfaces and meaningful data colors. Remove selected-view underlines
  for COO to honor the user's all-four-edge rejection; label weight identifies state.

Negative example: the supplied old COO Reports screen encloses metrics within
repeated disclosures/panels and gives no chart-first overview. The replacement
uses the current CEO's existing wide composition, not a new dashboard design.

## Verification

Optimized preview build `HWOJNGHVM7BVRSz_TqEuz` passed compilation and TypeScript.
All 10 existing report-summary, report-comparison and role-workspace tests passed.
Final live COO verification: `.local/coo-reports-match-20261110/verification.json`.
Desktop Reports overview, details, saved history, filters and independent content
scrolling checked. Mobile widths 390 and 320 have no horizontal overflow. Light
and dark screenshots captured. Dashboard shows `Hello, Demo.`, the restored green
segmented record rail, real counts 41/47, and the original period dropdown.
Screenshots: `dashboard-restored.png`, `coo-reports-overview.png`,
`coo-reports-details.png`, `coo-reports-saved.png`, `coo-reports-filters.png`,
`coo-reports-light.png`, `coo-reports-mobile.png`, `coo-reports-320.png` in that folder.
Final desktop dashboard and report screenshots visually reviewed. No report saved
or external message sent. Non-Chromium behavior and user acceptance remain unknown.
No deployment or commit performed.

## Follow-up scope and copy

The user explicitly selected the green segmented-bar card in
`/tmp/codex-clipboard-2QomXo.png`, reiterated vertical bars instead of the donut,
and requested chart-specific Threads references for the adjacent chart. Research
is saved in Nami's `COO-Collections-Chart-Threads-2026-11-10.md`; no new chart design
was applied during that research.

The user also requests minimal, relevant copy, no common-sense narration, and a
greeting on the dashboard only. Dashboard heading becomes 'Hello, [first name].'
without the date/workspace line or redundant subtitle. COO Reports uses 'Reports'
without a duplicate kicker/subtitle; other roles' headings are preserved. Nami's
Agent.md and DESIGNAGENT.md now record the concise-copy rule.
