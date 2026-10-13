"use client";

import { useEffect, useState } from "react";
import type { HrAccessDecision } from "@freshphones/contracts";
import { getEmployeeHrAccessHistory, type RecordId } from "@/lib/api";

export default function HrAccessHistory({ accountId }: { accountId: RecordId }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ items: HrAccessDecision[]; total: number; pageSize: number } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setResult(null); setError(""); setLoading(true);
    void getEmployeeHrAccessHistory(accountId, page).then((data) => {
      if (!active) return;
      const last = Math.max(1, Math.ceil(data.total / data.pageSize));
      if (page > last) setPage(last);
      else setResult(data);
    }).catch((caught) => {
      if (active) setError(caught instanceof Error ? caught.message : "Could not load HR access decisions.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accountId, page, retry]);
  return <section aria-label="Confidential HR access history" className="team-form-field">
    <strong>HR access decisions</strong>
    {loading ? <p role="status">Loading decisions…</p> : error ? <div role="alert"><p>{error}</p><button type="button" className="team-secondary-button" onClick={() => setRetry((value) => value + 1)}>Retry history</button></div>
      : result?.items.length ? <ol>{result.items.map((item) => <li key={item.id}>
        <strong>{item.granted ? "Granted" : "Revoked"}</strong> by {item.actorName} · {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(item.createdAt))}
        <p>{item.reason}</p>
      </li>)}</ol> : <p>No explicit confidential HR access decisions recorded.</p>}
    {result && result.total > result.pageSize && <div className="team-dialog-actions">
      <button type="button" className="team-secondary-button" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>Previous decisions</button>
      <span>Page {page} of {Math.ceil(result.total / result.pageSize)}</span>
      <button type="button" className="team-secondary-button" disabled={loading || page * result.pageSize >= result.total} onClick={() => setPage((value) => value + 1)}>Next decisions</button>
    </div>}
  </section>;
}
