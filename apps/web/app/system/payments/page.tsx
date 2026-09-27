"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Receipt,
  CheckCircle,
  XCircle,
  Wallet,
  Plus,
  DownloadSimple,
  Paperclip,
  WarningCircle,
  PencilSimple,
  Scan,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import {
  listPayments,
  createPayment,
  updatePayment,
  scanPaymentReceipt,
  decidePayment,
  getBalance,
  downloadPaymentsExport,
  uploadProof,
  getProofUrl,
  listClients,
  type Payment,
  type PaymentStatus,
  type Balance,
  type ClientRecord,
} from "@/lib/api";
import type { ReceiptScan, ReceiptType } from "@freshphones/contracts";
import { useMe, can } from "@/lib/useMe";
import { TYPESCRIPT_API } from "@/lib/backend";

const FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
  { label: "Needs clarification", value: "needs_clarification" },
];

const STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  needs_clarification: "bg-violet-100 text-violet-700",
};

const today = () => new Date().toISOString().slice(0, 10);
type ClientChoice = Pick<ClientRecord, "id" | "batch" | "batch_number" | "full_name" | "unit_model">;

export default function PaymentsPage() {
  const me = useMe();
  const canRecord = can(me, "PAYMENT_RECORD");
  const canVerify = can(me, "PAYMENT_VERIFY");
  const canRead = TYPESCRIPT_API
    ? can(me, "PAYMENT_READ")
    : can(me, "PAYMENT_RECORD", "PAYMENT_VERIFY");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState("");
  const [focusedPayment, setFocusedPayment] = useState<string | null>(null);
  const [paymentQuery, setPaymentQuery] = useState("");
  const [appliedPaymentQuery, setAppliedPaymentQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentCount, setPaymentCount] = useState(0);
  const [paymentPageSize, setPaymentPageSize] = useState(20);
  const [paymentHasNext, setPaymentHasNext] = useState(false);
  const paymentLoadVersion = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // record form
  const [form, setForm] = useState({
    client: "",
    amount: "",
    payment_date: today(),
    method: "gcash",
    reference_no: "",
  });
  const [saving, setSaving] = useState(false);
  const [proof, setProof] = useState<File | null>(null);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [receiptType, setReceiptType] = useState<ReceiptType>("gcash");
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptDragging, setReceiptDragging] = useState(false);
  const [scanResult, setScanResult] = useState<ReceiptScan | null>(null);
  const [scanning, setScanning] = useState(false);
  const scanVersion = useRef(0);
  const receiptInput = useRef<HTMLInputElement>(null);
  const [recordClient, setRecordClient] = useState<ClientChoice | null>(null);

  // balance lookup
  const [balanceClient, setBalanceClient] = useState("");
  const [balanceClientChoice, setBalanceClientChoice] = useState<ClientChoice | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);

  const load = useCallback(async (preserveError = false) => {
    const requestVersion = ++paymentLoadVersion.current;
    setLoading(true);
    if (!preserveError) setError(null);
    try {
      const data = await listPayments({
        ...(focusedPayment ? { id: focusedPayment } : {}),
        ...(filter ? { status: filter } : {}),
        ...(appliedPaymentQuery ? { q: appliedPaymentQuery } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
        page: String(paymentPage),
      });
      if (requestVersion !== paymentLoadVersion.current) return;
      setPayments(data.results);
      setPaymentCount(data.count);
      setPaymentPageSize(data.page_size ?? 20);
      setPaymentHasNext(Boolean(data.next));
    } catch (e) {
      if (requestVersion !== paymentLoadVersion.current) return;
      setError(e instanceof Error ? e.message : "Failed to load payments.");
    } finally {
      if (requestVersion === paymentLoadVersion.current) setLoading(false);
    }
  }, [appliedPaymentQuery, dateFrom, dateTo, filter, focusedPayment, paymentPage]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!TYPESCRIPT_API) return;
    const payment = new URLSearchParams(window.location.search).get("payment");
    if (payment && /^[0-9a-f-]{36}$/i.test(payment)) setFocusedPayment(payment);
  }, []);

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  useEffect(() => {
    if (!receiptImage) {
      setReceiptPreview(null);
      return;
    }
    const url = URL.createObjectURL(receiptImage);
    setReceiptPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptImage]);

  function flash(msg: string) {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(msg);
    noticeTimer.current = setTimeout(() => setNotice(null), 3000);
  }

  function clearExtractedCandidates(nextMethod?: ReceiptType) {
    if (scanResult) {
      setForm((current) => ({
        ...current,
        amount: current.amount === scanResult.amount ? "" : current.amount,
        payment_date: current.payment_date === scanResult.paymentDate ? "" : current.payment_date,
        reference_no: current.reference_no === scanResult.referenceNumber ? "" : current.reference_no,
        ...(nextMethod ? { method: nextMethod } : {}),
      }));
    } else if (nextMethod) {
      setForm((current) => ({ ...current, method: nextMethod }));
    }
  }

  function selectReceipt(file: File | null) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Use a JPG, PNG, or WebP receipt image.");
      if (receiptInput.current) receiptInput.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Receipt image must be 5 MB or smaller.");
      if (receiptInput.current) receiptInput.current.value = "";
      return;
    }
    scanVersion.current += 1;
    setScanning(false);
    setError(null);
    clearExtractedCandidates();
    setReceiptImage(file);
    setScanResult(null);
  }

  async function onRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client) {
      setError("Search for and select a client before recording the payment.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const record = {
        client: form.client,
        batch: recordClient?.batch,
        amount: form.amount,
        payment_date: form.payment_date,
        method: form.method,
        reference_no: form.reference_no,
      };
      const created = editing
        ? await updatePayment(editing.id, editing.version ?? 1, record)
        : await createPayment(record);
      const proofToUpload = TYPESCRIPT_API ? receiptImage : proof;
      let proofAttached = false;
      if (proofToUpload) {
        try {
          await uploadProof(created.id, proofToUpload);
          proofAttached = true;
        } catch (uploadError) {
          setError(`Payment was recorded, but its proof was not attached: ${uploadError instanceof Error ? uploadError.message : "upload failed"}`);
        }
      }
      if (!proofToUpload || proofAttached) flash(
        editing ? "Payment corrected and returned to pending review."
        : proofAttached ? "Payment recorded with private proof (pending verification)."
        : "Payment recorded (pending verification).",
      );
      setForm((f) => ({ ...f, amount: "", reference_no: "" }));
      setEditing(null);
      setProof(null);
      setReceiptImage(null);
      if (receiptInput.current) receiptInput.current.value = "";
      setScanResult(null);
      load(Boolean(proofToUpload && !proofAttached));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record payment.");
    } finally {
      setSaving(false);
    }
  }

  function edit(payment: Payment) {
    setEditing(payment);
    setRecordClient({
      id: payment.client,
      batch: payment.batch,
      batch_number: "",
      full_name: payment.client_name ?? "Selected client",
      unit_model: "",
    });
    setForm({ client: String(payment.client), amount: payment.amount,
      payment_date: payment.payment_date, method: payment.method,
      reference_no: payment.reference_no });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function scanReceipt() {
    if (!receiptImage) {
      setError("Choose a receipt image first.");
      return;
    }
    const requestVersion = ++scanVersion.current;
    const image = receiptImage;
    const template = receiptType;
    setScanning(true);
    setError(null);
    setScanResult(null);
    try {
      const result = await scanPaymentReceipt(image, template);
      if (requestVersion !== scanVersion.current) return;
      setScanResult(result);
      setForm((current) => ({
        ...current,
        amount: result.amount ?? current.amount,
        payment_date: result.paymentDate ?? "",
        method: result.template,
        reference_no: result.referenceNumber ?? current.reference_no,
      }));
    } catch (e) {
      if (requestVersion !== scanVersion.current) return;
      setError(e instanceof Error ? e.message : "Receipt could not be scanned.");
    } finally {
      if (requestVersion === scanVersion.current) setScanning(false);
    }
  }

  async function viewProof(id: string | number) {
    setError(null);
    try {
      const { url } = await getProofUrl(id);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open proof.");
    }
  }

  async function decide(payment: Payment, decision: PaymentStatus) {
    setError(null);
    if (reviewNotes.trim().length < 2) {
      setError("Add a short Finance review note before deciding.");
      return;
    }
    try {
      await decidePayment(payment.id, decision, payment.version, reviewNotes.trim());
      flash(`Payment ${decision.replace("_", " ")}.`);
      setReviewNotes("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    }
  }

  async function lookupBalance() {
    if (!balanceClient) {
      setError("Search for and select a client first.");
      return;
    }
    setError(null);
    setBalance(null);
    try {
      setBalance(await getBalance(balanceClient));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Balance lookup failed.");
    }
  }

  function resetPaymentPage() {
    paymentLoadVersion.current += 1;
    setPaymentPage(1);
  }

  function changePaymentPage(next: number) {
    paymentLoadVersion.current += 1;
    setPaymentPage(next);
  }

  const paymentExportFilters = {
    ...(filter ? { status: filter } : {}),
    ...(appliedPaymentQuery ? { q: appliedPaymentQuery } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };

  if (me && !canRead) {
    return (
      <section className="glass rounded-3xl p-10 text-center">
        <h1 className="font-display text-xl font-700 text-blue-ink">No access</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Your role doesn&apos;t have access to Payments &amp; Finance.
        </p>
      </section>
    );
  }

  return (
    <>
      <header className="glass mb-4 flex items-center gap-3 rounded-3xl px-5 py-3.5">
        <span className="grid h-10 w-10 place-items-center rounded-2xl chrome">
          <Receipt weight="fill" className="h-5 w-5 text-blue" />
        </span>
        <div>
          <h1 className="font-display text-lg font-700 tracking-tight text-blue-ink">
            Payments &amp; Finance
          </h1>
          <p className="text-xs text-ink-soft">
            Record external payments · Finance verifies · only verified moves the balance
          </p>
        </div>
      </header>

      {(error || notice) && (
        <div className="payment-toast-region">
          <div
            key={error ?? notice}
            className={`payment-toast ${error ? "is-error" : "is-success"}`}
            role={error ? "alert" : "status"}
          >
            <span className="payment-toast-icon" aria-hidden="true">
              {error ? <WarningCircle weight="fill" /> : <CheckCircle weight="fill" />}
            </span>
            <div className="payment-toast-copy">
              <strong>{error ? "Action needed" : "Updated"}</strong>
              <p>{error ?? notice}</p>
            </div>
            <button
              type="button"
              onClick={() => error ? setError(null) : setNotice(null)}
              aria-label="Dismiss message"
              className="payment-toast-close"
            >
              <X weight="bold" />
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        {/* Record form */}
        {canRecord && (
        <form
          onSubmit={onRecord}
          className="glass rounded-3xl p-5 lg:col-span-2"
        >
          <h2 className="mb-3 flex items-center gap-2 font-display font-700 text-blue-ink">
            {editing ? <PencilSimple weight="bold" className="h-4 w-4" /> : <Plus weight="bold" className="h-4 w-4" />}
            {editing ? "Correct payment" : "Record a payment"}
          </h2>
          {TYPESCRIPT_API && (
            <div className="receipt-scan-panel mb-4 rounded-2xl p-4" aria-busy={scanning}>
              <div className="mb-2 flex items-center gap-2 text-sm font-700 text-blue-ink">
                <Scan weight="bold" className="h-4 w-4" /> Scan receipt to prefill
              </div>
              <div className="grid gap-2 sm:grid-cols-[9rem_1fr]">
                <select value={receiptType} onChange={(event) => {
                  const nextType = event.target.value as ReceiptType;
                  scanVersion.current += 1;
                  setScanning(false);
                  clearExtractedCandidates(nextType);
                  setScanResult(null);
                  setReceiptType(nextType);
                }} className={inputCls} aria-label="Receipt type">
                  <option value="gcash">GCash</option>
                  <option value="maya">Maya</option>
                  <option value="bank">Bank transfer</option>
                  <option value="cash">Cash receipt</option>
                </select>
                <div
                  tabIndex={0}
                  onDragEnter={(event) => { event.preventDefault(); setReceiptDragging(true); }}
                  onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setReceiptDragging(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setReceiptDragging(false);
                    selectReceipt(event.dataTransfer.files[0] ?? null);
                  }}
                  onPaste={(event) => {
                    const pasted = event.clipboardData.files[0]
                      ?? Array.from(event.clipboardData.items).find((item) => item.kind === "file")?.getAsFile()
                      ?? null;
                    if (pasted) event.preventDefault();
                    selectReceipt(pasted);
                  }}
                  className={`receipt-dropzone rounded-2xl border-2 border-dashed px-4 py-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue/40 ${receiptDragging ? "is-dragging" : ""}`}
                  aria-label="Receipt image upload area. Drop an image, paste one from the clipboard, or browse files."
                >
                  <input
                    ref={receiptInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => selectReceipt(event.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    {receiptPreview && (
                      <img
                        src={receiptPreview}
                        alt="Selected receipt preview"
                        className="receipt-preview h-24 w-20 shrink-0 rounded-xl object-contain"
                      />
                    )}
                    <div>
                      <p className="text-sm font-700 text-blue-ink">
                        {receiptImage ? receiptImage.name : "Drop or paste a receipt image"}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">Drag it here, press Ctrl/⌘+V, or browse · JPG, PNG, WebP</p>
                      <button type="button" onClick={() => receiptInput.current?.click()}
                        className="receipt-browse mt-2 rounded-full px-3 py-1.5 text-xs font-700">
                        {receiptImage ? "Replace image" : "Browse files"}
                      </button>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={scanReceipt} disabled={scanning || !receiptImage}
                  className="rounded-2xl bg-blue px-4 py-2 text-sm font-700 text-white disabled:opacity-50 sm:col-start-2 sm:justify-self-end">
                  {scanning ? "Scanning…" : "Extract text"}
                </button>
              </div>
              <p className="receipt-scan-help mt-2 text-xs">Scanning is temporary. When you record the claim, the selected image is attached as private proof. Review every extracted field first.</p>
              {scanning && (
                <div className="receipt-scan-loading mt-3" role="status" aria-live="polite">
                  <div className="receipt-skeleton" aria-hidden="true">
                    <span /><span /><span />
                  </div>
                  <div>
                    <strong>Reading receipt…</strong>
                    <p>Looking for the amount, payment date, and reference number.</p>
                  </div>
                </div>
              )}
              {scanResult && !scanning && (
                <div className={`receipt-scan-result mt-3 ${scanResult.warnings.length ? "has-warning" : "is-complete"}`} role="status" aria-live="polite">
                  <strong>{scanResult.warnings.length ? "Review extracted fields" : "Extraction complete"}</strong>
                  <p>Found {Math.round(scanResult.confidence * 100)}% of expected fields. Confirm them below before recording.</p>
                  {scanResult.warnings.map((warning) => <p key={warning} className="receipt-scan-warning">{warning}</p>)}
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Client">
              <ClientPicker
                label="Client"
                selected={recordClient}
                required
                onSelect={(client) => {
                  setRecordClient(client);
                  setForm((current) => ({ ...current, client: client ? String(client.id) : "" }));
                }}
              />
            </Field>
            <Field label="Amount (₱)">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className={inputCls}
                placeholder="2000.00"
              />
            </Field>
            <Field label="Payment date">
              <input
                type="date"
                required
                value={form.payment_date}
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Method">
              <select
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
                className={inputCls}
              >
                <option value="gcash">GCash</option>
                <option value="maya">Maya</option>
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Reference #">
              <input
                type="text"
                value={form.reference_no}
                onChange={(e) => setForm({ ...form, reference_no: e.target.value })}
                className={inputCls}
                placeholder="GC123"
              />
            </Field>
          </div>
          {!TYPESCRIPT_API && <label className="mt-3 flex flex-col gap-1">
            <span className="text-xs font-600 text-ink-soft">
              Proof (screenshot / receipt) — optional, stored privately
            </span>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setProof(e.target.files?.[0] ?? null)}
              className="text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-white/70 file:px-3 file:py-1.5 file:text-sm file:font-700 file:text-blue-ink"
            />
          </label>}
          <button
            type="submit"
            disabled={saving || scanning}
            className="btn-candy mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-700 disabled:opacity-70"
          >
            <Plus weight="bold" className="h-4 w-4" />
            {saving ? "Saving…" : editing ? "Save and return to pending" : "Record payment"}
          </button>
          {editing && <button type="button" onClick={() => setEditing(null)}
            className="ml-2 rounded-2xl bg-white/70 px-4 py-2.5 text-sm font-700 text-ink-soft hover:bg-white">
            Cancel
          </button>}
        </form>
        )}

        {/* Balance lookup */}
        <div className="glass rounded-3xl p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display font-700 text-blue-ink">
            <Wallet weight="fill" className="h-4 w-4" /> Balance lookup
          </h2>
          <div className="flex gap-2">
            <ClientPicker
              label="Balance client"
              selected={balanceClientChoice}
              onSelect={(client) => {
                setBalanceClientChoice(client);
                setBalanceClient(client ? String(client.id) : "");
                setBalance(null);
              }}
            />
            <button
              onClick={lookupBalance}
              disabled={!balanceClient}
              className="balance-check-button shrink-0 rounded-2xl px-4 py-2 text-sm font-700 disabled:opacity-50"
            >
              Check
            </button>
          </div>
          {balance && (
            <dl className="mt-4 space-y-1.5 text-sm">
              <Row k="Total due" v={`₱${balance.total_due}`} />
              <Row k="Verified paid" v={`₱${balance.verified_paid}`} strong />
              <Row k="Remaining" v={`₱${balance.remaining_balance}`} strong />
              {balance.pending_amount && <Row k="Awaiting verification" v={`₱${balance.pending_amount}`} />}
              {balance.overpaid && balance.overpaid !== "0.00" && <Row k="Overpayment" v={`₱${balance.overpaid}`} strong />}
            </dl>
          )}
        </div>
      </div>

      {/* List */}
      <div className="glass rounded-3xl p-5">
        {focusedPayment && <div className="mb-4 flex items-center gap-3 rounded-xl bg-violet-100 px-4 py-2 text-sm text-violet-700">Viewing a payment from the work queue <button type="button" onClick={() => { setFocusedPayment(null); window.history.replaceState(null, "", "/system/payments"); }} className="font-700 underline">Show all payments</button></div>}
        <form className="payment-list-search mb-3 grid gap-2 md:grid-cols-[minmax(15rem,1fr)_9rem_9rem_auto]" onSubmit={(event) => {
          event.preventDefault();
          const term = paymentQuery.trim();
          if (focusedPayment) { setFocusedPayment(null); window.history.replaceState(null, "", "/system/payments"); }
          resetPaymentPage();
          if (term === appliedPaymentQuery && paymentPage === 1) void load();
          else setAppliedPaymentQuery(term);
        }}>
          <label>
            <span className="mb-1 block text-xs font-600 text-ink-soft">Find a payment</span>
            <span className="client-picker-control block">
              <MagnifyingGlass weight="bold" aria-hidden="true" />
              <input value={paymentQuery} maxLength={100} onChange={(event) => setPaymentQuery(event.target.value)}
                className={`${inputCls} client-picker-input`} placeholder="Client, batch, or reference…" />
            </span>
          </label>
          <label>
            <span className="mb-1 block text-xs font-600 text-ink-soft">From</span>
            <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => {
              setDateFrom(event.target.value);
              resetPaymentPage();
            }} className={inputCls} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-600 text-ink-soft">To</span>
            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => {
              setDateTo(event.target.value);
              resetPaymentPage();
            }} className={inputCls} />
          </label>
          <button type="submit" className="balance-check-button self-end rounded-2xl px-4 py-2 text-sm font-700">
            Search
          </button>
        </form>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setFocusedPayment(null); window.history.replaceState(null, "", "/system/payments"); setFilter(f.value); resetPaymentPage(); }}
                className={`rounded-full px-3.5 py-1.5 text-sm font-700 transition-colors ${
                  filter === f.value
                    ? "bg-blue text-white"
                    : "bg-white/60 text-ink-soft hover:bg-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                downloadPaymentsExport(paymentExportFilters, "csv").catch(
                  (e) => setError(e instanceof Error ? e.message : "Export failed."),
                )
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3.5 py-1.5 text-sm font-700 text-blue-ink hover:bg-white"
            >
              <DownloadSimple weight="bold" className="h-4 w-4" /> CSV
            </button>
            {!TYPESCRIPT_API && <button
              onClick={() =>
                downloadPaymentsExport(paymentExportFilters, "xlsx").catch(
                  (e) => setError(e instanceof Error ? e.message : "Export failed."),
                )
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3.5 py-1.5 text-sm font-700 text-blue-ink hover:bg-white"
            >
              <DownloadSimple weight="bold" className="h-4 w-4" /> Excel
            </button>}
          </div>
        </div>
        <p className="mb-3 text-xs text-ink-soft">
          {loading ? "Loading matching payments…" : `${paymentCount} matching payment${paymentCount === 1 ? "" : "s"}.`}
          {TYPESCRIPT_API && " CSV export uses the same search, status, and date filters and omits client identity and payment references."}
        </p>

        {canVerify && (
          <label className="mb-4 block max-w-xl">
            <span className="mb-1 block text-xs font-600 text-ink-soft">Finance review note</span>
            <input value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)}
              className={inputCls} placeholder="Example: Matched GCash transaction history" />
          </label>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-ink-soft">
              <tr className="border-b border-white/60">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Client</th>
                <th className="px-2 py-2">Amount</th>
                <th className="px-2 py-2">Method</th>
                <th className="px-2 py-2">Ref</th>
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-2 py-6 text-center text-ink-soft">
                    Loading…
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-2 py-6 text-center text-ink-soft">
                    No payments.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="border-b border-white/40">
                    <td className="px-2 py-2.5 font-600 text-blue-ink">{String(p.id).slice(0, 8)}</td>
                    <td className="px-2 py-2.5">{p.client_name ?? p.client}</td>
                    <td className="px-2 py-2.5 font-700 text-blue-ink">₱{p.amount}</td>
                    <td className="px-2 py-2.5 capitalize">{p.method}</td>
                    <td className="px-2 py-2.5 text-ink-soft">
                      {p.reference_no || "—"}
                      {p.duplicate_reference && <span className="ml-1 inline-flex items-center gap-1 text-amber-700" title="Possible duplicate for this client"><WarningCircle weight="fill" /> Duplicate?</span>}
                    </td>
                    <td className="px-2 py-2.5 text-ink-soft">{p.payment_date}</td>
                    <td className="px-2 py-2.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-700 ${STATUS_STYLES[p.status]}`}
                      >
                        {p.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {p.proof_file && (
                          <button
                            onClick={() => viewProof(p.id)}
                            className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-700 text-blue hover:bg-white"
                          >
                            <Paperclip weight="bold" className="h-3.5 w-3.5" /> Proof
                          </button>
                        )}
                        {p.status === "pending" && canVerify ? (
                          <>
                            <button
                              onClick={() => decide(p, "verified")}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-700 text-emerald-700 hover:bg-emerald-200"
                            >
                              <CheckCircle weight="fill" className="h-3.5 w-3.5" /> Verify
                            </button>
                            <button
                              onClick={() => decide(p, "rejected")}
                              className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-700 text-rose-700 hover:bg-rose-200"
                            >
                              <XCircle weight="fill" className="h-3.5 w-3.5" /> Reject
                            </button>
                            <button
                              onClick={() => decide(p, "needs_clarification")}
                              className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-700 text-violet-700 hover:bg-violet-200"
                            >
                              <WarningCircle weight="fill" className="h-3.5 w-3.5" /> Clarify
                            </button>
                          </>
                        ) : (
                          !p.proof_file && <span className="text-xs text-ink-soft">—</span>
                        )}
                        {TYPESCRIPT_API && canRecord && ["pending", "needs_clarification"].includes(p.status) && (
                          <button onClick={() => edit(p)}
                            className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-700 text-blue hover:bg-white">
                            <PencilSimple weight="bold" className="h-3.5 w-3.5" /> Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Payment pages">
          <button type="button" disabled={loading || paymentPage === 1}
            onClick={() => changePaymentPage(Math.max(1, paymentPage - 1))}
            className="rounded-xl border border-white/70 bg-white/60 px-3 py-2 text-xs font-700 text-blue-ink disabled:opacity-40">
            Previous
          </button>
          <span className="text-xs text-ink-soft">
            Page {paymentPage} of {Math.max(1, Math.ceil(paymentCount / paymentPageSize))}
          </span>
          <button type="button" disabled={loading || !paymentHasNext}
            onClick={() => changePaymentPage(paymentPage + 1)}
            className="rounded-xl border border-white/70 bg-white/60 px-3 py-2 text-xs font-700 text-blue-ink disabled:opacity-40">
            Next
          </button>
        </nav>
      </div>

      <p className="mt-3 text-center text-xs text-ink-soft">
        Verify is Finance-only — a non-Finance account gets a 403 (enforced server-side).
      </p>
    </>
  );
}

const inputCls =
  "w-full rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-blue focus:bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-600 text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function ClientPicker({
  label,
  selected,
  onSelect,
  required = false,
}: {
  label: string;
  selected: ClientChoice | null;
  onSelect: (client: ClientChoice | null) => void;
  required?: boolean;
}) {
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const searchVersion = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientChoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searchError, setSearchError] = useState(false);
  const [retry, setRetry] = useState(0);
  const selectedText = selected
    ? `${selected.full_name}${selected.batch_number ? ` · ${selected.batch_number}` : ""}`
    : "";

  useEffect(() => {
    if (selected) setQuery(selectedText);
  }, [selected, selectedText]);

  useEffect(() => {
    const term = query.trim();
    if (selected || term.length < 2) {
      setResults([]);
      setLoading(false);
      setSearchError(false);
      return;
    }
    const requestVersion = searchVersion.current;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setSearchError(false);
      void listClients({ q: term }).then((page) => {
        if (cancelled || requestVersion !== searchVersion.current) return;
        setResults(page.results);
        setOpen(true);
        setActive(-1);
      }).catch(() => {
        if (!cancelled && requestVersion === searchVersion.current) setSearchError(true);
      }).finally(() => {
        if (!cancelled && requestVersion === searchVersion.current) setLoading(false);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, retry, selected]);

  useEffect(() => {
    if (active < 0) return;
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  function choose(client: ClientChoice) {
    onSelect(client);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div
      ref={root}
      className="client-picker"
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className="client-picker-control">
        <MagnifyingGlass weight="bold" aria-hidden="true" />
        <input
          type="text"
          role="combobox"
          aria-label={label}
          aria-required={required}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={query}
          maxLength={100}
          placeholder="Search name, phone, or batch…"
          className={`${inputCls} client-picker-input`}
          onFocus={() => { if (results.length || loading || searchError) setOpen(true); }}
          onChange={(event) => {
            searchVersion.current += 1;
            setQuery(event.target.value);
            if (selected) onSelect(null);
            setResults([]);
            setLoading(false);
            setSearchError(false);
            setActive(-1);
            setOpen(event.target.value.trim().length >= 2);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && results.length) {
              event.preventDefault();
              setOpen(true);
              setActive((current) => Math.min(current + 1, results.length - 1));
            } else if (event.key === "ArrowUp" && results.length) {
              event.preventDefault();
              setActive((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && open && active >= 0) {
              event.preventDefault();
              choose(results[active]);
            } else if (event.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
          }}
        />
      </div>
      {open && (
        <div id={listId} role="listbox" aria-label={`${label} search results`} className="client-picker-results">
          {loading && <p className="client-picker-state">Searching clients…</p>}
          {!loading && searchError && (
            <div className="client-picker-state is-error">
              <span>Could not search clients.</span>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => {
                searchVersion.current += 1;
                setRetry((current) => current + 1);
              }}>Try again</button>
            </div>
          )}
          {!loading && !searchError && query.trim().length >= 2 && results.length === 0 && (
            <p className="client-picker-state">No matching clients.</p>
          )}
          {!loading && results.map((client, index) => (
            <div
              key={client.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={active === index}
              className={`client-picker-option ${active === index ? "is-active" : ""}`}
              onMouseDown={(event) => { event.preventDefault(); choose(client); }}
              onMouseEnter={() => setActive(index)}
            >
              <span className="client-picker-identity">
                <strong>{client.full_name}</strong>
                <small>{client.unit_model}</small>
              </span>
              <span>{client.batch_number || "No batch code"}</span>
            </div>
          ))}
        </div>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {loading ? "Searching clients" : searchError ? "Client search failed" : open ? `${results.length} clients found` : ""}
      </span>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-soft">{k}</dt>
      <dd className={strong ? "font-700 text-blue-ink" : "text-ink"}>{v}</dd>
    </div>
  );
}
