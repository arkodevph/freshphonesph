"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
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

export default function ApplyForm() {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [form, setForm] = useState({ job: "", full_name: "", email: "", phone: "", message: "" });
  const [attachment, setAttachment] = useState<File>();
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

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
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
    <section className={styles.applyPage} aria-labelledby="application-title">
      <div className={styles.applyShell}>
        <Link href="/careers" className={styles.backLink}>
          <ArrowLeft aria-hidden="true" /> Back to open roles
        </Link>

        <div className={styles.applyLayout}>
          <aside className={styles.roleSummary}>
            <div className={styles.roleIntro}>
              <span className={styles.eyebrow}>Application</span>
              <h1 id="application-title">Take the next step.</h1>
              <p>Tell us how to reach you and share the experience most relevant to the role.</p>
            </div>

            <div className={styles.roleContext}>
              {selectedJob ? (
                <article className={styles.selectedRole}>
                  <span className={styles.roleIcon}><Briefcase weight="fill" aria-hidden="true" /></span>
                  <div>
                    <small>Applying for</small>
                    <strong>{selectedJob.title}</strong>
                    <p>
                      {selectedJob.employment_type && <span>{selectedJob.employment_type}</span>}
                      {selectedJob.location && <span><MapPin weight="fill" aria-hidden="true" />{selectedJob.location}</span>}
                    </p>
                  </div>
                </article>
              ) : (
                <div className={styles.chooseRoleNote}>
                  <Briefcase weight="duotone" aria-hidden="true" />
                  <span>Choose an open role in the form to continue.</span>
                </div>
              )}

              <div className={styles.privacyNote}>
                <ShieldCheck weight="duotone" aria-hidden="true" />
                <div><strong>Your details stay with recruitment.</strong><span>We use them only to review and respond to this application.</span></div>
              </div>
            </div>
          </aside>

          <form onSubmit={submitApplication} className={styles.form}>
            <div className={styles.formHeading}>
              <span>Candidate details</span>
              <p>Fields marked required must be completed.</p>
            </div>

            {loadState === "error" && (
              <div className={styles.error} role="alert">
                Open roles could not be loaded. <button type="button" onClick={loadJobs}>Try again</button>
              </div>
            )}

            <div className={styles.formGrid}>
              <label className={styles.fullField}>
                <span>Role <em>Required</em></span>
                <select required disabled={loadState !== "ready"} value={form.job} onChange={(event) => setForm({ ...form, job: event.target.value })}>
                  <option value="">{loadState === "loading" ? "Loading open roles…" : "Choose an open role"}</option>
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

            <button type="submit" className={styles.submit} disabled={sending || loadState !== "ready" || !form.job}>
              <PaperPlaneTilt weight="fill" aria-hidden="true" /> {sending ? "Sending application…" : "Send application"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
