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
Separate from the dev fee and larger, per year, than the one-time fee. USD→PHP at USD 1 =
PHP 61.358 (reference rate Aug 14, 2026); actual prices/usage vary.

| Item | Treatment | Notes |
|---|---|---|
| Vercel / hosting | Recurring | Vercel Pro ~USD 20/mo (~PHP 1,227); usage/seats may add cost |
| Railway / backend | Recurring | Hobby from USD 5/mo (~PHP 307 min incl. USD 5 usage); overage billed |
| Supabase | Recurring | Pro from USD 25/mo (~PHP 1,534) for prod DB/auth/storage/quotas |
| Cloudflare / domain | Domain + optional paid | DNS + Email Routing can stay Free; domain renewal is separate annual cost by TLD |
| Resend / email | Recurring if over free | Free up to 3,000 emails/mo; Pro from USD 20/mo (~PHP 1,227) for 50k |
| Redis | Not required initially | Add only if caching/queue/rate-limit needs justify it |
| Maintenance | Separate after-launch agreement | Not part of the subscription total |

**Planning reference totals:**
| Scenario | Estimated total |
|---|---|
| Baseline monthly | ~USD 50 / ~PHP 3,068 per month |
| Baseline annual | ~PHP 36,815/year + domain renewal |
| If Resend Pro needed | ~USD 70 / ~PHP 4,295 per month |
| Suggested operating allowance | ~PHP 3,500–5,000/month (headroom for overages/provider changes) |

*Assumptions:* one Vercel Pro, one Railway Hobby minimum, one Supabase Pro, Cloudflare Free
DNS/Email Routing, Resend Free, no Redis at launch.

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
