"use client";

import { useCallback, useEffect, useState } from "react";
import { ListChecks, Plus, PaperPlaneTilt, Gavel } from "@phosphor-icons/react";
import {
  listTasks,
  createTask,
  submitTask,
  listStaff,
  getKpiQueue,
  createKpiReview,
  type Task,
  type StaffMember,
} from "@/lib/api";
import { useMe, can } from "@/lib/useMe";
import { TYPESCRIPT_API } from "@/lib/backend";
import StaffTasksDashboard from "./StaffTasksDashboard";

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-sky-2/70 text-blue-ink",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-rose-100 text-rose-700",
};

function defaultDeadline() {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  d.setSeconds?.(0);
  return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
}

export default function TasksPage() {
  return TYPESCRIPT_API ? <StaffTasksDashboard /> : <LegacyTasksPage />;
}

function LegacyTasksPage() {
  const me = useMe();
  const canAssign = can(me, "TASK_ASSIGN");
  const canReview = can(me, "KPI_REVIEW");
  const myId = me?.employee_id ?? null;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [queue, setQueue] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    assignee: "",
    priority: "medium",
    deadline: defaultDeadline(),
    instructions: "",
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      setTasks((await listTasks()).results);
      if (canReview) setQueue(await getKpiQueue());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks.");
    }
  }, [canReview]);

  useEffect(() => {
    load();
    if (canAssign) listStaff().then(setStaff).catch(() => {});
  }, [load, canAssign]);

  function flash(m: string) {
    setNotice(m);
    setTimeout(() => setNotice(null), 3000);
  }

  async function onAssign(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createTask({
        title: form.title,
        instructions: form.instructions,
        assignee: Number(form.assignee),
        priority: form.priority,
        deadline: new Date(form.deadline).toISOString(),
      });
      flash("Task assigned.");
      setForm((f) => ({ ...f, title: "", instructions: "" }));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not assign task.");
    }
  }

  async function onSubmitTask(id: Task["id"]) {
    setError(null);
    try {
      await submitTask(id);
      flash("Task submitted.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed.");
    }
  }

  return (
    <>
      <header className="glass mb-4 flex items-center gap-3 rounded-3xl px-5 py-3.5">
        <span className="grid h-10 w-10 place-items-center rounded-2xl chrome">
          <ListChecks weight="fill" className="h-5 w-5 text-blue" />
        </span>
        <div>
          <h1 className="font-display text-lg font-700 tracking-tight text-blue-ink">
            Employee Tasks &amp; KPI
          </h1>
          <p className="text-xs text-ink-soft">
            On-time/late is an objective fact — never an automatic wage action
          </p>
        </div>
      </header>

      {(error || notice) && (
        <div className={`mb-4 rounded-2xl px-4 py-2.5 text-sm font-600 ${error ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
          {error ?? notice}
        </div>
      )}

      {canAssign && (
        <form onSubmit={onAssign} className="glass mb-4 rounded-3xl p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display font-700 text-blue-ink">
            <Plus weight="bold" className="h-4 w-4" /> Assign a task
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Title"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Follow up batch B1" /></Field>
            <Field label="Assignee">
              <select required value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} className={inputCls}>
                <option value="">Select…</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </Field>
            <Field label="Deadline"><input type="datetime-local" required value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={inputCls} /></Field>
          </div>
          <button type="submit" className="btn-candy mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-700">
            <Plus weight="bold" className="h-4 w-4" /> Assign task
          </button>
        </form>
      )}

      <div className="glass mb-4 overflow-x-auto rounded-3xl p-5">
        <h2 className="mb-3 font-display font-700 text-blue-ink">{canAssign ? "All tasks" : "My tasks"}</h2>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink-soft">
            <tr className="border-b border-white/60">
              <th className="px-2 py-2">Title</th>
              <th className="px-2 py-2">Assignee</th>
              <th className="px-2 py-2">Priority</th>
              <th className="px-2 py-2">Deadline</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">On time?</th>
              <th className="px-2 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr><td colSpan={7} className="px-2 py-6 text-center text-ink-soft">No tasks.</td></tr>
            ) : (
              tasks.map((t) => (
                <tr key={t.id} className="border-b border-white/40">
                  <td className="px-2 py-2.5 font-700 text-blue-ink">{t.title}</td>
                  <td className="px-2 py-2.5 text-ink-soft">{t.assignee_name}</td>
                  <td className="px-2 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-700 capitalize ${PRIORITY_STYLES[t.priority] ?? ""}`}>{t.priority}</span></td>
                  <td className="px-2 py-2.5 text-ink-soft">{t.deadline.replace("T", " ").slice(0, 16)}</td>
                  <td className="px-2 py-2.5 capitalize">{t.status.replace(/_/g, " ")}</td>
                  <td className="px-2 py-2.5">
                    {t.late_flag === null ? <span className="text-xs text-ink-soft">—</span>
                      : t.late_flag ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-700 text-rose-700">Late</span>
                      : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-700 text-emerald-700">On time</span>}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    {t.assignee === myId && (t.status === "todo" || t.status === "in_progress") ? (
                      <button onClick={() => onSubmitTask(t.id)} className="inline-flex items-center gap-1 rounded-full bg-blue px-2.5 py-1 text-xs font-700 text-white hover:bg-blue-600">
                        <PaperPlaneTilt weight="fill" className="h-3.5 w-3.5" /> Submit
                      </button>
                    ) : <span className="text-xs text-ink-soft">—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canReview && (
        <div className="glass rounded-3xl p-5">
          <h2 className="mb-1 flex items-center gap-2 font-display font-700 text-blue-ink">
            <Gavel weight="fill" className="h-4 w-4" /> KPI review queue
          </h2>
          <p className="mb-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-600 text-amber-800">
            The late flag is a factual record only — it must not be the sole basis for any
            disciplinary or wage action. No automatic deductions; decisions are yours to make.
          </p>
          {queue.length === 0 ? (
            <p className="text-center text-sm text-ink-soft">No flagged submissions to review.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {queue.map((t) => <KpiItem key={t.id} task={t} onDone={load} />)}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function KpiItem({ task, onDone }: { task: Task; onDone: () => void }) {
  const [evaluation, setEvaluation] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [decision, setDecision] = useState("noted");
  const [saving, setSaving] = useState(false);

  async function record() {
    setSaving(true);
    try {
      await createKpiReview({ task: task.id, evaluation, recommendation, decision });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-tint rounded-2xl p-4">
      <p className="text-sm font-700 text-blue-ink">{task.title}</p>
      <p className="mb-2 text-xs text-ink-soft">
        {task.assignee_name} · submitted {task.submission_timestamp?.replace("T", " ").slice(0, 16)} ·{" "}
        <span className="font-700 text-rose-700">LATE vs deadline {task.deadline.replace("T", " ").slice(0, 16)}</span>
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input value={evaluation} onChange={(e) => setEvaluation(e.target.value)} placeholder="Evaluation (context)" className={inputCls} />
        <input value={recommendation} onChange={(e) => setRecommendation(e.target.value)} placeholder="Recommendation (optional)" className={inputCls} />
        <div className="flex gap-2">
          <select value={decision} onChange={(e) => setDecision(e.target.value)} className={inputCls}>
            <option value="noted">Noted</option>
            <option value="action_recommended">Action recommended</option>
          </select>
          <button onClick={record} disabled={saving} className="shrink-0 rounded-2xl bg-blue px-4 py-2 text-sm font-700 text-white hover:bg-blue-600 disabled:opacity-70">
            Record
          </button>
        </div>
      </div>
    </div>
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
