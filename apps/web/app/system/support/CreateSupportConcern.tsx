"use client";

import { STAFF_SUPPORT_SOURCES, type SupportClientOption } from "@/lib/api";
import type * as React from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";

type Props = {
  findClient: (event: React.FormEvent) => Promise<void>;
  clientQuery: string;
  lookupVersion: RefObject<number>;
  setClientQuery: Dispatch<SetStateAction<string>>;
  setSelectedClient: Dispatch<SetStateAction<SupportClientOption | null>>;
  setClientOptions: Dispatch<SetStateAction<SupportClientOption[]>>;
  setClientSearchDone: Dispatch<SetStateAction<boolean>>;
  pending: string | null;
  lookupError: string | null;
  clientOptions: SupportClientOption[];
  selectedClient: SupportClientOption | null;
  clientSearchDone: boolean;
  createCase: (event: React.FormEvent) => Promise<void>;
  newSource: string;
  setNewSource: Dispatch<SetStateAction<string>>;
  category: string;
  setCategory: Dispatch<SetStateAction<string>>;
  description: string;
  setDescription: Dispatch<SetStateAction<string>>;
};

export default function CreateSupportConcern({
  findClient,
  clientQuery,
  lookupVersion,
  setClientQuery,
  setSelectedClient,
  setClientOptions,
  setClientSearchDone,
  pending,
  lookupError,
  clientOptions,
  selectedClient,
  clientSearchDone,
  createCase,
  newSource,
  setNewSource,
  category,
  setCategory,
  description,
  setDescription,
}: Props) {
  return (
    <section
      className="glass mb-4 rounded-3xl p-5"
      aria-label="Log a support concern"
    >
      <h2 className="font-display text-base font-700 text-blue-ink">
        Log a customer concern
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        For Messenger, Facebook, phone or in-person contacts, choose the
        customer and the original contact source. The customer can see the case
        in their portal.
      </p>
      <form onSubmit={findClient} className="mt-4 flex flex-wrap gap-2">
        <label className="min-w-52 flex-1 text-sm font-700 text-blue-ink">
          Find customer by name
          <input
            value={clientQuery}
            onChange={(event) => {
              ++lookupVersion.current;

              setClientQuery(event.target.value);

              setSelectedClient(null);

              setClientOptions([]);

              setClientSearchDone(false);
            }}
            minLength={2}
            maxLength={100}
            required
            className="mt-1 block w-full rounded-xl border border-violet-200 bg-white/70 p-2.5 font-normal"
            placeholder="Type at least 2 characters"
          />
        </label>
        <button
          type="submit"
          disabled={!!pending || clientQuery.trim().length < 2}
          className="self-end rounded-xl bg-white/80 px-4 py-2.5 text-sm font-700 text-blue-ink disabled:opacity-40"
        >
          Search customers
        </button>
      </form>
      {lookupError && (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {lookupError}
        </p>
      )}
      {clientOptions.length > 0 && (
        <label className="mt-3 block text-sm font-700 text-blue-ink">
          Matching customers
          <select
            value={selectedClient?.id ?? ""}
            onChange={(event) => {
              return setSelectedClient(
                clientOptions.find((item) => {
                  return item.id === event.target.value;
                }) ?? null,
              );
            }}
            className="mt-1 block w-full rounded-xl border border-violet-200 bg-white/70 p-2.5 font-normal"
          >
            <option value="">Choose a customer</option>
            {clientOptions.map((item) => {
              return (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.batch_code} · {item.id.slice(0, 8)}
                </option>
              );
            })}
          </select>
        </label>
      )}
      {clientSearchDone && clientOptions.length === 0 && !lookupError && (
        <p className="mt-2 text-xs text-ink-soft">
          No matching customer found. Try another name.
        </p>
      )}
      <form onSubmit={createCase} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-700 text-blue-ink">
          Contact source
          <select
            value={newSource}
            onChange={(event) => {
              return setNewSource(event.target.value);
            }}
            required
            className="mt-1 block w-full rounded-xl border border-violet-200 bg-white/70 p-2.5 font-normal"
          >
            <option value="">Choose source</option>
            {STAFF_SUPPORT_SOURCES.map(([value, label]) => {
              return (
                <option key={value} value={value}>
                  {label}
                </option>
              );
            })}
          </select>
        </label>
        <label className="text-sm font-700 text-blue-ink">
          Category
          <input
            value={category}
            onChange={(event) => {
              return setCategory(event.target.value);
            }}
            minLength={2}
            maxLength={80}
            required
            className="mt-1 block w-full rounded-xl border border-violet-200 bg-white/70 p-2.5 font-normal"
            placeholder="e.g. Payment question"
          />
        </label>
        <label className="text-sm font-700 text-blue-ink sm:col-span-2">
          Concern description
          <textarea
            value={description}
            onChange={(event) => {
              return setDescription(event.target.value);
            }}
            minLength={5}
            maxLength={4000}
            required
            className="mt-1 block min-h-24 w-full rounded-xl border border-violet-200 bg-white/70 p-2.5 font-normal"
            placeholder="Describe the customer's concern"
          />
        </label>
        <button
          type="submit"
          disabled={
            !!pending ||
            !selectedClient ||
            !newSource ||
            category.trim().length < 2 ||
            description.trim().length < 5
          }
          className="justify-self-start rounded-xl bg-blue px-4 py-2.5 text-sm font-700 text-white disabled:opacity-40"
        >
          {pending === "create" ? "Logging…" : "Log concern"}
        </button>
      </form>
    </section>
  );
}
