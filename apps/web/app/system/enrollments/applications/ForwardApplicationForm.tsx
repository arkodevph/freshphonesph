"use client";

import WorkspaceNativeSelect from "@/components/WorkspaceNativeSelect";
import { useToastNotice } from "@/lib/useToastNotice";
import { useEffect, useRef, useState } from "react";
import {
  enrollmentApplicationForwardSchema,
  type PublicEnrollmentApplication,
} from "@freshphones/contracts";
import {
  findEnrollmentMembers,
  forwardEnrollmentApplication,
  type EnrollmentBatchChoice,
  type EnrollmentMemberChoice,
} from "@/lib/enrollment-forms";
import { ApiError } from "@/lib/ts-api";
import styles from "../enrollment-workspace.module.css";

export default function ForwardApplicationForm({
  application,
  batches,
  pending,
  run,
  onAccessLost,
}: {
  application: PublicEnrollmentApplication;
  batches: EnrollmentBatchChoice[];
  pending: boolean;
  run: (work: () => Promise<unknown>, message: string) => Promise<void>;
  onAccessLost: () => void;
}) {
  const alive = useRef(true);

  const searchGeneration = useRef(0);

  const [contact, setContact] = useState(application.contact);

  const [batchId, setBatchId] = useState("");

  const [member, setMember] = useState<EnrollmentMemberChoice | null>(null);

  const [search, setSearch] = useState("");

  const [choices, setChoices] = useState<EnrollmentMemberChoice[]>([]);

  const [searching, setSearching] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useToastNotice("");

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;

      ++searchGeneration.current;
    };
  }, []);

  async function searchMembers() {
    const request = ++searchGeneration.current;

    setSearching(true);

    setChoices([]);

    setError("");

    setNotice("");

    try {
      const found = await findEnrollmentMembers(search);

      if (alive.current && request === searchGeneration.current) {
        setChoices(found);

        if (!found.length) {
          setNotice("No matching members in your assigned batches.");
        }
      }
    } catch (failure) {
      if (alive.current && request === searchGeneration.current) {
        if (
          failure instanceof ApiError &&
          [401, 403, 404].includes(failure.status)
        ) {
          onAccessLost();
        }

        setError(
          failure instanceof Error
            ? failure.message
            : "Could not search existing members.",
        );
      }
    } finally {
      if (alive.current && request === searchGeneration.current) {
        setSearching(false);
      }
    }
  }

  return (
    <form
      className={styles.panel}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();

        setError("");

        const parsed = enrollmentApplicationForwardSchema.safeParse({
          version: application.version,
          ...contact,
          batchId,
          ...(member ? { memberId: member.memberId } : {}),
        });

        if (!parsed.success) {
          setError(
            parsed.error.issues[0]?.message ??
              "Check the contact details and choose a batch.",
          );

          return;
        }

        void run(() => {
          return forwardEnrollmentApplication(application.id, parsed.data);
        }, "Application forwarded. The assigned Batch Manager must approve the enrollment request before a membership is created.");
      }}
    >
      <h2>Agent review</h2>
      <p>
        Review the submitted answers, confirm contact details and choose an
        assigned batch. Corrections below apply to the enrollment request; the
        original website answers remain in this application.
      </p>
      <fieldset
        disabled={pending}
        style={{ minWidth: 0, border: 0, padding: 0 }}
      >
        <legend className={styles.srOnly}>Prepare enrollment request</legend>
        <label className={styles.field}>
          Find an existing member
          <input
            value={search}
            maxLength={100}
            onChange={(event) => {
              setSearch(event.target.value);

              ++searchGeneration.current;

              setChoices([]);

              setSearching(false);
            }}
          />
        </label>
        <div className={styles.actions}>
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
        {choices.length > 0 && (
          <ul className={styles.list} aria-label="Matching existing members">
            {choices.map((choice) => {
              return (
                <li key={choice.memberId}>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() => {
                      setMember(choice);

                      setContact({
                        name: choice.name,
                        email: choice.email,
                        phone: choice.phone,
                      });

                      setChoices([]);

                      setNotice(
                        "Existing member selected. Their saved contact details will be used.",
                      );
                    }}
                  >
                    {choice.name} · {choice.phone} · {choice.batch.code}
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

                setContact(application.contact);

                setNotice("");
              }}
            >
              Use the application details instead
            </button>
          </p>
        )}
        <div className={styles.grid}>
          <label className={styles.field}>
            Member name
            <input
              required
              minLength={2}
              maxLength={100}
              readOnly={Boolean(member)}
              value={contact.name}
              onChange={(event) => {
                setContact({ ...contact, name: event.target.value });
              }}
            />
          </label>
          <label className={styles.field}>
            Phone
            <input
              required={!member}
              type="tel"
              minLength={7}
              maxLength={25}
              readOnly={Boolean(member)}
              value={contact.phone}
              onChange={(event) => {
                setContact({ ...contact, phone: event.target.value });
              }}
            />
          </label>
          <label className={styles.field}>
            Email (optional)
            <input
              type="email"
              maxLength={254}
              readOnly={Boolean(member)}
              value={contact.email}
              onChange={(event) => {
                setContact({ ...contact, email: event.target.value });
              }}
            />
          </label>
          <label className={styles.field}>
            Assigned batch
            <WorkspaceNativeSelect
              required
              value={batchId}
              onChange={(event) => {
                setBatchId(event.target.value);
              }}
            >
              <option value="">Choose a batch</option>
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
        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}
        {!batches.length && (
          <p>
            No assigned batches are available. Ask the COO to check your Agent
            profile, batch assignments and assigned Batch Manager.
          </p>
        )}
        <div className={styles.actions}>
          <button
            type="submit"
            data-variant="primary"
            className={styles.primary}
            disabled={pending || !batchId}
          >
            {pending ? "Forwarding…" : "Forward to Manager"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
