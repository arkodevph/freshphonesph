"use client";

import type {
  NetworkPage,
  NetworkAgent,
  NetworkBatch,
} from "@freshphones/contracts";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { can, useMe } from "@/lib/useMe";
import WorkspaceNativeSelect from "@/app/system/_role-designs/pioneer_agent/components/WorkspaceNativeSelect";
import WorkspaceProgress from "@/app/system/_role-designs/pioneer_agent/components/WorkspaceProgress";
import { RecordPagination } from "@/app/system/_role-designs/pioneer_agent/components/RecordPagination";
import NetworkDirectory from "@/app/system/_role-designs/pioneer_agent/app/system/agent-network/NetworkDirectory";
import AgentDetail from "@/app/system/_role-designs/pioneer_agent/app/system/agent-network/AgentDetail";
import {
  readNetworkAgents,
  readNetworkBatches,
} from "@/app/system/_role-designs/pioneer_agent/app/system/agent-network/network-api";
import {
  changeQuery,
  networkFilters,
  queryString,
  safeNetworkReturn,
} from "@/app/system/_role-designs/pioneer_agent/app/system/agent-network/network-query";
import { useNetworkRead } from "@/app/system/_role-designs/pioneer_agent/app/system/agent-network/useNetworkRead";
import styles from "@/app/system/_role-designs/pioneer_agent/app/system/agent-network/network.module.css";

export default function NetworkWorkspace() {
  const me = useMe();

  const params = useSearchParams();

  const { view, result } = networkFilters(params);

  const query = result.success ? queryString(result.data) : "";

  const permitted = can(me, "AGENT_NETWORK_READ");

  const identity = `${me?.id}:${me?.role}:${me?.permissions.join(",")}`;

  const read = useNetworkRead<NetworkPage<NetworkAgent | NetworkBatch>>(
    permitted && result.success ? `${identity}:${view}:${query}` : null,
    () => {
      return view === "agents"
        ? readNetworkAgents(query)
        : readNetworkBatches(query);
    },
  );

  const data = read.data;

  const [search, setSearch] = useState(result.success ? result.data.q : "");

  useEffect(() => {
    setSearch(result.success ? result.data.q : "");
  }, [params]);

  useEffect(() => {
    if (data && result.success && data.page !== result.data.page) {
      changeQuery({ page: data.page }, true);
    }
  }, [data, result.success && result.data.page]);

  function submit(event: FormEvent) {
    event.preventDefault();

    changeQuery({ q: search.trim(), page: 1, agent: null });
  }

  if (!me) {
    return <WorkspaceProgress label="Loading Agent network…" />;
  }

  if (!permitted) {
    return <h1>No access</h1>;
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.heading}>
        <h1>Agent network</h1>
        <button
          type="button"
          className={styles.action}
          disabled={read.loading || !result.success}
          onClick={() => {
            return void read.refresh();
          }}
        >
          Refresh
        </button>
      </header>
      {!result.success ? (
        <p role="alert" className="system-alert is-error">
          These network filters are invalid.{" "}
          <a href="/system/agent-network">Reset filters</a>
        </p>
      ) : (
        <>
          {read.error && (
            <p role="alert" className="system-alert is-error">
              {read.error}
              {data &&
                " Showing previously loaded results; refresh before following up."}{" "}
              <button
                type="button"
                onClick={() => {
                  return void read.refresh();
                }}
                disabled={read.loading}
              >
                Retry
              </button>
            </p>
          )}
          <section aria-label="Current team enrollment progress">
            <h2>Current team</h2>
            <p className={styles.context}>
              All time · enrollment requests submitted by your current assigned
              Agents
            </p>
            {data ? (
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
                      <dd>{data.summary.requests[key].toLocaleString()}</dd>
                    </div>
                  );
                })}
              </dl>
            ) : (
              <p className={styles.context}>
                {read.loading
                  ? "Loading team totals…"
                  : "Team totals unavailable."}
              </p>
            )}
          </section>
          <div className={styles.views} role="group" aria-label="Network view">
            {(
              [
                ["agents", "Agents"],
                ["batches", "Assigned batches"],
              ] as const
            ).map(([value, label]) => {
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  onClick={() => {
                    return changeQuery({
                      view: value,
                      page: 1,
                      q: null,
                      sort: null,
                      agent: null,
                    });
                  }}
                >
                  {label}
                  {data && <span>{data.summary[value].toLocaleString()}</span>}
                </button>
              );
            })}
          </div>
          <form className={styles.filters} onSubmit={submit}>
            <label className={styles.search} htmlFor="network-search">
              {view === "agents" ? "Search Agents" : "Search batches"}
              <input
                id="network-search"
                type="search"
                value={search}
                maxLength={100}
                placeholder={
                  view === "agents"
                    ? "Name, Agent code or Pioneer"
                    : "Batch code or model"
                }
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
                  return changeQuery({
                    sort: event.target.value,
                    page: 1,
                    agent: null,
                  });
                }}
              >
                {(view === "agents"
                  ? [
                      ["name_asc", "Name A–Z"],
                      ["name_desc", "Name Z–A"],
                      ["code_asc", "Code A–Z"],
                      ["code_desc", "Code Z–A"],
                    ]
                  : [
                      ["code_asc", "Code A–Z"],
                      ["code_desc", "Code Z–A"],
                      ["model_asc", "Model A–Z"],
                      ["model_desc", "Model Z–A"],
                    ]
                ).map(([value, label]) => {
                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                })}
              </WorkspaceNativeSelect>
            </label>
            {result.data.q && (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  return changeQuery({ q: null, page: 1, agent: null });
                }}
              >
                Clear search
              </button>
            )}
          </form>
          <section
            className={styles.results}
            aria-label={
              view === "agents" ? "Assigned Agents" : "Assigned batches"
            }
            aria-busy={read.loading}
          >
            <p className={styles.resultCount} role="status">
              {data
                ? `${data.total.toLocaleString()} matching ${view === "agents" ? "Agents" : "batches"} · ${data.summary[view].toLocaleString()} in current scope${read.loading ? " · Refreshing…" : ""}`
                : read.loading
                  ? "Loading results…"
                  : "Results unavailable."}
            </p>
            {data && (
              <NetworkDirectory
                agents={
                  view === "agents"
                    ? (data.items as Awaited<
                        ReturnType<typeof readNetworkAgents>
                      >["items"])
                    : null
                }
                batches={
                  view === "batches"
                    ? (data.items as Awaited<
                        ReturnType<typeof readNetworkBatches>
                      >["items"])
                    : null
                }
                onAgent={(id) => {
                  return changeQuery({ agent: id });
                }}
              />
            )}
            {data && !data.items.length && !read.loading && (
              <p className={styles.empty}>
                {result.data.q
                  ? "No matches. Try another search or clear the filter."
                  : view === "agents"
                    ? "No active Agents are assigned to your team."
                    : "No batches are assigned in your current scope."}
              </p>
            )}
            {data && (
              <RecordPagination
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                hasNext={data.page * data.pageSize < data.total}
                loading={read.loading}
                onPage={(page) => {
                  return changeQuery({ page, agent: null });
                }}
              />
            )}
          </section>
          {params.get("agent") && (
            <AgentDetail
              key={`${identity}:${params.get("agent")}`}
              id={params.get("agent")!}
              identity={identity}
              returnTo={safeNetworkReturn(`/system/agent-network?${params}`)}
              onClose={() => {
                return changeQuery({ agent: null }, true);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
