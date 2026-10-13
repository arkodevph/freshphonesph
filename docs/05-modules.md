# 05 — Modules

Every functional module from the scope (§4–§13), each with: purpose, features, primary data,
roles, and acceptance criteria. Modules are listed in the recommended build order (roughly the
Month 2–4 phases in [00-roadmap.md](00-roadmap.md)).

Legend: **[Public]** unauthenticated · **[Portal]** customer · **[Staff]** employee dashboard.

---

## M1 — Public Website (§4) **[Public]**

Explains Fresh Phones PH and lets people find info without an account. Extends the existing
landing page.

| Feature | User can | Why |
|---|---|---|
| Paluwagan unit catalog | Browse offered phone/unit models + basic availability | Fewer repeat inquiries |
| Payment breakdown | View sample schedules & expected installments | Sets expectations before joining |
| How It Works | See step-by-step Paluwagan process | Easier for first-timers |
| Requirements | See documents/info needed for enrollment | Clients prepare before submitting |
| FAQs | Search common questions by topic | Reduces repetitive support |
| Agent verification | Check if a person is a recognized agent | Reduces impersonation/fraud (→ M9) |
| Careers | View openings + submit application | Centralizes recruitment (→ M9) |
| Customer login | Enter the secure portal | Separates public from private |
| Support entry point | Start/follow a concern after login | Trackable support (→ M8) |

- **Data:** mostly CMS-style content + reads from catalog/agent tables.
- **Acceptance:** each page renders responsively; agent verification returns only
  name/masked-ID/active status; careers submits an application record; login routes to portal.
- **Build note:** reuse existing components (Hero, Plans, Faq, Models, etc.); add the missing
  public pages.

---

## M2 — Auth, Accounts & Roles (Foundation) (§3, §16) **[Staff/Portal]**

Not a numbered scope section but the prerequisite for every gated module. See
[04-roles-access.md](04-roles-access.md).

- **Features:** Better Auth sign-in, session recovery, and password reset (planned cutover); employee account creation
  with role assignment; customer account linked to a client record; server-side NestJS
  permission guards; optional database-policy hardening.
- **Acceptance:** an under-privileged role is rejected at the API (not just hidden); a customer
  sees only their own data; role changes are audited.

---

## M3 — Paluwagan Records & Client Management (§6) **[Staff]**

The **core source of truth** for active batches and clients.

| Feature | User can | Why |
|---|---|---|
| Batch management | Create batch: unique number, unit/model, status, dates, handler/agent | Prevents duplicate/unclear batches |
| Client records | Attach members to the correct batch; store approved client info | Keeps history organized |
| Requirements checklist | Track docs complete / missing / approved / needs clarification | Shows staff what needs action |
| Private document storage | Store IDs, photos, files with access restrictions | Protects sensitive info; no public links |
| Payment schedule & balance | Track expected installments & balance from **verified** payments | Consistent balances across Finance/Records/portal |
| Edit history | Record what changed, who, and when | Accountability |
| Search / filter | Filter by batch, client, unit, agent, status, date | Manage large records |

- **Data:** `batch`, `client`, `customer_document`, feeds `payment` schedule.
- **Roles:** Records & Monitoring (primary), Owner/COO/GM, assigned Handlers.
- **Acceptance:** create batch → attach client → upload private doc (not publicly reachable) →
  edit logged to audit; balances reflect only verified payments.

---

## M4 — Payment Recording & Finance Verification (§7) **[Staff/Portal]**

**Revised workflow:** clients pay **outside** the website (Messenger/external). The system
starts when the business **records** that payment. No Stripe/PayMongo/Maya checkout in V1.

| Feature | User can | Why |
|---|---|---|
| Create payment record | Authorized staff select client/batch; enter amount, date, method, reference, optional proof | Moves evidence out of Messenger into a searchable record |
| Pending verification | New records stay **pending** until Finance reviews | Stops unverified entries changing balances |
| Finance verification | Finance marks **Verified / Rejected / Needs Clarification** + notes | Clear approval step |
| Verified balance update | Only verified payments change amount-paid/remaining balance | Prevents accidental/fraudulent balance change |
| Payment history | Staff & customer view appropriate historical entries | Transparency & dispute handling |
| Audit trail | Store verifier, timestamp, key changes | Accountability for money records |

- **BIR boundary (§7):** system may generate a **"Billing Statement" / "Statement of Account"**
  (amounts due) and a **"Payment Confirmation"** after verification. It must **NOT** claim to
  generate the official BIR invoice unless a BIR-compliant setup is separately implemented (§19).
- **Data:** `payment` (states), links to `client`/`batch`, `audit_log`.
- **Roles:** record = authorized staff; **verify = Finance only**.
- **Acceptance:** pending record does not move balance; on Verify, balance updates and portal
  reflects it; reject/needs-clarification path works; every transition audited.

---

## M5 — Customer Portal (§5) **[Portal]**

Visibility & document/status tracking. **Does not process payment in V1.**

| Feature | User can | Why |
|---|---|---|
| Secure account | Sign in; view only their own account | Protects private records |
| Paluwagan membership | View batch number, unit/model, key dates | Keeps customer informed |
| Payment schedule | View due dates, expected amounts, verified paid, remaining balance | Understand what's still due |
| Verified payment history | View Finance-approved payments (date, amount, method/ref, status) | Transparency without being a payment processor |
| Requirements/documents | Upload/view permitted requirements via private storage | Fewer lost files |
| Release/fulfillment status | View current unit/order release status | Fewer "status update?" pings |
| Customer support | Create a concern & monitor progress | Easier follow-up (→ M8) |
| Notifications | Receive relevant reminders/status updates | Informed without exposing internal info (→ M10) |

- **Roles:** Customer (own data only, RLS-enforced).
- **Acceptance:** customer cannot access another customer's data; shows only **verified**
  payments; document upload lands in private storage.

---

## M6 — Employee Tasks, Deadlines & KPI (§8) **[Staff]**

Automates **neutral facts** (on-time/late). Consequential HR decisions stay **human-reviewed**.

| Feature | Behavior | Why |
|---|---|---|
| Task creation | Managers assign task, instructions, priority, deadline, assignee | Visible accountability |
| Employee updates | Employees update status, submit reports/files | Progress in one place |
| Automatic timestamp | System records exact submission time | Removes disputes |
| Late flag | System labels **On Time / Late** vs deadline — **fact only** | Objective, not an HR decision |
| KPI review queue | Late/flagged items surface for KPI/HR reviewer | Focus on items needing review |
| Manual evaluation | KPI/HR reviews context and records evaluation/recommendation | Keeps HR decisions with humans |
| Approval trail | Approved HR/payroll actions record reviewer, reason, date | Accountability |

The TypeScript workflow links a separately recorded request to a human KPI review
marked **Action recommended**. An Owner-approved HR/COO account submits the
specific proposed action and reason; the Owner alone approves or rejects with a
reason. Decisions are retained and audited without changing payroll or carrying out
the action. See [47-consequential-hr-action-approvals.md](47-consequential-hr-action-approvals.md).

- ~~**Removed:** system calculates a suggested salary-deduction %.~~ **Revised:** system only
  flags lateness/facts; any deduction/action is entered **manually** after Fresh Phones PH
  confirms written policy and legal/labor compliance (§8, §18.3).
- **KPI/late-flag disclaimer:** the flag is a factual record only and must not be the sole
  basis for disciplinary/wage action.
- **Data:** `task`, `kpi_review`, `audit_log`.
- **Acceptance:** late flag computed correctly from deadline; no automatic wage action exists
  anywhere; approved HR actions are logged.

---

## M7 — Reporting & Analytics (§9) **[Staff]**

Summarize **authorized** operational data without exposing private info to those who don't need it.

| Feature | User can | Why |
|---|---|---|
| Dashboard cards | Counts: active batches, verified payments, pending verification, open concerns, late tasks | Quick health check |
| Date filters | Day/week/month/custom range | Period comparisons |
| Batch & payment reports | Membership, collections, balances, statuses | Reconcile records |
| Task/KPI reports | Completion, lateness, review status | Management follow-up |
| Customer service metrics | Open/closed issues, categories, turnaround | Spot recurring problems |
| Exports | PDF/Excel/CSV where genuinely needed | Offline reporting/meetings |
| Historical reports | Preserve prior periods & submitted analysis | Don't lose historical context |

- **Roles:** Analytics (prefer **aggregated** data), Owner/COO/GM/HR/Finance per scope.
- **Submitted analysis:** a report viewer may add one immutable, human-written analysis
  when saving a period or later to an older numeric snapshot. History preserves its
  author, submission time and captured figures; see [implementation](49-submitted-report-analysis.md).
- **Acceptance:** reports respect role visibility; exports contain only authorized fields;
  historical periods retained.

---

## M8 — Customer Service (§10) **[Staff/Portal]**

Concerns tracked as **cases**, not lost in chat history.

| Feature | User can | Why |
|---|---|---|
| Create concern | Record category, description, client, date, source | Trackable record |
| Assign staff | Assign to responsible CS employee | Clarifies ownership |
| Status tracking | Open / In Progress / Waiting for Client / Resolved / Closed | Shows what needs action |
| Resolution notes | Record what was done and when | Useful service history |
| Recurring issue report | Group categories & turnaround time | Improve operations |

- **Data:** `support_case`. **Roles:** CS Head/Team; customer creates & follows own case.
- **Source tracking:** customer portal concerns are server-labelled; staff select the original
  channel when logging outside contacts. Existing cases are `unrecorded`. Staff can filter by
  source and reporting groups case counts by source. See [implementation](48-support-concern-source-tracking.md).
- **Acceptance:** case lifecycle transitions work; customer sees only own cases; turnaround
  computed.

---

## M9 — Recruitment & Agent Verification (§11) **[Public/Staff]**

Public-facing; collect/reveal only what's necessary (data minimization).

| Feature | User can | Why |
|---|---|---|
| Careers list | Publish approved job openings | Official place to check vacancies |
| Application form | Collect only necessary applicant details + approved attachments | Data minimization |
| Recruitment status (internal) | HR reviews/updates applicant status | Less manual tracking |
| Agent verification (public) | Confirm an agent via approved identifier/name | Verify legitimacy |
| Privacy-limited public result | Show only agent name, masked/approved ID, Active/Inactive | Verify **without** exposing private records |

- ~~**Removed:** verification could reveal too much agent info.~~ **Revised:** public result
  shows only approved name/identifier + active/inactive status (§18.8).
- **Data:** `applicant`, `agent` (internal vs public view). **Roles:** HR (recruitment); public
  (verification lookup only).
- **Acceptance:** public agent lookup never returns address/phone/private fields; application
  stores only approved fields.

---

## M10 — Notifications (§12) **[Staff/Portal]**

Support operations. **Messenger API integration is NOT required for V1** (out of scope §19).

| Feature | User can | Why |
|---|---|---|
| In-app notifications | Show alerts inside the portal | No external messaging cost for basic alerts |
| Email notifications | Account, task, verification, support, status emails via Resend | Reliable out-of-app channel |
| Deadline reminders | Notify employees before/after task deadlines per rules | Fewer missed submissions |
| Finance alerts | Notify Finance of pending records & verification results | Speeds payment recording |
| Customer status alerts | Notify customers when relevant statuses change | Fewer manual follow-ups |
| Configurable templates | Admin manages approved message templates/timing | Consistent wording |

- **Provider:** Resend (email). **Acceptance:** emails send via configured service; templates
  editable by authorized admin; no Messenger API dependency.

---

## M11 — AI Assistant & Automation (§13) **[Staff]**

**Deferred — API funding unavailable (2026-10-08 user decision).** Exclude M11 from
current implementation priorities. Resume only when paid AI API funding is available
and the user requests it. The requirements below remain for future implementation.

A workflow-aware assistant layered on the stable core. **Assistive only** — it summarizes,
reminds, suggests; it never acts on its own or replaces a human verification/decision.
Implemented **only after** core workflows and permissions are stable.

| AI feature | What it does | Policy safeguard |
|---|---|---|
| Workflow understanding | Understands FP workflow from approved internal knowledge | Only approved sources; no access beyond the requesting role's permissions |
| Deadline reminders | Reminds assigned employees before task deadlines | Assistive only; changes nothing |
| Authorized notifications | Sends pre-approved email/in-app notifications | Only approved templates/recipients; no autonomous outreach |
| Overdue task summaries | Summarizes overdue tasks for KPI/management | Surfaces facts only; human decides |
| Task assistance | Explains assigned tasks & processes | Explains only; can't reassign/approve/complete |
| Report summarization | Summarizes reports & surfaces patterns | Read-only; doesn't alter records |
| Review assistance | Summarizes factual task evidence for the KPI/HR queue | No deduction amount or employment action is computed; an authorized human writes any recommendation |

- **AI guardrails (apply to all):** respects role permissions and sees only what that role may
  see; must not compute, recommend, approve, or apply payroll deductions, alter financial records, or
  expose confidential data; all consequential HR/finance decisions require human review;
  privacy-aware per NPC rules on automated decision-making/profiling (§13, §18.4–18.5, §B).
- **Acceptance:** AI cannot perform any write/approve action; suggestions land in a human queue;
  it cannot read data outside the caller's role scope.

---

## Cross-cutting: Audit & Security

Not a UI module but present across all of the above — see
[07-compliance-security.md](07-compliance-security.md). Every sensitive change (role, payment
verification, record edit, document review, approved HR action) writes to `audit_log`.
