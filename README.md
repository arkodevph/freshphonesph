# Fresh Phones PH

Integrated web system and portal for Fresh Phones PH's Paluwagan operations. The product
centralizes batches, clients, externally made payment records, Finance verification, customer
status, tasks and KPI review, reporting, support, recruitment, agent verification, and
notifications.

## Canonical local checkout

Use `/home/jaycee/Projects/freshphonesph` for local work. It points to this checkout at
`/home/jaycee/Projects/freshphonesph-main-run`. The previous duplicate checkout is preserved as
`freshphonesph-legacy` and refuses to start the dev server, so it cannot serve the old login page.

The target stack uses TypeScript for both deployables:

- Next.js 16 and React 19 web app on Vercel
- NestJS REST API on Railway
- Prisma migrations with Supabase PostgreSQL
- private Supabase Storage through signed S3-compatible URLs
- Resend transactional email

The repository currently includes a working Django API baseline. It remains migration evidence
until each NestJS vertical slice reaches behavioral parity and passes its cutover gate.

## Start here

- [Project documentation](docs/README.md)
- [Full Scope v5 implementation workflow](docs/17-full-scope-workflow.md)
- [Scope traceability matrix](docs/18-scope-traceability-matrix.md)
- [Current Django baseline](docs/BUILD_STATUS.md)
- [Contributor and AI-agent guide](AGENTS.md)
- [Branch flow: feature and fix → staging → main](docs/24-branch-flow.md)

## Non-negotiable boundaries

- Customers pay outside the website. Staff record claims; Finance verifies them.
- Only verified payments affect the derived customer balance.
- The system never computes or applies wage deductions.
- Statements and confirmations are operational documents, not official BIR invoices.
- Public agent verification exposes only name, masked code, and active status.
- Authorization is enforced by the API, not only by the interface.

## Run the current baseline

```bash
./freshphones.sh
```

This starts the local infrastructure, TypeScript API at `http://localhost:4101`, and web app at
`http://localhost:3000` together. See [AGENTS.md](AGENTS.md) for setup details and local accounts.
