# Verification card glass material

The first gradient/blur treatment below was rejected. Current implementation
follows the close-up Apple Liquid Glass film: clear fill, curved specular rim,
edge displacement and real backdrop transmission. See guide94.

Jaycee requested that the verification card match its sky background and use
iOS glass. The primary material reference is the retained Apple cross-device
Liquid Glass introduction image in `.local/ios-glass-chat/references/` (source
and provenance in guide90). The supplied screenshot controls composition: same
centered heading, supporting copy and verification action above the nature footer.

`LandingContent.module.css` replaces the solid navy card with cool translucent
white/sky gradients, 24px backdrop blur with 145% saturation, a continuous pale
rim, inset lighting and diffuse shadows. Navy heading/body text preserves
contrast over the light material. The cool, low-saturation material matches the
footer sky (#a1dcfa); the existing pink enrollment accent remains elsewhere.
`CtaJoin.tsx` removes the opaque-looking decorative wave artwork. The verification
button uses a brighter glass fill and navy focus ring. Reduced-transparency and
missing-backdrop-filter paths use #d8f0fd. This is a CSS material approximation.

Also completed the preceding dot refinement: the hero dot field is limited to
the left 30% width, softly faded; below 960px it stops above the mascot. The user
clarified that 30% means coverage, not opacity. This supersedes the full-overlay
configuration previously described in guide92.

Retained final screenshots: `/tmp/freshphones-join-glass-desktop.png` and
`/tmp/freshphones-join-glass-mobile.png`. Local preview only; no deployment.
