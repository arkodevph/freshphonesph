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
