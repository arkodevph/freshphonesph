# Reports: summary before controls

## Reference and composition

Used ui-design-index, ui-design-systems and agent-reach Exa search. Live reference
exploration began at 07:07 UTC on 2026-11-04 and continued beyond three minutes.
Opened nine distinct Dribbble shots and inspected their retained artwork. Source
URLs and original images are retained under
`/home/nami/design-sources/freshphones-reports-2026-11-04/manifest.json`.

Primary reference: [Financial Dashboard UI Concept (Dark/Light), Surbhi Surana for
17Seven](https://dribbble.com/shots/19525471-Financial-Dashboard-UI-Concept-Dark-Light).

| Reference grammar                                | Freshphones implementation                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| Four equal headline cards                        | Four scoped report figures with definitions                            |
| Narrow category breakdown, wider financial chart | Status ring on the left, collections comparison on the right           |
| Dark neutral canvas and continuous card surfaces | Existing charcoal/white workspace tokens and subtle continuous borders |
| Accent in controls and data                      | Freshphones blue, with labeled amber/purple/rose status series         |
| Transactions below the overview                  | Supporting figures and notes, followed by saved report history         |

Kept the existing CEO navigation instead of copying the reference's bank sidebar.
Replaced its bank transactions, transfers and expense timeline with supported
report fields. No time-series endpoint or previous-period comparison is available
in this view; a labeled category comparison replaces the reference's trend plot.
No decorative artwork, invented trends or comparison percentages were added.

Reference comparison: the first render still devoted too much vertical space to
filters. Replaced the large form with a native expandable toolbar, retaining the
date/batch/status scope in its summary. Adjusted the final payment analysis to
the reference's narrow-left/wide-right order. The four figures and analysis now
occupy the first desktop viewport; detailed definitions remain available below.

## Palette and information

The reference's near-black/teal relationship becomes a cool charcoal canvas,
slightly lighter neutral surfaces, white primary text and blue emphasis. Low
saturation surfaces keep the charts distinct. Blue identifies verified records
consistently in both payment charts. Amber indicates pending claims; purple and
rose distinguish clarification and rejected records. All categories have text
labels and numbers. The state does not tint a metric card or its border.

Highlights cover payments, collections, reconciliation, tasks and support. They
use the applied report, not draft filters. Original detailed figures, correction
notes, tables, saved reports, permissions and export actions remain connected.
Collection period figures remain distinct from current overall balances. Task
timing remains factual; it does not trigger payroll actions. Task/support headers
show count units rather than PHP.

Payment highlights preserve net verified credit without adding pending claims or
subtracting adjustments again. Older saved reports show an uncaptured rejected
count as “Not captured”. An empty status ring remains neutral and offers guidance
to widen the period or choose a batch. A reading note explains collections,
pending claims, corrections and scheduled earnings.

## Verification

- Web TypeScript, scoped formatting and whitespace checks pass. Sixteen report
  summary/chart/filter tests pass, including signed corrections, unknown fields,
  zero activity and applied-filter boundaries.
- Chromium: all six report tabs, expanded date/status/batch controls, dirty-filter
  warning and disabled exports, applying filters, retry after a temporary503
  response, native disclosure keyboard access and focus outline.
- CSV and XLSX actions both reported a download started for the applied filters.
  No report was saved or submitted during verification.
- Inspected dark/light desktop1440/1710px and mobile390/320px. Document width
  equals viewport width on both mobile sizes. Metric cards have no internal
  horizontal overflow at320px. Wider tables retain their own scroll region.
- Sampled computed secondary text/card contrast: light5.64:1, dark6.86:1.
  Apply-filter button: light5.48:1, dark8.77:1. This is a sampled CSS-color check,
  not a physical-display calibration or exhaustive accessibility audit.
- Browser-only populated and error fixtures tested the chart and retry states.
  No database values were changed; restored native fetch and reloaded the live
  report afterward. The clean reload reported no console errors.

Evidence: `/tmp/freshphones-reports-dark-final.png`,
`/tmp/freshphones-reports-light-final.png`,
`/tmp/freshphones-reports-collections.png`, and
`/tmp/freshphones-reports-fixture-*` (explicitly synthetic visual-QA values).
Safari, Firefox, physical devices and a production web build were not verified.
Changes are local; no report-design commit or deployment was requested.
