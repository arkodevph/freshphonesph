# Public help and support entry

Implemented locally on `feature/reports-page`, 2026-10-08, for scope §4's requirement
to start or follow a concern after login. The public page is `/support`.

## Visitor and customer journey

The website navigation, FAQ, join section and footer link to Help & Support. Existing
customers can choose **Start a support request** or **View my requests**. These open
`/portal/support#new-request` and `/portal/support#request-history` respectively.

Signed-in customers go directly to the existing portal form or history section. Signed-out
visitors are sent to login, with their support destination preserved. Failed login leaves
that destination intact. Successful sign-in returns the customer to the chosen section,
scrolls it into view and focuses it. The introductory portal tour does not interrupt entry
into Support. Normal sign-in without a support destination keeps its usual role landing page.

Session expiry from Support also preserves its destination. Existing exact conversation
links (`#case-<id>`) can survive sign-in and continue to use the portal's own-case lookup.
The redirect helper accepts only the support route and known section/case anchors; arbitrary
external URLs, other app routes and encoded/traversal alternatives are ignored. Staff with
`SUPPORT_MANAGE` are directed to `/system/support`; other employees go to their dashboard.
These navigation choices do not grant permissions; API guards still enforce access.

People without a portal account, or who cannot sign in, can use the existing Fresh Phones
PH Messenger, Facebook page and telephone links shown on the help page. Login also links
to those options. The contacts are carried over from the website, with no invented hours,
response-time promise or new public collection form. Following an external contact link
does not create a tracked portal case automatically.

## Existing case workflow

Customers submit a category and description through the existing authenticated
`POST /api/portal/support` route. They can list only their own requests, view a conversation,
reply, and follow its status and customer-visible resolution. Customer Service retains its
existing assignment, reply, resolution and notification workflow. This increment does not
add anonymous ticket submission or public case lookup.

No API implementation, database migration, role grant, external messaging integration or
email provider is added. The database remains at 26 migrations. Neon/Better Auth remain
documentation targets; the current local authentication handles this flow.

## Verification and acceptance

`apps/web/test/support-entry.test.ts` covers support destinations, redirect rejection,
role-based routing, normal-login behavior and authenticated request/reply adapters.
All **52 web tests** and the Next.js production build with TypeScript checks pass.
Four live browser groups pass against an isolated PostgreSQL-backed API: public contacts
and 320/390px layouts; failed/successful login and section focus; customer request,
staff response, status and customer reply; session expiry, exact case links, own-case
isolation, anonymous denial, staff access and unsafe redirect rejection. No browser
page errors were observed.
Named business reviewers still need to confirm contact details and public wording, and
complete customer/Customer Service UAT. Production publishing remains a release task.
