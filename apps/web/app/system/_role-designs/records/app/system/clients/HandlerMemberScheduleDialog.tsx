"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import ModalCloseButton from "@/app/system/_role-designs/records/components/ModalCloseButton";
import { useSpringDialog } from "@/lib/useSpringDialog";
import type { ClientRecord } from "@/lib/api";
import { formatPeso } from "@/lib/currency";
import { useHandlerMemberSchedule } from "@/app/system/clients/useHandlerMemberSchedule";
import styles from "@/app/system/_role-designs/records/app/system/clients/handler-member-schedule.module.css";

export function HandlerMemberScheduleDialog({
  client,
  onClose,
}: {
  client: ClientRecord;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  const heading = useRef<HTMLHeadingElement>(null);

  const titleId = useId();

  const [closing, setClosing] = useState(false);

  useSpringDialog(dialog, !closing, onClose);

  function close() {
    setClosing(true);
  }

  const { items, loading, error, accessLost, load } = useHandlerMemberSchedule(
    client.id,
  );

  useEffect(() => {
    const element = dialog.current;

    heading.current?.focus();

    return () => {
      element?.close();

      requestAnimationFrame(() => {
        const row = document.querySelector(`[data-handler-row="${client.id}"]`);

        const trigger =
          row?.querySelector<HTMLElement>("button[aria-controls]") ??
          document.querySelector<HTMLElement>(
            '[data-handler-table="members"] button',
          );

        trigger?.focus();
      });
    };
  }, [client.id]);

  return (
    <dialog
      ref={dialog}
      data-handler-modal
      className={styles.dialog}
      aria-modal="true"
      aria-labelledby={titleId}
      data-handler-schedule=""
      onCancel={(event) => {
        event.preventDefault();

        close();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }

        const box = event.currentTarget.getBoundingClientRect();

        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        ) {
          close();
        }
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") {
          return;
        }

        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), [tabindex="0"]',
          ),
        );

        const first = controls[0];

        const last = controls.at(-1);

        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === heading.current)
        ) {
          event.preventDefault();

          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();

          first?.focus();
        }
      }}
    >
      <header className={styles.header}>
        <h2 ref={heading} id={titleId} tabIndex={-1}>
          Installment schedule
        </h2>
        <ModalCloseButton onClick={close} />
      </header>
      <div
        className={styles.body}
        role="region"
        aria-label="Schedule details"
        tabIndex={0}
        aria-busy={loading}
      >
        {!accessLost && (
          <section className={styles.member} aria-label="Member information">
            <h3>{client.full_name || "—"}</h3>
            <dl>
              <div>
                <dt>Batch</dt>
                <dd>{client.batch_number || "—"}</dd>
              </div>
              <div>
                <dt>Unit</dt>
                <dd>{client.unit_model || "—"}</dd>
              </div>
            </dl>
          </section>
        )}
        {loading ? (
          <p className={styles.state} role="status">
            Loading installment schedule…
          </p>
        ) : error ? (
          <div className={styles.state} role="alert">
            <strong>
              {accessLost
                ? "Schedule unavailable"
                : "Could not load the schedule"}
            </strong>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                return void load();
              }}
            >
              Try again
            </button>
          </div>
        ) : !items?.length ? (
          <div className={styles.state} role="status">
            <strong>No installment schedule yet</strong>
            <p>
              No installment schedule has been issued for this member. Ask
              Records to review the batch terms.
            </p>
          </div>
        ) : (
          <section aria-label="Scheduled installments">
            <p className={styles.count}>
              {items.length}{" "}
              {items.length === 1 ? "installment" : "installments"}
            </p>
            <ol className={styles.installments}>
              {items.map((item) => {
                return (
                  <li key={item.id} className={styles.installment}>
                    <div>
                      <h3>Installment {item.sequence_no}</h3>
                      <dl className={styles.due}>
                        <div>
                          <dt>Due date</dt>
                          <dd>{item.due_date || "—"}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className={styles.amount}>
                      <span>Expected</span>
                      <strong>{formatPeso(item.expected_amount)}</strong>
                      {Number(item.released_amount) > 0 && (
                        <small>
                          {item.original_expected_amount != null && (
                            <span>
                              Originally{" "}
                              {formatPeso(item.original_expected_amount)}
                            </span>
                          )}
                          <span>
                            Released {formatPeso(item.released_amount!)}
                          </span>
                        </small>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>
      <footer className={styles.footer}>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            return void load();
          }}
        >
          <ArrowClockwise aria-hidden="true" /> Refresh schedule
        </button>
        <button type="button" className={styles.done} onClick={close}>
          Done
        </button>
      </footer>
    </dialog>
  );
}
