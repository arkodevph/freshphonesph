"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Clock,
  MagnifyingGlass,
  MapPin,
  ShieldCheck,
  UsersThree,
} from "@phosphor-icons/react";
import { getCareers, type JobOpening } from "@/lib/api";
import styles from "./careers.module.css";

type LoadState = "loading" | "ready" | "error";

export default function CareersBoard() {
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
    const refresh = () => { if (document.visibilityState === "visible") void loadJobs(); };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [loadJobs]);

  const types = useMemo(
    () => Array.from(new Set(jobs.map((job) => job.employment_type).filter(Boolean))).sort(),
    [jobs],
  );
  const locations = useMemo(
    () => Array.from(new Set(jobs.map((job) => job.location).filter(Boolean))).sort(),
    [jobs],
  );
  const filteredJobs = useMemo(() => {
    const search = query.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesSearch = !search || [job.title, job.description, job.location, job.employment_type]
        .some((value) => value.toLowerCase().includes(search));
      return matchesSearch
        && (type === "all" || job.employment_type === type)
        && (location === "all" || job.location === location);
    });
  }, [jobs, location, query, type]);

  const clearFilters = () => {
    setQuery("");
    setType("all");
    setLocation("all");
  };

  return (
    <section className={styles.boardPage} aria-labelledby="careers-title">
      <div className={styles.boardShell}>
        <header className={styles.boardHeader}>
          <div className={styles.headerCopy}>
            <span className={styles.eyebrow}>Careers at Fresh Phones PH</span>
            <h1 id="careers-title">Find work that fits you.</h1>
            <p>Help make iPhone and iPad ownership more manageable. Explore opportunities with our growing team.</p>
          </div>
          <div className={styles.reviewNote}>
            <ShieldCheck weight="duotone" aria-hidden="true" />
            <div><strong>People review every application</strong><span>Our recruitment team reviews your experience.</span></div>
          </div>
        </header>

        <section className={styles.openings} aria-labelledby="openings-heading" aria-live="polite" aria-busy={loadState === "loading"}>
          <div className={styles.openingsHeading}>
            <div>
              <h2 id="openings-heading">Open roles</h2>
              <p>Search by role, employment type, or location.</p>
            </div>
            {loadState === "ready" && <span>{filteredJobs.length} of {jobs.length} roles shown</span>}
          </div>

          <div className={styles.filters} aria-label="Filter open roles">
            <label className={styles.searchField}>
              <span className={styles.srOnly}>Search roles</span>
              <MagnifyingGlass aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search roles" />
            </label>
            <label>
              <span className={styles.srOnly}>Employment type</span>
              <select value={type} onChange={(event) => setType(event.target.value)}>
                <option value="all">All types</option>
                {types.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className={styles.srOnly}>Location</span>
              <select value={location} onChange={(event) => setLocation(event.target.value)}>
                <option value="all">All locations</option>
                {locations.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>

          {loadState === "loading" && (
            <div className={styles.loadingGrid} aria-label="Loading job openings">
              {[0, 1, 2, 3, 4, 5].map((item) => <span key={item} />)}
            </div>
          )}

          {loadState === "error" && (
            <div className={styles.stateMessage} role="alert">
              <Briefcase weight="duotone" aria-hidden="true" />
              <strong>Open roles are temporarily unavailable.</strong>
              <p>Check your connection and try loading them again.</p>
              <button type="button" onClick={loadJobs}>Try again</button>
            </div>
          )}

          {loadState === "ready" && jobs.length === 0 && (
            <div className={styles.stateMessage}>
              <Briefcase weight="duotone" aria-hidden="true" />
              <strong>No roles are open right now.</strong>
              <p>Please check back soon for new opportunities.</p>
            </div>
          )}

          {loadState === "ready" && jobs.length > 0 && filteredJobs.length === 0 && (
            <div className={styles.stateMessage}>
              <MagnifyingGlass aria-hidden="true" />
              <strong>No roles match those filters.</strong>
              <p>Clear the filters to see every current opportunity.</p>
              <button type="button" onClick={clearFilters}>Clear filters</button>
            </div>
          )}

          {loadState === "ready" && filteredJobs.length > 0 && (
            <div className={styles.jobGrid}>
              {filteredJobs.map((job) => (
                <article key={job.id} className={styles.jobCard}>
                  <div className={styles.companyLine}>
                    <span className={styles.companyLogo}>
                      <Image src="/brand/fresh-phones-logo.png" alt="" width={44} height={44} />
                    </span>
                    <div><strong>Fresh Phones PH</strong><small>FP Gadget Center</small></div>
                    <span className={styles.openBadge}>Open</span>
                  </div>
                  <h3>{job.title}</h3>
                  <div className={styles.meta}>
                    {job.employment_type && <span><Clock weight="fill" aria-hidden="true" />{job.employment_type}</span>}
                    {job.location && <span><MapPin weight="fill" aria-hidden="true" />{job.location}</span>}
                  </div>
                  {job.description && <p className={styles.description}>{job.description}</p>}
                  <div className={styles.cardFooter}>
                    <span><UsersThree weight="duotone" aria-hidden="true" />Human-reviewed</span>
                    <Link href={`/careers/apply?job=${encodeURIComponent(String(job.id))}`}>
                      Apply <ArrowRight weight="bold" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
