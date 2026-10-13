# Maintained public catalog and availability

Implemented locally on `feature/reports-page`, **2026-10-08**, for scope §4's unit catalog.
The user approved catalog management for **Owner, COO, General Manager and Records**.
Other roles and anonymous callers may browse published listings, but cannot manage them.
Per-offer installment breakdowns are implemented in the subsequent
[payment breakdown increment](44-catalog-installment-breakdown.md).

## Staff workflow

Open **Public catalog** at `/system/catalog`. Search by name, description or listing code;
filter by publication state and availability. The complete directory uses 20-row pagination.

Choose **Add listing**, or **Edit** an existing listing. Each offer has:

- A unique listing code, model/name and Pre-Owned or Brand New condition.
- An optional positive daily advertised rate in PHP; blank displays “Ask for pricing”.
- Availability: Contact us for availability, Available, Limited availability, Sold out or Coming soon.
- Public descriptive text, display order, and a Published checkbox.
- Existing product artwork, a generic illustration, or an uploaded JPG/PNG/WebP photo up to 5 MB.

New listings start hidden with unconfirmed availability. Choose a separate code for each
model/storage/condition offer. Lower display orders appear first. Saved prices are decimal
values; availability is a staff-maintained label, not calculated warehouse stock.

Save listing changes before uploading/replacing/removing a photo. Uploading a product photo
to a published listing makes that photo public. Photos use the existing storage provider
through API routes; no new cloud account is required for local use.

Saving checks the version captured when the editor opened. Competing updates return a
conflict and preserve the draft. **Load latest listing** requires an explicit discard if
there are unsaved changes. Live staff refreshes update the directory and flag an outdated
editor without replacing its draft. Closing a changed draft also requires a discard choice.

## Public behavior

The landing page's existing unit cards now load saved published listings from `GET /api/catalog`.
They display the saved condition, daily rate, description and availability. Public users can
search, filter by availability and page through all published offers. Hidden listings are
excluded from results and counts. The public response omits internal codes, publication
flags, display order, uploader information and raw storage references.

The public catalog refreshes when the window regains focus and every minute while visible.
It shows distinct loading, empty and failure states with retry. It never falls back to stale
hardcoded price cards after a failed request. Existing open screens may retain previously
displayed public content until their next refresh; hiding is not a way to recall downloaded photos.

The public photo route serves only the photo currently attached to a published listing,
with `no-store` caching. Staff can preview a hidden listing's photo through the protected
route. A StoredFile ID cannot be used as a catalog listing ID to fetch a customer document.
Replaced/removed files remain private in storage; automatic retention/deletion is a separate
policy-dependent workstream.

## API and migration

| Route | Access / behavior |
|---|---|
| `GET /api/catalog` | Anonymous; published-only, paged and filtered projection |
| `GET /api/catalog/:id/image` | Anonymous; current photo of a published listing only |
| `GET /api/catalog/items` | `CATALOG_MANAGE`; complete directory |
| `POST /api/catalog/items` | `CATALOG_MANAGE`; create a validated listing |
| `GET /api/catalog/items/:id` | `CATALOG_MANAGE`; exact listing for editing |
| `PATCH /api/catalog/items/:id` | `CATALOG_MANAGE`; captured version plus full editable record |
| `POST /api/catalog/items/:id/image` | `CATALOG_MANAGE`; multipart image plus captured version |
| `POST /api/catalog/items/:id/image/remove` | `CATALOG_MANAGE`; captured version, clears uploaded/stock artwork |
| `GET /api/catalog/items/:id/image` | `CATALOG_MANAGE`; staff photo preview |

Writes recheck the current active actor and catalog permission inside the shared serialized
transaction. Listing changes, before/after audit and minimal staff refresh event commit
together. Invalid/stale writes produce no successful audit/event. Upload failures remove
only the newly written object. Public routes reject attempts to request hidden visibility.

Migration `20261008020000_public_catalog` adds the catalog table, enums, indexes and amount/
order/version constraints. It copies the six previously public cards into independent
database records with their existing names, artwork and daily prices. All six start at
**Contact us for availability**; existing marketing copy is not treated as verified stock.
It does not modify existing batches, contracts, customers, payments, schedules or balances.

There are now **25 active migrations**. The additive migration is applied to the local
preview after a private database backup, and to fresh test databases. Production still
needs the migration as part of a reviewed release. Neon/Better Auth remain documentation
targets; this increment uses the current PostgreSQL/cookie-session implementation.

## Verification and acceptance

Automated checks are in `apps/api-ts/test/catalog.test.ts` and
`apps/api-ts/test/catalog.integration.test.ts`. They cover strict input validation, all
roles and anonymous access, full-backlog filters/paging, published-only projections,
decimal prices, stale/concurrent saves across two API instances, duplicate codes, audit
atomicity, file validation/access and revoked actors. Existing financial records remain
unchanged by catalog actions.

Local verification passed **220 tests**: 57 API unit, 121 PostgreSQL integration and
42 web tests, including the existing local demo-auth checks. Workspace typechecks and
production builds pass. Fresh and preview databases have no Prisma schema drift.
Browser checks against an isolated real API passed creation/publication, saved rates,
availability, uploaded photos, retained drafts during competing edits, explicit discard,
hiding/photo revocation, unauthorized access and failure/retry behavior. Desktop and
390px mobile checks passed, including dark-theme editing and non-overlapping public filters.

Before production acceptance, named business reviewers should confirm the carried-over
prices, availability labels, image rights and public descriptions, then walk through adding,
publishing, hiding, competing edits and photo replacement on desktop and mobile.
