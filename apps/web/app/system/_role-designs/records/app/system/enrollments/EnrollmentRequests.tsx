"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ModalCloseButton from "@/app/system/_role-designs/records/components/ModalCloseButton";
import WorkspaceNativeSelect from "@/app/system/_role-designs/records/components/WorkspaceNativeSelect";
import { SkeletonLine } from "@/app/system/_role-designs/records/components/WorkspaceProgress";
import { useSpringDialog } from "@/lib/useSpringDialog";
import type { Enrollment } from "@/app/system/_role-designs/records/app/system/enrollments/enrollment-types";
import styles from "@/app/system/_role-designs/records/app/system/enrollments/enrollment-requests.module.css";

type Props = {
  items: Enrollment[];
  total: number | null;
  page: number;
  pageSize: number;
  status: string;
  loading: boolean;
  busy: boolean;
  canReview: boolean;
  focusedId?: string;
  reasons: Record<string, string>;
  confirmReplacement: string | null;
  error: string | null;
  onStatus: (value: string) => void;
  onPage: (page: number) => void;
  onReason: (id: string, reason: string) => void;
  onConfirm: (id: string | null) => void;
  onRefresh: () => Promise<void>;
  onReview: (
    item: Enrollment,
    decision: "APPROVED" | "REJECTED",
    confirmed?: boolean,
  ) => Promise<void>;
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function requestKind(item: Enrollment) {
  return item.withdrawalId
    ? item.replacementMode === "RESTART"
      ? "Replacement · New plan"
      : "Replacement · Continue installments"
    : "New member";
}

function Status({ value }: { value: string }) {
  return (
    <span className={styles.status} data-status={value}>
      <i aria-hidden="true" />
      {statusLabels[value] ?? value}
    </span>
  );
}

export default function EnrollmentRequests(props: Props) {
  const { items, loading, busy, canReview, focusedId } = props;

  const [selectedId, setSelectedId] = useState<string | null>(
    focusedId ?? null,
  );

  const [pane, setPane] = useState<"overview" | "review">("overview");

  const [closing, setClosing] = useState(false);

  const dialog = useRef<HTMLDialogElement>(null);

  const opener = useRef<HTMLButtonElement | null>(null);

  const selected = items.find((item) => {
    return item.id === selectedId;
  });

  useSpringDialog(dialog, Boolean(selected) && !closing, finishClose);

  useEffect(() => {
    if (focusedId) {
      setSelectedId(focusedId);
    }
  }, [focusedId]);

  function finishClose() {
    if (dialog.current?.open) {
      return;
    }

    setSelectedId(null);

    setClosing(false);

    props.onConfirm(null);

    if (opener.current?.isConnected) {
      opener.current.focus();
    } else {
      document.getElementById("enrollment-request-status")?.focus();
    }
  }

  function close() {
    if (!busy) {
      setClosing(true);
    }
  }

  function open(item: Enrollment, button: HTMLButtonElement) {
    opener.current = button;

    setPane("overview");

    setClosing(false);

    setSelectedId(item.id);
  }

  const pages =
    props.total === null
      ? null
      : Math.max(1, Math.ceil(props.total / props.pageSize));

  return (
    <>
      <section
        className={styles.directory}
        aria-label="Enrollment requests"
        aria-busy={loading}
      >
        <div className={styles.toolbar}>
          <label className={styles.filter} htmlFor="enrollment-request-status">
            <span>Request status</span>
            <WorkspaceNativeSelect
              id="enrollment-request-status"
              value={props.status}
              onChange={(event) => {
                props.onStatus(event.target.value);
              }}
              disabled={busy}
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </WorkspaceNativeSelect>
          </label>
          <span className={styles.total}>
            {props.total === null ? (
              <SkeletonLine width="7ch" />
            ) : (
              `${props.total} ${props.total === 1 ? "request" : "requests"}`
            )}
          </span>
        </div>
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
                <th scope="col">Submitted by</th>
                <th scope="col">
                  <span className="sr-only">Request details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && !items.length
                ? Array.from({ length: 4 }, (_, index) => {
                    return (
                      <tr key={index} aria-hidden="true">
                        <td>
                          <div className={styles.identity}>
                            <span className={styles.avatar}>
                              <SkeletonLine width="32px" />
                            </span>
                            <span className={styles.member}>
                              <strong>
                                <SkeletonLine width="80%" />
                              </strong>
                              <small>
                                <SkeletonLine width="65%" />
                              </small>
                            </span>
                          </div>
                        </td>
                        {[0, 1, 2, 3].map((column) => {
                          return (
                            <td key={column}>
                              <SkeletonLine
                                width={column === 3 ? "48px" : "75%"}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                : items.map((item) => {
                    return (
                      <tr
                        key={item.id}
                        data-selected={selectedId === item.id || undefined}
                      >
                        <th scope="row">
                          <div className={styles.identity}>
                            <span className={styles.avatar} aria-hidden="true">
                              {item.name
                                .trim()
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((word) => {
                                  return word[0];
                                })
                                .join("")
                                .toUpperCase()}
                            </span>
                            <span className={styles.member}>
                              <strong>{item.name}</strong>
                              <small>{requestKind(item)}</small>
                            </span>
                          </div>
                        </th>
                        <td data-label="Batch">{item.batchCode}</td>
                        <td data-label="Status">
                          <Status value={item.status} />
                        </td>
                        <td data-label="Submitted by">{item.submittedBy}</td>
                        <td data-label="Request">
                          <button
                            type="button"
                            className={styles.detailButton}
                            disabled={busy}
                            aria-label={`View enrollment for ${item.name}`}
                            onClick={(event) => {
                              open(item, event.currentTarget);
                            }}
                          >
                            {item.status === "PENDING" && canReview
                              ? "Review"
                              : "Details"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              {!loading && !items.length && (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    No enrollment requests match this view.
                    {props.status && (
                      <button
                        type="button"
                        onClick={() => {
                          props.onStatus("");
                        }}
                      >
                        Show all statuses
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {pages !== null && (pages > 1 || props.page > 1) && (
          <nav
            className={styles.pagination}
            aria-label="Enrollment request pages"
          >
            <span>
              Page {props.page} of {pages}
            </span>
            <button
              type="button"
              disabled={loading || props.page === 1}
              onClick={() => {
                props.onPage(props.page - 1);
              }}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={loading || props.page >= pages}
              onClick={() => {
                props.onPage(props.page + 1);
              }}
            >
              Next
            </button>
          </nav>
        )}
      </section>
      <dialog
        ref={dialog}
        data-workspace-modal
        data-modal-framed
        data-modal-sections
        data-modal-size="wide"
        className={styles.dialog}
        aria-labelledby="enrollment-request-title"
        onCancel={(event) => {
          event.preventDefault();

          close();
        }}
        onClose={finishClose}
      >
        <header data-modal-header>
          <div>
            <p className={styles.caption}>Enrollment request</p>
            <h2 id="enrollment-request-title">
              {selected?.name ?? "Enrollment request"}
            </h2>
          </div>
          <ModalCloseButton disabled={busy} onClick={close} />
        </header>
        <nav
          className={styles.detailTabs}
          aria-label="Enrollment request sections"
        >
          <button
            type="button"
            aria-pressed={pane === "overview"}
            onClick={() => {
              setPane("overview");
            }}
          >
            Overview
          </button>
          <button
            type="button"
            aria-pressed={pane === "review"}
            onClick={() => {
              setPane("review");
            }}
          >
            Review
          </button>
        </nav>
        <div data-modal-body className={styles.detailBody}>
          {selected && (
            <>
              {props.error && (
                <p role="alert" className={styles.error}>
                  {props.error}{" "}
                  <button
                    type="button"
                    disabled={busy || loading}
                    onClick={() => {
                      void props.onRefresh();
                    }}
                  >
                    Reload request
                  </button>
                </p>
              )}
              <section
                hidden={pane !== "overview"}
                data-enrollment-pane="overview"
              >
                <dl className={styles.metadata}>
                  <div>
                    <dt>Batch</dt>
                    <dd>{selected.batchCode}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <Status value={selected.status} />
                    </dd>
                  </div>
                  <div>
                    <dt>Submitted by</dt>
                    <dd>{selected.submittedBy}</dd>
                  </div>
                  <div>
                    <dt>Request type</dt>
                    <dd>{requestKind(selected)}</dd>
                  </div>
                </dl>
                {selected.withdrawalId && (
                  <section className={styles.terms}>
                    <h3>Replacement terms</h3>
                    <p>
                      {selected.replacementMode === "RESTART"
                        ? "Start the new installment plan recorded by the COO."
                        : "Continue only the departing member’s unpaid installments."}
                    </p>
                    <p>
                      Approval admits the replacement and completes the handover
                      of this batch position. The original member’s verified
                      payments remain in their history.
                    </p>
                    <Link
                      href={`/system/withdrawals?request=${encodeURIComponent(selected.withdrawalId)}`}
                    >
                      View withdrawal and replacement terms
                    </Link>
                  </section>
                )}
                {selected.publicApplicationId && (
                  <Link
                    className={styles.sourceLink}
                    href={`/system/enrollments?application=${encodeURIComponent(selected.publicApplicationId)}`}
                  >
                    View original website application
                  </Link>
                )}
              </section>
              <section hidden={pane !== "review"} data-enrollment-pane="review">
                {selected.status === "PENDING" && canReview ? (
                  <>
                    <label className={styles.reason}>
                      Review reason
                      <textarea
                        minLength={3}
                        maxLength={1000}
                        rows={4}
                        value={props.reasons[selected.id] ?? ""}
                        disabled={busy}
                        onChange={(event) => {
                          props.onReason(selected.id, event.target.value);
                        }}
                      />
                    </label>
                    {props.confirmReplacement === selected.id && (
                      <div
                        className={styles.confirmation}
                        role="group"
                        aria-label="Confirm replacement handover"
                      >
                        <h3>Confirm replacement admission</h3>
                        <p>
                          Admit {selected.name} under the COO’s recorded terms,
                          release the departing member’s unpaid obligation, and
                          issue the replacement schedule. This preserves the
                          existing payments and completes a one-for-one
                          handover.
                        </p>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            props.onConfirm(null);
                          }}
                        >
                          Keep reviewing
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <dl className={styles.metadata}>
                    <div>
                      <dt>Review status</dt>
                      <dd>
                        <Status value={selected.status} />
                      </dd>
                    </div>
                    <div>
                      <dt>Reviewed by</dt>
                      <dd>{selected.reviewedBy ?? "Not reviewed yet"}</dd>
                    </div>
                    <div className={styles.full}>
                      <dt>Review note</dt>
                      <dd>{selected.reason || "No review note recorded."}</dd>
                    </div>
                  </dl>
                )}
              </section>
            </>
          )}
        </div>
        {selected?.status === "PENDING" && canReview && (
          <footer data-modal-footer className={styles.detailFooter}>
            {pane === "overview" ? (
              <button
                type="button"
                data-variant="primary"
                onClick={() => {
                  setPane("review");
                }}
              >
                Review request
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={
                    busy || (props.reasons[selected.id] ?? "").trim().length < 3
                  }
                  onClick={() => {
                    void props.onReview(selected, "REJECTED");
                  }}
                >
                  Reject request
                </button>
                <button
                  type="button"
                  data-variant="primary"
                  disabled={
                    busy || (props.reasons[selected.id] ?? "").trim().length < 3
                  }
                  onClick={() => {
                    void props.onReview(
                      selected,
                      "APPROVED",
                      props.confirmReplacement === selected.id,
                    );
                  }}
                >
                  {busy
                    ? "Saving…"
                    : props.confirmReplacement === selected.id
                      ? "Confirm and admit replacement"
                      : selected.withdrawalId
                        ? "Review replacement admission"
                        : "Approve enrollment"}
                </button>
              </>
            )}
          </footer>
        )}
      </dialog>
    </>
  );
}
