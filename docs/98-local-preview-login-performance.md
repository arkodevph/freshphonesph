# Local preview sign-in performance

The reported sign-in delay came from on-demand development compilation. Logs
showed the local demo-login endpoint spending6.2 seconds compiling and the first
dashboard request spending7.6 seconds compiling. A cold personnel-page request
took13.734 seconds. Authentication itself returned200 in approximately0.13 seconds.

Built the current source through the protected `preview:build` launcher, then
replaced the development server on port3000 with the optimized local preview.
The API remains on4101 and the existing preview PostgreSQL cluster remains on5548.
No account data or authentication policy was changed.

The launcher now accepts `FRESHPHONES_PREVIEW_API_ENV` for its database safety
check. Its default remains `../api-ts/.env`; this session explicitly selects
`../api-ts/.env.preview`, the configuration used by the running API. The check
still requires a loopback development database ending in `_preview`.

Optimized preview scopes use `freshphones-web-optimized-preview.scope` and
`freshphones-landing-optimized-preview.scope`, avoiding the development launcher's
scope name. The initial switch hit an existing development scope; the final
instance was confirmed through the optimized server startup log and production
chunk filenames. The development preview is stopped.

The existing ignored private `app/api/demo-login/route.ts` helper was repaired
to honor both explicit local-preview flags in optimized mode. It still returns404
in normal production, requires the server-side demo credential, and rejects
non-loopback request/API hosts and mismatched origins. A controlled test confirmed
normal-production404, external-host403, mismatched-origin403 and explicit local
preview200. No credentials or session cookies were printed. This private helper
remains ignored and is not included in tracked changes.

## Measured result

Fresh Chromium context, first CEO sign-in after the successful server switch:

- Click to `/system`:287ms (request timestamp1186ms; navigation complete1473ms).
- Demo-login POST:144ms.
- Identity request:18ms; security request:34ms.
- `/system` response:15ms; production page/layout chunks returned200.
- Personnel-page request:20ms, versus13.734 seconds in development.

These are local measurements, not a production latency guarantee. Build passed;
the launcher shell syntax/whitespace checks and local helper guard checks passed.
Redis/worker unavailability is unchanged and was not the cause of the observed
compilation delay. Password-entry login, all roles and other browsers were not
retested in this performance session.

Evidence: `/tmp/freshphones-fast-preview-build.log`,
`/tmp/freshphones-fast-preview.log`, `/tmp/fresh-login-timing.cjs` and
`/tmp/fresh-demo-route-check.ts`. Current preview uses the built source snapshot;
future source changes require rebuilding. Refresh an already-open development
tab once after switching servers.
