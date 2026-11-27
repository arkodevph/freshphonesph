"use client";

import { useState } from "react";
import type { PublicEnrollmentApplication } from "@freshphones/contracts";
import { useEnrollmentDraftGuard } from "../useEnrollmentDraftGuard";
import { newApplicationCommand } from "../submission-attempt";
import styles from "../enrollment-workspace.module.css";

export default function CloseApplicationForm({
  application,
  blocked,
  pending,
  run,
}: {
  application: PublicEnrollmentApplication;
  blocked: boolean;
  pending: boolean;
  run: (
    work: () => Promise<unknown>,
    message: string,
    operation: "close",
  ) => Promise<void>;
}) {
  const [reason, setReason] = useState("");

  const [confirm, setConfirm] = useState(false);

  useEnrollmentDraftGuard(Boolean(reason));

  return (
    <section className={styles.panel} aria-labelledby="close-application-title">
      <h2 id="close-application-title">Close this application</h2>
      <p>
        Use this when the received website application should not be forwarded.
        The original submission and reason remain on record. This does not
        reject an enrollment request or change a membership.
      </p>
      <fieldset disabled={blocked} className={styles.fieldset}>
        <label className={styles.field}>
          Reason for closing
          <textarea
            minLength={3}
            maxLength={1000}
            rows={3}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);

              setConfirm(false);
            }}
          />
        </label>
        {confirm && (
          <div
            className={styles.notice}
            role="group"
            aria-label="Confirm closing application"
          >
            <p>
              Close the application from{" "}
              <strong>{application.contact.name}</strong> with this reason? It
              can no longer be forwarded.
            </p>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                setConfirm(false);
              }}
            >
              Keep reviewing
            </button>
          </div>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            disabled={blocked || reason.trim().length < 3}
            onClick={() => {
              if (!confirm) {
                setConfirm(true);

                return;
              }

              void run(
                newApplicationCommand(application.id, "close", {
                  version: application.version,
                  reason: reason.trim(),
                }),
                "Application closed. The original submission and reason are retained.",
                "close",
              );
            }}
          >
            {pending
              ? "Closing…"
              : confirm
                ? "Confirm close application"
                : "Close application"}
          </button>
        </div>
      </fieldset>
    </section>
  );
}
