# CEO loading layout and code boundaries

The CEO dashboard is the visual reference for its own skeleton. It keeps the
existing glass surfaces, blue/lilac status palette, panel grid, typography and
responsive breakpoints. Neutral placeholders inherit the surrounding text color
at low opacity; they do not imply an amount, status or measured progress.

## Loading correction

The original slow-response browser reproduction changed the collections panel
from 406.59px to 576.09px. Its loading message omitted the chart and the batch
table used a single placeholder row. Monthly insight also omitted its selector
and bars. General account and route loading could show an unrelated three-card
and table layout on the CEO page.

The dashboard is now composed in `app/system/ceo-dashboard/`. Each panel owns
its rendering, `useCeoOverview.ts` owns requests/state, and `CeoDashboard.tsx`
is a ten-line entry point. `CeoDashboardLayout` composes the same panels for the
live page and the CEO skeleton, avoiding a second copy of the dashboard markup.
Repeated status rows and placeholder rows are rendered from arrays.

The account gate and route fallback use this shared CEO skeleton once the
identity is verified. Prior to identity, a neutral session indicator avoids
guessing the user's role/navigation. Descendants reuse the layout's verified
identity through context; this is display state, not an authorization decision.
API authorization and notice acknowledgment requirements remain in place.
Skeleton-only controls are inert. Background refresh retains existing figures;
errors and empty results remain distinct from pending requests. Skeleton motion
respects reduced-motion settings.

## Readability and credential rules

AGENTS.md now records feature organization, small composing page files, dedicated
hooks/API modules, reuse of genuine repeated logic, pure transformations and
server-only private credentials. NestJS retains its established service classes.
The repository formatter applied existing conventions to 63 source files; its
AST comparison checks that formatting preserves runtime syntax. Alternate
`.next-*` build output is excluded from formatting and Git.

`node scripts/check-client-secrets.mjs` scans browser source without printing
credential values. The normal web/landing build commands run it first. It rejects
private environment reads and sensitive NEXT_PUBLIC variable names, and checks
high-confidence embedded provider-key patterns. The script test checks public
configuration, server API exclusion, private reads, public secret names,
server-only modules and redacted diagnostics. This bounded scan is a regression
guard, not proof that every conceivable secret encoding is detectable.

## Verification

- Chromium fixture comparison at 1440 light/dark, 1024, 768, 390 and 320 dark:
  all six panels have identical loading/loaded x, y, width and height; no overflow
  or page errors. Exact geometry is for the fixture's six months and five batches.
  Real amounts and empty/variable row counts can change content size naturally.
- Dedicated checks cover failed/empty responses, refresh retention and account
  gate fallback. Verified descendants issue one shared identity request.
- Web regression: 187 passing tests. API regression: 126 passing tests using
  `.local/gcash-reading/venv/bin/python` via server-only `GCASH_PYTHON_BIN`.
  Without that documented environment, five PDF tests fail on missing pypdf.
- Browser credential scan: 378 files, zero findings. Its rejection test passes.
- Web/API TypeScript, source formatting and whitespace checks pass.
- An isolated optimized web build is recorded in `/tmp/ceo-skeleton-build-final.log`.

Browser scripts/results are retained in `.local/ceo-skeleton/`; screenshots and
additional state evidence are under `/tmp/ceo-*`. All browser APIs are synthetic
fixtures. Live data, other browsers and production acceptance are unverified.
The CEO changes remain local and separate from landing-only PR #15.
