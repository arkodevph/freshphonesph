"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { formatPeso } from "@/lib/currency";
import {
  acceptsReceipt,
  type HandlerReceiptFlow,
} from "./useHandlerReceiptFlow";
import styles from "./handler-receipt.module.css";

function ReceiptDialog({
  title,
  paymentId,
  busy = false,
  onClose,
  children,
}: {
  title: string;
  paymentId?: string;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  const id = useId();

  useEffect(() => {
    const element = dialog.current;

    const previous = document.activeElement as HTMLElement | null;

    element?.showModal();

    element?.querySelector<HTMLButtonElement>("[data-initial-focus]")?.focus();

    return () => {
      element?.close();

      requestAnimationFrame(() => {
        const card = Array.from(
          document.querySelectorAll<HTMLButtonElement>(
            "[data-payment-proof-trigger]",
          ),
        ).find((button) => {
          return button.dataset.paymentProofTrigger === paymentId;
        });

        const row = paymentId
          ? document.querySelector<HTMLButtonElement>(
              `[data-handler-row="${CSS.escape(paymentId)}"] button[aria-controls]`,
            )
          : null;

        const submit = document.querySelector<HTMLButtonElement>(
          '#record-payment button[type="submit"]:not(:disabled)',
        );

        (
          card ??
          row ??
          (previous?.isConnected && !previous.matches(":disabled")
            ? previous
            : null) ??
          submit ??
          document.getElementById("record-payment-title")
        )?.focus();
      });
    };
  }, [paymentId]);

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={`${id}-title`}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();

        if (!busy) {
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || busy) {
          return;
        }

        const bounds = event.currentTarget.getBoundingClientRect();

        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        ) {
          onClose();
        }
      }}
    >
      <header className={styles.heading}>
        <h2 id={`${id}-title`}>{title}</h2>
        <button
          type="button"
          aria-label={`Close ${title.toLowerCase()}`}
          disabled={busy}
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </header>
      {children}
    </dialog>
  );
}

export function HandlerReceiptDialogs({ flow }: { flow: HandlerReceiptFlow }) {
  return (
    <>
      {flow.confirmation && (
        <ReceiptDialog
          title={
            flow.confirmation.editing
              ? "Save without a receipt?"
              : "Record without a receipt?"
          }
          onClose={() => {
            flow.answer(false);
          }}
        >
          <div className={styles.body}>
            <p>
              The payment will stay pending. Attach proof later before Records
              and Finance can approve it. It will not change the client’s
              balance.
            </p>
            <dl className={styles.summary}>
              <div>
                <dt>Client</dt>
                <dd>{flow.confirmation.client}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd className={styles.amount}>
                  {formatPeso(flow.confirmation.amount)}
                </dd>
              </div>
              <div>
                <dt>Payment date</dt>
                <dd>{flow.confirmation.date}</dd>
              </div>
              <div>
                <dt>Method</dt>
                <dd>{flow.confirmation.method}</dd>
              </div>
              {flow.confirmation.reference && (
                <div className={styles.wide}>
                  <dt>Reference</dt>
                  <dd>{flow.confirmation.reference}</dd>
                </div>
              )}
            </dl>
          </div>
          <footer className={styles.actions}>
            <button
              type="button"
              data-initial-focus
              onClick={() => {
                flow.answer(false);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.primary}
              onClick={() => {
                flow.answer(true);
              }}
            >
              {flow.confirmation.editing
                ? "Save without proof"
                : "Record without proof"}
            </button>
          </footer>
        </ReceiptDialog>
      )}
      {flow.open && (
        <ReceiptDialog
          title="Attach receipt proof"
          paymentId={flow.target ? String(flow.target.id) : undefined}
          busy={flow.busy}
          onClose={flow.close}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();

              void flow.upload();
            }}
          >
            <div className={styles.body}>
              {flow.target && (
                <>
                  <p>
                    This payment is already recorded. Attach its receipt here to
                    continue the review.
                  </p>
                  <dl className={styles.summary}>
                    <div>
                      <dt>Client</dt>
                      <dd>{flow.target.client_name || "Selected client"}</dd>
                    </div>
                    <div>
                      <dt>Amount</dt>
                      <dd className={styles.amount}>
                        {formatPeso(flow.target.amount)}
                      </dd>
                    </div>
                    <div className={styles.wide}>
                      <dt>Payment</dt>
                      <dd>{flow.target.id}</dd>
                    </div>
                  </dl>
                  {acceptsReceipt(flow.target) && (
                    <label className={styles.file}>
                      Receipt image
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={flow.busy}
                        onChange={(event) => {
                          flow.selectFile(event.target.files?.[0] ?? null);

                          event.target.value = "";
                        }}
                      />
                      <small>
                        JPG, PNG or WebP · up to 5 MB. Scanning is optional.
                      </small>
                    </label>
                  )}
                  {flow.file && (
                    <div className={styles.preview}>
                      {flow.preview && (
                        <img
                          src={flow.preview}
                          alt="Receipt selected for this payment"
                        />
                      )}
                      <span>{flow.file.name}</span>
                    </div>
                  )}
                </>
              )}
              {flow.error && (
                <p role="alert" className={styles.error}>
                  {flow.error}
                </p>
              )}
              {flow.busy && <p role="status">Attaching receipt…</p>}
            </div>
            <footer className={styles.actions}>
              <button
                type="button"
                data-initial-focus
                disabled={flow.busy}
                onClick={flow.close}
              >
                {flow.target ? "Cancel" : "Close"}
              </button>
              {flow.target && acceptsReceipt(flow.target) && (
                <button
                  type="submit"
                  className={styles.primary}
                  disabled={!flow.file || flow.busy}
                >
                  {flow.busy
                    ? "Attaching…"
                    : flow.error && flow.file
                      ? "Retry upload"
                      : "Attach proof"}
                </button>
              )}
            </footer>
          </form>
        </ReceiptDialog>
      )}
    </>
  );
}

export function PaymentReceiptNotice({ flow }: { flow: HandlerReceiptFlow }) {
  if (!flow.result) {
    return null;
  }

  const { payment, error } = flow.result;

  return (
    <section className={styles.notice} aria-label="Recorded payment receipt">
      <div role="status">
        <strong>
          {error
            ? "Payment recorded · receipt upload needs attention"
            : "Payment recorded · receipt not attached"}
        </strong>
        <p>
          {payment.client_name || "Selected client"} ·{" "}
          {formatPeso(payment.amount)} · {payment.payment_date}
        </p>
        <p>
          {error
            ? "Retry attaching the receipt to this payment."
            : "Attach proof when available. The payment stays pending and does not change the balance."}
        </p>
      </div>
      <div className={styles.noticeActions}>
        <button
          type="button"
          className={styles.primary}
          data-payment-proof-trigger={String(payment.id)}
          onClick={() => {
            flow.attach(payment, flow.result?.file, flow.result?.error);
          }}
        >
          {error && flow.result.file ? "Retry proof upload" : "Attach proof"}
        </button>
        <button type="button" onClick={flow.dismissResult}>
          Dismiss
        </button>
      </div>
    </section>
  );
}
