"use client";

import type { Me } from "@/lib/api";
import {
  type PortalNotification,
  type PortalScheduleItem,
  type PortalSummary,
} from "@/lib/api";
import { ArrowRight, Bell } from "@phosphor-icons/react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { NotificationRecordPanel } from "./NotificationRecordPanel";
import styles from "./portal.module.css";
import { PortalLoadingRows } from "./PortalSkeleton";

type Props = {
  selectedNotification: PortalNotification | undefined;
  unreadNotifications: number;
  markingAllNotifications: boolean;
  markAllRead: () => Promise<void>;
  notificationActionError: string | null;
  notificationsStatus: "loading" | "ready" | "error";
  loadNotifications: () => void;
  notifications: PortalNotification[];
  selectedNotificationId: string | null;
  notificationTriggerRef: RefObject<HTMLButtonElement | null>;
  setSelectedNotificationId: Dispatch<SetStateAction<string | null>>;
  markRead: (id: string) => Promise<void>;
  summary: PortalSummary | null;
  schedule: PortalScheduleItem[];
  me: Me | null;
  closeNotificationRecord: () => void;
};

export default function PortalNotificationsWorkspace({
  selectedNotification,
  unreadNotifications,
  markingAllNotifications,
  markAllRead,
  notificationActionError,
  notificationsStatus,
  loadNotifications,
  notifications,
  selectedNotificationId,
  notificationTriggerRef,
  setSelectedNotificationId,
  markRead,
  summary,
  schedule,
  me,
  closeNotificationRecord,
}: Props) {
  return (
    <div
      className={`${styles.notificationWorkspace} ${selectedNotification ? styles.notificationWorkspaceOpen : ""}`}
    >
      <section
        className={styles.sectionCard}
        aria-labelledby="notifications-title"
      >
        <div className={styles.sectionHeading}>
          <span className={`${styles.sectionIcon} ${styles.notificationIcon}`}>
            <Bell weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <p className={styles.eyebrow}>Updates</p>
            <h2 id="notifications-title">Notifications</h2>
          </div>
          <div className={styles.notificationHeaderActions}>
            {unreadNotifications > 0 && (
              <span className={styles.count}>{unreadNotifications} new</span>
            )}
            <button
              type="button"
              disabled={markingAllNotifications}
              onClick={() => {
                return void markAllRead();
              }}
            >
              {markingAllNotifications ? "Marking…" : "Mark all read"}
            </button>
          </div>
        </div>
        {notificationActionError && (
          <p className={styles.notificationActionError} role="alert">
            {notificationActionError}
          </p>
        )}
        {notificationsStatus === "loading" ? (
          <PortalLoadingRows rows={3} label="Checking your updates" />
        ) : notificationsStatus === "error" ? (
          <div className={styles.attentionState} role="alert">
            <p>Could not load notifications.</p>
            <button type="button" onClick={loadNotifications}>
              Try again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <p className={styles.emptyText}>
            No updates yet. Payment, release, and support changes will appear
            here.
          </p>
        ) : (
          <ul className={styles.notificationList}>
            {notifications.map((item) => {
              return (
                <li
                  key={item.id}
                  className={`${styles.notificationRow} ${item.readAt ? "" : styles.unread} ${selectedNotificationId === item.id ? styles.notificationSelected : ""}`}
                >
                  <div className={styles.notificationCopy}>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <small>
                      {new Date(item.createdAt).toLocaleString("en-PH")}
                    </small>
                  </div>
                  <div className={styles.notificationActions}>
                    {item.targetPath?.startsWith("/portal/") && (
                      <button
                        type="button"
                        aria-controls={
                          selectedNotificationId
                            ? "notification-record-panel"
                            : undefined
                        }
                        aria-expanded={selectedNotificationId === item.id}
                        onClick={(event) => {
                          notificationTriggerRef.current = event.currentTarget;

                          setSelectedNotificationId(item.id);
                        }}
                      >
                        View record{" "}
                        <ArrowRight weight="bold" aria-hidden="true" />
                      </button>
                    )}
                    {!item.readAt && (
                      <button
                        type="button"
                        onClick={() => {
                          return markRead(item.id);
                        }}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <div
        className={`${styles.notificationPanelSlot} ${selectedNotification ? styles.notificationPanelSlotOpen : ""}`}
      >
        {selectedNotification && (
          <NotificationRecordPanel
            key={selectedNotification.id}
            notification={selectedNotification}
            summary={summary}
            schedule={schedule}
            clientId={me?.client_id}
            onClose={closeNotificationRecord}
          />
        )}
      </div>
    </div>
  );
}
