# CEO report visualizations

Requested 2026-10-26 for the existing report-only CEO portal. Local implementation;
deployment and other client workflow revisions remain deferred.

## Reading flow and design decisions

The CEO needs to compare collections, identify outstanding batches, and inspect
the team's reports without entering operations. The flow is overview totals →
choose a three-, six- or twelve-month period → select a month → open detailed
reports → optionally inspect captured figures and analysis. Success means the
displayed amounts agree with the existing report APIs and the CEO can complete
this flow with pointer or keyboard without receiving write access.

The `user-expi` and `ui-design-index` skills informed the implementation. The
dashboard/design-system route was selected. Its referenced category skill was
absent locally, so the existing portal supplied typography, colors, spacing,
surfaces and responsive behavior. Three compatible patterns were used: a primary
time-series comparison, directly labeled ranked bars, and progressively disclosed
exact data. No gallery composition or additional component package was imported.

| Evidence | Task and finding | Confidence and limits | Application and falsification |
| --- | --- | --- | --- |
| [Heer and Bostock, CHI 2010](https://idl.uw.edu/papers/crowdsourcing-graphical-perception) | Crowdsourced graphical-perception experiments reproduced prior spatial-encoding results and examined chart sizing/grid effects. | Promising for comparison tasks; the primary abstract was read, not the full paper. It does not establish Fresh Phones CEO usability. | Compare bars against common baselines; show exact values. Reconsider if a CEO cannot correctly rank batches or compare periods in a task-based walkthrough. |
| [W3C complex images tutorial](https://www.w3.org/WAI/tutorials/images/complex/) | Guidance for conveying complex visual information with text equivalents and structured detail. | Strong accessibility guidance; not a usability experiment or proof of full conformance. | Semantic figures, exact labeled values, accessible month buttons and an expandable monthly data table. Fails if figures cannot be understood using the labels/table without color or graphics. |
| [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | Guidance on distinguishing meaningful graphics and UI components from adjacent colors. | Strong standard guidance; applies to relevant graphics/UI, not every decorative grid line. | Theme-specific chart colors, a patterned pending series and visible focus. Verify relevant color pairs in both themes; do not infer accessibility from a palette alone. |

A corrective constraint is that a larger visual does not make an ambiguous metric
accurate. Pending claims are separate from verified credit; Finance adjustments
already contribute to net credit; verified record counts can include reversed
credits. The current month is explicitly “to date.” Batch balances span all
payment dates, independently of the trend period. These meanings remain visible
beside each figure. There are no decorative percentages, smoothed curves or
automatic payroll/refund decisions.

Month buttons have persistent selection and exact accessible labels. Loading,
empty, retry and stale-refresh states retain nearby explanations. Twelve-month
plots scroll within their card on small screens. New charts introduce no motion.
Unknown fields in older snapshots are omitted rather than represented as zero.
Client usability and assistive-technology testing remain open; local browser
checks do not establish full WCAG conformance.

## Data and access

`GET /api/reports/charts?months=3|6|12` requires `REPORT_VIEW`. Strict validation
rejects extra query fields. A repeatable-read transaction aggregates payment
dates into Asia/Manila calendar months, ending today, with empty months filled
with zero. PostgreSQL numeric arithmetic includes signed Finance adjustments;
amounts are serialized as decimal strings. Payments are filtered before monthly
aggregation. Corrections follow their original payment date, matching existing
reports, rather than forming a cash-flow statement by adjustment creation date.

The endpoint also returns status counts and the six largest current batch
balances across the full company scope, not merely the first report page. It
projects batch codes and balances only. Existing collection queries preserve
lifetime balances. It performs no writes, grants no permissions and introduces no
migration, service, integration or chart dependency.

The CEO overview refreshes on focus, every thirty seconds, and on demand. Period
changes invalidate older requests. Failed refreshes clearly identify retained
figures; initial failures offer retry.

All five detailed report families gain directly labeled comparisons. Live batch
rankings explicitly describe the current page; saved rankings describe the
captured report. Saved charts derive exclusively from immutable snapshot payloads
and never replace historical figures with current data. Existing report tables,
filters, pagination and exports remain available. Other roles retain their
existing report interface and authoring privileges.

## Implementation and validation

Shared contracts: `packages/contracts/src/report-charts.ts`. Read endpoint:
`apps/api-ts/src/reports/charts.ts`, report controller and service. Frontend:
`apps/web/components/charts/`, `lib/report-chart-data.ts`, `app/system/ExecutiveCharts.tsx`,
`useExecutiveCharts.ts`, `CeoDashboard.tsx` and `app/system/reports/ReportVisuals.tsx`.

Automated checks passed: 67 API unit tests, 98 web tests, 10 report integration
tests and 4 CEO authorization integration tests (179 total). Integration tests
use fresh dedicated local `_test` databases. They cover Manila boundaries, zero
months, payment-date attribution of corrections, fractional amounts, exclusion
of future payments, strict query validation, full-scope batch ranking and role
access. Web checks cover signed/empty geometry, exact value retention, page scope
and missing optional historical fields.

Workspace typechecks, the API build and protected optimized web build passed.
The six chart-transformation tests also passed after the final signed-adjustment
color refinement. Formatting and whitespace checks passed.

Fourteen browser check groups passed: API/report parity, month keyboard selection
and exact table values, theme contrast, all period controls, 390px/320px layouts,
stale-refresh recovery, initial-error retry, zero-data rendering, request-race
handling, all five report families and signed corrections, snapshot figures,
filters/CSV/empty reports, retained Finance authoring and read-only CEO requests.
There were no browser page errors. Final checks measured chart colors at least
3:1 against their adjacent tracks/surfaces and sampled chart captions at least
4.5:1 in both themes. The caption check prompted a local chart color adjustment
rather than changing the application-wide palette.
Screenshots were visually inspected for the overview, mobile trend and signed
reconciliation figures. This is local verification, not client acceptance.

Read-only, warmed `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` captured both exact
queries for the twelve-month overview on the current preview data: monthly
aggregation 2.055 ms, collection aggregation 6.176 ms. The plan scanned 140 payment
rows for the broad monthly period and used the existing adjustment payment-ID
index; collection plans retained full lifetime balance calculations. Sequential
scans at this small scale are reasonable. These single local measurements do not
establish production throughput or latency; representative scale/load validation
remains necessary before any future release. No indexes or schema were changed.

Evidence stays under ignored `.local/ceo-access/`: `chart-browser-results.json`,
`chart-query-plans.json`, `chart-*.png` and private verification runners. No
credentials are stored in this documentation.
