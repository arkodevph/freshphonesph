# Landing page release

This branch packages the existing public-site design onto `main` independently
of the local operations, portal and Fresh AI work. It includes the V2 homepage,
About, inquiry and careers presentation, shared public navigation feedback,
responsive catalog dropdown, bundled Sono font, mascot story frames and branded
cloud intro. The retained `/v2` public pages remain available.

Apply links go directly to `/inquire`. Both `/enroll` and `/v2/enroll` redirect
to that existing workflow. The editable enrollment backend is deliberately outside
this release; main's API, contracts and operational workspaces are unchanged.

The cloud intro's contours and pose timing were traced from the user-supplied
recording of Oleksandr Pronskyi's Cloud loader micro animation. Brand color and
text adapt the animation to Fresh Phones PH. This release does not assert that
the source animation is original Fresh Phones artwork.

## Verification

- Standalone landing production build and TypeScript pass (29 generated pages).
- Integrated web production build and TypeScript pass (52 generated pages).
- Nine public navigation and site-link behavior tests pass.
- Scoped Prettier and `git diff --check` pass.
- Chromium smoke checks and screenshots are recorded locally under
  `/tmp/fresh-landing-*`; final results are summarized in the PR.

Production deployment, real inquiry submission and non-Chromium acceptance are
separate from this packaging verification. Browser API responses are read-only
fixtures; no customer inquiry is submitted during the smoke check.

## Integration with the operations branch — November 6, 2026

The release was merged into `feature/gcash-review-workspace`, which already
contains the editable enrollment backend and newer portal workflows. That
integration retains `/enroll`, its application form and the existing fixed
navigation/page clearance. The inquiry redirects and sticky navigation described
by the isolated release are not applied to this combined branch.

The combined result includes the cloud intro, smoother navigation-loader exit,
viewport-fitting animated catalog dropdown, uncropped first story frame and
compact verification panel. Cloud-intro styling is scoped separately from the
pending page-navigation overlay. Newer local About, Support and icon-hover
refinements are preserved during the merge.

## Opening intro revision — November 6, 2026

Jaycee requested circles from the screen edges gathering into a central cloud,
then moving into the Fresh Phones navbar logo, following the handoff in the
confirmed local Smartway reference. The opening intro now uses seven original
SVG circles and a connecting base instead of the imported contour frames.
Runtime logo measurement sets the flight destination on desktop and phones;
the backdrop fades during the flight and the actual logo crossfades in.
Smartway artwork is not included.

Circles are visible at the edges before hydration. Skip intro, Escape,
reduced-motion preferences and interrupted playback restore the page, with
CSS/JavaScript failure timeouts and a no-JavaScript fallback. The existing
pending page-navigation overlay and return-home behavior remain in use.

Local validation covers natural playback at 320–1920px, exact logo alignment,
skip/focus, resize, motion preferences, no JavaScript and client return on the
shared public components. Controlled animation checkpoints are saved under
`.local/cloud-logo-intro-20261106/`; final visual acceptance remains with Jaycee.

Jaycee's follow-up adds a full clockwise circle before cloud formation: the
edge dots arrive in a ring, rotate together, then merge into the same cloud and
continue to the navbar. The full opening sequence is about 3.6 seconds after
hydration. Follow-up motion checkpoints and interruption checks are recorded
under `.local/cloud-logo-orbit-20261106/`.

The next correction replaces the seven dots with four larger orbiting circles.
Jaycee also resumed the previously deferred request to use this sequence for
public page transitions. Navigation now shares the cloud animation, holds the
formed cloud until the destination commits and measures that page's logo for
the handoff. Navbar, footer and page actions use the same client link wrapper;
browser back/forward is covered, and returning home avoids a duplicate intro.
Skip/Escape, reduced motion, native no-JavaScript links and the existing
15-second failed-navigation recovery remain available. The obsolete wordmark
and sliding-panel module is removed. Follow-up evidence is recorded under
`.local/cloud-four-navigation-20261106/`.
