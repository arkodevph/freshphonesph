"use client";

import { ROLES } from "@/lib/api";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { type FormEvent } from "react";
import {
  CreateField,
  DialogHeading,
  Field,
  roleDescriptions,
} from "./team-view";

type Props = {
  createDialogRef: RefObject<HTMLDialogElement | null>;
  setFieldErrors: Dispatch<
    SetStateAction<
      Partial<Record<"email" | "full_name" | "role" | "password", string>>
    >
  >;
  saving: boolean;
  createAccount: (event: FormEvent) => Promise<void>;
  managing: boolean;
  fieldErrors: Partial<
    Record<"email" | "full_name" | "role" | "password", string>
  >;
  form: { email: string; full_name: string; role: string; password: string };
  setForm: Dispatch<
    SetStateAction<{
      email: string;
      full_name: string;
      role: string;
      password: string;
    }>
  >;
  validateField: (name: CreateField, value: string) => string;
};

export default function CreateAccountDialog({
  createDialogRef,
  setFieldErrors,
  saving,
  createAccount,
  managing,
  fieldErrors,
  form,
  setForm,
  validateField,
}: Props) {
  return (
    <dialog
      ref={createDialogRef}
      className="team-dialog"
      aria-labelledby="create-account-title"
      onClose={() => {
        return setFieldErrors({});
      }}
      onCancel={(event) => {
        if (saving) {
          event.preventDefault();
        }
      }}
    >
      <form onSubmit={createAccount} noValidate>
        <DialogHeading
          headingId="create-account-title"
          title="Add staff account"
          description="Create individual access and assign the person’s least-privilege role."
          onClose={() => {
            return createDialogRef.current?.close();
          }}
          disabled={saving}
        />
        <fieldset disabled={saving || managing} className="team-dialog-body">
          <Field
            label="Full name"
            error={fieldErrors.full_name}
            inputId="staff-name"
          >
            <input
              id="staff-name"
              autoFocus
              required
              value={form.full_name}
              onChange={(event) => {
                return setForm({ ...form, full_name: event.target.value });
              }}
              onBlur={(event) => {
                return validateField("full_name", event.target.value);
              }}
              aria-invalid={Boolean(fieldErrors.full_name)}
              aria-describedby={
                fieldErrors.full_name ? "staff-name-error" : undefined
              }
              placeholder="Juan Dela Cruz"
            />
          </Field>
          <Field
            label="Work email"
            error={fieldErrors.email}
            inputId="staff-email"
          >
            <input
              id="staff-email"
              type="email"
              required
              value={form.email}
              onChange={(event) => {
                return setForm({ ...form, email: event.target.value });
              }}
              onBlur={(event) => {
                return validateField("email", event.target.value);
              }}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={
                fieldErrors.email ? "staff-email-error" : undefined
              }
              placeholder="name@freshphones.ph"
            />
          </Field>
          <Field label="Role" error={fieldErrors.role} inputId="staff-role">
            <select
              id="staff-role"
              value={form.role}
              onChange={(event) => {
                return setForm({ ...form, role: event.target.value });
              }}
              onBlur={(event) => {
                return validateField("role", event.target.value);
              }}
            >
              {ROLES.map(([value, label]) => {
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
            <small>{roleDescriptions[form.role]}</small>
          </Field>
          <Field
            label="Temporary password"
            error={fieldErrors.password}
            inputId="staff-password"
          >
            <input
              id="staff-password"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => {
                return setForm({ ...form, password: event.target.value });
              }}
              onBlur={(event) => {
                return validateField("password", event.target.value);
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password
                  ? "staff-password-error"
                  : "staff-password-help"
              }
              placeholder="At least 12 characters"
            />
            {!fieldErrors.password && (
              <small id="staff-password-help">
                Share it privately and ask the person to replace it after
                signing in.
              </small>
            )}
          </Field>
        </fieldset>
        <div className="team-dialog-actions">
          <button
            type="button"
            disabled={saving}
            className="team-secondary-button"
            onClick={() => {
              return createDialogRef.current?.close();
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="team-primary-button"
            disabled={saving}
          >
            {saving ? "Creating account…" : "Create account"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
