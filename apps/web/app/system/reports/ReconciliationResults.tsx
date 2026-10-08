"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Page, ReconciliationException, ReconciliationFlag, ReconciliationReport, ReconciliationSnapshot } from "@freshphones/contracts";
import { getReconciliationExceptions } from "@/lib/api";
import styles from "./reports.module.css";

const money = (value: string) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value));
const flagNames: Record<ReconciliationFlag, string> = {
  DUPLICATE_REFERENCE: "Possible duplicate reference",
  SCHEDULE_CLIENT_MISMATCH: "Schedule belongs to another client",
  BATCH_MEMBERSHIP_MISMATCH: "Recorded and current batch differ",
  VERIFIED_WITHOUT_SCHEDULE: "Verified payment without issued schedule",
  UNMATCHED_VERIFICATION_AUDIT: "No matching verification audit",
  UNMATCHED_ADJUSTMENT_AUDIT: "No matching adjustment audit",
};

export default function ReconciliationResults({ data, scope, canReview, onPage, disabled = false }: {
  data: ReconciliationReport | ReconciliationSnapshot; scope?: Record<string, string>; canReview: boolean;
  onPage?: (page: number) => void; disabled?: boolean;
}) {
  const [savedPage, setSavedPage] = useState(1);
  const [showExceptions, setShowExceptions] = useState(false);
  const live = "items" in data;
  const total = live ? data.total : data.groups.length;
  const page = live ? data.page : savedPage;
  const rows = live ? data.items : data.groups.slice((page - 1) * 20, page * 20);
  const changePage = live ? onPage : setSavedPage;
  const totals = data.totals;
  const cards = [
    { label: "Recorded claims", value: money(totals.recordedAmount), note: `${totals.payments} records across all statuses` },
    { label: "Verified amount", value: money(totals.verifiedAmount), note: `${totals.verifiedPayments} verified payments` },
    { label: "Verified with matching audit", value: money(totals.auditedVerifiedAmount), note: `${totals.auditedVerifiedPayments} records match their verification evidence` },
    { label: "Verification audit gap", value: money(totals.unmatchedVerifiedAmount), note: `${totals.unmatchedVerifiedPayments} verified records need evidence review` },
    { label: "Awaiting verification", value: money(totals.pendingAmount), note: `${totals.pendingPayments} pending records` },
    { label: "Needs clarification", value: money(totals.clarificationAmount), note: `${totals.clarificationPayments} records` },
    { label: "Rejected claims", value: money(totals.rejectedAmount), note: `${totals.rejectedPayments} rejected records` },
    { label: "Payments with review flags", value: totals.paymentsWithFlags, note: "Each payment counted once; flags can overlap" },
    { label: "Finance adjustments", value: money(totals.adjustmentAmount ?? "0.00"), note: `${totals.adjustments ?? 0} append-only entries; included in verified credit` },
    { label: "Adjustment audit gap", value: money(totals.adjustmentAuditGapAmount ?? "0.00"), note: `${totals.adjustmentAuditGapPayments ?? 0} payments need adjustment evidence review` },
  ];
  return <>
    <p className={styles.warning}>Internal record comparison only. External bank statements have not been matched. Review flags require a human check and do not authorize verification, refunds or adjustments.</p>
    <dl className={styles.metrics}>{cards.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd><p>{item.note}</p></div>)}</dl>
    <h3 className={styles.subheading}>Review flags in this scope</h3>
    <dl className={styles.metrics}>{[
      ["Possible duplicate references", totals.duplicateReferencePayments],
      ["Schedule/client mismatches", totals.scheduleMismatchPayments],
      ["Recorded/current batch differences", totals.batchMismatchPayments],
      ["Verified without issued schedule", totals.verifiedWithoutSchedulePayments],
    ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p className={styles.help}>Duplicate checks compare normalized references for the same payment method across the entire ledger, including other dates and batches. A permitted client move can explain a batch difference. Matching audit evidence checks the current payment facts and Finance actor; older or missing evidence needs review.</p>
    {totals.payments === 0 ? <p className={styles.empty}>No payments match these reconciliation filters.</p> : <>
      <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Reconciliation figures"><table className={styles.collectionTable}>
        <caption>Recorded payment batch and method totals (PHP)</caption>
        <thead><tr>{["Batch", "Method", "Recorded claims", "Verified", "Matching audit", "Audit gap", "Pending", "Clarification", "Rejected", "Review flags"].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={`${row.batchId}:${row.method}`}><th scope="row">{row.batchCode}</th><td>{row.method}</td>
          <td>{money(row.recordedAmount)}<small>{row.payments} records</small></td><td>{money(row.verifiedAmount)}</td>
          <td>{money(row.auditedVerifiedAmount)}</td><td>{money(row.unmatchedVerifiedAmount)}</td><td>{money(row.pendingAmount)}</td>
          <td>{money(row.clarificationAmount)}</td><td>{money(row.rejectedAmount)}</td><td>{row.paymentsWithFlags}</td>
        </tr>)}</tbody>
      </table></div>
      <nav className={styles.pagination} aria-label={live ? "Reconciliation group pages" : "Captured reconciliation pages"}>
        <span>{total} batch/method groups · Totals cover the full scope</span>
        <button type="button" disabled={disabled || page === 1 || !changePage} onClick={() => changePage?.(page - 1)}>Previous groups</button>
        <span>Page {page} of {Math.max(1, Math.ceil(total / 20))}</span>
        <button type="button" disabled={disabled || page * 20 >= total || !changePage} onClick={() => changePage?.(page + 1)}>Next groups</button>
      </nav>
    </>}
    <p className={styles.help}>{live ? "Dates use original payment dates and current status; batch scope uses the recorded payment batch. Verified figures include current Finance adjustments; recorded claims retain original amounts. CSV/XLSX and saved reports include every group, across all pages." : "These current-state figures and flags were captured when saved. They are not reconstructed balances as of the period end date. Saved reports contain aggregates only."} Only Finance-approved credits affect client balances. An audit gap does not automatically reverse a verified payment.</p>
    {live && scope && (canReview ? <>
      <button type="button" disabled={disabled} onClick={() => setShowExceptions(!showExceptions)}>{showExceptions ? "Hide payment exceptions" : "Review payment exceptions"}</button>
      {showExceptions && <PaymentExceptions scope={scope} disabled={disabled} />}
    </> : <p className={styles.help}>Individual payment exceptions require both report and payment-read access. This report and its downloads contain aggregates only.</p>)}
  </>;
}

function PaymentExceptions({ scope, disabled }: { scope: Record<string, string>; disabled: boolean }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page<ReconciliationException> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const scopeKey = JSON.stringify(scope);
  const load = useCallback(async () => {
    const request = ++sequence.current; setLoading(true); setResult(null); setError(null);
    try {
      const rows = await getReconciliationExceptions({ ...JSON.parse(scopeKey), page: String(page) });
      if (request !== sequence.current) return;
      const last = Math.max(1, Math.ceil(rows.total / rows.pageSize));
      if (page > last) { setPage(last); return; }
      setResult(rows);
    } catch (reason) { if (request === sequence.current) setError(reason instanceof Error ? reason.message : "Could not load payment exceptions."); }
    finally { if (request === sequence.current) setLoading(false); }
  }, [scopeKey, page]);
  useEffect(() => { void load(); return () => { sequence.current++; }; }, [load]);
  return <div className={styles.exceptionPanel} aria-busy={loading}>
    <h3 className={styles.subheading}>Payment exceptions for review</h3>
    {loading ? <p role="status" className={styles.empty}>Loading payment exceptions…</p> : error ? <p role="alert" className={styles.error}>{error} <button type="button" disabled={disabled} onClick={() => void load()}>Retry exceptions</button></p> : result?.items.length ? <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Payment exceptions"><table>
      <caption>Flagged payment records; open Finance for the authorized record details</caption>
      <thead><tr>{["Payment date", "Recorded batch", "Current batch", "Method", "Status", "Amount", "Review flags", "Review"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>{result.items.map((item) => <tr key={item.id}><td>{item.paymentDate}</td><td>{item.batchCode}</td><td>{item.currentBatchCode}</td><td>{item.method}</td><td>{item.status.toLowerCase().replaceAll("_", " ")}</td><td>{money(item.amount)}</td><td>{item.flags.map((flag) => <span className={styles.exceptionFlag} key={flag}>{flagNames[flag]}</span>)}</td><td><a href={`/system/payments?payment=${encodeURIComponent(item.id)}`}>Open payment</a></td></tr>)}</tbody>
    </table></div> : <p className={styles.empty}>No payment records have review flags in this scope.</p>}
    <nav className={styles.pagination} aria-label="Payment exception pages"><span>{result?.total ?? "—"} flagged payments</span>
      <button type="button" disabled={disabled || loading || page === 1} onClick={() => { sequence.current++; setPage(page - 1); }}>Previous exceptions</button><span>Page {page} of {Math.max(1, Math.ceil((result?.total ?? 0) / 20))}</span>
      <button type="button" disabled={disabled || loading || !result || page * result.pageSize >= result.total} onClick={() => { sequence.current++; setPage(page + 1); }}>Next exceptions</button>
    </nav>
  </div>;
}
