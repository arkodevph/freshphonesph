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
Separate from the dev fee and larger, per year, than the one-time fee. The v6 architecture
uses a VPS frontend, Railway API/worker, Supabase, Redis, Resend, and Cloudflare. The estimates
below use USD 1 = PHP 60 for planning only; provider prices, taxes, exchange rates, and usage vary.

| Item | Treatment | Notes |
|---|---|---|
| VPS / frontend | Recurring | Plan around USD 24/mo (~PHP 1,440) for a 2 vCPU / 4 GB Next.js host; provider and region remain to be selected |
| Railway / API and worker | Recurring | Pro from USD 20/mo (~PHP 1,200) including usage credit; two API replicas and a worker scale by actual CPU/RAM use |
| Supabase | Recurring | Pro with Small compute about USD 30/mo (~PHP 1,800) for production DB/auth/storage/quotas |
| Cloudflare / domain | Domain + optional paid | DNS + Email Routing can stay Free; domain renewal is separate annual cost by TLD |
| Resend / email | Recurring if over free | Free up to 3,000 emails/mo; Pro from USD 20/mo (~PHP 1,227) for 50k |
| Redis | Recurring | Fixed 250 MB baseline about USD 10/mo (~PHP 600) for events, queues, and rate limiting; high-availability Redis is a separate cost decision |
| Maintenance | Separate after-launch agreement | Not part of the subscription total |

**Planning reference totals:**
| Scenario | Estimated total |
|---|---|
| Baseline monthly | ~USD 84 / ~PHP 5,040 per month |
| With Resend Pro and Railway usage headroom | ~USD 119 / ~PHP 7,140 per month |
| Suggested operating allowance | ~PHP 7,000/month, excluding taxes, domain renewal, and optional AI/monitoring usage |

*Assumptions:* one 2 vCPU / 4 GB VPS, Railway Pro with two API replicas and one worker,
Supabase Pro with Small compute, a fixed 250 MB Redis instance, Cloudflare Free DNS/Email
Routing, and Resend Free or Pro according to email volume.

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
