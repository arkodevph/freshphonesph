"use client";

import type { Paginated } from "@/lib/api";
import { getApplicantAttachmentUrl, type Applicant } from "@/lib/api";
import {
  resolveReview,
  reviewDirty,
  type ReviewDraft,
} from "@/lib/recruitment-review";
import { ArrowSquareOut, FileText, UsersThree } from "@phosphor-icons/react";
import type { Dispatch, SetStateAction } from "react";
import {
  date,
  DirectoryPages,
  DirectoryState,
  statuses,
  statusName,
} from "./recruitment-view";
import styles from "./recruitment.module.css";

type Props = {
  disabled: boolean;
  applicants: {
    data: Paginated<Applicant> | null;
    loading: boolean;
    error: string;
    page: number;
    query: Record<string, string>;
    refresh: () => void;
    search: (query: Record<string, string>) => void;
    goTo: (page: number) => void;
  };
  applicantFilter: { q: string; status: string };
  roleFilter: { id: string; title: string } | null;
  setApplicantFilter: Dispatch<SetStateAction<{ q: string; status: string }>>;
  setRoleFilter: Dispatch<SetStateAction<{ id: string; title: string } | null>>;
  selected: string | null;
  selectApplicant: (row: Applicant) => void;
  drafts: Record<string, ReviewDraft>;
  draft: ReviewDraft | null;
  offPage: boolean;
  reviewLoading: boolean;
  setDrafts: Dispatch<SetStateAction<Record<string, ReviewDraft>>>;
  loadLatest: () => Promise<void>;
  saveReview: () => Promise<void>;
  editReview: (change: Partial<Pick<ReviewDraft, "notes" | "status">>) => void;
  busy: string;
};

export default function ApplicantReviewPanel({
  disabled,
  applicants,
  applicantFilter,
  roleFilter,
  setApplicantFilter,
  setRoleFilter,
  selected,
  selectApplicant,
  drafts,
  draft,
  offPage,
  reviewLoading,
  setDrafts,
  loadLatest,
  saveReview,
  editReview,
  busy,
}: Props) {
  return (
    <section className={styles.panel} aria-labelledby="applicants-heading">
      <div className={styles.panelHeading}>
        <div>
          <span>Review queue</span>
          <h2 id="applicants-heading">Applicants</h2>
        </div>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={disabled}
          onClick={applicants.refresh}
        >
          Refresh applicants
        </button>
      </div>
      <form
        className={styles.directoryFilters}
        onSubmit={(event) => {
          event.preventDefault();

          applicants.search({
            ...(applicantFilter.q.trim()
              ? { q: applicantFilter.q.trim() }
              : {}),
            ...(applicantFilter.status
              ? { status: applicantFilter.status }
              : {}),
            ...(roleFilter ? { jobId: roleFilter.id } : {}),
          });
        }}
      >
        <label>
          Search applicants
          <input
            type="search"
            maxLength={100}
            value={applicantFilter.q}
            onChange={(event) => {
              return setApplicantFilter({
                ...applicantFilter,
                q: event.target.value,
              });
            }}
            placeholder="Name, email or role"
          />
        </label>
        <label>
          Applicant status
          <select
            aria-label="Applicant status"
            value={applicantFilter.status}
            onChange={(event) => {
              return setApplicantFilter({
                ...applicantFilter,
                status: event.target.value,
              });
            }}
          >
            <option value="">All statuses</option>
            {statuses.map(([value, label]) => {
              return (
                <option value={value} key={value}>
                  {label}
                </option>
              );
            })}
          </select>
        </label>
        <button className={styles.secondaryButton} type="submit">
          Search applicants
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => {
            setApplicantFilter({ q: "", status: "" });

            setRoleFilter(null);

            applicants.search({});
          }}
        >
          Clear applicant filters
        </button>
      </form>
      {roleFilter && (
        <p className={styles.scopeNote}>Role filter: {roleFilter.title}</p>
      )}
      <DirectoryState directory={applicants} name="applicants" />
      <DirectoryPages directory={applicants} name="Applicant pages" />
      <div className={styles.reviewWorkspace}>
        <div className={styles.applicantList} aria-label="Applicants">
          {applicants.data?.results.map((row) => {
            return (
              <button
                type="button"
                key={row.id}
                disabled={disabled}
                aria-pressed={String(row.id) === selected}
                className={
                  String(row.id) === selected ? styles.selectedApplicant : ""
                }
                onClick={() => {
                  return selectApplicant(row);
                }}
              >
                <span className={styles.avatar} aria-hidden="true">
                  {row.full_name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => {
                      return part[0];
                    })
                    .join("")}
                </span>
                <span>
                  <strong>{row.full_name}</strong>
                  <small>
                    {row.job_title} · {date(row.created_at)}
                    {drafts[String(row.id)] &&
                    reviewDirty(drafts[String(row.id)])
                      ? " · Draft"
                      : ""}
                  </small>
                </span>
                <span className={styles.compactStatus}>
                  {statusName(row.status)}
                </span>
              </button>
            );
          })}
        </div>
        <div className={styles.reviewDetail}>
          {draft ? (
            <>
              {offPage && (
                <p className={styles.scopeNote}>
                  The selected applicant is outside this page or filter. Their
                  review draft remains open.
                </p>
              )}
              <div className={styles.applicantHeader}>
                <div>
                  <span>Applicant</span>
                  <h3>{draft.base.full_name}</h3>
                  <p>{draft.base.job_title}</p>
                </div>
                <span className={styles.compactStatus}>
                  {statusName(draft.base.status)}
                </span>
              </div>
              <dl className={styles.contactGrid}>
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${draft.base.email}`}>
                      {draft.base.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{draft.base.phone || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Applied</dt>
                  <dd>{date(draft.base.created_at)}</dd>
                </div>
              </dl>
              <section className={styles.messageBlock}>
                <h4>Applicant message</h4>
                <p>{draft.base.message || "No message provided."}</p>
              </section>
              <section
                className={styles.attachments}
                aria-label="Applicant attachments"
              >
                <h4>Attachments</h4>
                {draft.base.attachments?.length ? (
                  draft.base.attachments.map((file) => {
                    return (
                      <a
                        key={file.id}
                        href={getApplicantAttachmentUrl(file.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FileText aria-hidden="true" />
                        <span>
                          <strong>{file.storedFile.originalName}</strong>
                          <small>{file.storedFile.size} bytes</small>
                        </span>
                        <ArrowSquareOut aria-hidden="true" />
                      </a>
                    );
                  })
                ) : (
                  <p>No attachment provided.</p>
                )}
              </section>
              {draft.conflict && (
                <section className={styles.conflict} role="alert">
                  <h4>This applicant has a newer saved review.</h4>
                  <p>
                    Your draft is retained. Compare the latest review before
                    choosing which notes and status to use.
                  </p>
                  {draft.latest ? (
                    <>
                      <p>Latest status: {statusName(draft.latest.status)}</p>
                      <p className={styles.latestNotes}>
                        {draft.latest.reviewer_notes || "No saved notes."}
                      </p>
                      <button
                        className={styles.secondaryButton}
                        type="button"
                        disabled={disabled || reviewLoading}
                        onClick={() => {
                          return setDrafts((value) => {
                            return {
                              ...value,
                              [selected!]: resolveReview(
                                value[selected!],
                                "latest",
                              ),
                            };
                          });
                        }}
                      >
                        Use latest review
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        disabled={disabled || reviewLoading}
                        onClick={() => {
                          return setDrafts((value) => {
                            return {
                              ...value,
                              [selected!]: resolveReview(
                                value[selected!],
                                "draft",
                              ),
                            };
                          });
                        }}
                      >
                        Keep my draft on latest review
                      </button>
                    </>
                  ) : null}
                </section>
              )}
              <button
                className={styles.secondaryButton}
                type="button"
                disabled={disabled || reviewLoading}
                onClick={() => {
                  return void loadLatest();
                }}
              >
                {reviewLoading ? "Loading latest…" : "Load latest review"}
              </button>
              <form
                className={styles.reviewForm}
                onSubmit={(event) => {
                  event.preventDefault();

                  void saveReview();
                }}
              >
                <fieldset
                  disabled={disabled || reviewLoading}
                  className={styles.reviewFields}
                >
                  <label>
                    <span>Hiring status</span>
                    <select
                      aria-label="Hiring status"
                      value={draft.status}
                      onChange={(event) => {
                        return editReview({ status: event.target.value });
                      }}
                    >
                      {statuses.map(([value, label]) => {
                        return (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <label>
                    <span>Internal review notes</span>
                    <textarea
                      aria-label="Internal review notes"
                      rows={5}
                      maxLength={4000}
                      value={draft.notes}
                      onChange={(event) => {
                        return editReview({ notes: event.target.value });
                      }}
                    />
                  </label>
                  <p className={styles.scopeNote}>
                    {reviewDirty(draft)
                      ? "Unsaved review draft. Switching pages or applicants keeps this draft."
                      : "No unsaved review changes."}
                  </p>
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={draft.conflict || !reviewDirty(draft)}
                  >
                    {busy === `review-${selected}` ? "Saving…" : "Save review"}
                  </button>
                </fieldset>
              </form>
            </>
          ) : (
            <div className={styles.emptyDetail}>
              <UsersThree aria-hidden="true" />
              <strong>Select an applicant</strong>
              <p>Their details and review controls will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
