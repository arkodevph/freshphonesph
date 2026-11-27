"use client";

import WorkspaceNativeSelect from "@/app/system/_role-designs/agent/components/WorkspaceNativeSelect";
import WorkspaceProgress from "@/app/system/_role-designs/agent/components/WorkspaceProgress";
import type { AgentResource } from "@/lib/useAgentResource";
import type { EnrollmentPage } from "./enrollment-types";
import styles from "./enrollment-requests.module.css";

export default function AgentRequestList({
  resource,
  page,
  status,
  setStatus,
  setPage,
  select,
  create,
}: {
  resource: AgentResource<EnrollmentPage>;
  page: number;
  status: string;
  setStatus: (status: string) => void;
  setPage: (page: number) => void;
  select: (id: string) => void;
  create: () => void;
}) {
  const data = resource.error ? null : resource.data;

  const pages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : null;

  return (
    <section
      className={styles.directory}
      aria-label="Enrollment requests"
      aria-busy={resource.loading}
    >
      <div className={styles.toolbar}>
        <label className={styles.filter}>
          Request status
          <WorkspaceNativeSelect
            id="enrollment-request-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
            }}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </WorkspaceNativeSelect>
        </label>
        <span className={styles.total} role="status">
          {resource.error
            ? "Request count unavailable"
            : resource.loading || !data
              ? "Loading request count…"
              : `${data.total} ${data.total === 1 ? "request" : "requests"}`}
        </span>
      </div>
      {resource.loading && data && (
        <p role="status">Refreshing requests. These rows may have changed.</p>
      )}
      {resource.error ? (
        <div role="alert">
          <p>{resource.error}</p>
          <button
            type="button"
            onClick={() => {
              void resource.refresh();
            }}
          >
            Retry enrollment requests
          </button>
        </div>
      ) : !data ? (
        <WorkspaceProgress label="Loading enrollment requests…" />
      ) : !data.items.length ? (
        <div className={styles.empty}>
          <p>No enrollment requests match this view.</p>
          {status && (
            <button
              type="button"
              onClick={() => {
                setStatus("");
              }}
            >
              Show all statuses
            </button>
          )}
          {!status && (
            <button
              type="button"
              onClick={() => {
                if (page > 1) {
                  setPage(1);
                } else {
                  create();
                }
              }}
            >
              {page > 1 ? "Check the first page" : "Submit enrollment"}
            </button>
          )}
        </div>
      ) : (
        <div
          className={styles.tableWrap}
          role="region"
          aria-label="Enrollment request list"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Batch</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Request details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                return (
                  <tr key={item.id}>
                    <th scope="row">
                      <div className={styles.identity}>
                        <span className={styles.avatar} aria-hidden="true">
                          {item.name.slice(0, 1)}
                        </span>
                        <span className={styles.member}>
                          <strong>{item.name}</strong>
                          <small>
                            {item.withdrawalId
                              ? "Replacement request"
                              : "Enrollment request"}
                          </small>
                        </span>
                      </div>
                    </th>
                    <td data-label="Batch">{item.batchCode}</td>
                    <td data-label="Status">
                      <span className={styles.status} data-status={item.status}>
                        {item.status === "PENDING"
                          ? "With Batch Manager"
                          : item.status === "APPROVED"
                            ? "Approved"
                            : "Rejected"}
                      </span>
                    </td>
                    <td data-label="Request">
                      <button
                        type="button"
                        className={styles.detailButton}
                        aria-label={`View enrollment for ${item.name}`}
                        onClick={() => {
                          select(item.id);
                        }}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {pages !== null && (pages > 1 || page > 1) && (
        <nav
          className={styles.pagination}
          aria-label="Enrollment request pages"
        >
          <span>
            Page {page} of {pages}
          </span>
          <button
            type="button"
            disabled={resource.loading || page <= 1}
            onClick={() => {
              setPage(page - 1);
            }}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={resource.loading || page >= pages}
            onClick={() => {
              setPage(page + 1);
            }}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
