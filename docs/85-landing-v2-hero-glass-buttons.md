# V2 hero glass buttons and divider removal

Jaycee requested removing the decorative five-cloud strip and matching the
hero calls to action to the existing glass treatment on 2026-11-02.

The V2 page omits `CloudDivider`; the hero now precedes the existing phone story
directly. The component and shared artwork remain available to V1. The hero
contains its mobile highlights' margins so the transition has a continuous
blue background rather than a collapsed margin gap.

Both **View available units** and **Apply to join** use translucent pale-blue
gradients, a white rim, a soft inset highlight and the same blur/saturation as
the existing glass surfaces. Navy text remains readable, the primary action is
slightly more opaque, and both buttons use matching heights. A solid pale-blue
background is the fallback when backdrop filtering is unsupported. Keyboard
focus stays visible; reduced motion disables the hover lift and transitions.

The two destinations remain `#units` and `/enroll`. The current compact navbar,
Sono heading/Nunito subtext pairing, remaining sections and V1 source are
preserved. No new asset, dependency, API or data change.

Both protected optimized builds and TypeScript gates pass; scoped Prettier
passes. Sixteen browser groups across both previews verify 1440/1280/768/390/320px,
no divider or extra section gap, actual glass blur/gradients, equal button
heights, at least 4.5:1 text contrast over conservatively dark backdrops,
keyboard focus and both destinations, reduced-motion and normal hover, phone
story progress, no-JavaScript anchors and V1's original strip/solid button.
No page exceptions. Desktop/mobile hero and transition screenshots were visually
reviewed; all 35 original V1 source hashes match. Both local previews run the
change. Evidence: `.local/v2-hero-glass/`; no push or deployment.
