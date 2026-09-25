# PR: `foundation` → `main` — Integrated Web System (V1 core)

> Paste this as the PR description when opening `foundation → main`.
> **Do not merge until the team reviews** (owned apps: each dev should check their module).

## Summary
Builds the Fresh Phones PH Integrated Web System from the landing page into a full **Django REST
+ Next.js** monorepo implementing **8 of 11 modules** end-to-end, with role-aware staff and
customer UIs on real data. **80 backend tests passing.**

- 26 commits · monorepo restructure + full backend + frontend.
- Stack (per `docs/09`): Next.js 16 (client VPS) · Django 5 + DRF + SimpleJWT baseline · Postgres
  (Supabase) · Supabase Storage/MinIO · Resend/MailHog. Local infra via docker-compose.

## What's included
| Module | Highlights |
|---|---|
| M2 Auth / Users & Roles | JWT (email-or-username) login, `/api/auth/me`, owner-only account + role admin, audited |
| M3 Records & Clients | Batch + client CRUD, auto-generated installment schedules |
| M4 Payments & Finance | Record → **Finance-verified** → balance moves; proof upload (private, presigned); Statement/Payment Confirmation (BIR-boundary flagged) |
| M5 Customer Portal | Customers log in → own membership, balance, schedule, verified payments, support |
| M6 Tasks & KPI | Assign tasks; submit → **objective** on-time/late fact; KPI review queue (no auto wage action) |
| M7 Reporting | Dashboard cards, collections (verified-only), CSV/XLSX export |
| M8 Customer Service | Customers raise concerns; staff track cases with status lifecycle |
| M9 Recruitment & Agents | Public careers + apply; **privacy-limited** public agent verification; internal HR/records management |
| M10 Notifications | in-app + email fired on payment verify (hook) |

Full status: [`BUILD_STATUS.md`](BUILD_STATUS.md).

## Design guarantees (verified by tests)
- Only **verified** payments move balances; verify is Finance-only, atomic, audited.
- Task late-flag is a **fact only** — no automatic salary deduction anywhere (PH labor law).
- Public agent verification returns only name + **masked** code + status (no private fields).
- Permissions enforced **server-side** (DRF); the role-aware UI is UX on top.
- Secrets in env only; private files in a private bucket served via short-lived presigned URLs.

## How to review / test
1. `docker compose up -d` · set up `apps/api/.venv` · `pip install -r requirements.txt` ·
   `migrate` · provision local test accounts privately · `runserver`.
2. `pnpm install` · `pnpm --filter @fresh/web dev`.
3. `cd apps/api && python manage.py test` → **80 passing**.
4. Log in using privately provisioned local test accounts for each role.
5. Try: create batch → add client → record + verify a payment (balance moves, email in MailHog) →
   run reports/export → raise a support concern from the portal → verify an agent at `/verify`.

## Reviewer checklist (by owner)
- [ ] **Tambong** — `auth_app`, `batches_app`, `clients_app`: confirm role keys, field names, schedule logic.
- [ ] **Bacurin** — `payments_app`, `reports_app`: verify balance/verification rules, statements, exports.
- [ ] **Somontina** — `apps/web` public + `/portal`: UX, public pages.
- [ ] **Dela Rosa** — `tasks_app`, `kpi_app`, `support_app`, `recruitment_app`, `agents_app`, `notifications_app`.
- [ ] Confirm the RBAC matrix in `auth_app/permissions_map.py` matches the agreed role design.

## Notes
- Some upstream models began as **contract skeletons** (owned by another dev) and were extended
  to unblock building — owners should review/refine. Nothing here is production-provisioned yet
  (Supabase/Railway/Redis/VPS accounts are client-owned per §20).
- Not started: **M11 AI assistant**; M1 public catalog/FAQ content; full M10 notification center.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
