"use client";

import type { Me } from "@/lib/api";
import { ROLES, type Employee } from "@/lib/api";
import type { RefObject } from "react";
import { type FormEvent } from "react";
import HrAccessHistory from "./HrAccessHistory";
import {
  AccessDraft,
  DialogHeading,
  Field,
  initials,
  roleDescriptions,
} from "./team-view";

type Props = {
  manageDialogRef: RefObject<HTMLDialogElement | null>;
  closeManage: () => void;
  managed: Employee | null;
  saveManagedAccount: (event: FormEvent) => Promise<void>;
  managing: boolean;
  saving: boolean;
  managedRole: string;
  editAccess: (patch: Partial<AccessDraft>) => void;
  me: Me | null;
  managedActive: boolean;
  managedHrAccess: boolean;
  hrEligible: boolean;
  explicitHrDecision: boolean;
  accessDraft: AccessDraft | null;
  detailLoading: boolean;
  staleDraft: boolean;
  discardAccess: (id: string) => void;
};

export default function ManageAccountDialog({
  manageDialogRef,
  closeManage,
  managed,
  saveManagedAccount,
  managing,
  saving,
  managedRole,
  editAccess,
  me,
  managedActive,
  managedHrAccess,
  hrEligible,
  explicitHrDecision,
  accessDraft,
  detailLoading,
  staleDraft,
  discardAccess,
}: Props) {
  return (
    <dialog
      ref={manageDialogRef}
      className="team-dialog team-manage-dialog"
      aria-labelledby="manage-account-title"
      onCancel={(event) => {
        event.preventDefault();

        closeManage();
      }}
    >
      {managed && (
        <form onSubmit={saveManagedAccount}>
          <DialogHeading
            headingId="manage-account-title"
            title="Manage account"
            description="Review current access before making changes. Changes are audited."
            onClose={closeManage}
            disabled={managing || saving}
          />
          <div className="team-dialog-body">
            <div className="team-managed-person">
              <span className="team-person-avatar">
                {initials(managed.full_name)}
              </span>
              <div>
                <strong>{managed.full_name}</strong>
                <small>{managed.email}</small>
              </div>
            </div>
            <Field label="Role" inputId="managed-role">
              <select
                id="managed-role"
                value={managedRole}
                onChange={(event) => {
                  return editAccess({ role: event.target.value });
                }}
                disabled={
                  managing ||
                  saving ||
                  managed.role === "customer" ||
                  String(managed.id) === String(me?.id)
                }
              >
                {managed.role === "customer" && (
                  <option value="customer">Customer</option>
                )}
                {ROLES.map(([value, label]) => {
                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                })}
              </select>
              <small>
                {managed.role === "customer"
                  ? "Customer access is linked from the client record."
                  : roleDescriptions[managedRole]}
              </small>
            </Field>
            <label
              className={`team-access-switch${!managedActive ? " is-paused" : ""}`}
            >
              <span>
                <strong>Sign-in access</strong>
                <small>
                  {managedActive
                    ? "This person can sign in."
                    : "This person’s access is paused."}
                </small>
              </span>
              <input
                type="checkbox"
                checked={managedActive}
                onChange={(event) => {
                  return editAccess({ active: event.target.checked });
                }}
                disabled={
                  managing || saving || String(managed.id) === String(me?.id)
                }
              />
              <i aria-hidden="true" />
            </label>
            {String(managed.id) === String(me?.id) && (
              <p className="team-self-note">
                For safety, you cannot change your own role or deactivate your
                own account here.
              </p>
            )}
            <>
              <label
                className={`team-access-switch${!managedHrAccess && managedRole !== "owner" ? " is-paused" : ""}`}
              >
                <span>
                  <strong>Confidential HR access</strong>
                  <small>
                    {managedRole === "owner"
                      ? "Owner access is automatic."
                      : !hrEligible
                        ? "Only HR / Payroll and COO can receive an Owner grant."
                        : !managedActive
                          ? "Activate sign-in before granting confidential access."
                          : "Allow private KPI evaluations and applicant records, notes and attachments."}
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={managedRole === "owner" || managedHrAccess}
                  onChange={(event) => {
                    return editAccess({
                      hrConfidentialAccess: event.target.checked,
                      hrDecision: true,
                    });
                  }}
                  disabled={managing || saving || !hrEligible || !managedActive}
                />
                <i aria-hidden="true" />
              </label>
              {explicitHrDecision && (
                <Field
                  label="Reason for HR access decision"
                  inputId="managed-hr-reason"
                >
                  <textarea
                    id="managed-hr-reason"
                    required
                    minLength={3}
                    maxLength={1000}
                    rows={3}
                    value={accessDraft?.hrAccessReason ?? ""}
                    onChange={(event) => {
                      return editAccess({
                        hrAccessReason: event.target.value,
                      });
                    }}
                    disabled={managing || saving}
                  />
                  <small>
                    The decision, reason, Owner and date are recorded. The
                    person must sign in again.
                  </small>
                </Field>
              )}
              {managed.hr_confidential_access &&
                !managedHrAccess &&
                !explicitHrDecision && (
                  <p className="team-self-note">
                    Saving this role or sign-in change will revoke the existing
                    HR grant. A new grant requires an Owner decision.
                  </p>
                )}
              <HrAccessHistory
                key={`${managed.id}:${managed.version}`}
                accountId={managed.id}
              />
            </>
            {detailLoading && (
              <p role="status">Refreshing current account settings…</p>
            )}
            {staleDraft && (
              <p className="team-self-note" role="alert">
                This account changed. Your draft is retained; discard it and
                review current access before saving.
              </p>
            )}
            {accessDraft && (
              <button
                type="button"
                className="team-secondary-button"
                disabled={managing || saving}
                onClick={() => {
                  return discardAccess(String(managed.id));
                }}
              >
                Discard access draft
              </button>
            )}
          </div>
          <div className="team-dialog-actions">
            <button
              type="button"
              className="team-secondary-button"
              disabled={managing || saving}
              onClick={closeManage}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="team-primary-button"
              disabled={
                managing ||
                saving ||
                staleDraft ||
                detailLoading ||
                (explicitHrDecision &&
                  (accessDraft?.hrAccessReason.trim().length ?? 0) < 3)
              }
            >
              {managing ? "Saving changes…" : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
