"use client";

import { useState } from "react";
import { RecordPagination } from "@/app/system/_role-designs/agent/components/RecordPagination";
import styles from "@/app/system/_role-designs/agent/app/system/people/people.module.css";

export type Network = {
  agents: {
    id: string;
    name: string;
    supervisor: { name: string } | null;
    agentProfile: { code: string } | null;
  }[];
  batches: {
    id: string;
    code: string;
    model: string;
    status: string;
    _count: { clients: number };
  }[];
  enrollmentCounts: { status: string; count: number }[];
};

export default function AgentNetworkDirectory({
  network,
}: {
  network: Network;
}) {
  const [query, setQuery] = useState("");

  const [view, setView] = useState<"agents" | "batches">("agents");

  const [page, setPage] = useState(1);

  const search = query.trim().toLowerCase();

  const agents = network.agents.filter((agent) => {
    return `${agent.name} ${agent.agentProfile?.code ?? ""} ${agent.supervisor?.name ?? ""}`
      .toLowerCase()
      .includes(search);
  });

  const batches = network.batches.filter((batch) => {
    return `${batch.code} ${batch.model} ${batch.status}`
      .toLowerCase()
      .includes(search);
  });

  const pageSize = 10;

  const total = view === "agents" ? agents.length : batches.length;

  const currentPage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));

  const start = (currentPage - 1) * pageSize;

  return (
    <div className={styles.network}>
      <section aria-label="Enrollment progress">
        <dl className={styles.progress}>
          {["PENDING", "APPROVED", "REJECTED"].map((status) => {
            return (
              <div key={status}>
                <dt>{status.charAt(0) + status.slice(1).toLowerCase()}</dt>
                <dd>
                  {network.enrollmentCounts.find((row) => {
                    return row.status === status;
                  })?.count ?? 0}
                </dd>
              </div>
            );
          })}
        </dl>
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
                setView(value);

                setPage(1);
              }}
            >
              {label}{" "}
              <span>
                {value === "agents"
                  ? network.agents.length
                  : network.batches.length}
              </span>
            </button>
          );
        })}
      </div>
      <label className={styles.networkSearch}>
        Search network
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);

            setPage(1);
          }}
          placeholder="Agent, pioneer, batch or model"
        />
      </label>
      {query && (
        <button
          className={styles.clear}
          type="button"
          onClick={() => {
            return setQuery("");
          }}
        >
          Clear search
        </button>
      )}
      <section
        className={styles.directory}
        hidden={view !== "agents"}
        aria-labelledby="network-agents-title"
      >
        <header className={styles.sectionHeading}>
          <h2 id="network-agents-title">Agents</h2>
          <span role="status">
            {agents.length} of {network.agents.length}
          </span>
        </header>
        <div
          className={styles.tableWrap}
          role="region"
          aria-label="Agents in your network"
          tabIndex={0}
        >
          <table className={styles.table}>
            <caption className={styles.srOnly}>
              Agent and pioneer assignments
            </caption>
            <thead>
              <tr>
                <th scope="col">Agent</th>
                <th scope="col">Agent code</th>
                <th scope="col">Pioneer</th>
              </tr>
            </thead>
            <tbody>
              {agents.slice(start, start + pageSize).map((agent) => {
                return (
                  <tr key={agent.id}>
                    <th scope="row">{agent.name}</th>
                    <td data-label="Agent code">
                      {agent.agentProfile?.code ?? "Not assigned"}
                    </td>
                    <td data-label="Pioneer">
                      {agent.supervisor?.name ?? "Not assigned"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!agents.length && (
          <p className={styles.empty}>
            {search
              ? "No agents match this search."
              : "No agents assigned to your team."}
          </p>
        )}
      </section>
      <section
        className={styles.directory}
        hidden={view !== "batches"}
        aria-labelledby="network-batches-title"
      >
        <header className={styles.sectionHeading}>
          <h2 id="network-batches-title">Assigned batches</h2>
          <span role="status">
            {batches.length} of {network.batches.length}
          </span>
        </header>
        <div
          className={styles.tableWrap}
          role="region"
          aria-label="Assigned batches"
          tabIndex={0}
        >
          <table className={styles.table}>
            <caption className={styles.srOnly}>
              Batch membership and status
            </caption>
            <thead>
              <tr>
                <th scope="col">Batch</th>
                <th scope="col">Model</th>
                <th scope="col">Status</th>
                <th scope="col" data-numeric>
                  Members
                </th>
              </tr>
            </thead>
            <tbody>
              {batches.slice(start, start + pageSize).map((batch) => {
                return (
                  <tr key={batch.id}>
                    <th scope="row">{batch.code}</th>
                    <td data-label="Model">{batch.model}</td>
                    <td data-label="Status">
                      {batch.status.replaceAll("_", " ").toLowerCase()}
                    </td>
                    <td data-label="Members" data-numeric>
                      {batch._count.clients}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!batches.length && (
          <p className={styles.empty}>
            {search
              ? "No batches match this search."
              : "No batches assigned yet."}
          </p>
        )}
      </section>
      <RecordPagination
        page={currentPage}
        pageSize={pageSize}
        total={total}
        hasNext={currentPage * pageSize < total}
        loading={false}
        onPage={setPage}
      />
    </div>
  );
}
