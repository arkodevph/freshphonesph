"use client";

import { useId, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { can, useMe } from "@/lib/useMe";
import { canOpenWorkspace } from "@/lib/workspace-access";
import { isBatchHandler } from "@/lib/handler-workspace";
import { type StaffAlertScope, type StaffAlert } from "@/lib/api";
import Select from "@/app/system/_role-designs/batch_manager/components/Select";
import { DeleteStaffNotificationDialog } from "@/app/system/_role-designs/batch_manager/components/DeleteStaffNotificationDialog";
import { StaffNotificationList } from "@/app/system/_role-designs/batch_manager/components/StaffNotificationList";
import { useStaffNotifications } from "@/components/useStaffNotifications";
import styles from "@/app/system/_role-designs/batch_manager/components/staff-alerts.module.css";

export default function NotificationsPage() {
  const me = useMe();

  const filterId = useId();

  const [deleteTarget, setDeleteTarget] = useState<StaffAlert | null>(null);

  const access = Boolean(
    me &&
    me.account_type === "employee" &&
    canOpenWorkspace(me.role, "/system/notifications", me.permissions),
  );

  const {
    snapshot,
    scope,
    setScope,
    page,
    setPage,
    unreadOnly,
    setUnreadOnly,
    loading,
    busy,
    notice,
    remove,
    error,
    actionError,
    load,
    read,
  } = useStaffNotifications(access);

  if (!me) {
    return <p role="status">Loading notifications…</p>;
  }

  if (!access) {
    return <p role="alert">No access to staff notifications.</p>;
  }

  const filters: { value: StaffAlertScope; label: string }[] = [
    { value: "all", label: "All notifications" },
    { value: "tasks", label: "Tasks" },
    ...(can(me, "PAYMENT_VERIFY")
      ? [{ value: "finance" as const, label: "Finance" }]
      : []),
    ...(can(me, "PAYMENT_READ") &&
    (can(me, "PAYMENT_RECORD") || me.role === "records")
      ? [{ value: "results" as const, label: "Finance results" }]
      : []),
    ...(isBatchHandler(me.role) && can(me, "PAYMENT_READ")
      ? [{ value: "reviews" as const, label: "Payment reviews" }]
      : []),
    ...(can(me, "SUPPORT_MANAGE")
      ? [{ value: "support" as const, label: "Support" }]
      : []),
    ...(can(me, "ACCOUNT_MANAGE")
      ? [{ value: "accounts" as const, label: "Accounts" }]
      : []),
    ...(can(me, "ENROLLMENT_SUBMIT", "ENROLLMENT_REVIEW")
      ? [{ value: "enrollments" as const, label: "Enrollments" }]
      : []),
  ];

  const pages = Math.max(
    1,
    Math.ceil((snapshot?.total ?? 0) / (snapshot?.pageSize ?? 20)),
  );

  return (
    <div className={styles.workspace}>
      <header className={styles.pageHeading}>
        <div>
          <h1 id="notifications-page-title" tabIndex={-1}>
            Notifications
          </h1>
          <p>Your tasks, payment decisions and updates.</p>
        </div>
        <button
          className={styles.refresh}
          type="button"
          disabled={loading}
          onClick={() => {
            return void load();
          }}
        >
          <ArrowClockwise aria-hidden="true" /> Refresh
        </button>
      </header>
      <section
        className={styles.inbox}
        aria-label="Notification inbox"
        aria-busy={loading}
      >
        <div className={styles.toolbar}>
          <div className={styles.filter}>
            <span id={`${filterId}-label`} className={styles.srOnly}>
              Notification type
            </span>
            <Select
              id={filterId}
              labelId={`${filterId}-label`}
              value={scope}
              options={filters}
              fitViewport
              onValueChange={(value) => {
                setScope(value as StaffAlertScope);

                setPage(1);
              }}
            />
          </div>
          <label className={styles.unreadControl}>
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => {
                setUnreadOnly(event.target.checked);

                setPage(1);
              }}
            />{" "}
            Unread only
          </label>
          <button
            className={styles.markRead}
            type="button"
            disabled={
              busy ||
              loading ||
              Boolean(error) ||
              !snapshot?.filteredUnreadCount
            }
            onClick={() => {
              return void read();
            }}
          >
            {busy
              ? "Updating…"
              : scope === "all"
                ? "Mark all as read"
                : "Mark this type as read"}
          </button>
        </div>
        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}
        {actionError && (
          <p className={styles.error} role="alert">
            {actionError}
          </p>
        )}
        {error ? (
          <div className={styles.state} role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                return void load();
              }}
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <p className={styles.state} role="status">
            Loading notifications…
          </p>
        ) : !snapshot?.items.length ? (
          <div className={styles.state}>
            <strong>
              {unreadOnly ? "You’re all caught up" : "No notifications yet"}
            </strong>
            <p>
              {unreadOnly
                ? "No unread notifications in this view."
                : "New updates will appear here."}
            </p>
          </div>
        ) : (
          <StaffNotificationList
            items={snapshot.items}
            onRequestDelete={setDeleteTarget}
            busy={busy}
            onOpen={(alert) => {
              return void read(alert);
            }}
          />
        )}
        {!error && snapshot && !loading && (
          <footer className={styles.pageFooter}>
            <span>
              {snapshot.total}{" "}
              {snapshot.total === 1 ? "notification" : "notifications"}
              {snapshot.filteredUnreadCount > 0 &&
                ` · ${snapshot.filteredUnreadCount} unread`}
            </span>
            {pages > 1 && (
              <nav aria-label="Notification pages">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => {
                    return setPage(page - 1);
                  }}
                >
                  Previous
                </button>
                <span>
                  Page {page} of {pages}
                </span>
                <button
                  type="button"
                  disabled={page >= pages}
                  onClick={() => {
                    return setPage(page + 1);
                  }}
                >
                  Next
                </button>
              </nav>
            )}
          </footer>
        )}
      </section>
      {deleteTarget && (
        <DeleteStaffNotificationDialog
          key={deleteTarget.inboxId}
          alert={deleteTarget}
          busy={busy}
          error={actionError}
          onConfirm={remove}
          onClose={() => {
            return setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
