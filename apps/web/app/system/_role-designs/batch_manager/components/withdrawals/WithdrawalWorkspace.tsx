"use client";

import WorkspaceProgress from "@/app/system/_role-designs/batch_manager/components/WorkspaceProgress";
import WorkspaceNativeSelect from "@/app/system/_role-designs/batch_manager/components/WorkspaceNativeSelect";
import { useEffect, useRef, useState } from "react";
import {
  withdrawalStatuses,
  type WithdrawalStatus,
} from "@freshphones/contracts";
import {
  submitWithdrawal,
  withdrawalRefundLabel,
  withdrawalStatusLabels,
} from "@/lib/withdrawals";
import {
  ActionForm,
  NoteField,
} from "@/app/system/_role-designs/batch_manager/components/withdrawals/ActionForm";
import { WithdrawalDetail } from "@/app/system/_role-designs/batch_manager/components/withdrawals/WithdrawalDetail";
import { useWithdrawalWorkspace } from "@/components/withdrawals/useWithdrawalWorkspace";
import styles from "@/app/system/_role-designs/batch_manager/components/withdrawals/workspace.module.css";

export function WithdrawalWorkspace({
  customer = false,
  clientId,
  requestId,
  enabled = true,
}: {
  customer?: boolean;
  clientId?: string;
  requestId?: string;
  enabled?: boolean;
}) {
  const state = useWithdrawalWorkspace({
    enabled,
    customer,
    clientId,
    requestId,
  });

  const [reason, setReason] = useState("");

  const [acknowledged, setAcknowledged] = useState(false);

  const submission = useRef<string | null>(null);

  const panel = useRef<HTMLDivElement>(null);

  const dirty = useRef(false);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
      }
    };

    window.addEventListener("beforeunload", warn);

    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, []);

  useEffect(() => {
    if (state.row) {
      panel.current?.focus({ preventScroll: true });
    }
  }, [state.row?.id]);

  function select(id: string | null) {
    if (state.busy) {
      return;
    }

    if (
      dirty.current &&
      !window.confirm("Discard your unsaved withdrawal drafts?")
    ) {
      return;
    }

    dirty.current = false;

    state.setSelected(id);
  }

  async function run(...args: Parameters<typeof state.run>) {
    const saved = await state.run(...args);

    if (saved) {
      dirty.current = false;
    }

    return saved;
  }

  if (!enabled) {
    return <p>Your role does not have access to withdrawal requests.</p>;
  }

  return (
    <div
      className={`${styles.workspace} ${state.selected ? styles.selected : ""}`}
      onChangeCapture={(event) => {
        if ((event.target as HTMLElement).closest("form")) {
          dirty.current = true;
        }
      }}
    >
      {!customer && (
        <header className={styles.header}>
          <h1>Member withdrawals</h1>
          <p>
            Review requests, record decisions and track replacements and
            external refunds. Withdrawal approval does not stop installments
            until a replacement joins.
          </p>
        </header>
      )}
      {state.error && (
        <div className={styles.error} role="alert">
          {state.error}
          <p>Unsaved form entries are retained.</p>
        </div>
      )}
      {state.notice && (
        <p className={styles.notice} role="status">
          {state.notice}
        </p>
      )}
      {customer && !state.selected && (
        <section className={styles.panel}>
          <h2>Request withdrawal from this membership</h2>
          {state.loading ? (
            <p role="status">Checking this membership…</p>
          ) : state.eligibility?.eligible ? (
            <ActionForm
              title="Withdrawal request"
              label="Submit withdrawal request"
              busy={state.busy}
              onSave={async () => {
                const eligible = state.eligibility;

                if (!eligible) {
                  return;
                }

                const success = await run(async () => {
                  submission.current ??= crypto.randomUUID();

                  return submitWithdrawal({
                    submissionId: submission.current,
                    clientId: eligible.clientId,
                    reason,
                  });
                }, "Withdrawal request sent to your Agent for review.");

                if (success) {
                  setReason("");

                  setAcknowledged(false);

                  submission.current = null;
                }
              }}
            >
              <p>
                {state.eligibility.batchCode} · {state.eligibility.memberName}
              </p>
              <NoteField
                label="Explain why you want to withdraw"
                value={reason}
                onChange={setReason}
                minLength={10}
                maxLength={5000}
                help="Give your Agent and the COO the context they need to review your request. Do not include passwords or financial account credentials."
              />
              <div className={styles.consequence}>
                <strong>
                  Installments continue until a replacement joins.
                </strong>
                <p>
                  This remains true even if the COO approves your request. Any
                  refund amount and payment date are decided separately.
                </p>
              </div>
              <label className={styles.check}>
                <input
                  required
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => {
                    setAcknowledged(event.target.checked);
                  }}
                />
                <span>
                  I understand that submitting this request does not stop my
                  installments or promise a refund.
                </span>
              </label>
            </ActionForm>
          ) : (
            <div className={styles.section}>
              <p>
                {state.eligibility?.reason ??
                  "Withdrawal requests are not available for this membership."}
              </p>
              {state.eligibility?.activeRequestId && (
                <button
                  type="button"
                  onClick={() => {
                    select(state.eligibility!.activeRequestId);
                  }}
                >
                  Open your current request
                </button>
              )}
            </div>
          )}
        </section>
      )}
      <div className={styles.layout}>
        <section
          className={`${styles.panel} ${styles.queue}`}
          aria-label="Withdrawal requests"
        >
          <h2>{customer ? "Your requests" : "Request queue"}</h2>
          <div className={styles.toolbar}>
            <label className={styles.field}>
              Filter withdrawal status
              <WorkspaceNativeSelect
                value={state.status}
                onChange={(event) => {
                  state.setStatus(event.target.value as WithdrawalStatus | "");

                  state.setPage(1);
                }}
              >
                <option value="">All statuses</option>
                {withdrawalStatuses.map((item) => {
                  return (
                    <option key={item} value={item}>
                      {withdrawalStatusLabels[item]}
                    </option>
                  );
                })}
              </WorkspaceNativeSelect>
            </label>
            {!customer && (
              <label className={styles.field}>
                Find a member or batch
                <input
                  type="search"
                  maxLength={100}
                  value={state.query}
                  onChange={(event) => {
                    state.setQuery(event.target.value);

                    state.setPage(1);
                  }}
                />
              </label>
            )}
          </div>
          {state.loading ? (
            <WorkspaceProgress label="Loading withdrawal requests…" />
          ) : (
            <>
              <div className={styles.list}>
                {state.result?.items.map((row) => {
                  return (
                    <article
                      key={row.id}
                      className={`${styles.card} ${row.id === state.selected ? styles.cardSelected : ""}`}
                    >
                      <p className={styles.reference}>{row.batch.code}</p>
                      <h3>{row.memberName}</h3>
                      <div className={styles.badges}>
                        <span className={styles.badge}>
                          {withdrawalStatusLabels[row.status]}
                        </span>
                        <span className={styles.badge}>
                          {withdrawalRefundLabel(row)}
                        </span>
                      </div>
                      <footer>
                        <time dateTime={row.submittedAt}>
                          {new Date(row.submittedAt).toLocaleDateString(
                            "en-PH",
                          )}
                        </time>
                        <button
                          type="button"
                          disabled={state.busy}
                          onClick={() => {
                            select(row.id);
                          }}
                        >
                          Open request
                        </button>
                      </footer>
                    </article>
                  );
                })}
              </div>
              {!state.result?.items.length && (
                <div className={styles.empty}>
                  <p>No withdrawal requests match this view.</p>
                </div>
              )}
              <div className={styles.pagination}>
                <button
                  type="button"
                  disabled={state.busy || state.page <= 1}
                  onClick={() => {
                    state.setPage((page) => {
                      return page - 1;
                    });
                  }}
                >
                  Previous
                </button>
                <span>
                  Page {state.page} · {state.result?.total ?? 0} requests
                </span>
                <button
                  type="button"
                  disabled={
                    state.busy ||
                    !state.result ||
                    state.page * state.result.pageSize >= state.result.total
                  }
                  onClick={() => {
                    state.setPage((page) => {
                      return page + 1;
                    });
                  }}
                >
                  Next
                </button>
              </div>
            </>
          )}
          <div className={styles.actions}>
            <button
              type="button"
              disabled={state.busy}
              onClick={() => {
                void state.load();
              }}
            >
              Refresh requests
            </button>
          </div>
        </section>
        <div ref={panel} tabIndex={-1} className={styles.detail}>
          {state.detailLoading ? (
            <WorkspaceProgress
              className={styles.panel}
              label="Loading request details…"
            />
          ) : state.row ? (
            <WithdrawalDetail
              row={state.row}
              customer={customer}
              busy={state.busy}
              stale={state.stale}
              close={() => {
                select(null);
              }}
              reload={() => {
                if (
                  dirty.current &&
                  !window.confirm(
                    "Discard unsaved drafts and load the latest request?",
                  )
                ) {
                  return;
                }

                dirty.current = false;

                void state.loadDetail(state.row!.id, true);
              }}
              run={run}
            />
          ) : state.selected ? (
            <section className={styles.panel}>
              <p>This request could not be opened.</p>
              <button
                type="button"
                onClick={() => {
                  select(null);
                }}
              >
                Back to requests
              </button>
              <button
                type="button"
                onClick={() => {
                  void state.loadDetail(state.selected!, true);
                }}
              >
                Retry request
              </button>
            </section>
          ) : !customer ? (
            <section className={`${styles.panel} ${styles.empty}`}>
              <h2>Choose a request to review</h2>
              <p>
                Its explanation, review history and available actions appear
                here.
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
