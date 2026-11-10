# Glass reference correction and FAQ motion

The user rejected the first gradient panel and explicitly requested inspected
references. Primary reference is Apple's official short Liquid Glass details film,
linked from https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/ .
Inspected a one-frame-per-second storyboard, including transparent media controls
and clear toggle edges. Read https://developer.apple.com/videos/play/wwdc2025/219/
for lensing principles. Compared live https://getdom.studio/experiments/liquid-glass
and https://sohumsuthar.github.io/liquid-glass/demo/ in Chromium. DOM Studio's
external photo assets did not load; its colored geometric stage did. Full WWDC
video retrieval failed, so no claim to have watched that entire session.

Fidelity: transparent center, visible underlying scenery, rounded convex rim,
bright top/bottom highlights and a separate sharp text layer. Cool blue and green
come from the existing landscape; the glass itself adds only 9% neutral white,
rather than a painted cyan gradient. Navy text retains reading contrast. This
adapts Apple's material to the user's existing card composition and brand type;
it does not claim a native optical or physically calibrated reproduction.

`VerificationGlass.tsx` generates a bounded 512px-wide displacement map only on
resize, using the card's rounded-rectangle edge distance. SVG displacement bends
the backdrop near the rim; the center remains neutral. CSS provides baseline blur,
reduced-transparency hides the filter, and unsupported backdrop-filter gets an
opaque sky fallback. No new dependency. `LandingPage.tsx` gives the CTA and site
footer a shared landscape wrapper; footer retains its existing columns/content.
The glass card has no copied illustration or built-in gradient wash.

FAQ topic buttons previously snapped between pill and expanded card. Their size,
padding, radius, label size, icon and summary now transition together over 560ms
with cubic-bezier(0.22,1,0.36,1). Icons/summaries remain in the layout with collapsed
dimensions rather than switching display. Answer entrance is 440ms and remounts
on question ID, so paging gets the same reveal. Reduced motion removes motion.
No selection timers or delayed state updates; rapid clicks and keyboard selection
remain immediate and interruptible. These timings are a web adaptation, not
claimed Apple spring constants.

Verification: both app TypeScript checks, formatting and scoped whitespace checks
pass. Browser checks cover desktop1710x990, mobile390x844, rapid topic changes,
keyboard Home, next-question content, reduced motion, reduced transparency, no
horizontal overflow and no runtime errors. Sampled actual expansion includes
intermediate heights 68,203.7,243.3,249.4px; no frame-rate guarantee is inferred.
Compared final material screenshots against the official film and inspected web
references. Evidence and source manifest: `.local/verification-glass/`.
Safari/Firefox rendering, physical display and user visual acceptance are unverified.
Local only; no commit or deployment.

## FAQ and review cards (follow-up)

A follow-up pass applied the same study to the FAQ and review cards. The HIG
Materials page draws a line between Liquid Glass and standard materials: Liquid
Glass is a functional layer for controls and navigation over rich backgrounds,
and Apple explicitly says not to use it in the content layer. The regular
variant blurs and adjusts background luminosity for legibility and is the
recommended material for text-heavy surfaces such as alerts, sidebars and
popovers. Clear Liquid Glass is reserved for controls over visually rich media.
Sources: https://developer.apple.com/design/human-interface-guidelines/materials
and https://developer.apple.com/videos/play/wwdc2025/219/ .

The implementation follows that split rather than turning every surface into
clear glass:

- The FAQ section now has an ambient sky/lavender/pink stage so translucency
  has something to refract. The answer panel is the regular, frosted content
  material: 30px blur, 1.55 saturation, a white 72→54% tint, a bright inner
  rim and a soft depth shadow. Topic cards start clearer (18px blur, 32% tint)
  and settle at 62% when expanded. The search field, help tile and icon tiles
  use the same lighter material.
- Review cards previously overrode the global `.glass` utility with opaque
  `#fcfcfd` and `#14266b`. They are now light and navy-tinted glass over a soft
  ambient gradient behind the review stage. Navy cards keep a 74–84% tint so
  white copy remains legible.
- Text roles moved from white-on-navy to navy-on-frost: headings `#14266b`,
  body `#2c416e`, labels `#5b4a86`/`#52607f`. Measured label contrast on the
  panel tint is 7.35:1; body copy is darker.
- Layout, copy, the 560ms topic/440ms answer transitions, keyboard handling and
  reduced motion are unchanged. `prefers-reduced-transparency` and missing
  `backdrop-filter` fall back to opaque `#f5faff`/`#f7fbff`.

Verified in Chromium at 1710×990 and 390×844, 320px with no horizontal
overflow, hover, focus, reduced motion, reduced transparency and no console
errors. Screenshots: `.local/verification-glass/faq-glass-desktop.png`,
`faq-glass-payments.png`, `faq-glass-mobile.png`, `reviews-glass-desktop.png`
and `reviews-glass-mobile.png`. Safari/Firefox rendering and physical displays
remain unverified. No new dependency or DOM structure change.

## CTA clearance under the floating navbar

The fixed navbar sits at 16px from the top and is 62px tall. At maximum scroll
it was covering the top edge of the join card on shorter desktop viewports.
`.join` and `.joinCard` now size with viewport-height clamps instead of fixed
desktop padding, and a `(min-width: 768px) and (max-height: 860px)` rule removes
the extra vertical padding on short screens. Footer top padding is reduced in
the same query. Measured at maximum scroll, the gap between the navbar bottom
(78px) and the card top was 87px at 1710×990, 37px at 1440×900 and 45px at
1280×800. Mobile 390×844 is unchanged. Screenshots:
`.local/verification-glass/cta-bottom-990.png` and `cta-bottom-900.png`.

## Mobile unit grid (2-up)

At ≤639px the unit grid was one column with a 1.25rem gap, so comparing models
required a long vertical scan. It is now a two-column shelf with a 0.75rem gap,
0.5rem image margin and 1:1 product images. The cards were recomposed rather
than uniformly shrunk: a 14px/1.3 title clamped to two lines, 12px/1.5
description clamped to two lines, 11px condition/availability labels, a 16px
price and 44px-minimum controls. The inquire link moved to the image's
top-right corner as a white 44×44px control, which keeps the price on one line
even in a 134px card; it keeps the same destination, `aria-label` and keyboard
behavior. The payment button is at least 44px tall and may wrap to two lines.
The `sizes` attribute now requests half the viewport minus gutters instead of
full width.

Verified in Chromium at 390×844, 320×720 and 768×900: two columns, no
horizontal overflow (document scrollWidth equals viewport), no clipped card
content, 44×44px inquire targets, 46–48px payment buttons and single-line
16px prices. Cards are 169px wide at 390 and 134px at 320. Screenshots:
`.local/verification-glass/units-2up-390.png`, `units-2up-320.png` and
`units-2up-768.png`. Type in the compact cards is 11–16px. Safari/Firefox
rendering and physical devices remain unverified. Scoped Prettier, the web
TypeScript check and the FAQ tests pass.

## Commit verification (2026-11-04)

Resumed the existing design for the requested commit and push. Reinspected the
retained Apple details-film storyboard and accent-color storyboard. The current
hero preserves the blue/white field with pink enrollment emphasis; the join card
preserves the reference's transmitted backdrop, bright convex rim and sharp text.
FAQ content uses a softer frosted material for reading. Existing composition and
type scale remain intact.

Standalone production build generated all 17 entries successfully. Landing
TypeScript, scoped Prettier, whitespace checks and all three FAQ tests pass.
Chromium checks confirm FAQ topic selection, keyboard Home and answer paging;
the mobile catalog has 169px columns at 390px and 134px columns at 320px, no
horizontal overflow, and 44px inquiry targets. At 1440x900 maximum scroll the
join card starts at 115.7px, below the navbar's 78px bottom edge.

Screenshots inspected: `/tmp/freshphones-ship-hero.png`,
`/tmp/freshphones-ship-faq.png`, `/tmp/freshphones-ship-units-390.png`,
`/tmp/freshphones-ship-units-320.png`, `/tmp/freshphones-ship-footer.png`.
The development console reported unused preload warnings for fonts/not-found
CSS; no runtime errors were observed. Safari, Firefox and physical devices remain
unverified. The 115 frames under `public/video/iphone-scroll-clean/` belong with
the updated scroll-story path and must be committed with it.
