"use client";

import { useState } from "react";
import { Check, Plus, ArrowsClockwise } from "@phosphor-icons/react";
import { roleLabels, type Role, type PersonnelStatus } from "@freshphones/contracts";
import { can, useMe } from "@/lib/useMe";
import { usePersonnelWorkspace } from "@/lib/usePersonnelWorkspace";
import PersonnelDirectory from "@/app/system/_role-designs/coo/app/system/people/PersonnelDirectory";
import WorkspaceProgress from "@/app/system/_role-designs/coo/components/WorkspaceProgress";
import Select from "@/app/system/_role-designs/coo/components/Select";
import { RecordPagination } from "@/app/system/_role-designs/coo/components/RecordPagination";
import TrainingDialog from "@/app/system/_role-designs/coo/app/system/personnel/TrainingDialog";
import OnboardingDetail from "@/app/system/_role-designs/coo/app/system/personnel/OnboardingDetail";
import styles from "@/app/system/_role-designs/coo/app/system/personnel/personnel.module.css";

export const statusLabels: Record<PersonnelStatus, string> = {
  PENDING: "Awaiting COO",
  ENROLLED: "Enrolled",
  REJECTED: "Rejected",
};

export function personnelDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function Workspace({ confidential, canSubmit, canEnroll, userId }: { confidential: boolean; canSubmit: boolean; canEnroll: boolean; userId: string }) {
  const state = usePersonnelWorkspace(confidential);
  const [view, setView] = useState<"directory" | "onboarding">(confidential ? "onboarding" : "directory");
  const [createOpen, setCreateOpen] = useState(false);
  const onboarding = view === "onboarding" && confidential;

  return (
    <div className={styles.workspace}>
      <header className={styles.heading}>
        <h1>Personnel</h1>
        <div className={styles.actions}>
          <button className={styles.secondary} type="button" disabled={state.loading && state.directoryLoading} onClick={() => { void state.load(); void state.loadDirectory(); }}><ArrowsClockwise size={17} aria-hidden="true" />Refresh</button>
          {canSubmit && <button className={styles.primary} type="button" disabled={!state.options} onClick={() => { state.setActionError(""); setCreateOpen(true); }}><Plus size={17} aria-hidden="true" />Record training</button>}
        </div>
      </header>
      {confidential && (
        <nav className={styles.views} aria-label="Personnel views">
          {([ ["onboarding", "Onboarding"], ["directory", "Staff directory"] ] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={view === value} onClick={() => { setView(value); }}>{label}{view === value && <Check size={14} aria-hidden="true" />}</button>
          ))}
        </nav>
      )}
      {state.notice && <p role="status" className="system-alert">{state.notice}</p>}
      {!confidential && <p className={styles.accessNote}>Confidential onboarding requires an access grant. Your staff directory remains available.</p>}
      {onboarding ? (
        <section className={styles.queue} aria-label="Personnel onboarding" aria-busy={state.loading}>
          <div className={styles.toolbar}>
            <label className={styles.search}>Search onboarding<input type="search" value={state.query} maxLength={100} placeholder="Name or email" onChange={(event) => { state.setPage(1); state.setQuery(event.target.value); }} /></label>
            <label className={styles.filter}><span id="onboarding-status-label">Status</span><Select id="onboarding-status" labelId="onboarding-status-label" value={state.status} onValueChange={(value) => { state.setPage(1); state.setStatus(value as PersonnelStatus | ""); }} options={[{ value: "", label: "All statuses" }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]} /></label>
            {(state.query || state.status !== "PENDING") && <button className={styles.secondary} type="button" onClick={() => { state.setQuery(""); state.setStatus("PENDING"); state.setPage(1); }}>Reset filters</button>}
          </div>
          {state.error && <div className="system-alert is-error" role="alert">{state.error}<button type="button" onClick={() => { void state.load(); }}>Try again</button></div>}
          <div className={styles.resultLine} role="status">{state.loading ? <WorkspaceProgress label={state.data ? "Refreshing onboarding…" : "Loading onboarding…"} /> : state.data ? `${state.data.total} ${state.data.total === 1 ? "submission" : "submissions"}` : ""}</div>
          {state.data && state.data.items.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={styles.srOnly}>Personnel training submissions</caption>
                <thead><tr><th scope="col">Person</th><th scope="col">Role / supervisor</th><th scope="col">Training completed</th><th scope="col">Status</th><th scope="col"><span className={styles.srOnly}>Open submission</span></th></tr></thead>
                <tbody>{state.data.items.map((record) => (
                  <tr key={record.id}>
                    <th scope="row"><strong>{record.name}</strong><span>{record.email}</span></th>
                    <td data-label="Role / supervisor"><strong>{roleLabels[record.role as Role] ?? record.role}</strong><span>{record.supervisor.name}</span></td>
                    <td data-label="Training completed">{personnelDate(record.trainingCompletedAt)}<span>Submitted {personnelDate(record.createdAt)}</span></td>
                    <td data-label="Status"><span className={styles.status} data-status={record.status}>{statusLabels[record.status]}</span></td>
                    <td className={styles.rowAction}><button type="button" className={styles.secondary} aria-label={`${canEnroll && record.status === "PENDING" ? "Review" : "View"} ${record.name}`} onClick={() => { state.open(record); }}>{canEnroll && record.status === "PENDING" ? "Review" : "View record"}</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {!state.loading && !state.error && state.data?.items.length === 0 && <div className={styles.empty}><strong>{state.query ? "No matching submissions" : state.status === "PENDING" ? "No training awaiting review" : "No submissions in this view"}</strong><p>{state.query ? "Try another name or email." : canSubmit ? "Record completed orientation and training when a person is ready for COO review." : "HR training submissions will appear here for your review."}</p></div>}
          {state.data && state.data.total > 0 && <RecordPagination page={state.page} pageSize={state.data.pageSize} total={state.data.total} hasNext={state.page * state.data.pageSize < state.data.total} loading={state.loading} onPage={state.setPage} />}
        </section>
      ) : (
        <>{state.directoryError && <p role="alert" className="system-alert is-error">{state.directoryError}</p>}<PersonnelDirectory staff={state.staff} loading={state.directoryLoading} /></>
      )}
      {canSubmit && state.options && <TrainingDialog open={createOpen} close={() => { if (!state.busy) setCreateOpen(false); }} options={state.options} state={state} />}
      {confidential && <OnboardingDetail state={state} canEnroll={canEnroll} userId={userId} />}
    </div>
  );
}

export default function PersonnelWorkspace() {
  const me = useMe();
  if (!me) return <WorkspaceProgress label="Loading personnel…" />;
  if (!can(me, "STAFF_READ")) return <p role="alert">No access to personnel.</p>;
  const confidential = can(me, "HR_CONFIDENTIAL");
  const canSubmit = confidential && me.role === "HR_PAYROLL";
  const canEnroll = confidential && me.role === "COO" && can(me, "ACCOUNT_MANAGE");
  return <Workspace key={`${me.id}:${me.role}:${me.permissions.join(",")}`} confidential={confidential} canSubmit={canSubmit} canEnroll={canEnroll} userId={String(me.id)} />;
}
