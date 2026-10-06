"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ShieldCheck } from "@phosphor-icons/react";
import { agentSchema } from "@freshphones/contracts";
import { addDirectoryAgent, getAgentDirectory, getDirectoryAgent, updateDirectoryAgent, type Agent, type AgentInput } from "@/lib/api";
import { ApiError } from "@/lib/ts-api";
import { useMe, can } from "@/lib/useMe";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { RecordPagination } from "@/components/RecordPagination";
import styles from "@/components/record-details.module.css";

const empty: AgentInput = { name: "", code: "", active: true };
const inputClass = "w-full rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-ink focus:border-blue";

export default function AgentsPage() {
  const me = useMe(); const access = can(me, "AGENT_MANAGE");
  const [items, setItems] = useState<Agent[]>([]);
  const [query, setQuery] = useState(""); const [status, setStatus] = useState(""); const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<AgentInput>(empty); const [editing, setEditing] = useState<Agent | null>(null);
  const sequence = useRef(0);
  const load = useCallback(async () => {
    if (!access) return;
    const request = ++sequence.current; setLoading(true); setError(null);
    try { const result = await getAgentDirectory({ q: query, page: String(page), ...(status ? { status } : {}) });
      if (request === sequence.current) { setItems(result.items); setTotal(result.total); } }
    catch (error) { if (request === sequence.current) setError(error instanceof Error ? error.message : "Could not load agents."); }
    finally { if (request === sequence.current) setLoading(false); }
  }, [access, query, page, status]);
  useEffect(() => { void load(); return () => { sequence.current++; }; }, [load]);
  useLiveRecords(load, access);
  async function create(event: React.FormEvent) {
    event.preventDefault(); if (saving) return;
    const parsed = agentSchema.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => issue.message).join(" ")); return; }
    setSaving(true); setError(null); setNotice(null);
    try { await addDirectoryAgent(parsed.data); setDraft(empty); setNotice("Agent added. Choose them using Assign on a batch."); void load(); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not create agent."); }
    finally { setSaving(false); }
  }
  if (me && !access) return <section className="glass rounded-3xl p-10 text-center"><h1 className="font-display text-xl font-700 text-blue-ink">No access</h1><p className="mt-2 text-sm text-ink-soft">Your role cannot manage the agent directory.</p></section>;
  return <>
    <header className="glass mb-4 flex items-center gap-3 rounded-3xl px-5 py-3.5"><ShieldCheck className="h-6 w-6 text-blue" weight="fill" /><div><h1 className="font-display text-lg font-700 text-blue-ink">Agents</h1><p className="text-xs text-ink-soft">Recognized representatives for batch assignment and public verification</p></div></header>
    {error && <p role="alert" className="mb-4 rounded-2xl bg-rose-100 p-4 text-sm text-rose-700">{error} <button className="underline" type="button" onClick={() => void load()}>Retry directory</button></p>}
    {notice && <p role="status" className="mb-4 rounded-2xl bg-emerald-100 p-4 text-sm text-emerald-700">{notice}</p>}
    {access && <form onSubmit={create} className="glass mb-4 rounded-3xl p-5"><h2 className="mb-3 font-display font-700 text-blue-ink">Add agent</h2>
      <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm text-blue-ink">Full name<input className={inputClass} required minLength={2} maxLength={200} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label className="grid gap-1 text-sm text-blue-ink">Agent code<input className={inputClass} required minLength={2} maxLength={60} pattern="[A-Za-z0-9-]+" placeholder="FP-AGENT-001" value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} /></label>
        <label className="flex items-center gap-2 text-sm text-blue-ink"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />Active agent</label>
      </fieldset>
      <p className="mt-3 text-xs text-ink-soft">Public verification shows the name, masked code, and status. Agent entries do not create staff accounts.</p>
      <button type="submit" disabled={saving} className="btn-candy mt-4 rounded-2xl px-5 py-2.5 text-sm font-700 disabled:opacity-60">{saving ? "Adding…" : "Add agent"}</button>
    </form>}
    <div className="mb-4 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm text-blue-ink">Search agents<input className={inputClass} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Name or code" /></label>
      <label htmlFor="agent-status-filter" className="grid gap-1 text-sm text-blue-ink"><span id="agent-status-filter-label">Agent status</span><select id="agent-status-filter" aria-labelledby="agent-status-filter-label" className={inputClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label></div>
    <div className="glass overflow-x-auto rounded-3xl p-5"><table className="w-full min-w-[440px] text-left text-sm"><thead className="text-xs uppercase text-ink-soft"><tr><th className="p-2">Name</th><th className="p-2">Code</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead>
      <tbody>{loading ? <tr><td colSpan={4} className="p-6 text-center text-ink-soft">Loading agents…</td></tr> : items.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-ink-soft">No agents match these filters.</td></tr>
        : items.map((agent) => <tr key={agent.id} className="border-b border-white/40"><td className="p-2 font-700 text-blue-ink">{agent.name}</td><td className="p-2">{agent.code}</td><td className="p-2">{agent.active ? "Active" : "Inactive"}</td><td className="p-2"><button type="button" aria-label={`Edit agent ${agent.name}`} onClick={() => setEditing(agent)} className="rounded-lg bg-violet-100 px-3 py-1 text-xs font-700 text-violet-700">Edit</button></td></tr>)}</tbody></table></div>
    <RecordPagination page={page} hasNext={page * 20 < total} loading={loading} onPage={setPage} />
    {editing && <AgentEditor key={editing.id} initial={editing} onClose={() => setEditing(null)} onSaved={() => { setNotice("Agent changes saved."); void load(); }} />}
  </>;
}

function AgentEditor({ initial, onClose, onSaved }: { initial: Agent; onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const titleId = useId(); const sequence = useRef(0);
  const [agent, setAgent] = useState(initial); const [draft, setDraft] = useState<AgentInput>({ name: initial.name, code: initial.code, active: initial.active });
  const [outdated, setOutdated] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const [discard, setDiscard] = useState<"close" | "reload" | null>(null);
  const dirty = draft.name !== agent.name || draft.code !== agent.code || draft.active !== agent.active;
  const snapshot = useRef(agent); snapshot.current = agent;
  useEffect(() => { dialog.current?.showModal(); const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { sequence.current++; document.body.style.overflow = overflow; }; }, []);
  const check = useCallback(() => {
    const request = sequence.current;
    void getDirectoryAgent(initial.id).then((latest) => { if (request === sequence.current && latest.version !== snapshot.current.version) setOutdated(true); }).catch(() => {});
  }, [initial.id]);
  useEffect(check, [check]); useLiveRecords(check);
  const close = () => { if (!saving) dirty ? setDiscard("close") : onClose(); };
  async function reload() {
    const request = ++sequence.current; setSaving(true); setError(null);
    try { const latest = await getDirectoryAgent(agent.id); if (request === sequence.current) { setAgent(latest); setDraft({ name: latest.name, code: latest.code, active: latest.active }); setOutdated(false); } }
    catch (error) { setError(error instanceof Error ? error.message : "Could not load the latest agent."); }
    finally { setSaving(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (saving || outdated) return;
    const parsed = agentSchema.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => issue.message).join(" ")); return; }
    setSaving(true); setError(null);
    try { await updateDirectoryAgent(agent.id, agent.version, parsed.data); onSaved(); onClose(); }
    catch (error) { if (error instanceof ApiError && error.status === 409) setOutdated(true); setError(error instanceof Error ? error.message : "Could not save agent."); }
    finally { setSaving(false); }
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); close(); }}>
    <header className={styles.header}><h2 id={titleId}>Edit {agent.name}</h2><button type="button" className={styles.secondary} disabled={saving} onClick={close}>Close agent details</button></header>
    {discard && <div role="alert" className={styles.warning}><strong>Discard unsaved changes?</strong><div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => setDiscard(null)}>Keep editing</button><button type="button" className={styles.primary} onClick={() => { const action = discard; setDiscard(null); if (action === "close") onClose(); else void reload(); }}>Discard changes</button></div></div>}
    {outdated && <div role="alert" className={styles.warning}>This agent has changed. Your draft is preserved. <button type="button" className={styles.secondary} disabled={saving} onClick={() => dirty ? setDiscard("reload") : void reload()}>Load latest agent</button></div>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <form onSubmit={save}><fieldset className={styles.grid} disabled={saving || Boolean(discard)}>
      <label className={styles.field}>Full name<input required minLength={2} maxLength={200} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label className={styles.field}>Agent code<input required minLength={2} maxLength={60} pattern="[A-Za-z0-9-]+" value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />Active agent</label>
    </fieldset><p className={styles.help}>Deactivation keeps past assignments and history, and prevents new assignments. Public verification will show Inactive.</p>
      <footer className={styles.actions}><button type="button" className={styles.secondary} disabled={saving} onClick={close}>Cancel</button><button type="submit" className={styles.primary} disabled={saving || outdated || !dirty || Boolean(discard)}>{saving ? "Saving…" : "Save agent"}</button></footer></form>
  </dialog>;
}
