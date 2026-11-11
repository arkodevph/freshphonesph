# Rounded controls, account layering and split actions

The user rejected overlapping content in the CEO account menu and the squared ends of the report pills. They then supplied [Ania Kubow’s split-button reel](https://www.facebook.com/reel/1096735543127762) and explicitly requested the same interaction across staff workspaces and the customer portal.

The reel is the primary interaction reference: one joined capsule with an immediate main action, a divided chevron segment, a rotating chevron and a small menu of related alternatives. Inspected public frames are retained in `.local/split-buttons/reference-split-closed.png` and `reference-split-open.png`. Existing Apple glass material references remain in `docs/100-ceo-home-glass.md`. The implementation preserves the current reports composition and existing data.

The existing blue/lilac backdrop, neutral glass surfaces and blue action roles remain. Staff menus consume workspace tokens; customer document menus consume document tokens. Customer primary actions use white on blue. Menus use opaque theme surfaces to keep labels readable against content underneath. CEO header account links use the theme accent, replacing a fixed violet that measured only 2.11:1 against the dark menu.

## Changes

- CEO topbar has an explicit stacking level above report panels and selectors. Its account/search popovers use an opaque backing: a nested backdrop filter cannot blur content outside the header’s backdrop root.
- Header/search/avatar controls, report tabs, the persistent sliding selection indicator and report action buttons have capsule ends. Existing chart/data cards keep their larger rounded rectangles.
- `components/SplitButton.tsx` provides the immediate action plus a native `popover="auto"` menu in the browser top layer. This avoids clipping and stacking problems while inheriting the owning workspace’s theme variables. No dependency was added.
- Arrow keys, Home/End, Enter/Space, Escape with returned focus, Tab dismissal and outside clicks work. Menus choose above or below the trigger, clamp to the viewport and reserve space for mobile navigation. Scroll or resize dismisses detached menus. Entry/exit and chevron transitions honor reduced motion. Controls retain 44px targets.
- Staff Reports: CSV is immediate; Excel is in the adjoining menu in all six views, including installment earnings. This shared page serves every role that already has report permission. Existing busy/dirty/loading checks and save/report-analysis actions remain.
- Staff Payments: the same CSV/Excel split replaces the separate export controls, still inside the existing report-permission check and using the existing filters.
- Customer account documents (statements and payment confirmations) and application summaries: PDF is immediate; Print is in the adjoining menu. Existing download error handling, membership selection and document APIs remain.

Unrelated actions such as Refresh, record editing and Finance decisions remain separate; they are not alternatives to an export or document output.

## Verification

The protected optimized Next.js build, TypeScript, changed-file Prettier and whitespace checks passed. The 22 existing report-filter, export API, earnings and application-summary/PDF tests passed.

Chromium verified 35 menu scenarios across CEO, Finance, Analytics, KPI, CSR, CS Head, CS Team, COO and System Admin, plus both customer document pages. CEO checks cover 1728/768/390/320px in light/dark; customer checks cover 1728/390/320px in light/dark. Menus were above surrounding content, inside the viewport, and did not introduce horizontal overflow. Joined radii, chevron rotation, focus, keyboard navigation and outside dismissal passed. Reduced motion is effectively immediate. Dirty report filters disable both export segments; Tab leaves focus on a visible control and closes the menu.

Ten real download flows passed: CSV, Excel for all six reports, Payments Excel, account PDF and application-summary PDF. Customer document content used browser-only synthetic fixtures; no customer or financial records were written. Print was intercepted in the browser to verify the existing print action was called once. No page errors occurred. Inspected screenshots match the reference’s joined silhouette, divider, upward chevron and adjacent rounded menu while retaining each workspace’s palette.

Evidence: `.local/reports-rounding/` for the original overlap/radius checks; `.local/split-buttons/` for reference frames, scripts, screenshots and JSON checks. The optimized local preview runs at localhost:3000. No commit, push or production deployment was performed. Non-Chromium engines and physical-display acceptance remain unverified.
