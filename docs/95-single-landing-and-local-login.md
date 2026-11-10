# Single landing implementation and local login

V2 is now the sole public implementation. Its components, styles and local font
live directly in `apps/web/components/`. Both homepage exports use `LandingPage`;
the duplicated `landing-v2/` directory and original `app/landing.css` are removed.
Unused original landing sections and superseded cloud-divider/halftone components
are removed too. `/v2` permanently redirects to `/` in both apps.

About, careers, enrollment and support use the promoted shared header/footer.
These components carry their own Sono typography so they retain the V2 treatment
outside the homepage wrapper. The homepage retains one continuous landscape
behind the join card and footer; secondary pages give the footer its own scene.

The existing customer catalog is preserved as `PortalCatalog` with its own
`PortalCatalogBreakdown` and styles. This retains portal-specific filtering,
mobile details, payment previews and theme behavior while allowing the public
catalog to use the V2 composition.

## Login diagnosis

The reported `localhost:3000/login` connection refusal reproduced with curl.
The web server and preview API were stopped. Started the protected web launcher,
existing local PostgreSQL cluster and preview API. The API initially allowed
origin `http://localhost:3001`, which blocked the login browser on port3000.
Corrected `WEB_ORIGIN` in the ignored `apps/api-ts/.env.preview` to
`http://localhost:3000` and restarted the API. No secrets/configuration committed.

Active local ports: landing3001, integrated web/login3000, preview API4101 and
PostgreSQL5548. The separate web/API services must be running for login.

## Verification

- Production standalone landing build, both app TypeScript checks, scoped
  formatting and whitespace checks pass.
- Six FAQ and workspace-policy tests pass.
- Clicked Log in from the landing page and reached the login form. Selected the
  existing Owner/CEO local preview; it reached `/system`, and `/api/auth/me`
  returned200 with roleCEO. Normal account passwords were not entered.
- Browser navigation through `/v2` ends at `/`. Inspected homepage, restored
  login, desktop About and mobile390px About screenshots under
  `/tmp/freshphones-v2-only-*` and `/tmp/freshphones-login-restored.png`.
- Development preload warnings remain. An early automated interaction with the
  preview disclosure before hydration produced an attribute warning; reloaded
  and used the hydrated UI successfully. Safari/Firefox and physical devices
  remain unverified.
