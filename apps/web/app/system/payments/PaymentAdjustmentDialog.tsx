"use client";

import { useEffect, useRef, useState } from "react";
import { paymentAdjustmentSchema } from "@freshphones/contracts";
import { adjustPayment, type Payment } from "@/lib/api";
import styles from "./adjustments.module.css";

const money = (value: string | number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value));

export default function PaymentAdjustmentDialog({ payment, onClose, onSuccess, onRefresh }: {
  payment: Payment; onClose: () => void; onSuccess: (payment: Payment) => void; onRefresh: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const submission = useRef<{ key: string; id: string } | null>(null);
  const [amount, setAmount] = useState(payment.amount);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (dialog.current && !dialog.current.open) dialog.current.showModal(); }, []);
  const validAmount = /^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(amount);
  async function save() {
    if (busy.current || !confirmed) return;
    const key = JSON.stringify({ amount, reason: reason.trim() });
    if (submission.current?.key !== key) submission.current = { key, id: crypto.randomUUID() };
    const parsed = paymentAdjustmentSchema.safeParse({ correctedAmount: amount, reason, expectedRevision: payment.adjustment_revision ?? 0,
      paymentVersion: payment.version ?? 1, requestId: submission.current!.id });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    if (Number(amount) === Number(payment.amount)) { setError("Enter a corrected credit that differs from the current credit."); return; }
    busy.current = true; setSaving(true); setError("");
    try { onSuccess(await adjustPayment(payment.id, parsed.data)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save this adjustment."); }
    finally { busy.current = false; setSaving(false); }
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="payment-adjustment-title"
    onClose={onClose} onCancel={(event) => { if (busy.current) event.preventDefault(); }}>
    <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <header><div><p>Finance adjustment</p><h2 id="payment-adjustment-title">Correct verified credit</h2></div>
        <button type="button" aria-label="Close adjustment" disabled={saving} onClick={() => dialog.current?.close()}>×</button></header>
      <div className={styles.body}>
        <dl><div><dt>Customer</dt><dd>{payment.client_name}</dd></div><div><dt>Reference</dt><dd>{payment.reference_no || "—"}</dd></div>
          <div><dt>Original verified amount</dt><dd>{money(payment.original_amount ?? payment.amount)}</dd></div><div><dt>Current credit</dt><dd>{money(payment.amount)}</dd></div></dl>
        <label>Corrected credit (PHP)<input inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setConfirmed(false); }} disabled={saving} required /></label>
        <p>Enter the total credit this payment should contribute. Use 0 for a full reversal. The original payment remains in the history.</p>
        {validAmount && <p className={styles.preview} aria-live="polite">Credit change: {money(Number(amount) - Number(payment.amount))}{Number(amount) === 0 ? " · Full reversal" : ""}</p>}
        <label>Adjustment reason<textarea rows={4} minLength={10} maxLength={1000} value={reason} onChange={(event) => { setReason(event.target.value); setConfirmed(false); }} disabled={saving} required /></label>
        <p>Describe the checked evidence and why the credit needs correction. The reason and your identity are saved for staff review.</p>
        <label className={styles.confirm}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={saving} />I reviewed the evidence and approve this balance change.</label>
        {error && <div role="alert" className={styles.error}><p>{error}</p><button type="button" disabled={saving} onClick={onRefresh}>Refresh payment</button></div>}
      </div>
      <footer><button type="button" disabled={saving} onClick={() => dialog.current?.close()}>Cancel</button><button type="submit" disabled={saving || !confirmed || !validAmount || reason.trim().length < 10}>{saving ? "Saving…" : "Confirm adjustment"}</button></footer>
    </form>
  </dialog>;
}

export function AdjustmentHistory({ payment }: { payment: Payment }) {
  if (!payment.adjustments?.length) return null;
  return <section className={styles.history} aria-label="Payment adjustments"><h3>Adjustment history</h3><p>Current credit: {money(payment.amount)} · Original verified amount: {money(payment.original_amount ?? payment.amount)}</p>
    <ol>{payment.adjustments.map((entry) => <li key={entry.id}><strong>Adjustment {entry.sequence}: {money(entry.amount)}</strong>
      <p>{money(entry.beforeAmount)} → {money(entry.afterAmount)}</p><p>{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(entry.createdAt))}{entry.actor ? ` · ${entry.actor.name}` : ""}</p>
      {entry.reason && <p>{entry.reason}</p>}</li>)}</ol>
  </section>;
}
