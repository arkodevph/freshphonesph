"use client";

import { useEffect, useRef, useState } from "react";
import type {
  WithdrawalCase,
  WithdrawalReplacementPreview,
} from "@freshphones/contracts";
import { withdrawalReplacementSchema } from "@freshphones/contracts";
import { ApiError } from "@/lib/ts-api";
import { useAgentResource } from "@/lib/useAgentResource";
import {
  findWithdrawalReplacementMembers,
  withdrawalMoney,
  type WithdrawalMemberChoice,
} from "@/lib/withdrawals";
import WorkspaceProgress from "../WorkspaceProgress";
import { ActionForm } from "./ActionForm";
import { withdrawalCommand } from "./agent-withdrawal";
import { ReplacementEnrollmentLink } from "./ReplacementEnrollmentLink";
import type { RunWithdrawalAction } from "./ReviewActions";
import styles from "./workspace.module.css";

export function ReplacementActions({
  row,
  busy,
  blocked = busy,
  run,
  onAccessLost,
}: {
  row: WithdrawalCase;
  busy: boolean;
  blocked?: boolean;
  run: RunWithdrawalAction;
  onAccessLost?: () => void;
}) {
  if (row.status !== "APPROVED") {
    return row.replacementEnrollmentId ? (
      <ReplacementEnrollmentLink row={row} />
    ) : null;
  }

  return (
    <ApprovedReplacement
      key={row.id}
      row={row}
      busy={busy}
      blocked={blocked}
      run={run}
      onAccessLost={onAccessLost}
    />
  );
}

function ApprovedReplacement({
  row,
  busy,
  blocked,
  run,
  onAccessLost,
}: {
  row: WithdrawalCase;
  busy: boolean;
  blocked: boolean;
  run: RunWithdrawalAction;
  onAccessLost?: () => void;
}) {
  const preview = useAgentResource<WithdrawalReplacementPreview>(
    `/withdrawals/${encodeURIComponent(row.id)}/replacement-preview`,
  );

  const [search, setSearch] = useState("");

  const [choices, setChoices] = useState<WithdrawalMemberChoice[]>([]);

  const [selected, setSelected] = useState<WithdrawalMemberChoice | null>(null);

  const [searching, setSearching] = useState(false);

  const [searchError, setSearchError] = useState("");

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [phone, setPhone] = useState("");

  const [formError, setFormError] = useState("");

  const generation = useRef(0);

  const alive = useRef(true);

  const locked = useRef(blocked);

  locked.current = blocked;

  const lastVersion = useRef(row.version);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;

      ++generation.current;
    };
  }, []);

  useEffect(() => {
    if (blocked) {
      ++generation.current;

      setChoices([]);

      setSearching(false);
    }
  }, [blocked]);

  useEffect(() => {
    if (lastVersion.current !== row.version) {
      lastVersion.current = row.version;

      void preview.refresh();
    }
  }, [row.version, preview.refresh]);

  useEffect(() => {
    if (preview.denied) {
      onAccessLost?.();
    }
  }, [preview.denied, onAccessLost]);

  const terms = preview.error ? null : preview.data;

  const stalePreview = terms && terms.version !== row.version;

  const cannotPropose =
    blocked ||
    preview.loading ||
    !terms ||
    Boolean(terms.blockedReason || terms.needsPolicyRefresh || stalePreview);

  async function find() {
    if (blocked) {
      return;
    }

    const request = ++generation.current;

    setSearching(true);

    setChoices([]);

    setSearchError("");

    try {
      const found = await findWithdrawalReplacementMembers(search);

      if (alive.current && request === generation.current && !locked.current) {
        setChoices(found);

        if (!found.length) {
          setSearchError(
            "No matching members in your currently assigned batches.",
          );
        }
      }
    } catch (failure) {
      if (alive.current && request === generation.current) {
        if (
          failure instanceof ApiError &&
          [401, 403, 404].includes(failure.status)
        ) {
          onAccessLost?.();
        }

        setSearchError(
          failure instanceof Error
            ? failure.message
            : "Could not find replacement members.",
        );
      }
    } finally {
      if (alive.current && request === generation.current) {
        setSearching(false);
      }
    }
  }

  async function propose() {
    if (cannotPropose) {
      return false;
    }

    const parsed = withdrawalReplacementSchema.safeParse({
      version: row.version,
      submissionId: crypto.randomUUID(),
      ...(selected
        ? {
            memberId: selected.memberId,
            name: selected.name,
            email: selected.email,
            phone: selected.phone,
          }
        : { name: name.trim(), email: email.trim(), phone: phone.trim() }),
    });

    if (!parsed.success) {
      setFormError(
        parsed.error.issues[0]?.message ?? "Check replacement contact details.",
      );

      return false;
    }

    setFormError("");

    ++generation.current;

    setChoices([]);

    setSearching(false);

    return run(
      withdrawalCommand(row.id, "replacement-request", parsed.data),
      "Replacement request submitted to the Batch Manager. Dues and the current position continue until approved handover.",
    );
  }

  return (
    <>
      <section
        className={styles.section}
        aria-labelledby="agent-replacement-terms-title"
        aria-busy={preview.loading}
      >
        <h3 id="agent-replacement-terms-title">Recorded replacement terms</h3>
        {preview.error ? (
          <div className={styles.error} role="alert">
            <p>{preview.error}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void preview.refresh();
              }}
            >
              Retry replacement terms
            </button>
          </div>
        ) : preview.loading ? (
          <WorkspaceProgress label="Checking current replacement terms…" />
        ) : terms ? (
          <>
            <p>
              {terms.mode === "RESTART"
                ? "Start the COO’s recorded new installment plan"
                : terms.mode === "CONTINUE_UNPAID"
                  ? "Continue only the unpaid installments"
                  : "The COO has not recorded replacement terms."}{" "}
              · Total {withdrawalMoney(terms.totalDue)}
            </p>
            {terms.blockedReason && (
              <p className={styles.consequence} role="status">
                {terms.blockedReason}
              </p>
            )}
            {terms.needsPolicyRefresh && (
              <p className={styles.consequence} role="status">
                The payment record changed. Ask the COO to review and save the
                replacement terms again.
              </p>
            )}
            {stalePreview && (
              <p className={styles.consequence} role="status">
                These terms refer to a different request version. Load the
                latest withdrawal before proposing a replacement.
              </p>
            )}
            {terms.items.length > 0 && (
              <div
                className={styles.table}
                role="region"
                aria-label="Replacement dates and amounts"
                tabIndex={0}
              >
                <table>
                  <caption>Recorded replacement installment plan</caption>
                  <thead>
                    <tr>
                      <th scope="col">Installment</th>
                      <th scope="col">Due date</th>
                      <th scope="col">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terms.items.map((item) => {
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
        ) : null}
        <p>
          These terms are set by the COO. A proposal creates a request for the
          Batch Manager; it does not reserve an extra position or transfer
          verified payments.
        </p>
      </section>
      {row.replacementEnrollmentId && <ReplacementEnrollmentLink row={row} />}
      {row.actions.proposeReplacement && (
        <ActionForm
          title="Propose a replacement"
          label="Submit replacement for Manager approval"
          busy={busy}
          blocked={Boolean(cannotPropose)}
          onSave={propose}
        >
          <p>
            Choose an existing member or enter a new member’s details.
            Installments continue until the Manager approves the handover.
          </p>
          <label className={styles.field}>
            Find an existing replacement member
            <input
              type="search"
              minLength={2}
              maxLength={100}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);

                ++generation.current;

                setChoices([]);

                setSearching(false);

                setSearchError("");
              }}
            />
          </label>
          <button
            type="button"
            disabled={searching || search.trim().length < 2}
            onClick={() => {
              void find();
            }}
          >
            {searching ? "Searching…" : "Find member"}
          </button>
          {searchError && <p role="status">{searchError}</p>}
          {choices.length > 0 && (
            <ul
              className={styles.memberChoices}
              aria-label="Matching replacement members"
            >
              {choices.map((member) => {
                return (
                  <li key={member.memberId}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(member);

                        setChoices([]);
                      }}
                    >
                      {member.name} · {member.batch.code}
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
                  maxLength={254}
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
                  type="tel"
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
          {formError && (
            <p className={styles.error} role="alert">
              {formError}
            </p>
          )}
        </ActionForm>
      )}
    </>
  );
}
