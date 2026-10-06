"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle,
  FileArrowUp,
  MapPin,
  PaperPlaneTilt,
  ShieldCheck,
} from "@phosphor-icons/react";
import { applyToJob, getCareers, type JobOpening } from "@/lib/api";
import styles from "./careers.module.css";

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ACCEPTED_ATTACHMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

type LoadState = "loading" | "ready" | "error";

export default function CareersPage() {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [form, setForm] = useState({ job: "", full_name: "", email: "", phone: "", message: "" });
  const [attachment, setAttachment] = useState<File | undefined>();
  const [fileInputKey, setFileInputKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const selectedJob = useMemo(
    () => jobs.find((job) => String(job.id) === form.job),
    [form.job, jobs],
  );

  const loadJobs = useCallback(async () => {
    setLoadState("loading");
    try {
      const openings = await getCareers();
      setJobs(openings);
      const requestedJob = new URLSearchParams(window.location.search).get("job");
      if (requestedJob && openings.some((job) => String(job.id) === requestedJob)) {
        setForm((current) => ({ ...current, job: requestedJob }));
      }
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  function chooseRole(job: JobOpening) {
    setForm((current) => ({ ...current, job: String(job.id) }));
    setNotice(null);
    setError(null);
  }

  function chooseAttachment(file?: File) {
    setError(null);
    if (!file) {
      setAttachment(undefined);
      return;
    }
    if (!ACCEPTED_ATTACHMENT_TYPES.includes(file.type)) {
      setAttachment(undefined);
      setFileInputKey((value) => value + 1);
      setError("Attach a PDF, JPG, PNG, or WebP file.");
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachment(undefined);
      setFileInputKey((value) => value + 1);
      setError("The attachment must be 5 MB or smaller.");
      return;
    }
    setAttachment(file);
  }

  async function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      await applyToJob({
        job: form.job,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        message: form.message,
      }, attachment);
      setNotice(`Application sent for ${selectedJob?.title ?? "the selected role"}. Our team will review it.`);
      setForm((current) => ({ ...current, full_name: "", email: "", phone: "", message: "" }));
      setAttachment(undefined);
      setFileInputKey((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't submit your application. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/#careers" className={styles.backLink}>
          <ArrowLeft aria-hidden="true" /> Back to Fresh Phones PH
        </Link>

        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Careers at Fresh Phones PH</span>
            <h1>Find work where <span className="holo-text">people come first.</span></h1>
            <p>Review every open role, choose the right fit, and send one focused application to our recruitment team.</p>
          </div>
          <div className={styles.promise}>
            <ShieldCheck weight="duotone" aria-hidden="true" />
            <div><strong>Human-reviewed applications</strong><span>No automated hiring decisions.</span></div>
          </div>
        </header>

        <section className={styles.openings} aria-labelledby="openings-heading" aria-live="polite" aria-busy={loadState === "loading"}>
          <div className={styles.sectionHeading}>
            <div><span>Current opportunities</span><h2 id="openings-heading">Open roles</h2></div>
            {loadState === "ready" && <p>{jobs.length} {jobs.length === 1 ? "opening" : "openings"}</p>}
          </div>

          {loadState === "loading" && <div className={styles.loading} aria-label="Loading job openings"><span /><span /></div>}
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
          {loadState === "ready" && jobs.length > 0 && (
            <div className={styles.jobList}>
              {jobs.map((job) => {
                const selected = String(job.id) === form.job;
                return (
                  <article key={job.id} className={selected ? styles.selectedJob : styles.jobCard}>
                    <div className={styles.jobTopline}>
                      <div className={styles.jobIcon}><Briefcase weight="fill" aria-hidden="true" /></div>
                      <div>
                        <h3>{job.title}</h3>
                        <div className={styles.meta}>
                          {job.employment_type && <span>{job.employment_type}</span>}
                          {job.location && <span><MapPin weight="fill" aria-hidden="true" />{job.location}</span>}
                        </div>
                      </div>
                    </div>
                    {job.description && <p className={styles.description}>{job.description}</p>}
                    <a href="#application" onClick={() => chooseRole(job)} aria-current={selected ? "true" : undefined}>
                      {selected ? <><CheckCircle weight="fill" aria-hidden="true" /> Selected</> : <>Apply for this role <ArrowRight weight="bold" aria-hidden="true" /></>}
                    </a>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section id="application" className={styles.application} aria-labelledby="application-heading">
          <div className={styles.applicationIntro}>
            <span className={styles.eyebrow}>Application</span>
            <h2 id="application-heading">Tell us how to reach you.</h2>
            <p>Required fields are marked. Your details are used only to review and respond to this application.</p>
            {selectedJob && (
              <div className={styles.selectedSummary}>
                <CheckCircle weight="fill" aria-hidden="true" />
                <div><span>Applying for</span><strong>{selectedJob.title}</strong></div>
              </div>
            )}
          </div>

          <form onSubmit={apply} className={styles.form}>
            <div className={styles.formGrid}>
              <label className={styles.fullField}>
                <span>Role <em>Required</em></span>
                <select required value={form.job} onChange={(event) => setForm({ ...form, job: event.target.value })}>
                  <option value="">Choose an open role</option>
                  {jobs.map((job) => <option key={job.id} value={String(job.id)}>{job.title}</option>)}
                </select>
              </label>
              <label>
                <span>Full name <em>Required</em></span>
                <input required autoComplete="name" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
              </label>
              <label>
                <span>Email address <em>Required</em></span>
                <input type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </label>
              <label className={styles.fullField}>
                <span>Phone number <small>Optional</small></span>
                <input type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="e.g. 09XX XXX XXXX" />
              </label>
              <label className={styles.fullField}>
                <span>Why are you interested? <small>Optional</small></span>
                <textarea rows={5} maxLength={4000} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Share relevant experience or what interests you about this role." />
              </label>
              <label className={`${styles.fullField} ${styles.fileField}`}>
                <span>Résumé or portfolio <small>Optional</small></span>
                <span className={styles.fileControl}>
                  <FileArrowUp weight="duotone" aria-hidden="true" />
                  <span><strong>{attachment?.name ?? "Choose a file"}</strong><small>PDF, JPG, PNG, or WebP · up to 5 MB</small></span>
                  <input key={fileInputKey} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => chooseAttachment(event.currentTarget.files?.[0])} />
                </span>
              </label>
            </div>

            {(error || notice) && (
              <div className={error ? styles.error : styles.success} role={error ? "alert" : "status"}>
                {error ? error : <><CheckCircle weight="fill" aria-hidden="true" />{notice}</>}
              </div>
            )}

            <button type="submit" className={styles.submit} disabled={sending || loadState !== "ready" || jobs.length === 0}>
              <PaperPlaneTilt weight="fill" aria-hidden="true" /> {sending ? "Sending application…" : "Send application"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
