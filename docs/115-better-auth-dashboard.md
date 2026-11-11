# Better Auth dashboard connection

The API registers `dash()` from `@better-auth/infra`. Its key belongs only in
ignored API environment files as `BETTER_AUTH_API_KEY`.

The NestJS facade exposes these GET endpoints under `/api/auth/dash`:
`config`, `list-users`, `user-stats`, `user-graph-data`, and `user-retention-data`.
Requests pass through the plugin's signed JWT verification, including its
API-key hash check. A normal Freshphones browser session does not authorize Dash.
Responses are not cached. Existing ingress and authentication abuse limits apply.

Dashboard account writes are not exposed. Account provisioning, role changes,
password/security actions and business records retain the application's existing
authorization and audit paths. The raw Better Auth handler and local demo plugin
are not exposed as a catch-all.

## Local connection

Configure the ngrok account credential locally, then tunnel the API port:

```bash
npx ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
npx ngrok http 4101
```

In the hosted dashboard, use the generated HTTPS origin as Base URL, `/api/auth`
as Base Path, and leave custom headers empty. The plugin handles signed dashboard
authentication. Port 3000 is the web preview and is not the auth API.

## Verification

```bash
node scripts/check-dash-connection.mjs
```

The check failed before routing was added (404 rather than 401 for `config`).
After the fix, read routes reject unsigned requests through Dash (401), and
account mutation routes remain absent (404). A live demo login also passes;
its browser session is rejected by Dash. API types, 35 API unit tests, scoped
formatting and database health pass.

Hosted signed requests remain unverified until an authenticated ngrok tunnel and
dashboard connection are available. A 401 from an unsigned local probe verifies
the routing and denial behavior, not a successful hosted connection.
