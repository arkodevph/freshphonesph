# Preview report data, shared scrollbars and wavy indicators

## Database-backed sample records

The user requested actual dummy records in the database so report percentages represent stored data rather than browser fixtures. Added `apps/api-ts/scripts/seed-report-preview.ts` and ran it against the existing loopback `freshphones_preview` database on port 5548.

Run from `apps/api-ts` with the existing private environment:

```bash
node --env-file=.env.preview --import tsx scripts/seed-report-preview.ts
```

The script rejects non-development environments, non-loopback hosts and database names not ending in `_preview`. It requires active demo administrator, payment recorder and Finance verifier accounts with the appropriate existing permissions. It creates no login accounts, credentials, notifications or external payments.

Seed identifiers are deterministic and namespaced by the current Manila date (`DEMO-REPORTS-20261106` for this run). An advisory transaction lock prevents concurrent duplication. Existing records are preserved; a second same-day run created zero batches, members or payments. A run on another date deliberately uses another dated namespace.

Created 3 demo batches (iPhone 13/14/15), 18 fictional members and 216 monthly schedule items. Created 72 payment records across November 1–6 and October 26–31: 36 pending and 36 verified. Recorded payments belong to the demo Core Handler; verification and its audit entries belong to the active Finance Officer. Notes explicitly identify fictional local-preview data. Each client has a real generated schedule; balances remain derived. No balance columns are overridden and no existing customer is edited.

Authenticated Collections API verification:

| Metric               | Current period | Previous equal-length period | Change  |
| -------------------- | -------------- | ---------------------------- | ------- |
| Verified collections | ₱78,750.00     | ₱63,000.00                   | +25.00% |
| Pending claims       | ₱12,600.00     | ₱18,000.00                   | −30.00% |

Overall recorded agreements are ₱756,000.00 and net verified credit is ₱141,750.00, giving a derived remaining balance of ₱614,250.00. The original demo customer remains without a schedule. Total database counts after seeding: 4 batches, 19 clients, 72 payments and 216 schedule items. All 36 verified payments have Finance-role verifiers and exactly one verification audit each.

Evidence: `.local/report-seed-{result,repeat,verification}.json`, `.local/report-seed-{typecheck,script-typecheck}.log`. The browser verification uses real API responses without route interception.

## Shared iOS-style scrollbars

The user's cropped dark dropdown scrollbar (`/tmp/codex-clipboard-okZaVt.png`) controls the visual change: keep the menu composition and replace the visible scrollbar chrome with a quiet rounded indicator. New `apps/web/app/scrollbars.css` is imported by shared globals, so it reaches the public site, staff system, portal, dropdowns, textareas and nested scrollers, including the standalone landing app's shared CSS import.

One 6px horizontal/vertical scrollbar with a 999px thumb radius, transparent track/corner and no arrow buttons. Light mode uses a slate thumb; dark mode lifts its lightness for contrast against charcoal. Hover increases emphasis without animation. Firefox uses standard `scrollbar-width: thin` and `scrollbar-color`; Chromium/Safari use WebKit painting for the rounded shape. Component-specific thin/color declarations were removed to prevent competing painters. Intentionally hidden swipe rails remain hidden. Native scrolling, keyboard interaction, focus and OS accessibility modes remain in place. Actual iOS overlay visibility is controlled by the operating system; no custom scroll engine was added.

Inspected dropdown captures match the reference's narrow side indicator while removing the original arrow buttons and solid track. Chromium checks passed for six light/dark × 1728/390/320 cases: computed 6px dimensions, rounded thumb, transparent track, no buttons, real overflow, Home/End scrolling and Escape focus return. An overflowing assistant textarea uses the same style. Headless Chromium's default `--hide-scrollbars` initially hid the painted thumb in captures; the verification rerun disables that flag and confirms visible pixels in both themes.

Evidence: `.local/ios-scrollbars/{verify.cjs,verify.log,checks.json,period-*.png,database-report-cards.png}`. No document horizontal overflow or page errors. All 186 web tests, API typecheck, separate seed-script TypeScript check, optimized web build, scoped formatting and whitespace checks passed. Firefox/WebKit engines and physical iOS were not tested.

## Wavy arrows

The user then rejected straight trend arrows using the four-card Payments screenshot (`/tmp/codex-clipboard-vRmcdY.png`). Replaced only the direction glyphs in the shared `ReportHighlights` component with small rounded SVG waves ending in an arrowhead. Up/down are mirrored; neutral changes use a horizontal wave; unavailable comparisons retain a dash. The wave is a decorative direction indicator, not a plotted historical series. Existing values, percentages, colors, comparison dates, accessible explanations and grid remain unchanged. Static vectors introduce no motion or dependency.

Final rendered wavy-arrow checks are recorded in session evidence after the optimized rebuild.
