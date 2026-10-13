"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getRecordHistory, type RecordHistoryEntry, type RecordId } from "@/lib/api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import styles from "./record-details.module.css";

const actions: Record<string, string> = { "batch.created": "Batch created", "batch.updated": "Batch edited",
  "batch.assigned": "Assignments changed",
  "client.created": "Client enrolled", "client.updated": "Client edited", "schedule.generated": "Schedule issued", "release.updated": "Release update posted" };

export function RecordHistory({ kind, id }: { kind: "batch" | "client"; id: RecordId }) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<RecordHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true); setError(null);
    try {
      const result = await getRecordHistory(kind, id, page);
      if (request !== sequence.current) return;
      setItems(result.items); setTotal(result.total);
    } catch (error) {
      if (request === sequence.current) setError(error instanceof Error ? error.message : "Could not load change history.");
    } finally { if (request === sequence.current) setLoading(false); }
  }, [kind, id, page]);
  useEffect(() => { void load(); return () => { sequence.current++; }; }, [load]);
  useLiveRecords(load);
  return <section aria-label="Record change history" aria-busy={loading} className={styles.history}>
    <p className={styles.help}>Changes show the staff member, time, and previous and updated values.</p>
    {error ? <div role="alert" className={styles.error}>{error} <button type="button" className={styles.secondary} onClick={() => void load()}>Retry history</button></div>
      : loading ? <p role="status">Loading change history…</p>
      : items.length === 0 ? <p>No recorded changes yet.</p>
      : <ol className={styles.timeline}>{items.map((entry) => <li key={entry.id}>
        <div className={styles.historyHeading}><strong>{actions[entry.action] ?? "Record updated"}</strong>
          <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} PHT</time></div>
        <p className={styles.help}>By {entry.actor.name}</p>
        {entry.changes.length > 0 && <dl className={styles.changes}>{entry.changes.map((change) => <div key={change.field}>
          <dt>{change.label}</dt><dd><span><small>Previous</small>{change.before ?? "Not set"}</span><span><small>Updated</small>{change.after ?? "Not set"}</span></dd>
        </div>)}</dl>}
      </li>)}</ol>}
    <nav aria-label="Change history pages" className={styles.actions}>
      <button type="button" className={styles.secondary} disabled={loading || page === 1} onClick={() => setPage(page - 1)}>Previous changes</button>
      <span>Page {page} · {total} changes</span>
      <button type="button" className={styles.secondary} disabled={loading || page * 20 >= total} onClick={() => setPage(page + 1)}>Next changes</button>
    </nav>
  </section>;
}
