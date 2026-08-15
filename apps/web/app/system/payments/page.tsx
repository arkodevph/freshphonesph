"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Receipt,
  CheckCircle,
  XCircle,
  Wallet,
  Plus,
} from "@phosphor-icons/react";
import {
  listPayments,
  createPayment,
  decidePayment,
  getBalance,
  type Payment,
  type PaymentStatus,
  type Balance,
} from "@/lib/api";

const FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
];

const STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  needs_clarification: "bg-violet-100 text-violet-700",
};

const today = () => new Date().toISOString().slice(0, 10);

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // record form
  const [form, setForm] = useState({
    client: "1",
    batch: "1",
    amount: "",
    payment_date: today(),
    method: "gcash",
    reference_no: "",
  });
  const [saving, setSaving] = useState(false);

  // balance lookup
  const [balanceClient, setBalanceClient] = useState("1");
  const [balance, setBalance] = useState<Balance | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPayments(filter ? { status: filter } : {});
      setPayments(data.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  }

  async function onRecord(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createPayment({
        client: Number(form.client),
        batch: Number(form.batch),
        amount: form.amount,
        payment_date: form.payment_date,
        method: form.method,
        reference_no: form.reference_no,
      });
      flash("Payment recorded (pending verification).");
      setForm((f) => ({ ...f, amount: "", reference_no: "" }));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record payment.");
    } finally {
      setSaving(false);
    }
  }

  async function decide(id: number, decision: PaymentStatus) {
    setError(null);
    try {
      await decidePayment(id, decision);
      flash(`Payment #${id} ${decision}.`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    }
  }

  async function lookupBalance() {
    setError(null);
    setBalance(null);
    try {
      setBalance(await getBalance(Number(balanceClient)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Balance lookup failed.");
    }
  }

  return (
    <>
      <header className="glass mb-4 flex items-center gap-3 rounded-3xl px-5 py-3.5">
        <span className="grid h-10 w-10 place-items-center rounded-2xl chrome">
          <Receipt weight="fill" className="h-5 w-5 text-blue" />
        </span>
        <div>
          <h1 className="font-display text-lg font-700 tracking-tight text-blue-ink">
            Payments &amp; Finance
          </h1>
          <p className="text-xs text-ink-soft">
            Record external payments · Finance verifies · only verified moves the balance
          </p>
        </div>
      </header>

      {(error || notice) && (
        <div
          className={`mb-4 rounded-2xl px-4 py-2.5 text-sm font-600 ${
            error ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {error ?? notice}
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        {/* Record form */}
        <form
          onSubmit={onRecord}
          className="glass rounded-3xl p-5 lg:col-span-2"
        >
          <h2 className="mb-3 flex items-center gap-2 font-display font-700 text-blue-ink">
            <Plus weight="bold" className="h-4 w-4" /> Record a payment
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Client ID">
              <input
                type="number"
                required
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Batch ID">
              <input
                type="number"
                required
                value={form.batch}
                onChange={(e) => setForm({ ...form, batch: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Amount (₱)">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className={inputCls}
                placeholder="2000.00"
              />
            </Field>
            <Field label="Payment date">
              <input
                type="date"
                required
                value={form.payment_date}
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Method">
              <select
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
                className={inputCls}
              >
                <option value="gcash">GCash</option>
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Reference #">
              <input
                type="text"
                value={form.reference_no}
                onChange={(e) => setForm({ ...form, reference_no: e.target.value })}
                className={inputCls}
                placeholder="GC123"
              />
            </Field>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="btn-candy mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-700 disabled:opacity-70"
          >
            <Plus weight="bold" className="h-4 w-4" />
            {saving ? "Recording…" : "Record payment"}
          </button>
        </form>

        {/* Balance lookup */}
        <div className="glass rounded-3xl p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display font-700 text-blue-ink">
            <Wallet weight="fill" className="h-4 w-4" /> Balance lookup
          </h2>
          <div className="flex gap-2">
            <input
              type="number"
              value={balanceClient}
              onChange={(e) => setBalanceClient(e.target.value)}
              className={inputCls}
              placeholder="Client ID"
            />
            <button
              onClick={lookupBalance}
              className="shrink-0 rounded-2xl bg-white/70 px-4 py-2 text-sm font-700 text-blue-ink hover:bg-white"
            >
              Check
            </button>
          </div>
          {balance && (
            <dl className="mt-4 space-y-1.5 text-sm">
              <Row k="Total due" v={`₱${balance.total_due}`} />
              <Row k="Verified paid" v={`₱${balance.verified_paid}`} strong />
              <Row k="Remaining" v={`₱${balance.remaining_balance}`} strong />
            </dl>
          )}
        </div>
      </div>

      {/* List */}
      <div className="glass rounded-3xl p-5">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-700 transition-colors ${
                filter === f.value
                  ? "bg-blue text-white"
                  : "bg-white/60 text-ink-soft hover:bg-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-ink-soft">
              <tr className="border-b border-white/60">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Client</th>
                <th className="px-2 py-2">Amount</th>
                <th className="px-2 py-2">Method</th>
                <th className="px-2 py-2">Ref</th>
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-2 py-6 text-center text-ink-soft">
                    Loading…
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-2 py-6 text-center text-ink-soft">
                    No payments.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="border-b border-white/40">
                    <td className="px-2 py-2.5 font-600 text-blue-ink">{p.id}</td>
                    <td className="px-2 py-2.5">{p.client}</td>
                    <td className="px-2 py-2.5 font-700 text-blue-ink">₱{p.amount}</td>
                    <td className="px-2 py-2.5 capitalize">{p.method}</td>
                    <td className="px-2 py-2.5 text-ink-soft">{p.reference_no || "—"}</td>
                    <td className="px-2 py-2.5 text-ink-soft">{p.payment_date}</td>
                    <td className="px-2 py-2.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-700 ${STATUS_STYLES[p.status]}`}
                      >
                        {p.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      {p.status === "pending" ? (
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => decide(p.id, "verified")}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-700 text-emerald-700 hover:bg-emerald-200"
                          >
                            <CheckCircle weight="fill" className="h-3.5 w-3.5" /> Verify
                          </button>
                          <button
                            onClick={() => decide(p.id, "rejected")}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-700 text-rose-700 hover:bg-rose-200"
                          >
                            <XCircle weight="fill" className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-soft">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-ink-soft">
        Verify is Finance-only — a non-Finance account gets a 403 (enforced server-side).
      </p>
    </>
  );
}

const inputCls =
  "w-full rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-blue focus:bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-600 text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-soft">{k}</dt>
      <dd className={strong ? "font-700 text-blue-ink" : "text-ink"}>{v}</dd>
    </div>
  );
}
