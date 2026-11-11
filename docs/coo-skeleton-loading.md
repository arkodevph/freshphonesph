# COO loading states

The November 11 correction requires page skeletons to follow the finished page
composition. Compact iOS activity indicators are reserved for identity checks,
small asynchronous actions, and refresh feedback. The requested finish is a
neutral moving shimmer, with a static reduced-motion alternative.

## Controlling references

- User Reports screenshot: `/tmp/codex-clipboard-XhY5uK.png`, inspected November
  11, 2026. Retain the page heading, tabs, filter disclosure, actions, four metric
  columns, payment-status donut, and collections chart at their actual bounds.
- Apple progress indicators, inspected through OpenCLI November 11, 2026:
  https://developer.apple.com/design/human-interface-guidelines/progress-indicators
  Activity indicators apply to contextual operations, not as a substitute for the
  requested page skeleton. Capture: `/tmp/nami-apple-spinner.png`.
- Rejected treatment: replacing the Reports results with a lone spinner or a
  generic placeholder bar. It removes the loaded page's shape while waiting.

## Implementation

`ReportHighlights`, `ReportVisuals`, `PaymentStatusChart`, and `BarChart` render
their pending state through the same layout and surfaces as their loaded state.
Unknown values use neutral placeholders, without invented totals or percentages.
Known text reserves its real wrapping, including mobile comparison badges and
notes. The Reports route fallback reuses `ReportsDashboard` in `skeletonOnly`
mode, suppressing its report request.

Refreshing an existing report retains its figures. Changing report type, period,
or page clears the previous result and shows the matching pending content;
export and save remain disabled while data is pending.

COO dashboard loading retains `CooDashboardLayout` and its real sections. Tables
retain their real column structure. Shared placeholder lines and avatars, report
chart tracks, the donut ring, and COO chart placeholders use a restrained shimmer.
The CSS disables shimmer under `prefers-reduced-motion: reduce`.

## Verification evidence

Browser scripts and captures live in `.local/coo-skeleton-20261111/`. Always
capture pending and loaded bounds at the same viewport: OpenCLI screenshot calls
restore the viewport after capture, so apply dimensions again before measurement.
Navigate to a fresh query URL after restarting the optimized preview to avoid
judging a previously loaded JavaScript bundle.

OpenCLI disallows `Emulation.setEmulatedMedia` and network emulation here.
Reduced-motion behavior is verified by CSS inspection, not browser emulation.
Delayed requests are simulated only inside the verification tab; no backend
records are written. Build identity and final measurements belong in the session
record after the final preview is inspected.

The payment overview was measured at 1724px and 390px widths. Desktop metric and
chart bounds matched exactly; mobile differed by at most 0.40625px. Refresh kept
the chart bounds unchanged. These measurements cover the supplied payment report
composition; dynamic category/batch counts in other report types remain unknown
until their requests finish.

## Sidebar updates

The COO sidebar uses a 7px red dot and a screen-reader "New updates" label.
`useNavigationUpdates` consumes the existing, server-scoped EventSource stream;
it does not open a second connection. Change entities map to relevant permitted
destinations. Ready/reconnect frames, malformed data, and read receipts do not
create dots. Opening a section acknowledges it; other dots remain. A hidden
tab can accumulate updates until its current section becomes visible again.

Only destination paths are stored in account-scoped `sessionStorage`, with an
in-memory fallback. This indicates updates received in the browser session; it
does not claim a server-persisted unread history or recovery of events missed
while disconnected. Browser rendering tests seed only their own tab's stored
paths. Stream sharing and change propagation are covered by the EventSource
test double; no business record is created to trigger a test notification.
