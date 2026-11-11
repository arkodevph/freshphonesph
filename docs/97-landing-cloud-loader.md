# Landing cloud loader

The supplied recording `/home/nami/Videos/recording_2026-11-05_14.47.08.mp4`
is the controlling reference. Its browser address identifies
[Oleksandr Pronskyi — Cloud loader micro animation](https://dribbble.com/shots/4834788-Cloud-loader-micro-animation).
The user requested inspecting it frame by frame and copying it, then explicitly
requested making the result related to Freshphones and enhancing it.

## Composition and motion

The recording supplies the choreography: a cloud holds, tilts apart into four
round dots, rotates into a square arrangement, then gathers back into the cloud.
The final enhancement preserves these exact vector poses and recorded intervals.
It places the animation above the existing Sono wordmark and Nunito service
caption on the site’s pale sky background. The cloud has a blue-to-lilac-to-pink
fill, connecting the cool brand blue to the warm enrollment accent.

All 94 decoded frames were inspected in a labeled contact sheet. One clean
approximately 1.083-second cycle was isolated before desktop controls dimmed the
recording. The source has variable frame intervals; the loader preserves the
recorded pose intervals rather than assuming a constant frame rate.

The 240×240 analysis region begins at source coordinates925,485. Its silhouettes
were thresholded between the neutral cloud and background and traced to compact
vector paths, with a 0.65-source-pixel simplification tolerance. Tiny cursor
components were excluded. The resulting39 poses plus loop closure live in
`apps/web/components/landing-cloud-frames.json`, approximately27KB gzipped.
No screenshot chrome, cursor, audio, original video, or raster frames ship.

The traced contours are rounded with midpoint quadratic curves to remove the
recording’s pixel stair steps while preserving pose order and timing. They render
through cached Canvas Path2D objects. A
requestAnimationFrame clock selects the recorded pose at its original interval.
Cross-fading neighboring poses was removed because it creates ghost dots absent
from the recording. The cloud's maximum size follows its proportion inside the
original880×660 artwork area; the loader keeps the illustration centered.

## Brand enhancement

The user's latest instruction authorizes theme adaptation while retaining the
recording's motion. The background is sky `#eaf4ff`. The cloud transitions from
blue `#4f86ff` through lilac `#9398e9` to pink `#f28dcc`: the intermediate hue
keeps the cool/warm transition soft, with the larger calm background balancing
the more saturated animation. The gradient conveys no required state.

The navy `#14266b` wordmark has 12.43:1 contrast on sky, dark berry `#a51b68`
PH has 6.39:1, and the `#53617e` service caption has 5.59:1. Text identifies the
business and its service without fake loading percentages. The cloud occupies
a192–240px canvas area, improving its mobile visibility. Rendering uses up to2×
backing resolution; the fallback SVG carries the same gradient.

## Lifecycle and fallbacks

Four cycles precede an800ms eased opacity fade: the overlay is hidden after5133ms.
The cloud and wordmark begin a600ms fade with a12px upward drift and slight
scale reduction at4180ms. The hero heading reveals during the overlay exit.
It never captures pointer events. Reduced motion hides it immediately. An inline
static SVG remains if JavaScript or Canvas is unavailable, and CSS still dismisses
the overlay. The animation loop cancels on unmount and stops after5200ms.
No animation runtime or dependency is added. The loader is a decorative entry
intro and does not claim measured loading progress.

Implementation: `LandingCloudIntro.tsx`, `landing-cloud-frames.json` and the scoped
loader rules in `landing-v2.css`. The previously completed scroll-story crop
fix is preserved.

## Verification and evidence

Before the later edge-rounding enhancement, compared all39 traced poses against
their corresponding recorded
silhouette: mean intersection-over-union99.89%, minimum99.77%. This measures
silhouette agreement at source size, not exact color or recovered original
vector geometry. Browser rendering uses the source timing; the original
Principle project/easing curves were not available.

Chromium1440/390/320 checks observe both a single cloud and four separate dots,
canvas containment, final dismissal and no runtime errors. Reduced motion and
JavaScript-disabled fallback checks pass. TypeScript, scoped Prettier and
whitespace checks pass. Safari and Firefox remain unverified.

Retained evidence:

- `/home/nami/design-sources/freshphones-loader-2026-11-05/recording/all-frames.jpg`
- The same directory's `timestamps.csv`, `trace-metadata.json` and `vector-comparison.json`.
- `/tmp/fresh-cloud-morph-check.cjs`, `/tmp/fresh-cloud-morph-results.json` and `/tmp/fresh-cloud-morph-1440.png`.
- `/tmp/fresh-loader-recording/` holds individually decoded frames, vector renders and the live-frame contact sheet.

The earlier nine-reference research remains in the parent design-sources
manifest and images. The supplied recording controls the final implementation.
Changes remain local and uncommitted.

## Smooth exit verification, 2026-11-05

The integrated `LandingLoader.tsx` uses the cloud component for homepage entry
and the phase-aware navigation overlay for public page changes. Navigation
retains its staggered panels, with an820ms overlay fade and420ms wordmark exit;
the existing840ms removal timer allows those animations to finish. Reduced
motion hides the cloud intro and immediately hides the leaving navigation
overlay. No new dependency was added.

Protected optimized build (including TypeScript), scoped formatting and
`git diff --check` pass. Chromium at1728/390/320 verifies progressive opacity,
hidden final overlay, fully revealed hero, actual navigation to `/about`,
navigation-overlay removal, and emulated reduced motion. Sampled animations
were paused and positioned using the Web Animations API for deterministic
intermediate-frame checks. Evidence: `/tmp/freshphones-loader-exit-check.py`,
`/tmp/fresh-loader-exit-results.json`, `/tmp/fresh-loader-exit-midpoint-*.png`,
`/tmp/fresh-loader-exit-complete-*.png`, and
`/tmp/freshphones-loader-exit-build.log`. Firefox and Safari remain unverified.

Brand enhancement verification: Chromium at1440/390/320 with devicePixelRatio2
checks480×480 backing resolution, containment, dismissal and no runtime errors.
Reduced-motion and no-JavaScript checks remain supported. Evidence:
`/tmp/fresh-loader-brand-check.cjs`, `/tmp/fresh-loader-brand-results.json` and
`/tmp/fresh-loader-branded-1440.png` / `-390.png`. Theme changes retain the
previously verified pose data and timing.
