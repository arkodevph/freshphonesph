# CEO portal aligned with the client portal

Jaycee requested copying the client-facing layout and design on 2026-10-26,
following the CEO charts implementation. The existing customer portal at
`http://localhost:3000/portal` is the visual reference. The target is the CEO
overview and Reports at `/system`, retaining report-only access.

## Reference mapping

Inspected the rendered customer overview and its `PortalDashboard`,
`PortalTopbar`, `PortalSidebar`, `MembershipOverview` and CSS. Used the
`ui-design-index` dashboard/design-system route; its referenced category skill is
absent locally, so the actual customer portal supplies the composition.

| Customer reference | CEO adaptation |
| --- | --- |
| Full-width, 76px brand header; navigation beneath it | Identical desktop header/sidebar geometry with CEO branding and existing page search, theme and account controls |
| Gray sidebar, purple selected item, roomier Nunito labels | Matching surfaces, 244px sidebar, 14px navigation, selected state and current-page semantics |
| Dashboard breadcrumb and personal greeting | Same hierarchy with the CEO's existing account name and company-report label |
| Blue/blush illustrated membership banner beside payment overview | Company-report banner beside company totals, reusing the actual phone asset and shared `PortalBannerArt` |
| Rounded cards, readable labels and exact financial figures | Matched card radii/type across company summary, charts and Reports; existing data definitions retained |
| Small-screen bottom navigation | Two accessible Dashboard/Reports destinations, with account/theme/search in the header; no additional customer or operational modules |

The banner's phone and doodles are decorative brand assets. They do not represent
an enrolled CEO device. Company totals still span all payment dates; the chart
period controls remain independent. No percentage or payment-progress metric was
invented to imitate the customer panel.

## Implementation

`apps/web/app/system/ceo-portal.module.css` scopes the composition to CEO. The
existing system layout retains its authentication, privacy gate, page-access
checks, page search and account behavior. Other staff keep their existing shell.
The customer portal source is unchanged.

`CeoDashboard.tsx` arranges the greeting, shared banner artwork, company summary
and existing charts. `DashboardCards.tsx` adds an optional summary presentation;
its default staff presentation, data source and refresh behavior are retained.
Reports gets a CEO-only heading/card treatment. Charts use the customer portal's
body typography and larger comparison labels.

No backend, contracts, database, financial policy, role grants, external service
or deployment was changed. Charts, saved figures, analysis reading, filters and
exports retain the behavior in [CEO report visualizations](63-ceo-report-visualizations.md).

## Local verification

All 98 web tests, web typecheck, protected optimized web build, formatting and
whitespace checks passed. Six browser groups cover:

- Exact rendered customer/CEO desktop header and sidebar bounds, sidebar surface
  and navigation font; banner/summary placement and existing decorative assets.
- Company totals against the API and unchanged `REPORT_VIEW`-only permissions.
- Keyboard dismissal, accessible-page search and own-account controls.
- Layout at 1440, 1101, 1000, 768, 390 and 320px; bottom navigation, current-page
  feedback and content remaining clear of the fixed navigation.
- Direct operational page/API denial and read-only Reports.
- Retained Finance layout/authoring and unchanged customer layout.

No page errors occurred. Light/dark desktop, mobile and Reports screenshots were
visually inspected against the customer reference. Earlier tracked-file diffs
outside the intended layout files remained identical before documentation updates.
All fourteen chart browser regression groups also passed after the layout change,
including period controls, exact values, theme contrast, stale/error/empty states,
saved figures, filters and downloads. Backend integration suites were not rerun
for this presentation-only follow-up; backend and contract sources are unchanged.
Evidence is in ignored `.local/ceo-design/`, including `layout-browser-results.json`
and reference/CEO captures, plus the chart runner evidence under `.local/ceo-access/`.
This is local verification, not client acceptance or
a full accessibility audit. The optimized localhost preview is rebuilt; deployment
and other client-workflow changes remain deferred.
