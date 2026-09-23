# 16 — How Payments Actually Work (Explainer)

A shareable explainer for **teammates and the client**. Part A is plain-language
(non-technical). Part B is the technical mapping for developers. Reflects scope §7 and §19.

---

## Part A — Plain language (for the client & non-technical teammates)

### The one idea to remember
This system is a **record book for payments**, not a cashier. **Money never passes through
the website.** There is no "Pay Now" button, no card form, no online checkout.

> Think of it like a **receipt logbook + a verified balance sheet** — not a cash register.

### How customers pay (unchanged)
Customers keep paying **exactly the way they do now** — through the Messenger group chat and
GCash / bank transfer / cash. The system does **not** change that. It only *records* the
payment after it happens.

### The 3 simple steps
```
1) Customer pays outside the system (GCash / bank / cash, arranged in Messenger)
2) Staff RECORDS that payment in the system  →  marked "Pending"
3) Finance VERIFIES it against the real GCash/bank  →  marked "Verified"
```
Only a **Verified** payment reduces the customer's remaining balance. A "Pending" payment is
just a claim that hasn't been confirmed yet — it changes nothing until Finance checks it.

### A quick example
1. Maria pays **₱2,000** via GCash and posts the screenshot in the group chat.
2. Staff records it: Maria, ₱2,000, GCash, reference `GC123`, screenshot attached → **Pending**.
   *(Maria still owes the full ₱10,000 at this point.)*
3. Finance opens GCash, sees the ₱2,000 really arrived, and clicks **Verify** → **Verified**.
4. Maria's balance now shows **₱8,000 remaining**, and she can see the confirmed payment in her
   portal.

### What this gives the business
- ✅ One clean, searchable record of every payment (instead of scrolling Messenger).
- ✅ A trustworthy balance per customer — because only Finance-confirmed money counts.
- ✅ Accountability: the system stores **who** recorded and **who** verified each payment.
- ✅ Customers can see their own verified history and balance in the portal.

### What it deliberately does NOT do (V1)
- ❌ It does **not** accept online card/GCash payments on the website (no gateway).
- ❌ It does **not** issue the official **BIR sales invoice** — that stays in your existing
  process. The system can print a **"Billing Statement"** (what's owed) and a **"Payment
  Confirmation"** (what we received), which are internal/operational documents.
- ❌ It does **not** automatically decide anything about money — a **person (Finance)** confirms
  every payment.

### Why build it this way
- It matches how the business **already operates** — no retraining customers.
- It avoids payment-gateway **fees, integration, and security burden**.
- It keeps the project **focused and affordable** for Version 1. Online payments can be added
  later as a separate phase if ever wanted (scope §19).

### The one requirement it depends on
Because a human confirms each payment, **Finance verification must be done honestly and
carefully** — that's the trust anchor that a payment gateway would otherwise provide. The
system supports this with an audit trail and a strict rule that only the Finance role can verify.

---

## Part B — Technical mapping (for developers)

A `Payment` row is a **claim about money that moved externally** — not money itself.
`verify_payment()` is the human equivalent of a gateway's "payment succeeded" webhook.

### State model
```
             record (staff)
  [ pending ] ─────────────────────────────► (claim; balance UNCHANGED)
       │  Finance decision
       ├──► verified            → counts toward balance ✅
       ├──► rejected            → no effect
       └──► needs_clarification → no effect → staff edits → pending
```

### Field meaning
| Field | Meaning |
|---|---|
| `amount` | amount the customer paid **externally** (their claim) |
| `method` | external channel: `gcash` / `bank` / `cash` (informational) |
| `reference_no` | GCash/bank reference so Finance can look it up |
| `proof_file` | screenshot/receipt evidence (S1.2, private storage) |
| `status` | `pending` = unverified claim · `verified` = Finance confirmed arrival |
| `recorded_by` / `verified_by` / `verified_at` | accountability trail |

### The invariant
`remaining_balance = total_due − sum(VERIFIED payments)`. Pending/rejected are excluded.
Balance is **derived** from verified payments (no mutable "paid" field → cannot drift).
See `payments_app/selectors.py` and `docs/15`.

### Where the gateway would have been
| Normal e-commerce | This system |
|---|---|
| Card/GCash checkout on-site | External payment in Messenger/GCash |
| Gateway webhook "payment succeeded" | **Finance clicks Verify** (human, audited) |
| Order marked paid automatically | Only `verified` payments move the balance |
| Stripe/PayMongo/Maya fees + PCI | None — no gateway in V1 |

### BIR boundary (§7)
The system may generate a **Billing Statement / Statement of Account** and a **Payment
Confirmation** (operational records). It must **not** present these as the official BIR sales
invoice unless a BIR-compliant setup is separately implemented (§19).

### Endpoints (built)
- `POST /api/payments/` → record (pending) · `POST /api/payments/{id}/verify/` → Finance-only
- `GET /api/clients/{id}/balance/` → `total_due` / `verified_paid` / `remaining_balance`

> One-line pitch for the client: **"Customers pay the way they always have; the system just
> records it and Finance confirms it — so everyone can trust the balance."**
