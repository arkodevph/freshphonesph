import { NotFoundException } from "@nestjs/common";
import {
  businessRole,
  type StaffAlert,
  type StaffAlertPage,
  type StaffAlertScope,
} from "@freshphones/contracts";
import { Prisma } from "../generated/prisma/client";
import { taskAlertRows, paymentResultRows } from "./alert-queries";
import {
  paymentReviewAlertRows,
  markPaymentReviewsRead,
} from "./payment-review-alerts";
import { staffAlertView, type AlertRow } from "./staff-alert-view";

type Tx = Prisma.TransactionClient;

export function isHandlerInbox(role: string) {
  return (
    businessRole(role as Parameters<typeof businessRole>[0]) === "BATCH_HANDLER"
  );
}

const source = (id: string, now: Date) => {
  return Prisma.sql`${taskAlertRows(id, now)} UNION ALL ${paymentResultRows(id)} UNION ALL ${paymentReviewAlertRows(id)}`;
};

const key = Prisma.sql`a.entity || ':' || a.id::text || ':' || a.kind || CASE WHEN a.entity = 'task'
  THEN ':' || to_char(a.deadline, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') ELSE '' END`;

/** Capture received events, including when email delivery is disabled. Never revive a deleted key. */
export async function captureHandlerInbox(
  tx: Tx,
  recipientId: string,
  now = new Date(),
) {
  const user = await tx.user.findUnique({
    where: { id: recipientId },
    select: { role: true, active: true },
  });

  if (!user?.active || !isHandlerInbox(user.role)) {
    return;
  }

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(740016, hashtext(${recipientId}))`;

  const rows = await tx.$queryRaw<(AlertRow & { sourceKey: string })[]>`
    WITH a AS (${source(recipientId, now)}) SELECT a.*, ${key} AS "sourceKey" FROM a
    WHERE NOT EXISTS (SELECT 1 FROM "StaffInboxNotification" n
      WHERE n."recipientId" = ${recipientId}::uuid AND n."sourceKey" = ${key})
      AND (a."paymentId" IS NULL OR EXISTS (SELECT 1 FROM "Payment" p JOIN "Client" c ON c.id=p."clientId"
        WHERE p.id=a."paymentId" AND c."retentionErasedAt" IS NULL))`;

  for (let offset = 0; offset < rows.length; offset += 500) {
    await tx.staffInboxNotification.createMany({
      skipDuplicates: true,
      data: rows.slice(offset, offset + 500).map((row) => {
        const alert = staffAlertView(row);

        return {
          recipientId,
          sourceKey: row.sourceKey,
          entity: row.entity,
          sourceId: row.id,
          kind: row.kind,
          payload: JSON.parse(JSON.stringify(alert)),
          taskId: row.entity === "task" ? row.id : null,
          paymentId: row.paymentId,
          occurredAt: row.occurredAt,
          readAt: row.readAt,
        };
      }),
    });
  }

  // Keep legacy read endpoints compatible, without overwriting inbox read/deletion decisions.
  await tx.$executeRaw`
    WITH a AS (${source(recipientId, now)}) UPDATE "StaffInboxNotification" n SET "readAt" = a."readAt"
    FROM a WHERE n."recipientId" = ${recipientId}::uuid AND n."sourceKey" = ${key}
      AND n."deletedAt" IS NULL AND n."readAt" IS NULL AND a."readAt" IS NOT NULL`;
}

function entityForScope(scope: StaffAlertScope) {
  return scope === "tasks"
    ? "task"
    : scope === "results"
      ? "payment-result"
      : scope === "reviews"
        ? "payment-review"
        : scope;
}

export async function handlerInboxPage(
  tx: Tx,
  recipientId: string,
  query: { page: number; unreadOnly: boolean; scope: StaffAlertScope },
): Promise<StaffAlertPage> {
  const base = { recipientId, deletedAt: null };

  const filtered = {
    ...base,
    ...(query.scope !== "all" ? { entity: entityForScope(query.scope) } : {}),
  };

  const where = { ...filtered, ...(query.unreadOnly ? { readAt: null } : {}) };

  const [items, counts] = await Promise.all([
    tx.staffInboxNotification.findMany({
      where,
      take: 20,
      skip: (query.page - 1) * 20,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      include: {
        task: { select: { assigneeId: true } },
        payment: {
          select: {
            batch: { select: { handlerId: true } },
            client: { select: { retentionErasedAt: true } },
          },
        },
      },
    }),
    tx.$queryRaw<{ entity: string; total: bigint; unread: bigint }[]>`
      SELECT entity, COUNT(*) AS total, COUNT(*) FILTER (WHERE "readAt" IS NULL) AS unread
      FROM "StaffInboxNotification" WHERE "recipientId" = ${recipientId}::uuid AND "deletedAt" IS NULL GROUP BY entity`,
  ]);

  const active = counts.reduce((n, row) => {
    return n + Number(row.total);
  }, 0);

  const unread = counts.reduce((n, row) => {
    return n + Number(row.unread);
  }, 0);

  const selected =
    query.scope === "all"
      ? counts
      : counts.filter((row) => {
          return row.entity === entityForScope(query.scope);
        });

  const filteredCount = selected.reduce((n, row) => {
    return n + Number(row.total);
  }, 0);

  const filteredUnread = selected.reduce((n, row) => {
    return n + Number(row.unread);
  }, 0);

  const count = (entity: string) => {
    return Number(
      counts.find((row) => {
        return row.entity === entity;
      })?.total ?? 0,
    );
  };

  return {
    items: items.map((row) => {
      const saved = row.payload as unknown as StaffAlert;

      const available =
        row.entity === "task"
          ? row.task?.assigneeId === recipientId
          : row.payment?.batch.handlerId === recipientId &&
            row.payment.client.retentionErasedAt === null;

      return {
        ...saved,
        inboxId: row.id,
        readAt: row.readAt?.toISOString() ?? null,
        ...(available
          ? {}
          : {
              unavailable: true,
              message:
                "The linked record is no longer available with your current access.",
              targetPath: "",
            }),
      };
    }),
    total: query.unreadOnly ? filteredUnread : filteredCount,
    page: query.page,
    pageSize: 20,
    activeCount: active,
    unreadCount: unread,
    filteredCount,
    filteredUnreadCount: filteredUnread,
    taskCount: count("task"),
    resultCount: count("payment-result"),
    reviewCount: count("payment-review"),
    financeCount: 0,
    supportCount: 0,
    accountCount: 0,
    enrollmentCount: 0,
  };
}

export async function readHandlerInbox(
  tx: Tx,
  recipientId: string,
  now: Date,
  id?: string,
  scope: StaffAlertScope = "all",
) {
  const where = {
    recipientId,
    deletedAt: null,
    ...(id ? { id } : {}),
    ...(scope !== "all" ? { entity: entityForScope(scope) } : {}),
  };

  if (
    id &&
    !(await tx.staffInboxNotification.findFirst({
      where,
      select: { id: true },
    }))
  ) {
    throw new NotFoundException("Notification not found.");
  }

  if (id) {
    const row = await tx.staffInboxNotification.findFirstOrThrow({ where });

    if (row.readAt) {
      return { updated: 0, id, readAt: row.readAt.toISOString() };
    }

    const alert = row.payload as unknown as StaffAlert;

    if (alert.entity === "payment-review") {
      await markPaymentReviewsRead(tx, recipientId, now, alert.id);
    } else if (alert.entity === "payment-result") {
      await tx.paymentResultAlert.updateMany({
        where: {
          id: alert.id,
          userId: recipientId,
          readAt: null,
          payment: { batch: { handlerId: recipientId } },
        },
        data: { readAt: now },
      });
    } else if (
      alert.entity === "task" &&
      (await tx.task.findFirst({
        where: {
          id: alert.id,
          assigneeId: recipientId,
          deadline: new Date(alert.deadline),
        },
        select: { id: true },
      }))
    ) {
      await tx.taskAlertRead.upsert({
        where: {
          userId_taskId_kind: {
            userId: recipientId,
            taskId: alert.id,
            kind: alert.kind,
          },
        },
        create: {
          userId: recipientId,
          taskId: alert.id,
          kind: alert.kind,
          deadline: new Date(alert.deadline),
          readAt: now,
        },
        update: { deadline: new Date(alert.deadline), readAt: now },
      });
    }
  }

  const updated = await tx.staffInboxNotification.updateMany({
    where: { ...where, readAt: null },
    data: { readAt: now },
  });

  if (updated.count) {
    await tx.changeEvent.create({
      data: { entity: "staff-alert-read", recordId: recipientId },
    });
  }

  return {
    updated: updated.count,
    ...(id ? { id, readAt: now.toISOString() } : {}),
  };
}

export async function deleteHandlerInbox(
  tx: Tx,
  recipientId: string,
  id: string,
  now: Date,
) {
  const row = await tx.staffInboxNotification.findFirst({
    where: { id, recipientId },
    select: { id: true, deletedAt: true },
  });

  if (!row) {
    throw new NotFoundException("Notification not found.");
  }

  if (row.deletedAt) {
    return { id };
  }

  // Keep only the deduplication tombstone, so polling cannot recreate the deleted notice.
  await tx.staffInboxNotification.update({
    where: { id },
    data: { deletedAt: now, payload: Prisma.JsonNull },
  });

  await tx.changeEvent.create({
    data: { entity: "staff-alert-read", recordId: recipientId },
  });

  return { id };
}
