"use client";

import {
  createJob,
  getApplicant,
  getRecruitmentSummary,
  listApplicants,
  listJobs,
  updateApplicant,
  updateJob,
  type Applicant,
  type JobOpening,
} from "@/lib/api";
import {
  observeReview,
  reviewDirty,
  reviewDraft,
  type ReviewDraft,
} from "@/lib/recruitment-review";
import { ApiError } from "@/lib/ts-api";
import type { RecruitmentSummary } from "@freshphones/contracts";
import {
  Briefcase,
  MagnifyingGlass,
  Plus,
  UsersThree,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { errorText } from "./recruitment-view";
import styles from "./recruitment.module.css";
import ApplicantReviewPanel from "./ApplicantReviewPanel";
import JobOpeningsPanel from "./JobOpeningsPanel";
import { useRecruitmentDirectory } from "./useRecruitmentDirectory";

export function RecruitmentDesk({
  onDenied,
  canReadApplicants,
}: {
  onDenied: () => void;
  canReadApplicants: boolean;
}) {
  const jobs = useRecruitmentDirectory(listJobs, onDenied);

  const applicants = useRecruitmentDirectory(
    listApplicants,
    onDenied,
    canReadApplicants,
  );

  const [counts, setCounts] = useState<RecruitmentSummary | null>(null);

  const [countsError, setCountsError] = useState("");

  const [countsLoading, setCountsLoading] = useState(true);

  const countsSequence = useRef(0);

  const mounted = useRef(false);

  const writeLock = useRef(false);

  const [busy, setBusy] = useState("");

  const [feedback, setFeedback] = useState<{
    error: boolean;
    text: string;
  } | null>(null);

  const [jobFilter, setJobFilter] = useState({ q: "", status: "" });

  const [applicantFilter, setApplicantFilter] = useState({ q: "", status: "" });

  const [roleFilter, setRoleFilter] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const [jobForm, setJobForm] = useState({
    title: "",
    employment_type: "",
    location: "",
    description: "",
  });

  const [selected, setSelected] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});

  const [reviewLoading, setReviewLoading] = useState(false);

  const reviewSequence = useRef(0);

  const draft = selected ? drafts[selected] : null;

  const readCounts = useCallback(async () => {
    const request = ++countsSequence.current;

    setCountsLoading(true);

    setCountsError("");

    setCounts(null);

    try {
      const result = await getRecruitmentSummary();

      if (mounted.current && request === countsSequence.current) {
        setCounts(result);
      }
    } catch (error) {
      if (!mounted.current || request !== countsSequence.current) {
        return;
      }

      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        onDenied();
      } else {
        setCountsError(errorText(error));
      }
    } finally {
      if (mounted.current && request === countsSequence.current) {
        setCountsLoading(false);
      }
    }
  }, [onDenied]);

  const refresh = useCallback(() => {
    jobs.refresh();

    applicants.refresh();

    void readCounts();
  }, [jobs.refresh, applicants.refresh, readCounts]);

  useEffect(() => {
    mounted.current = true;

    void readCounts();

    window.addEventListener("focus", refresh);

    return () => {
      mounted.current = false;

      countsSequence.current++;

      reviewSequence.current++;

      window.removeEventListener("focus", refresh);
    };
  }, [readCounts, refresh]);

  useEffect(() => {
    const rows = applicants.data?.results;

    if (!rows?.length) {
      return;
    }

    if (!selected) {
      const first = rows[0];

      const id = String(first.id);

      setSelected(id);

      setDrafts((value) => {
        return { ...value, [id]: reviewDraft(first) };
      });

      return;
    }

    const latest = rows.find((row) => {
      return String(row.id) === selected;
    });

    if (latest) {
      setDrafts((value) => {
        return value[selected]
          ? { ...value, [selected]: observeReview(value[selected], latest) }
          : value;
      });
    }
  }, [applicants.data, selected]);

  function selectApplicant(row: Applicant) {
    const id = String(row.id);

    reviewSequence.current++;

    setReviewLoading(false);

    setSelected(id);

    setFeedback(null);

    setDrafts((value) => {
      return {
        ...value,
        [id]: value[id] ? observeReview(value[id], row) : reviewDraft(row),
      };
    });
  }

  function editReview(change: Partial<Pick<ReviewDraft, "notes" | "status">>) {
    if (selected) {
      setDrafts((value) => {
        return {
          ...value,
          [selected]: { ...value[selected], ...change },
        };
      });
    }
  }

  async function loadLatest() {
    if (!draft || reviewLoading || writeLock.current) {
      return;
    }

    const id = String(draft.base.id);

    const request = ++reviewSequence.current;

    setReviewLoading(true);

    setFeedback(null);

    try {
      const latest = await getApplicant(id);

      if (!mounted.current || request !== reviewSequence.current) {
        return;
      }

      setDrafts((value) => {
        return {
          ...value,
          [id]: observeReview(value[id], latest),
        };
      });

      setFeedback({
        error: false,
        text: "Latest review loaded. Your draft is retained; compare any newer review before saving.",
      });
    } catch (error) {
      if (mounted.current && request === reviewSequence.current) {
        handleError(error);
      }
    } finally {
      if (mounted.current && request === reviewSequence.current) {
        setReviewLoading(false);
      }
    }
  }

  function handleError(error: unknown) {
    if (error instanceof ApiError && [401, 403].includes(error.status)) {
      onDenied();
    } else {
      setFeedback({ error: true, text: errorText(error) });
    }
  }

  async function write(label: string, run: () => Promise<void>) {
    if (writeLock.current) {
      return;
    }

    writeLock.current = true;

    setBusy(label);

    setFeedback(null);

    try {
      await run();
    } catch (error) {
      if (mounted.current) {
        handleError(error);
      }
    } finally {
      writeLock.current = false;

      if (mounted.current) {
        setBusy("");
      }
    }
  }

  async function addJob() {
    const input = { ...jobForm };

    await write("publish", async () => {
      await createJob(input);

      if (!mounted.current) {
        return;
      }

      setJobForm({
        title: "",
        employment_type: "",
        location: "",
        description: "",
      });

      setFeedback({
        error: false,
        text: "Opening published on the public job board.",
      });

      refresh();
    });
  }

  async function toggleJob(row: JobOpening) {
    await write(`job-${row.id}`, async () => {
      await updateJob(row.id, {
        ...row,
        is_open: !row.is_open,
        version: row.version,
      });

      if (!mounted.current) {
        return;
      }

      setFeedback({
        error: false,
        text: row.is_open
          ? "Opening closed on the public job board."
          : "Opening reopened on the public job board.",
      });

      refresh();
    });
  }

  async function saveReview() {
    if (!draft || draft.conflict || reviewLoading || !reviewDirty(draft)) {
      return;
    }

    const captured = draft;

    const id = String(captured.base.id);

    await write(`review-${id}`, async () => {
      try {
        const saved = await updateApplicant(id, {
          status: captured.status,
          reviewer_notes: captured.notes,
          version: captured.base.version,
        });

        if (!mounted.current) {
          return;
        }

        setDrafts((value) => {
          return { ...value, [id]: reviewDraft(saved) };
        });

        setFeedback({
          error: false,
          text: `${captured.base.full_name}'s review was saved.`,
        });

        refresh();
      } catch (error) {
        if (
          mounted.current &&
          error instanceof ApiError &&
          error.status === 409
        ) {
          setDrafts((value) => {
            return {
              ...value,
              [id]: { ...value[id], conflict: true },
            };
          });
        }

        throw error;
      }
    });
  }

  const disabled = Boolean(busy);

  const offPage = Boolean(
    draft &&
    applicants.data &&
    !applicants.data.results.some((row) => {
      return String(row.id) === selected;
    }),
  );

  return (
    <>
      {feedback && (
        <p
          className={feedback.error ? styles.error : styles.success}
          role={feedback.error ? "alert" : "status"}
        >
          {feedback.text}
        </p>
      )}
      <section aria-label="Recruitment summary">
        <div className={styles.panelHeading}>
          <p>Counts cover all roles and applicants.</p>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={disabled}
            onClick={refresh}
          >
            Refresh recruitment
          </button>
        </div>
        {countsError ? (
          <p className={styles.error} role="alert">
            {countsError}{" "}
            <button
              type="button"
              onClick={() => {
                return void readCounts();
              }}
            >
              Retry counts
            </button>
          </p>
        ) : (
          <div className={styles.metrics} aria-busy={countsLoading}>
            {[
              { label: "Open roles", value: counts?.openJobs, Icon: Briefcase },
              {
                label: "Applicants",
                value: counts?.applicants,
                Icon: UsersThree,
              },
              {
                label: "Awaiting review",
                value: counts?.awaitingReview,
                Icon: MagnifyingGlass,
              },
            ].map(({ label, value, Icon }) => {
              return (
                <article key={label}>
                  <Icon aria-hidden="true" />
                  <div>
                    <span>{label}</span>
                    <strong>{value === undefined ? "…" : value}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <section className={styles.panel} aria-labelledby="publish-job-heading">
        <div className={styles.panelHeading}>
          <div>
            <span>Public board</span>
            <h2 id="publish-job-heading">Post a job opening</h2>
          </div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();

            void addJob();
          }}
        >
          <fieldset disabled={disabled} className={styles.jobForm}>
            <label>
              <span>Job title</span>
              <input
                required
                minLength={2}
                maxLength={160}
                value={jobForm.title}
                onChange={(event) => {
                  return setJobForm({ ...jobForm, title: event.target.value });
                }}
              />
            </label>
            <label>
              <span>Employment type</span>
              <input
                maxLength={60}
                value={jobForm.employment_type}
                onChange={(event) => {
                  return setJobForm({
                    ...jobForm,
                    employment_type: event.target.value,
                  });
                }}
              />
            </label>
            <label>
              <span>Location</span>
              <input
                maxLength={120}
                value={jobForm.location}
                onChange={(event) => {
                  return setJobForm({
                    ...jobForm,
                    location: event.target.value,
                  });
                }}
              />
            </label>
            <label className={styles.wideField}>
              <span>Role description</span>
              <textarea
                aria-label="Role description"
                rows={5}
                maxLength={4000}
                value={jobForm.description}
                onChange={(event) => {
                  return setJobForm({
                    ...jobForm,
                    description: event.target.value,
                  });
                }}
              />
            </label>
            <button className={styles.primaryButton} type="submit">
              <Plus aria-hidden="true" />
              {busy === "publish" ? "Publishing…" : "Publish opening"}
            </button>
          </fieldset>
        </form>
      </section>
      <JobOpeningsPanel
        disabled={disabled}
        jobs={jobs}
        jobFilter={jobFilter}
        setJobFilter={setJobFilter}
        toggleJob={toggleJob}
        busy={busy}
        setRoleFilter={setRoleFilter}
        setApplicantFilter={setApplicantFilter}
        applicants={applicants}
      />
      {canReadApplicants ? (
        <ApplicantReviewPanel
          disabled={disabled}
          applicants={applicants}
          applicantFilter={applicantFilter}
          roleFilter={roleFilter}
          setApplicantFilter={setApplicantFilter}
          setRoleFilter={setRoleFilter}
          selected={selected}
          selectApplicant={selectApplicant}
          drafts={drafts}
          draft={draft}
          offPage={offPage}
          reviewLoading={reviewLoading}
          setDrafts={setDrafts}
          loadLatest={loadLatest}
          saveReview={saveReview}
          editReview={editReview}
          busy={busy}
        />
      ) : (
        <section className={styles.noAccess}>
          <UsersThree aria-hidden="true" />
          <h2>Owner approval required</h2>
          <p>
            Applicant records, review notes and attachments require confidential
            HR access. You can continue managing job openings.
          </p>
        </section>
      )}
    </>
  );
}
