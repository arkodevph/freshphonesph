"use client";

import { useRef, useState, type FormEvent } from "react";
import { personnelSubmissionSchema, roleLabels, type PersonnelOptions, type PersonnelSubmission } from "@freshphones/contracts";
import type { PersonnelWorkspaceState } from "@/lib/usePersonnelWorkspace";
import { useSpringDialog } from "@/lib/useSpringDialog";
import ModalCloseButton from "@/app/system/_role-designs/coo/components/ModalCloseButton";
import Select from "@/app/system/_role-designs/coo/components/Select";
import styles from "@/app/system/_role-designs/coo/app/system/personnel/personnel.module.css";

const empty = { name: "", email: "", role: "BATCH_HANDLER" as PersonnelSubmission["role"], supervisorId: "", orientation: "", training: "", confirmedBy: "", evidenceNote: "" };

export default function TrainingDialog({ open, close, options, state }: { open: boolean; close: () => void; options: PersonnelOptions; state: PersonnelWorkspaceState }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  const submissionId = useRef<string | null>(null);
  const [draft, setDraft] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useSpringDialog(dialog, open);
  const supervisors = options.supervisors.filter((person) => options.superiorRoles[draft.role]?.includes(person.role));
  const dirty = Object.entries(draft).some(([key, value]) => value !== empty[key as keyof typeof empty]);

  function clear() {
    setDraft(empty);
    setErrors({});
    state.setActionError("");
    submissionId.current = null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (state.busy) return;
    submissionId.current ??= crypto.randomUUID();
    const orientation = new Date(draft.orientation);
    const training = new Date(draft.training);
    const input = personnelSubmissionSchema.safeParse({ submissionId: submissionId.current, name: draft.name, email: draft.email, role: draft.role, supervisorId: draft.supervisorId, orientationCompletedAt: Number.isFinite(orientation.getTime()) ? orientation.toISOString() : "", trainingCompletedAt: Number.isFinite(training.getTime()) ? training.toISOString() : "", confirmedBy: draft.confirmedBy, evidenceNote: draft.evidenceNote });
    const found: Record<string, string> = {};
    if (!input.success) {
      for (const issue of input.error.issues) found[String(issue.path[0])] = issue.message;
    }
    if (orientation.getTime() > Date.now()) found.orientationCompletedAt = "Choose a completed orientation date.";
    if (training.getTime() > Date.now()) found.trainingCompletedAt = "Choose a completed training date.";
    setErrors(found);
    if (!input.success || Object.keys(found).length) {
      requestAnimationFrame(() => errorSummary.current?.focus());
      return;
    }
    if (await state.submit(input.data)) {
      clear();
      close();
    } else {
      requestAnimationFrame(() => errorSummary.current?.focus());
    }
  }

  function fieldError(name: string) {
    return errors[name] ? <small id={`training-${name}-error`} className={styles.fieldError}>{errors[name]}</small> : null;
  }

  return <dialog ref={dialog} className={styles.dialog} data-workspace-modal data-modal-framed data-modal-size="wide" aria-labelledby="training-title" onCancel={(event) => { event.preventDefault(); close(); }}>
    <form onSubmit={submit}>
      <header className={styles.dialogHeader} data-modal-header><div><h2 id="training-title">Record completed training</h2><p>COO reviews the evidence before creating an account.</p></div><ModalCloseButton disabled={state.busy} onClick={close} /></header>
      <div className={styles.dialogBody} data-modal-body>
        {(Object.keys(errors).length > 0 || state.actionError) && <div className="system-alert is-error" role="alert" tabIndex={-1} ref={errorSummary}>{state.actionError || "Review the marked fields before submitting."}</div>}
        <fieldset disabled={state.busy} className={styles.fieldset}>
          <legend>Person and assignment</legend>
          <div className={styles.formGrid}>
            <label>Full name<input required minLength={2} maxLength={100} autoComplete="name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "training-name-error" : undefined} />{fieldError("name")}</label>
            <label>Sign-in email<input required type="email" maxLength={254} autoComplete="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "training-email-error" : undefined} />{fieldError("email")}</label>
            <label><span id="training-role-label">Role</span><Select id="training-role" labelId="training-role-label" value={draft.role} onValueChange={(value) => setDraft({ ...draft, role: value as PersonnelSubmission["role"], supervisorId: "" })} options={options.roles.map((role) => ({ value: role, label: roleLabels[role] }))} /></label>
            <label><span id="training-supervisor-label">Supervisor</span><Select id="training-supervisor" labelId="training-supervisor-label" value={draft.supervisorId} onValueChange={(value) => setDraft({ ...draft, supervisorId: value })} options={[{ value: "", label: "Choose a supervisor" }, ...supervisors.map((person) => ({ value: person.id, label: person.name }))]} />{fieldError("supervisorId")}{!supervisors.length && <small>No eligible active supervisor. Ask COO to update assignments.</small>}</label>
          </div>
        </fieldset>
        <fieldset disabled={state.busy} className={styles.fieldset}>
          <legend>External training evidence</legend>
          <div className={styles.formGrid}>
            <label>Orientation completed<input required type="datetime-local" value={draft.orientation} onChange={(event) => setDraft({ ...draft, orientation: event.target.value })} aria-invalid={Boolean(errors.orientationCompletedAt)} aria-describedby={errors.orientationCompletedAt ? "training-orientationCompletedAt-error" : undefined} />{fieldError("orientationCompletedAt")}</label>
            <label>Training completed<input required type="datetime-local" value={draft.training} onChange={(event) => setDraft({ ...draft, training: event.target.value })} aria-invalid={Boolean(errors.trainingCompletedAt)} aria-describedby={errors.trainingCompletedAt ? "training-trainingCompletedAt-error" : undefined} />{fieldError("trainingCompletedAt")}</label>
            <label className={styles.full}>Confirmed by<input required minLength={2} maxLength={100} value={draft.confirmedBy} onChange={(event) => setDraft({ ...draft, confirmedBy: event.target.value })} aria-invalid={Boolean(errors.confirmedBy)} aria-describedby={errors.confirmedBy ? "training-confirmedBy-error" : undefined} />{fieldError("confirmedBy")}</label>
            <label className={styles.full}>Evidence note<textarea required minLength={3} maxLength={500} rows={3} value={draft.evidenceNote} onChange={(event) => setDraft({ ...draft, evidenceNote: event.target.value })} aria-invalid={Boolean(errors.evidenceNote)} aria-describedby="training-evidence-help" /><small id="training-evidence-help">Record completion evidence only. Do not include IDs, private chat transcripts or payroll details.</small>{fieldError("evidenceNote")}</label>
          </div>
        </fieldset>
      </div>
      <footer className={styles.dialogFooter} data-modal-footer>{dirty && <button type="button" className={styles.textButton} disabled={state.busy} onClick={clear}>Clear draft</button>}<div className={styles.actions}><button type="button" className={styles.secondary} disabled={state.busy} onClick={close}>Keep draft and close</button><button type="submit" className={styles.primary} disabled={state.busy || !draft.supervisorId}>{state.busy ? "Submitting…" : "Submit to COO"}</button></div></footer>
    </form>
  </dialog>;
}
