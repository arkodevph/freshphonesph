"use client";

import { useEffect, useRef, useState } from "react";
import ModalCloseButton from "@/app/system/_role-designs/agent/components/ModalCloseButton";
import WorkspaceNativeSelect from "@/app/system/_role-designs/agent/components/WorkspaceNativeSelect";
import { useSpringDialog } from "@/lib/useSpringDialog";
import { tsRequest, ApiError } from "@/lib/ts-api";
import { useEnrollmentSubmission } from "./useEnrollmentSubmission";
import { useEnrollmentDraftGuard } from "./useEnrollmentDraftGuard";
import type { EnrollmentReceipt } from "./submission-attempt";
import styles from "./enrollment-workspace.module.css";

export type BatchChoice = { id: string; code: string; model: string };

type Member = {
  memberId: string;
  name: string;
  email: string;
  phone: string;
  batch: { code: string };
};

const empty = { name: "", email: "", phone: "", batchId: "" };

export default function EnrollmentSubmission({
  open,
  close,
  batches,
  batchError,
  retryBatches,
  batchLoading,
  saved,
  onAttempt,
  accessLost,
}: {
  open: boolean;
  close: () => void;
  batches: BatchChoice[];
  batchError: string;
  retryBatches: () => Promise<void>;
  batchLoading: boolean;
  saved: (receipt: EnrollmentReceipt) => void;
  onAttempt: (reference: string | null) => void;
  accessLost: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  const [draft, setDraft] = useState(empty);

  const [member, setMember] = useState<Member | null>(null);

  const [query, setQuery] = useState("");

  const [choices, setChoices] = useState<Member[]>([]);

  const [searching, setSearching] = useState(false);

  const [searchNotice, setSearchNotice] = useState("");

  const [error, setError] = useState("");

  const searchSequence = useRef(0);

  const alive = useRef(true);

  const dirty = Boolean(
    draft.name || draft.email || draft.phone || draft.batchId || query,
  );

  useSpringDialog(dialog, open);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;

      ++searchSequence.current;
    };
  }, []);

  const command = useEnrollmentSubmission((receipt) => {
    setDraft(empty);

    setMember(null);

    setQuery("");

    setChoices([]);

    saved(receipt);

    close();
  }, accessLost);

  const busy = command.busy;

  useEffect(() => {
    onAttempt(command.uncertain ? command.reference : null);
  }, [command.uncertain, command.reference, onAttempt]);

  useEnrollmentDraftGuard(dirty || command.uncertain || busy);

  useEffect(() => {
    if (command.denied) {
      setDraft(empty);

      setMember(null);

      setQuery("");

      setChoices([]);

      setSearchNotice("");

      ++searchSequence.current;
    }
  }, [command.denied]);

  function dismiss() {
    if (busy) {
      return;
    }

    if (command.uncertain) {
      close();

      return;
    }

    if (dirty && !window.confirm("Discard your unsaved enrollment?")) {
      return;
    }

    setDraft(empty);

    setMember(null);

    setQuery("");

    setChoices([]);

    setError("");

    setSearchNotice("");

    ++searchSequence.current;

    setSearching(false);

    command.reset();

    close();
  }

  async function find() {
    const request = ++searchSequence.current;

    setSearching(true);

    setChoices([]);

    setError("");

    setSearchNotice("");

    try {
      const data = await tsRequest<Member[]>(
        `/enrollment/members?q=${encodeURIComponent(query.trim())}`,
      );

      if (alive.current && request === searchSequence.current) {
        setChoices(data);

        setSearchNotice(
          data.length ? "" : "No matching members in your assigned batches.",
        );
      }
    } catch (failure) {
      if (alive.current && request === searchSequence.current) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not find members.",
        );

        if (
          failure instanceof ApiError &&
          [401, 403, 404].includes(failure.status)
        ) {
          setChoices([]);

          setMember(null);

          setDraft(empty);

          command.revoke();
        }
      }
    } finally {
      if (alive.current && request === searchSequence.current) {
        setSearching(false);
      }
    }
  }

  function submit() {
    ++searchSequence.current;

    setSearching(false);

    setChoices([]);

    void command.submit({
      ...draft,
      ...(member ? { memberId: member.memberId } : {}),
    });
  }

  function update(key: keyof typeof draft, value: string) {
    if (!command.locked) {
      setDraft((current) => {
        return { ...current, [key]: value };
      });

      command.reset();
    }
  }

  return (
    <dialog
      ref={dialog}
      data-workspace-modal
      data-modal-framed
      data-modal-size="drawer"
      className={styles.submissionDialog}
      aria-labelledby="submit-enrollment-title"
      onCancel={(event) => {
        event.preventDefault();

        dismiss();
      }}
    >
      <header data-modal-header>
        <h2 id="submit-enrollment-title">Submit enrollment</h2>
        <ModalCloseButton onClick={dismiss} disabled={busy} />
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();

          void submit();
        }}
      >
        <p className={styles.muted}>
          The assigned Batch Manager approves the request before a membership is
          created.
        </p>
        <fieldset disabled={command.locked}>
          <label className={styles.field}>
            Find an existing member
            <input
              type="search"
              maxLength={100}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);

                ++searchSequence.current;

                setChoices([]);

                setSearching(false);

                setSearchNotice("");
              }}
            />
          </label>
          <button
            type="button"
            className={styles.button}
            disabled={searching || query.trim().length < 2}
            onClick={() => {
              void find();
            }}
          >
            {searching ? "Searching…" : "Find member"}
          </button>
          {searchNotice && (
            <p className={styles.muted} role="status">
              {searchNotice}
            </p>
          )}
          {choices.length > 0 && (
            <ul className={styles.list} aria-label="Matching members">
              {choices.map((choice) => {
                return (
                  <li key={choice.memberId}>
                    <button
                      type="button"
                      className={styles.button}
                      onClick={() => {
                        setMember(choice);

                        setDraft((current) => {
                          return {
                            ...current,
                            name: choice.name,
                            phone: choice.phone,
                            email: choice.email,
                          };
                        });

                        setChoices([]);

                        command.reset();
                      }}
                    >
                      {choice.name} · {choice.batch.code}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {member && (
            <p className={styles.notice}>
              Using existing member: <strong>{member.name}</strong>.{" "}
              <button
                type="button"
                className={styles.button}
                onClick={() => {
                  setMember(null);

                  setDraft((current) => {
                    return { ...current, name: "", phone: "", email: "" };
                  });

                  command.reset();
                }}
              >
                Use a new member instead
              </button>
            </p>
          )}
          <div className={styles.submissionFields}>
            <label className={styles.field}>
              Member name
              <input
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                readOnly={Boolean(member)}
                value={draft.name}
                onChange={(event) => {
                  update("name", event.target.value);
                }}
              />
            </label>
            <label className={styles.field}>
              Phone
              <input
                type="tel"
                required={!member}
                minLength={7}
                maxLength={25}
                autoComplete="tel"
                readOnly={Boolean(member)}
                value={draft.phone}
                onChange={(event) => {
                  update("phone", event.target.value);
                }}
              />
            </label>
            <label className={styles.field}>
              Email (optional)
              <input
                type="email"
                maxLength={254}
                autoComplete="email"
                readOnly={Boolean(member)}
                value={draft.email}
                onChange={(event) => {
                  update("email", event.target.value);
                }}
              />
            </label>
            <label className={styles.field}>
              Batch
              <WorkspaceNativeSelect
                required
                value={draft.batchId}
                onChange={(event) => {
                  update("batchId", event.target.value);
                }}
              >
                <option value="">Choose an assigned batch</option>
                {batches.map((batch) => {
                  return (
                    <option key={batch.id} value={batch.id}>
                      {batch.code} · {batch.model}
                    </option>
                  );
                })}
              </WorkspaceNativeSelect>
            </label>
          </div>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </fieldset>
        {command.error && (
          <p className={styles.error} role="alert">
            {command.error}
          </p>
        )}
        {command.reference && command.uncertain && (
          <p className={styles.notice}>
            Unconfirmed attempt reference: <span>{command.reference}</span>. The
            original details are locked until its result is confirmed. Keep this
            workspace open.
          </p>
        )}
        {batchError ? (
          <div className={styles.error} role="alert">
            <p>{batchError}</p>
            <button
              type="button"
              className={styles.button}
              disabled={busy}
              onClick={() => {
                void retryBatches();
              }}
            >
              Retry assigned batches
            </button>
          </div>
        ) : batchLoading ? (
          <p className={styles.muted} role="status">
            Checking assigned batches…
          </p>
        ) : (
          !batches.length && (
            <p className={styles.muted}>
              No usable assigned batches are available. Ask the COO to check
              your Agent profile, batch assignments and assigned Batch Manager.
            </p>
          )
        )}
        <footer className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            disabled={busy}
            onClick={dismiss}
          >
            {command.uncertain ? "Keep attempt and close" : "Discard"}
          </button>
          <button
            type={command.uncertain ? "button" : "submit"}
            className={styles.primary}
            disabled={
              busy ||
              command.denied ||
              (!command.uncertain &&
                (!batches.length || Boolean(batchError) || batchLoading))
            }
            onClick={command.uncertain ? submit : undefined}
          >
            {busy
              ? "Submitting…"
              : command.uncertain
                ? "Retry original submission"
                : "Submit for approval"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
