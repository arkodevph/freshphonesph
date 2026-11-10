"use client";

import type { Me } from "@/lib/api";
import {
  SUPPORT_STATUSES,
  supportSourceLabel,
  type SupportCase,
} from "@/lib/api";
import { ResolutionDraft, STATUS_STYLES } from "./support-view";

type Props = {
  loading: boolean;
  cases: SupportCase[];
  focusedCase: string | null;
  drafts: Record<string, ResolutionDraft>;
  pending: string | null;
  editCase: (c: SupportCase, patch: Partial<ResolutionDraft>) => void;
  me: Me | null;
  assignToMe: (c: SupportCase) => Promise<void>;
  saveCase: (c: SupportCase) => Promise<void>;
  discardDraft: (id: string) => void;
  activeCaseId: string | null;
  openCase: (id: string) => void;
};

export default function SupportCasesTable({
  loading,
  cases,
  focusedCase,
  drafts,
  pending,
  editCase,
  me,
  assignToMe,
  saveCase,
  discardDraft,
  activeCaseId,
  openCase,
}: Props) {
  return (
    <div className="glass overflow-x-auto rounded-3xl p-5">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-ink-soft">
          <tr className="border-b border-white/60">
            {[
              "#",
              "Client",
              "Category",
              "Source",
              "Concern",
              "Received",
              "Status",
              "Assignee",
              "Resolution",
              "Action",
            ].map((label) => {
              return (
                <th key={label} className="px-2 py-2">
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={10} className="px-2 py-6 text-center text-ink-soft">
                Loading…
              </td>
            </tr>
          ) : cases.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-2 py-6 text-center text-ink-soft">
                {focusedCase ? "This case is unavailable." : "No cases."}
              </td>
            </tr>
          ) : (
            cases.map((c) => {
              const draft = drafts[String(c.id)];

              const stale = !!draft && draft.version !== c.version;

              return (
                <tr key={c.id} className="border-b border-white/40">
                  <td className="px-2 py-2.5 font-600 text-blue-ink">
                    {String(c.id).slice(0, 8)}
                  </td>
                  <td className="px-2 py-2.5 font-700 text-blue-ink">
                    {c.client_name}
                  </td>
                  <td className="px-2 py-2.5">{c.category}</td>
                  <td className="px-2 py-2.5 text-xs text-ink-soft">
                    {supportSourceLabel(c.source)}
                  </td>
                  <td className="max-w-xs px-2 py-2.5 text-ink-soft">
                    <p className="truncate" title={c.description}>
                      {c.description}
                    </p>
                    {c.last_message?.by_customer && (
                      <strong className="mt-1 block text-xs text-violet-700">
                        Customer replied
                      </strong>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-ink-soft">
                    {c.date_received.slice(0, 10)}
                  </td>
                  <td className="px-2 py-2.5">
                    <select
                      aria-label={`Status for ${c.category}`}
                      value={draft?.status ?? c.status}
                      disabled={!!pending || c.status === "closed"}
                      onChange={(event) => {
                        return editCase(c, { status: event.target.value });
                      }}
                      className={`rounded-full px-2.5 py-1 text-xs font-700 outline-none ${STATUS_STYLES[c.status] ?? ""}`}
                    >
                      {SUPPORT_STATUSES.map(([value, label]) => {
                        return (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                  <td className="px-2 py-2.5 text-xs text-ink-soft">
                    {c.assigned_staff_name ??
                      (["csr", "coo", "cs_head", "cs_team"].includes(
                        me?.role ?? "",
                      ) && !["resolved", "closed"].includes(c.status) ? (
                        <button
                          type="button"
                          disabled={!!pending}
                          onClick={() => {
                            return void assignToMe(c);
                          }}
                          className="rounded-lg bg-white/70 px-2 py-1 font-700 text-blue"
                        >
                          Assign to me
                        </button>
                      ) : (
                        "Unassigned"
                      ))}
                  </td>
                  <td className="px-2 py-2.5">
                    <input
                      aria-label={`Resolution for ${c.category}`}
                      value={draft?.resolution ?? c.resolution}
                      onChange={(event) => {
                        return editCase(c, {
                          resolution: event.target.value,
                        });
                      }}
                      disabled={!!pending || c.status === "closed"}
                      className="w-52 rounded-lg border border-white/70 bg-white/70 px-2 py-1 text-xs"
                      placeholder="What was done?"
                    />
                    {stale && (
                      <p className="mt-1 max-w-52 text-xs text-rose-700">
                        Case changed. Your draft is retained; discard it before
                        saving.
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          return void saveCase(c);
                        }}
                        disabled={
                          !!pending || !draft || stale || c.status === "closed"
                        }
                        className="rounded-lg bg-blue px-3 py-1 text-xs font-700 text-white disabled:opacity-40"
                      >
                        {pending === `save:${c.id}` ? "Saving…" : "Save"}
                      </button>
                      {draft && (
                        <button
                          type="button"
                          disabled={!!pending}
                          onClick={() => {
                            return discardDraft(String(c.id));
                          }}
                          className="rounded-lg bg-white/70 px-3 py-1 text-xs font-700 text-blue-ink"
                        >
                          Discard resolution draft
                        </button>
                      )}
                      <button
                        type="button"
                        aria-expanded={activeCaseId === String(c.id)}
                        onClick={() => {
                          return openCase(String(c.id));
                        }}
                        className="rounded-lg bg-violet-100 px-3 py-1 text-xs font-700 text-violet-700"
                      >
                        Conversation
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
