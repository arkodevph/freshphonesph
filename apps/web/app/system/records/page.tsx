"use client";

import { useCallback, useEffect, useState } from "react";
import { Stack, Plus } from "@phosphor-icons/react";
import { listBatches, createBatch, type Batch } from "@/lib/api";
import { useMe, can } from "@/lib/useMe";

const today = () => new Date().toISOString().slice(0, 10);

export default function RecordsPage() {
  const me = useMe();
  const canManage = can(me, "BATCH_MANAGE");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    batch_number: "",
    unit_model: "",
    contract_price: "",
    num_installments: "6",
    cadence: "monthly",
    status: "active",
    start_date: today(),
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBatches((await listBatches()).results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load batches.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function flash(m: string) {
    setNotice(m);
    setTimeout(() => setNotice(null), 3000);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createBatch({
        batch_number: form.batch_number,
        unit_model: form.unit_model,
        status: form.status,
        contract_price: form.contract_price,
        num_installments: Number(form.num_installments),
        cadence: form.cadence,
        start_date: form.start_date,
      });
      flash("Batch created.");
      setForm((f) => ({ ...f, batch_number: "", unit_model: "", contract_price: "" }));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create batch.");
    } finally {
      setSaving(false);
    }
  }

  if (me && !canManage) {
    return (
      <section className="glass rounded-3xl p-10 text-center">
        <h1 className="font-display text-xl font-700 text-blue-ink">No access</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Your role doesn&apos;t manage Paluwagan records.
        </p>
      </section>
    );
  }

  return (
    <>
      <header className="glass mb-4 flex items-center gap-3 rounded-3xl px-5 py-3.5">
        <span className="grid h-10 w-10 place-items-center rounded-2xl chrome">
          <Stack weight="fill" className="h-5 w-5 text-blue" />
        </span>
        <div>
          <h1 className="font-display text-lg font-700 tracking-tight text-blue-ink">
            Paluwagan Records
          </h1>
          <p className="text-xs text-ink-soft">
            Batches — the plan terms drive each member&apos;s schedule &amp; balance
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

      <form onSubmit={onCreate} className="glass mb-4 rounded-3xl p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display font-700 text-blue-ink">
          <Plus weight="bold" className="h-4 w-4" /> New batch
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Batch number">
            <input required value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} className={inputCls} placeholder="B-2026-01" />
          </Field>
          <Field label="Unit / model">
            <input required value={form.unit_model} onChange={(e) => setForm({ ...form, unit_model: e.target.value })} className={inputCls} placeholder="iPhone 15" />
          </Field>
          <Field label="Contract price (₱)">
            <input type="number" step="0.01" min="0.01" required value={form.contract_price} onChange={(e) => setForm({ ...form, contract_price: e.target.value })} className={inputCls} placeholder="15000.00" />
          </Field>
          <Field label="Installments">
            <input type="number" min="1" required value={form.num_installments} onChange={(e) => setForm({ ...form, num_installments: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Cadence">
            <select value={form.cadence} onChange={(e) => setForm({ ...form, cadence: e.target.value })} className={inputCls}>
              <option value="weekly">Weekly</option>
              <option value="semimonthly">Semi-monthly</option>
              <option value="monthly">Monthly</option>
            </select>
          </Field>
          <Field label="Start date">
            <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
              <option value="forming">Forming</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
        </div>
        <button type="submit" disabled={saving} className="btn-candy mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-700 disabled:opacity-70">
          <Plus weight="bold" className="h-4 w-4" />
          {saving ? "Creating…" : "Create batch"}
        </button>
      </form>

      <div className="glass overflow-x-auto rounded-3xl p-5">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink-soft">
            <tr className="border-b border-white/60">
              <th className="px-2 py-2">Batch</th>
              <th className="px-2 py-2">Unit</th>
              <th className="px-2 py-2">Price</th>
              <th className="px-2 py-2">Installments</th>
              <th className="px-2 py-2">Cadence</th>
              <th className="px-2 py-2">Members</th>
              <th className="px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-2 py-6 text-center text-ink-soft">Loading…</td></tr>
            ) : batches.length === 0 ? (
              <tr><td colSpan={7} className="px-2 py-6 text-center text-ink-soft">No batches yet.</td></tr>
            ) : (
              batches.map((b) => (
                <tr key={b.id} className="border-b border-white/40">
                  <td className="px-2 py-2.5 font-700 text-blue-ink">{b.batch_number}</td>
                  <td className="px-2 py-2.5">{b.unit_model}</td>
                  <td className="px-2 py-2.5 font-600 text-blue-ink">₱{b.contract_price}</td>
                  <td className="px-2 py-2.5 text-ink-soft">{b.num_installments}</td>
                  <td className="px-2 py-2.5 capitalize text-ink-soft">{b.cadence}</td>
                  <td className="px-2 py-2.5">{b.member_count}</td>
                  <td className="px-2 py-2.5 capitalize">
                    <span className="rounded-full bg-sky-2/70 px-2.5 py-1 text-xs font-700 text-blue-ink">{b.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
