"use client";

import WorkspaceProgress, {
  TableSkeletonRows,
} from "@/app/system/_role-designs/operations_coordinator/components/WorkspaceProgress";
import WorkspaceDetails from "@/app/system/_role-designs/operations_coordinator/components/WorkspaceDetails";
import WorkspaceNativeSelect from "@/app/system/_role-designs/operations_coordinator/components/WorkspaceNativeSelect";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  monitorTabs,
  monitorReasons,
  waitingAge,
  timestamp,
} from "@/app/system/_role-designs/operations_coordinator/app/system/operations-monitor/monitor-view";
import { useOperationsMonitor } from "@/app/system/operations-monitor/useOperationsMonitor";
import MonitorFollowUp from "@/app/system/_role-designs/operations_coordinator/app/system/operations-monitor/MonitorFollowUp";
import styles from "@/app/system/_role-designs/operations_coordinator/app/system/operations-monitor/monitor.module.css";

export default function OperationsMonitor() {
  const work = useOperationsMonitor();

  const params = new URLSearchParams(work.query);

  const [search, setSearch] = useState(params.get("q") ?? "");

  const appliedQuery = params.get("q") ?? "";

  useEffect(() => {
    setSearch(appliedQuery);
  }, [appliedQuery]);

  if (!work.me) {
    return (
      <section className={styles.page} role="status" aria-busy="true">
        <p>Checking workspace access…</p>
      </section>
    );
  }

  if (work.me && !work.enabled) {
    return (
      <section className={styles.page}>
        <h1>No access</h1>
        <p>Your role does not have operations monitoring access.</p>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Operations / Monitoring</p>
          <h1>Operations monitoring</h1>
          <p>Find what is waiting, who owns it, and what needs a follow-up.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void work.refresh();
          }}
          disabled={work.loading}
        >
          Refresh queue
        </button>
      </header>
      <div className={styles.policy}>
        <p>
          Reviews are overdue after{" "}
          <strong>{work.data?.policy.reviewDueHours ?? 24} hours</strong> in
          their current review stage.
        </p>
        {work.me?.role === "coo" && (
          <WorkspaceDetails>
            <summary>Change review rule</summary>
            <form
              onSubmit={(event) => {
                event.preventDefault();

                void work.updatePolicy();
              }}
            >
              <label>
                Review deadline (hours)
                <input
                  type="number"
                  min={1}
                  max={8760}
                  required
                  value={work.reviewHours}
                  onChange={(event) => {
                    work.setReviewHours(event.target.value);
                  }}
                />
              </label>
              <button type="submit" disabled={work.saving || !work.data}>
                Save rule
              </button>
            </form>
          </WorkspaceDetails>
        )}
      </div>
      {work.notice && (
        <p className={styles.notice} role="status">
          {work.notice}
        </p>
      )}
      {work.error && (
        <div role="alert" className={styles.error}>
          <p>{work.error}</p>
          <button
            type="button"
            onClick={() => {
              void work.refresh();
            }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              window.history.pushState(null, "", "/system/operations-monitor");

              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
          >
            Reset filters
          </button>
        </div>
      )}
      <div className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
            <h2>
              Review &amp; follow-up queue{" "}
              <span>{work.data?.total ?? "—"}</span>
            </h2>
            <p>
              Observed evidence gaps and review stages. Missing statements are
              not inferred without an agreed submission schedule.
            </p>
          </div>
        </div>
        <div
          className={styles.tabs}
          role="group"
          aria-label="Monitoring categories"
        >
          {monitorTabs.map((tab) => {
            return (
              <button
                type="button"
                key={tab.key}
                aria-pressed={(params.get("kind") ?? "all") === tab.key}
                onClick={() => {
                  work.filter("kind", tab.key === "all" ? "" : tab.key);
                }}
              >
                {tab.label}
                <span>{work.data?.counts[tab.key] ?? "—"}</span>
              </button>
            );
          })}
        </div>
        <form
          className={styles.filters}
          onSubmit={(event) => {
            event.preventDefault();

            work.filter("q", search.trim());
          }}
        >
          <div className={styles.search}>
            <label>
              Search batch or staff
              <input
                type="search"
                maxLength={100}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                placeholder="Batch code or staff name"
              />
            </label>
            <button type="submit">Search</button>
          </div>
          <label>
            Batch
            <WorkspaceNativeSelect
              value={params.get("batchId") ?? ""}
              onChange={(event) => {
                work.filter("batchId", event.target.value);
              }}
            >
              <option value="">All visible batches</option>
              {work.data?.batches.map((batch) => {
                return (
                  <option key={batch.id} value={batch.id}>
                    {batch.code}
                  </option>
                );
              })}
            </WorkspaceNativeSelect>
          </label>
          <label>
            Responsible staff
            <WorkspaceNativeSelect
              value={params.get("staffId") ?? ""}
              onChange={(event) => {
                work.filter("staffId", event.target.value);
              }}
            >
              <option value="">All responsible staff</option>
              {work.data?.staff.map((staff) => {
                return (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                );
              })}
            </WorkspaceNativeSelect>
          </label>
          <label>
            Stage
            <WorkspaceNativeSelect
              value={params.get("stage") ?? ""}
              onChange={(event) => {
                work.filter("stage", event.target.value);
              }}
            >
              <option value="">All stages</option>
              {["HANDLER", "RECORDS", "MANAGER", "FINANCE", "COMPLETE"].map(
                (stage) => {
                  return (
                    <option key={stage} value={stage}>
                      {stage.charAt(0) + stage.slice(1).toLowerCase()}
                    </option>
                  );
                },
              )}
            </WorkspaceNativeSelect>
          </label>
          <label>
            Minimum age
            <WorkspaceNativeSelect
              value={params.get("minAgeHours") ?? "0"}
              onChange={(event) => {
                work.filter("minAgeHours", event.target.value);
              }}
            >
              <option value="0">Any age</option>
              <option value="24">24 hours</option>
              <option value="72">3 days</option>
              <option value="168">7 days</option>
            </WorkspaceNativeSelect>
          </label>
          <label>
            Follow-up view
            <WorkspaceNativeSelect
              value={params.get("view") ?? "ACTIVE"}
              onChange={(event) => {
                work.filter("view", event.target.value);
              }}
            >
              <option value="ACTIVE">Active items</option>
              <option value="RESOLVED">Resolved follow-ups</option>
            </WorkspaceNativeSelect>
          </label>
        </form>
        {!work.loading &&
        !work.error &&
        work.data &&
        work.data.items.length === 0 ? (
          <div className={styles.empty} role="status">
            <strong>No items match this view.</strong>
            <p>
              Change the filters, or check back when new submissions arrive.
            </p>
          </div>
        ) : (
          <div
            className={styles.tableScroll}
            role="region"
            aria-label="Monitoring items"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Item / batch</th>
                  <th scope="col">Review stage</th>
                  <th scope="col">Responsible</th>
                  <th scope="col">Waiting</th>
                  <th scope="col">Needs attention</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {work.loading ? (
                  <TableSkeletonRows
                    columns={6}
                    label="Loading monitoring items…"
                  />
                ) : work.error ? (
                  <tr>
                    <td colSpan={6}>
                      The queue could not be loaded. Retry above.
                    </td>
                  </tr>
                ) : !work.data?.items.length ? (
                  <tr>
                    <td colSpan={6} className={styles.empty}>
                      <strong>No items match this view.</strong>
                      <p>
                        Change the filters, or check back when new submissions
                        arrive.
                      </p>
                    </td>
                  </tr>
                ) : (
                  work.data.items.map((item) => {
                    return (
                      <tr key={`${item.source}:${item.id}`}>
                        <td>
                          <strong>{item.batchCode}</strong>
                          <small>
                            {item.source === "PAYMENT"
                              ? "Payment"
                              : "GCash statement"}{" "}
                            · {item.id.slice(0, 8)}
                          </small>
                        </td>
                        <td>
                          <span className={styles.stage}>
                            {item.stage.toLowerCase()}
                          </span>
                          <small>
                            {item.status.replaceAll("_", " ").toLowerCase()}
                          </small>
                        </td>
                        <td>{item.responsibleName}</td>
                        <td>
                          <strong>
                            {waitingAge(
                              item.waitingSince,
                              work.data
                                ? Date.parse(work.data.asOf)
                                : Date.now(),
                            )}
                          </strong>
                          <small>{timestamp(item.waitingSince)}</small>
                        </td>
                        <td>
                          <span
                            className={
                              item.overdue ? styles.overdue : undefined
                            }
                          >
                            {monitorReasons(item)}
                          </span>
                          {item.followUp?.dueAt &&
                            item.followUp.status === "OPEN" && (
                              <small>
                                Follow-up due {timestamp(item.followUp.dueAt)}
                              </small>
                            )}
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              type="button"
                              onClick={() => {
                                void work.open(item);
                              }}
                              aria-label={`Follow up ${item.batchCode} ${item.id.slice(0, 8)}`}
                            >
                              Follow up
                            </button>
                            {item.href && (
                              <Link href={item.href}>View source</Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className={styles.pager}>
          <button
            type="button"
            disabled={work.loading || !work.data || work.data.page <= 1}
            onClick={() => {
              work.filter("page", String((work.data?.page ?? 1) - 1));
            }}
          >
            Previous
          </button>
          <span>
            Page {work.data?.page ?? 1} · {work.data?.total ?? "—"} matching
            items
          </span>
          <button
            type="button"
            disabled={
              work.loading ||
              !work.data ||
              work.data.page * work.data.pageSize >= work.data.total
            }
            onClick={() => {
              work.filter("page", String((work.data?.page ?? 1) + 1));
            }}
          >
            Next
          </button>
        </div>
      </div>
      <p className={styles.footnote}>
        Updates every 30 seconds and when you return to this page. Follow-up
        resolution does not approve a submission or change a balance.
      </p>
      <MonitorFollowUp work={work} />
    </section>
  );
}
