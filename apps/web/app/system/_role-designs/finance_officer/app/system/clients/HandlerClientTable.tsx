"use client";

import { useEffect, useState } from "react";
import { CalendarBlank, FileText } from "@phosphor-icons/react";
import type { ClientRecord } from "@/lib/api";
import { HandlerAccountDocument } from "@/app/system/_role-designs/finance_officer/components/HandlerAccountDocument";
import { HandlerMemberScheduleDialog } from "@/app/system/_role-designs/finance_officer/app/system/clients/HandlerMemberScheduleDialog";
import type { ClientSortField } from "@freshphones/contracts";
import type { HandlerTableSort } from "@/lib/handler-table";
import HandlerDataTable, {
  HandlerTableText,
  HandlerRowActions,
  type HandlerTableColumn,
} from "@/app/system/_role-designs/finance_officer/components/handler-table/HandlerDataTable";
import styles from "@/app/system/_role-designs/finance_officer/components/handler-table/handler-data-table.module.css";

export default function HandlerClientTable({
  clients,
  loading,
  error,
  userId,
  sort,
  onSort,
  onResetSort,
  onRetry,
  onRequirements,
}: {
  clients: ClientRecord[];
  loading: boolean;
  error: string | null;
  userId: string;
  sort: HandlerTableSort<ClientSortField>;
  onSort: (key: ClientSortField) => void;
  onResetSort: () => void;
  onRetry: () => void;
  onRequirements?: (client: ClientRecord) => void;
}) {
  const [statement, setStatement] = useState<string | null>(null);

  const [scheduleClient, setScheduleClient] = useState<ClientRecord | null>(
    null,
  );

  const selected = clients.find((client) => {
    return client.id === scheduleClient?.id;
  });

  useEffect(() => {
    if (!loading && scheduleClient && (!selected || error)) {
      setScheduleClient(null);
    }
  }, [loading, scheduleClient, selected, error]);

  const columns: HandlerTableColumn<ClientRecord, ClientSortField>[] = [
    {
      id: "name",
      label: "Name",
      width: 280,
      pin: "primary",
      sortKey: "name",
      render: (c) => {
        return <HandlerTableText value={c.full_name} />;
      },
    },
    {
      id: "batch",
      label: "Batch",
      width: 184,
      pin: "secondary",
      sortKey: "batchCode",
      render: (c) => {
        return <HandlerTableText value={c.batch_number} />;
      },
    },
    {
      id: "id",
      label: "Member",
      width: 136,
      render: (c) => {
        return <HandlerTableText value={String(c.id)} />;
      },
    },
    {
      id: "email",
      label: "Email",
      width: 288,
      render: (c) => {
        return <HandlerTableText value={c.contact_email} />;
      },
    },
    {
      id: "status",
      label: "Status",
      width: 136,
      render: (c) => {
        return (
          <span className={styles.badge}>
            <HandlerTableText
              value={
                c.status[0].toUpperCase() +
                c.status.slice(1).replaceAll("_", " ")
              }
            />
          </span>
        );
      },
    },
    {
      id: "release",
      label: "Release",
      width: 160,
      render: (c) => {
        return (
          <HandlerTableText
            value={(c.release_status ?? "not_ready")
              .replaceAll("_", " ")
              .replace(/^./, (letter) => {
                return letter.toUpperCase();
              })}
          />
        );
      },
    },
    {
      id: "actions",
      label: "Records",
      width: 56,
      actions: true,
      render: (c) => {
        return (
          <HandlerRowActions label={c.full_name}>
            <button
              type="button"
              onClick={() => {
                return setScheduleClient(c);
              }}
            >
              <CalendarBlank aria-hidden="true" />
              View schedule
            </button>
            <button
              type="button"
              onClick={() => {
                return setStatement(String(c.id));
              }}
            >
              <FileText aria-hidden="true" />
              Statement of account
            </button>
            {onRequirements && (
              <button
                type="button"
                onClick={() => {
                  return onRequirements(c);
                }}
              >
                <FileText aria-hidden="true" /> Configured requirements
              </button>
            )}
          </HandlerRowActions>
        );
      },
    },
  ];

  return (
    <>
      {statement && (
        <HandlerAccountDocument
          key={statement}
          target={{ kind: "statement", id: statement }}
          onClose={() => {
            return setStatement(null);
          }}
        />
      )}
      <HandlerDataTable
        key={userId}
        id="members"
        userId={userId}
        label="Members & schedules"
        caption="Currently assigned batch members. Name and Batch sort all matching records. Open a row's records menu to view the member's installment schedule."
        rows={clients}
        rowId={(c) => {
          return c.id;
        }}
        columns={columns}
        loading={loading}
        error={error}
        empty="No assigned members match these filters."
        sort={sort}
        onSort={onSort}
        onResetSort={onResetSort}
        onRetry={onRetry}
      />
      {scheduleClient && selected && !error && (
        <HandlerMemberScheduleDialog
          key={String(selected.id)}
          client={selected}
          onClose={() => {
            return setScheduleClient(null);
          }}
        />
      )}
    </>
  );
}
