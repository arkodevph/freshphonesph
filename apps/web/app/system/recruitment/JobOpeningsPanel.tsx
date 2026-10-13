"use client";

import type { Paginated } from "@/lib/api";
import { type Applicant, type JobOpening } from "@/lib/api";
import type { Dispatch, SetStateAction } from "react";
import { DirectoryPages, DirectoryState } from "./recruitment-view";
import styles from "./recruitment.module.css";

type Props = {
  disabled: boolean;
  jobs: {
    data: Paginated<JobOpening> | null;
    loading: boolean;
    error: string;
    page: number;
    query: Record<string, string>;
    refresh: () => void;
    search: (query: Record<string, string>) => void;
    goTo: (page: number) => void;
  };
  jobFilter: { q: string; status: string };
  setJobFilter: Dispatch<SetStateAction<{ q: string; status: string }>>;
  toggleJob: (row: JobOpening) => Promise<void>;
  busy: string;
  setRoleFilter: Dispatch<SetStateAction<{ id: string; title: string } | null>>;
  setApplicantFilter: Dispatch<SetStateAction<{ q: string; status: string }>>;
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
};

export default function JobOpeningsPanel({
  disabled,
  jobs,
  jobFilter,
  setJobFilter,
  toggleJob,
  busy,
  setRoleFilter,
  setApplicantFilter,
  applicants,
}: Props) {
  return (
    <section className={styles.panel} aria-labelledby="job-list-heading">
      <div className={styles.panelHeading}>
        <div>
          <span>Visibility</span>
          <h2 id="job-list-heading">Job openings</h2>
        </div>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={disabled}
          onClick={jobs.refresh}
        >
          Refresh jobs
        </button>
      </div>
      <form
        className={styles.directoryFilters}
        onSubmit={(event) => {
          event.preventDefault();

          jobs.search({
            ...(jobFilter.q.trim() ? { q: jobFilter.q.trim() } : {}),
            ...(jobFilter.status ? { status: jobFilter.status } : {}),
          });
        }}
      >
        <label>
          Search jobs
          <input
            type="search"
            maxLength={100}
            value={jobFilter.q}
            onChange={(event) => {
              return setJobFilter({ ...jobFilter, q: event.target.value });
            }}
            placeholder="Title, description, location or type"
          />
        </label>
        <label>
          Job status
          <select
            aria-label="Job status"
            value={jobFilter.status}
            onChange={(event) => {
              return setJobFilter({
                ...jobFilter,
                status: event.target.value,
              });
            }}
          >
            <option value="">All openings</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <button type="submit" className={styles.secondaryButton}>
          Search jobs
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => {
            setJobFilter({ q: "", status: "" });

            jobs.search({});
          }}
        >
          Clear job filters
        </button>
      </form>
      <DirectoryState directory={jobs} name="jobs" />
      {jobs.data && (
        <div
          className={styles.tableWrap}
          tabIndex={0}
          role="region"
          aria-label="Job openings table"
        >
          <table>
            <caption>
              {jobs.data.count} matching openings · All pages searched
            </caption>
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">Work setup</th>
                <th scope="col">Applicants</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.data.results.map((row) => {
                return (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.title}</strong>
                      <small>{row.description || "No description added"}</small>
                    </td>
                    <td>
                      {row.location || "—"}
                      <small>{row.employment_type || "Type not set"}</small>
                    </td>
                    <td>{row.applicant_count ?? 0}</td>
                    <td>
                      <span
                        className={
                          row.is_open ? styles.openStatus : styles.closedStatus
                        }
                      >
                        {row.is_open ? "Open" : "Closed"}
                      </span>
                    </td>
                    <td className={styles.actionCell}>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          return void toggleJob(row);
                        }}
                      >
                        {busy === `job-${row.id}`
                          ? "Saving…"
                          : row.is_open
                            ? "Close role"
                            : "Reopen"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const scope = {
                            id: String(row.id),
                            title: row.title,
                          };

                          setRoleFilter(scope);

                          setApplicantFilter({ q: "", status: "" });

                          applicants.search({ jobId: scope.id });
                        }}
                      >
                        View applicants
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <DirectoryPages directory={jobs} name="Job pages" />
    </section>
  );
}
