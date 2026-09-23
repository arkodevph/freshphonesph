# 00 — Roadmap & Delivery Plan

Maps the scope's SDLC (§17), commercials (§20), and acceptance/change control (§21) into a
concrete build sequence for this repository.

## SDLC phases (≈4–6 months)

The scope is explicit: this is not "coding a website," it follows a proper SDLC because it
handles government IDs, financial records, and employee data.

| Month | Phase | What happens | Exit criteria |
|---|---|---|---|
| 1 | **Discovery & Design** | Confirm workflows, roles, final requirements, privacy boundaries, DB structure, UI/UX wireframes, acceptance criteria | Signed scope (§21) + this `docs/` set approved |
| 2 | **Core Foundation** | Auth, roles/permissions, public site foundation, employee/customer accounts, batch & client records | Foundation acceptance (auth, roles, accounts, batch & client records) |
| 3 | **Operations** | Payment recording / Finance verification, documents, customer portal status, tasks/deadlines, support module | Operations acceptance (payment recording/verification, portal, tasks) |
| 4 | **Management** | KPI review workflow, reports/analytics, recruitment, agent verification, notifications, audit logs | Management modules demoable |
| 5 | **Testing & Hardening** | Permission tests, security checks, workflow tests, mobile responsiveness, report validation, bug fixing, privacy review | Hardening complete, defects triaged |
| 6 | **UAT & Launch Buffer** | Client user-acceptance testing, agreed revisions, production deployment, docs, training, handover | UAT sign-off + handover (§21) |

> **Timeline rule (§17):** new features or major workflow changes *after* scope sign-off may
> extend the timeline and are treated as **change requests**, not unlimited revisions.

## Milestones ↔ payment schedule (§20)

One-time development fee **starting at PHP 40,000** (subject to final signed scope). Paid in
milestones (amounts shown at the PHP 40,000 baseline; adjust pro-rata to final fee):

| Milestone | Share | Amount (@ 40k) | Ties to phase |
|---|---|---|---|
| Scope sign-off (before dev begins) | 30% | PHP 12,000 | End of Month 1 |
| Prototype / design approval | 20% | PHP 8,000 | Month 1–2 |
| Core Foundation acceptance | 20% | PHP 8,000 | End of Month 2 |
| Operations acceptance | 20% | PHP 8,000 | End of Month 3 |
| UAT sign-off & handover | 10% | PHP 4,000 | Month 6 |
| **Total** | **100%** | **PHP 40,000** | |

*Alternative on agreement:* 50% scope sign-off / 50% UAT & handover.

## Warranty & change control (§21)

- **Warranty:** 3-month period from production deployment + handover. Defects against the
  **signed scope** are fixed at no charge in that window.
- **Change requests:** new or materially changed features are documented, estimated, and
  quoted separately.
- **Maintenance:** monitoring/support/new features after warranty = separate agreement (not
  part of the subscription total).

## Recurring costs (paid by Fresh Phones PH) (§20)

Baseline ≈ **PHP 3,068/month (~PHP 36,815/year)** in third-party subscriptions, separate from
the one-time dev fee. See [08-commercials-boundaries.md](08-commercials-boundaries.md) for the
full breakdown and the recommended **client-owns-the-accounts** arrangement.

## Immediate next actions (Month 1)

1. Review & sign off this `docs/` set (esp. role matrix, payment workflow, data model).
2. Client appoints DPO and starts NPC registration/exemption assessment with counsel (§14) —
   this runs in parallel and is a **client** obligation, not dev work.
3. Provision the third-party accounts under Fresh Phones PH ownership (§20 "Recommended
   ownership"); grant the developer build access.
4. Approve wireframes/prototype → unlocks the 20% design milestone.
