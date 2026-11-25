"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { can, useMe } from "@/lib/useMe";
import WorkspaceNativeSelect from "@/app/system/_role-designs/pioneer_agent/components/WorkspaceNativeSelect";
import WorkspaceProgress from "@/app/system/_role-designs/pioneer_agent/components/WorkspaceProgress";
import EnrollmentRequests from "@/app/system/_role-designs/pioneer_agent/app/system/enrollments/EnrollmentRequests";
import { readNetworkRequests } from "@/app/system/_role-designs/pioneer_agent/app/system/agent-network/network-api";
import {
  changeQuery,
  queryString,
  requestFilters,
  safeNetworkReturn,
} from "@/app/system/_role-designs/pioneer_agent/app/system/agent-network/network-query";
import { useNetworkRead } from "@/app/system/_role-designs/pioneer_agent/app/system/agent-network/useNetworkRead";
import styles from "@/app/system/_role-designs/pioneer_agent/app/system/agent-network/network.module.css";

export default function PioneerEnrollmentWorkspace({
  requestId,
}: {
  requestId?: string;
}) {
  const me = useMe();

  const params = useSearchParams();

  const result = requestFilters(params, requestId);

  const query = result.success ? queryString(result.data) : "";

  const identity = `${me?.id}:${me?.role}:${me?.permissions.join(",")}`;

  const permitted = can(me, "AGENT_NETWORK_READ");

  const read = useNetworkRead(
    permitted && result.success ? `${identity}:${query}` : null,
    () => {
      return readNetworkRequests(query);
    },
  );

  const [search, setSearch] = useState(result.success ? result.data.q : "");

  useEffect(() => {
    setSearch(result.success ? result.data.q : "");
  }, [params]);

  useEffect(() => {
    if (read.data && result.success && read.data.page !== result.data.page) {
      changeQuery({ page: read.data.page }, true);
    }
  }, [read.data, result.success && result.data.page]);

  function submit(event: FormEvent) {
    event.preventDefault();

    changeQuery({ q: search.trim(), page: 1 });
  }

  if (!me) {
    return <WorkspaceProgress label="Loading enrollment requests…" />;
  }

  if (!permitted) {
    return <h1>No access</h1>;
  }

  const data = read.data;

  return (
    <div className={styles.workspace}>
      <header className={styles.heading}>
        <h1>Enrollment requests</h1>
        <button
          className={styles.action}
          type="button"
          disabled={read.loading || !result.success}
          onClick={() => {
            return void read.refresh();
          }}
        >
          Refresh
        </button>
      </header>
      <Link
        className={styles.backLink}
        href={safeNetworkReturn(params.get("returnTo"))}
      >
        ← Back to Agent network
      </Link>
      {!result.success ? (
        <p role="alert" className="system-alert is-error">
          These request filters are invalid.{" "}
          <Link href="/system/enrollments?view=requests">Reset filters</Link>
        </p>
      ) : (
        <>
          {read.error && (
            <p role="alert" className="system-alert is-error">
              {read.error}
              {data && " Showing previously loaded requests."}{" "}
              <button
                type="button"
                disabled={read.loading}
                onClick={() => {
                  return void read.refresh();
                }}
              >
                Retry
              </button>
              {result.data.agentId && !data && (
                <>
                  {" "}
                  <Link href="/system/enrollments?view=requests">
                    View current team requests
                  </Link>
                </>
              )}
            </p>
          )}
          <section aria-label="Request scope" className={styles.scope}>
            <h2>
              {data?.agent?.name ??
                (result.data.agentId ? "Selected Agent" : "Current team")}
            </h2>
            <p className={styles.context}>
              {data?.agent
                ? `${data.agent.agentProfile?.code ?? "No linked code"} · `
                : ""}
              All-time submitted requests, separate from enrolled members.
            </p>
            {data && (
              <dl className={styles.counts}>
                {(
                  [
                    ["pending", "Pending approval"],
                    ["approved", "Approved"],
                    ["rejected", "Rejected"],
                  ] as const
                ).map(([key, label]) => {
                  return (
                    <div key={key}>
                      <dt>{label}</dt>
                      <dd>{data.scopeCounts[key].toLocaleString()}</dd>
                    </div>
                  );
                })}
              </dl>
            )}
            {result.data.agentId && (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  return changeQuery({ agentId: null, page: 1 });
                }}
              >
                Show all team requests
              </button>
            )}
          </section>
          {requestId && (
            <p className={styles.context}>
              Showing the exact request opened from your notification.{" "}
              <Link
                href={`/system/enrollments?${queryString({ view: "requests", agentId: result.data.agentId, returnTo: safeNetworkReturn(params.get("returnTo")) })}`}
              >
                Show matching request list
              </Link>
            </p>
          )}
          <form className={styles.filters} onSubmit={submit}>
            <label
              className={styles.search}
              htmlFor="enrollment-request-search"
            >
              Search requests
              <input
                id="enrollment-request-search"
                type="search"
                maxLength={100}
                value={search}
                placeholder="Member, Agent or batch"
                onChange={(event) => {
                  return setSearch(event.target.value);
                }}
              />
            </label>
            <button className={styles.action} type="submit">
              Search
            </button>
            <label className={styles.sort}>
              Sort by
              <WorkspaceNativeSelect
                value={result.data.sort}
                onChange={(event) => {
                  return changeQuery({ sort: event.target.value, page: 1 });
                }}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </WorkspaceNativeSelect>
            </label>
            {result.data.q && (
              <button
                className={styles.action}
                type="button"
                onClick={() => {
                  return changeQuery({ q: null, page: 1 });
                }}
              >
                Clear search
              </button>
            )}
          </form>
          {data && (
            <p className={styles.context} role="status">
              {data.total.toLocaleString()} matching requests ·{" "}
              {data.scopeCounts.total.toLocaleString()} in{" "}
              {data.agent ? "this Agent’s" : "current team"} scope
            </p>
          )}
          <EnrollmentRequests
            items={data?.items ?? []}
            total={data?.total ?? null}
            page={data?.page ?? result.data.page}
            pageSize={data?.pageSize ?? 20}
            status={result.data.status ?? ""}
            loading={read.loading}
            busy={false}
            canReview={false}
            focusedId={requestId}
            reasons={{}}
            confirmReplacement={null}
            error={read.error}
            onStatus={(status) => {
              return changeQuery({ status, page: 1 });
            }}
            onPage={(page) => {
              return changeQuery({ page });
            }}
            onReason={() => {}}
            onConfirm={() => {}}
            onRefresh={read.refresh}
            onReview={async () => {}}
          />
        </>
      )}
    </div>
  );
}
