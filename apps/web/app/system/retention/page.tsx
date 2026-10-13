"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  retentionScopeDescriptions,
  retentionScopeLabels,
  retentionScopes,
  type RetentionHold,
  type RetentionPolicy,
  type RetentionPreview,
  type RetentionRequest,
  type RetentionScope,
} from "@freshphones/contracts";
import { can, useMe } from "@/lib/useMe";
import { useLiveRecords } from "@/lib/useLiveRecords";
import * as api from "@/lib/retention";
import { date, emptyPage } from "./retention-view";
import styles from "./retention.module.css";
import RetentionCandidatesPanel from "./RetentionCandidatesPanel";
import RetentionPolicyForm from "./RetentionPolicyForm";
import RetentionRequestsPanel from "./RetentionRequestsPanel";

export default function RetentionPage() {
  const me = useMe(),
    access = can(me, "RETENTION_MANAGE");

  const [tab, setTab] = useState<"records" | "policies" | "requests" | "holds">(
    "records",
  );

  const [scope, setScope] = useState<RetentionScope>("APPLICANT");

  const [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1);

  const [requestPage, setRequestPage] = useState(1),
    [holdPage, setHoldPage] = useState(1);

  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);

  const [candidates, setCandidates] = useState(emptyPage<RetentionPreview>);

  const [requests, setRequests] = useState(emptyPage<RetentionRequest>),
    [holds, setHolds] = useState(emptyPage<RetentionHold>);

  const [preview, setPreview] = useState<RetentionPreview | null>(null),
    [selectedRequest, setSelectedRequest] = useState<RetentionRequest | null>(
      null,
    );

  const [requestPreview, setRequestPreview] = useState<RetentionPreview | null>(
    null,
  );

  const [reason, setReason] = useState(""),
    [confirmation, setConfirmation] = useState("");

  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");

  const [draft, setDraft] = useState({
    scope: "APPLICANT" as RetentionScope,
    days: "",
    basis: "",
    backupInstructions: "",
    externalCopyInstructions: "",
  });

  const [approval, setApproval] = useState<Record<string, string>>({}),
    [releaseReasons, setReleaseReasons] = useState<Record<string, string>>({});

  const loadSequence = useRef(0);

  const load = useCallback(async () => {
    if (!access) {
      return;
    }
    const sequence = ++loadSequence.current;

    setLoading(true);

    try {
      const [rules, records, review, protectedRecords] = await Promise.all([
        api.retentionPolicies(),
        api.retentionCandidates(scope, search, page),
        api.retentionRequests(requestPage),
        api.retentionHolds(holdPage),
      ]);

      if (sequence !== loadSequence.current) {
        return;
      }
      setPolicies(rules.items);

      setCandidates(records);

      setRequests(review);

      setHolds(protectedRecords);

      setSelectedRequest((current) => {
        return current
          ? (review.items.find((item) => {
              return item.id === current.id;
            }) ?? null)
          : null;
      });
    } catch (cause) {
      if (sequence === loadSequence.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load retention records.",
        );
      }
    } finally {
      if (sequence === loadSequence.current) {
        setLoading(false);
      }
    }
  }, [access, scope, search, page, requestPage, holdPage]);

  useLiveRecords(() => {
    void load();
  }, access);

  useEffect(() => {
    void load();

    return () => {
      loadSequence.current++;
    };
  }, [load]);

  useEffect(() => {
    if (access) {
      return;
    }
    setPolicies([]);

    setCandidates(emptyPage());

    setRequests(emptyPage());

    setHolds(emptyPage());

    setPreview(null);

    setSelectedRequest(null);

    setRequestPreview(null);

    setReason("");

    setConfirmation("");
  }, [access]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);

    setError("");

    setMessage("");

    try {
      await action();

      setMessage(success);

      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The action failed.");
    } finally {
      setBusy(false);
    }
  }
  async function inspect(item: RetentionPreview) {
    await run(async () => {
      setPreview(await api.retentionPreview(item.scope, item.subjectId));

      setReason("");

      setSelectedRequest(null);
    }, "Preview refreshed.");
  }
  async function savePolicy(event: FormEvent) {
    event.preventDefault();

    await run(async () => {
      await api.createRetentionPolicy({ ...draft, days: Number(draft.days) });

      setDraft({
        ...draft,
        days: "",
        basis: "",
        backupInstructions: "",
        externalCopyInstructions: "",
      });
    }, "Policy draft saved. It has no effect until approved.");
  }
  async function exportLedger() {
    await run(async () => {
      const data = await api.retentionDeletionLedger();

      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );

      const link = document.createElement("a");

      link.href = url;

      link.download = `retention-deletion-ledger-${new Date().toISOString().slice(0, 10)}.json`;

      link.click();

      setTimeout(() => {
        return URL.revokeObjectURL(url);
      }, 1000);
    }, "Deletion ledger exported. Store it privately, separately from database backups, for restore reconciliation.");
  }
  if (!me) {
    return <p>Checking access…</p>;
  }
  if (!access) {
    return (
      <section className={styles.card}>
        <h2>No access</h2>
        <p>
          The Owner manages retention policies, holds and deletion approvals.
        </p>
      </section>
    );
  }
  const active = policies.filter((item) => {
    return item.status === "ACTIVE";
  });

  const pager = (
    current: number,
    total: number,
    size: number,
    change: (page: number) => void,
  ) => {
    return (
      <div className={styles.actions}>
        <button
          disabled={busy || loading || current === 1}
          onClick={() => {
            return change(current - 1);
          }}
        >
          Previous
        </button>
        <span>
          Page {current} · {total} records
        </span>
        <button
          disabled={busy || loading || current * size >= total}
          onClick={() => {
            return change(current + 1);
          }}
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <header>
        <p className="system-eyebrow">Privacy controls</p>
        <h2>Retention &amp; deletion</h2>
        <p>
          Review expired records, protect records on hold, and approve each
          erasure.
        </p>
        <button
          disabled={busy || loading}
          onClick={() => {
            setError("");

            void load();
          }}
        >
          Refresh records
        </button>
      </header>
      <section className={styles.notice}>
        <strong>
          {active.length
            ? `${active.length} of 4 categories have an approved policy`
            : "Waiting for business approval"}
        </strong>
        <p>
          Retention periods must come from the business’s approved policy.
          Deletion runs only after an Owner approves a request and confirms the
          record ID. No automatic deletion is scheduled.
        </p>
        <p>
          Backups, delivered email and copies outside this application need the
          follow up described in each policy. Use case references in reasons;
          avoid adding personal details.
        </p>
      </section>
      <nav className={styles.tabs} aria-label="Retention sections">
        {(["records", "policies", "requests", "holds"] as const).map(
          (value) => {
            return (
              <button
                key={value}
                aria-current={tab === value ? "page" : undefined}
                onClick={() => {
                  setTab(value);

                  setPreview(null);

                  setSelectedRequest(null);

                  setReason("");
                }}
              >
                {
                  {
                    records: "Review records",
                    policies: "Policies",
                    requests: "Deletion requests",
                    holds: "Legal holds",
                  }[value]
                }
              </button>
            );
          },
        )}
      </nav>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className={styles.success} role="status">
          {message}
        </p>
      )}
      {loading && <p role="status">Refreshing records…</p>}
      {tab === "records" && (
        <>
          <form
            className={styles.filters}
            onSubmit={(event) => {
              event.preventDefault();

              setSearch(query.trim());

              setPage(1);
            }}
          >
            <label>
              Category
              <select
                value={scope}
                disabled={busy}
                onChange={(event) => {
                  setScope(event.target.value as RetentionScope);

                  setPage(1);

                  setPreview(null);
                }}
              >
                {retentionScopes.map((item) => {
                  return (
                    <option key={item} value={item}>
                      {retentionScopeLabels[item]}
                    </option>
                  );
                })}
              </select>
            </label>
            <label>
              Search records
              <input
                value={query}
                maxLength={100}
                onChange={(event) => {
                  return setQuery(event.target.value);
                }}
              />
            </label>
            <button disabled={busy}>Search</button>
          </form>
          <p>{retentionScopeDescriptions[scope]}</p>
          <section className={styles.card}>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Record</th>
                    <th>Retention starts</th>
                    <th>Eligible from</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.items.map((item) => {
                    return (
                      <tr key={item.subjectId}>
                        <td>
                          <strong>{item.label}</strong>
                          <small>{item.subjectId}</small>
                        </td>
                        <td>{date(item.anchorAt)}</td>
                        <td>{date(item.eligibleAt)}</td>
                        <td>
                          <p>
                            {item.blockers[0] ??
                              "Eligible for a deletion request"}
                          </p>
                          <button
                            disabled={busy || loading}
                            onClick={() => {
                              return inspect(item);
                            }}
                          >
                            Preview &amp; hold
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!loading && !candidates.items.length && (
              <p>No records match this category and search.</p>
            )}
            {pager(page, candidates.total, candidates.pageSize, setPage)}
          </section>
          {preview && (
            <RetentionRequestsPanel
              preview={preview}
              reason={reason}
              setReason={setReason}
              busy={busy}
              run={run}
              setPreview={setPreview}
              setTab={setTab}
              setRequestPage={setRequestPage}
            />
          )}
        </>
      )}
      {tab === "policies" && (
        <>
          <RetentionPolicyForm
            savePolicy={savePolicy}
            draft={draft}
            setDraft={setDraft}
            busy={busy}
          />
          {policies.map((policy) => {
            return (
              <section className={styles.card} key={policy.id}>
                <h3>
                  {retentionScopeLabels[policy.scope]} · revision{" "}
                  {policy.version}
                </h3>
                <p>
                  <strong>{policy.status}</strong> · {policy.days} days after
                  final activity
                </p>
                <p>{policy.basis}</p>
                <p>
                  <strong>Backups:</strong> {policy.backupInstructions}
                </p>
                <p>
                  <strong>External copies:</strong>{" "}
                  {policy.externalCopyInstructions}
                </p>
                {policy.status === "DRAFT" ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();

                      void run(() => {
                        return api.approveRetentionPolicy(
                          policy.id,
                          approval[policy.id] ?? "",
                        );
                      }, "Policy approved. Requests using an earlier revision must be reviewed again.");
                    }}
                  >
                    <label>
                      Business approval reference
                      <input
                        required
                        minLength={5}
                        maxLength={1000}
                        value={approval[policy.id] ?? ""}
                        onChange={(event) => {
                          return setApproval({
                            ...approval,
                            [policy.id]: event.target.value,
                          });
                        }}
                      />
                    </label>
                    <button disabled={busy}>
                      Approve and activate this revision
                    </button>
                  </form>
                ) : (
                  <p>
                    Approved by {policy.approvedBy?.name} on{" "}
                    {date(policy.approvedAt)} · {policy.approvalReference}
                  </p>
                )}
              </section>
            );
          })}
          {!policies.length && !loading && (
            <p>No policy periods have been configured.</p>
          )}
        </>
      )}
      {tab === "requests" && (
        <>
          <div className={styles.actions}>
            <button disabled={busy} onClick={exportLedger}>
              Export deletion ledger
            </button>
            <span>Keep this evidence separately from older backups.</span>
          </div>
          <section className={styles.card}>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Record ID</th>
                    <th>Approval</th>
                    <th>State</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.items.map((item) => {
                    return (
                      <tr key={item.id}>
                        <td>
                          {retentionScopeLabels[item.scope]}
                          <small>{item.subjectId}</small>
                        </td>
                        <td>
                          {item.requestedBy.name}
                          <small>{date(item.createdAt)}</small>
                        </td>
                        <td>
                          {item.status.replaceAll("_", " ")}
                          <small>
                            {
                              item.files.filter((file) => {
                                return file.status === "DELETED";
                              }).length
                            }
                            /{item.files.length} copies removed
                          </small>
                        </td>
                        <td>
                          <button
                            disabled={busy}
                            onClick={() => {
                              setSelectedRequest(item);

                              setReason("");

                              setConfirmation("");

                              setRequestPreview(null);

                              if (
                                ["PENDING", "APPROVED"].includes(item.status)
                              ) {
                                void run(async () => {
                                  return setRequestPreview(
                                    await api.retentionPreview(
                                      item.scope,
                                      item.subjectId,
                                    ),
                                  );
                                }, "Current record preview loaded for review.");
                              }
                            }}
                          >
                            Review request
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!requests.items.length && !loading && (
              <p>No deletion requests yet.</p>
            )}
            {pager(
              requestPage,
              requests.total,
              requests.pageSize,
              setRequestPage,
            )}
          </section>
          {selectedRequest && (
            <RetentionCandidatesPanel
              selectedRequest={selectedRequest}
              requestPreview={requestPreview}
              reason={reason}
              setReason={setReason}
              busy={busy}
              run={run}
              setSelectedRequest={setSelectedRequest}
              confirmation={confirmation}
              setConfirmation={setConfirmation}
            />
          )}
        </>
      )}
      {tab === "holds" && (
        <section className={styles.card}>
          <h3>Legal and operational holds</h3>
          <p>
            Place a hold from a record’s preview. Parent holds also protect
            linked private files.
          </p>
          {holds.items.map((item) => {
            return (
              <article className={styles.hold} key={item.id}>
                <strong>
                  {retentionScopeLabels[item.scope]} ·{" "}
                  {item.releasedAt ? "Released" : "Active hold"}
                </strong>
                <p className={styles.identifier}>{item.subjectId}</p>
                <p>{item.reason}</p>
                <p>
                  {item.createdBy.name} · {date(item.createdAt)}
                </p>
                {item.releasedAt ? (
                  <p>
                    Released {date(item.releasedAt)} · {item.releaseReason}
                  </p>
                ) : (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();

                      void run(() => {
                        return api.releaseRetentionHold(
                          item.id,
                          releaseReasons[item.id] ?? "",
                        );
                      }, "Hold released. Any earlier deletion approval must be checked again.");
                    }}
                  >
                    <label>
                      Release reason
                      <input
                        required
                        minLength={5}
                        maxLength={1000}
                        value={releaseReasons[item.id] ?? ""}
                        onChange={(event) => {
                          return setReleaseReasons({
                            ...releaseReasons,
                            [item.id]: event.target.value,
                          });
                        }}
                      />
                    </label>
                    <button disabled={busy}>Release hold</button>
                  </form>
                )}
              </article>
            );
          })}
          {!holds.items.length && !loading && <p>No holds recorded.</p>}
          {pager(holdPage, holds.total, holds.pageSize, setHoldPage)}
        </section>
      )}
    </div>
  );
}
