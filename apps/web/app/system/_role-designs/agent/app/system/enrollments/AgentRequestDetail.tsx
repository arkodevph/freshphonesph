"use client";

import { useRef } from "react";
import Link from "next/link";
import { useAgentResource } from "@/lib/useAgentResource";
import { useSpringDialog } from "@/lib/useSpringDialog";
import ModalCloseButton from "@/app/system/_role-designs/agent/components/ModalCloseButton";
import WorkspaceProgress from "@/app/system/_role-designs/agent/components/WorkspaceProgress";
import type { EnrollmentPage } from "./enrollment-types";
import styles from "./enrollment-requests.module.css";

export default function AgentRequestDetail({
  id,
  close,
  applicationHref,
}: {
  id: string;
  close: () => void;
  applicationHref: (id: string) => string;
}) {
  const resource = useAgentResource<EnrollmentPage>(
    `/enrollment/requests?requestId=${encodeURIComponent(id)}&page=1`,
  );

  const dialog = useRef<HTMLDialogElement>(null);

  const item = resource.error ? null : resource.data?.items[0];

  useSpringDialog(dialog, true);

  return (
    <dialog
      ref={dialog}
      data-workspace-modal
      data-modal-framed
      data-modal-size="wide"
      className={`${styles.dialog} ${styles.requestDetail}`}
      aria-labelledby="agent-request-title"
      aria-busy={resource.loading}
      onCancel={(event) => {
        event.preventDefault();

        close();
      }}
    >
      <header data-modal-header>
        <h2 id="agent-request-title">{item?.name ?? "Enrollment request"}</h2>
        <ModalCloseButton onClick={close} />
      </header>
      <div className={styles.detailBody}>
        {resource.loading && resource.data && (
          <p role="status">Refreshing the request status…</p>
        )}
        {resource.loading && !resource.data ? (
          <WorkspaceProgress label="Loading request details…" />
        ) : resource.error ? (
          <div role="alert">
            <p>{resource.error}</p>
            <button
              type="button"
              onClick={() => {
                void resource.refresh();
              }}
            >
              Retry request details
            </button>
          </div>
        ) : !item ? (
          <p role="status">
            This request is unavailable in your current access. Close this panel
            to return to your list.
          </p>
        ) : (
          <>
            <dl className={styles.metadata}>
              <div>
                <dt>Request reference</dt>
                <dd>{item.id}</dd>
              </div>
              <div>
                <dt>Batch</dt>
                <dd>{item.batchCode}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  {item.status === "PENDING"
                    ? "With Batch Manager"
                    : item.status === "APPROVED"
                      ? "Approved"
                      : "Rejected"}
                </dd>
              </div>
              <div>
                <dt>Submitted by</dt>
                <dd>{item.submittedBy}</dd>
              </div>
              <div>
                <dt>Reviewed by</dt>
                <dd>{item.reviewedBy ?? "Not reviewed yet"}</dd>
              </div>
              <div>
                <dt>Review reason</dt>
                <dd>{item.reason || "No review reason recorded yet."}</dd>
              </div>
            </dl>
            {item.status === "PENDING" && (
              <p>
                Submission does not reserve a position or create membership. The
                assigned Batch Manager reviews this request.
              </p>
            )}
            {item.publicApplicationId && (
              <Link
                className={styles.sourceLink}
                href={applicationHref(item.publicApplicationId)}
              >
                View original website application
              </Link>
            )}
            {item.withdrawalId && (
              <Link
                className={styles.sourceLink}
                href={`/system/withdrawals?request=${encodeURIComponent(item.withdrawalId)}`}
              >
                View withdrawal and replacement terms
              </Link>
            )}
          </>
        )}
      </div>
      <footer data-modal-footer>
        <button type="button" onClick={close}>
          Back to requests
        </button>
      </footer>
    </dialog>
  );
}
