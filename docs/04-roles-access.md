# 04 — Roles & Access

From scope §3 and §18.7. Every employee gets an **individual account**; what they can see or
change depends on their **assigned role**. This protects confidential information and makes it
traceable who changed a record. Target access is enforced **server-side** by NestJS permission
guards (with optional database-policy hardening), never
only by hiding UI (§16).

## Internal roles (§3)

| Role | Access (plain terms) | Purpose |
|---|---|---|
| **Owner** | High-level oversight; authorized access to management, finance, HR/KPI, records, analytics & reports | Overall decision-making & visibility |
| **COO** | Broad operations, tasks, reports, monitoring. Confidential HR/payroll only if separately approved | Day-to-day operational oversight |
| **General Manager** | Operations, task designation, late submissions, management reports | Manage teams **without** auto-exposing payroll/confidential HR |
| **HR / Payroll** | Employee records, payroll-related submissions, KPI reviews, approved HR actions | Keep employee info within the proper team |
| **Finance Officer** | Payment records, proof/reference **verification**, finance reports, status updates | Control who can verify money-related records |
| **Records & Monitoring** | Paluwagan batches, client records, client requirements & documents | Maintain accurate client & batch information |
| **Analytics** | Authorized summaries, reports, trends, recommendations (prefer **aggregated** data) | Turn records into management information |
| **Customer Service Head / Team** | Customer concerns, assignment, resolution, status & reports | Centralize support & response tracking |
| **Core Team / Handlers** | Only the modules/records related to their assigned work | Least-privilege instead of broad access |

## External / non-employee roles

| Role | Access |
|---|---|
| **Customer** | Own account only — membership, payment schedule, verified history, own documents, own support cases, notifications (§5) |
| **Applicant** | Submit a job application; check own application status (§11) |
| **Public (unauthenticated)** | Public website only — catalog, payment breakdown, how-it-works, FAQs, agent verification, careers (§4) |

## Permission model

- **Role → permissions** mapping (a permission = an action on a module, e.g.
  `payment:verify`, `batch:create`, `document:review`, `role:assign`).
- **Least privilege (§18.7):** grant only what a role's job needs. "Broad management roles do
  not automatically get all records" (§18.7 revision) — confidential payroll/KPI/customer
  documents are **separately authorized**.
- **Enforcement (server-side):**
  1. **NestJS guards** check the caller's role and permission before a controller method runs.
  2. *Optional:* database policies on sensitive tables provide defense-in-depth. The API is the
     primary gate, so database policies are hardening, not the main lock.
- **Confidential HR/payroll** is gated behind explicit approval even for COO (§3).
- **Sensitive actions are audited** (role changes, payment verification, record edits) (§16).

## Current TypeScript confidential HR policy

Confirmed by the user on **2026-10-08**:

| Role | Confidential HR access |
|---|---|
| Owner | Automatic access; approves and revokes other eligible accounts |
| HR / Payroll or COO | Explicit Owner grant for that person, with a recorded reason |
| Every other role | Denied, regardless of a stored or client-supplied grant |

New and existing non-Owner accounts default to no grant. Private KPI evaluations,
review queues and applicant records/notes/files require the grant; ordinary task work,
job publication and aggregate reports retain their existing permissions. A role change
or deactivation clears the grant; reactivation does not restore it. Grant changes revoke
existing sessions and are audited with the Owner, reason and date. Owner management is
available in `/system/team`. See [42-confidential-hr-access.md](42-confidential-hr-access.md).

Consequential HR action requests require this individual grant for HR / Payroll
or COO. The Owner alone records approve/reject decisions. The action page and API
are confidential; a decision does not perform a payroll or employment change. See
[47-consequential-hr-action-approvals.md](47-consequential-hr-action-approvals.md).

## Example permission matrix (illustrative — finalize general roles in Discovery)

| Permission | Owner | COO | GM | HR | Finance | Records | Analytics | CS | Handler |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `batch:create/edit` | ✔ | ✔ | ✔ | – | – | ✔ | – | – | assigned |
| `client:manage` | ✔ | ✔ | ✔ | – | – | ✔ | – | – | assigned |
| `payment:record` | ✔ | ✔ | ✔ | – | ✔ | ✔ | – | – | assigned |
| `payment:verify` | ✔ | – | – | – | ✔ | – | – | – | – |
| `document:review` | ✔ | ✔ | – | – | – | ✔ | – | – | – |
| `task:assign` | ✔ | ✔ | ✔ | ✔ | – | – | – | ✔ | – |
| `kpi:review` | ✔ | approved | – | approved | – | – | – | – | – |
| `hr:confidential` | ✔ | approved | – | approved | – | – | – | – | – |
| `report:view` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | – |
| `role:assign` | ✔ | – | – | – | – | – | – | – | – |
| `support:manage` | ✔ | ✔ | – | – | – | – | – | ✔ | – |

✔ = allowed · "approved" = only if separately approved · "assigned" = only for their own
assigned records · – = no access.

> This matrix is a starting proposal for Discovery sign-off, not final. Fresh Phones PH
> confirms the exact cells during Month 1.
