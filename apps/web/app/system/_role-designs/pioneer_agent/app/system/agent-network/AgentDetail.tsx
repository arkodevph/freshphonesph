"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import ModalCloseButton from "@/app/system/_role-designs/pioneer_agent/components/ModalCloseButton";
import WorkspaceProgress from "@/app/system/_role-designs/pioneer_agent/components/WorkspaceProgress";
import { Readiness } from "@/app/system/_role-designs/pioneer_agent/app/system/agent-network/NetworkDirectory";
import { readNetworkAgent } from "@/app/system/_role-designs/pioneer_agent/app/system/agent-network/network-api";
import { queryString } from "@/app/system/_role-designs/pioneer_agent/app/system/agent-network/network-query";
import { useNetworkRead } from "@/app/system/_role-designs/pioneer_agent/app/system/agent-network/useNetworkRead";
import { useSpringDialog } from "@/lib/useSpringDialog";
import styles from "@/app/system/_role-designs/pioneer_agent/app/system/agent-network/network.module.css";

export default function AgentDetail({
  id,
  identity,
  returnTo,
  onClose,
}: {
  id: string;
  identity: string;
  returnTo: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  const opener = useRef<HTMLElement | null>(null);

  const [closing, setClosing] = useState(false);

  const {
    data: agent,
    error,
    loading,
    refresh,
  } = useNetworkRead(`${identity}:${id}`, () => {
    return readNetworkAgent(id);
  });

  function finishClose() {
    if (dialog.current?.open) {
      return;
    }

    onClose();

    if (opener.current?.isConnected) {
      opener.current.focus();
    } else {
      document.getElementById("network-search")?.focus();
    }
  }

  useLayoutEffect(() => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }, []);

  useSpringDialog(dialog, !closing, finishClose);

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      data-workspace-modal
      data-modal-framed
      data-modal-sections
      data-modal-size="wide"
      aria-labelledby="network-agent-title"
      onCancel={(event) => {
        event.preventDefault();

        setClosing(true);
      }}
      onClose={finishClose}
    >
      <header data-modal-header>
        <h2 id="network-agent-title">{agent?.name ?? "Agent details"}</h2>
        <ModalCloseButton
          onClick={() => {
            return setClosing(true);
          }}
        />
      </header>
      <div data-modal-body className={styles.detailBody}>
        {error && (
          <p role="alert" className="system-alert is-error">
            {error}
            {agent && " Showing previously loaded details."}{" "}
            <button
              type="button"
              onClick={() => {
                return void refresh();
              }}
              disabled={loading}
            >
              Retry
            </button>
          </p>
        )}
        {loading && <WorkspaceProgress label="Loading Agent details…" />}
        {agent && (
          <>
            <dl className={styles.metadata}>
              <div>
                <dt>Agent code</dt>
                <dd>{agent.agentProfile?.code ?? "No linked code"}</dd>
              </div>
              <div>
                <dt>Profile readiness</dt>
                <dd>
                  <Readiness agent={agent} />
                </dd>
              </div>
              <div>
                <dt>Pioneer</dt>
                <dd>{agent.supervisor?.name ?? "Not assigned"}</dd>
              </div>
            </dl>
            <section>
              <h3>Enrollment requests</h3>
              <p className={styles.context}>
                All time · submitted by this Agent in your current scope.
                Requests are separate from enrolled members.
              </p>
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
                      <dd>{agent.requests[key].toLocaleString()}</dd>
                    </div>
                  );
                })}
              </dl>
              <p className={styles.context}>
                {agent.requests.total.toLocaleString()} requests in total
              </p>
            </section>
          </>
        )}
      </div>
      {agent && !error && !loading && (
        <footer data-modal-footer>
          <Link
            className={styles.primaryAction}
            href={`/system/enrollments?${queryString({ view: "requests", agentId: agent.id, returnTo })}`}
          >
            View enrollment requests
          </Link>
        </footer>
      )}
    </dialog>
  );
}
