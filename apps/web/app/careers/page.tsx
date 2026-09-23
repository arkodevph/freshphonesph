"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, PaperPlaneTilt } from "@phosphor-icons/react";
import { getCareers, applyToJob, type JobOpening } from "@/lib/api";

export default function CareersPage() {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [form, setForm] = useState({ job: "", full_name: "", email: "", phone: "", message: "" });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getCareers().then(setJobs).catch(() => {});
  }, []);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await applyToJob({
        job: Number(form.job),
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        message: form.message,
      });
      setNotice("Application received — thank you! We'll be in touch.");
      setForm((f) => ({ ...f, full_name: "", email: "", phone: "", message: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-600 text-ink-soft hover:text-blue">
        <ArrowLeft className="h-4 w-4" /> Back to site
      </Link>
      <h1 className="font-display text-3xl font-800 tracking-tight text-blue-ink">
        Careers at <span className="holo-text">Fresh Phones PH</span>
      </h1>
      <p className="mt-1 text-ink-soft">Join the team. Open roles below — apply in a minute.</p>

      <div className="mt-6 grid gap-3">
        {jobs.length === 0 ? (
          <p className="glass rounded-3xl p-6 text-center text-ink-soft">No open roles right now.</p>
        ) : (
          jobs.map((j) => (
            <div key={j.id} className="glass rounded-3xl p-5">
              <div className="flex items-center gap-2">
                <Briefcase weight="fill" className="h-5 w-5 text-blue" />
                <h2 className="font-display text-lg font-700 text-blue-ink">{j.title}</h2>
              </div>
              {(j.location || j.employment_type) && (
                <p className="mt-1 text-xs font-600 text-ink-soft">
                  {[j.employment_type, j.location].filter(Boolean).join(" · ")}
                </p>
              )}
              {j.description && <p className="mt-2 text-sm text-ink-soft">{j.description}</p>}
            </div>
          ))
        )}
      </div>

      <div className="glass mt-6 rounded-3xl p-6">
        <h2 className="mb-3 font-display text-lg font-700 text-blue-ink">Apply</h2>
        {(error || notice) && (
          <div className={`mb-3 rounded-2xl px-4 py-2.5 text-sm font-600 ${error ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
            {error ?? notice}
          </div>
        )}
        <form onSubmit={apply} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-600 text-ink-soft">Role</span>
            <select required value={form.job} onChange={(e) => setForm({ ...form, job: e.target.value })} className={inputCls}>
              <option value="">Select a role…</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-600 text-ink-soft">Full name</span>
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-600 text-ink-soft">Email</span>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-600 text-ink-soft">Phone (optional)</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-600 text-ink-soft">Message (optional)</span>
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} className={inputCls} />
          </label>
          <button type="submit" disabled={sending} className="btn-candy inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-700 disabled:opacity-70 sm:col-span-2">
            <PaperPlaneTilt weight="fill" className="h-5 w-5" /> {sending ? "Sending…" : "Submit application"}
          </button>
        </form>
      </div>
    </main>
  );
}

const inputCls =
  "w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-blue focus:bg-white";
