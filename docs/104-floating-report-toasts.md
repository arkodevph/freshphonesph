# Floating stacked report confirmations

The user requested floating notifications that stack when several arrive, replacing
the inline CSV download confirmation shown in `/tmp/codex-clipboard-UGJsxZ.png`.

Primary interaction reference: [Sonner live demo](https://sonner.emilkowal.ski/),
[MIT source](https://github.com/emilkowalski/sonner). Visually inspected the live
four-notification stack; screenshot `/tmp/fresh-sonner-reference.png`.
React Hot Toast was considered; Sonner directly matches the compact layered stack.

One root AppToaster supports all routes without remounting on navigation. Reports
now emit success events directly after successful export or snapshot save. Each
event gets a distinct notification, including repeated identical messages. Three
cards are visible in the collapsed stack; hover/focus expands it. The library owns
queueing, swipe/close dismissal, live-region announcements, timer pausing and
reduced-motion styling. Lifetime is six seconds. The viewport is bottom-right with
24px desktop / 16px mobile inset. Existing inline load and validation errors remain
attached to their relevant controls. The subsequent universal rollout below supersedes the initial reports-only scope.

Palette adapts the product's cool neutral glass surface and light/dark text, with
a small green success icon and explicit message. High-opacity surfaces preserve
legibility over varying content. No page space is reserved for confirmations.
Unknown: physical devices and assistive-technology listening tests.

## Universal rollout and compact report strip

The user's follow-up expands the scope to customer through CEO. Existing action
notice setters across customer support, public recruitment, security, client and
record management, payments, catalog, notifications, staff tasks, HR, enrollment,
documents, email settings and withdrawals now use `useToastNotice`. This adapter
keeps existing form view-model types, leaves inline notice slots empty and emits
one toast per nonempty setter call, including repeated identical text. Clears do
not dismiss unrelated delivered notifications; functional setter updates retain
their prior-value semantics. Team, payments and GCash custom floating renderers
now use the same Sonner stack. GCash loading updates into completion rather than
leaving an indefinite spinner. Recruitment and retention action feedback and
customer security confirmations also use the shared stack. Persistent security
instructions and field/load errors remain in context.

Dark-mode colors are defined on the toast itself because the root-mounted
viewport sits outside workspace theme containers. Screenshot review caught and
corrected inherited light-mode text on a dark toast.

The CEO report strip now uses width:fit-content with max-width:100%, 4px padding
and gaps, and concentric 13px/8px corners across the 5px rim/inset. It hugs its six
tabs at desktop and preserves horizontal scrolling on narrow screens.

Unit check: `test/toast-notice.test.ts` verifies repeated messages stack with
distinct IDs, functional updates work, and reset leaves delivered notifications.

## Verified result

Optimized universal build and TypeScript passed. The event-adapter unit test and
Git whitespace check passed. Real CSV exports produced five distinct toasts with
three visible at 1440/390/320px; expanded stacks, close dismissal, six-second expiry,
viewport bounds, no layout shift and 16px card radius passed. Dark text computed
rgb(242,242,243) on the corrected dark surface; desktop light and expanded mobile
dark screenshots were inspected against the Sonner stack reference.

A customer support form check intercepted all POSTs locally (no tickets/messages
sent): three repeated submissions produced three distinct floating notifications.
Inspected `/tmp/fresh-customer-toast-stack.png`. CEO compact strip verified 732px
at a 1440px viewport, 5px trailing inset and six 44px targets; inspected
`/tmp/fresh-compact-report-strip.png`. Alt+T focused the shared stack, its container
announces politely, and emulated reduced motion computed transition 0s / animation
none. Screen-reader listening, physical devices and every role's mutation path
remain untested.

Evidence: `/tmp/fresh-universal-build.log`, `/tmp/fresh-universal-browser-check.log`,
`/tmp/fresh-toasts-results.json`, `/tmp/fresh-universal-role-check.log`,
`/tmp/fresh-universal-role-results.json`, `/tmp/fresh-toast-notice-test.log`.
Obsidian storage remains unavailable; this document is the local durable handoff.
