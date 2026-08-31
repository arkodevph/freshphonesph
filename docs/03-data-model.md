# 03 — Data Model

Derived from scope §6 (records), §7 (payments), and §A (recommended data fields). Exact fields
are finalized in Discovery; **collect only what the business genuinely needs** (data
minimization, §14). Target tables live in Supabase PostgreSQL and are owned by **Prisma
migrations**. Existing Django models remain migration input until each TypeScript slice cuts
over; database policies are optional defense-in-depth (see [09-tech-stack.md](09-tech-stack.md)).

## Entity overview

```
employee_account ──< role assignment
client (customer) ──1:1── customer_account
batch ──< client ──< payment
client ──< customer_document
task ──< kpi_review
support_case
applicant
agent
audit_log   (cross-cutting — references any record)
```

## Core entities & fields

### employee_account (§3)
Individual account per employee. Login + assigned role.
- `id`, `full_name`, `email`, `role` (see role list below), `status` (active/inactive),
  `created_at`, `updated_at`, `last_login`.
- Confidential HR/payroll fields are **separately access-controlled**, not exposed to broad
  management roles (§18.7 least-privilege).

### client / customer (§A)
- `id` (Customer ID), `full_name`, `contact_details`, `address_fields` (approved only),
  `batch_id`, `unit_model`, `status`, `created_at`, `updated_at`.
- `customer_account_id` → links to the portal login (1:1, nullable until they register).

### batch (§6, §A) — core source of truth
- `id`, `batch_number` (unique), `unit_model`, `status`, `start_date`, `end_date`,
  `key_dates`, `assigned_agent_id` / `handler_id`, member links (→ clients).
- Prevents duplicate/unclear batch records.

### payment (§7, §A) — the verified-money workflow
- `id`, `client_id`, `batch_id`, `expected_due_reference`, `amount`, `payment_date`,
  `method`, `reference_number`, `proof_file_id` (if needed),
  `verification_status` ∈ {`pending`, `verified`, `rejected`, `needs_clarification`},
  `verifier_id`, `verification_date`, `notes`.
- **Rule:** only `verified` payments affect `amount_paid` / `remaining_balance`. Pending never
  moves balances. Verification is Finance-only. Every state change → `audit_log`.

### customer_document (§6, §A)
- `id`, `client_id`, `document_type`, `status` (complete / missing / approved / needs
  clarification), `private_file_ref`, `upload_date`, `reviewer_id`, `review_notes`.
- Stored in Supabase **private** storage; access is authenticated + brokered by the API. Avoid
  duplicating ID data unnecessarily.

### task (§8, §A)
- `id`, `title`, `instructions`, `assignee_id`, `creator_id`, `priority`, `deadline`,
  `status`, `submission_timestamp`, `late_flag` (on-time / late — **fact only**),
  `attachments`.
- The late flag is an **objective record**, never an automatic HR/wage action (§8 disclaimer).

### kpi_review (§8, §A)
- `id`, `task_or_period_ref`, `reviewer_id`, `factual_evidence`, `manual_evaluation`,
  `recommendation_status`, `reason`, `approval_or_rejection`, `timestamps`.
- Consequential HR decisions are **human-entered** here after review; the system never applies
  deductions itself.

### support_case (§10, §A)
- `id`, `client_id`, `category`, `description`, `assigned_staff_id`, `date_received`,
  `status` ∈ {open, in_progress, waiting_for_client, resolved, closed}, `resolution`,
  `closed_date`, `turnaround_time`.

### applicant (§11, §A)
- `id`, approved recruitment fields only, `position_applied_for`, `contact`, `attachments`,
  `status`, `reviewer_notes`. Data minimization applies.

### agent (§11, §A)
- Internal: full agent record.
- Public verification view: **only** `agent_name`, masked/approved `agent_id`, and
  `active/inactive` status. No address, phone, or private records exposed.

### audit_log (§16, §A) — cross-cutting
- `id`, `actor_user_id`, `action`, `record_type`, `record_id`, `timestamp`,
  `before_after_summary` (where appropriate).
- Written for sensitive changes: role changes, payment verification, record edits, document
  reviews, approved HR actions.

## Role enum (see [04-roles-access.md](04-roles-access.md))
`owner · coo · general_manager · hr_payroll · finance_officer · records_monitoring ·
analytics · cs_head · cs_team · core_handler` — plus external `customer`, `applicant`, and
unauthenticated `public`.

## Access-control principles baked into the model
- **Least privilege:** each role sees only what its job needs (§18.7).
- **Server-enforced:** permissions checked by NestJS guards, never only in the UI (§16);
  database policies remain optional hardening.
- **Private by default:** IDs, financial records, documents are private storage + authorized
  access only.
- **Auditable:** money and permission changes always leave a trail.
