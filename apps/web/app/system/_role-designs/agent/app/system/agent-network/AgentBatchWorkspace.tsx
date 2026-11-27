"use client";

import Link from "next/link";
import { ArrowClockwise } from "@phosphor-icons/react";
import { can, useMe } from "@/lib/useMe";
import type { NetworkBatchesQuery } from "@freshphones/contracts";
import Select from "@/app/system/_role-designs/agent/components/Select";
import { RecordPagination } from "@/app/system/_role-designs/agent/components/RecordPagination";
import WorkspaceProgress from "@/app/system/_role-designs/agent/components/WorkspaceProgress";
import AgentProfileCard from "../agent-dashboard/AgentProfileCard";
import ReadFailure from "../agent-dashboard/AgentReadFailure";
import AgentBatchTable from "./AgentBatchTable";
import { useAgentBatches } from "./useAgentBatches";
import styles from "./agent-batches.module.css";

const sorts = [
  { value: "code_asc", label: "Batch code: A to Z" },
  { value: "code_desc", label: "Batch code: Z to A" },
  { value: "model_asc", label: "Model: A to Z" },
  { value: "model_desc", label: "Model: Z to A" },
];

export default function AgentBatchWorkspace() {
  const me = useMe();

  const workspace = useAgentBatches();

  const { profile, batches, filter } = workspace;

  const data = batches.error ? null : batches.data;

  const profileKnown = !profile.loading && !profile.error && profile.data;

  const linked = profile.data?.items.find((person) => {
    return person.id === String(me?.id);
  })?.agentProfile;

  if (!me) {
    return <WorkspaceProgress label="Loading your workspace…" />;
  }

  if (!can(me, "AGENT_NETWORK_READ")) {
    return <p role="alert">No access to this workspace.</p>;
  }

  function reset() {
    workspace.setSearch("");

    workspace.navigate({ page: 1, q: "", sort: "code_asc" });
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.heading}>
        <div>
          <h2>Your profile and batches</h2>
          <p>Your own Agent assignment and enrollment progress.</p>
        </div>
        <button
          type="button"
          className={styles.refresh}
          onClick={workspace.refresh}
          disabled={profile.loading || batches.loading}
        >
          <ArrowClockwise size={18} />
          Refresh
        </button>
      </header>
      <div className={styles.profile}>
        <AgentProfileCard resource={profile} />
        <nav
          className={styles.requestSummary}
          aria-label="Your enrollment request totals"
        >
          {(
            [
              ["PENDING", "With Batch Manager", "pending"],
              ["APPROVED", "Approved", "approved"],
              ["REJECTED", "Rejected", "rejected"],
            ] as const
          ).map(([status, label, key]) => {
            return (
              <Link
                key={status}
                href={`/system/enrollments?view=requests&status=${status}`}
              >
                <span>{label}</span>
                <strong>
                  {profileKnown ? profile.data!.summary.requests[key] : "—"}
                </strong>
              </Link>
            );
          })}
        </nav>
      </div>
      <section
        className={styles.panel}
        aria-labelledby="batch-list-title"
        aria-busy={batches.loading}
      >
        <div className={styles.panelHeading}>
          <h2 id="batch-list-title">Assigned batches</h2>
          <p role="status">
            {batches.error
              ? "Batch count unavailable"
              : batches.loading || !data
                ? "Loading batch count…"
                : filter.q
                  ? `${data.total} matching of ${data.summary.batches} assigned batches`
                  : `${data.total} assigned batches`}
          </p>
        </div>
        {workspace.invalid && (
          <p className={styles.notice} role="status">
            These filters are invalid. Showing the first page with default
            sorting.{" "}
            <button type="button" onClick={reset}>
              Reset filters
            </button>
          </p>
        )}
        <form
          className={styles.filters}
          onSubmit={(event) => {
            event.preventDefault();

            workspace.navigate({ page: 1, q: workspace.search.trim() });
          }}
        >
          <label className={styles.search}>
            <span>Search assigned batches</span>
            <input
              type="search"
              maxLength={100}
              placeholder="Batch code or model"
              value={workspace.search}
              onChange={(event) => {
                return workspace.setSearch(event.target.value);
              }}
            />
          </label>
          <button type="submit" className={styles.searchButton}>
            Search
          </button>
          <div className={styles.sortControl}>
            <label id="agent-batch-sort-label" htmlFor="agent-batch-sort">
              Sort batches
            </label>
            <Select
              id="agent-batch-sort"
              labelId="agent-batch-sort-label"
              value={filter.sort}
              options={sorts}
              onValueChange={(value) => {
                return workspace.navigate({
                  page: 1,
                  sort: value as NetworkBatchesQuery["sort"],
                });
              }}
            />
          </div>
          {filter.q && (
            <button
              className={styles.reset}
              type="button"
              onClick={() => {
                workspace.setSearch("");

                workspace.navigate({ q: "", page: 1 });
              }}
            >
              Clear search
            </button>
          )}
        </form>
        {batches.error ? (
          <ReadFailure error={batches.error} retry={batches.refresh} />
        ) : !data ? (
          <WorkspaceProgress label="Loading assigned batches…" />
        ) : !data.items.length ? (
          <div className={styles.empty}>
            <h3>
              {filter.q
                ? "No matching assigned batches"
                : "No batches available"}
            </h3>
            <p>
              {filter.q
                ? "Try a different batch code or model, or clear the search to see all your assigned batches."
                : !profileKnown
                  ? "Confirm your Agent profile above before checking batch assignments."
                  : !linked?.active
                    ? "An active linked Agent profile is needed for batch access. Ask the COO to review your profile. Your own tasks and security remain available."
                    : "Ask the COO to review your batch assignments. Only batches currently assigned to your active Agent profile appear here."}
            </p>
          </div>
        ) : (
          <>
            <AgentBatchTable items={data.items} />
            <div className={styles.pagination}>
              <RecordPagination
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                hasNext={data.page * data.pageSize < data.total}
                loading={batches.loading}
                onPage={(page) => {
                  return workspace.navigate({ page });
                }}
              />
            </div>
          </>
        )}
        <p className={styles.note}>
          Membership counts show current positions, not available capacity.
          Enrollment needs a planned or active assigned batch and an active
          Batch Manager.
        </p>
      </section>
    </div>
  );
}
