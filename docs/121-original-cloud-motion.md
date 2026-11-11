# Original cloud motion restored

The user requested the old motion alone on November 9. This supersedes the
combined entrance/turn/docking direction in document 119.

The controlling reference is `LandingCloudIntro.tsx` at `8a0587b` and its
`landing-cloud-frames.json`. The frame file is byte-for-byte identical to that
commit. The canvas now replays those recorded paths with the original intervals,
loop duration (1083.333ms), gradient and 5200ms initial playback. There is no
edge entrance, interpolated circle reconstruction, parent orbit, or logo flight.
The rejected combined sequence is the negative reference: added movement changed
the user's requested motion instead of reproducing it.

The existing preview backdrop and centered responsive container remain. The
240-by-240 recording keeps its original aspect ratio. Skip, Escape, reduced
motion, resize cleanup, navigation readiness and timeout recovery are retained.
Public navigation uses the same old loop and releases after one loop when the
route is ready; it continues looping while waiting for the route.

Implementation is limited to the intro component, motion hook and its styles.

Verification passed on localhost:3000: original frame pixel equality, 36 changing
frames, no combined phases/particles, normal navigation, mobile Skip, Escape,
reduced motion and no browser errors. The optimized build and TypeScript passed.
Evidence: `.local/original-loader-20261109`. Current preview build after sidebar
work: `4LJ1lJWhGbIVX_RlJbmy1` in `.next-preview-b`.
