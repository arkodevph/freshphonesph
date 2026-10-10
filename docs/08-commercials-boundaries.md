# 08 — Commercials, Boundaries & Handover

From §19 (out of scope), §20 (commercial & subscription boundaries), and §21 (acceptance,
handover & change control). Keeps expectations clear so scope stays focused.

## Out of scope / future phase (§19)

Not included in the revised first production scope unless separately approved and quoted:

- Online checkout or direct website payments (Stripe, PayMongo, Maya, etc.)
- BIR POS/CAS registration or generating official BIR tax invoices from this system
- Automatic salary deductions or automated disciplinary decisions
- Native Android/iOS mobile apps (V1 is a mobile-**responsive** web system)
- Full payroll computation engine (unless separately specified)
- SMS credits or paid Messenger API integration (unless separately scoped)
- Large historical data cleaning/migration beyond an agreed import template/volume
- Advanced BI / data-warehouse implementation
- Unlimited revisions or features added after final scope sign-off
- 24/7 managed operations/support (unless a maintenance SLA is purchased)

## Commercials (§20)

**This is a system, not a website** — ~nine functional modules + AI assistive layer +
cross-cutting security/privacy, built via a proper SDLC.

### One-time development fee
- **Starts at PHP 40,000**, subject to final signed scope. Any added/changed work is agreed
  separately. Milestone schedule is in [00-roadmap.md](00-roadmap.md).

### Recurring third-party subscriptions (paid by Fresh Phones PH)
Separate from the development fee. The 2026-10-08 documentation decision changes the
planned database/authentication stack to **Neon + Better Auth**. Earlier Supabase/Redis
subscription estimates and totals are superseded and must not be used as a current quote.

| Item | Planning status |
|---|---|
| VPS / frontend | Provider, region and operating cost to be confirmed |
| Railway / API | Two-replica target retained; usage and any worker cost to be estimated |
| Neon / PostgreSQL | Plan, capacity, pooling and recovery window to be selected and priced |
| Better Auth | Application integration and operation; do not assume a Supabase Auth subscription |
| Private object storage | S3-compatible provider and usage estimate pending |
| Event/job infrastructure | Production choice pending; no mandatory Redis subscription in the revised baseline |
| Resend / email | Plan depends on approved notification volume |
| Cloudflare / domain | Domain renewal and any paid services to be confirmed |
| Maintenance | Separate after-launch agreement |

A new monthly/annual total remains **pending** until the unresolved services and usage are
confirmed. No provider purchase or production cutover is authorized by this documentation update.
See [architecture decisions](20-v6-architecture-decision.md).

### Recommended ownership (§20)
Production domain, hosting, database, email, and other third-party accounts should be **owned
and paid by Fresh Phones PH**, with the developer given the access needed to build & maintain.

## Acceptance, handover & change control (§21)

| Item | Definition |
|---|---|
| Scope sign-off | Both sides approve final modules, roles, workflows & exclusions before full dev |
| Prototype approval | Key screens/workflows reviewed before deep implementation |
| Staging/UAT | Client gets a test/prod-like build for user acceptance |
| Acceptance criteria | Each module checked against agreed behavior, permissions & outputs |
| Bug fixes | Defects against the signed scope fixed during the warranty period |
| Change requests | New/materially changed features documented, estimated & approved separately |
| Handover | Production deployment, repo/access arrangement, basic admin/user docs, credential/account ownership handover |
| Maintenance | Ongoing updates/features/monitoring/support after warranty = separate arrangement |

**Warranty:** 3 months from production deployment + acceptance; scope defects fixed free;
new/changed features are change requests; post-warranty support is a separate agreement.

## Final scope confirmation (§21)
Before development proceeds beyond discovery/design, both parties confirm: final role matrix,
payment workflow, customer document list, KPI review process, reporting requirements,
privacy/legal documents, production account ownership, commercial terms, and out-of-scope list.
Fresh Phones PH confirms it is responsible for appointing the DPO, approving privacy
notices/policies, and assessing NPC registration/exemption with counsel — these are **not**
absorbed into development scope.
