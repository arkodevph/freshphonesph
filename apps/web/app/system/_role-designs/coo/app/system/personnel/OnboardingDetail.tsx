"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { passwordSchema, personnelRejectionSchema, roleLabels, type PersonnelOnboarding, type Role } from "@freshphones/contracts";
import type { PersonnelWorkspaceState } from "@/lib/usePersonnelWorkspace";
import { useSpringDialog } from "@/lib/useSpringDialog";
import ModalCloseButton from "@/app/system/_role-designs/coo/components/ModalCloseButton";
import Select from "@/app/system/_role-designs/coo/components/Select";
import WorkspaceProgress from "@/app/system/_role-designs/coo/components/WorkspaceProgress";
import { personnelDate, statusLabels } from "@/app/system/_role-designs/coo/app/system/personnel/PersonnelWorkspace";
import styles from "@/app/system/_role-designs/coo/app/system/personnel/personnel.module.css";

function Content({ record, state, canEnroll, userId }: { record: PersonnelOnboarding; state: PersonnelWorkspaceState; canEnroll: boolean; userId: string }) {
  const [action, setAction] = useState<"enroll" | "reject">("enroll");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [profile, setProfile] = useState("");
  const [validation, setValidation] = useState("");
  const error = useRef<HTMLDivElement>(null);
  const self = record.submittedBy.id === userId;

  async function decide(event: FormEvent) {
    event.preventDefault();
    setValidation("");
    if (action === "enroll") {
      const checked = passwordSchema.safeParse(password);
      if (!checked.success) {
        setValidation(checked.error.issues[0]?.message ?? "Choose a stronger password.");
        requestAnimationFrame(() => error.current?.focus());
        return;
      }
      if (record.role === "AGENT" && !profile) {
        setValidation("Choose an available Agent profile.");
        return;
      }
    } else {
      const checked = personnelRejectionSchema.safeParse({ version: record.version, reason });
      if (!checked.success) {
        setValidation("Enter a rejection reason of 3–500 characters.");
        requestAnimationFrame(() => error.current?.focus());
        return;
      }
    }
    if (await state.decide(action, { password, reason, agentProfileId: profile })) {
      setPassword("");
      setReason("");
      setProfile("");
    } else {
      requestAnimationFrame(() => error.current?.focus());
    }
  }

  return <>
    <header className={styles.dialogHeader} data-modal-header><div><p className={styles.eyebrow}>Training record</p><h2 id="onboarding-detail-title">{record.name}</h2><p>{record.email}</p></div><ModalCloseButton disabled={state.busy} onClick={state.close} /></header>
    <div className={styles.dialogBody} data-modal-body>
      <div className={styles.detailSummary}><span className={styles.status} data-status={record.status}>{statusLabels[record.status]}</span><span>Submitted {personnelDate(record.createdAt)}</span></div>
      <section className={styles.detailSection} aria-labelledby="assignment-title"><h3 id="assignment-title">Assignment</h3><dl className={styles.facts}><div><dt>Role</dt><dd>{roleLabels[record.role as Role] ?? record.role}</dd></div><div><dt>Supervisor</dt><dd>{record.supervisor.name}</dd></div></dl></section>
      <section className={styles.detailSection} aria-labelledby="training-evidence-title"><h3 id="training-evidence-title">Completed training</h3><dl className={styles.facts}><div><dt>Orientation</dt><dd>{personnelDate(record.orientationCompletedAt)}</dd></div><div><dt>Training</dt><dd>{personnelDate(record.trainingCompletedAt)}</dd></div><div><dt>Confirmed by</dt><dd>{record.confirmedBy}</dd></div><div><dt>Submitted by</dt><dd>{record.submittedBy.name}</dd></div></dl><p className={styles.evidence}>{record.evidenceNote}</p></section>
      {record.decisionReason && <section className={styles.detailSection}><h3>Decision reason</h3><p className={styles.evidence}>{record.decisionReason}</p></section>}
      {record.account && <p className={styles.outcome}>Account created for {record.account.name}.</p>}
      {canEnroll && record.status === "PENDING" && <section className={styles.detailSection} aria-labelledby="decision-title"><h3 id="decision-title">COO decision</h3>
        <div className={styles.views} aria-label="Enrollment decision"><button type="button" aria-pressed={action === "enroll"} disabled={state.busy} onClick={() => { setAction("enroll"); setValidation(""); }}>Create account</button><button type="button" aria-pressed={action === "reject"} disabled={state.busy} onClick={() => { setAction("reject"); setPassword(""); setValidation(""); }}>Reject</button></div>
        <form id="personnel-decision" onSubmit={decide}>
          <fieldset className={styles.fieldset} disabled={state.busy || state.conflict}>
            {action === "enroll" ? <>
              {self && <p className="system-alert">You cannot approve your own training submission.</p>}
              <label>Initial account password<input type="password" autoComplete="new-password" required value={password} minLength={12} maxLength={128} onChange={(event) => setPassword(event.target.value)} aria-describedby="personnel-password-help" /><small id="personnel-password-help">At least 12 characters, with uppercase, lowercase, a number and a symbol. Share it privately.</small></label>
              {record.role === "AGENT" && <label><span id="personnel-profile-label">Agent profile</span><Select id="personnel-profile" labelId="personnel-profile-label" value={profile} onValueChange={setProfile} options={[{ value: "", label: "Choose an available profile" }, ...(state.options?.profiles ?? []).map((item) => ({ value: item.id, label: `${item.name} · ${item.code}` }))]} />{state.options?.profiles.length === 0 && <small>No available Agent profiles. Update the Agent directory before enrollment.</small>}</label>}
              <p className={styles.consequence}>Creates the submitted role and supervisor assignment. Training evidence stays on record.</p>
            </> : <label>Rejection reason<textarea required minLength={3} maxLength={500} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /><small>HR can submit corrected evidence as a new record.</small></label>}
          </fieldset>
        </form>
      </section>}
      {(validation || state.actionError) && <div ref={error} tabIndex={-1} className="system-alert is-error" role="alert">{validation || state.actionError}{state.conflict && <><p>Refresh this record and review its latest state before deciding again. Your draft is retained.</p><button type="button" className={styles.secondary} disabled={state.historyLoading} onClick={() => { void state.readHistory(record, true); }}>Refresh record</button></>}</div>}
      <section className={styles.detailSection} aria-labelledby="personnel-history-title"><h3 id="personnel-history-title">Dated history</h3>{state.historyLoading ? <WorkspaceProgress label="Loading history…" /> : state.historyError ? <div role="alert"><p>{state.historyError}</p><button type="button" className={styles.secondary} onClick={() => { void state.readHistory(record); }}>Retry history</button></div> : <ol className={styles.history}>{state.history.map((entry) => <li key={entry.id}><span className={styles.historyDot} aria-hidden="true" /><div><strong>{entry.action === "personnel.training_submitted" ? "Training submitted" : entry.action === "personnel.enrolled" ? "Account created" : "Enrollment rejected"}</strong><p>{entry.actor.name} · <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</time></p></div></li>)}</ol>}</section>
    </div>
    <footer className={styles.dialogFooter} data-modal-footer><button type="button" className={styles.secondary} disabled={state.busy} onClick={state.close}>Close</button>{canEnroll && record.status === "PENDING" && <button type="submit" form="personnel-decision" className={action === "reject" ? styles.danger : styles.primary} disabled={state.busy || state.conflict || (action === "enroll" && self)}>{state.busy ? "Saving decision…" : action === "enroll" ? "Create personnel account" : "Reject enrollment"}</button>}</footer>
  </>;
}

export default function OnboardingDetail({ state, canEnroll, userId }: { state: PersonnelWorkspaceState; canEnroll: boolean; userId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [shown, setShown] = useState<PersonnelOnboarding | null>(null);
  useEffect(() => { if (state.selected) setShown(state.selected); }, [state.selected]);
  useSpringDialog(dialog, Boolean(state.selected), () => { setShown(null); });
  return <dialog ref={dialog} className={styles.dialog} data-workspace-modal data-modal-framed data-modal-size="wide" aria-labelledby="onboarding-detail-title" onCancel={(event) => { event.preventDefault(); state.close(); }}>{shown && <Content key={shown.id} record={shown} state={state} canEnroll={canEnroll} userId={userId} />}</dialog>;
}
