# Owner balance card

Local visual update to the CEO dashboard. No financial calculations, data scope, API calls, or authorization changed.

## Reference and composition

Primary: the user-supplied CONYEST finance dashboard screenshot (retained locally at `.local/balance-card/primary-conyest-reference.png`). Keep its landscape card proportions, small upper-left brand, open middle, lower-left balance, upper-right paired circular motif, and thin curved linework. The amount remains **Verified collections**, not an available bank balance; the scope and Finance explanation remain explicit.

Live research reviewed nine distinct Dribbble works. URLs and downloaded artwork are retained in `.local/balance-card/references/reviewed.json`; the enlarged FinEase image is `ref-2-detail.png`. Research included [FinEase by Arounda](https://dribbble.com/shots/25675622-Product-design-for-FinTech-FinEase), [Cascade by Outcrowd](https://dribbble.com/shots/23824437-Cascade-Dashboard-design-for-the-digital-banking), and [Wealth Management by Robert Raimann / Netguru](https://dribbble.com/shots/16545373-Wealth-Management-Dashboard). The supplied CONYEST card controls the implementation; other dashboards were evaluated for gradient depth and readability rather than combined into a new page layout.

## Palette

Deep teal `#143b40` moves through `#22575e` to slate blue `#4b6c91`, with a restrained cool highlight at the upper right. Adjacent cool hues connect CONYEST's green card to Fresh Phones' blue accents. The darkest portion sits beneath the balance; the highlight sits in the open upper-right region. Fine translucent arcs reinforce the reference's physical-card treatment. Surrounding panels keep their existing neutral light/dark theme.

White `#f4fcff` carries the brand, amount, and currency; pale blue-gray `#d1e8ed` carries the metric label and scope. Sampled rendered background contrast was 7.75:1 for the brand, 6.04:1 for the metric label, 7.88:1 for the amount, and 5.57:1 for the scope. The currency was brightened from its initial 4.10:1 reading to 5.03:1. These are Chromium screenshot samples, not physical-display calibration.

## Validation

- Web TypeScript and scoped Prettier / diff whitespace checks passed.
- Inspected desktop and mobile captures in dark and light mode. Width checks at 320, 390, 768 and 1728px found no document overflow. At 320px the scope wraps inside the card; amount, currency and brand remain legible.
- Compared the render to CONYEST: preserved the landscape silhouette, header/balance placement, curved artwork and quiet small type. Adapted the surrounding neutral panel to retain the existing verified-payment counts, Finance note and report action.
- Keyboard tabbing reaches Open company reports with the existing visible 2px focus outline; target remains `/system/reports`.
- Decoration is static CSS, requires no assets or new dependency, and introduces no motion.
- Final dashboard reload produced no browser console errors.
- Existing application edits were preserved. Only `CeoDashboard.tsx` and its CSS module were changed for this task, plus this note. No commit or deployment.

## Optimized preview

The local server was subsequently switched to a prebuilt optimized preview for sign-in speed. Source edits are not hot-reloaded in that mode. Rebuild with `FRESHPHONES_PREVIEW_API_ENV=../api-ts/.env.preview NEXT_PUBLIC_API_URL=http://localhost:4101 pnpm --filter @fresh/web preview:build`, then restart `freshphones-web-optimized-preview.scope` through the matching `preview:local` launcher. Verify the served card markup after restart; refreshing an older compiled snapshot cannot reveal a source-only change.
