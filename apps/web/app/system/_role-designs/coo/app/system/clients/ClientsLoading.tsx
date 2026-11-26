"use client";

import CooActionDisclosure from "@/app/system/_role-designs/coo/app/system/CooActionDisclosure";
import ClientRecordsTable from "./ClientRecordsTable";
import { RecordFilters } from "@/app/system/_role-designs/coo/components/RecordFilters";
import { RecordPagination } from "@/app/system/_role-designs/coo/components/RecordPagination";
import { SkeletonText } from "@/app/system/_role-designs/coo/components/WorkspaceProgress";
import { emptyRecordFilters } from "@/lib/record-filters";
import { newestHandlerSort } from "@/lib/handler-table";
import { can, useMe } from "@/lib/useMe";
import styles from "./clients.module.css";

const noop = () => {};

const pendingAction = async () => {};

/** Route streaming uses the same controls and table as the finished directory. */
export default function ClientsLoading() {
  const me = useMe();

  return (
    <div
      className={styles.workspace}
      aria-busy="true"
      aria-label="Loading clients"
      inert
    >
      <header className={styles.heading}>
        <h1>Clients</h1>
      </header>
      <div className={styles.tools}>
        {can(me, "ENROLLMENT_REVIEW") && (
          <CooActionDisclosure role={me?.role} title="Add client to a batch">
            {null}
          </CooActionDisclosure>
        )}
        {can(me, "REQUIREMENT_MANAGE") && (
          <CooActionDisclosure
            role={me?.role}
            title="Configure requirement checklist"
          >
            {null}
          </CooActionDisclosure>
        )}
      </div>
      <RecordFilters
        compact
        kind="client"
        value={emptyRecordFilters}
        onChange={noop}
        onClear={noop}
        onRefresh={noop}
        loading
        error={null}
      />
      <p className="mb-3 text-sm text-ink-soft">
        <SkeletonText>Loading clients…</SkeletonText>
      </p>
      <ClientRecordsTable
        loading
        error={null}
        sort={newestHandlerSort}
        onSort={noop}
        onResetSort={noop}
        onRetry={noop}
        scheduleLoading={false}
        clients={[]}
        me={me}
        canManage={can(me, "CLIENT_MANAGE")}
        releasing={false}
        setReleaseDraft={noop}
        releaseDraft={null}
        setDetails={noop}
        toggleSchedule={pendingAction}
        schedule={null}
        setManagedClient={noop}
        canReadDocuments={false}
        setDocumentClient={noop}
        documentClient={null}
        saveRelease={pendingAction}
        saving={false}
      />
      <RecordPagination
        page={1}
        total={0}
        hasNext={false}
        loading
        onPage={noop}
      />
    </div>
  );
}
