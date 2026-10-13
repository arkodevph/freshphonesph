"use client";

import { type Batch } from "@/lib/api";
import { Plus } from "@phosphor-icons/react";
import type * as React from "react";
import type { Dispatch, SetStateAction } from "react";
import { Field, inputCls } from "@/components/FormField";

type Props = {
  onCreate: (e: React.FormEvent) => Promise<void>;
  saving: boolean;
  form: {
    batch: string;
    full_name: string;
    contact_email: string;
    joined_at: string;
  };
  setForm: Dispatch<
    SetStateAction<{
      batch: string;
      full_name: string;
      contact_email: string;
      joined_at: string;
    }>
  >;
  batches: Batch[];
  releasing: boolean;
  choicesError: string | null;
  loadChoices: () => Promise<void>;
};

export default function CreateClientForm({
  onCreate,
  saving,
  form,
  setForm,
  batches,
  releasing,
  choicesError,
  loadChoices,
}: Props) {
  return (
    <form onSubmit={onCreate} className="glass mb-4 rounded-3xl p-5">
      <h2 className="mb-3 flex items-center gap-2 font-display font-700 text-blue-ink">
        <Plus weight="bold" className="h-4 w-4" /> Add client to a batch
      </h2>
      <fieldset
        disabled={saving}
        className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <Field label="Batch">
          <select
            required
            value={form.batch}
            onChange={(e) => {
              return setForm({ ...form, batch: e.target.value });
            }}
            className={inputCls}
          >
            <option value="">Select batch…</option>
            {form.batch &&
              !batches.some((batch) => {
                return String(batch.id) === form.batch;
              }) && (
                <option value={form.batch}>Selected batch unavailable</option>
              )}
            {batches.map((b) => {
              return (
                <option key={b.id} value={b.id}>
                  {b.batch_number} — {b.unit_model}
                </option>
              );
            })}
          </select>
        </Field>
        <Field label="Full name">
          <input
            required
            value={form.full_name}
            onChange={(e) => {
              return setForm({ ...form, full_name: e.target.value });
            }}
            className={inputCls}
            placeholder="Maria Cruz"
          />
        </Field>
        <Field label="Contact email">
          <input
            type="email"
            value={form.contact_email}
            onChange={(e) => {
              return setForm({ ...form, contact_email: e.target.value });
            }}
            className={inputCls}
            placeholder="maria@example.com"
          />
        </Field>
        <Field label="Joined date">
          <input
            type="date"
            required
            value={form.joined_at}
            onChange={(e) => {
              return setForm({ ...form, joined_at: e.target.value });
            }}
            className={inputCls}
          />
        </Field>
      </fieldset>
      <button
        type="submit"
        disabled={saving || releasing || batches.length === 0}
        className="btn-candy mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-700 disabled:opacity-70"
      >
        <Plus weight="bold" className="h-4 w-4" />
        {saving ? "Adding…" : "Add client"}
      </button>
      {batches.length === 0 && (
        <p className="mt-2 text-xs text-ink-soft">
          Create a batch first (Paluwagan Records).
        </p>
      )}
      {choicesError && (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {choicesError}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              return void loadChoices();
            }}
          >
            Retry batch choices
          </button>
        </p>
      )}
    </form>
  );
}
