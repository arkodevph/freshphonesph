"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getCareers, type JobOpening } from "@/lib/api";

type LoadState = "loading" | "ready" | "error";

export function useCareersBoard() {
  const [jobs, setJobs] = useState<JobOpening[]>([]);

  const [loadState, setLoadState] = useState<LoadState>("loading");

  const [query, setQuery] = useState("");

  const [type, setType] = useState("all");

  const [location, setLocation] = useState("all");

  const loadJobs = useCallback(async () => {
    setLoadState("loading");

    try {
      setJobs(await getCareers());

      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const types = useMemo(() => {
    return Array.from(
      new Set(
        jobs
          .map((job) => {
            return job.employment_type;
          })
          .filter(Boolean),
      ),
    ).sort();
  }, [jobs]);

  const locations = useMemo(() => {
    return Array.from(
      new Set(
        jobs
          .map((job) => {
            return job.location;
          })
          .filter(Boolean),
      ),
    ).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const search = query.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesSearch =
        !search ||
        [job.title, job.description, job.location, job.employment_type].some(
          (value) => {
            return value.toLowerCase().includes(search);
          },
        );

      return (
        matchesSearch &&
        (type === "all" || job.employment_type === type) &&
        (location === "all" || job.location === location)
      );
    });
  }, [jobs, location, query, type]);

  const clearFilters = () => {
    setQuery("");

    setType("all");

    setLocation("all");
  };

  const hasFilters = Boolean(
    query.trim() || type !== "all" || location !== "all",
  );

  const status =
    loadState === "loading"
      ? "Checking for open roles…"
      : loadState === "error"
        ? "We couldn’t load the openings. Please try again."
        : jobs.length === 0
          ? "No open roles at the moment."
          : hasFilters
            ? `${filteredJobs.length} of ${jobs.length} roles match your filters.`
            : `${jobs.length} open ${jobs.length === 1 ? "role" : "roles"} to explore.`;

  return {
    jobs,
    loadState,
    query,
    setQuery,
    type,
    setType,
    location,
    setLocation,
    types,
    locations,
    filteredJobs,
    clearFilters,
    hasFilters,
    loadJobs,
    status,
  };
}
