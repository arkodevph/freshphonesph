"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Headset } from "@phosphor-icons/react";
import {
  listSupportCases,
  getSupportCaseDetail,
  replySupportCase,
  updateSupportCase,
  SUPPORT_STATUSES,
  type SupportCase,
  type SupportCaseDetail,
} from "@/lib/api";
import { useMe, can } from "@/lib/useMe";
import { useLiveRecords } from "@/lib/useLiveRecords";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  in_progress: "bg-sky-2/70 text-blue-ink",
  waiting_for_client: "bg-violet-100 text-violet-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-ink-soft/15 text-ink-soft",
};

const FILTERS = [["", "All"], ...SUPPORT_STATUSES];

export default function SupportPage() {
  const me = useMe();
  const canManage = can(me, "SUPPORT_MANAGE");
  const [cases, setCases] = useState<SupportCase[]>([]);
  const loadVersion = useRef(0);
  const [drafts, setDrafts] = useState<Record<string, { status: string; resolution: string }>>({});
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [focusedCase, setFocusedCase] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [caseDetail, setCaseDetail] = useState<SupportCaseDetail | null>(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [needsReply, setNeedsReply] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    setError(null);
    try {
      const result = await listSupportCases(focusedCase ? { case: focusedCase } : { ...(filter ? { status: filter } : {}), page: String(page) });
      if (version !== loadVersion.current) return;
      setCases(result.results);
      setCount(result.count);
    } catch (e) {
      if (version === loadVersion.current) setError(e instanceof Error ? e.message : "Failed to load cases.");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [filter, focusedCase, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("case");
    if (id && /^[0-9a-f-]{36}$/i.test(id)) setFocusedCase(id);
  }, []);
  useEffect(() => {
    if (!focusedCase || !cases.some((item) => String(item.id) === focusedCase) || activeCaseId === focusedCase) return;
    setActiveCaseId(focusedCase);
    setCaseLoading(true);
    void getSupportCaseDetail(focusedCase, true).then(setCaseDetail)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load conversation."))
      .finally(() => setCaseLoading(false));
  }, [focusedCase, cases, activeCaseId]);
  useLiveRecords(() => { void load(); if (activeCaseId) void getSupportCaseDetail(activeCaseId, true).then(setCaseDetail).catch(() => {}); }, canManage);

  async function openCase(id: string) {
    if (activeCaseId === id) { setActiveCaseId(null); setCaseDetail(null); if (focusedCase === id) { setFocusedCase(null); window.history.replaceState(null, "", "/system/support"); } return; }
    setActiveCaseId(id); setCaseDetail(null); setReplyText(""); setNeedsReply(false); setCaseLoading(true); setError(null);
    try { setCaseDetail(await getSupportCaseDetail(id, true)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load conversation."); }
    finally { setCaseLoading(false); }
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!activeCaseId || !replyText.trim() || sendingReply) return;
    setSendingReply(true); setError(null);
    try {
      await replySupportCase(activeCaseId, replyText.trim(), true, needsReply);
      setReplyText(""); setNeedsReply(false);
      setCaseDetail(await getSupportCaseDetail(activeCaseId, true));
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not send reply."); }
    finally { setSendingReply(false); }
  }

  async function saveCase(c: SupportCase) {
    setError(null);
    try {
      const draft = drafts[String(c.id)] ?? { status: c.status, resolution: c.resolution };
      await updateSupportCase(c.id, { status: draft.status, resolution: draft.resolution, version: c.version });
      await load();
      setDrafts((current) => { const next = { ...current }; delete next[String(c.id)]; return next; });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    }
  }

  async function assignToMe(c: SupportCase) {
    if (!me?.id) return;
    setError(null);
    try {
      await updateSupportCase(c.id, { assigned_staff: me.id, version: c.version });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Assignment failed."); }
  }

  if (me && !canManage) {
    return (
      <section className="glass rounded-3xl p-10 text-center">
        <h1 className="font-display text-xl font-700 text-blue-ink">No access</h1>
        <p className="mt-2 text-sm text-ink-soft">Your role doesn&apos;t handle customer service.</p>
      </section>
    );
  }

  return (
    <>
      <header className="glass mb-4 flex items-center gap-3 rounded-3xl px-5 py-3.5">
        <span className="grid h-10 w-10 place-items-center rounded-2xl chrome">
          <Headset weight="fill" className="h-5 w-5 text-blue" />
        </span>
        <div>
          <h1 className="font-display text-lg font-700 tracking-tight text-blue-ink">
            Customer Service
          </h1>
          <p className="text-xs text-ink-soft">Concerns tracked as cases — not lost in chat</p>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-2xl bg-rose-100 px-4 py-2.5 text-sm font-600 text-rose-700">{error}</div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {focusedCase && <button type="button" onClick={() => { setFocusedCase(null); setActiveCaseId(null); setCaseDetail(null); window.history.replaceState(null, "", "/system/support"); }} className="rounded-full bg-violet-100 px-3.5 py-1.5 text-sm font-700 text-violet-700">Show all cases</button>}
        {FILTERS.map(([v, l]) => (
          <button
            key={v}
            onClick={() => { setFocusedCase(null); setActiveCaseId(null); setFilter(v); setPage(1); if (focusedCase) window.history.replaceState(null, "", "/system/support"); }}
            className={`rounded-full px-3.5 py-1.5 text-sm font-700 transition-colors ${
              filter === v ? "bg-blue text-white" : "bg-white/60 text-ink-soft hover:bg-white"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      {!focusedCase && count > 20 && <nav className="mt-3 flex items-center justify-between text-xs text-ink-soft" aria-label="Support case pages"><button type="button" disabled={page === 1 || loading} onClick={() => setPage((current) => current - 1)} className="rounded-lg bg-white px-3 py-1.5 font-700 text-blue-ink disabled:opacity-40">Previous</button><span>Page {page} of {Math.ceil(count / 20)}</span><button type="button" disabled={page * 20 >= count || loading} onClick={() => setPage((current) => current + 1)} className="rounded-lg bg-white px-3 py-1.5 font-700 text-blue-ink disabled:opacity-40">Next</button></nav>}

      <div className="glass overflow-x-auto rounded-3xl p-5">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink-soft">
            <tr className="border-b border-white/60">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Client</th>
              <th className="px-2 py-2">Category</th>
              <th className="px-2 py-2">Concern</th>
              <th className="px-2 py-2">Received</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Assignee</th>
              <th className="px-2 py-2">Resolution</th>
              <th className="px-2 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-2 py-6 text-center text-ink-soft">Loading…</td></tr>
            ) : cases.length === 0 ? (
              <tr><td colSpan={9} className="px-2 py-6 text-center text-ink-soft">No cases.</td></tr>
            ) : (
              cases.map((c) => (
                <Fragment key={c.id}><tr className="border-b border-white/40">
                  <td className="px-2 py-2.5 font-600 text-blue-ink">{c.id}</td>
                  <td className="px-2 py-2.5 font-700 text-blue-ink">{c.client_name}</td>
                  <td className="px-2 py-2.5">{c.category}</td>
                  <td className="px-2 py-2.5 max-w-xs text-ink-soft"><p className="truncate" title={c.description}>{c.description}</p>{c.last_message?.by_customer && <strong className="mt-1 block text-xs text-violet-700">Customer replied</strong>}</td>
                  <td className="px-2 py-2.5 text-ink-soft">{c.date_received.slice(0, 10)}</td>
                  <td className="px-2 py-2.5">
                    <select
                      value={drafts[String(c.id)]?.status ?? c.status}
                      onChange={(e) => setDrafts((current) => ({ ...current, [String(c.id)]: { status: e.target.value, resolution: current[String(c.id)]?.resolution ?? c.resolution } }))}
                      disabled={c.status === "closed"}
                      className={`rounded-full px-2.5 py-1 text-xs font-700 outline-none ${STATUS_STYLES[c.status] ?? ""}`}
                    >
                      {SUPPORT_STATUSES.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2.5 text-xs text-ink-soft">{c.assigned_staff_name ?? <button type="button" onClick={() => assignToMe(c)} className="rounded-lg bg-white/80 px-2 py-1 font-700 text-blue">Assign to me</button>}</td>
                  <td className="px-2 py-2.5"><input aria-label={`Resolution for ${c.category}`} value={drafts[String(c.id)]?.resolution ?? c.resolution} onChange={(e) => setDrafts((current) => ({ ...current, [String(c.id)]: { status: current[String(c.id)]?.status ?? c.status, resolution: e.target.value } }))} disabled={c.status === "closed"} className="w-52 rounded-lg border border-white/70 bg-white/80 px-2 py-1 text-xs" placeholder="What was done?" /></td>
                  <td className="px-2 py-2.5"><div className="flex flex-wrap gap-1"><button type="button" onClick={() => saveCase(c)} disabled={!drafts[String(c.id)] || c.status === "closed"} className="rounded-lg bg-blue px-3 py-1 text-xs font-700 text-white disabled:opacity-40">Save</button><button type="button" aria-expanded={activeCaseId === String(c.id)} onClick={() => void openCase(String(c.id))} className="rounded-lg bg-violet-100 px-3 py-1 text-xs font-700 text-violet-700">{activeCaseId === String(c.id) ? "Hide thread" : "Conversation"}</button></div></td>
                </tr>
                {activeCaseId === String(c.id) && <tr><td colSpan={9} className="bg-violet-50/60 px-4 py-4"><div className="mx-auto max-w-3xl"><h2 className="font-display text-sm font-700 text-blue-ink">Case #{String(c.id).slice(0, 8)} conversation</h2>
                  {caseLoading ? <p className="mt-3 text-sm text-ink-soft" role="status">Loading conversation…</p> : caseDetail?.id === c.id ? <>
                    <ol className="mt-3 grid gap-2">{caseDetail.messages.map((message) => <li key={message.id} className="rounded-xl bg-white p-3"><strong className="text-xs text-blue-ink">{message.author_type === "customer" ? "Customer" : "Customer Service"}</strong><p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-soft">{message.body}</p><small className="text-xs text-ink-soft">{new Date(message.created_at).toLocaleString("en-PH")}</small></li>)}</ol>
                    {!(["resolved", "closed"].includes(caseDetail.status)) && <form onSubmit={sendReply} className="mt-4 grid gap-2"><label htmlFor={`staff-reply-${c.id}`} className="text-sm font-700 text-blue-ink">Reply to customer</label><textarea id={`staff-reply-${c.id}`} value={replyText} onChange={(event) => setReplyText(event.target.value)} maxLength={5000} required className="min-h-24 rounded-xl border border-violet-200 bg-white p-3 text-sm" placeholder="Write a customer-visible reply…" /><label className="flex items-center gap-2 text-xs text-ink-soft"><input type="checkbox" checked={needsReply} onChange={(event) => setNeedsReply(event.target.checked)} />Needs customer response</label><button type="submit" disabled={sendingReply || !replyText.trim()} className="justify-self-start rounded-xl bg-blue px-4 py-2 text-sm font-700 text-white disabled:opacity-40">{sendingReply ? "Sending…" : "Send reply"}</button></form>}
                  </> : <p className="mt-3 text-sm text-ink-soft">Could not load conversation. Try again.</p>}
                </div></td></tr>}</Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
