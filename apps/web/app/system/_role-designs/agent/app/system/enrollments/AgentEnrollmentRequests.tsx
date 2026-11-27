"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAgentResource } from "@/lib/useAgentResource";
import EnrollmentSubmission, { type BatchChoice } from "./EnrollmentSubmission";
import AgentRequestList from "./AgentRequestList";
import AgentRequestDetail from "./AgentRequestDetail";
import type { EnrollmentPage } from "./enrollment-types";
import type { EnrollmentReceipt } from "./submission-attempt";
import { enrollmentHref } from "./enrollment-location";
import { useEnrollmentLocation } from "./useEnrollmentLocation";
import styles from "./enrollment-workspace.module.css";

export default function AgentEnrollmentRequests({
  requestId: _requestId,
}: {
  requestId?: string;
}) {
  const opener = useRef<HTMLElement | null>(null);

  const route = useEnrollmentLocation();

  const { location, navigate } = route;

  const [unconfirmed, setUnconfirmed] = useState<string | null>(null);

  const [receipt, setReceipt] = useState<EnrollmentReceipt | null>(null);

  const params = new URLSearchParams({
    page: String(location.page),
    ...(location.status ? { status: location.status } : {}),
  });

  const requests = useAgentResource<EnrollmentPage>(
    `/enrollment/requests?${params}`,
  );

  const batches = useAgentResource<BatchChoice[]>("/enrollment/batches");

  const accessLost = Boolean(requests.denied || batches.denied);

  useEffect(() => {
    if (accessLost) {
      setReceipt(null);

      setUnconfirmed(null);
    }
  }, [accessLost]);

  return (
    <div className={styles.workspace}>
      <header className={styles.heading}>
        <h2>Enrollment requests</h2>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            disabled={requests.loading}
            onClick={() => {
              void requests.refresh();
            }}
          >
            Refresh
          </button>
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              navigate({ new: "1", request: undefined });
            }}
          >
            Submit enrollment
          </button>
        </div>
      </header>
      {unconfirmed && (
        <div className={styles.notice} role="status">
          <p>
            An unconfirmed submission is kept in this workspace. Confirm its
            result before starting another request. Reference {unconfirmed}.
          </p>
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              navigate({ new: "1", request: undefined });
            }}
          >
            Resume original submission
          </button>
        </div>
      )}
      {receipt && (
        <div className={styles.notice} role="status">
          <p>
            Enrollment request saved. Reference <span>{receipt.id}</span>.{" "}
            {receipt.status === "PENDING"
              ? "Submitted for the assigned Batch Manager’s review. Open the request for the latest status."
              : `Confirmed status at response: ${receipt.status.toLowerCase()}.`}
          </p>
          <Link
            className={styles.link}
            href={enrollmentHref(location, {
              request: receipt.id,
              new: undefined,
            })}
          >
            Open saved request
          </Link>
        </div>
      )}
      <AgentRequestList
        create={() => {
          navigate({ new: "1", request: undefined });
        }}
        resource={requests}
        page={location.page}
        status={location.status}
        setStatus={(status) => {
          navigate({ status, page: 1, request: undefined });
        }}
        setPage={(page) => {
          navigate({ page, request: undefined });
        }}
        select={(request) => {
          opener.current = document.activeElement as HTMLElement;

          navigate({ request });
        }}
      />
      {location.request && (
        <AgentRequestDetail
          key={location.request}
          id={location.request}
          close={() => {
            navigate({ request: undefined }, true);

            requestAnimationFrame(() => {
              if (opener.current?.isConnected) {
                opener.current.focus();
              } else {
                document.getElementById("enrollment-request-status")?.focus();
              }
            });
          }}
          applicationHref={(application) => {
            return enrollmentHref(
              { view: "applications", page: 1, q: "", status: "" },
              { application },
            );
          }}
        />
      )}
      <EnrollmentSubmission
        accessLost={accessLost}
        onAttempt={setUnconfirmed}
        open={location.new === "1"}
        close={() => {
          navigate({ new: undefined }, true);
        }}
        batches={batches.error ? [] : (batches.data ?? [])}
        batchLoading={batches.loading}
        batchError={batches.error}
        retryBatches={batches.refresh}
        saved={(saved) => {
          setReceipt(saved);

          void requests.refresh();
        }}
      />
    </div>
  );
}
