"use client";

import styles from "./recruitment.module.css";
import { useRecruitmentDirectory } from "./useRecruitmentDirectory";

export const statuses = [
  ["received", "Received"],
  ["reviewing", "Reviewing"],
  ["shortlisted", "Shortlisted"],
  ["rejected", "Not selected"],
  ["hired", "Hired"],
] as const;

export const statusName = (status: string) => {
  return (
    statuses.find(([value]) => {
      return value === status;
    })?.[1] ?? status
  );
};

export const date = (value: string) => {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
};

export const errorText = (error: unknown) => {
  return error instanceof Error
    ? error.message
    : "This action could not be completed.";
};

export type Directory<T> = ReturnType<typeof useRecruitmentDirectory<T>>;

export function DirectoryState<T>({
  directory,
  name,
}: {
  directory: Directory<T>;
  name: string;
}) {
  if (directory.loading) {
    return (
      <p className={styles.scopeNote} role="status">
        Loading {name}…
      </p>
    );
  }

  if (directory.error) {
    return (
      <p className={styles.error} role="alert">
        {directory.error}{" "}
        <button type="button" onClick={directory.refresh}>
          Retry {name}
        </button>
      </p>
    );
  }

  return !directory.data?.results.length ? (
    <p className={styles.emptyCell}>
      No matching {name}. Try clearing the filters.
    </p>
  ) : null;
}

export function DirectoryPages<T>({
  directory,
  name,
}: {
  directory: Directory<T>;
  name: string;
}) {
  const total = directory.data?.count;

  const last = Math.max(
    1,
    Math.ceil((total ?? 0) / (directory.data?.page_size ?? 20)),
  );

  return (
    <nav className={styles.pagination} aria-label={name}>
      <span>
        {total === undefined ? "…" : total} matching records · Page{" "}
        {directory.page} of {total === undefined ? "…" : last}
      </span>
      <button
        type="button"
        className={styles.secondaryButton}
        disabled={directory.loading || directory.page <= 1}
        onClick={() => {
          return directory.goTo(directory.page - 1);
        }}
      >
        Previous
      </button>
      <button
        type="button"
        className={styles.secondaryButton}
        disabled={
          directory.loading || !directory.data || directory.page >= last
        }
        onClick={() => {
          return directory.goTo(directory.page + 1);
        }}
      >
        Next
      </button>
    </nav>
  );
}
