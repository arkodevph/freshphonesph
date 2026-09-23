"use client";

import { useCallback, useEffect, useState } from "react";
import { Briefcase, Plus, IdentificationCard } from "@phosphor-icons/react";
import {
  listJobs, createJob, updateJob,
  listApplicants, updateApplicant,
  listAgents, createAgent,
  type JobOpening, type Applicant, type AgentRecord,
} from "@/lib/api";
import { useMe, can } from "@/lib/useMe";

const APPLICANT_STATUSES = ["received", "reviewing", "shortlisted", "rejected", "hired"];

export default function RecruitmentPage() {
  const me = useMe();
  const canRecruit = can(me, "RECRUITMENT_MANAGE");
  const canAgents = can(me, "CLIENT_MANAGE");

  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [jobForm, setJobForm] = useState({ title: "", employment_type: "", location: "", description: "" });
  const [agentForm, setAgentForm] = useState({ full_name: "", agent_code: "" });

  const load = useCallback(async () => {
    setError(null);
    try {
      if (canRecruit) {
        setJobs((await listJobs()).results);
        setApplicants((await listApplicants()).results);
      }
      if (canAgents) setAgents((await listAgents()).results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    }
  }, [canRecruit, canAgents]);

  useEffect(() => { load(); }, [load]);
  function flash(m: string) { setNotice(m); setTimeout(() => setNotice(null), 3000); }

  async function addJob(e: React.FormEvent) {
    e.preventDefault();
    try { await createJob(jobForm); flash("Job opening posted."); setJobForm({ title: "", employment_type: "", location: "", description: "" }); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed."); }
  }
  async function toggleJob(j: JobOpening) {
    try { await updateJob(j.id, { is_open: !j.is_open }); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed."); }
  }
  async function setApplicantStatus(a: Applicant, status: string) {
    try { await updateApplicant(a.id, { status }); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed."); }
  }
  async function addAgent(e: React.FormEvent) {
    e.preventDefault();
    try { await createAgent({ ...agentForm, is_active: true }); flash("Agent added."); setAgentForm({ full_name: "", agent_code: "" }); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed."); }
  }

  if (me && !canRecruit && !canAgents) {
    return (
      <section className="glass rounded-3xl p-10 text-center">
        <h1 className="font-display text-xl font-700 text-blue-ink">No access</h1>
        <p className="mt-2 text-sm text-ink-soft">Your role doesn&apos;t handle recruitment or agents.</p>
      </section>
    );
  }

  return (
    <>
      <header className="glass mb-4 flex items-center gap-3 rounded-3xl px-5 py-3.5">
        <span className="grid h-10 w-10 place-items-center rounded-2xl chrome">
          <Briefcase weight="fill" className="h-5 w-5 text-blue" />
        </span>
        <div>
          <h1 className="font-display text-lg font-700 tracking-tight text-blue-ink">Recruitment &amp; Agents</h1>
          <p className="text-xs text-ink-soft">Careers, applications, and agent verification records</p>
        </div>
      </header>

      {(error || notice) && (
        <div className={`mb-4 rounded-2xl px-4 py-2.5 text-sm font-600 ${error ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{error ?? notice}</div>
      )}

      {canRecruit && (
        <>
          <form onSubmit={addJob} className="glass mb-4 rounded-3xl p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display font-700 text-blue-ink"><Plus weight="bold" className="h-4 w-4" /> Post a job opening</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <input required value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} className={inputCls} placeholder="Title" />
              <input value={jobForm.employment_type} onChange={(e) => setJobForm({ ...jobForm, employment_type: e.target.value })} className={inputCls} placeholder="Full-time / Agent" />
              <input value={jobForm.location} onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })} className={inputCls} placeholder="Location" />
              <input value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} className={inputCls} placeholder="Short description" />
            </div>
            <button className="btn-candy mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-700"><Plus weight="bold" className="h-4 w-4" /> Post opening</button>
          </form>

          <div className="glass mb-4 overflow-x-auto rounded-3xl p-5">
            <h2 className="mb-3 font-display font-700 text-blue-ink">Job openings</h2>
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-soft"><tr className="border-b border-white/60"><th className="px-2 py-2">Title</th><th className="px-2 py-2">Type</th><th className="px-2 py-2">Applicants</th><th className="px-2 py-2 text-right">Open?</th></tr></thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b border-white/40">
                    <td className="px-2 py-2.5 font-700 text-blue-ink">{j.title}</td>
                    <td className="px-2 py-2.5 text-ink-soft">{j.employment_type || "—"}</td>
                    <td className="px-2 py-2.5">{j.applicant_count ?? 0}</td>
                    <td className="px-2 py-2.5 text-right">
                      <button onClick={() => toggleJob(j)} className={`rounded-full px-2.5 py-1 text-xs font-700 ${j.is_open ? "bg-emerald-100 text-emerald-700" : "bg-ink-soft/15 text-ink-soft"}`}>{j.is_open ? "Open" : "Closed"}</button>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && <tr><td colSpan={4} className="px-2 py-6 text-center text-ink-soft">No openings yet.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="glass mb-4 overflow-x-auto rounded-3xl p-5">
            <h2 className="mb-3 font-display font-700 text-blue-ink">Applicants</h2>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-soft"><tr className="border-b border-white/60"><th className="px-2 py-2">Name</th><th className="px-2 py-2">Role</th><th className="px-2 py-2">Contact</th><th className="px-2 py-2">Status</th></tr></thead>
              <tbody>
                {applicants.map((a) => (
                  <tr key={a.id} className="border-b border-white/40">
                    <td className="px-2 py-2.5 font-700 text-blue-ink">{a.full_name}</td>
                    <td className="px-2 py-2.5 text-ink-soft">{a.job_title || "—"}</td>
                    <td className="px-2 py-2.5 text-ink-soft">{a.email}</td>
                    <td className="px-2 py-2.5">
                      <select value={a.status} onChange={(e) => setApplicantStatus(a, e.target.value)} className="rounded-xl border border-white/70 bg-white/70 px-2 py-1 text-xs font-600 capitalize text-blue-ink outline-none focus:border-blue">
                        {APPLICANT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
                {applicants.length === 0 && <tr><td colSpan={4} className="px-2 py-6 text-center text-ink-soft">No applicants yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {canAgents && (
        <div className="glass rounded-3xl p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display font-700 text-blue-ink"><IdentificationCard weight="fill" className="h-4 w-4" /> Agents (public verification records)</h2>
          <form onSubmit={addAgent} className="mb-3 flex flex-wrap gap-2">
            <input required value={agentForm.full_name} onChange={(e) => setAgentForm({ ...agentForm, full_name: e.target.value })} className={inputCls + " max-w-[14rem]"} placeholder="Agent full name" />
            <input required value={agentForm.agent_code} onChange={(e) => setAgentForm({ ...agentForm, agent_code: e.target.value })} className={inputCls + " max-w-[12rem]"} placeholder="Agent code (e.g. AG-2026-0042)" />
            <button className="btn-candy inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-700"><Plus weight="bold" className="h-4 w-4" /> Add</button>
          </form>
          <ul className="flex flex-col gap-1.5">
            {agents.map((ag) => (
              <li key={ag.id} className="glass-tint flex items-center justify-between rounded-2xl px-4 py-2.5 text-sm">
                <span className="font-700 text-blue-ink">{ag.full_name}</span>
                <span className="text-ink-soft">{ag.agent_code}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-700 ${ag.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{ag.is_active ? "Active" : "Inactive"}</span>
              </li>
            ))}
            {agents.length === 0 && <li className="py-3 text-center text-sm text-ink-soft">No agents yet.</li>}
          </ul>
        </div>
      )}
    </>
  );
}

const inputCls =
  "w-full rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-blue focus:bg-white";
