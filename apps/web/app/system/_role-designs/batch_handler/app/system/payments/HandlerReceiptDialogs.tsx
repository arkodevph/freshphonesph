"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import ModalCloseButton from "@/app/system/_role-designs/batch_handler/components/ModalCloseButton";
import { useSpringDialog } from "@/lib/useSpringDialog";
import { formatPeso } from "@/lib/currency";
import {
  acceptsReceipt,
  type HandlerReceiptFlow,
} from "@/app/system/payments/useHandlerReceiptFlow";
import styles from "@/app/system/_role-designs/batch_handler/app/system/payments/handler-receipt.module.css";

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
  children: (close: () => void) => ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  const id = useId();

  const [closing, setClosing] = useState(false);

  useSpringDialog(dialog, !closing, onClose);

  function close() {
    if (!busy) {
      setClosing(true);
    }
  }

  useEffect(() => {
    const element = dialog.current;

    const previous = document.activeElement as HTMLElement | null;

    element?.querySelector<HTMLButtonElement>("[data-initial-focus]")?.focus();

    return () => {
      element?.close();

      requestAnimationFrame(() => {
        const card = Array.from(
          document.querySelectorAll<HTMLButtonElement>(
            "[data-payment-proof-trigger]",
          ),
        ).find((button) => {
          return (
            button.dataset.paymentProofTrigger === paymentId &&
            button.getClientRects().length > 0
          );
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
          (previous?.isConnected &&
          !element?.contains(previous) &&
          !previous.matches(":disabled")
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
      data-handler-modal
      className={styles.dialog}
      aria-labelledby={`${id}-title`}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();

        if (!busy) {
          close();
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
          close();
        }
      }}
    >
      <header className={styles.heading}>
        <h2 id={`${id}-title`}>{title}</h2>
        <ModalCloseButton disabled={busy} onClick={close} />
      </header>
      {children(close)}
    </dialog>
  );
}

export function HandlerReceiptDialogs({ flow }: { flow: HandlerReceiptFlow }) {
  const confirmation = flow.confirmation;

  return (
    <>
      {confirmation && (
        <ReceiptDialog
          title={
            confirmation.editing
              ? "Save without a receipt?"
              : "Record without a receipt?"
          }
          onClose={() => {
            flow.answer(false);
          }}
        >
          {(close) => (
            <>
              <div className={styles.body}>
                <p>
                  The payment will stay pending. Attach proof later before
                  Records and Finance can approve it. It will not change the
                  client’s balance.
                </p>
                <dl className={styles.summary}>
                  <div>
                    <dt>Client</dt>
                    <dd>{confirmation.client}</dd>
                  </div>
                  <div>
                    <dt>Amount</dt>
                    <dd className={styles.amount}>
                      {formatPeso(confirmation.amount)}
                    </dd>
                  </div>
                  <div>
                    <dt>Payment date</dt>
                    <dd>{confirmation.date}</dd>
                  </div>
                  <div>
                    <dt>Method</dt>
                    <dd>{confirmation.method}</dd>
                  </div>
                  {confirmation.reference && (
                    <div className={styles.wide}>
                      <dt>Reference</dt>
                      <dd>{confirmation.reference}</dd>
                    </div>
                  )}
                </dl>
              </div>
              <footer className={styles.actions}>
                <button type="button" data-initial-focus onClick={close}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={() => {
                    flow.answer(true);
                  }}
                >
                  {confirmation.editing
                    ? "Save without proof"
                    : "Record without proof"}
                </button>
              </footer>
            </>
          )}
        </ReceiptDialog>
      )}
      {flow.open && (
        <ReceiptDialog
          title="Attach receipt proof"
          paymentId={flow.target ? String(flow.target.id) : undefined}
          busy={flow.busy}
          onClose={flow.close}
        >
          {(close) => (
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
                      This payment is already recorded. Attach its receipt here
                      to continue the review.
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
                  onClick={close}
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
          )}
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
