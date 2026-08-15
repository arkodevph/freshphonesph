# 07 — Compliance & Security

From §14 (privacy/documents), §16 (security requirements), and §B (compliance reference notes).
Because the system handles government IDs, financial records, and employee data, privacy and
security are designed in from the start — not added after launch.

> **Not legal advice.** Final legal interpretation belongs to Fresh Phones PH's professional
> advisers. The developer implements the technical controls; the client owns the policies.

## Privacy & documents (§14)

| Requirement | Plain meaning | Owner |
|---|---|---|
| Privacy Notice | What data is collected, why, who receives it, retention, data-subject rights | Client/DPO/lawyer prepares & approves; dev implements screens/links |
| Terms & Conditions | Portal use, account responsibilities, business rules | Client/lawyer approves; dev implements acceptance/version tracking if required |
| Employee/Applicant Privacy Notice | Separate notice for employee/KPI/payroll & recruitment data | Client prepares; dev implements |
| Data Processing Agreement (DPA) | Confidentiality/security/purpose/incident/deletion terms between FP and dev/providers | Both — signed agreement |
| DPO / privacy owner | The person responsible for privacy compliance | **Client appoints** (dev does not become it) |
| Privacy Impact Assessment (PIA) | Document data lifecycle, risks, access, controls before production | Client (dev supports with technical detail) |
| NPC registration / exemption | Whether DPS/DPO registration is mandatory or an exemption applies | Client DPO/lawyer decides |
| Retention rules | How long IDs, proofs, applications, inactive accounts, employee records are kept | Client decides; dev implements deletion capability |
| Breach/incident process | Who is contacted & what happens on exposure | Client defines; dev supports detection/logs |

## Security requirements (§16)

| Control | What it means |
|---|---|
| Secure authentication | JWT auth, secure sessions, password reset (DRF SimpleJWT) |
| **Backend role checks** | Permissions checked on the **server/DB**, not only by hiding buttons |
| Private file storage | Sensitive files private; access authenticated, authorized, temporary where possible |
| HTTPS | Encrypt traffic between user and system |
| Audit logs | Log role changes, payment verification, record edits |
| Validation & rate limiting | Validate submitted values/files; limit abusive request patterns |
| Backups & recovery | Managed backups + a recovery approach |
| Secrets management | DB/admin/API secrets only in secure server env vars |
| Least privilege | Each role gets only the access its job needs |

## Compliance reference notes (§B) — why several items were revised

| Topic | Note | Reference |
|---|---|---|
| Data Privacy Act / NPC IRR | System processes personal data (customer IDs/docs + employee info) → transparent, lawful, secure, accountable processing | privacy.gov.ph — IRR of the Data Privacy Act of 2012 |
| NPC registration | NPC Circular 2022-04 sets mandatory registration triggers; client DPO/lawyer assesses registration vs exemption | privacy.gov.ph/pips-and-pics |
| Automated decision-making/profiling | NPC rules address automated decisions/profiling → a reason V1 avoids automatic salary-deduction recommendations | NPC Circular No. 2022-04 |
| Breach response | Time-sensitive notification duties for reportable breaches | privacy.gov.ph — breach reporting |
| BIR invoicing boundary | Use Billing Statements / Statements of Account + Payment Confirmations; the official BIR invoice stays in FP's approved process | BIR EOPT — bir.gov.ph/EOPT |
| Wage deductions | PH labor rules restrict wage deductions → software must not auto-compute/enforce salary deductions | Labor Code / PD 442 |

## How these map into the build
- **Privacy-by-design:** private storage, DRF permissions (optional RLS), least-privilege,
  data minimization (collect only
  needed fields — [03-data-model.md](03-data-model.md)).
- **No automated consequential decisions:** late flag is a fact; deductions are human-entered;
  AI only suggests into a human queue ([05-modules.md](05-modules.md) M6, M11).
- **Auditability:** money & permission changes are logged.
- **Client obligations tracked** as Month-1 prerequisites in [00-roadmap.md](00-roadmap.md).
