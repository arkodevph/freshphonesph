"use client";

import { createPortal, flushSync } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { DownloadSimple, Printer, ArrowClockwise } from "@phosphor-icons/react";
import ModalCloseButton from "@/app/system/_role-designs/records/components/ModalCloseButton";
import { useSpringDialog } from "@/lib/useSpringDialog";
import { AccountDocumentSheet } from "@/app/system/_role-designs/records/components/AccountDocumentSheet";
import {
  getStaffAccountDocument,
  type AccountDocumentTarget,
  type AccountDocumentSnapshot,
} from "@/lib/account-documents";
import { prepareAccountDocumentPrint } from "@/lib/account-document-print";
import { downloadAccountPdf } from "@/lib/account-pdf";
import { ApiError } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import styles from "@/app/system/_role-designs/records/components/handler-account-document.module.css";

function content(snapshot: AccountDocumentSnapshot) {
  const { generatedAt, ...record } = snapshot.record;

  return JSON.stringify({ client: snapshot.client, record });
}

export function HandlerAccountDocument({
  target,
  onClose,
}: {
  target: AccountDocumentTarget;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  const [closing, setClosing] = useState(false);

  const [snapshot, setSnapshot] = useState<AccountDocumentSnapshot | null>(
    null,
  );

  const [loading, setLoading] = useState(true);

  const [action, setAction] = useState<"pdf" | "print" | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  const dialog = useRef<HTMLDialogElement>(null);

  useSpringDialog(dialog, mounted && !closing, onClose);

  function close() {
    setClosing(true);
  }

  const title = useRef<HTMLHeadingElement>(null);

  const controller = useRef<AbortController | null>(null);

  const version = useRef(0);

  const headingId = useId();

  const returnFocus = useRef<HTMLElement | null>(null);

  const name =
    target.kind === "statement"
      ? "Statement of Account"
      : "Payment Confirmation";

  const load = useCallback(
    async (requested: "pdf" | "print" | null = null) => {
      const request = ++version.current;

      controller.current?.abort();

      const abort = new AbortController();

      controller.current = abort;

      setSnapshot(null);

      setError(null);

      setActionError(null);

      setLoading(true);

      setAction(requested);

      let current: AccountDocumentSnapshot | null = null;

      try {
        current = await getStaffAccountDocument(target, abort.signal);

        if (request !== version.current || abort.signal.aborted) {
          return;
        }

        setSnapshot(current);

        setLoading(false);

        if (requested === "pdf") {
          const initial = current;

          await downloadAccountPdf(current.client, current.record, {
            signal: abort.signal,
            beforeDownload: async () => {
              const fresh = await getStaffAccountDocument(target, abort.signal);

              if (request !== version.current || abort.signal.aborted) {
                throw new DOMException("Canceled", "AbortError");
              }

              if (content(fresh) !== content(initial)) {
                setSnapshot(fresh);

                throw new Error(
                  "The document changed while preparing the PDF. Review the updated preview and download again.",
                );
              }
            },
          });
        } else if (requested === "print") {
          // Commit the fresh authoritative sheet before invoking the browser's print UI.
          flushSync(() => {
            return setSnapshot(current);
          });

          await prepareAccountDocumentPrint(
            dialog.current?.querySelector("[data-account-document-sheet]") ??
              null,
          );

          await new Promise<void>((resolve) => {
            return requestAnimationFrame(() => {
              return resolve();
            });
          });

          if (
            request !== version.current ||
            abort.signal.aborted ||
            !dialog.current?.open
          ) {
            return;
          }

          dialog.current.dataset.printReady = "true";

          window.print();

          delete dialog.current.dataset.printReady;
        }
      } catch (caught) {
        if (request !== version.current || abort.signal.aborted) {
          return;
        }

        if (
          !current ||
          (caught instanceof ApiError &&
            [401, 403, 404, 412, 428].includes(caught.status))
        ) {
          setSnapshot(null);

          setError(
            caught instanceof Error
              ? caught.message
              : "This account document is unavailable.",
          );
        } else {
          setActionError(
            caught instanceof Error
              ? caught.message
              : "Could not prepare this document. Please try again.",
          );
        }
      } finally {
        if (request === version.current) {
          setLoading(false);

          setAction(null);
        }
      }
    },
    [target.kind, target.id],
  );

  useEffect(() => {
    const active = document.activeElement as HTMLElement | null;

    const popover = active?.closest("[popover]");

    returnFocus.current = popover
      ? document.querySelector<HTMLElement>(
          `button[aria-controls="${popover.id}"]`,
        )
      : active;

    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !dialog.current) {
      return;
    }

    const overflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    title.current?.focus();

    return () => {
      ++version.current;

      controller.current?.abort();

      document.body.style.overflow = overflow;

      returnFocus.current?.isConnected && returnFocus.current.focus();
    };
  }, [mounted]);

  useEffect(() => {
    void load();

    return () => {
      ++version.current;

      controller.current?.abort();
    };
  }, [load]);

  useLiveRecords(() => {
    return void load();
  });

  useEffect(() => {
    function invalidate() {
      ++version.current;

      controller.current?.abort();

      setSnapshot(null);

      setLoading(false);

      setAction(null);

      setError("Your access changed. Close this preview and sign in again.");
    }

    function refresh() {
      void load();
    }

    function printShortcut(event: KeyboardEvent) {
      if (event.key === "Tab" && dialog.current?.open) {
        const controls = Array.from(
          dialog.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], [tabindex="0"]',
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
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();

        if (!loading && !action && snapshot) {
          void load("print");
        }
      }
    }

    window.addEventListener("focus", refresh);

    window.addEventListener("fp-session-expired", invalidate);

    window.addEventListener("fp-mfa-required", invalidate);

    window.addEventListener("fp-legal-required", invalidate);

    document.addEventListener("keydown", printShortcut);

    return () => {
      window.removeEventListener("focus", refresh);

      window.removeEventListener("fp-session-expired", invalidate);

      window.removeEventListener("fp-mfa-required", invalidate);

      window.removeEventListener("fp-legal-required", invalidate);

      document.removeEventListener("keydown", printShortcut);
    };
  }, [load, loading, action, snapshot]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <dialog
      ref={dialog}
      data-handler-modal
      className={styles.dialog}
      aria-labelledby={headingId}
      data-account-document=""
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();

        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <header className={styles.toolbar}>
        <div>
          <p>Fresh Phones PH · Account document</p>
          <h2 ref={title} id={headingId} tabIndex={-1}>
            {name}
          </h2>
        </div>
        <ModalCloseButton onClick={close} />
        <div className={styles.actions}>
          <button
            type="button"
            disabled={loading || !!action || !snapshot}
            onClick={() => {
              return void load("pdf");
            }}
          >
            <DownloadSimple aria-hidden="true" />
            {action === "pdf" ? "Preparing PDF…" : "Download PDF"}
          </button>
          <button
            type="button"
            disabled={loading || !!action || !snapshot}
            onClick={() => {
              return void load("print");
            }}
          >
            <Printer aria-hidden="true" />
            {action === "print" ? "Preparing print…" : "Print"}
          </button>
          <button
            type="button"
            disabled={loading || !!action}
            onClick={() => {
              return void load();
            }}
          >
            <ArrowClockwise aria-hidden="true" />
            Refresh
          </button>
        </div>
      </header>
      <div className={styles.body}>
        {actionError && (
          <p className={styles.message} role="alert">
            {actionError}
          </p>
        )}
        {loading ? (
          <div className={styles.message} role="status">
            Loading the current account document…
          </div>
        ) : error ? (
          <div className={styles.message} role="alert">
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
        ) : (
          snapshot && (
            <AccountDocumentSheet
              client={snapshot.client}
              record={snapshot.record}
            />
          )
        )}
      </div>
    </dialog>,
    document.body,
  );
}
