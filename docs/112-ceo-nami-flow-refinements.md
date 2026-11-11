# CEO portal: Nami flow and chart refinements

Applies the standing Nami guidance to Dashboard, Reports and Fresh AI while
preserving header/bottom navigation, role permissions, existing figures and glass
materials. No sidebar or new dependency is introduced.

## Visual references

The retained Pay Key dashboard remains the composition reference:
`.local/ceo-home-glass/primary-pay-key-reference.png`. The portal keeps its blue
verified/action accent, lilac pending accent and low-saturation glass surfaces.
Text labels distinguish the data independently of color.

For the user's Monthly insight correction, the primary chart reference is
[Zach Louden's Horizontal Bar Chart](https://dribbble.com/shots/6969622-Horizontal-Bar-Chart).
Its aligned rows and common baseline support comparing the two monthly amounts.
The narrow portal card places each exact amount above its horizontal bar rather
than leaving long labels competing with bar width. Source imagery is retained
for reference only, not shipped as application artwork.

[Hafijur Rahman's Ocupite dashboard](https://dribbble.com/shots/27319213-Finance-Dashboard-Web-App-UI)
was visually inspected as an alternative. Its timeline is better suited to many
monthly samples than the selected-month two-value card. Dribbble's Orbix
financial overview was also discovered, but no visual fidelity claim is made
for it. Actual loaded reference screenshots are retained under
`.local/ceo-nami-flow/references/`; initial blank lazy-loading captures are not
used as visual evidence.

## Changes

- `MonthlyAmountChart` and its CSS Module own the monthly chart; the parent
  feature component owns month selection. The pure `monthlyAmountScale` helper
  provides a common signed PHP scale. Negative corrections extend left of zero,
  preserve the signed amount and receive a stripe cue. Zero values remain zero.
- Period and Month labels are visible. Refresh has a visible label and pending
  state. Initial loading and refresh announcements differ, and refresh retains
  existing figures. The Fresh AI entry no longer incorrectly claims the service
  is unconnected; it describes workspace access without promising an outcome.
- Shared `WorkspacePageSearch` owns search UI/state outside the layout file.
  It preserves query text on dismiss, provides a clear-search recovery action,
  restores trigger focus on Escape, and displays the platform's shortcut.
- Report filter validation focuses the associated error summary. Dates remain
  visible and retained after applying. Pending Apply and Refresh actions show
  their state and prevent unintended repeat submission. The assistant composer
  keeps a visible label after text entry.
- Empty collections and batch views identify the state and point to an existing
  period/report action. Error and empty responses remain separate.
- Graph totals, legends and activity-ring spacing are tighter. Monthly insight
  and payment activity size to their content instead of stretching to match
  neighboring tall cards, removing blank space inside those graph panels.

## Verification and boundaries

Before/after desktop/mobile captures and the browser verification script live
in `.local/ceo-nami-flow/`. Browser checks cover visible labels, common-scale
chart structure, refresh pending/retention, empty page search/clear, keyboard
shortcut/Escape focus return, retained report dates and assistant labels.
Desktop light/dark and390/320px views are inspected for overflow and page errors.
Caption contrast is calculated against each panel composited over its solid
fallback; gradient/glass background variation is a separate visual inspection.

Three scale regressions test proportional amounts, signed corrections, and
zero/nonfinite inputs. Full web regression and optimized-preview build evidence
are recorded in `/tmp/ceo-nami-final-web-tests.log` and
`/tmp/ceo-nami-preview-build.log`. Final acceptance must use actual port3000
following the protected preview rebuild; a development-only pass is insufficient.

Development browser verification forwards read requests with the preview's
allowed origin. Final port3000 verification uses its normal API configuration;
only refresh responses are delayed to expose pending feedback. No financial
records or provider requests are created by these checks. Production deployment
and non-Chromium acceptance are separate. Other existing checkout work remains
outside this change.

## Completed preview verification

The protected optimized preview was rebuilt and restarted on port3000 using
`.next-preview-a` with API4101 and the existing local demo configuration. The
final browser checks passed against that exact URL, with real preview responses
and only refresh delivery delayed. No source-only preview claim is substituted.

All190 web tests pass, including three signed-scale regressions. Web TypeScript,
formatting, whitespace and optimized build pass. The client credential check
scans384 files with zero findings. The chart caption's measured solid-fallback
contrast is5.55:1 in light mode and5.73:1 in dark mode. Desktop1440 light/dark
and390/320px captures have no horizontal overflow or runtime page errors. The
monthly dark desktop panel shrank from about518px to392px after removing stretch
and repeated explanatory copy. Reference baseline/rows, portal palette and exact
amounts are retained; the UI is a narrow-card adaptation rather than a pixel copy
of the wide reference shot.

Evidence: `.local/ceo-nami-flow/after-*`, its `verify.cjs`, and
`/tmp/ceo-nami-live-verification.log`.
