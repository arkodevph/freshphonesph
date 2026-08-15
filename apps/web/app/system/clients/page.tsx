"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Users, Plus, CalendarBlank } from "@phosphor-icons/react";
import {
  listClients,
  createClient,
  listBatches,
  getSchedule,
  type ClientRecord,
  type Batch,
  type ScheduleItem,
} from "@/lib/api";
import { useMe, can } from "@/lib/useMe";

const today = () => new Date().toISOString().slice(0, 10);

export default function ClientsPage() {
  const me = useMe();
  const canManage = can(me, "CLIENT_MANAGE");
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<{ id: number; items: ScheduleItem[] } | null>(null);
  const [form, setForm] = useState({
    batch: "",
    full_name: "",
    contact_email: "",
    joined_at: today(),
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, b] = await Promise.all([listClients(), listBatches()]);
      setClients(c.results);
      setBatches(b.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
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
      await createClient({
        batch: Number(form.batch),
        full_name: form.full_name,
        contact_email: form.contact_email,
        joined_at: form.joined_at,
      });
      flash("Client added — schedule generated.");
      setForm((f) => ({ ...f, full_name: "", contact_email: "" }));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add client.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSchedule(id: number) {
    if (schedule?.id === id) {
      setSchedule(null);
      return;
    }
    try {
      setSchedule({ id, items: await getSchedule(id) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load schedule.");
    }
  }

  if (me && !canManage) {
    return (
      <section className="glass rounded-3xl p-10 text-center">
        <h1 className="font-display text-xl font-700 text-blue-ink">No access</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Your role doesn&apos;t manage client records.
        </p>
      </section>
    );
  }

  return (
    <>
      <header className="glass mb-4 flex items-center gap-3 rounded-3xl px-5 py-3.5">
        <span className="grid h-10 w-10 place-items-center rounded-2xl chrome">
          <Users weight="fill" className="h-5 w-5 text-blue" />
        </span>
        <div>
          <h1 className="font-display text-lg font-700 tracking-tight text-blue-ink">Clients</h1>
          <p className="text-xs text-ink-soft">
            Members of a batch — adding one auto-generates their installment schedule
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
          <Plus weight="bold" className="h-4 w-4" /> Add client to a batch
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Batch">
            <select required value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} className={inputCls}>
              <option value="">Select batch…</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_number} — {b.unit_model}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Full name">
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputCls} placeholder="Maria Cruz" />
          </Field>
          <Field label="Contact email">
            <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className={inputCls} placeholder="maria@example.com" />
          </Field>
          <Field label="Joined date">
            <input type="date" required value={form.joined_at} onChange={(e) => setForm({ ...form, joined_at: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <button type="submit" disabled={saving || batches.length === 0} className="btn-candy mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-700 disabled:opacity-70">
          <Plus weight="bold" className="h-4 w-4" />
          {saving ? "Adding…" : "Add client"}
        </button>
        {batches.length === 0 && (
          <p className="mt-2 text-xs text-ink-soft">Create a batch first (Paluwagan Records).</p>
        )}
      </form>

      <div className="glass overflow-x-auto rounded-3xl p-5">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink-soft">
            <tr className="border-b border-white/60">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Batch</th>
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2 text-right">Schedule</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-2 py-6 text-center text-ink-soft">Loading…</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={6} className="px-2 py-6 text-center text-ink-soft">No clients yet.</td></tr>
            ) : (
              clients.map((c) => (
                <Fragment key={c.id}>
                  <tr className="border-b border-white/40">
                    <td className="px-2 py-2.5 font-600 text-blue-ink">{c.id}</td>
                    <td className="px-2 py-2.5 font-700 text-blue-ink">{c.full_name}</td>
                    <td className="px-2 py-2.5 text-ink-soft">{c.batch_number}</td>
                    <td className="px-2 py-2.5 text-ink-soft">{c.contact_email || "—"}</td>
                    <td className="px-2 py-2.5 capitalize">
                      <span className="rounded-full bg-sky-2/70 px-2.5 py-1 text-xs font-700 text-blue-ink">{c.status}</span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <button onClick={() => toggleSchedule(c.id)} className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-700 text-blue hover:bg-white">
                        <CalendarBlank weight="bold" className="h-3.5 w-3.5" />
                        {schedule?.id === c.id ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  {schedule?.id === c.id && (
                    <tr>
                      <td colSpan={6} className="px-2 pb-3">
                        <div className="glass-tint rounded-2xl p-3">
                          <table className="w-full text-left text-xs">
                            <thead className="text-ink-soft">
                              <tr>
                                <th className="px-2 py-1">#</th>
                                <th className="px-2 py-1">Due date</th>
                                <th className="px-2 py-1">Expected</th>
                              </tr>
                            </thead>
                            <tbody>
                              {schedule.items.map((s) => (
                                <tr key={s.id}>
                                  <td className="px-2 py-1">{s.sequence_no}</td>
                                  <td className="px-2 py-1">{s.due_date}</td>
                                  <td className="px-2 py-1 font-600 text-blue-ink">₱{s.expected_amount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
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
