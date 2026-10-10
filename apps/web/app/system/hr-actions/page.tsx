"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ShieldCheck } from "@phosphor-icons/react";
import { tsRequest } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { can, useMe } from "@/lib/useMe";
import styles from "./hr-actions.module.css";

type Decision = "APPROVED" | "REJECTED";
type Status = "PENDING" | Decision;
type Page<T> = { results: T[]; count: number; page: number; pageSize: number };
type Review = { id: string; taskId: string; taskTitle: string; employeeName: string;
  factualEvidence: string; evaluation: string; recommendation: string; reviewedAt: string };
type Action = { id: string; reviewId: string; taskId: string; taskTitle: string; employeeName: string;
  factualEvidence: string; evaluation: string; recommendation: string;
  proposedAction: string; rationale: string; proposedByName: string; createdAt: string;
  status: Status; decisionReason: string | null; decidedByName: string | null;
  decidedAt: string | null; version: number };
const date = (value: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value)) + " PHT";
const message = (error: unknown) => error instanceof Error ? error.message : "Please try again.";

export default function HrActionsPage() {
  const me = useMe();
  if (!me) return <p role="status">Checking HR access…</p>;
  if (me.account_type !== "employee" || !can(me, "HR_CONFIDENTIAL"))
    return <main className={styles.page}><h1>No access</h1><p>This page is for the Owner and individually approved HR / COO staff.</p></main>;
  return <HrActionsWorkspace key={`${me.id}:${me.role}:${me.permissions.join(",")}`} owner={me.role === "owner"} />;
}

function HrActionsWorkspace({ owner }: { owner: boolean }) {
  const [actions, setActions] = useState<Page<Action> | null>(null);
  const [eligible, setEligible] = useState<Page<Review> | null>(null);
  const [actionPage, setActionPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [filter, setFilter] = useState<"" | Status>(owner ? "PENDING" : "");
  const [proposal, setProposal] = useState<{ reviewId: string; action: string; rationale: string } | null>(null);
  const [decision, setDecision] = useState<{ id: string; version: number; choice: Decision; reason: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const loadSequence = useRef(0);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    try {
      const [nextActions, nextEligible] = await Promise.all([
        tsRequest<Page<Action>>(`/hr-actions?page=${actionPage}${filter ? `&status=${filter}` : ""}`),
        owner ? Promise.resolve(null) : tsRequest<Page<Review>>(`/hr-actions/eligible-reviews?page=${reviewPage}`),
      ]);
      if (sequence !== loadSequence.current) return;
      setActions(nextActions); setEligible(nextEligible);
    } catch (caught) { if (sequence === loadSequence.current) setError(message(caught)); }
  }, [actionPage, filter, owner, reviewPage]);
  useEffect(() => { void load(); return () => { loadSequence.current++; }; }, [load]);
  useLiveRecords(() => { void load(); }, true);

  async function submitProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!proposal || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await tsRequest("/hr-actions", { method: "POST", body: JSON.stringify({ reviewId: proposal.reviewId,
        proposedAction: proposal.action.trim(), rationale: proposal.rationale.trim() }) });
      setProposal(null); setNotice("Request sent to the Owner for a decision."); await load();
    } catch (caught) { setError(message(caught)); }
    finally { setBusy(false); }
  }

  async function submitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!decision || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await tsRequest(`/hr-actions/${decision.id}/decision`, { method: "POST", body: JSON.stringify({
        version: decision.version, decision: decision.choice, reason: decision.reason.trim(),
      }) });
      setDecision(null); setNotice("Owner decision recorded."); await load();
    } catch (caught) { setError(message(caught)); }
    finally { setBusy(false); }
  }

  return <main className={styles.page}>
    <header className={styles.header}><span className={styles.icon}><ShieldCheck weight="duotone" /></span><div><p className={styles.eyebrow}>Confidential staff records</p><h1>HR action approvals</h1><p>Review the human KPI evaluation, then record a request and the Owner’s decision. Approval is a record; it does not change pay or carry out an employment action.</p></div><button type="button" className={styles.secondary} onClick={() => void load()}>Refresh records</button></header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {!owner && <section className={styles.card} aria-labelledby="eligible-title"><div className={styles.sectionHead}><div><p className={styles.eyebrow}>Approved HR / COO</p><h2 id="eligible-title">Reviews eligible for a request</h2></div><strong className={styles.count}>{eligible?.count ?? 0}</strong></div>
      <p className={styles.help}>Only a human KPI review marked “Action recommended” appears here. A rejected request may be revised and submitted again.</p>
      {!eligible ? <p className={styles.empty}>Loading reviews…</p> : eligible.results.length === 0 ? <p className={styles.empty}>No action recommendations available in this view. Record a human KPI review in Tasks &amp; KPI first.</p> : <div className={styles.list}>{eligible.results.map((review) => <article key={review.id} className={styles.item}>
        <div className={styles.itemHead}><div><h3>{review.employeeName}</h3><p>{review.taskTitle} · Reviewed {date(review.reviewedAt)}</p></div><Link href={`/system/tasks?task=${review.taskId}`}>View task</Link></div>
        <p><strong>Recorded fact:</strong> {review.factualEvidence}</p><p><strong>Human evaluation:</strong> {review.evaluation}</p><p><strong>Recommendation:</strong> {review.recommendation || "No detail entered"}</p>
        {proposal?.reviewId === review.id ? <form className={styles.form} onSubmit={submitProposal}>
          <label>Proposed action<input required minLength={3} maxLength={500} value={proposal.action} onChange={(event) => setProposal({ ...proposal, action: event.target.value })} placeholder="Describe the specific action for Owner review" /></label>
          <label>Reason and context<textarea required minLength={10} maxLength={5000} rows={4} value={proposal.rationale} onChange={(event) => setProposal({ ...proposal, rationale: event.target.value })} placeholder="Why is this action being requested? Include the relevant context." /></label>
          <div className={styles.actions}><button type="button" className={styles.secondary} disabled={busy} onClick={() => setProposal(null)}>Cancel</button><button type="submit" className={styles.primary} disabled={busy || proposal.action.trim().length < 3 || proposal.rationale.trim().length < 10}>{busy ? "Sending…" : "Submit to Owner"}</button></div>
        </form> : <button type="button" className={styles.secondary} disabled={busy} onClick={() => { setProposal({ reviewId: review.id, action: "", rationale: "" }); setError(""); }}>Prepare request</button>}
      </article>)}</div>}
      {eligible && <Pagination data={eligible} change={setReviewPage} />}
    </section>}

    <section className={styles.card} aria-labelledby="requests-title"><div className={styles.sectionHead}><div><p className={styles.eyebrow}>{owner ? "Owner decision queue" : "My submitted requests"}</p><h2 id="requests-title">{owner ? "Requests and decisions" : "Request history"}</h2></div><label className={styles.filter}>Status<select value={filter} onChange={(event) => { setFilter(event.target.value as typeof filter); setActionPage(1); }}><option value="">All</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label></div>
      {!actions ? <p className={styles.empty}>Loading requests…</p> : actions.results.length === 0 ? <p className={styles.empty}>No requests in this view.</p> : <div className={styles.list}>{actions.results.map((action) => <article key={action.id} className={styles.item}>
        <div className={styles.itemHead}><div><h3>{action.employeeName} <span className={styles.badge} data-status={action.status}>{action.status.toLowerCase()}</span></h3><p>{action.taskTitle} · Proposed by {action.proposedByName} · {date(action.createdAt)}</p></div><Link href={`/system/tasks?task=${action.taskId}`}>View task</Link></div>
        <p><strong>Recorded fact:</strong> {action.factualEvidence}</p><p><strong>Human evaluation:</strong> {action.evaluation}</p><p><strong>KPI recommendation:</strong> {action.recommendation || "No detail entered"}</p>
        <p><strong>Proposed action:</strong> {action.proposedAction}</p><p><strong>Request reason:</strong> {action.rationale}</p>
        {action.status !== "PENDING" && <p className={styles.decisionRecord}><strong>{action.status === "APPROVED" ? "Approved" : "Rejected"} by {action.decidedByName} · {action.decidedAt ? date(action.decidedAt) : ""}:</strong> {action.decisionReason}</p>}
        {owner && action.status === "PENDING" && (decision?.id === action.id ? <form className={styles.form} onSubmit={submitDecision}>
          <p className={styles.help}>You are recording an {decision.choice === "APPROVED" ? "approval" : "rejection"}. The system will not execute the proposed action.</p>
          <label>Decision reason<textarea required minLength={10} maxLength={5000} rows={4} value={decision.reason} onChange={(event) => setDecision({ ...decision, reason: event.target.value })} placeholder="Record the context for your decision" /></label>
          <div className={styles.actions}><button type="button" className={styles.secondary} disabled={busy} onClick={() => setDecision(null)}>Cancel</button><button type="submit" className={styles.primary} disabled={busy || decision.reason.trim().length < 10}>{busy ? "Recording…" : `Record ${decision.choice.toLowerCase()}`}</button></div>
        </form> : <div className={styles.actions}><button type="button" className={styles.secondary} disabled={busy} onClick={() => { setDecision({ id: action.id, version: action.version, choice: "REJECTED", reason: "" }); setError(""); }}>Reject</button><button type="button" className={styles.primary} disabled={busy} onClick={() => { setDecision({ id: action.id, version: action.version, choice: "APPROVED", reason: "" }); setError(""); }}>Approve</button></div>)}
      </article>)}</div>}
      {actions && <Pagination data={actions} change={setActionPage} />}
    </section>
  </main>;
}

function Pagination<T>({ data, change }: { data: Page<T>; change: (page: number) => void }) {
  if (data.count <= data.pageSize) return null;
  const last = Math.ceil(data.count / data.pageSize);
  return <nav className={styles.pagination} aria-label="Pages"><span>Showing {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.count)} of {data.count}</span><div><button type="button" disabled={data.page <= 1} onClick={() => change(data.page - 1)}>Previous</button><span>Page {data.page} of {last}</span><button type="button" disabled={data.page >= last} onClick={() => change(data.page + 1)}>Next</button></div></nav>;
}
