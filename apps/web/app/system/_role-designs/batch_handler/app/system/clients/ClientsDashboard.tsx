"use client";

import CooActionDisclosure from "@/app/system/_role-designs/batch_handler/app/system/CooActionDisclosure";
import { useClientsWorkspace } from "@/app/system/clients/useClientsWorkspace";
import { isBatchHandler } from "@/lib/handler-workspace";
import { can } from "@/lib/useMe";
import styles from "@/app/system/_role-designs/batch_handler/app/system/clients/clients.module.css";
import {
  ManagedClientRequirements,
  RequirementsManager,
} from "@/app/system/_role-designs/batch_handler/components/ManagedClientRequirements";
import { RecordDetails } from "@/app/system/_role-designs/batch_handler/components/RecordDetails";
import { RecordFilters } from "@/app/system/_role-designs/batch_handler/components/RecordFilters";
import { RecordPagination } from "@/app/system/_role-designs/batch_handler/components/RecordPagination";
import { emptyRecordFilters } from "@/lib/record-filters";
import ClientRecordsTable from "@/app/system/_role-designs/batch_handler/app/system/clients/ClientRecordsTable";
import CreateClientForm from "@/app/system/_role-designs/batch_handler/app/system/clients/CreateClientForm";

export default function ClientsDashboard() {
  const {
    createClientFormProps,
    clientRecordsTableProps,
    me,
    canRead,
    error,
    listError,
    notice,
    filters,
    changeFilter,
    focusedClient,
    batchFilter,
    setFilters,
    removeLink,
    load,
    loading,
    filterError,
    total,
    page,
    setDetails,
    setManagedClient,
    hasNext,
    setPage,
    managedClient,
    setError,
    flash,
    details,
  } = useClientsWorkspace();

  if (me && !canRead) {
    return (
      <section className="glass rounded-3xl p-10 text-center">
        <h1 className="font-display text-xl font-700 text-blue-ink">
          No access
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Your role doesn&apos;t manage client records.
        </p>
      </section>
    );
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.heading}>
        <h1>Clients</h1>
      </header>

      {(error || notice) && (
        <div
          role={error ? "alert" : "status"}
          className={`mb-4 rounded-2xl px-4 py-2.5 text-sm font-600 ${
            error
              ? "bg-rose-100 text-rose-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {error ?? notice}
        </div>
      )}

      <div className={styles.tools}>
        {can(me, "ENROLLMENT_REVIEW") && (
          <CooActionDisclosure role={me?.role} title="Add client to a batch">
            <CreateClientForm {...createClientFormProps} />
          </CooActionDisclosure>
        )}
        {can(me, "REQUIREMENT_MANAGE") && (
          <CooActionDisclosure
            role={me?.role}
            title="Configure requirement checklist"
          >
            <RequirementsManager />
          </CooActionDisclosure>
        )}
      </div>
      {canRead && (
        <RecordFilters
          compact={me?.role === "coo"}
          kind="client"
          value={filters}
          onChange={changeFilter}
          hasContext={Boolean(focusedClient || batchFilter)}
          onClear={() => {
            setFilters(emptyRecordFilters);

            removeLink("client", "documents", "batch");
          }}
          onRefresh={() => {
            return void load();
          }}
          loading={loading}
          error={focusedClient ? null : filterError}
        />
      )}
      {batchFilter && (
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-violet-100 px-4 py-2 text-sm text-violet-700">
          Viewing members of one batch
          <button
            type="button"
            className="font-700 underline"
            onClick={() => {
              return removeLink("batch");
            }}
          >
            Show all batches
          </button>
        </div>
      )}

      {focusedClient && (
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-violet-100 px-4 py-2 text-sm text-violet-700">
          Viewing one linked client. Filters apply when you return to the list.{" "}
          <button
            type="button"
            onClick={() => {
              return removeLink("client", "documents");
            }}
            className="font-700 underline"
          >
            Show all clients
          </button>
        </div>
      )}
      {canRead && (
        <p role="status" className="mb-3 text-sm text-ink-soft">
          {!focusedClient && filterError
            ? "Fix the date range to view clients."
            : isBatchHandler(me?.role) && listError
              ? "Could not load member records."
              : loading
                ? "Loading clients…"
                : total
                  ? `Showing ${focusedClient ? 1 : (page - 1) * 20 + 1}–${focusedClient ? total : Math.min(page * 20, total)} of ${total} clients`
                  : "0 clients"}
        </p>
      )}

      <ClientRecordsTable {...clientRecordsTableProps} />
      <RecordPagination
        page={focusedClient ? 1 : page}
        total={total}
        hasNext={hasNext}
        loading={loading}
        onPage={setPage}
      />
      {managedClient && can(me, "DOCUMENT_READ") && (
        <ManagedClientRequirements
          key={`${me?.id}:${managedClient.id}:${can(me, "DOCUMENT_REVIEW")}:${can(me, "DOCUMENT_UPLOAD")}`}
          client={managedClient}
          canReview={can(me, "DOCUMENT_REVIEW")}
          canUpload={can(me, "DOCUMENT_UPLOAD")}
          onClose={() => {
            return setManagedClient(null);
          }}
          onError={setError}
          onNotice={flash}
        />
      )}
      {details && (
        <RecordDetails
          key={String(details.id)}
          kind="client"
          id={details.id}
          mode={details.mode}
          onClose={() => {
            return setDetails(null);
          }}
          onSaved={() => {
            flash("Client changes saved.");

            void load();
          }}
        />
      )}
    </div>
  );
}
