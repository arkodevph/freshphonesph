"use client";

import { useEffect, useRef, useState } from "react";
import ModalCloseButton from "@/app/system/_role-designs/agent/components/ModalCloseButton";
import WorkspaceNativeSelect from "@/app/system/_role-designs/agent/components/WorkspaceNativeSelect";
import { useSpringDialog } from "@/lib/useSpringDialog";
import { tsRequest } from "@/lib/ts-api";
import styles from "./enrollment-workspace.module.css";

export type BatchChoice = { id: string; code: string; model: string };
type Member = { memberId: string; name: string; email: string; phone: string; batch: { code: string } };
const empty = { name: "", email: "", phone: "", batchId: "" };

export default function EnrollmentSubmission({ open, close, batches, batchError, retryBatches, saved }: {
  open: boolean; close: () => void; batches: BatchChoice[]; batchError: string; retryBatches: () => Promise<void>; saved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(empty);
  const [member, setMember] = useState<Member | null>(null);
  const [query, setQuery] = useState("");
  const [choices, setChoices] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchNotice, setSearchNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const searchSequence = useRef(0);
  const pending = useRef(false);
  const submission = useRef<string | null>(null);
  const alive = useRef(true);
  const dirty = Boolean(draft.name || draft.email || draft.phone || draft.batchId || query);
  useSpringDialog(dialog, open);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; ++searchSequence.current; };
  }, []);
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) { if (open && dirty) { event.preventDefault(); } }
    window.addEventListener("beforeunload", warn);
    return () => { window.removeEventListener("beforeunload", warn); };
  }, [open, dirty]);
  function dismiss() {
    if (pending.current || (dirty && !window.confirm("Discard your unsaved enrollment?"))) { return; }
    setDraft(empty); setMember(null); setQuery(""); setChoices([]); setError(""); setSearchNotice("");
    ++searchSequence.current; setSearching(false); submission.current = null; close();
  }
  async function find() {
    const request = ++searchSequence.current;
    setSearching(true); setChoices([]); setError(""); setSearchNotice("");
    try {
      const data = await tsRequest<Member[]>(`/enrollment/members?q=${encodeURIComponent(query.trim())}`);
      if (alive.current && request === searchSequence.current) { setChoices(data); setSearchNotice(data.length ? "" : "No matching members in your assigned batches."); }
    } catch (failure) {
      if (alive.current && request === searchSequence.current) { setError(failure instanceof Error ? failure.message : "Could not find members."); }
    } finally {
      if (alive.current && request === searchSequence.current) { setSearching(false); }
    }
  }
  async function submit() {
    if (pending.current) { return; }
    pending.current = true; setBusy(true); setError("");
    try {
      submission.current ??= crypto.randomUUID();
      await tsRequest("/enrollment/requests", { method: "POST", body: JSON.stringify({ ...draft, submissionId: submission.current, ...(member ? { memberId: member.memberId } : {}) }) });
      if (alive.current) { setDraft(empty); setMember(null); setQuery(""); setChoices([]); submission.current = null; saved(); close(); }
    } catch (failure) {
      if (alive.current) { setError(failure instanceof Error ? failure.message : "Could not submit enrollment. Your entries are retained."); }
    } finally {
      pending.current = false; if (alive.current) { setBusy(false); }
    }
  }
  function update(key: keyof typeof draft, value: string) { setDraft(current => ({ ...current, [key]: value })); submission.current = null; }
  return <dialog ref={dialog} data-workspace-modal data-modal-framed data-modal-size="drawer" className={styles.submissionDialog} aria-labelledby="submit-enrollment-title" onCancel={event => { event.preventDefault(); dismiss(); }}>
    <header data-modal-header><h2 id="submit-enrollment-title">Submit enrollment</h2><ModalCloseButton onClick={dismiss} disabled={busy} /></header>
    <form onSubmit={event => { event.preventDefault(); void submit(); }}>
      <p className={styles.muted}>The assigned Batch Manager approves the request before a membership is created.</p>
      <fieldset disabled={busy}>
        <label className={styles.field}>Find an existing member<input type="search" maxLength={100} value={query} onChange={event => { setQuery(event.target.value); ++searchSequence.current; setChoices([]); setSearching(false); setSearchNotice(""); }} /></label>
        <button type="button" className={styles.button} disabled={searching || query.trim().length < 2} onClick={() => { void find(); }}>{searching ? "Searching…" : "Find member"}</button>
        {searchNotice && <p className={styles.muted} role="status">{searchNotice}</p>}
        {choices.length > 0 && <ul className={styles.list} aria-label="Matching members">{choices.map(choice => <li key={choice.memberId}><button type="button" className={styles.button} onClick={() => { setMember(choice); setDraft(current => ({ ...current, name: choice.name, phone: choice.phone, email: choice.email })); setChoices([]); submission.current = null; }}>{choice.name} · {choice.batch.code}</button></li>)}</ul>}
        {member && <p className={styles.notice}>Using existing member: <strong>{member.name}</strong>. <button type="button" className={styles.button} onClick={() => { setMember(null); setDraft(current => ({ ...current, name: "", phone: "", email: "" })); submission.current = null; }}>Use a new member instead</button></p>}
        <div className={styles.submissionFields}>
          <label className={styles.field}>Member name<input required minLength={2} maxLength={100} autoComplete="name" readOnly={Boolean(member)} value={draft.name} onChange={event => { update("name", event.target.value); }} /></label>
          <label className={styles.field}>Phone<input type="tel" required={!member} minLength={7} maxLength={25} autoComplete="tel" readOnly={Boolean(member)} value={draft.phone} onChange={event => { update("phone", event.target.value); }} /></label>
          <label className={styles.field}>Email (optional)<input type="email" maxLength={254} autoComplete="email" readOnly={Boolean(member)} value={draft.email} onChange={event => { update("email", event.target.value); }} /></label>
          <label className={styles.field}>Batch<WorkspaceNativeSelect required value={draft.batchId} onChange={event => { update("batchId", event.target.value); }}><option value="">Choose an assigned batch</option>{batches.map(batch => <option key={batch.id} value={batch.id}>{batch.code} · {batch.model}</option>)}</WorkspaceNativeSelect></label>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {batchError ? <div className={styles.error} role="alert"><p>{batchError}</p><button type="button" className={styles.button} onClick={() => { void retryBatches(); }}>Retry assigned batches</button></div> : !batches.length && <p className={styles.muted}>No batches available. Ask the COO to check your Agent profile and batch assignments.</p>}
        <footer className={styles.actions}><button type="button" className={styles.button} onClick={dismiss}>Discard</button><button type="submit" className={styles.primary} disabled={!batches.length || Boolean(batchError)}>{busy ? "Submitting…" : "Submit for approval"}</button></footer>
      </fieldset>
    </form>
  </dialog>;
}
