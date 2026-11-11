# Staff sidebar cleanup

Primary reference: [Untitled UI sidebar navigation](https://www.untitledui.com/react/components/sidebar-navigations), inspected through OpenCLI on November 9. Candidate comparison and capture inventory: `/home/nami/.agent-reach/design-references/freshphones-sidebar-20261109/notes.md`.

The staff sidebar now puts Dashboard first and groups destinations into Workspace,
People, Operations and Administration. Empty groups disappear after existing
permission filters run. It uses the shared Solar Linear icons already used in
the customer portal, 20px icons, 44px minimum rows, readable labels, a clear blue
selected page and a fixed account footer. Nested routes keep their parent active.
The screenshot's uninterrupted list and repeated generic people icons were the
negative reference. Freshphones colors remain: neutral surfaces, muted secondary
labels, blue only for selection. Both themes were rendered and inspected.

Configuration and rendering now live in `system-navigation.ts` and `SystemSidebar.tsx`.
The shared search accepts an icon component rather than requiring a Phosphor-specific
type. CEO desktop/mobile menu order and icons remain as before. Page bodies and
permissions were not changed by this sidebar work. The horizontal mobile navigation
remains scrollable; a future mobile drawer is outside this pass.

Protected optimized build and TypeScript passed. Existing 11 public navigation/site
link tests and three role workspace tests passed. Browser checks confirm Solar icons
on every sidebar destination, Dashboard first, exactly one selected page, no duplicate
links, keyboard focus, bottom-item/footer reachability, mobile scrolling, preserved
CEO navigation and no page errors. Retained screenshots and verification script:
`.local/sidebar-20261109`. Preview: localhost:3000, `.next-preview-b`,
build `4LJ1lJWhGbIVX_RlJbmy1`. User acceptance and deployed behavior are unverified.
