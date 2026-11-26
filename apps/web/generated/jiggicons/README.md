# Jiggicons copied source

Generated from jiggicons@0.1.2 (Adrian Abelarde), inspected 2026-11-25.
Source: https://registry.npmjs.org/jiggicons/-/jiggicons-0.1.2.tgz
Docs: https://jiggicons.com/docs/javascript

The src/ tree is an unmodified copy of the dependency-free upstream runtime.
Its types are copied from the package root. icons.json contains only the 25
free icons used by Fresh Phones, with glass SVG markup and original motion data.
Other SVG variants are omitted. Drawings and choreography are unchanged.

Runtime code is MIT; drawings, motions and sounds use the Jiggicons terms.
See LICENSE.md. Audio remains disabled in the app. No npm package was installed.

The React wrapper creates stable per-instance IDs, binds the containing control
and disposes the trigger/animation on unmount. Re-entry while a motion is running
lets it settle without restarting its spring. Preference changes stop motion.

Freshphones now authors object-specific choreography outside this retained source
in components/jiggicons-choreography.json and components/jiggicons-motion.ts.
The adapter also separates Home's door and the parcel lid, and gives selected
hinges a 3D axis. The source data/runtime here remain unchanged and attributed.
