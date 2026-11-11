# CEO home: iOS glass and monthly collection insights

The user requested continuation of the unfinished iOS glass treatment, then supplied a Pay Key finance dashboard and asked for its Monthly Insight and Total Revenue design to be applied to the current content. They clarified to apply the design to existing figures. The larger chart therefore remains **Total collections**. No new accounting-revenue, expense, percentage-growth, or AI claim was introduced.

## References and composition

Primary composition: the supplied Pay Key screenshot, retained at `.local/ceo-home-glass/primary-pay-key-reference.png`. Four compact columns contain the balance, Monthly insight, Payment activity and existing AI entry. The next row contains a wider collections chart and batch commitments. This follows the reference's compact financial summaries above a wider chart and operational detail, while keeping the existing Fresh Phones information and teal balance card.

Material reference: [Apple Liquid Glass](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/), using the already-inspected official animation storyboard in `.local/verification-glass/apple-details-storyboard.png`. The floating rounded navigation, continuous pale rims, translucent neutral surfaces and inset control highlights follow that reference. The web implementation approximates glass with CSS blur and saturation; it does not implement native optical refraction. Existing chat material guidance remains in [90-ios-glass-chat.md](90-ios-glass-chat.md).

Light mode blends low-saturation blue/lilac into white; dark mode blends slate into a navy backdrop. Data panels have more opacity than navigation and controls. Blue stays the verified-data/action accent, lilac marks pending claims, and labels distinguish both. The gradient balance card keeps its established teal-to-blue palette. No status-tinted card backgrounds or colored edge strips were added.

## Behavior

- Monthly insight reads existing monthly verified and pending amounts. Its month selector changes only this inspection. The wider chart retains the existing 3/6/12-month report-period selector.
- Total collections uses thin paired striped bars like the reference chart, preserves Finance corrections below the common zero baseline, and keeps month selection plus the exact-figures disclosure. Pending claims remain separate from verified amounts.
- Actual zero reports remain zero with honest empty copy. Errors remain unavailable values, not invented zero or trends. Browser-only populated fixtures were used for inspection and were not saved to the API or database.
- Balance summary counts use a compact row. The Finance basis remains visible in the page footer. Reports and the existing assistant destination retain their original links.
- Mobile uses one content column and a floating three-item navigation dock. Controls retain 44px targets where practical. Reduced transparency or increased contrast uses opaque surfaces; missing-backdrop-filter environments have an opaque fallback. Existing reduced-motion behavior remains.

## Validation

- TypeScript and changed-file formatting / whitespace checks pass. Three chart tests cover signed corrections, empty periods and fractional peso proportions.
- Browser inspection at 1728, 1280, 768, 390 and 320px in both light and dark themes found no document horizontal overflow or page errors. Fixed the narrow header brand wrapping and mobile dock label wrapping observed during inspection.
- Checked month selection and a negative correction (`-₱500.00`) in both Monthly insight and the wider chart; exact figures remain available. Keyboard navigation shows the existing 2px focus outline on Open company reports.
- Emulated reduced transparency and reduced motion in dark mode: data-panel background becomes opaque RGB(36,44,58), with backdrop filter none.
- Sampled rendered panel contrast: body text 15.05:1 light /12.40:1 dark; muted text5.45:1 light /5.84:1 dark. Physical-display calibration remains unverified.
- Compared inspected captures with Pay Key's four-column rhythm, compact financial summaries and wider lower chart, and with Apple's floating chrome/rim treatment. Replaced its integrations and invented growth stats with existing batch/collection content. Screenshots and the browser-check report are retained in `.local/ceo-home-glass/`.

The optimized localhost preview must be rebuilt and restarted to serve source changes; see [98-local-preview-login-performance.md](98-local-preview-login-performance.md). No commit, push or production deployment was performed.

## Served preview

Protected optimized build passed and `freshphones-web-optimized-preview.scope` restarted on localhost3000 (Ready254ms). Verified the served page contains Monthly insight, Total collections, and the topbar's computed `blur(28px) saturate(1.45)` material. A cleared-console pass reported no errors. Actual seeded amounts remain zero. The development server on3002 was stopped before building, avoiding concurrent writes to `.next`. The local preview API on4101 was restored after it was found stopped; the existing preview database and credentials were reused without seeding or changing data.

## Reports, dropdowns and motion continuation

The subsequent request extends the same material to Business Reports and asks for smooth iOS-style motion on elements that pop out. The Apple material storyboard above remains the reference: floating rounded surfaces, pale continuous rims, inset controls and a short scale/fade. Reports retain their existing composition and figures. Neutral blue/lilac light surfaces and slate/navy dark surfaces keep blue actions and readable financial labels; panels use more opacity than the floating chrome.

Report filters, summary figures, charts, tabs and action buttons now consume the CEO glass tokens. The month and report-period selectors and report status, frequency, period, grouping and batch selectors use the shared keyboard-accessible Select, including selected checkmarks. Menus choose the available space above or below their trigger, reserve room for the mobile navigation dock, and raise the containing panel while open. Animated disclosure content permits visible overflow once open so report menus remain clickable beyond the filter panel.

Dropdowns use 140ms opacity and 180ms scale/translation transitions on entry and exit. Closed menus are hidden, inert and excluded from accessibility navigation immediately. Account/search popovers and dialogs use a 180ms entrance; expanding disclosures use a 200ms height transition where supported, with a short entrance fallback. Reduced motion removes these transitions; reduced transparency uses opaque material. Theme-transition cancellation during viewport changes no longer leaves an unhandled promise rejection.

The user subsequently rejected the blue report-tab hover outline shown in their screenshot. Inactive tabs now use a neutral 4% dark tint in light mode and 5% white tint in dark mode with a transparent border. Hovering a selected tab preserves its existing selected surface. Other secondary report buttons retain their neutral borders and gain a slight tint. Keyboard focus still uses the explicit focus ring, and hover does not move or resize targets.

Verification on 5 November 2026:

- TypeScript, changed-file Prettier and scoped whitespace checks pass. All 25 existing report filter, chart, API/export, installment-earnings and summary tests pass.
- Chromium checks at 1728, 390 and 320px in both themes report no document overflow or page errors. Payment status selection and applying/resetting filters work. Frequency, period, grouping and batch menus open and dismiss with Escape; keyboard End/Enter selection and earnings calculation work.
- At 320px, the CEO monthly menu ends at y382 while the dock starts at y649. Reduced motion/transparency produces effectively immediate transitions, no backdrop filter and an opaque RGB(36,44,58) menu.
- Inspected desktop light/dark and mobile menu captures against the saved Apple material reference: the rims, layered neutral surfaces and rounded controls continue its treatment while labels retain contrast and report hierarchy. Evidence and the browser verification script are in `.local/ceo-reports-glass/`. These are local Chromium checks; other browser engines and physical-display calibration remain unverified.
- Final optimized rebuild passed and the preview restarted on localhost3000 (Ready184ms). The exact Support → Installment earnings hover from the user's screenshot was checked in both themes: transparent hover border, neutral tint, unchanged target bounds, unchanged selected-tab surface and a 2px keyboard focus ring. Inspected captures `report-hover-light.png` and `report-hover-dark.png`; no page errors.

## Graph theme and motion

The user requested that every graph match the theme and smoothness. CEO series tokens now live on the shared shell so the dashboard, report charts and assistant sample consume the same palette. Blue identifies verified values/actions, lilac pending values, amber clarification and rose rejection/corrections. Text and exact-value labels remain visible; pending bars also retain their stripe pattern. Neutral tracks use low-opacity blue/slate rather than the old near-black page background. Grid lines and empty-state edges use the same quiet material palette.

The payment-status donut now uses SVG stroke segments over a transparent center, preserving exact record proportions and its existing text legend. An empty donut has only the neutral track; zero-value horizontal bars have no invented sliver or baseline. Negative correction bars keep the existing shared zero baseline and grow from its negative side.

Horizontal bar entrances/width changes, monthly insight bars and payment-activity meters use a 420ms ease without overshoot. The collections plot fades in over 220ms; month selection dims other marks over 180ms, while SVG geometry changes use the same 420ms timing. The assistant's explicitly labelled sample bars share that timing and track material. Reduced motion disables chart animation and transitions. Exact amounts and data calculations remain unchanged.

Evidence is retained in `.local/ceo-graph-theme/`. Populated visuals use browser-only response fixtures, including negative corrections, and are never saved to the API/database. Existing chart geometry, report summary and executive-overview tests cover 13 cases, including zero/empty data, signed corrections and fractional amounts.

The final protected build and optimized preview restart passed (Ready217ms). Chromium verified all five report graph views in both themes, plus 320/390px layouts, dashboard month selection, the assistant's labelled sample graph, zero values, signed corrections, reduced motion and opaque reduced-transparency panels. A sampled bar animation interpolated from scale0.946 at210ms to1 at completion. Donut proportions sum to100%; empty segments remain0%. Final checks reported no page errors. Inspected light/dark populated, empty, mobile, correction and dashboard/sample captures against the existing glass surface/rim and Pay Key chart treatment. Other browser engines and physical-display calibration remain unverified.

## Sliding report-tab selection

The user clarified that the active button's glass pill should swipe between tabs. `ReportTabs.tsx` keeps one decorative indicator mounted inside the horizontally scrollable navigation. Its transform and width transition for320ms with the same restrained easing as the glass controls. Layout measurement and ResizeObserver align it to the selected button and respond to viewport/font changes. The first selection is placed immediately. New selections retarget the current transition, including rapid clicks; the button itself retains keyboard focus and pressed semantics. The selected buttons have transparent surfaces so there is only one moving pill. Reduced motion positions it immediately. All six CEO report tabs, including installment earnings, share this behavior.

TypeScript, scoped formatting/whitespace checks and the optimized build passed. Served Chromium checks sampled36 switches (six tabs × light/dark ×1728/390/320px), confirming interpolated positions, a persistent indicator node, exact final button alignment, selected-button transparency and retained focus. Rapid retargeting, keyboard selection, horizontal overflow and reduced motion passed with no page errors. Report responses were cached in the isolated test context after one read per endpoint to avoid repeated API requests. The optimized preview restarted on localhost3000 (Ready154ms). Inspected midpoint/settled captures and checks are in `.local/ceo-report-switch/`.

