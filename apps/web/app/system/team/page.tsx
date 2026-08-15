"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, UserPlus } from "@phosphor-icons/react";
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  ROLES,
  type Employee,
} from "@/lib/api";
import { useMe, can } from "@/lib/useMe";

const roleLabel = (v: string) => ROLES.find(([k]) => k === v)?.[1] ?? v;

export default function TeamPage() {
  const me = useMe();
  const canAdmin = can(me, "ROLE_ASSIGN");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    role: "records_monitoring",
    password: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEmployees((await listEmployees()).results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team.");
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
      await createEmployee(form);
      flash(`Account created for ${form.email}.`);
      setForm((f) => ({ ...f, email: "", full_name: "", password: "" }));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create account.");
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(emp: Employee, role: string) {
    setError(null);
    try {
      await updateEmployee(emp.id, { role });
      flash(`${emp.full_name} is now ${roleLabel(role)}.`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update role.");
    }
  }

  async function toggleStatus(emp: Employee) {
    const status = emp.status === "active" ? "inactive" : "active";
    try {
      await updateEmployee(emp.id, { status });
      flash(`${emp.full_name} set ${status}.`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update status.");
    }
  }

  if (me && !canAdmin) {
    return (
      <section className="glass rounded-3xl p-10 text-center">
        <h1 className="font-display text-xl font-700 text-blue-ink">No access</h1>
        <p className="mt-2 text-sm text-ink-soft">Only the Owner manages users &amp; roles.</p>
      </section>
    );
  }

  return (
    <>
      <header className="glass mb-4 flex items-center gap-3 rounded-3xl px-5 py-3.5">
        <span className="grid h-10 w-10 place-items-center rounded-2xl chrome">
          <ShieldCheck weight="fill" className="h-5 w-5 text-blue" />
        </span>
        <div>
          <h1 className="font-display text-lg font-700 tracking-tight text-blue-ink">
            Users &amp; Roles
          </h1>
          <p className="text-xs text-ink-soft">
            Create staff accounts and assign roles — the role controls what each person can see &amp; do
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
          <UserPlus weight="bold" className="h-4 w-4" /> New staff account
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Email">
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="name@freshphones.ph" />
          </Field>
          <Field label="Full name">
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputCls} placeholder="Juan Dela Cruz" />
          </Field>
          <Field label="Role">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls}>
              {ROLES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Temp password">
            <input type="text" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} placeholder="min 8 chars" />
          </Field>
        </div>
        <button type="submit" disabled={saving} className="btn-candy mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-700 disabled:opacity-70">
          <UserPlus weight="bold" className="h-4 w-4" />
          {saving ? "Creating…" : "Create account"}
        </button>
      </form>

      <div className="glass overflow-x-auto rounded-3xl p-5">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink-soft">
            <tr className="border-b border-white/60">
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Role</th>
              <th className="px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-2 py-6 text-center text-ink-soft">Loading…</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={4} className="px-2 py-6 text-center text-ink-soft">No staff accounts.</td></tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="border-b border-white/40">
                  <td className="px-2 py-2.5 font-700 text-blue-ink">{emp.full_name}</td>
                  <td className="px-2 py-2.5 text-ink-soft">{emp.email}</td>
                  <td className="px-2 py-2.5">
                    <select
                      value={emp.role}
                      onChange={(e) => changeRole(emp, e.target.value)}
                      className="rounded-xl border border-white/70 bg-white/70 px-2 py-1 text-xs font-600 text-blue-ink outline-none focus:border-blue"
                    >
                      {ROLES.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2.5">
                    <button
                      onClick={() => toggleStatus(emp)}
                      className={`rounded-full px-2.5 py-1 text-xs font-700 ${
                        emp.status === "active"
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-ink-soft/15 text-ink-soft hover:bg-ink-soft/25"
                      }`}
                    >
                      {emp.status}
                    </button>
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
