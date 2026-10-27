# Vercel presentation demo

Deploy `apps/web` for the staff system and customer portal presentation. The public
landing site remains a separate Vercel project rooted at `apps/landing`.

This demo uses fictional fixtures, requires no database or API server, and offers
all 11 roles from `/login`. It is read only: changes, uploads, password recovery,
email delivery and other writes return a presentation message. Choosing a role
sets only a demo-role cookie; this is not production authentication. Refreshing a
page retains the chosen role. Sign out clears it; Switch role returns to the selector.

## Deploy in Vercel

1. Push the project files to your Git repository, including the new presentation
   files and `apps/web/vercel.json`. Keep private `.env` files out of Git.
2. Import the repository as a **new Vercel project** for the system demo.
   Choose a deployment branch that contains the presentation changes; an existing
   `main` deployment will not include unmerged work from another branch.
3. Choose **Next.js** and set **Root Directory** to **`apps/web`**.
4. Enable **Include source files outside of the Root Directory** so Vercel can
   build `packages/contracts` from the workspace.
5. Keep the install/build commands from `apps/web/vercel.json`. They install the
   workspace dependencies, build the contracts, and build the presentation using
   Webpack. Keep the framework's default Output Directory.
6. Deploy, open `/login`, and select Owner, Finance officer, Records, or Customer
   to present the corresponding workspace. Other staff roles are also available.

No environment credentials are needed. The Vercel configuration enables
`NEXT_PUBLIC_PRESENTATION_MODE=true` for the demo build and deployment. Remove any
existing dashboard override setting that flag to false. No API proxy is used in
presentation mode, and API calls stay on the deployed Vercel origin.

Optional: set `NEXT_PUBLIC_LANDING_URL` to the public landing site's HTTPS origin
before building. Without it, the login page's website links return to `/login`
instead of pointing at a local development server. After the demo has a URL, set
the landing project's `NEXT_PUBLIC_SYSTEM_URL` to that origin and rebuild the
landing site to connect its Login Portal button.

## What to present

- Owner dashboard with sample collection totals and customer follow-up.
- Records, batches, clients, schedules and balances.
- Finance payment lists and verification dialogs (saving is disabled).
- Task assignments, support conversations, recruitment and account directory.
- Customer overview, payment schedule, payment history, documents and support.
- Search, filters, dialogs, navigation, light/dark theme and role switching.

Some secondary queues/settings show empty states. This demo does not simulate
durable edits, real identity checks, live events, file storage or delivery of
email. The presentation label stays visible and the demo requests no search
indexing. All demo identities use `example.com`; no real customer data is seeded.

## Local verification

Verified on 2026-10-22: the production build/TypeScript check, all 28 web test
files, frozen offline lockfile validation, and changed-source formatting passed.
Browser checks loaded 14 staff pages and all eight customer sections. A final
pass confirmed Owner/Finance/Customer role selection, refresh, sign-out and
unauthenticated redirects, no mobile overflow or label/navigation overlap, no
browser exceptions, and no external service requests. Vercel hosting itself has
not been tested; deployment is left to the user.

From the repository root:

```bash
pnpm --filter @freshphones/contracts build
NEXT_PUBLIC_PRESENTATION_MODE=true pnpm --filter @fresh/web exec next build --webpack
NEXT_PUBLIC_PRESENTATION_MODE=true pnpm --filter @fresh/web start
```

Then open `http://localhost:3000/login`. No API, Redis, Docker or database process
is required. For a development preview, use the same flag with the existing
protected `pnpm --filter @fresh/web dev:safe --hostname 127.0.0.1` command.

## Returning to a real deployment

The regular local build leaves presentation mode disabled unless explicitly set.
The included **Vercel configuration is specifically for the presentation**. Before
using this Vercel project with real services, replace its presentation build
command and environment setting, rebuild with the flag disabled, configure the
real API/authentication, and complete the production acceptance requirements.
The production Render preparation remains in [56-render-deployment.md](56-render-deployment.md).
