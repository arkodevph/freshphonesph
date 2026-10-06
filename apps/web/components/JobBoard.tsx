"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Briefcase, MapPin, UsersThree } from "@phosphor-icons/react";
import { getCareers, type JobOpening } from "@/lib/api";
import Reveal from "./Reveal";
import styles from "./JobBoard.module.css";

type LoadState = "loading" | "ready" | "error";

export default function JobBoard() {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const loadJobs = useCallback(async () => {
    setState("loading");
    try {
      setJobs(await getCareers());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  return (
    <section id="careers" className={styles.section} aria-labelledby="careers-heading">
      <Reveal className={styles.shell}>
        <div className={styles.intro}>
          <span className={styles.eyebrow}>
            <UsersThree weight="fill" aria-hidden="true" /> Join the team
          </span>
          <h2 id="careers-heading">
            Build better customer journeys with <span className="holo-text">Fresh Phones PH</span>
          </h2>
          <p>
            Explore current openings and apply directly. Every application goes to our recruitment
            team for human review.
          </p>
          <Link href="/careers" className={styles.allRolesLink}>
            View all opportunities <ArrowRight weight="bold" aria-hidden="true" />
          </Link>
        </div>

        <div className={styles.board} aria-live="polite" aria-busy={state === "loading"}>
          {state === "loading" && (
            <div className={styles.skeletonGrid} aria-label="Loading job openings">
              {[0, 1, 2].map((item) => <span key={item} className={styles.skeleton} />)}
            </div>
          )}

          {state === "error" && (
            <div className={styles.message} role="alert">
              <Briefcase weight="duotone" aria-hidden="true" />
              <strong>We couldn&apos;t load the openings.</strong>
              <p>Please check your connection and try again.</p>
              <button type="button" onClick={loadJobs}>Try again</button>
            </div>
          )}

          {state === "ready" && jobs.length === 0 && (
            <div className={styles.message}>
              <Briefcase weight="duotone" aria-hidden="true" />
              <strong>No roles are open right now.</strong>
              <p>Check back soon for new opportunities with the team.</p>
            </div>
          )}

          {state === "ready" && jobs.length > 0 && (
            <div className={styles.jobGrid}>
              {jobs.map((job) => (
                <article key={job.id} className={styles.jobCard}>
                  <div className={styles.jobIcon}><Briefcase weight="fill" aria-hidden="true" /></div>
                  <div className={styles.jobCopy}>
                    <h3>{job.title}</h3>
                    <div className={styles.meta}>
                      {job.employment_type && <span>{job.employment_type}</span>}
                      {job.location && <span><MapPin weight="fill" aria-hidden="true" />{job.location}</span>}
                    </div>
                    {job.description && <p>{job.description}</p>}
                  </div>
                  <Link href={`/careers?job=${encodeURIComponent(String(job.id))}#application`}>
                    View role and apply <ArrowRight weight="bold" aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </Reveal>
    </section>
  );
}
