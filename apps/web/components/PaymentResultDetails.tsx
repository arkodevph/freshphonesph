"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "@phosphor-icons/react";
import { getPaymentResult, type PaymentResultDetail } from "@/lib/api";
import { useLiveRecords } from "@/lib/useLiveRecords";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const decisionLabel = (value: string) => value === "NEEDS_CLARIFICATION" ? "Needs clarification" : value === "VERIFIED" ? "Verified" : value === "REJECTED" ? "Rejected" : "Pending";
const reviewedAt = (date: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(date)) + " PHT";

/** The result is an immutable decision; the linked payment may have changed since it. */
export function PaymentResultDetails({ enabled }: { enabled: boolean }) {
  const params = useSearchParams();
  const raw = params.get("result");
  const id = raw && uuid.test(raw) ? raw : null;
  const paymentId = params.get("payment");
  const [result, setResult] = useState<PaymentResultDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const sequence = useRef(0);
  const load = useCallback(async () => {
    if (!enabled || !id) return;
    const request = ++sequence.current;
    setLoading(true);
    try {
      const latest = await getPaymentResult(id);
      if (request !== sequence.current) return;
      if (latest.paymentId !== paymentId) throw new Error("This Finance result belongs to a different payment.");
      setResult(latest); setError(null);
    } catch (caught) {
      if (request !== sequence.current) return;
      setResult(null); setError(caught instanceof Error ? caught.message : "Could not load the Finance result.");
    } finally { if (request === sequence.current) setLoading(false); }
  }, [enabled, id, paymentId]);
  useEffect(() => {
    setResult(null); setError(null);
    if (enabled && id) {
      if (!dialog.current?.open) dialog.current?.showModal();
      void load();
    } else if (dialog.current?.open) dialog.current.close();
    return () => { sequence.current++; };
  }, [enabled, id, load]);
  useLiveRecords(load, enabled && Boolean(id));
  function close() {
    sequence.current++; setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("result");
    window.history.replaceState(null, "", url.pathname + url.search);
  }
  return <dialog ref={dialog} className="finance-review-dialog payment-details-dialog" aria-labelledby="finance-result-title" onClose={close}>
    <div className="payment-details-shell">
      <header className="finance-review-heading"><div><p>Saved Finance decision</p><h2 id="finance-result-title">Finance result</h2></div>
        <button type="button" onClick={() => dialog.current?.close()} aria-label="Close Finance result"><X weight="bold" /></button></header>
      <div className="payment-details-body">
        {error ? <p className="finance-review-error" role="alert">{error} <button type="button" onClick={() => void load()} disabled={loading}>Retry Finance result</button></p>
          : !result ? <p role="status">Loading Finance result…</p>
          : <>
            <section aria-label="Saved decision"><h3>{decisionLabel(result.decision)}</h3>
              <dl className="payment-details-grid">
                <div><dt>Amount reviewed</dt><dd>₱{result.amount}</dd></div>
                <div><dt>Client</dt><dd>{result.clientName}</dd></div>
                <div><dt>Batch</dt><dd>{result.batchCode}</dd></div>
                <div><dt>Reviewed by</dt><dd>{result.verifierName}</dd></div>
                <div><dt>Decision saved at</dt><dd>{reviewedAt(result.occurredAt)}</dd></div>
              </dl>
              <div className="payment-details-note"><strong>Finance notes for this decision</strong><p className="whitespace-pre-wrap">{result.notes || "No Finance note was recorded."}</p></div>
            </section>
            <section aria-label="Current payment status"><h3>Current payment: {decisionLabel(result.currentStatus)}</h3>
              <p>{result.currentVersion === result.version ? "This decision matches the current payment record." : "This payment changed after the saved decision. Review the current payment record before taking action."}</p>
              {result.decision === "NEEDS_CLARIFICATION" && result.currentVersion === result.version && <p>Use the current payment record to correct the information requested by Finance and return it for review.</p>}
            </section>
          </>}
      </div>
      <footer className="finance-review-actions"><button type="button" onClick={() => dialog.current?.close()}>View current payment</button></footer>
    </div>
  </dialog>;
}
