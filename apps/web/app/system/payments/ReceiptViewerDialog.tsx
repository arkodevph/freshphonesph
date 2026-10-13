"use client";

import { X } from "@phosphor-icons/react";
import type { RefObject } from "react";
import { ClientChoice } from "./payment-view";

type Props = {
  receiptDialog: RefObject<HTMLDialogElement | null>;
  receiptImage: File | null;
  receiptPreview: string | null;
  recordClient: ClientChoice | null;
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
};

export default function ReceiptViewerDialog({
  receiptDialog,
  receiptImage,
  receiptPreview,
  recordClient,
  form,
}: Props) {
  return (
    <dialog
      ref={receiptDialog}
      className="receipt-viewer"
      aria-labelledby="receipt-viewer-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          receiptDialog.current?.close();
        }
      }}
    >
      <div className="receipt-viewer-shell">
        <header className="receipt-viewer-heading">
          <div>
            <h2 id="receipt-viewer-title">Receipt image</h2>
            <p>{receiptImage?.name}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              return receiptDialog.current?.close();
            }}
            aria-label="Close receipt image"
          >
            <X weight="bold" />
          </button>
        </header>
        <div className="receipt-viewer-body">
          <div className="receipt-viewer-image-wrap">
            {receiptPreview && (
              <img
                src={receiptPreview}
                alt="Uploaded receipt at readable size"
              />
            )}
          </div>
          <aside
            className="receipt-viewer-fields"
            aria-label="Payment form values"
          >
            <h3>Payment form values</h3>
            <p>
              Compare these details with the image. Close the viewer to edit a
              field.
            </p>
            <dl>
              <div>
                <dt>Client</dt>
                <dd>{recordClient?.full_name || "Not selected"}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{form.amount ? `₱${form.amount}` : "Not entered"}</dd>
              </div>
              <div>
                <dt>Payment date</dt>
                <dd>{form.payment_date || "Not entered"}</dd>
              </div>
              <div>
                <dt>Method</dt>
                <dd>{form.method || "Not entered"}</dd>
              </div>
              <div>
                <dt>Reference #</dt>
                <dd>{form.reference_no || "Not entered"}</dd>
              </div>
              <div>
                <dt>Time on receipt</dt>
                <dd>{form.receipt_time || "Not entered"}</dd>
              </div>
              <div>
                <dt>Name on receipt</dt>
                <dd>{form.receipt_name || "Not entered"}</dd>
              </div>
              <div>
                <dt>Number on receipt</dt>
                <dd>{form.receipt_phone || "Not entered"}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </dialog>
  );
}
