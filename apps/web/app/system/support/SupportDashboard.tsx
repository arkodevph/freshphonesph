"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Headset } from "@phosphor-icons/react";
import { listSupportCases, getSupportCaseDetail, replySupportCase, updateSupportCase, SUPPORT_STATUSES, type SupportCase, type SupportCaseDetail } from "@/lib/api";
import { useMe, can } from "@/lib/useMe";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { ApiError } from "@/lib/ts-api";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-100 text-amber-700", in_progress: "bg-sky-2/70 text-blue-ink",
  waiting_for_client: "bg-violet-100 text-violet-700", resolved: "bg-emerald-100 text-emerald-700", closed: "bg-ink-soft/15 text-ink-soft",
};
type ResolutionDraft = { status: string; resolution: string; version?: number };
type ReplyDraft = { text: string; needsReply: boolean };
const emptyReply: ReplyDraft = { text: "", needsReply: false };

export default function SupportDashboard() {
  const me = useMe();
  const canManage = can(me, "SUPPORT_MANAGE");
  const search = useSearchParams();
  const queryCase = search.get("case");
  const focusedCase = queryCase && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(queryCase) ? queryCase : null;
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ResolutionDraft>>({});
  const [replies, setReplies] = useState<Record<string, ReplyDraft>>({});
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [caseDetail, setCaseDetail] = useState<SupportCaseDetail | null>(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const loadVersion = useRef(0);
  const detailVersion = useRef(0);
  const activeCase = useRef<string | null>(null);
  const mutation = useRef(false);

  const clearPrivate = useCallback(() => {
    ++loadVersion.current; ++detailVersion.current; activeCase.current = null;
    setCases([]); setCount(0); setCaseDetail(null); setActiveCaseId(null); setDrafts({}); setReplies({}); setLoading(false); setCaseLoading(false);
  }, []);

  const load = useCallback(async () => {
    if (!canManage) return;
    const version = ++loadVersion.current;
    setLoading(true);
    try {
      const result = await listSupportCases(focusedCase ? { case: focusedCase } : { ...(filter ? { status: filter } : {}), page: String(page) });
      if (version !== loadVersion.current) return;
      setCases(result.results); setCount(result.count);
      if (!focusedCase && page > Math.max(1, Math.ceil(result.count / 20))) setPage(Math.max(1, Math.ceil(result.count / 20)));
    } catch (caught) {
      if (version !== loadVersion.current) return;
      if (caught instanceof ApiError && [401, 403].includes(caught.status)) clearPrivate();
      setCases([]); setCount(0); setError(caught instanceof Error ? caught.message : "Failed to load cases.");
    } finally { if (version === loadVersion.current) setLoading(false); }
  }, [canManage, clearPrivate, filter, focusedCase, page]);

  const loadDetail = useCallback(async (id: string) => {
    if (!canManage || activeCase.current !== id) return;
    const version = ++detailVersion.current;
    setCaseLoading(true); setDetailError(null);
    try {
      const detail = await getSupportCaseDetail(id, true);
      if (version === detailVersion.current && activeCase.current === id) setCaseDetail(detail);
    } catch (caught) {
      if (version !== detailVersion.current || activeCase.current !== id) return;
      if (caught instanceof ApiError && [401, 403].includes(caught.status)) { clearPrivate(); setError(caught.message); return; }
      setCaseDetail(null); setDetailError(caught instanceof Error ? caught.message : "Could not load conversation.");
    } finally { if (version === detailVersion.current) setCaseLoading(false); }
  }, [canManage, clearPrivate]);

  useEffect(() => { void load(); return () => { ++loadVersion.current; }; }, [load]);
  useEffect(() => {
    if (!canManage) return;
    ++detailVersion.current; activeCase.current = focusedCase;
    setActiveCaseId(focusedCase); setCaseDetail(null); setDetailError(null); setCaseLoading(false);
    if (focusedCase) { setFilter(""); setPage(1); }
  }, [focusedCase, canManage]);
  useEffect(() => { if (activeCaseId) void loadDetail(activeCaseId); return () => { ++detailVersion.current; }; }, [activeCaseId, loadDetail]);
  useEffect(() => {
    if (canManage) return;
    clearPrivate();
  }, [canManage, clearPrivate]);
  useLiveRecords(() => { void load(); if (activeCase.current) void loadDetail(activeCase.current); }, canManage);

  function closeThread() {
    ++detailVersion.current; activeCase.current = null; setActiveCaseId(null); setCaseDetail(null); setDetailError(null); setCaseLoading(false);
    if (focusedCase) window.history.replaceState(null, "", "/system/support");
  }
  function openCase(id: string) {
    if (activeCase.current === id) { closeThread(); return; }
    ++detailVersion.current; activeCase.current = id; setActiveCaseId(id); setCaseDetail(null); setDetailError(null);
  }
  function editCase(c: SupportCase, patch: Partial<ResolutionDraft>) {
    setDrafts((current) => ({ ...current, [String(c.id)]: { ...(current[String(c.id)] ?? { status: c.status, resolution: c.resolution, version: c.version }), ...patch } }));
  }
  function discardDraft(id: string) { setDrafts((current) => { const next = { ...current }; delete next[id]; return next; }); }
  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    const id = activeCase.current;
    const draft = id ? replies[id] : null;
    if (!id || !draft?.text.trim() || mutation.current) return;
    mutation.current = true; setPending("reply"); setError(null);
    try {
      await replySupportCase(id, draft.text.trim(), true, draft.needsReply);
      setReplies((current) => { const next = { ...current }; delete next[id]; return next; });
      await Promise.all([load(), loadDetail(id)]);
    } catch (caught) { if (caught instanceof ApiError && [401, 403].includes(caught.status)) clearPrivate(); setError(caught instanceof Error ? caught.message : "Could not send reply."); }
    finally { mutation.current = false; setPending(null); }
  }
  async function saveCase(c: SupportCase) {
    const draft = drafts[String(c.id)];
    if (!draft || draft.version !== c.version || mutation.current) return;
    mutation.current = true; setPending(`save:${c.id}`); setError(null);
    try {
      await updateSupportCase(c.id, draft); discardDraft(String(c.id));
      await Promise.all([load(), loadDetail(String(c.id))]);
    } catch (caught) { if (caught instanceof ApiError && [401, 403].includes(caught.status)) clearPrivate(); setError(caught instanceof Error ? caught.message : "Update failed. Your draft is retained."); }
    finally { mutation.current = false; setPending(null); }
  }
  async function assignToMe(c: SupportCase) {
    if (!me?.id || mutation.current) return;
    mutation.current = true; setPending(`assign:${c.id}`); setError(null);
    try { await updateSupportCase(c.id, { assigned_staff: me.id, version: c.version }); await Promise.all([load(), loadDetail(String(c.id))]); }
    catch (caught) { if (caught instanceof ApiError && [401, 403].includes(caught.status)) clearPrivate(); setError(caught instanceof Error ? caught.message : "Assignment failed."); }
    finally { mutation.current = false; setPending(null); }
  }

  if (me && !canManage) return <section className="glass rounded-3xl p-10 text-center"><h1 className="font-display text-xl font-700 text-blue-ink">No access</h1><p className="mt-2 text-sm text-ink-soft">Your role doesn&apos;t handle customer service.</p></section>;
  const reply = activeCaseId ? replies[activeCaseId] ?? emptyReply : emptyReply;
  return <>
    <header className="glass mb-4 flex items-center gap-3 rounded-3xl px-5 py-3.5"><span className="chrome grid h-10 w-10 place-items-center rounded-2xl"><Headset weight="fill" className="h-5 w-5 text-blue" /></span><div><h1 className="font-display text-lg font-700 tracking-tight text-blue-ink">Customer Service</h1><p className="text-xs text-ink-soft">Track concerns, assignments and customer conversations</p></div></header>
    {error && <div role="alert" className="mb-4 rounded-2xl bg-rose-100 px-4 py-2.5 text-sm font-600 text-rose-700"><p>{error}</p><button type="button" onClick={() => { setError(null); void load(); }} className="mt-2 rounded-lg bg-blue px-3 py-1.5 font-700 text-white">Refresh cases</button></div>}
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      {focusedCase && <button type="button" onClick={() => { closeThread(); setFilter(""); setPage(1); }} className="rounded-full bg-violet-100 px-3.5 py-1.5 text-sm font-700 text-violet-700">Show all cases</button>}
      {[["", "All"], ...SUPPORT_STATUSES].map(([value, label]) => <button type="button" key={value} aria-pressed={!focusedCase && filter === value} onClick={() => { closeThread(); setFilter(value); setPage(1); }} className={`rounded-full px-3.5 py-1.5 text-sm font-700 ${!focusedCase && filter === value ? "bg-blue text-white" : "bg-white/60 text-ink-soft hover:bg-white"}`}>{label}</button>)}
    </div>
    {activeCaseId && <section aria-label="Support conversation" className="glass mb-4 rounded-3xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3"><h2 className="font-display text-base font-700 text-blue-ink">Case #{activeCaseId.slice(0, 8)} conversation</h2><button type="button" onClick={closeThread} className="shrink-0 rounded-lg bg-white/70 px-3 py-1 text-xs font-700 text-blue-ink">Hide thread</button></div>
      {caseLoading && <p role="status" className="mt-3 text-sm text-ink-soft">Refreshing conversation…</p>}
      {detailError && <div role="alert" className="mt-3 text-sm text-rose-700"><p>{detailError}</p><button type="button" onClick={() => void loadDetail(activeCaseId)} className="mt-2 rounded-lg bg-blue px-3 py-1.5 font-700 text-white">Retry conversation</button></div>}
      {caseDetail && String(caseDetail.id) === activeCaseId && <>
        <p className="mt-3 break-words text-sm font-700 text-blue-ink">{caseDetail.client_name} · {caseDetail.category}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-soft">{caseDetail.description}</p>
        <ol className="mt-4 grid gap-2">{caseDetail.messages.map((message) => <li key={message.id} className="rounded-xl bg-white/70 p-3"><strong className="text-xs text-blue-ink">{message.author_type === "customer" ? "Customer" : "Customer Service"}</strong><p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-soft">{message.body}</p><small className="text-xs text-ink-soft">{new Date(message.created_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} PHT</small></li>)}</ol>
        {!['resolved', 'closed'].includes(caseDetail.status) ? <form onSubmit={sendReply} className="mt-4 grid gap-2"><label htmlFor="staff-reply" className="text-sm font-700 text-blue-ink">Reply to customer</label><textarea id="staff-reply" value={reply.text} onChange={(event) => setReplies((current) => ({ ...current, [activeCaseId]: { ...reply, text: event.target.value } }))} disabled={!!pending} maxLength={5000} required className="min-h-24 rounded-xl border border-violet-200 bg-white/70 p-3 text-sm" placeholder="Write a customer-visible reply…" /><label className="flex items-center gap-2 text-xs text-ink-soft"><input type="checkbox" checked={reply.needsReply} disabled={!!pending} onChange={(event) => setReplies((current) => ({ ...current, [activeCaseId]: { ...reply, needsReply: event.target.checked } }))} />Needs customer response</label><button type="submit" disabled={!!pending || caseLoading || !reply.text.trim()} className="justify-self-start rounded-xl bg-blue px-4 py-2 text-sm font-700 text-white disabled:opacity-40">{pending === "reply" ? "Sending…" : "Send reply"}</button></form> : <p className="mt-4 text-sm text-ink-soft">This case is {caseDetail.status}.{reply.text && " Your unsent reply is retained if this case reopens."}</p>}
      </>}
    </section>}
    {!focusedCase && count > 20 && <nav className="my-3 flex items-center justify-between text-xs text-ink-soft" aria-label="Support case pages"><button type="button" disabled={page === 1 || loading} onClick={() => setPage((current) => current - 1)} className="rounded-lg bg-white/70 px-3 py-1.5 font-700 text-blue-ink disabled:opacity-40">Previous</button><span>Page {page} of {Math.ceil(count / 20)}</span><button type="button" disabled={page * 20 >= count || loading} onClick={() => setPage((current) => current + 1)} className="rounded-lg bg-white/70 px-3 py-1.5 font-700 text-blue-ink disabled:opacity-40">Next</button></nav>}
    <div className="glass overflow-x-auto rounded-3xl p-5"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-xs uppercase tracking-wide text-ink-soft"><tr className="border-b border-white/60">{['#', 'Client', 'Category', 'Concern', 'Received', 'Status', 'Assignee', 'Resolution', 'Action'].map((label) => <th key={label} className="px-2 py-2">{label}</th>)}</tr></thead><tbody>
      {loading ? <tr><td colSpan={9} className="px-2 py-6 text-center text-ink-soft">Loading…</td></tr> : cases.length === 0 ? <tr><td colSpan={9} className="px-2 py-6 text-center text-ink-soft">{focusedCase ? "This case is unavailable." : "No cases."}</td></tr> : cases.map((c) => {
        const draft = drafts[String(c.id)]; const stale = !!draft && draft.version !== c.version;
        return <tr key={c.id} className="border-b border-white/40"><td className="px-2 py-2.5 font-600 text-blue-ink">{String(c.id).slice(0, 8)}</td><td className="px-2 py-2.5 font-700 text-blue-ink">{c.client_name}</td><td className="px-2 py-2.5">{c.category}</td><td className="max-w-xs px-2 py-2.5 text-ink-soft"><p className="truncate" title={c.description}>{c.description}</p>{c.last_message?.by_customer && <strong className="mt-1 block text-xs text-violet-700">Customer replied</strong>}</td><td className="px-2 py-2.5 text-ink-soft">{c.date_received.slice(0, 10)}</td>
          <td className="px-2 py-2.5"><select aria-label={`Status for ${c.category}`} value={draft?.status ?? c.status} disabled={!!pending || c.status === "closed"} onChange={(event) => editCase(c, { status: event.target.value })} className={`rounded-full px-2.5 py-1 text-xs font-700 outline-none ${STATUS_STYLES[c.status] ?? ""}`}>{SUPPORT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
          <td className="px-2 py-2.5 text-xs text-ink-soft">{c.assigned_staff_name ?? (['cs_head', 'cs_team'].includes(me?.role ?? '') && !['resolved', 'closed'].includes(c.status) ? <button type="button" disabled={!!pending} onClick={() => void assignToMe(c)} className="rounded-lg bg-white/70 px-2 py-1 font-700 text-blue">Assign to me</button> : "Unassigned")}</td>
          <td className="px-2 py-2.5"><input aria-label={`Resolution for ${c.category}`} value={draft?.resolution ?? c.resolution} onChange={(event) => editCase(c, { resolution: event.target.value })} disabled={!!pending || c.status === "closed"} className="w-52 rounded-lg border border-white/70 bg-white/70 px-2 py-1 text-xs" placeholder="What was done?" />{stale && <p className="mt-1 max-w-52 text-xs text-rose-700">Case changed. Your draft is retained; discard it before saving.</p>}</td>
          <td className="px-2 py-2.5"><div className="flex flex-wrap gap-1"><button type="button" onClick={() => void saveCase(c)} disabled={!!pending || !draft || stale || c.status === "closed"} className="rounded-lg bg-blue px-3 py-1 text-xs font-700 text-white disabled:opacity-40">{pending === `save:${c.id}` ? "Saving…" : "Save"}</button>{draft && <button type="button" disabled={!!pending} onClick={() => discardDraft(String(c.id))} className="rounded-lg bg-white/70 px-3 py-1 text-xs font-700 text-blue-ink">Discard resolution draft</button>}<button type="button" aria-expanded={activeCaseId === String(c.id)} onClick={() => openCase(String(c.id))} className="rounded-lg bg-violet-100 px-3 py-1 text-xs font-700 text-violet-700">Conversation</button></div></td>
        </tr>;
      })}
    </tbody></table></div>
  </>;
}
