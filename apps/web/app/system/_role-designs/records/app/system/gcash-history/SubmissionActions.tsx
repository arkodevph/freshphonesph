"use client";

import ModalCloseButton from "@/app/system/_role-designs/records/components/ModalCloseButton";
import WorkspaceDetails from "@/app/system/_role-designs/records/components/WorkspaceDetails";
import { useEffect, useRef, useState } from "react";
import type { GcashHistory } from "@freshphones/contracts";
import { archiveGcashHistory } from "@/lib/gcash-history";
import styles from "@/app/system/_role-designs/records/app/system/gcash-history/workspace.module.css";

export function SubmissionActions({
  row,
  changed,
  requestArchive,
}: {
  row: GcashHistory;
  changed: (row: GcashHistory) => void;
  requestArchive?: () => void;
}) {
  const [confirm, setConfirm] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <WorkspaceDetails
        className={styles.more}
        open={menuOpen}
        onExpandedChange={setMenuOpen}
      >
        <summary
          aria-label={`More actions for ${row.batch.code}`}
          title="More actions"
        >
          •••
        </summary>
        <div className={styles.menu}>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);

              if (requestArchive) {
                requestArchive();
              } else {
                setConfirm(true);
              }
            }}
          >
            {row.archivedAt ? "Restore submission" : "Archive submission"}
          </button>
        </div>
      </WorkspaceDetails>
      {confirm && (
        <ArchiveConfirmation
          key={`${row.id}-${row.version}`}
          row={row}
          changed={changed}
          close={() => {
            setConfirm(false);
          }}
        />
      )}
    </>
  );
}

export function ArchiveConfirmation({
  row,
  changed,
  close,
}: {
  row: GcashHistory;
  changed: (row: GcashHistory) => void;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  const [reason, setReason] = useState("");

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const pending = useRef(false);

  useEffect(() => {
    const element = dialog.current;

    element?.showModal();

    return () => {
      element?.close();
    };
  }, []);

  return (
    <dialog
      data-workspace-modal
      data-modal-size="small"
      ref={dialog}
      className={styles.confirm}
      aria-labelledby="archive-title"
      onCancel={(event) => {
        if (pending.current) {
          event.preventDefault();
        } else {
          close();
        }
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();

          if (pending.current) {
            return;
          }

          pending.current = true;

          setSaving(true);

          setError("");

          void archiveGcashHistory(row.id, {
            version: row.version,
            reason,
            archived: !row.archivedAt,
          })
            .then((saved) => {
              changed(saved);

              close();
            })
            .catch((failure: unknown) => {
              setError(
                failure instanceof Error
                  ? failure.message
                  : "Could not update the archive.",
              );
            })
            .finally(() => {
              pending.current = false;

              setSaving(false);
            });
        }}
      >
        <header data-modal-header>
          <h2 id="archive-title">
            {row.archivedAt ? "Restore submission?" : "Archive submission?"}
          </h2>
          <ModalCloseButton onClick={close} disabled={saving} />
        </header>
        <p>
          <strong>{row.batch.code}</strong> · {row.periodStart} to{" "}
          {row.periodEnd} · all {row.revision} PDF{" "}
          {row.revision === 1 ? "revision" : "revisions"}
        </p>
        <p>
          {row.archivedAt
            ? "Return this period to the active queue with its existing review status."
            : "Remove this period from the active queue. Original PDFs, transactions, corrections and reviews remain available in Archived. Records can restore it later."}
        </p>
        <label>
          {row.archivedAt ? "Reason for restoring" : "Reason for archiving"}
          <textarea
            aria-label={
              row.archivedAt ? "Reason for restoring" : "Reason for archiving"
            }
            required
            autoFocus
            maxLength={1000}
            disabled={saving}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
            }}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <div className={styles.toolbar}>
          <button
            type="submit"
            data-variant="primary"
            className={styles.primary}
            disabled={saving || !reason.trim()}
          >
            {saving
              ? "Saving…"
              : row.archivedAt
                ? "Restore submission"
                : "Archive submission"}
          </button>
          <button type="button" onClick={close} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}
