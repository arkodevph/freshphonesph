"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { getAssignmentOptions, getBatchDetails, updateBatchAssignments, type AssignmentOptions, type EditableBatch, type RecordId } from "@/lib/api";
import { ApiError } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import styles from "./record-details.module.css";

export function BatchAssignments({ id, onClose, onSaved }: { id: RecordId; onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const labelId = useId();
  const [batch, setBatch] = useState<EditableBatch | null>(null);
  const [options, setOptions] = useState<AssignmentOptions>({ handlers: [], agents: [] });
  const [draft, setDraft] = useState({ handlerId: "", agentId: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outdated, setOutdated] = useState(false);
  const [discard, setDiscard] = useState<"close" | "reload" | null>(null);
  const sequence = useRef(0);
  const snapshot = useRef(batch); snapshot.current = batch;
  const dirty = Boolean(batch && (draft.handlerId !== (batch.handlerId ?? "") || draft.agentId !== (batch.agentId ?? "")));
  const load = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true); setError(null);
    try {
      const [record, choices] = await Promise.all([getBatchDetails(id), getAssignmentOptions()]);
      if (current !== sequence.current) return;
      setBatch(record); setOptions(choices); setDraft({ handlerId: record.handlerId ?? "", agentId: record.agentId ?? "" }); setOutdated(false);
    } catch (error) { if (current === sequence.current) setError(error instanceof Error ? error.message : "Could not load assignments."); }
    finally { if (current === sequence.current) setLoading(false); }
  }, [id]);
  useEffect(() => {
    dialog.current?.showModal();
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    void load();
    return () => { sequence.current++; document.body.style.overflow = overflow; };
  }, [load]);
  useLiveRecords(() => {
    const record = snapshot.current; const current = sequence.current;
    if (!record) return;
    void Promise.all([getBatchDetails(id), getAssignmentOptions()]).then(([latest, choices]) => {
      if (current !== sequence.current) return;
      if (latest.version !== record.version) setOutdated(true);
      setOptions(choices);
    }).catch(() => {});
  });
  const close = () => { if (!saving) dirty ? setDiscard("close") : onClose(); };
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!batch || saving || outdated) return;
    setSaving(true); setError(null);
    try { await updateBatchAssignments(id, { version: batch.version, handlerId: draft.handlerId || null, agentId: draft.agentId || null }); onSaved(); onClose(); }
    catch (error) { if (error instanceof ApiError && error.status === 409) setOutdated(true); setError(error instanceof Error ? error.message : "Could not save assignments."); }
    finally { setSaving(false); }
  }
  const select = (key: "handlerId" | "agentId", label: string) => {
    const items = key === "handlerId" ? options.handlers : options.agents;
    const assigned = key === "handlerId" ? batch?.handler : batch?.agent;
    return <label className={styles.field} htmlFor={`${labelId}-${key}`}><span id={`${labelId}-${key}-label`}>{label}</span>
      <select id={`${labelId}-${key}`} aria-labelledby={`${labelId}-${key}-label`} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}>
        <option value="">Unassigned</option>
        {assigned && !items.some((item) => item.id === assigned.id) && <option value={assigned.id} disabled>{assigned.name} (unavailable)</option>}
        {items.map((item) => <option key={item.id} value={item.id} disabled={!item.active}>{item.name}{item.active ? "" : " (inactive)"}</option>)}
      </select></label>;
  };
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={labelId} onCancel={(event) => { event.preventDefault(); close(); }}>
    <header className={styles.header}><div><p className={styles.help}>Batch assignments</p><h2 id={labelId}>{batch?.code ?? "Loading batch…"}</h2></div>
      <button type="button" className={styles.secondary} disabled={saving} onClick={close}>Close assignments</button></header>
    {discard && <div role="alert" className={styles.warning}><strong>Discard unsaved assignments?</strong><p>Your choices have not been saved.</p>
      <div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => setDiscard(null)}>Keep editing</button>
        <button type="button" className={styles.primary} onClick={() => { const action = discard; setDiscard(null); if (action === "close") onClose(); else void load(); }}>Discard changes</button></div></div>}
    {loading ? <p role="status">Loading assignments…</p> : !batch ? <div role="alert" className={styles.error}>{error} <button type="button" className={styles.secondary} onClick={() => void load()}>Retry assignments</button></div>
      : <form onSubmit={save}>
        <p className={styles.help}>The handler can view this batch and its clients. Changing the handler removes the previous handler&apos;s access.</p>
        {outdated && <div role="alert" className={styles.warning}><strong>This batch has changed.</strong><p>Your choices are preserved. Review the latest assignments before saving.</p>
          <button type="button" className={styles.secondary} disabled={saving} onClick={() => dirty ? setDiscard("reload") : void load()}>Load latest assignments</button></div>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <fieldset className={styles.grid} disabled={saving || Boolean(discard)}>{select("handlerId", "Handler")}{select("agentId", "Agent")}</fieldset>
        <p className={styles.help}>Choose active handler accounts and agents. Agents identify the batch&apos;s representative; an agent entry does not grant system access. <Link href="/system/agents" onClick={(event) => { if (dirty || saving) { event.preventDefault(); setError("Save or discard these assignments before opening the agent directory."); } }}>Manage agent directory</Link>.</p>
        <footer className={styles.actions}><button type="button" className={styles.secondary} disabled={saving} onClick={close}>Cancel</button>
          <button type="submit" className={styles.primary} disabled={!dirty || saving || outdated || Boolean(discard)}>{saving ? "Saving…" : "Save assignments"}</button></footer>
      </form>}
  </dialog>;
}
