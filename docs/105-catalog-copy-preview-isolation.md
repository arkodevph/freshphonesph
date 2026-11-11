# Published catalog copy and isolated local preview builds

The user requested removal of the customer catalog banner that described published
offers as illustrative. Removed that banner and its unused CSS. The portal catalog
intro now says “available installment plans” rather than “sample installments”.
The explicit development sample-catalog mode and backend payment behavior are unchanged.
Browser check `/tmp/fresh-catalog-check.log` confirms no old banner/intro text and
retained search; screenshot `/tmp/fresh-published-catalog.png`.

The user then reported a browser-level load-failure screen during a preview rebuild.
The exact browser failure could not be reproduced. Reloading reports succeeded;
no matching message exists in app source. No kernel OOM evidence was available.
One independently confirmed preview weakness was building into `.next` while the
active server used it. The screenshot alone does not establish that as its cause.

The web preview now alternates `.next-preview-a` / `.next-preview-b` output folders,
building the inactive slot and selecting it for the next start only after success.
The active server keeps its original directory until restarted. Local pointers and
outputs are ignored by Git. Production and landing output behavior are preserved.
Next's documented distDir option is gated to explicit local-preview mode.

During the isolated build, `/tmp/fresh-preview-continuity.py` made twelve rounds of
HTTP checks: reports and all 32 referenced JS/CSS assets returned 200, and the active
`.next/BUILD_ID` stayed unchanged. Evidence `/tmp/fresh-preview-continuity-results.json`.
Shell syntax, formatting and whitespace checks passed. Source paths:
`apps/web/next.config.ts`, `scripts/preview-local-safe.sh`, `.gitignore`, `README.md`.
Obsidian storage is still unavailable; this file is the local handoff.

The isolated optimized build (including TypeScript) passed and both ready/active
pointers are `.next-preview-a`. Restarted the loopback preview and verified the
customer catalog again. CEO reports renders six report buttons and Payments
overview; a real CSV export produces the shared toast. Inspected screenshot
`/tmp/fresh-reports-restored.png`. Build log `/tmp/fresh-isolated-preview-build.log`.
The browser's original failure remains transient and its exact cause unconfirmed.
