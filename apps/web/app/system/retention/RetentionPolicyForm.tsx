"use client";

import {
  retentionScopeLabels,
  retentionScopes,
  type RetentionScope,
} from "@freshphones/contracts";
import type { Dispatch, SetStateAction } from "react";
import { type FormEvent } from "react";
import styles from "./retention.module.css";

type Props = {
  savePolicy: (event: FormEvent) => Promise<void>;
  draft: {
    scope: RetentionScope;
    days: string;
    basis: string;
    backupInstructions: string;
    externalCopyInstructions: string;
  };
  setDraft: Dispatch<
    SetStateAction<{
      scope: RetentionScope;
      days: string;
      basis: string;
      backupInstructions: string;
      externalCopyInstructions: string;
    }>
  >;
  busy: boolean;
};

export default function RetentionPolicyForm({
  savePolicy,
  draft,
  setDraft,
  busy,
}: Props) {
  return (
    <form className={styles.card} onSubmit={savePolicy}>
      <h3>Create a policy revision</h3>
      <p>
        Enter approved business rules for the category. Saving creates an
        inactive draft; activation records the approval reference.
      </p>
      <div className={styles.fields}>
        <label>
          Category
          <select
            value={draft.scope}
            onChange={(event) => {
              return setDraft({
                ...draft,
                scope: event.target.value as RetentionScope,
              });
            }}
          >
            {retentionScopes.map((item) => {
              return (
                <option key={item} value={item}>
                  {retentionScopeLabels[item]}
                </option>
              );
            })}
          </select>
        </label>
        <label>
          Days after final activity
          <input
            required
            type="number"
            min={1}
            max={36500}
            step={1}
            value={draft.days}
            onChange={(event) => {
              return setDraft({ ...draft, days: event.target.value });
            }}
          />
        </label>
      </div>
      <label>
        Business purpose and policy basis
        <textarea
          required
          minLength={10}
          maxLength={2000}
          value={draft.basis}
          onChange={(event) => {
            return setDraft({ ...draft, basis: event.target.value });
          }}
        />
      </label>
      <label>
        Backup expiry and restore handling
        <textarea
          required
          minLength={10}
          maxLength={2000}
          value={draft.backupInstructions}
          onChange={(event) => {
            return setDraft({
              ...draft,
              backupInstructions: event.target.value,
            });
          }}
        />
      </label>
      <label>
        Delivered email and external copy handling
        <textarea
          required
          minLength={10}
          maxLength={2000}
          value={draft.externalCopyInstructions}
          onChange={(event) => {
            return setDraft({
              ...draft,
              externalCopyInstructions: event.target.value,
            });
          }}
        />
      </label>
      <button disabled={busy}>Save inactive draft</button>
    </form>
  );
}
