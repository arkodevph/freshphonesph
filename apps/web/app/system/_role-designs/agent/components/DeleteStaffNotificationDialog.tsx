"use client";

import { useEffect, useId, useRef, useState } from "react";
import ModalCloseButton from "@/app/system/_role-designs/agent/components/ModalCloseButton";
import { useSpringDialog } from "@/lib/useSpringDialog";
import type { StaffAlert } from "@/lib/api";
import styles from "@/app/system/_role-designs/agent/components/staff-alerts.module.css";

export function DeleteStaffNotificationDialog({
  alert,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  alert: StaffAlert;
  busy: boolean;
  error: string | null;
  onConfirm: (alert: StaffAlert) => Promise<boolean>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  const cancel = useRef<HTMLButtonElement>(null);

  const submitting = useRef(false);

  const [attempted, setAttempted] = useState(false);

  const [pending, setPending] = useState(false);

  const id = useId();

  const locked = busy || pending;

  const [closing, setClosing] = useState(false);

  useSpringDialog(dialog, !closing, onClose);

  function close() {
    if (!locked) {
      setClosing(true);
    }
  }

  useEffect(() => {
    const element = dialog.current;

    const trigger = document.activeElement as HTMLElement | null;

    cancel.current?.focus();

    return () => {
      element?.close();

      requestAnimationFrame(() => {
        const original = document.querySelector<HTMLElement>(
          `[data-delete-id="${alert.inboxId}"]`,
        );

        const next =
          original ??
          (trigger?.isConnected ? trigger : null) ??
          document.querySelector<HTMLElement>(
            '[aria-label="Notification inbox"] [data-delete-id]',
          ) ??
          document.getElementById("notifications-page-title");

        next?.focus();
      });
    };
  }, [alert.inboxId]);

  async function confirm() {
    if (locked || submitting.current) {
      return;
    }

    submitting.current = true;

    setAttempted(true);

    setPending(true);

    try {
      if (await onConfirm(alert)) {
        close();
      }
    } finally {
      submitting.current = false;

      setPending(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      data-handler-modal
      className={styles.deleteDialog}
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      aria-busy={pending}
      onCancel={(event) => {
        event.preventDefault();

        if (!locked) {
          close();
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || locked) {
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
      onKeyDown={(event) => {
        if (event.key !== "Tab") {
          return;
        }

        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ),
        );

        const first = controls[0];

        const last = controls.at(-1);

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();

          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();

          first?.focus();
        }
      }}
    >
      <header className={styles.deleteDialogHeading}>
        <h2 id={`${id}-title`}>Delete notification?</h2>
        <ModalCloseButton disabled={locked} onClick={close} />
      </header>
      <p id={`${id}-description`}>
        This removes it from your inbox. The linked record will stay.
      </p>
      <div className={styles.deletePreview}>
        <strong>{alert.title}</strong>
        <p>
          {alert.message.replace(
            / · Open for (Finance's decision and notes|the saved review note and current payment status)$/,
            "",
          )}
        </p>
      </div>
      {attempted && !pending && error && (
        <p className={styles.dialogError} role="alert">
          {error}
        </p>
      )}
      <div className={styles.deleteDialogActions}>
        <button ref={cancel} type="button" disabled={locked} onClick={close}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.confirmDelete}
          disabled={locked}
          onClick={() => {
            return void confirm();
          }}
        >
          {pending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </dialog>
  );
}
