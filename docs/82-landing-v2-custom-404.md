# Fresh Phones custom 404

Requested by Jaycee on 2026-11-02 after visiting `/v` on the standalone landing
site. Missing URLs now show a branded recovery page. The V1 and V2 homepages
are unchanged.

## Design and recovery

Goal: a visitor arriving at a broken URL understands what happened and can
return to the V2 homepage, browse units, or contact support. The page needs no
catalog request, account session, or JavaScript to provide those links.

The existing Nunito font, blue palette, wordmark and transparent cloud mascot
provide continuity with the landing page. A spacious two-column scene becomes
a single column on narrow screens, with the message and recovery links first.
The mascot gently floats only when reduced motion is not requested. Artwork
is decorative and hidden from assistive technology; the visible 404 label,
page title, heading and link text convey the state and choices.

Skills: `user-expi` → `ui-design-index`, landing/recovery surface. The index's
optional `ui-landing-patterns` category file is not installed; the existing
Fresh Phones source supplies the visual reference. Selected patterns are a
simple hero composition, one visually prominent recovery action, and CSS
motion with a static reduced-motion state. No animation or UI package added.

## Evidence and limits

| Source | Evidence and boundary | Decision and verification |
| --- | --- | --- |
| [W3C: Link purpose](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html) | Strong standards basis: understandable link labels support navigation. This is not a measured usability result for Fresh Phones. | Explicit home, available-units and support labels; verify actual destinations and keyboard activation. |
| [W3C: Target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Strong standards basis, with a useful correction: AA minimum is 24 CSS px or qualifying spacing/exceptions, not a universal 44/48px rule. | Choose 52px primary/secondary actions and a 44px support target as comfortable local design choices; verify narrow-screen bounds, spacing and focus visibility. |

Browser checks can establish layout, navigation and input behavior. They cannot
establish visitor preference or improved recovery rates without user observation.

## Implementation choice

Reviewed the installed Next.js 16.2.9 `not-found` guide and the upstream
[Next.js access-error fallback source](https://github.com/vercel/next.js/blob/canary/packages/next/src/client/components/http-access-fallback/error-fallback.tsx).
The default fallback supplies a plain error message and inline light/dark styles.
The native root `not-found.tsx` convention supports a branded component while
retaining normal routing and 404 handling. The alternative experimental
`global-not-found` convention bypasses the root layout and requires separate
font/style wiring; it is unnecessary for these single-root apps.

Reuse native handling with local presentation in
`apps/web/components/landing-v2/NotFoundPage.tsx` and its CSS Module. Both apps'
root `not-found.tsx` files reuse that component and export its metadata. This
uses the installed framework's error-metadata collection and avoids duplicate
title elements from mixing a React title with the root layout's metadata.

The recovery homepage is `/v2` for this V2 preview. Enrollment, support and other
existing pages keep their established URLs. CSS is module-scoped and the shared
mascot asset is read-only. There are no API, database, auth or finance changes.

## Local review

Visit <http://localhost:3001/v> or any other missing path, including nested
paths under `/v2`. The integrated app uses the same component for missing URLs.
Check HTTP 404, noindex metadata, the title, image loading, keyboard recovery,
desktop/mobile layout, reduced motion and JavaScript-disabled navigation.
Existing `/` and `/v2` must continue to return 200.

Validation completed locally on 2026-11-02: both protected optimized builds and
their TypeScript checks pass, as does scoped Prettier checking. Ten browser
groups across ports 3001/3000 verify 1440/390/320px, real HTTP 404, a single
correct title/noindex, image loading, no horizontal overflow, link target sizes,
visible focus and keyboard recovery, nested missing URLs, dark preference,
reduced/normal motion and no-JavaScript recovery. Both homepages return 200;
all 35 original landing source hashes match. Zero browser page errors.
Evidence is ignored under `.local/custom-404/`. Local only; no deployment.
