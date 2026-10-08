"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowSquareOut,
  Briefcase,
  CheckCircle,
  FileText,
  FloppyDisk,
  IdentificationCard,
  MagnifyingGlass,
  MapPin,
  Plus,
  UsersThree,
} from "@phosphor-icons/react";
import {
  createAgent,
  createJob,
  getApplicantAttachmentUrl,
  listAgents,
  listApplicants,
  listJobs,
  updateApplicant,
  updateJob,
  type AgentRecord,
  type Applicant,
  type JobOpening,
} from "@/lib/api";
import { can, useMe } from "@/lib/useMe";
import styles from "./recruitment.module.css";
import { TYPESCRIPT_API } from "@/lib/backend";
import RecruitmentWorkspace from "./RecruitmentWorkspace";

const APPLICANT_STATUSES = [
  ["received", "Received"],
  ["reviewing", "Reviewing"],
  ["shortlisted", "Shortlisted"],
  ["rejected", "Not selected"],
  ["hired", "Hired"],
] as const;

type Feedback = { kind: "error" | "success"; message: string } | null;

export default function RecruitmentPage() {
  const me = useMe();
  if (!me) return <p role="status">Loading recruitment access…</p>;
  if (TYPESCRIPT_API) {
    const canRecruit = can(me, "RECRUITMENT_MANAGE"); const canAgents = can(me, "AGENT_MANAGE");
    const canReadApplicants = canRecruit && can(me, "HR_CONFIDENTIAL");
    return <RecruitmentWorkspace key={`${me.id}:${canRecruit}:${canAgents}:${canReadApplicants}`} canRecruit={canRecruit} canAgents={canAgents} canReadApplicants={canReadApplicants} />;
  }
  return <LegacyRecruitmentPage me={me} />;
}

function LegacyRecruitmentPage({ me }: { me: NonNullable<ReturnType<typeof useMe>> }) {
  const canRecruit = can(me, "RECRUITMENT_MANAGE");
  const canAgents = can(me, "AGENT_MANAGE");
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobForm, setJobForm] = useState({ title: "", employment_type: "", location: "", description: "" });
  const [reviewForm, setReviewForm] = useState({ status: "received", reviewer_notes: "" });
  const [agentForm, setAgentForm] = useState({ full_name: "", agent_code: "" });

  const load = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    try {
      const [jobPage, applicantPage, agentPage] = await Promise.all([
        canRecruit ? listJobs() : Promise.resolve(null),
        canRecruit ? listApplicants() : Promise.resolve(null),
        canAgents ? listAgents() : Promise.resolve(null),
      ]);
      if (jobPage) setJobs(jobPage.results);
      if (applicantPage) {
        setApplicants(applicantPage.results);
        setSelectedApplicantId((current) => {
          if (current && applicantPage.results.some((item) => String(item.id) === current)) return current;
          return applicantPage.results[0] ? String(applicantPage.results[0].id) : null;
        });
      }
      if (agentPage) setAgents(agentPage.results);
    } catch (caught) {
      setFeedback({ kind: "error", message: caught instanceof Error ? caught.message : "Recruitment data could not be loaded." });
    } finally {
      setLoading(false);
    }
  }, [canAgents, canRecruit, me]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedApplicant = useMemo(
    () => applicants.find((applicant) => String(applicant.id) === selectedApplicantId) ?? null,
    [applicants, selectedApplicantId],
  );

  useEffect(() => {
    if (!selectedApplicant) return;
    setReviewForm({ status: selectedApplicant.status, reviewer_notes: selectedApplicant.reviewer_notes });
  }, [selectedApplicant]);

  const filteredApplicants = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applicants.filter((applicant) => {
      if (statusFilter !== "all" && applicant.status !== statusFilter) return false;
      if (!query) return true;
      return [applicant.full_name, applicant.email, applicant.job_title]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [applicants, search, statusFilter]);

  function showSuccess(message: string) {
    setFeedback({ kind: "success", message });
  }

  async function addJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("create-job");
    setFeedback(null);
    try {
      await createJob(jobForm);
      setJobForm({ title: "", employment_type: "", location: "", description: "" });
      showSuccess("The opening is live on the public job board.");
      await load();
    } catch (caught) {
      setFeedback({ kind: "error", message: caught instanceof Error ? caught.message : "The opening could not be posted." });
    } finally {
      setBusy(null);
    }
  }

  async function toggleJob(job: JobOpening) {
    setBusy(`job-${job.id}`);
    setFeedback(null);
    try {
      await updateJob(job.id, { ...job, is_open: !job.is_open, version: job.version });
      showSuccess(job.is_open ? "The opening is now hidden from the public board." : "The opening is live on the public board.");
      await load();
    } catch (caught) {
      setFeedback({ kind: "error", message: caught instanceof Error ? caught.message : "The opening could not be updated." });
    } finally {
      setBusy(null);
    }
  }

  async function saveReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedApplicant) return;
    setBusy(`applicant-${selectedApplicant.id}`);
    setFeedback(null);
    try {
      await updateApplicant(selectedApplicant.id, {
        status: reviewForm.status,
        reviewer_notes: reviewForm.reviewer_notes,
        version: selectedApplicant.version,
      });
      showSuccess(`${selectedApplicant.full_name}'s review was saved.`);
      await load();
    } catch (caught) {
      setFeedback({ kind: "error", message: caught instanceof Error ? caught.message : "The applicant review could not be saved." });
    } finally {
      setBusy(null);
    }
  }

  async function addAgent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("create-agent");
    setFeedback(null);
    try {
      await createAgent({ ...agentForm, is_active: true });
      setAgentForm({ full_name: "", agent_code: "" });
      showSuccess("The agent verification record was added.");
      await load();
    } catch (caught) {
      setFeedback({ kind: "error", message: caught instanceof Error ? caught.message : "The agent could not be added." });
    } finally {
      setBusy(null);
    }
  }

  if (me && !canRecruit && !canAgents) {
    return (
      <section className={styles.noAccess}>
        <Briefcase weight="duotone" aria-hidden="true" />
        <h1>No recruitment access</h1>
        <p>Your role does not manage job openings, applications, or agent records.</p>
      </section>
    );
  }

  const openJobs = jobs.filter((job) => job.is_open).length;
  const awaitingReview = applicants.filter((applicant) => applicant.status === "received" || applicant.status === "reviewing").length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>People operations</span>
          <h1>Recruitment</h1>
          <p>Publish roles, review every application, and keep the public job board current.</p>
        </div>
        <Link href="/#careers" target="_blank" className={styles.publicLink}>
          View public job board <ArrowSquareOut aria-hidden="true" />
        </Link>
      </header>

      {feedback && (
        <div className={feedback.kind === "error" ? styles.error : styles.success} role={feedback.kind === "error" ? "alert" : "status"}>
          {feedback.kind === "success" && <CheckCircle weight="fill" aria-hidden="true" />}
          {feedback.message}
        </div>
      )}

      {canRecruit && (
        <>
          <section className={styles.metrics} aria-label="Recruitment summary">
            <article><Briefcase weight="duotone" aria-hidden="true" /><div><span>Open roles</span><strong>{openJobs}</strong></div></article>
            <article><UsersThree weight="duotone" aria-hidden="true" /><div><span>Applicants</span><strong>{applicants.length}</strong></div></article>
            <article><MagnifyingGlass weight="duotone" aria-hidden="true" /><div><span>Awaiting review</span><strong>{awaitingReview}</strong></div></article>
          </section>

          <section className={styles.panel} aria-labelledby="publish-job-heading">
            <div className={styles.panelHeading}>
              <div><span>Public board</span><h2 id="publish-job-heading">Post a job opening</h2></div>
              <p>New openings appear on the landing page immediately.</p>
            </div>
            <form onSubmit={addJob} className={styles.jobForm}>
              <label><span>Job title</span><input required minLength={2} maxLength={160} value={jobForm.title} onChange={(event) => setJobForm({ ...jobForm, title: event.target.value })} placeholder="Customer support specialist" /></label>
              <label><span>Employment type</span><input maxLength={60} value={jobForm.employment_type} onChange={(event) => setJobForm({ ...jobForm, employment_type: event.target.value })} placeholder="Full-time" /></label>
              <label><span>Location</span><input maxLength={120} value={jobForm.location} onChange={(event) => setJobForm({ ...jobForm, location: event.target.value })} placeholder="Capas, Tarlac" /></label>
              <label className={styles.wideField}><span>Role description</span><textarea rows={5} maxLength={4000} value={jobForm.description} onChange={(event) => setJobForm({ ...jobForm, description: event.target.value })} placeholder="Describe the work, who will thrive in it, and the next step." /></label>
              <button type="submit" className={styles.primaryButton} disabled={busy === "create-job"}><Plus weight="bold" aria-hidden="true" />{busy === "create-job" ? "Publishing…" : "Publish opening"}</button>
            </form>
          </section>

          <section className={styles.panel} aria-labelledby="job-list-heading">
            <div className={styles.panelHeading}>
              <div><span>Visibility</span><h2 id="job-list-heading">Job openings</h2></div>
              <p>Close a role to remove it from the public board without deleting its applicants.</p>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>Role</th><th>Work setup</th><th className={styles.numberCell}>Applicants</th><th>Status</th><th><span className={styles.srOnly}>Action</span></th></tr></thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td><strong>{job.title}</strong><small>{job.description || "No description added"}</small></td>
                      <td>{job.location ? <span className={styles.location}><MapPin weight="fill" aria-hidden="true" />{job.location}</span> : "—"}<small>{job.employment_type || "Type not set"}</small></td>
                      <td className={styles.numberCell}>{job.applicant_count ?? 0}</td>
                      <td><span className={job.is_open ? styles.openStatus : styles.closedStatus}>{job.is_open ? "Open" : "Closed"}</span></td>
                      <td className={styles.actionCell}><button type="button" onClick={() => toggleJob(job)} disabled={busy === `job-${job.id}`}>{busy === `job-${job.id}` ? "Saving…" : job.is_open ? "Close role" : "Reopen"}</button></td>
                    </tr>
                  ))}
                  {!loading && jobs.length === 0 && <tr><td colSpan={5} className={styles.emptyCell}>No openings yet. Publish the first role above.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="applicants-heading">
            <div className={styles.panelHeading}>
              <div><span>Review queue</span><h2 id="applicants-heading">Applicants</h2></div>
              <p>Select an applicant to review their details and update the hiring status.</p>
            </div>
            <div className={styles.filters}>
              <label><span className={styles.srOnly}>Search applicants</span><MagnifyingGlass aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, or role" /></label>
              <label><span className={styles.srOnly}>Filter by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{APPLICANT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
            <div className={styles.reviewWorkspace}>
              <div className={styles.applicantList} aria-label="Applicants">
                {filteredApplicants.map((applicant) => (
                  <button key={applicant.id} type="button" className={String(applicant.id) === selectedApplicantId ? styles.selectedApplicant : ""} onClick={() => setSelectedApplicantId(String(applicant.id))}>
                    <span className={styles.avatar} aria-hidden="true">{initials(applicant.full_name)}</span>
                    <span><strong>{applicant.full_name}</strong><small>{applicant.job_title || "Role unavailable"} · {formatDate(applicant.created_at)}</small></span>
                    <span className={styles.compactStatus}>{statusLabel(applicant.status)}</span>
                  </button>
                ))}
                {!loading && filteredApplicants.length === 0 && <div className={styles.emptyList}><UsersThree weight="duotone" aria-hidden="true" /><strong>No matching applicants</strong><p>Try clearing the search or status filter.</p></div>}
              </div>

              <div className={styles.reviewDetail}>
                {selectedApplicant ? (
                  <>
                    <div className={styles.applicantHeader}>
                      <div><span>Applicant</span><h3>{selectedApplicant.full_name}</h3><p>{selectedApplicant.job_title || "Role unavailable"}</p></div>
                      <span className={styles.compactStatus}>{statusLabel(selectedApplicant.status)}</span>
                    </div>
                    <dl className={styles.contactGrid}>
                      <div><dt>Email</dt><dd><a href={`mailto:${selectedApplicant.email}`}>{selectedApplicant.email}</a></dd></div>
                      <div><dt>Phone</dt><dd>{selectedApplicant.phone ? <a href={`tel:${selectedApplicant.phone}`}>{selectedApplicant.phone}</a> : "Not provided"}</dd></div>
                      <div><dt>Applied</dt><dd>{formatDate(selectedApplicant.created_at)}</dd></div>
                    </dl>
                    <section className={styles.messageBlock}><h4>Applicant message</h4><p>{selectedApplicant.message || "No message provided."}</p></section>
                    <section className={styles.attachments} aria-labelledby="attachments-heading">
                      <h4 id="attachments-heading">Attachments</h4>
                      {selectedApplicant.attachments?.length ? selectedApplicant.attachments.map((attachment) => (
                        <a key={attachment.id} href={getApplicantAttachmentUrl(attachment.id)} target="_blank" rel="noopener noreferrer"><FileText weight="duotone" aria-hidden="true" /><span><strong>{attachment.storedFile.originalName}</strong><small>{formatFileSize(attachment.storedFile.size)}</small></span><ArrowSquareOut aria-hidden="true" /></a>
                      )) : <p>No attachment provided.</p>}
                    </section>
                    <form onSubmit={saveReview} className={styles.reviewForm}>
                      <label><span>Hiring status</span><select value={reviewForm.status} onChange={(event) => setReviewForm({ ...reviewForm, status: event.target.value })}>{APPLICANT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                      <label><span>Internal review notes</span><textarea rows={5} maxLength={4000} value={reviewForm.reviewer_notes} onChange={(event) => setReviewForm({ ...reviewForm, reviewer_notes: event.target.value })} placeholder="Add interview notes or the next action. These notes are never shown publicly." /></label>
                      <button type="submit" className={styles.primaryButton} disabled={busy === `applicant-${selectedApplicant.id}`}><FloppyDisk weight="bold" aria-hidden="true" />{busy === `applicant-${selectedApplicant.id}` ? "Saving…" : "Save review"}</button>
                    </form>
                  </>
                ) : (
                  <div className={styles.emptyDetail}><UsersThree weight="duotone" aria-hidden="true" /><strong>Select an applicant</strong><p>Their application and review controls will appear here.</p></div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {canAgents && (
        <section className={styles.panel} aria-labelledby="agents-heading">
          <div className={styles.panelHeading}><div><span>Public verification</span><h2 id="agents-heading">Agent records</h2></div><p>Only active status, name, and a masked code are exposed publicly.</p></div>
          <form onSubmit={addAgent} className={styles.agentForm}>
            <label><span>Agent full name</span><input required value={agentForm.full_name} onChange={(event) => setAgentForm({ ...agentForm, full_name: event.target.value })} /></label>
            <label><span>Agent code</span><input required value={agentForm.agent_code} onChange={(event) => setAgentForm({ ...agentForm, agent_code: event.target.value })} placeholder="AG-2026-0042" /></label>
            <button type="submit" className={styles.secondaryButton} disabled={busy === "create-agent"}><Plus weight="bold" aria-hidden="true" />{busy === "create-agent" ? "Adding…" : "Add agent"}</button>
          </form>
          <ul className={styles.agentList}>{agents.map((agent) => <li key={agent.id}><IdentificationCard weight="duotone" aria-hidden="true" /><strong>{agent.full_name}</strong><span>{agent.agent_code}</span><span className={agent.is_active ? styles.openStatus : styles.closedStatus}>{agent.is_active ? "Active" : "Inactive"}</span></li>)}{!loading && agents.length === 0 && <li className={styles.emptyAgent}>No agent records yet.</li>}</ul>
        </section>
      )}
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function statusLabel(status: string) {
  return APPLICANT_STATUSES.find(([value]) => value === status)?.[1] ?? status;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
