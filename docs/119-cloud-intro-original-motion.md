> Superseded by [121 — Original cloud motion restored](121-original-cloud-motion.md). The user explicitly rejected combining the motions.

# Smooth combined cloud intro

The November 9 request keeps the new edge entrance and flight into the navbar,
combined with the earlier separate-turn-reform movement in the middle.

A first combination swapped from the new vector circles to recorded path frames.
The browser measured an abrupt opacity jump of 1 at this join; replaying the
coarse contours also stepped between poses. The user rejected the stutter.

The final sequence keeps the same four SVG circles throughout. The edge entrance stops with separate pieces at the earlier motion's
first diamond pose. After a short centered pause, native Web Animations
interpolate the old diamond/square turn and form the cloud exactly once. The connecting base stays hidden through entrance and rotation, then fades
in only during the final join. There is no rotating parent group,
recorded-frame playback or switch to a different cloud drawing. The completed
cloud waits for the route and uses the existing logo flight.

Skip, Escape, reduced motion, resize cleanup and failed-navigation recovery
remain. The original traced frame file stays available as historical reference.
Reference: earlier local LandingCloudIntro.tsx at 8a0587b, retained poses,
and the user's November 9 screenshots and corrections.

## Verification

Protected optimized build and TypeScript checks passed. Running preview: http://localhost:3000, build SQZEkM3BviFsudwkUfIRA in .next-preview-b. Browser checks cover all motion stages, page navigation, mobile Skip, Escape, reduced motion and no page errors. Measured cloud-layer opacity jump changed from 1 to 0. Report values fit at 1720, 1280, 768, 390 and 320px; light/dark screenshots are retained in .local/cloud-reports-20261109. Four existing web test files, scoped formatting and whitespace checks passed. User acceptance and production behavior remain unverified.

Sequence correction: the user rejected assembling a cloud before the middle
turn. The entrance must end separated, and its last pose must equal the first
middle pose. The browser sequence regression fails on the earlier assembled
entrance and checks this equality plus the hidden base. Earlier verification is superseded where it describes the pre-correction sequence.

Resumed verification on November 9 confirmed the corrected sequence on the running
optimized preview. All four entrance endpoints exactly match their middle-animation
start transforms; the base opacity is zero during the turn and the parent has no
rotation. The browser observed all six phases, 59 changing vector poses, successful
public navigation, mobile Skip, Escape, reduced motion, and no page errors.
Desktop separated/turn screenshots and mobile entrance were visually inspected.
The retained regression is `.local/cloud-reports-20261109/freshphones-sequence-check.cjs`.
Scoped Prettier and whitespace checks passed. No further source change was needed.
