"use client";

import WorkspaceProgress from "@/components/WorkspaceProgress";
import WorkspaceNativeSelect from "@/components/WorkspaceNativeSelect";
import DateInput from "@/components/DateInput";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  WithdrawalCase,
  WithdrawalReplacementMode,
  WithdrawalReplacementPreview,
} from "@freshphones/contracts";
import { BatchSchedulePreview } from "@/components/BatchSchedulePreview";
import {
  findWithdrawalReplacementMembers,
  getReplacementPreview,
  moneyInput,
  proposeWithdrawalReplacement,
  saveWithdrawalPolicy,
  withdrawalMoney,
  type WithdrawalMemberChoice,
} from "@/lib/withdrawals";
import { ActionForm, NoteField } from "./ActionForm";
import type { RunWithdrawalAction } from "./ReviewActions";
import styles from "./workspace.module.css";
import { today as manilaToday } from "@/lib/date";

export function ReplacementActions({
  row,
  busy,
  run,
}: {
  row: WithdrawalCase;
  busy: boolean;
  run: RunWithdrawalAction;
}) {
  const [mode, setMode] = useState<WithdrawalReplacementMode>(
    row.replacementMode ?? "CONTINUE_UNPAID",
  );

  const [consultation, setConsultation] = useState("");

  const [note, setNote] = useState("");

  const [price, setPrice] = useState(row.restartPlan?.contractPrice ?? "");

  const [count, setCount] = useState(
    String(row.restartPlan?.installmentCount ?? 6),
  );

  const [cadence, setCadence] = useState<"MONTHLY" | "SEMIMONTHLY" | "WEEKLY">(
    row.restartPlan?.cadence ?? "MONTHLY",
  );

  const [start, setStart] = useState(
    row.restartPlan?.startDate ?? manilaToday(),
  );

  const [first, setFirst] = useState(row.restartPlan?.firstDueDate ?? "");

  const [monthEnd, setMonthEnd] = useState(row.restartPlan?.monthEnd ?? false);

  const [preview, setPreview] = useState<WithdrawalReplacementPreview | null>(
    null,
  );

  const [previewError, setPreviewError] = useState<string | null>(null);

  const [previewLoading, setPreviewLoading] = useState(false);

  const [attempt, setAttempt] = useState(0);

  const [search, setSearch] = useState("");

  const [choices, setChoices] = useState<WithdrawalMemberChoice[]>([]);

  const [selected, setSelected] = useState<WithdrawalMemberChoice | null>(null);

  const [searchError, setSearchError] = useState<string | null>(null);

  const [searching, setSearching] = useState(false);

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [phone, setPhone] = useState("");

  const submission = useRef<string | null>(null);

  const showPreview =
    row.actions.policy ||
    row.actions.proposeReplacement ||
    (row.status === "APPROVED" && Boolean(row.replacementMode));

  useEffect(() => {
    if (!showPreview) {
      return;
    }

    let active = true;

    setPreviewLoading(true);

    setPreviewError(null);

    void getReplacementPreview(row.id)
      .then((value) => {
        if (active) {
          setPreview(value);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setPreviewError(
            error instanceof Error
              ? error.message
              : "Could not load the replacement preview.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setPreviewLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [row.id, row.version, showPreview, attempt]);

  async function searchMembers() {
    setSearching(true);

    setSearchError(null);

    try {
      setChoices(await findWithdrawalReplacementMembers(search));
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : "Could not search existing members.",
      );
    } finally {
      setSearching(false);
    }
  }

  return (
    <>
      {showPreview && (
        <section
          className={styles.section}
          aria-label="Replacement schedule preview"
        >
          <h3>Replacement schedule</h3>
          {previewLoading ? (
            <WorkspaceProgress label="Loading the current replacement terms…" />
          ) : previewError ? (
            <div role="alert" className={styles.error}>
              {previewError}
              <button
                type="button"
                onClick={() => {
                  setAttempt((value) => {
                    return value + 1;
                  });
                }}
              >
                Retry preview
              </button>
            </div>
          ) : (
            preview && (
              <>
                {preview.blockedReason && (
                  <p className={styles.consequence}>{preview.blockedReason}</p>
                )}
                {preview.needsPolicyRefresh && (
                  <p className={styles.consequence}>
                    The financial position has changed. The COO must review and
                    save the replacement terms again.
                  </p>
                )}
                <p>
                  {preview.mode === "RESTART"
                    ? "Fresh installment plan"
                    : preview.mode === "CONTINUE_UNPAID"
                      ? "Remaining unpaid installments"
                      : "The COO has not selected replacement terms."}{" "}
                  · Total {withdrawalMoney(preview.totalDue)}
                </p>
                {preview.items.length > 0 && (
                  <div
                    className={styles.table}
                    role="region"
                    aria-label="Replacement dates and amounts"
                    tabIndex={0}
                  >
                    <table>
                      <caption>Proposed replacement installments</caption>
                      <thead>
                        <tr>
                          <th>Installment</th>
                          <th>Due date</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.items.map((item) => {
                          return (
                            <tr key={item.sequenceNo}>
                              <th scope="row">{item.sequenceNo}</th>
                              <td>{item.dueDate}</td>
                              <td>{withdrawalMoney(item.expectedAmount)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )
          )}
        </section>
      )}
      {row.actions.policy && (
        <ActionForm
          title="COO replacement terms"
          label="Review replacement terms"
          busy={busy}
          confirm="Save the agreed replacement terms after discussion with the CEO. This does not enroll anyone or stop the departing member's dues. The assigned Manager still approves the replacement's enrollment."
          onSave={() => {
            return run(async () => {
              return saveWithdrawalPolicy(row.id, {
                version: row.version,
                mode,
                consultationNote: consultation,
                note,
                ...(mode === "RESTART"
                  ? {
                      contractPrice: moneyInput(price),
                      installmentCount: Number(count),
                      cadence,
                      startDate: start,
                      firstDueDate: first,
                      monthEnd: cadence === "MONTHLY" && monthEnd,
                    }
                  : {}),
              });
            }, "Replacement terms saved. Agent may submit a replacement for Manager approval.");
          }}
        >
          <label className={styles.field}>
            Replacement arrangement
            <WorkspaceNativeSelect
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as WithdrawalReplacementMode);
              }}
            >
              <option value="CONTINUE_UNPAID">
                Continue unpaid installments
              </option>
              <option value="RESTART">Start a fresh installment plan</option>
            </WorkspaceNativeSelect>
          </label>
          <p>
            Continuing carries only the unpaid installments. The departing
            member's verified payments stay in their own history.
          </p>
          <NoteField
            label="CEO consultation notes (staff only)"
            value={consultation}
            onChange={setConsultation}
          />
          <NoteField
            label="Replacement decision notes (staff only)"
            value={note}
            onChange={setNote}
          />
          {mode === "RESTART" && (
            <>
              <div className={styles.fields}>
                <label className={styles.field}>
                  New contract price (PHP)
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    inputMode="decimal"
                    value={price}
                    onChange={(event) => {
                      setPrice(event.target.value);
                    }}
                  />
                </label>
                <label className={styles.field}>
                  New installment count
                  <input
                    required
                    type="number"
                    min="1"
                    max="600"
                    value={count}
                    onChange={(event) => {
                      setCount(event.target.value);
                    }}
                  />
                </label>
                <label className={styles.field}>
                  New installment frequency
                  <WorkspaceNativeSelect
                    value={cadence}
                    onChange={(event) => {
                      setCadence(event.target.value as typeof cadence);
                    }}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="SEMIMONTHLY">
                      Bi-monthly — 15th and month end
                    </option>
                    <option value="WEEKLY">Weekly</option>
                  </WorkspaceNativeSelect>
                </label>
                <label className={styles.field}>
                  New plan start date
                  <DateInput
                    required
                    type="date"
                    value={start}
                    onChange={(event) => {
                      setStart(event.target.value);
                    }}
                  />
                </label>
                <label className={styles.field}>
                  First new installment due date
                  <DateInput
                    required
                    type="date"
                    min={start}
                    value={first}
                    onChange={(event) => {
                      setFirst(event.target.value);
                    }}
                  />
                </label>
                {cadence === "MONTHLY" && (
                  <label className={styles.field}>
                    Monthly alignment
                    <WorkspaceNativeSelect
                      value={monthEnd ? "end" : "day"}
                      onChange={(event) => {
                        setMonthEnd(event.target.value === "end");
                      }}
                    >
                      <option value="day">Same day each month</option>
                      <option value="end">Last day of each month</option>
                    </WorkspaceNativeSelect>
                  </label>
                )}
              </div>
              <BatchSchedulePreview
                requireFirstDate
                plan={{
                  contractPrice: price,
                  installmentCount: Number(count),
                  cadence,
                  startDate: start,
                  firstDueDate: first,
                  monthEnd: cadence === "MONTHLY" && monthEnd,
                }}
              />
            </>
          )}
        </ActionForm>
      )}
      {row.actions.proposeReplacement && (
        <ActionForm
          title="Agent: propose a replacement"
          label="Submit replacement for Manager approval"
          busy={
            busy ||
            previewLoading ||
            !preview ||
            Boolean(
              previewError ||
              preview.blockedReason ||
              preview.needsPolicyRefresh,
            )
          }
          onSave={() => {
            return run(async () => {
              submission.current ??= crypto.randomUUID();

              return proposeWithdrawalReplacement(row.id, {
                version: row.version,
                submissionId: submission.current,
                ...(selected
                  ? {
                      memberId: selected.memberId,
                      name: selected.name,
                      email: selected.email,
                      phone: selected.phone,
                    }
                  : { name, email, phone }),
              });
            }, "Replacement request submitted. The Manager must approve before the handover occurs.");
          }}
        >
          <p>
            Use an existing member or enter a new member's details. A pending
            request does not free or take another batch position.
          </p>
          <label className={styles.field}>
            Find an existing replacement member
            <input
              minLength={2}
              maxLength={100}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
            />
          </label>
          <div>
            <button
              type="button"
              disabled={searching || search.trim().length < 2}
              onClick={() => {
                void searchMembers();
              }}
            >
              {searching ? "Searching…" : "Find member"}
            </button>
          </div>
          {searchError && <p role="alert">{searchError}</p>}
          {choices.length > 0 && (
            <ul
              className={styles.memberChoices}
              aria-label="Matching replacement members"
            >
              {choices.map((item) => {
                return (
                  <li key={item.memberId}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(item);

                        setChoices([]);
                      }}
                    >
                      {item.name} · {item.batch.code}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {selected ? (
            <div className={styles.consequence}>
              <p>Using existing member: {selected.name}</p>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                }}
              >
                Use a new member instead
              </button>
            </div>
          ) : (
            <div className={styles.fields}>
              <label className={styles.field}>
                Replacement member name
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                  }}
                />
              </label>
              <label className={styles.field}>
                Replacement email (optional)
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                  }}
                />
              </label>
              <label className={styles.field}>
                Replacement contact number
                <input
                  required
                  minLength={7}
                  maxLength={25}
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                  }}
                />
              </label>
            </div>
          )}
        </ActionForm>
      )}
      {row.actions.viewReplacementEnrollment && row.replacementEnrollmentId && (
        <p className={styles.section}>
          <Link
            className={styles.link}
            href={`/system/enrollments?request=${encodeURIComponent(row.replacementEnrollmentId)}`}
          >
            Open replacement enrollment
          </Link>
        </p>
      )}
    </>
  );
}
