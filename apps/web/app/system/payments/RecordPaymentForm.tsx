"use client";

import { type Payment } from "@/lib/api";
import type {
  PaymentDuplicateMatch,
  ReceiptScan,
  ReceiptType,
} from "@freshphones/contracts";
import {
  Eye,
  PencilSimple,
  Plus,
  Scan,
  WarningCircle,
} from "@phosphor-icons/react";
import type * as React from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { ClientPicker } from "./ClientPicker";
import { Field, inputCls } from "@/components/FormField";
import { ClientChoice } from "./payment-view";

type Props = {
  onRecord: (e: React.FormEvent) => Promise<void>;
  editing: Payment | null;
  scanning: boolean;
  receiptType: "gcash" | "maya" | "bank" | "cash";
  scanVersion: RefObject<number>;
  setScanning: Dispatch<SetStateAction<boolean>>;
  clearExtractedCandidates: (nextMethod?: ReceiptType) => void;
  setScanResult: Dispatch<SetStateAction<ReceiptScan | null>>;
  setReceiptType: Dispatch<SetStateAction<"gcash" | "maya" | "bank" | "cash">>;
  setReceiptDragging: Dispatch<SetStateAction<boolean>>;
  selectReceipt: (file: File | null) => void;
  receiptDragging: boolean;
  receiptInput: RefObject<HTMLInputElement | null>;
  receiptPreview: string | null;
  receiptDialog: RefObject<HTMLDialogElement | null>;
  receiptImage: File | null;
  scanReceipt: () => Promise<void>;
  scanResult: ReceiptScan | null;
  recordClient: ClientChoice | null;
  setRecordClient: Dispatch<SetStateAction<ClientChoice | null>>;
  setForm: Dispatch<
    SetStateAction<{
      client: string;
      amount: string;
      payment_date: string;
      method: string;
      reference_no: string;
      receipt_time: string;
      receipt_name: string;
      receipt_phone: string;
    }>
  >;
  form: {
    client: string;
    amount: string;
    payment_date: string;
    method: string;
    reference_no: string;
    receipt_time: string;
    receipt_name: string;
    receipt_phone: string;
  };
  duplicateChecking: boolean;
  duplicateCheckError: boolean;
  duplicateMatches: PaymentDuplicateMatch[];
  reviewedDuplicates: string | null;
  duplicateReviewKey: string;
  setReviewedDuplicates: Dispatch<SetStateAction<string | null>>;
  saving: boolean;
  setEditing: Dispatch<SetStateAction<Payment | null>>;
};

export default function RecordPaymentForm({
  onRecord,
  editing,
  scanning,
  receiptType,
  scanVersion,
  setScanning,
  clearExtractedCandidates,
  setScanResult,
  setReceiptType,
  setReceiptDragging,
  selectReceipt,
  receiptDragging,
  receiptInput,
  receiptPreview,
  receiptDialog,
  receiptImage,
  scanReceipt,
  scanResult,
  recordClient,
  setRecordClient,
  setForm,
  form,
  duplicateChecking,
  duplicateCheckError,
  duplicateMatches,
  reviewedDuplicates,
  duplicateReviewKey,
  setReviewedDuplicates,
  saving,
  setEditing,
}: Props) {
  return (
    <form onSubmit={onRecord} className="glass rounded-3xl p-5 lg:col-span-2">
      <h2 className="mb-3 flex items-center gap-2 font-display font-700 text-blue-ink">
        {editing ? (
          <PencilSimple weight="bold" className="h-4 w-4" />
        ) : (
          <Plus weight="bold" className="h-4 w-4" />
        )}
        {editing ? "Correct payment" : "Record a payment"}
      </h2>
      {
        <div
          className="receipt-scan-panel mb-4 rounded-2xl p-4"
          aria-busy={scanning}
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-700 text-blue-ink">
            <Scan weight="bold" className="h-4 w-4" /> Scan receipt to prefill
          </div>
          <div className="grid gap-2 sm:grid-cols-[9rem_1fr]">
            <select
              value={receiptType}
              onChange={(event) => {
                const nextType = event.target.value as ReceiptType;

                scanVersion.current += 1;

                setScanning(false);

                clearExtractedCandidates(nextType);

                setScanResult(null);

                setReceiptType(nextType);
              }}
              className={inputCls}
              aria-label="Receipt type"
            >
              <option value="gcash">GCash</option>
              <option value="maya">Maya</option>
              <option value="bank">Bank transfer</option>
              <option value="cash">Cash receipt</option>
            </select>
            <div
              tabIndex={0}
              onDragEnter={(event) => {
                event.preventDefault();

                setReceiptDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();

                event.dataTransfer.dropEffect = "copy";
              }}
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                ) {
                  setReceiptDragging(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();

                setReceiptDragging(false);

                selectReceipt(event.dataTransfer.files[0] ?? null);
              }}
              onPaste={(event) => {
                const pasted =
                  event.clipboardData.files[0] ??
                  Array.from(event.clipboardData.items)
                    .find((item) => {
                      return item.kind === "file";
                    })
                    ?.getAsFile() ??
                  null;

                if (pasted) {
                  event.preventDefault();
                }

                selectReceipt(pasted);
              }}
              className={`receipt-dropzone rounded-2xl border-2 border-dashed px-4 py-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue/40 ${receiptDragging ? "is-dragging" : ""}`}
              aria-label="Receipt image upload area. Drop an image, paste one from the clipboard, or browse files."
            >
              <input
                ref={receiptInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  return selectReceipt(event.target.files?.[0] ?? null);
                }}
                className="sr-only"
              />
              <div className="flex items-center gap-3">
                {receiptPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      return receiptDialog.current?.showModal();
                    }}
                    className="receipt-preview-trigger shrink-0 rounded-xl"
                    aria-label="View receipt image"
                  >
                    <img
                      src={receiptPreview}
                      alt="Selected receipt preview"
                      className="receipt-preview h-24 w-20 rounded-xl object-contain"
                    />
                    <span className="receipt-preview-hint" aria-hidden="true">
                      <Eye weight="bold" />
                    </span>
                  </button>
                )}
                <div>
                  <p className="text-sm font-700 text-blue-ink">
                    {receiptImage
                      ? receiptImage.name
                      : "Drop or paste a receipt image"}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Drag it here, press Ctrl/⌘+V, or browse · JPG, PNG, WebP
                  </p>
                  <div className="receipt-upload-actions">
                    <button
                      type="button"
                      onClick={() => {
                        return receiptInput.current?.click();
                      }}
                      className="receipt-browse"
                    >
                      {receiptImage ? "Replace image" : "Browse files"}
                    </button>
                    {receiptPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          return receiptDialog.current?.showModal();
                        }}
                        className="receipt-view-button"
                      >
                        <Eye weight="bold" aria-hidden="true" /> View receipt
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={scanReceipt}
              disabled={scanning || !receiptImage}
              className="rounded-2xl bg-blue px-4 py-2 text-sm font-700 text-white disabled:opacity-50 sm:col-start-2 sm:justify-self-end"
            >
              {scanning ? "Scanning…" : "Extract text"}
            </button>
          </div>
          <p className="receipt-scan-help mt-2 text-xs">
            Scanning is temporary. When you record the claim, the selected image
            is attached as private proof. Review every extracted field first.
          </p>
          {scanning && (
            <div
              className="receipt-scan-loading mt-3"
              role="status"
              aria-live="polite"
            >
              <div className="receipt-skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div>
                <strong>Reading receipt…</strong>
                <p>
                  Looking for the payment details and the name and number shown
                  on the receipt.
                </p>
              </div>
            </div>
          )}
          {scanResult && !scanning && (
            <div
              className={`receipt-scan-result mt-3 ${scanResult.warnings.length ? "has-warning" : "is-complete"}`}
              role="status"
              aria-live="polite"
            >
              <strong>
                {scanResult.warnings.length
                  ? "Review extracted fields"
                  : "Extraction complete"}
              </strong>
              <p>
                Found {Math.round(scanResult.confidence * 100)}% of payment
                fields. Confirm all details below before recording.
              </p>
              {scanResult.warnings.map((warning) => {
                return (
                  <p key={warning} className="receipt-scan-warning">
                    {warning}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      }
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Client">
          <ClientPicker
            label="Client"
            selected={recordClient}
            required
            onSelect={(client) => {
              setRecordClient(client);

              setForm((current) => {
                return {
                  ...current,
                  client: client ? String(client.id) : "",
                };
              });
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
            onChange={(e) => {
              return setForm({ ...form, amount: e.target.value });
            }}
            className={inputCls}
            placeholder="2000.00"
          />
        </Field>
        <Field label="Payment date">
          <input
            type="date"
            required
            value={form.payment_date}
            onChange={(e) => {
              return setForm({ ...form, payment_date: e.target.value });
            }}
            className={inputCls}
          />
        </Field>
        <Field label="Method">
          <select
            value={form.method}
            onChange={(e) => {
              return setForm({ ...form, method: e.target.value });
            }}
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
            onChange={(e) => {
              return setForm({ ...form, reference_no: e.target.value });
            }}
            className={inputCls}
            placeholder="GC123"
          />
        </Field>
      </div>
      {form.reference_no.trim() && (
        <div className="payment-duplicate-area" aria-live="polite">
          {duplicateChecking && (
            <p className="payment-duplicate-checking">
              Checking for matching references…
            </p>
          )}
          {duplicateCheckError && (
            <p className="payment-duplicate-checking">
              Could not check for duplicates. Recording will retry the check.
            </p>
          )}
          {!duplicateChecking && duplicateMatches.length > 0 && (
            <div className="payment-duplicate-warning" role="alert">
              <div className="payment-duplicate-heading">
                <WarningCircle weight="fill" aria-hidden="true" />
                <strong>Possible duplicate payment</strong>
              </div>
              <p>
                This {form.method} reference matches{" "}
                {duplicateMatches.length === 1
                  ? "a recorded payment"
                  : "recorded payments"}
                . Compare the client, amount, date, and receipt before
                continuing.
              </p>
              <ul>
                {duplicateMatches.map((match) => {
                  return (
                    <li key={match.id}>
                      <span>
                        {match.clientName} · ₱{match.amount} ·{" "}
                        {match.paymentDate} ·{" "}
                        {match.status.toLowerCase().replaceAll("_", " ")}
                      </span>
                      <a
                        href={`/system/payments?payment=${match.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View payment
                      </a>
                    </li>
                  );
                })}
              </ul>
              <label className="payment-duplicate-review">
                <input
                  type="checkbox"
                  checked={reviewedDuplicates === duplicateReviewKey}
                  onChange={(event) => {
                    return setReviewedDuplicates(
                      event.target.checked ? duplicateReviewKey : null,
                    );
                  }}
                />
                <span>
                  I reviewed these matching payments and want to continue.
                </span>
              </label>
            </div>
          )}
        </div>
      )}
      {
        <div className="mt-4 rounded-2xl border border-white/40 p-3">
          <p className="mb-3 text-xs font-600 text-ink-soft">
            Details shown on the receipt. GCash may mask the name and number;
            check the image and select the client separately.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Time on receipt">
              <input
                type="text"
                value={form.receipt_time}
                maxLength={20}
                placeholder="5:42 PM"
                onChange={(e) => {
                  return setForm({
                    ...form,
                    receipt_time: e.target.value,
                  });
                }}
                className={inputCls}
              />
            </Field>
            <Field label="Name on receipt">
              <input
                type="text"
                value={form.receipt_name}
                maxLength={120}
                placeholder="Name as displayed"
                onChange={(e) => {
                  return setForm({
                    ...form,
                    receipt_name: e.target.value,
                  });
                }}
                className={inputCls}
              />
            </Field>
            <Field label="Number on receipt">
              <input
                type="text"
                value={form.receipt_phone}
                maxLength={40}
                placeholder="Number as displayed"
                onChange={(e) => {
                  return setForm({
                    ...form,
                    receipt_phone: e.target.value,
                  });
                }}
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      }

      <button
        type="submit"
        disabled={saving || scanning}
        className="btn-candy mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-700 disabled:opacity-70"
      >
        <Plus weight="bold" className="h-4 w-4" />
        {saving
          ? "Saving…"
          : editing
            ? "Save and return to pending"
            : "Record payment"}
      </button>
      {editing && (
        <button
          type="button"
          onClick={() => {
            return setEditing(null);
          }}
          className="ml-2 rounded-2xl bg-white/70 px-4 py-2.5 text-sm font-700 text-ink-soft hover:bg-white"
        >
          Cancel
        </button>
      )}
    </form>
  );
}
