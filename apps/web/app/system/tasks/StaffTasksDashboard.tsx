"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { ListChecks, Plus, X } from "@phosphor-icons/react";
import { ApiError, tsDownload, tsRequest, tsUpload } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { can, useMe } from "@/lib/useMe";
import styles from "./staff-tasks.module.css";

type Status = "TODO" | "IN_PROGRESS" | "SUBMITTED" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH";
type Task = {
  id: string; title: string; instructions: string; assigneeId: string; assigneeName: string;
  creatorName: string; priority: Priority; deadline: string; status: Status;
  report: string; submittedAt: string | null; lateFlag: boolean | null;
  attachment: { fileName: string; size: number } | null; reviewed: boolean;
  review: { reviewerName: string; factualEvidence: string; evaluation: string; recommendation: string; decision: string; createdAt: string } | null;
  version: number;
};
type Page<T> = { results: T[]; count: number; page: number; pageSize: number };
type Assignee = { id: string; name: string; role: string };
type Review = { id: string; taskId: string; taskTitle: string; assigneeName: string; reviewerName: string; factualEvidence: string; evaluation: string; recommendation: string; decision: string; createdAt: string };

const formatDate = (date: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(date)) + " PHT";
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const deadlineDefault = () => {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};
const message = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Please try again.";

function TaskLocationSync({ onTask }: { onTask: (id: string | null) => void }) {
  const raw = useSearchParams().get("task");
  useEffect(() => {
    onTask(raw && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw) ? raw : null);
  }, [raw, onTask]);
  return null;
}

export default function StaffTasksDashboard() {
  const me = useMe();
  if (!me) return <p role="status">Loading task access…</p>;
  if (me.account_type !== "employee") return <section><h1>No access</h1><p>Staff access is required for tasks.</p></section>;
  return <TaskWorkspace key={`${me.id}:${can(me, "TASK_ASSIGN")}:${can(me, "KPI_REVIEW")}`} me={me} />;
}

function TaskWorkspace({ me }: { me: NonNullable<ReturnType<typeof useMe>> }) {
  const canAssign = can(me, "TASK_ASSIGN");
  const canReview = can(me, "KPI_REVIEW");
  const [tasks, setTasks] = useState<Page<Task> | null>(null);
  const [queue, setQueue] = useState<Page<Task> | null>(null);
  const [history, setHistory] = useState<Page<Review> | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [queuePage, setQueuePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<Task | null>(null);
  const [linkedId, setLinkedId] = useState<string | null>(null);
  const [activeChanged, setActiveChanged] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", instructions: "", assigneeId: "", priority: "MEDIUM" as Priority, deadline: deadlineDefault() });
  const [report, setReport] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [evaluation, setEvaluation] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [decision, setDecision] = useState("NOTED");
  const dialog = useRef<HTMLDialogElement>(null);
  const activeTaskId = useRef<string | null>(null);
  const detailSequence = useRef(0);
  const listSequence = useRef(0);
  const draft = useRef(false);
  const activeSnapshot = useRef(active); activeSnapshot.current = active;
  const mutationBusy = useRef(busy); mutationBusy.current = busy;
  draft.current = Boolean(report.trim() || attachment || evaluation.trim() || recommendation.trim() || decision !== "NOTED");
  const staff = Boolean(me && me.account_type === "employee");

  const reload = useCallback(async () => {
    if (!staff) return;
    const request = ++listSequence.current;
    try {
      const [taskData, queueData, historyData] = await Promise.all([
        tsRequest<Page<Task>>(`/tasks?page=${page}${status ? `&status=${status}` : ""}`),
        canReview ? tsRequest<Page<Task>>(`/kpi/queue?page=${queuePage}`) : Promise.resolve(null),
        canReview ? tsRequest<Page<Review>>(`/kpi/reviews?page=${historyPage}`) : Promise.resolve(null),
      ]);
      if (request !== listSequence.current) return;
      setTasks(taskData);
      setQueue(queueData);
      setHistory(historyData);
    } catch (caught) { if (request === listSequence.current) setError(message(caught)); }
  }, [staff, page, status, canReview, queuePage, historyPage]);

  const refreshActive = useCallback(async () => {
    const id = activeTaskId.current;
    if (!staff || !id || mutationBusy.current || activeSnapshot.current?.id !== id) return;
    const request = ++detailSequence.current;
    try {
      const latest = await tsRequest<Task>(`/tasks/${id}`);
      if (request !== detailSequence.current || activeTaskId.current !== id) return;
      // Keep the record version captured when the report/review editor opened.
      if (activeSnapshot.current?.id === id && activeSnapshot.current.version !== latest.version) setActiveChanged(true);
      else setActive(latest);
    } catch (caught) {
      if (request !== detailSequence.current || activeTaskId.current !== id) return;
      setError(message(caught));
      if (caught instanceof ApiError && [403, 404].includes(caught.status)) {
        dialog.current?.close(); activeTaskId.current = null; setActiveId(null); setActive(null);
      }
    }
  }, [staff]);

  useEffect(() => { void reload(); return () => { listSequence.current++; }; }, [reload]);
  useEffect(() => {
    if (!canAssign) return;
    void tsRequest<Assignee[]>("/tasks/assignees").then(setAssignees).catch((caught) => setError(message(caught)));
  }, [canAssign]);
  useLiveRecords(() => { void reload(); void refreshActive(); }, staff);

  const openTask = useCallback(async (id: string) => {
    if (activeTaskId.current === id) return;
    if (activeTaskId.current && draft.current && !window.confirm("Discard your unsaved task report or review and open the linked task?")) {
      window.history.replaceState(null, "", `/system/tasks?task=${activeTaskId.current}`); return;
    }
    const request = ++detailSequence.current;
    activeTaskId.current = id; setActiveChanged(false);
    setActiveId(id); setActive(null); setLoadingDetail(true); setError(""); setNotice(""); setReport(""); setAttachment(null);
    setEvaluation(""); setRecommendation(""); setDecision("NOTED");
    if (!dialog.current?.open) dialog.current?.showModal();
    try {
      const task = await tsRequest<Task>(`/tasks/${id}`);
      if (request === detailSequence.current && activeTaskId.current === id) setActive(task);
    }
    catch (caught) { if (request === detailSequence.current) { setError(message(caught)); dialog.current?.close(); activeTaskId.current = null; setActiveId(null); } }
    finally { if (request === detailSequence.current) setLoadingDetail(false); }
  }, []);
  useEffect(() => { if (staff && linkedId) void openTask(linkedId); }, [staff, linkedId, openTask]);
  function clearTask() {
    detailSequence.current++; activeTaskId.current = null; setActiveId(null); setActive(null); setActiveChanged(false);
    setReport(""); setAttachment(null); setEvaluation(""); setRecommendation(""); setDecision("NOTED");
    if (new URLSearchParams(window.location.search).has("task")) window.history.replaceState(null, "", "/system/tasks");
  }
  function closeTask() {
    if (busy || (draft.current && !window.confirm("Discard your unsaved task report or review?"))) return;
    dialog.current?.close(); clearTask();
  }
  async function loadLatestTask() {
    if (!active || (draft.current && !window.confirm("Discard your unsaved task report or review and load the latest task?"))) return;
    const id = active.id; activeTaskId.current = null;
    await openTask(id);
  }
  async function mutate(run: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      await run(); setNotice(success); await reload();
      if (activeId && activeTaskId.current === activeId) {
        const request = ++detailSequence.current;
        const latest = await tsRequest<Task>(`/tasks/${activeId}`);
        if (request === detailSequence.current && activeTaskId.current === activeId) { setActive(latest); setActiveChanged(false); }
      }
      return true;
    }
    catch (caught) { setError(message(caught)); return false; }
    finally { setBusy(false); }
  }
  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await mutate(() => tsRequest("/tasks", { method: "POST", body: JSON.stringify({ ...form, deadline: new Date(form.deadline).toISOString() }) }), "Task assigned."))
      setForm((current) => ({ ...current, title: "", instructions: "" }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!active || activeChanged || (!report.trim() && !attachment)) return;
    const data = new FormData(); data.set("version", String(active.version)); data.set("report", report.trim());
    if (attachment) data.set("attachment", attachment);
    if (await mutate(() => tsUpload(`/tasks/${active.id}/submit`, data), "Work submitted for review.")) {
      setReport(""); setAttachment(null);
    }
  }
  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!active || activeChanged) return;
    await mutate(() => tsRequest("/kpi/reviews", { method: "POST", body: JSON.stringify({
      taskId: active.id, version: active.version, evaluation: evaluation.trim(), recommendation: recommendation.trim(), decision,
    }) }), "KPI review recorded.");
  }
  async function download(task: Task) {
    try {
      const blob = await tsDownload(`/tasks/${task.id}/attachment`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = task.attachment?.fileName ?? "task-evidence";
      link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) { setError(message(caught)); }
  }

  if (me && !staff) return <section><h1>No access</h1><p>Staff access is required for tasks.</p></section>;
  return <main className={styles.page}>
    <Suspense fallback={null}><TaskLocationSync onTask={setLinkedId} /></Suspense>
    <header className={styles.header}>
      <div className={styles.icon}><ListChecks weight="duotone" /></div>
      <div><span className={styles.eyebrow}>Staff operations</span><h1>Tasks &amp; KPI</h1><p>Assign work, submit evidence, and record a human review of late submissions.</p></div>
    </header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {notice && <p className={styles.success} role="status">{notice}</p>}

    {canAssign && <section className={styles.card}>
      <div className={styles.sectionHead}><div><span className={styles.eyebrow}>New assignment</span><h2>Assign a task</h2></div></div>
      <form onSubmit={assign} className={styles.assignForm}>
        <label className={styles.wide}>Title<input required minLength={2} maxLength={200} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Verify batch records" /></label>
        <label>Assignee<select required value={form.assigneeId} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })}><option value="">Choose staff member</option>{assignees.map((person) => <option key={person.id} value={person.id}>{person.name} · {label(person.role)}</option>)}</select></label>
        <label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as Priority })}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></label>
        <label>Deadline<input required type="datetime-local" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></label>
        <label className={styles.full}>Instructions<textarea maxLength={5000} rows={3} value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="What should be done?" /></label>
        <div className={styles.formActions}><button className={styles.primary} disabled={busy} type="submit"><Plus /> {busy ? "Saving…" : "Assign task"}</button></div>
      </form>
    </section>}

    <section className={styles.card}>
      <div className={styles.sectionHead}><div><span className={styles.eyebrow}>Work list</span><h2>{canAssign ? "All staff tasks" : "My tasks"}</h2></div><label className={styles.filter}>Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{(["TODO", "IN_PROGRESS", "SUBMITTED", "DONE"] as Status[]).map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label></div>
      {!tasks ? <p className={styles.empty}>Loading tasks…</p> : tasks.results.length === 0 ? <p className={styles.empty}>No tasks in this view.</p> : <div className={styles.list}>{tasks.results.map((task) => <article className={styles.taskRow} key={task.id}>
        <div className={styles.taskMain}><strong>{task.title}</strong><span>{task.assigneeName} · Due {formatDate(task.deadline)}</span></div>
        <span className={styles.priority} data-priority={task.priority}>{label(task.priority)}</span>
        <span className={styles.badge} data-status={task.status}>{label(task.status)}</span>
        <span className={styles.timing}>{task.lateFlag === null ? "—" : task.lateFlag ? "Late" : "On time"}</span>
        <button className={styles.secondary} type="button" onClick={() => void openTask(task.id)}>View task</button>
      </article>)}</div>}
      {tasks && <Pagination data={tasks} setPage={setPage} />}
    </section>

    {canReview && <div className={styles.reviewGrid}>
      <section className={styles.card}><div className={styles.sectionHead}><div><span className={styles.eyebrow}>Needs context</span><h2>KPI review queue</h2></div><strong className={styles.count}>{queue?.count ?? 0}</strong></div><p className={styles.help}>A late flag compares timestamps. HR/Owner records the evaluation and decision.</p>
        {!queue ? <p className={styles.empty}>Loading queue…</p> : queue.results.length === 0 ? <p className={styles.empty}>No late submissions awaiting review.</p> : queue.results.map((task) => <div className={styles.reviewRow} key={task.id}><div><strong>{task.title}</strong><span>{task.assigneeName} · Submitted {task.submittedAt ? formatDate(task.submittedAt) : "—"}</span></div><button className={styles.secondary} type="button" onClick={() => void openTask(task.id)}>Review</button></div>)}
        {queue && <Pagination data={queue} setPage={setQueuePage} />}
      </section>
      <section className={styles.card}><div className={styles.sectionHead}><div><span className={styles.eyebrow}>Recorded decisions</span><h2>Review history</h2></div></div>
        {!history ? <p className={styles.empty}>Loading reviews…</p> : history.results.length === 0 ? <p className={styles.empty}>No reviews recorded yet.</p> : history.results.map((item) => <div className={styles.reviewRow} key={item.id}><div><strong>{item.taskTitle}</strong><span>{item.assigneeName} · {label(item.decision)} · {formatDate(item.createdAt)}</span><p>{item.evaluation}</p></div><button className={styles.secondary} type="button" onClick={() => void openTask(item.taskId)}>View task</button></div>)}
        {history && <Pagination data={history} setPage={setHistoryPage} />}
      </section>
    </div>}

    <dialog ref={dialog} className={styles.dialog} aria-labelledby="staff-task-title" onClose={clearTask}
      onCancel={(event) => { if (busy || (draft.current && !window.confirm("Discard your unsaved task report or review?"))) event.preventDefault(); }}>
      <div className={styles.dialogHead}><div><span className={styles.eyebrow}>Task details</span><h2 id="staff-task-title">{active?.title ?? "Loading…"}</h2></div><button type="button" className={styles.iconButton} onClick={closeTask} disabled={busy} aria-label="Close task"><X /></button></div>
      {activeChanged && <p role="status" className={styles.dialogNotice}>This task changed. Your draft and original version are preserved. <button type="button" disabled={busy} onClick={() => void loadLatestTask()}>Load latest task</button></p>}
      {error && <p className={styles.dialogAlert} role="alert">{error}</p>}
      {notice && <p className={styles.dialogNotice} role="status">{notice}</p>}
      {loadingDetail || !active ? <p className={styles.empty}>Loading task…</p> : <div className={styles.dialogBody}>
        <div className={styles.facts}><div><span>Assignee</span><strong>{active.assigneeName}</strong></div><div><span>Priority</span><strong>{label(active.priority)}</strong></div><div><span>Deadline</span><strong>{formatDate(active.deadline)}</strong></div><div><span>Status</span><strong>{label(active.status)}</strong></div></div>
        <section><h3>Instructions</h3><p className={styles.preWrap}>{active.instructions || "No extra instructions."}</p></section>
        {active.submittedAt && <section><h3>Submission</h3><p>Submitted {formatDate(active.submittedAt)} · <strong>{active.lateFlag ? "Late" : "On time"}</strong></p><p className={styles.preWrap}>{active.report || "No written report."}</p>{active.attachment && <button type="button" className={styles.secondary} onClick={() => void download(active)}>Download {active.attachment.fileName}</button>}</section>}
        {canReview && active.review && <section><h3>KPI review</h3><p>{active.review.factualEvidence}</p><p className={styles.preWrap}><strong>Evaluation:</strong> {active.review.evaluation}</p><p className={styles.preWrap}><strong>Recommendation:</strong> {active.review.recommendation || "None"}</p><p><strong>Decision:</strong> {label(active.review.decision)} · {active.review.reviewerName}</p></section>}
        {active.assigneeId === me?.id && active.status === "TODO" && <button type="button" className={styles.secondary} disabled={busy || activeChanged} onClick={() => void mutate(() => tsRequest(`/tasks/${active.id}/start`, { method: "PATCH", body: JSON.stringify({ version: active.version }) }), "Task started.")}>Start task</button>}
        {active.assigneeId === me?.id && (active.status === "TODO" || active.status === "IN_PROGRESS") && <form onSubmit={submit} className={styles.stacked}><h3>Submit your work</h3><label>Report<textarea maxLength={5000} rows={4} value={report} onChange={(event) => setReport(event.target.value)} placeholder="Describe what you completed" /></label><label>Evidence (optional PDF or image, up to 5 MB)<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} /></label><button type="submit" className={styles.primary} disabled={busy || activeChanged || (!report.trim() && !attachment)}>{busy ? "Submitting…" : "Submit work"}</button></form>}
        {canReview && active.status === "SUBMITTED" && !active.reviewed && active.lateFlag && <form onSubmit={review} className={styles.stacked}><h3>Human KPI review</h3><p className={styles.help}>Submitted {active.submittedAt ? formatDate(active.submittedAt) : "—"}; deadline {formatDate(active.deadline)}. Record the context before deciding. No wage change is made here.</p><label>Evaluation<textarea required minLength={3} maxLength={5000} rows={4} value={evaluation} onChange={(event) => setEvaluation(event.target.value)} placeholder="What happened and what context did you consider?" /></label><label>Recommendation<input maxLength={200} value={recommendation} onChange={(event) => setRecommendation(event.target.value)} placeholder="Optional" /></label><label>Decision<select value={decision} onChange={(event) => setDecision(event.target.value)}><option value="NOTED">Noted</option><option value="ACTION_RECOMMENDED">Action recommended</option></select></label><button type="submit" className={styles.primary} disabled={busy || activeChanged || evaluation.trim().length < 3}>{busy ? "Recording…" : "Record review"}</button></form>}
        {canAssign && active.status === "SUBMITTED" && (!active.lateFlag || active.reviewed) && <button type="button" className={styles.primary} disabled={busy || activeChanged} onClick={() => void mutate(() => tsRequest(`/tasks/${active.id}/complete`, { method: "POST", body: JSON.stringify({ version: active.version }) }), "Task completed.")}>{busy ? "Completing…" : "Mark complete"}</button>}
      </div>}
    </dialog>
  </main>;
}

function Pagination<T>({ data, setPage }: { data: Page<T>; setPage: (page: number) => void }) {
  if (data.count <= data.pageSize) return null;
  const pages = Math.ceil(data.count / data.pageSize);
  return <nav className={styles.pagination} aria-label="Pages"><span>Showing {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.count)} of {data.count}</span><div><button type="button" disabled={data.page === 1} onClick={() => setPage(data.page - 1)}>Previous</button><span>Page {data.page} of {pages}</span><button type="button" disabled={data.page >= pages} onClick={() => setPage(data.page + 1)}>Next</button></div></nav>;
}
