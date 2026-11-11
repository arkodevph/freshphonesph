# CEO true-black dark theme

User correction, 10 November 2026: CEO dark mode must use black rather than blue.
Scoped palette change: retain the existing Pay Key composition, navigation, chart
colors, semantic accents and branded balance artwork. The retained supplied
reference `.local/ceo-home-glass/primary-pay-key-reference.png` was reopened;
it controls the existing composition, while the user's written correction
supersedes the former slate/navy dark material documented in docs/100.

Negative example: `.local/ceo-black-20261110/before.png` shows the prior navy
canvas and blue-grey panels. Replace those surfaces with #000 canvas, neutral
#0d0d0d panels, #141414 menus and white-alpha controls/rims. The CEO assistant
uses the same black/neutral surface roles. Shared system tokens are scoped to
the CEO shell; light mode and other roles have independent palettes.

Verification: formatting and TypeScript pass. See session record for final
optimized-build and browser evidence; user acceptance remains unknown.

The running optimized CEO Reports preview was inspected: shell background computed
rgb(0,0,0), backgroundImage none. Dark desktop/mobile and light screenshots are
retained in `.local/ceo-reports-20261110/`. This also verifies inherited report
surfaces after the shell-token correction. The assistant dark token definitions
were changed to the same neutral palette; its conversation flow was not exercised.
