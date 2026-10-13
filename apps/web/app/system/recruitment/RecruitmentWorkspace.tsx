'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowSquareOut,
  Briefcase,
  FileText,
  IdentificationCard,
  MagnifyingGlass,
  Plus,
  UsersThree,
} from '@phosphor-icons/react';
import type { RecruitmentSummary } from '@freshphones/contracts';
import {
  createAgent,
  createJob,
  getApplicant,
  getApplicantAttachmentUrl,
  getRecruitmentSummary,
  listAgents,
  listApplicants,
  listJobs,
  updateApplicant,
  updateJob,
  type AgentRecord,
  type Applicant,
  type JobOpening,
} from '@/lib/api';
import { ApiError } from '@/lib/ts-api';
import {
  observeReview,
  resolveReview,
  reviewDirty,
  reviewDraft,
  type ReviewDraft,
} from '@/lib/recruitment-review';
import { useRecruitmentDirectory } from './useRecruitmentDirectory';
import styles from './recruitment.module.css';

const statuses = [
  ['received', 'Received'],
  ['reviewing', 'Reviewing'],
  ['shortlisted', 'Shortlisted'],
  ['rejected', 'Not selected'],
  ['hired', 'Hired'],
] as const;
const statusName = (status: string) =>
  statuses.find(([value]) => value === status)?.[1] ?? status;
const date = (value: string) =>
  new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeZone: 'Asia/Manila',
  }).format(new Date(value));
const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'This action could not be completed.';

export default function RecruitmentWorkspace({
  canRecruit,
  canAgents,
  canReadApplicants,
}: {
  canRecruit: boolean;
  canAgents: boolean;
  canReadApplicants: boolean;
}) {
  const [denied, setDenied] = useState(false);
  const onDenied = useCallback(() => {
    setDenied(true);
    window.dispatchEvent(new Event('focus'));
  }, []);
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>People operations</span>
          <h1>Recruitment</h1>
          <p>
            Publish roles, review applications, and keep the public job board
            current.
          </p>
        </div>
        <Link href="/careers" target="_blank" className={styles.publicLink}>
          View public job board <ArrowSquareOut aria-hidden="true" />
        </Link>
      </header>
      {canRecruit && !denied ? (
        <RecruitmentDesk key={String(canReadApplicants)} onDenied={onDenied} canReadApplicants={canReadApplicants} />
      ) : (
        (!canAgents || denied) && (
          <section className={styles.noAccess}>
            <Briefcase aria-hidden="true" />
            <h2>No recruitment access</h2>
            <p>
              Your current access does not allow applicant or job management.
            </p>
          </section>
        )
      )}
      {canAgents && <AgentsPanel />}
    </div>
  );
}

function RecruitmentDesk({ onDenied, canReadApplicants }: { onDenied: () => void; canReadApplicants: boolean }) {
  const jobs = useRecruitmentDirectory(listJobs, onDenied);
  const applicants = useRecruitmentDirectory(listApplicants, onDenied, canReadApplicants);
  const [counts, setCounts] = useState<RecruitmentSummary | null>(null);
  const [countsError, setCountsError] = useState('');
  const [countsLoading, setCountsLoading] = useState(true);
  const countsSequence = useRef(0);
  const mounted = useRef(false);
  const writeLock = useRef(false);
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState<{
    error: boolean;
    text: string;
  } | null>(null);
  const [jobFilter, setJobFilter] = useState({ q: '', status: '' });
  const [applicantFilter, setApplicantFilter] = useState({ q: '', status: '' });
  const [roleFilter, setRoleFilter] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [jobForm, setJobForm] = useState({
    title: '',
    employment_type: '',
    location: '',
    description: '',
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [reviewLoading, setReviewLoading] = useState(false);
  const reviewSequence = useRef(0);
  const draft = selected ? drafts[selected] : null;

  const readCounts = useCallback(async () => {
    const request = ++countsSequence.current;
    setCountsLoading(true);
    setCountsError('');
    setCounts(null);
    try {
      const result = await getRecruitmentSummary();
      if (mounted.current && request === countsSequence.current)
        setCounts(result);
    } catch (error) {
      if (!mounted.current || request !== countsSequence.current) return;
      if (error instanceof ApiError && [401, 403].includes(error.status))
        onDenied();
      else setCountsError(errorText(error));
    } finally {
      if (mounted.current && request === countsSequence.current)
        setCountsLoading(false);
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
    window.addEventListener('focus', refresh);
    return () => {
      mounted.current = false;
      countsSequence.current++;
      reviewSequence.current++;
      window.removeEventListener('focus', refresh);
    };
  }, [readCounts, refresh]);
  useEffect(() => {
    const rows = applicants.data?.results;
    if (!rows?.length) return;
    if (!selected) {
      const first = rows[0];
      const id = String(first.id);
      setSelected(id);
      setDrafts((value) => ({ ...value, [id]: reviewDraft(first) }));
      return;
    }
    const latest = rows.find((row) => String(row.id) === selected);
    if (latest)
      setDrafts((value) =>
        value[selected]
          ? { ...value, [selected]: observeReview(value[selected], latest) }
          : value,
      );
  }, [applicants.data, selected]);

  function selectApplicant(row: Applicant) {
    const id = String(row.id);
    reviewSequence.current++;
    setReviewLoading(false);
    setSelected(id);
    setFeedback(null);
    setDrafts((value) => ({
      ...value,
      [id]: value[id] ? observeReview(value[id], row) : reviewDraft(row),
    }));
  }
  function editReview(change: Partial<Pick<ReviewDraft, 'notes' | 'status'>>) {
    if (selected)
      setDrafts((value) => ({
        ...value,
        [selected]: { ...value[selected], ...change },
      }));
  }
  async function loadLatest() {
    if (!draft || reviewLoading || writeLock.current) return;
    const id = String(draft.base.id);
    const request = ++reviewSequence.current;
    setReviewLoading(true);
    setFeedback(null);
    try {
      const latest = await getApplicant(id);
      if (!mounted.current || request !== reviewSequence.current) return;
      setDrafts((value) => ({
        ...value,
        [id]: observeReview(value[id], latest),
      }));
      setFeedback({
        error: false,
        text: 'Latest review loaded. Your draft is retained; compare any newer review before saving.',
      });
    } catch (error) {
      if (mounted.current && request === reviewSequence.current)
        handleError(error);
    } finally {
      if (mounted.current && request === reviewSequence.current)
        setReviewLoading(false);
    }
  }
  function handleError(error: unknown) {
    if (error instanceof ApiError && [401, 403].includes(error.status))
      onDenied();
    else setFeedback({ error: true, text: errorText(error) });
  }
  async function write(label: string, run: () => Promise<void>) {
    if (writeLock.current) return;
    writeLock.current = true;
    setBusy(label);
    setFeedback(null);
    try {
      await run();
    } catch (error) {
      if (mounted.current) handleError(error);
    } finally {
      writeLock.current = false;
      if (mounted.current) setBusy('');
    }
  }
  async function addJob() {
    const input = { ...jobForm };
    await write('publish', async () => {
      await createJob(input);
      if (!mounted.current) return;
      setJobForm({
        title: '',
        employment_type: '',
        location: '',
        description: '',
      });
      setFeedback({
        error: false,
        text: 'Opening published on the public job board.',
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
      if (!mounted.current) return;
      setFeedback({
        error: false,
        text: row.is_open
          ? 'Opening closed on the public job board.'
          : 'Opening reopened on the public job board.',
      });
      refresh();
    });
  }
  async function saveReview() {
    if (!draft || draft.conflict || reviewLoading || !reviewDirty(draft))
      return;
    const captured = draft;
    const id = String(captured.base.id);
    await write(`review-${id}`, async () => {
      try {
        const saved = await updateApplicant(id, {
          status: captured.status,
          reviewer_notes: captured.notes,
          version: captured.base.version,
        });
        if (!mounted.current) return;
        setDrafts((value) => ({ ...value, [id]: reviewDraft(saved) }));
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
        )
          setDrafts((value) => ({
            ...value,
            [id]: { ...value[id], conflict: true },
          }));
        throw error;
      }
    });
  }
  const disabled = Boolean(busy);
  const offPage = Boolean(
    draft &&
      applicants.data &&
      !applicants.data.results.some((row) => String(row.id) === selected),
  );
  return (
    <>
      {feedback && (
        <p
          className={feedback.error ? styles.error : styles.success}
          role={feedback.error ? 'alert' : 'status'}
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
            {countsError}{' '}
            <button type="button" onClick={() => void readCounts()}>
              Retry counts
            </button>
          </p>
        ) : (
          <div className={styles.metrics} aria-busy={countsLoading}>
            {[
              { label: 'Open roles', value: counts?.openJobs, Icon: Briefcase },
              {
                label: 'Applicants',
                value: counts?.applicants,
                Icon: UsersThree,
              },
              {
                label: 'Awaiting review',
                value: counts?.awaitingReview,
                Icon: MagnifyingGlass,
              },
            ].map(({ label, value, Icon }) => (
              <article key={label}>
                <Icon aria-hidden="true" />
                <div>
                  <span>{label}</span>
                  <strong>{value === undefined ? '…' : value}</strong>
                </div>
              </article>
            ))}
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
                onChange={(event) =>
                  setJobForm({ ...jobForm, title: event.target.value })
                }
              />
            </label>
            <label>
              <span>Employment type</span>
              <input
                maxLength={60}
                value={jobForm.employment_type}
                onChange={(event) =>
                  setJobForm({
                    ...jobForm,
                    employment_type: event.target.value,
                  })
                }
              />
            </label>
            <label>
              <span>Location</span>
              <input
                maxLength={120}
                value={jobForm.location}
                onChange={(event) =>
                  setJobForm({ ...jobForm, location: event.target.value })
                }
              />
            </label>
            <label className={styles.wideField}>
              <span>Role description</span>
              <textarea
                aria-label="Role description"
                rows={5}
                maxLength={4000}
                value={jobForm.description}
                onChange={(event) =>
                  setJobForm({ ...jobForm, description: event.target.value })
                }
              />
            </label>
            <button className={styles.primaryButton} type="submit">
              <Plus aria-hidden="true" />
              {busy === 'publish' ? 'Publishing…' : 'Publish opening'}
            </button>
          </fieldset>
        </form>
      </section>
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
              onChange={(event) =>
                setJobFilter({ ...jobFilter, q: event.target.value })
              }
              placeholder="Title, description, location or type"
            />
          </label>
          <label>
            Job status
            <select
              aria-label="Job status"
              value={jobFilter.status}
              onChange={(event) =>
                setJobFilter({ ...jobFilter, status: event.target.value })
              }
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
              setJobFilter({ q: '', status: '' });
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
                {jobs.data.results.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.title}</strong>
                      <small>{row.description || 'No description added'}</small>
                    </td>
                    <td>
                      {row.location || '—'}
                      <small>{row.employment_type || 'Type not set'}</small>
                    </td>
                    <td>{row.applicant_count ?? 0}</td>
                    <td>
                      <span
                        className={
                          row.is_open ? styles.openStatus : styles.closedStatus
                        }
                      >
                        {row.is_open ? 'Open' : 'Closed'}
                      </span>
                    </td>
                    <td className={styles.actionCell}>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void toggleJob(row)}
                      >
                        {busy === `job-${row.id}`
                          ? 'Saving…'
                          : row.is_open
                            ? 'Close role'
                            : 'Reopen'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const scope = {
                            id: String(row.id),
                            title: row.title,
                          };
                          setRoleFilter(scope);
                          setApplicantFilter({ q: '', status: '' });
                          applicants.search({ jobId: scope.id });
                        }}
                      >
                        View applicants
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <DirectoryPages directory={jobs} name="Job pages" />
      </section>
      {canReadApplicants ? <section className={styles.panel} aria-labelledby="applicants-heading">
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
              onChange={(event) =>
                setApplicantFilter({
                  ...applicantFilter,
                  q: event.target.value,
                })
              }
              placeholder="Name, email or role"
            />
          </label>
          <label>
            Applicant status
            <select
              aria-label="Applicant status"
              value={applicantFilter.status}
              onChange={(event) =>
                setApplicantFilter({
                  ...applicantFilter,
                  status: event.target.value,
                })
              }
            >
              <option value="">All statuses</option>
              {statuses.map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className={styles.secondaryButton} type="submit">
            Search applicants
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              setApplicantFilter({ q: '', status: '' });
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
            {applicants.data?.results.map((row) => (
              <button
                type="button"
                key={row.id}
                disabled={disabled}
                aria-pressed={String(row.id) === selected}
                className={
                  String(row.id) === selected ? styles.selectedApplicant : ''
                }
                onClick={() => selectApplicant(row)}
              >
                <span className={styles.avatar} aria-hidden="true">
                  {row.full_name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')}
                </span>
                <span>
                  <strong>{row.full_name}</strong>
                  <small>
                    {row.job_title} · {date(row.created_at)}
                    {drafts[String(row.id)] &&
                    reviewDirty(drafts[String(row.id)])
                      ? ' · Draft'
                      : ''}
                  </small>
                </span>
                <span className={styles.compactStatus}>
                  {statusName(row.status)}
                </span>
              </button>
            ))}
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
                    <dd>{draft.base.phone || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Applied</dt>
                    <dd>{date(draft.base.created_at)}</dd>
                  </div>
                </dl>
                <section className={styles.messageBlock}>
                  <h4>Applicant message</h4>
                  <p>{draft.base.message || 'No message provided.'}</p>
                </section>
                <section
                  className={styles.attachments}
                  aria-label="Applicant attachments"
                >
                  <h4>Attachments</h4>
                  {draft.base.attachments?.length ? (
                    draft.base.attachments.map((file) => (
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
                    ))
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
                          {draft.latest.reviewer_notes || 'No saved notes.'}
                        </p>
                        <button
                          className={styles.secondaryButton}
                          type="button"
                          disabled={disabled || reviewLoading}
                          onClick={() =>
                            setDrafts((value) => ({
                              ...value,
                              [selected!]: resolveReview(
                                value[selected!],
                                'latest',
                              ),
                            }))
                          }
                        >
                          Use latest review
                        </button>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          disabled={disabled || reviewLoading}
                          onClick={() =>
                            setDrafts((value) => ({
                              ...value,
                              [selected!]: resolveReview(
                                value[selected!],
                                'draft',
                              ),
                            }))
                          }
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
                  onClick={() => void loadLatest()}
                >
                  {reviewLoading ? 'Loading latest…' : 'Load latest review'}
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
                        onChange={(event) =>
                          editReview({ status: event.target.value })
                        }
                      >
                        {statuses.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Internal review notes</span>
                      <textarea
                        aria-label="Internal review notes"
                        rows={5}
                        maxLength={4000}
                        value={draft.notes}
                        onChange={(event) =>
                          editReview({ notes: event.target.value })
                        }
                      />
                    </label>
                    <p className={styles.scopeNote}>
                      {reviewDirty(draft)
                        ? 'Unsaved review draft. Switching pages or applicants keeps this draft.'
                        : 'No unsaved review changes.'}
                    </p>
                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={draft.conflict || !reviewDirty(draft)}
                    >
                      {busy === `review-${selected}`
                        ? 'Saving…'
                        : 'Save review'}
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
      </section> : <section className={styles.noAccess}>
        <UsersThree aria-hidden="true" />
        <h2>Owner approval required</h2>
        <p>Applicant records, review notes and attachments require confidential HR access. You can continue managing job openings.</p>
      </section>}
    </>
  );
}

type Directory<T> = ReturnType<typeof useRecruitmentDirectory<T>>;
function DirectoryState<T>({
  directory,
  name,
}: {
  directory: Directory<T>;
  name: string;
}) {
  if (directory.loading)
    return (
      <p className={styles.scopeNote} role="status">
        Loading {name}…
      </p>
    );
  if (directory.error)
    return (
      <p className={styles.error} role="alert">
        {directory.error}{' '}
        <button type="button" onClick={directory.refresh}>
          Retry {name}
        </button>
      </p>
    );
  return !directory.data?.results.length ? (
    <p className={styles.emptyCell}>
      No matching {name}. Try clearing the filters.
    </p>
  ) : null;
}
function DirectoryPages<T>({
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
        {total === undefined ? '…' : total} matching records · Page{' '}
        {directory.page} of {total === undefined ? '…' : last}
      </span>
      <button
        type="button"
        className={styles.secondaryButton}
        disabled={directory.loading || directory.page <= 1}
        onClick={() => directory.goTo(directory.page - 1)}
      >
        Previous
      </button>
      <button
        type="button"
        className={styles.secondaryButton}
        disabled={
          directory.loading || !directory.data || directory.page >= last
        }
        onClick={() => directory.goTo(directory.page + 1)}
      >
        Next
      </button>
    </nav>
  );
}

function AgentsPanel() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [form, setForm] = useState({ full_name: '', agent_code: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const sequence = useRef(0);
  const lock = useRef(false);
  const mounted = useRef(false);
  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    setError('');
    try {
      const page = await listAgents();
      if (mounted.current && request === sequence.current)
        setAgents(page.results);
    } catch (caught) {
      if (mounted.current && request === sequence.current) {
        setAgents([]);
        setError(errorText(caught));
      }
    } finally {
      if (mounted.current && request === sequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      sequence.current++;
    };
  }, [load]);
  return (
    <section className={styles.panel} aria-labelledby="agents-heading">
      <div className={styles.panelHeading}>
        <div>
          <span>Public verification</span>
          <h2 id="agents-heading">Agent records</h2>
        </div>
        <Link href="/system/agents" className={styles.publicLink}>
          Open full agent directory
        </Link>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}{' '}
          <button type="button" onClick={() => void load()}>
            Retry agents
          </button>
        </p>
      )}
      <form
        className={styles.agentForm}
        onSubmit={(event) => {
          event.preventDefault();
          if (lock.current) return;
          lock.current = true;
          setSaving(true);
          setError('');
          void createAgent({ ...form, is_active: true })
            .then(() => {
              if (mounted.current) {
                setForm({ full_name: '', agent_code: '' });
                void load();
              }
            })
            .catch((caught) => {
              if (mounted.current) setError(errorText(caught));
            })
            .finally(() => {
              lock.current = false;
              if (mounted.current) setSaving(false);
            });
        }}
      >
        <label>
          <span>Agent full name</span>
          <input
            required
            maxLength={200}
            disabled={saving}
            value={form.full_name}
            onChange={(event) =>
              setForm({ ...form, full_name: event.target.value })
            }
          />
        </label>
        <label>
          <span>Agent code</span>
          <input
            required
            maxLength={60}
            disabled={saving}
            value={form.agent_code}
            onChange={(event) =>
              setForm({ ...form, agent_code: event.target.value })
            }
          />
        </label>
        <button
          type="submit"
          className={styles.secondaryButton}
          disabled={saving}
        >
          {saving ? 'Adding…' : 'Add agent'}
        </button>
      </form>
      <p className={styles.scopeNote}>
        Recent directory records; use the full agent directory for search and
        all pages.
      </p>
      <ul className={styles.agentList}>
        {agents.map((row) => (
          <li key={row.id}>
            <IdentificationCard aria-hidden="true" />
            <strong>{row.full_name}</strong>
            <span>{row.agent_code}</span>
            <span
              className={
                row.is_active ? styles.openStatus : styles.closedStatus
              }
            >
              {row.is_active ? 'Active' : 'Inactive'}
            </span>
          </li>
        ))}
      </ul>
      {loading && <p role="status">Loading agents…</p>}
    </section>
  );
}
