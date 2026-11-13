"use client";

import Link from "next/link";
import { Trash } from "@phosphor-icons/react";
import type { StaffAlert } from "@/lib/api";
import styles from "@/app/system/_role-designs/system_admin/components/staff-alerts.module.css";

function summary(alert: StaffAlert) {
  const hint =
    alert.entity === "payment-result"
      ? " · Open for Finance's decision and notes"
      : alert.entity === "payment-review"
        ? " · Open for the saved review note and current payment status"
        : "";

  return hint && alert.message.endsWith(hint)
    ? alert.message.slice(0, -hint.length)
    : alert.message;
}

export function StaffNotificationList({
  items,
  compact = false,
  onOpen,
  onRequestDelete,
  busy = false,
}: {
  items: StaffAlert[];
  compact?: boolean;
  onOpen: (alert: StaffAlert) => void;
  onRequestDelete?: (alert: StaffAlert) => void;
  busy?: boolean;
}) {
  function content(alert: StaffAlert) {
    return (
      <>
        <span className={styles.dot} aria-hidden="true" />
        <div>
          <strong>{alert.title}</strong>
          <p>{summary(alert)}</p>
          <small>
            {!compact && <span>{alert.readAt ? "Read" : "Unread"} · </span>}
            <time dateTime={alert.occurredAt}>
              {new Date(alert.occurredAt).toLocaleString("en-PH", {
                timeZone: "Asia/Manila",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              PHT
            </time>
          </small>
        </div>
      </>
    );
  }

  return (
    <ul className={styles.list} data-compact={compact}>
      {items.map((alert) => {
        const id = alert.inboxId;

        const label = `${alert.readAt ? "Read" : "Unread"}: ${alert.title}. ${summary(alert)}`;

        return (
          <li key={id ?? `${alert.entity}:${alert.id}`}>
            <div className={styles.notificationRow}>
              {alert.unavailable ? (
                <button
                  type="button"
                  className={styles.item}
                  data-unread={!alert.readAt}
                  aria-label={`${label}. Mark as read`}
                  onClick={() => {
                    return onOpen(alert);
                  }}
                >
                  {content(alert)}
                </button>
              ) : (
                <Link
                  href={alert.targetPath}
                  className={styles.item}
                  data-unread={!alert.readAt}
                  aria-label={label}
                  onClick={() => {
                    return onOpen(alert);
                  }}
                >
                  {content(alert)}
                </Link>
              )}
              {!compact && id && onRequestDelete && (
                <button
                  type="button"
                  className={styles.deleteAction}
                  data-delete-id={id}
                  aria-label={`Delete notification: ${alert.title}`}
                  title="Delete notification"
                  disabled={busy}
                  onClick={() => {
                    return onRequestDelete(alert);
                  }}
                >
                  <Trash aria-hidden="true" />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
