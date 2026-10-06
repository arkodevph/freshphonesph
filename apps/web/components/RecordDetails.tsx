"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { batchSchema, clientSchema } from "@freshphones/contracts";
import { getBatchDetails, getClientDetails, listBatchChoices, updateBatchDetails, updateClientDetails,
  type Batch, type EditableBatch, type EditableClient, type RecordId } from "@/lib/api";
import { ApiError } from "@/lib/ts-api";
import { batchEditInput, clientEditInput, recordChanged, recordDraft, type RecordDraft } from "@/lib/record-edit";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { RecordHistory } from "./RecordHistory";
import styles from "./record-details.module.css";

export function RecordDetails({ kind, id, mode, onClose, onSaved }: {
  kind: "batch" | "client"; id: RecordId; mode: "edit" | "history"; onClose: () => void; onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [tab, setTab] = useState(mode);
  const [record, setRecord] = useState<EditableBatch | EditableClient | null>(null);
  const [draft, setDraft] = useState<RecordDraft | null>(null);
  const [choices, setChoices] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outdated, setOutdated] = useState(false);
  const [discard, setDiscard] = useState<"close" | "reload" | null>(null);
  const sequence = useRef(0);
  const recordRef = useRef(record);
  recordRef.current = record;
  const dirty = Boolean(record && draft && JSON.stringify(draft) !== JSON.stringify(recordDraft(record)));
  const read = useCallback(() => kind === "batch" ? getBatchDetails(id) : getClientDetails(id), [kind, id]);
  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true); setError(null);
    try {
      const current = await read();
      if (request !== sequence.current) return;
      setRecord(current); setDraft(recordDraft(current)); setOutdated(false);
    } catch (error) {
      if (request === sequence.current) setError(error instanceof Error ? error.message : "Could not load the record.");
    } finally { if (request === sequence.current) setLoading(false); }
  }, [read]);
  useEffect(() => {
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    void load();
    let stopped = false;
    if (kind === "client") void listBatchChoices().then((items) => { if (!stopped) setChoices(items); }).catch(() => {});
    return () => { stopped = true; sequence.current++; document.body.style.overflow = overflow; };
  }, [kind, load]);
  useLiveRecords(() => {
    const snapshot = recordRef.current;
    const request = sequence.current;
    if (!snapshot) return;
    void read().then((latest) => {
      if (request === sequence.current && recordChanged(snapshot, latest)) setOutdated(true);
    }).catch(() => {});
  });

  function requestClose() { if (!saving) dirty ? setDiscard("close") : onClose(); }
  function reload() { if (dirty) setDiscard("reload"); else void load(); }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!record || !draft || saving || outdated) return;
    setSaving(true); setError(null);
    try {
      if (kind === "batch") {
        const parsed = batchSchema.safeParse(batchEditInput(draft));
        if (!parsed.success) { setError(parsed.error.issues.map((issue) => issue.message).join(" ")); return; }
        await updateBatchDetails(id, record.version, parsed.data);
      } else {
        const parsed = clientSchema.safeParse(clientEditInput(draft));
        if (!parsed.success) { setError(parsed.error.issues.map((issue) => issue.message).join(" ")); return; }
        await updateClientDetails(id, record.version, parsed.data);
      }
      onSaved(); onClose();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        try { const latest = await read(); if (recordChanged(record, latest)) setOutdated(true); } catch { /* Keep the original conflict visible. */ }
      }
      setError(error instanceof Error ? error.message : "Could not save the record.");
    } finally { setSaving(false); }
  }
  const field = (label: string, key: keyof RecordDraft, type = "text", required = false, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) =>
    <label className={styles.field} htmlFor={`${titleId}-${key}`}><span id={`${titleId}-${key}-label`}>{label}</span><input id={`${titleId}-${key}`} aria-labelledby={`${titleId}-${key}-label`} type={type} required={required} value={draft?.[key] ?? ""}
      onChange={(event) => setDraft((current) => current && { ...current, [key]: event.target.value })} {...extra} /></label>;
  const select = (label: string, key: keyof RecordDraft, options: [string, string][], disabled = false, required = true) =>
    <label className={styles.field} htmlFor={`${titleId}-${key}`}><span id={`${titleId}-${key}-label`}>{label}</span><select id={`${titleId}-${key}`} aria-labelledby={`${titleId}-${key}-label`} required={required} value={draft?.[key] ?? ""} disabled={disabled}
      onChange={(event) => setDraft((current) => current && { ...current, [key]: event.target.value })}>
      {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
    </select></label>;
  const title = record ? "code" in record ? record.code : record.name : kind === "batch" ? "Batch" : "Client";
  return <dialog ref={dialog} aria-labelledby={titleId} className={styles.dialog}
    onCancel={(event) => { event.preventDefault(); requestClose(); }}>
    <header className={styles.header}><div><p className={styles.help}>{kind === "batch" ? "Paluwagan batch" : "Client record"}</p>
      <h2 id={titleId}>{title}</h2></div><button type="button" className={styles.secondary} disabled={saving} onClick={requestClose} aria-label="Close record details">Close</button></header>
    <div className={styles.tabs} aria-label="Record views">
      <button type="button" aria-pressed={tab === "edit"} onClick={() => setTab("edit")}>Edit details</button>
      <button type="button" aria-pressed={tab === "history"} onClick={() => setTab("history")}>Change history</button>
    </div>
    {discard && <div role="alert" className={styles.warning}>
      <strong>Discard unsaved changes?</strong><p>{discard === "reload" ? "Loading the latest details replaces your current draft." : "Your edits have not been saved."}</p>
      <div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => setDiscard(null)}>Keep editing</button>
        <button type="button" className={styles.primary} onClick={() => { const action = discard; setDiscard(null); if (action === "close") onClose(); else void load(); }}>Discard changes</button></div>
    </div>}
    {loading ? <p role="status">Loading record details…</p> : !record || !draft ? <div role="alert" className={styles.error}>{error}<button type="button" className={styles.secondary} onClick={() => void load()}>Retry details</button></div>
      : tab === "history" ? <RecordHistory kind={kind} id={id} />
      : <form onSubmit={save}>
        {outdated && <div role="alert" className={styles.warning}><strong>This record has changed.</strong><p>Your draft is preserved. Load the latest details and review them before saving.</p>
          <button type="button" className={styles.secondary} disabled={saving} onClick={reload}>Load latest details</button></div>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <fieldset disabled={saving || Boolean(discard)} className={styles.formBody}>
        {kind === "batch" && "code" in record ? <>
          <div className={styles.grid}>{field("Batch number", "code", "text", true, { minLength: 2, maxLength: 30, pattern: "[A-Za-z0-9-]+" })}
            {select("Status", "status", [["PLANNED", "Forming"], ["ACTIVE", "Active"], ["COMPLETED", "Closed"], ["CANCELLED", "Cancelled"]])}</div>
          {record.termsLocked && <p className={styles.warning}>Payment schedules have been issued. Unit, dates, and payment terms are locked; use a new batch for a different plan.</p>}
          <fieldset disabled={record.termsLocked} className={styles.grid}>
            {field("Unit / model", "model", "text", true, { minLength: 2, maxLength: 100 })}
            {field("Contract price (PHP)", "contractPrice", "number", Boolean(draft.installmentCount || draft.cadence), { min: "0.01", step: "0.01" })}
            {field("Installments", "installmentCount", "number", Boolean(draft.contractPrice || draft.cadence), { min: 1, max: 600, step: 1 })}
            {select("Cadence", "cadence", [["", "Terms not set"], ["WEEKLY", "Weekly"], ["SEMIMONTHLY", "Semi-monthly"], ["MONTHLY", "Monthly"]], false, Boolean(draft.contractPrice || draft.installmentCount))}
            {field("Start date", "startDate", "date", true)}{field("End date", "endDate", "date", true, { min: draft.startDate })}
          </fieldset>
          <p className={styles.help}>If you set payment terms, provide the price, installment count, and cadence together. Dates use the existing 7 / 15 / 30-day schedule.</p>
        </> : kind === "client" && "name" in record ? <>
          <div className={styles.grid}>
            {field("Full name", "name", "text", true, { minLength: 2, maxLength: 100 })}
            {field("Contact email", "email", "email", false, { maxLength: 254 })}
            {field("Contact number", "phone", "tel", false, { maxLength: 25 })}
            {field("Unit / model", "unitModel", "text", false, { maxLength: 100, placeholder: record.batch.model })}
            {field("Joined date", "joinedAt", "date", Boolean(record.joinedAt))}
            {select("Status", "status", [["ACTIVE", "Active"], ["ON_HOLD", "On hold"], ["COMPLETED", "Completed"]])}
            {select("Batch", "batchId", [[record.batchId, `${record.batch.code} — ${record.batch.model}`], ...choices.filter((batch) => batch.id !== record.batchId).map((batch): [string, string] => [String(batch.id), `${batch.batch_number} — ${batch.unit_model}`])], record.scheduleIssued)}
          </div>
          {record.scheduleIssued && <p className={styles.help}>The batch is locked because this client already has an installment schedule.</p>}
          <p className={styles.help}>Contact email is part of the client record. Changing it does not change the customer&apos;s sign-in email. Use Post update on the client list to change release status.</p>
        </> : null}
        </fieldset>
        <footer className={styles.actions}><button type="button" className={styles.secondary} disabled={saving} onClick={requestClose}>Cancel</button>
          <button type="submit" className={styles.primary} disabled={saving || !dirty || outdated || Boolean(discard)}>{saving ? "Saving…" : "Save changes"}</button></footer>
      </form>}
  </dialog>;
}
