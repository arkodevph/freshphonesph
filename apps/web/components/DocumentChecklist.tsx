"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, CheckCircle, FileArrowUp, WarningCircle } from "@phosphor-icons/react";
import {
  downloadCustomerDocument, getCustomerDocuments, reviewCustomerDocument, uploadCustomerDocument,
  type DocumentRequirement, type RecordId,
} from "@/lib/api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import styles from "./document-checklist.module.css";

const labels: Record<DocumentRequirement["status"], string> = {
  MISSING: "Missing", SUBMITTED: "Submitted for review", APPROVED: "Approved",
  NEEDS_CLARIFICATION: "Needs clarification",
};

export function DocumentChecklist({ clientId, reviewer = false }: { clientId?: RecordId; reviewer?: boolean }) {
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const scrolledHash = useRef<string | null>(null);

  const load = useCallback(() => {
    void getCustomerDocuments(clientId).then((items) => { setRequirements(items); setError(null); })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load documents."))
      .finally(() => setLoading(false));
  }, [clientId]);
  useEffect(() => { setLoading(true); load(); }, [load]);
  useLiveRecords(load, true);
  useEffect(() => {
    const target = window.location.hash.slice(1);
    if (!target.startsWith("document-") || scrolledHash.current === target) return;
    const element = document.getElementById(target);
    if (element) { element.scrollIntoView({ block: "start" }); scrolledHash.current = target; }
  }, [requirements]);

  async function upload(event: React.FormEvent<HTMLFormElement>, key: string) {
    event.preventDefault();
    const input = event.currentTarget.querySelector<HTMLInputElement>('input[type="file"]');
    const file = input?.files?.[0];
    if (!file) { setError("Choose a file before uploading."); return; }
    setWorking(key); setError(null); setNotice(null);
    try {
      await uploadCustomerDocument(key, file, clientId);
      if (input) input.value = "";
      setNotice("Document submitted for Records review.");
      load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Upload failed."); }
    finally { setWorking(null); }
  }

  async function review(item: DocumentRequirement, status: "APPROVED" | "NEEDS_CLARIFICATION") {
    if (!item.latest) return;
    const reason = reasons[item.key]?.trim() ?? "";
    if (status === "NEEDS_CLARIFICATION" && !reason) { setError("Enter a correction request before asking for clarification."); return; }
    setWorking(item.key); setError(null); setNotice(null);
    try {
      await reviewCustomerDocument(item.latest.id, status, item.latest.version, reason);
      setNotice(status === "APPROVED" ? "Document approved." : "Clarification requested.");
      load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Review failed."); }
    finally { setWorking(null); }
  }

  async function download(id: string, fileName: string) {
    setError(null);
    try {
      const blob = await downloadCustomerDocument(id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not download document."); }
  }

  return <div className={styles.wrapper}>
    <div className={styles.heading}><span className={styles.headingIcon}><FileArrowUp weight="duotone" aria-hidden="true" /></span><div><p>Requirements</p><h2>{reviewer ? "Client documents" : "My documents"}</h2></div></div>
    <p className={styles.helper}>Upload a clear PDF, JPG, PNG or WebP file, up to 5 MB. Files are reviewed by Records.</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {loading ? <p className={styles.empty}>Loading requirements…</p> : requirements.length === 0 ? <p className={styles.empty}>No requirements are configured.</p> :
      <div className={styles.list}>{requirements.map((item) => <article className={styles.item} id={`document-${item.key}`} key={item.key}>
        <div className={styles.itemHeading}><div><h3>{item.label}</h3><p>{item.description}</p></div><span className={`${styles.status} ${styles[item.status]}`}>{labels[item.status]}</span></div>
        {item.latest?.clarification && item.status === "NEEDS_CLARIFICATION" && <p className={styles.clarification}><WarningCircle weight="fill" aria-hidden="true" /> {item.latest.clarification}</p>}
        {item.latest && <div className={styles.fileLine}><span>{item.latest.fileName} · {new Date(item.latest.uploadedAt).toLocaleDateString("en-PH")}</span><button type="button" onClick={() => download(item.latest!.id, item.latest!.fileName)}><ArrowDown weight="bold" aria-hidden="true" /> Download</button></div>}
        {(item.status === "MISSING" || item.status === "NEEDS_CLARIFICATION") && <form className={styles.uploadForm} onSubmit={(event) => upload(event, item.key)}>
          <input type="file" aria-label={`Choose ${item.label}`} accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" required />
          <button type="submit" disabled={working === item.key}><FileArrowUp weight="bold" aria-hidden="true" />{working === item.key ? "Uploading…" : item.status === "MISSING" ? "Upload" : "Submit a corrected file"}</button>
        </form>}
        {reviewer && item.status === "SUBMITTED" && item.latest && <div className={styles.review}>
          <label>Correction request<input value={reasons[item.key] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [item.key]: event.target.value }))} maxLength={1000} placeholder="What should the customer correct?" /></label>
          <div><button type="button" disabled={working === item.key} onClick={() => review(item, "APPROVED")}><CheckCircle weight="bold" aria-hidden="true" /> Approve</button><button type="button" disabled={working === item.key} onClick={() => review(item, "NEEDS_CLARIFICATION")}>Request clarification</button></div>
        </div>}
        {item.history.length > 1 && <details className={styles.history}><summary>Previous submissions ({item.history.length - 1})</summary><ul>{item.history.slice(1).map((entry) => <li key={entry.id}><span>{entry.fileName} · {labels[entry.status]} · {new Date(entry.uploadedAt).toLocaleDateString("en-PH")}</span><button type="button" onClick={() => download(entry.id, entry.fileName)}>Download</button></li>)}</ul></details>}
      </article>)}</div>}
  </div>;
}
