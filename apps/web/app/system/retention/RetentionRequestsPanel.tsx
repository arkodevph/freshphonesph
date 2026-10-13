"use client";

import * as api from "@/lib/retention";
import { type RetentionPreview } from "@freshphones/contracts";
import type { Dispatch, SetStateAction } from "react";
import styles from "./retention.module.css";

type Props = {
  preview: RetentionPreview;
  reason: string;
  setReason: Dispatch<SetStateAction<string>>;
  busy: boolean;
  run: (action: () => Promise<unknown>, success: string) => Promise<void>;
  setPreview: Dispatch<SetStateAction<RetentionPreview | null>>;
  setTab: Dispatch<
    SetStateAction<"records" | "policies" | "requests" | "holds">
  >;
  setRequestPage: Dispatch<SetStateAction<number>>;
};

export default function RetentionRequestsPanel({
  preview,
  reason,
  setReason,
  busy,
  run,
  setPreview,
  setTab,
  setRequestPage,
}: Props) {
  return (
    <section className={styles.card}>
      <h3>Preview: {preview.label}</h3>
      <p className={styles.identifier}>{preview.subjectId}</p>
      <p>{preview.impact.operation}</p>
      <p>
        {preview.impact.files} private files (
        {(preview.impact.privateBytes / 1024).toFixed(1)} KB). Linked
        notification, audit and saved email details are also cleaned up.
      </p>
      <h4>Retained records and follow up</h4>
      <ul>
        {preview.impact.retained.map((item) => {
          return <li key={item}>{item}</li>;
        })}
      </ul>
      {preview.policy && (
        <>
          <p>
            <strong>Policy:</strong> {preview.policy.days} days · revision{" "}
            {preview.policy.version}
          </p>
          <p>
            <strong>Backup handling:</strong>{" "}
            {preview.policy.backupInstructions}
          </p>
          <p>
            <strong>External copies:</strong>{" "}
            {preview.policy.externalCopyInstructions}
          </p>
        </>
      )}
      {preview.blockers.length > 0 && (
        <div className={styles.notice}>
          <strong>Deletion is blocked</strong>
          <ul>
            {preview.blockers.map((item) => {
              return <li key={item}>{item}</li>;
            })}
          </ul>
        </div>
      )}
      <label>
        Request or hold reason
        <textarea
          minLength={5}
          maxLength={1000}
          value={reason}
          onChange={(event) => {
            return setReason(event.target.value);
          }}
        />
      </label>
      <div className={styles.actions}>
        <button
          disabled={
            busy || reason.trim().length < 5 || preview.blockers.length > 0
          }
          onClick={() => {
            return run(async () => {
              await api.requestRetentionDeletion(preview, reason);

              setPreview(null);

              setReason("");

              setTab("requests");

              setRequestPage(1);
            }, "Deletion requested. No records have been erased.");
          }}
        >
          Request deletion
        </button>
        <button
          disabled={busy || reason.trim().length < 5}
          onClick={() => {
            return run(async () => {
              await api.placeRetentionHold(preview, reason);

              setPreview(
                await api.retentionPreview(preview.scope, preview.subjectId),
              );

              setReason("");
            }, "Hold placed. Deletion is blocked.");
          }}
        >
          Place legal hold
        </button>
        <button
          disabled={busy}
          onClick={() => {
            return setPreview(null);
          }}
        >
          Close preview
        </button>
      </div>
    </section>
  );
}
