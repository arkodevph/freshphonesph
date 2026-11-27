"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  withdrawalStatuses,
  type WithdrawalPage,
} from "@freshphones/contracts";
import { useAgentResource } from "@/lib/useAgentResource";
import {
  withdrawalRefundLabel,
  withdrawalStatusLabels,
} from "@/lib/withdrawals";
import WorkspaceNativeSelect from "../WorkspaceNativeSelect";
import WorkspaceProgress from "../WorkspaceProgress";
import {
  agentWithdrawalHref,
  agentWithdrawalLocation,
  type AgentWithdrawalLocation,
} from "./agent-withdrawal";
import { useAgentWithdrawal } from "./useAgentWithdrawal";
import { WithdrawalDetail } from "./WithdrawalDetail";
import styles from "./workspace.module.css";

export default function AgentWithdrawalWorkspace() {
  const params = useSearchParams();

  const parsed = agentWithdrawalLocation(params);

  const location: AgentWithdrawalLocation = parsed ?? { page: 1, q: "" };

  const [search, setSearch] = useState(location.q);

  const [dirty, setDirty] = useState(false);

  const dirtyRef = useRef(dirty);

  dirtyRef.current = dirty;

  const query = new URLSearchParams({
    page: String(location.page),
    ...(location.status ? { status: location.status } : {}),
    ...(location.q ? { q: location.q } : {}),
  });

  const list = useAgentResource<WithdrawalPage>(`/withdrawals?${query}`);

  const detail = useAgentWithdrawal(location.request);

  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dirty && !detail.uncertain && !detail.busy) {
      return;
    }

    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    function link(event: MouseEvent) {
      const anchor = (event.target as Element | null)?.closest("a[href]");

      if (
        anchor &&
        event.button === 0 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !window.confirm(
          "Leave withdrawal follow-up? Unsaved drafts and unconfirmed actions remain only while this workspace stays open. Confirm the original result before starting another proposal.",
        )
      ) {
        event.preventDefault();

        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", warn);

    document.addEventListener("click", link, true);

    return () => {
      window.removeEventListener("beforeunload", warn);

      document.removeEventListener("click", link, true);
    };
  }, [dirty, detail.uncertain, detail.busy]);

  useEffect(() => {
    setSearch(location.q);
  }, [location.q]);

  useEffect(() => {
    setDirty(false);
  }, [location.request, detail.revision]);

  useEffect(() => {
    if (detail.row) {
      panel.current?.focus({ preventScroll: true });
    }
  }, [detail.row?.id]);

  useEffect(() => {
    if (list.denied) {
      detail.clear();
    }
  }, [list.denied, detail.clear]);

  function navigate(next: Partial<AgentWithdrawalLocation>, replace = false) {
    if (
      detail.busy ||
      ((dirtyRef.current || detail.uncertain) &&
        !window.confirm(
          "Discard unsaved withdrawal drafts and change this view? Confirm any unconfirmed result before creating another proposal.",
        ))
    ) {
      return;
    }

    setDirty(false);

    window.history[replace ? "replaceState" : "pushState"](
      null,
      "",
      agentWithdrawalHref(location, next),
    );
  }

  function reload() {
    if (
      detail.busy ||
      ((dirty || detail.uncertain) &&
        !window.confirm(
          "Discard unsaved drafts and load the latest request to confirm the current result?",
        ))
    ) {
      return;
    }

    void detail.reload();
  }

  async function run(action: () => Promise<unknown>, message: string) {
    const saved = await detail.run(action, message);

    if (saved) {
      setDirty(false);

      void list.refresh();
    }

    return saved;
  }

  const rows = list.error ? null : list.data;

  return (
    <div
      className={`${styles.workspace} ${location.request ? styles.selected : ""}`}
    >
      <header className={styles.header}>
        <h1>Withdrawal follow-up</h1>
        <p>
          Review requests from your assigned batches and forward your notes to
          the COO. Propose eligible replacements under the recorded terms; the
          Batch Manager approves admission.
        </p>
        <p>
          Withdrawal and refund decisions belong to the COO. Finance records
          external payouts. Installments continue until the approved replacement
          handover.
        </p>
      </header>
      {!parsed && (
        <p className={styles.notice} role="status">
          These filters are invalid. Showing all requests.{" "}
          <button
            type="button"
            onClick={() => {
              navigate(
                { page: 1, q: "", status: undefined, request: undefined },
                true,
              );
            }}
          >
            Reset filters
          </button>
        </p>
      )}
      {detail.notice && (
        <p className={styles.notice} role="status">
          {detail.notice}
        </p>
      )}
      <div className={styles.layout}>
        <section
          className={styles.panel}
          aria-label="Assigned withdrawal requests"
          aria-busy={list.loading}
        >
          <h2>Assigned requests</h2>
          <form
            className={styles.toolbar}
            onSubmit={(event) => {
              event.preventDefault();

              navigate({ q: search.trim(), page: 1, request: undefined });
            }}
          >
            <label className={styles.field}>
              Search member or batch
              <input
                type="search"
                maxLength={100}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
              />
            </label>
            <label className={styles.field}>
              Request status
              <WorkspaceNativeSelect
                value={location.status ?? ""}
                onChange={(event) => {
                  navigate({
                    status:
                      (event.target
                        .value as AgentWithdrawalLocation["status"]) ||
                      undefined,
                    page: 1,
                    request: undefined,
                  });
                }}
              >
                <option value="">All statuses</option>
                {withdrawalStatuses.map((status) => {
                  return (
                    <option key={status} value={status}>
                      {withdrawalStatusLabels[status]}
                    </option>
                  );
                })}
              </WorkspaceNativeSelect>
            </label>
            <button type="submit" disabled={detail.busy}>
              Search
            </button>
          </form>
          {list.error ? (
            <div className={styles.error} role="alert">
              <p>{list.error}</p>
              <button
                type="button"
                onClick={() => {
                  void list.refresh();
                }}
              >
                Retry withdrawal requests
              </button>
            </div>
          ) : !rows ? (
            <WorkspaceProgress label="Loading assigned requests…" />
          ) : (
            <>
              {list.loading && (
                <p role="status">
                  Refreshing requests. These rows may have changed.
                </p>
              )}
              {!rows.items.length ? (
                <p className={styles.empty}>
                  No withdrawal requests match this view.
                </p>
              ) : (
                <div className={styles.list}>
                  {rows.items.map((row) => {
                    return (
                      <article
                        key={row.id}
                        className={`${styles.card} ${location.request === row.id ? styles.cardSelected : ""}`}
                      >
                        <p className={styles.reference}>{row.batch.code}</p>
                        <h3>{row.memberName}</h3>
                        <p>{withdrawalStatusLabels[row.status]}</p>
                        <p>{withdrawalRefundLabel(row)}</p>
                        <footer>
                          <span className={styles.muted}>
                            {row.duesContinue
                              ? "Installments continue"
                              : "Handover recorded"}
                          </span>
                          <button
                            type="button"
                            disabled={detail.busy}
                            aria-label={`Open withdrawal for ${row.memberName}`}
                            onClick={() => {
                              navigate({ request: row.id });
                            }}
                          >
                            Open request
                          </button>
                        </footer>
                      </article>
                    );
                  })}
                </div>
              )}
              <nav
                className={styles.pagination}
                aria-label="Withdrawal request pages"
              >
                <button
                  type="button"
                  disabled={list.loading || detail.busy || location.page <= 1}
                  onClick={() => {
                    navigate({ page: location.page - 1, request: undefined });
                  }}
                >
                  Previous
                </button>
                <span>
                  Page {location.page} · {rows.total} requests
                </span>
                <button
                  type="button"
                  disabled={
                    list.loading ||
                    detail.busy ||
                    location.page * rows.pageSize >= rows.total
                  }
                  onClick={() => {
                    navigate({ page: location.page + 1, request: undefined });
                  }}
                >
                  Next
                </button>
              </nav>
            </>
          )}
          <div className={styles.actions}>
            <button
              type="button"
              disabled={list.loading}
              onClick={() => {
                void list.refresh();
              }}
            >
              Refresh requests
            </button>
          </div>
        </section>
        <div ref={panel} className={styles.detail} tabIndex={-1}>
          {location.request && detail.error && (
            <div className={styles.error} role="alert">
              <p>{detail.error}</p>
              <p>
                {detail.row
                  ? "Your draft remains here. Review the current state before trying again."
                  : "Private details are unavailable in your current access."}
              </p>
            </div>
          )}
          {detail.uncertain && (
            <div className={styles.notice} role="status">
              <p>
                The previous result is unconfirmed. Your original action is
                locked. Retry it unchanged or load the latest request before
                editing.
              </p>
              <button
                type="button"
                disabled={detail.busy || detail.stale}
                onClick={() => {
                  void detail.retry().then((saved) => {
                    if (saved) {
                      void list.refresh();
                    }
                  });
                }}
              >
                Retry original action
              </button>
              <button type="button" disabled={detail.busy} onClick={reload}>
                Check latest request
              </button>
            </div>
          )}
          {location.request ? (
            !detail.row ? (
              detail.loading ? (
                <WorkspaceProgress label="Loading request details…" />
              ) : (
                <section className={styles.panel}>
                  <p>
                    This request is unavailable. Your assignment may have
                    changed.
                  </p>
                  <button type="button" onClick={reload}>
                    Retry request
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigate({ request: undefined }, true);
                    }}
                  >
                    Back to requests
                  </button>
                </section>
              )
            ) : (
              <div
                onChangeCapture={(event) => {
                  if ((event.target as Element).closest("form")) {
                    setDirty(true);
                  }
                }}
              >
                {detail.loading && (
                  <p role="status">Checking the latest request…</p>
                )}
                <WithdrawalDetail
                  key={`${detail.row.id}:${detail.revision}`}
                  row={detail.row}
                  customer={false}
                  busy={detail.busy}
                  blocked={detail.blocked}
                  stale={detail.stale}
                  close={() => {
                    navigate({ request: undefined }, true);
                  }}
                  reload={reload}
                  run={run}
                  onAccessLost={detail.clear}
                />
              </div>
            )
          ) : (
            <section className={`${styles.panel} ${styles.empty}`}>
              <h2>Choose a request to follow up</h2>
              <p>
                Its explanation, review history and authorized Agent actions
                appear here.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
