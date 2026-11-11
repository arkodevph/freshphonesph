"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { Bell } from "@phosphor-icons/react";
import { useStaffNotifications } from "./useStaffNotifications";
import { StaffNotificationList } from "./StaffNotificationList";
import styles from "./staff-alerts.module.css";

export function HandlerStaffAlerts({
  open,
  onToggle,
  onClose,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const panelId = useId();

  const trigger = useRef<HTMLButtonElement>(null);

  const { snapshot, loading, error, actionError, load, read } =
    useStaffNotifications();

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [open, load]);

  const unread = snapshot?.unreadCount ?? 0;

  const label = error
    ? "Notifications: unable to refresh"
    : !snapshot
      ? "Notifications: loading"
      : `Notifications: ${unread} unread`;

  return (
    <div className="system-popover-anchor">
      <button
        ref={trigger}
        type="button"
        className={`system-icon-button ${styles.bell}`}
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <Bell className="h-[19px] w-[19px]" aria-hidden="true" />
        {(unread > 0 || error) && (
          <span className={styles.badge} aria-hidden="true">
            {error ? "!" : unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <section
          id={panelId}
          className={`system-popover system-notifications-popover ${styles.panel}`}
          aria-label="Notifications preview"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              onClose();

              trigger.current?.focus();
            }
          }}
        >
          <header className={styles.heading}>
            <h2>Notifications</h2>
            {snapshot && (
              <span>{unread ? `${unread} unread` : "All caught up"}</span>
            )}
          </header>
          {actionError && (
            <p className={styles.error} role="alert">
              {actionError}
            </p>
          )}
          {error ? (
            <div className={styles.state} role="alert">
              <p>Could not load notifications.</p>
              <button
                type="button"
                onClick={() => {
                  return void load();
                }}
              >
                Try again
              </button>
            </div>
          ) : loading && !snapshot ? (
            <p className={styles.state} role="status">
              Loading notifications…
            </p>
          ) : !snapshot?.items.length ? (
            <p className={styles.state}>No notifications yet.</p>
          ) : (
            <StaffNotificationList
              items={snapshot.items.slice(0, 3)}
              compact
              onOpen={(alert) => {
                void read(alert);

                onClose();
              }}
            />
          )}
          <footer className={styles.footer}>
            <Link href="/system/notifications" onClick={onClose}>
              View all notifications
            </Link>
          </footer>
        </section>
      )}
    </div>
  );
}
