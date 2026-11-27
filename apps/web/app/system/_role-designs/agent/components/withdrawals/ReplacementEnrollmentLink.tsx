"use client";

import Link from "next/link";
import type { WithdrawalCase } from "@freshphones/contracts";
import { useAgentResource } from "@/lib/useAgentResource";
import type { EnrollmentPage } from "../../app/system/enrollments/enrollment-types";
import styles from "./workspace.module.css";

export function ReplacementEnrollmentLink({ row }: { row: WithdrawalCase }) {
  if (!row.replacementEnrollmentId) {
    return null;
  }

  return row.actions.viewReplacementEnrollment ? (
    <AuthorizedReplacement id={row.replacementEnrollmentId} />
  ) : (
    <section className={styles.section}>
      <h3>Replacement enrollment</h3>
      <p>
        The linked request is outside your current enrollment access. Ask the
        COO or assigned Batch Manager to follow up. This withdrawal remains
        visible through your current batch assignment.
      </p>
    </section>
  );
}

function AuthorizedReplacement({ id }: { id: string }) {
  const resource = useAgentResource<EnrollmentPage>(
    `/enrollment/requests?requestId=${encodeURIComponent(id)}&page=1`,
  );

  const request = resource.error ? null : resource.data?.items[0];

  return (
    <section
      className={styles.section}
      aria-label="Replacement enrollment follow-up"
      aria-busy={resource.loading}
    >
      <h3>Replacement enrollment</h3>
      {resource.error ? (
        <div role="alert">
          <p>{resource.error}</p>
          <button
            type="button"
            onClick={() => {
              void resource.refresh();
            }}
          >
            Retry replacement enrollment
          </button>
        </div>
      ) : !resource.data ? (
        <p role="status">Checking your access to the linked enrollment…</p>
      ) : request ? (
        <>
          <p>
            {request.status === "PENDING"
              ? "Awaiting the assigned Batch Manager. A second pending proposal will not be accepted."
              : request.status === "APPROVED"
                ? "Enrollment approved. Check the current withdrawal for recorded handover."
                : `Not approved: ${request.reason || "See the Manager’s review."}`}
          </p>
          <Link
            className={styles.link}
            href={`/system/enrollments?view=requests&request=${encodeURIComponent(id)}`}
          >
            Open replacement enrollment
          </Link>
        </>
      ) : (
        <p>
          The linked enrollment is unavailable in your current access. Ask the
          COO or Batch Manager to follow up.
        </p>
      )}
    </section>
  );
}
