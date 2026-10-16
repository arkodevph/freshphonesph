"use client";

import * as api from "@/lib/retention";
import {
  retentionScopeLabels,
  type RetentionPreview,
  type RetentionRequest,
} from "@freshphones/contracts";
import type { Dispatch, SetStateAction } from "react";
import styles from "./retention.module.css";
import { date } from "./retention-view";

type Props = {
  selectedRequest: RetentionRequest;
  requestPreview: RetentionPreview | null;
  reason: string;
  setReason: Dispatch<SetStateAction<string>>;
  busy: boolean;
  run: (action: () => Promise<unknown>, success: string) => Promise<void>;
  setSelectedRequest: Dispatch<SetStateAction<RetentionRequest | null>>;
  confirmation: string;
  setConfirmation: Dispatch<SetStateAction<string>>;
};

export default function RetentionCandidatesPanel({
  selectedRequest,
  requestPreview,
  reason,
  setReason,
  busy,
  run,
  setSelectedRequest,
  confirmation,
  setConfirmation,
}: Props) {
  return (
    <section className={styles.card}>
      <h3>Deletion request · {selectedRequest.status.replaceAll("_", " ")}</h3>
      <p className={styles.identifier}>{selectedRequest.subjectId}</p>
      {requestPreview &&
        ["PENDING", "APPROVED"].includes(selectedRequest.status) && (
          <div className={styles.notice}>
            <strong>{requestPreview.label}</strong>
            <p>{requestPreview.impact.operation}</p>
            <p>
              {requestPreview.impact.files} private files · eligible from{" "}
              {date(requestPreview.eligibleAt)}
            </p>
            <ul>
              {requestPreview.impact.retained.map((item) => {
                return <li key={item}>{item}</li>;
              })}
            </ul>
            {requestPreview.blockers.length > 0 && (
              <>
                <strong>Current blockers</strong>
                <ul>
                  {requestPreview.blockers.map((item) => {
                    return <li key={item}>{item}</li>;
                  })}
                </ul>
              </>
            )}
          </div>
        )}
      <p>
        <strong>Request reason:</strong> {selectedRequest.reason}
      </p>
      <p>
        <strong>Policy:</strong> {retentionScopeLabels[selectedRequest.scope]},
        revision {selectedRequest.policy.version}, {selectedRequest.policy.days}{" "}
        days.
      </p>
      <p>
        <strong>Backups:</strong> {selectedRequest.policy.backupInstructions}
      </p>
      <p>
        <strong>External copies:</strong>{" "}
        {selectedRequest.policy.externalCopyInstructions}
      </p>
      {selectedRequest.decidedAt && (
        <p>
          {selectedRequest.decidedBy?.name} · {date(selectedRequest.decidedAt)}{" "}
          · {selectedRequest.decisionReason}
        </p>
      )}
      {["PENDING", "APPROVED"].includes(selectedRequest.status) && (
        <>
          <label>
            Decision reason
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
            {selectedRequest.status === "PENDING" && (
              <button
                disabled={busy || reason.trim().length < 5}
                onClick={() => {
                  return run(async () => {
                    setSelectedRequest(
                      await api.decideRetentionDeletion(
                        selectedRequest,
                        true,
                        reason,
                      ),
                    );

                    setReason("");
                  }, "Deletion approved. Review the record ID before execution.");
                }}
              >
                Approve deletion
              </button>
            )}
            <button
              disabled={busy || reason.trim().length < 5}
              onClick={() => {
                return run(async () => {
                  setSelectedRequest(
                    await api.decideRetentionDeletion(
                      selectedRequest,
                      false,
                      reason,
                    ),
                  );

                  setReason("");
                }, "Deletion rejected. Records were retained.");
              }}
            >
              Reject request
            </button>
          </div>
        </>
      )}
      {selectedRequest.status === "APPROVED" && (
        <form
          className={styles.danger}
          onSubmit={(event) => {
            event.preventDefault();

            void run(async () => {
              const result = await api.executeRetentionDeletion(
                selectedRequest,
                confirmation,
              );

              setSelectedRequest(result);

              setConfirmation("");
            }, "Application erasure executed. Check file progress and complete the policy’s backup and external copy follow up.");
          }}
        >
          <h4>Execute irreversible erasure</h4>
          <p>
            The server checks the record, policy and holds again before erasing.
            Type the complete record ID shown above.
          </p>
          <label>
            Confirm record ID
            <input
              autoComplete="off"
              value={confirmation}
              onChange={(event) => {
                return setConfirmation(event.target.value);
              }}
            />
          </label>
          <button disabled={busy || confirmation !== selectedRequest.subjectId}>
            Erase approved record
          </button>
        </form>
      )}
      {selectedRequest.files.map((file) => {
        return (
          <p key={file.id}>
            {file.status} · {file.attempts} attempt
            {file.attempts === 1 ? "" : "s"}
            {file.error && ` · ${file.error}`}
          </p>
        );
      })}
      {selectedRequest.status === "FILES_PENDING" && (
        <>
          <p>
            Private copies are awaiting removal. Progress updates automatically.
          </p>
          {selectedRequest.files.some((file) => {
            return file.status === "FAILED";
          }) && (
            <button
              disabled={busy}
              onClick={() => {
                return run(async () => {
                  setSelectedRequest(
                    await api.retryRetentionFiles(selectedRequest.id),
                  );
                }, "File retry requested. Check each copy’s status.");
              }}
            >
              Retry failed file deletion
            </button>
          )}
        </>
      )}
      {selectedRequest.status === "COMPLETED" && (
        <>
          <p className={styles.success}>
            Application erasure completed {date(selectedRequest.completedAt)}.
          </p>
          {selectedRequest.followupAt ? (
            <p>
              Backup and external copy follow up confirmed by{" "}
              {selectedRequest.followupBy?.name} on{" "}
              {date(selectedRequest.followupAt)} ·{" "}
              {selectedRequest.followupReference}
            </p>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();

                void run(async () => {
                  setSelectedRequest(
                    await api.confirmRetentionFollowup(selectedRequest, reason),
                  );

                  setReason("");
                }, "Backup and external copy follow up recorded.");
              }}
            >
              <p>
                Follow the approved policy for backups, providers and exported
                copies. Record the case or evidence reference after that work is
                complete.
              </p>
              <label>
                Follow up evidence reference
                <input
                  required
                  minLength={5}
                  maxLength={1000}
                  value={reason}
                  onChange={(event) => {
                    return setReason(event.target.value);
                  }}
                />
              </label>
              <button disabled={busy}>
                Confirm policy follow up completed
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
