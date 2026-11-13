"use client";

import HandlerClientTable from "@/app/system/_role-designs/coo/app/system/clients/HandlerClientTable";
import { isBatchHandler } from "@/lib/handler-workspace";
import type { ClientSortField } from "@freshphones/contracts";
import type { HandlerTableSort } from "@/lib/handler-table";
import WorkspaceProgress, {
  TableSkeletonRows,
} from "@/app/system/_role-designs/coo/components/WorkspaceProgress";
import FormSelect from "@/app/system/_role-designs/coo/components/FormSelect";
import AnimatedDisclosure from "@/app/system/_role-designs/coo/components/AnimatedDisclosure";
import DateInput from "@/app/system/_role-designs/coo/components/DateInput";
import { DocumentChecklist } from "@/app/system/_role-designs/coo/components/DocumentChecklist";
import type { Me } from "@/lib/api";
import { type ClientRecord, type RecordId, type ScheduleItem } from "@/lib/api";
import { can } from "@/lib/useMe";
import { CalendarBlank } from "@phosphor-icons/react";
import type { Dispatch, SetStateAction } from "react";
import { Fragment } from "react";
import styles from "@/app/system/_role-designs/coo/app/system/clients/clients.module.css";
import { inputCls } from "@/app/system/_role-designs/coo/components/FormField";

type Props = {
  loading: boolean;
  error: string | null;
  sort: HandlerTableSort<ClientSortField>;
  onSort: (key: ClientSortField) => void;
  onResetSort: () => void;
  onRetry: () => void;
  scheduleLoading: boolean;
  clients: ClientRecord[];
  me: Me | null;
  canManage: boolean;
  releasing: boolean;
  setReleaseDraft: Dispatch<
    SetStateAction<{
      id: RecordId;
      version?: number;
      status: "NOT_READY" | "PROCESSING" | "READY" | "RELEASED";
      note: string;
      collectionDate: string;
    } | null>
  >;
  releaseDraft: {
    id: RecordId;
    version?: number;
    status: "NOT_READY" | "PROCESSING" | "READY" | "RELEASED";
    note: string;
    collectionDate: string;
  } | null;
  setDetails: Dispatch<
    SetStateAction<{ id: RecordId; mode: "edit" | "history" } | null>
  >;
  toggleSchedule: (id: RecordId) => Promise<void>;
  schedule: { id: RecordId; items: ScheduleItem[] } | null;
  setManagedClient: Dispatch<SetStateAction<ClientRecord | null>>;
  canReadDocuments: boolean;
  setDocumentClient: Dispatch<SetStateAction<RecordId | null>>;
  documentClient: RecordId | null;
  saveRelease: (c: ClientRecord) => Promise<void>;
  saving: boolean;
};

export default function ClientRecordsTable({
  loading,
  error,
  sort,
  onSort,
  onResetSort,
  onRetry,
  scheduleLoading,
  clients,
  me,
  canManage,
  releasing,
  setReleaseDraft,
  releaseDraft,
  setDetails,
  toggleSchedule,
  schedule,
  setManagedClient,
  canReadDocuments,
  setDocumentClient,
  documentClient,
  saveRelease,
  saving,
}: Props) {
  if (isBatchHandler(me?.role) && me) {
    return (
      <HandlerClientTable
        key={String(me.id)}
        clients={clients}
        loading={loading}
        error={error}
        userId={String(me.id)}
        sort={sort}
        onSort={onSort}
        onResetSort={onResetSort}
        onRetry={onRetry}
        onRequirements={can(me, "DOCUMENT_READ") ? setManagedClient : undefined}
      />
    );
  }

  return (
    <div
      className={styles.tableScroll}
      role="region"
      aria-label="Client records"
      tabIndex={0}
    >
      <table className={styles.table}>
        <caption className="sr-only">
          Clients, batch membership, status, release and records
        </caption>
        <thead className="text-xs uppercase tracking-wide text-ink-soft">
          <tr className="border-b border-white/60">
            <th scope="col" className="px-2 py-2">
              Client
            </th>
            <th scope="col" className="px-2 py-2">
              Batch
            </th>
            <th scope="col" className="px-2 py-2">
              Status
            </th>
            <th scope="col" className="px-2 py-2">
              Release
            </th>
            <th scope="col" className="px-2 py-2 text-right">
              Records
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeletonRows
              identity
              columns={5}
              cellClassName="px-2 py-2.5"
              label="Loading…"
            />
          ) : clients.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-2 py-6 text-center text-ink-soft">
                {["core_handler", "batch_handler", "batch_manager"].includes(
                  me?.role ?? "",
                )
                  ? "No assigned clients match these filters."
                  : "No clients match these filters."}
              </td>
            </tr>
          ) : (
            clients.map((c) => {
              return (
                <Fragment key={c.id}>
                  <tr className="border-b border-white/40">
                    <th scope="row" className={styles.identity}>
                      <span className={styles.avatar} aria-hidden="true">
                        {c.full_name
                          .trim()
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => {
                            return part[0];
                          })
                          .join("")}
                      </span>
                      <span className={styles.clientText}>
                        <strong>{c.full_name}</strong>
                        {c.contact_email && <span>{c.contact_email}</span>}
                        <span
                          className={styles.identifier}
                          title={String(c.id)}
                        >
                          #{typeof c.id === "string" ? c.id.slice(0, 8) : c.id}
                        </span>
                      </span>
                    </th>
                    <td className="px-2 py-2.5 text-ink-soft">
                      {c.batch_number}
                    </td>
                    <td className="px-2 py-2.5 capitalize">
                      <span className="rounded-full bg-sky-2/70 px-2.5 py-1 text-xs font-700 text-blue-ink">
                        {c.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="text-xs capitalize">
                        {(c.release_status ?? "not_ready").replaceAll("_", " ")}
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          className={styles.releaseButton}
                          disabled={releasing}
                          onClick={() => {
                            return setReleaseDraft((current) => {
                              return current?.id === c.id
                                ? null
                                : {
                                    id: c.id,
                                    version: c.version,
                                    status: (
                                      c.release_status ?? "not_ready"
                                    ).toUpperCase() as
                                      | "NOT_READY"
                                      | "PROCESSING"
                                      | "READY"
                                      | "RELEASED",
                                    note: "",
                                    collectionDate: "",
                                  };
                            });
                          }}
                        >
                          {releaseDraft?.id === c.id ? "Cancel" : "Post update"}
                        </button>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <AnimatedDisclosure
                        className={styles.records}
                        title="Records"
                      >
                        <div className={styles.recordActions}>
                          {canManage && (
                            <>
                              <button
                                type="button"
                                className="mr-2 rounded-lg bg-violet-100 px-2 py-1 text-xs font-700 text-violet-700"
                                aria-label={`Edit client ${c.full_name}`}
                                onClick={() => {
                                  return setDetails({ id: c.id, mode: "edit" });
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="mr-2 rounded-full bg-white/70 px-2.5 py-1 text-xs font-700 text-blue"
                                aria-label={`Change history for client ${c.full_name}`}
                                onClick={() => {
                                  return setDetails({
                                    id: c.id,
                                    mode: "history",
                                  });
                                }}
                              >
                                History
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            aria-expanded={schedule?.id === c.id}
                            aria-label={`Installment schedule for ${c.full_name}`}
                            onClick={() => {
                              return toggleSchedule(c.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-700 text-blue hover:bg-white"
                          >
                            <CalendarBlank
                              weight="bold"
                              className="h-3.5 w-3.5"
                            />
                            {schedule?.id === c.id
                              ? "Hide schedule"
                              : "Schedule"}
                          </button>
                          {can(me, "DOCUMENT_READ") && (
                            <button
                              type="button"
                              onClick={() => {
                                return setManagedClient(c);
                              }}
                              className="ml-2 rounded-full bg-white/70 px-2.5 py-1 text-xs text-blue"
                            >
                              Requirements
                            </button>
                          )}
                          {canReadDocuments && (
                            <button
                              type="button"
                              onClick={() => {
                                return setDocumentClient((current) => {
                                  return current === c.id ? null : c.id;
                                });
                              }}
                              className="ml-2 rounded-full bg-white/70 px-2.5 py-1 text-xs font-700 text-blue hover:bg-white"
                            >
                              {documentClient === c.id
                                ? "Hide documents"
                                : "Documents"}
                            </button>
                          )}
                        </div>
                      </AnimatedDisclosure>
                    </td>
                  </tr>
                  {releaseDraft?.id === c.id && (
                    <tr>
                      <td colSpan={5} className="px-2 pb-3">
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();

                            void saveRelease(c);
                          }}
                          className="glass-tint grid gap-3 rounded-2xl p-4"
                        >
                          <fieldset
                            disabled={releasing}
                            className="grid min-w-0 gap-3"
                          >
                            <h2 className="text-sm font-700 text-blue-ink">
                              Release update for {c.full_name}
                            </h2>
                            <div className="grid gap-3 md:grid-cols-3">
                              <div className="grid gap-1 text-xs text-blue-ink">
                                Status
                                <FormSelect
                                  label="Release status"
                                  value={releaseDraft.status}
                                  onValueChange={(next) => {
                                    return setReleaseDraft({
                                      ...releaseDraft,
                                      status:
                                        next as typeof releaseDraft.status,
                                    });
                                  }}
                                  options={[
                                    { value: "NOT_READY", label: "Not ready" },
                                    {
                                      value: "PROCESSING",
                                      label: "Processing",
                                    },
                                    { value: "READY", label: "Ready" },
                                    { value: "RELEASED", label: "Released" },
                                  ]}
                                />
                              </div>
                              <label className="grid gap-1 text-xs text-blue-ink md:col-span-2">
                                Collection date, if confirmed
                                <DateInput
                                  type="date"
                                  value={releaseDraft.collectionDate}
                                  onChange={(event) => {
                                    return setReleaseDraft({
                                      ...releaseDraft,
                                      collectionDate: event.target.value,
                                    });
                                  }}
                                  disabled={
                                    !["READY", "RELEASED"].includes(
                                      releaseDraft.status,
                                    )
                                  }
                                  className={inputCls}
                                />
                              </label>
                            </div>
                            <label className="grid gap-1 text-xs text-blue-ink">
                              Customer-visible update or collection instructions
                              <textarea
                                value={releaseDraft.note}
                                onChange={(event) => {
                                  return setReleaseDraft({
                                    ...releaseDraft,
                                    note: event.target.value,
                                  });
                                }}
                                maxLength={1000}
                                rows={3}
                                className={inputCls}
                                placeholder="What changed, or how should the customer arrange collection?"
                              />
                            </label>
                            <div>
                              {releaseDraft.version !== c.version && (
                                <p
                                  role="alert"
                                  className="text-sm text-rose-700"
                                >
                                  This client changed. Your release draft is
                                  retained; discard it and review the current
                                  record before posting.
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  return setReleaseDraft(null);
                                }}
                                className="mr-3 text-xs underline"
                              >
                                Discard release draft
                              </button>
                              <button
                                type="submit"
                                disabled={
                                  releaseDraft.version !== c.version ||
                                  releasing ||
                                  saving
                                }
                                className="rounded-xl bg-blue px-4 py-2 text-xs font-700 text-white disabled:opacity-50"
                              >
                                Post release update
                              </button>
                            </div>
                          </fieldset>
                        </form>
                      </td>
                    </tr>
                  )}
                  {schedule?.id === c.id && (
                    <tr>
                      <td colSpan={5} className="px-2 pb-3">
                        <div className="glass-tint rounded-2xl p-3">
                          <table className="w-full text-left text-xs">
                            <thead className="text-ink-soft">
                              <tr>
                                <th className="px-2 py-1">#</th>
                                <th className="px-2 py-1">Due date</th>
                                <th className="px-2 py-1">Expected</th>
                              </tr>
                            </thead>
                            <tbody>
                              {schedule.items.map((s) => {
                                return (
                                  <tr key={s.id}>
                                    <td className="px-2 py-1">
                                      {s.sequence_no}
                                    </td>
                                    <td className="px-2 py-1">{s.due_date}</td>
                                    <td className="px-2 py-1 font-600 text-blue-ink">
                                      ₱{s.expected_amount}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                  {canReadDocuments && documentClient === c.id && (
                    <tr>
                      <td colSpan={5} className="px-2 pb-3">
                        <div className="glass-tint rounded-2xl p-4">
                          <DocumentChecklist clientId={c.id} reviewer />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
