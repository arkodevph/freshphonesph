"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/ts-api";
import { can, useMe } from "@/lib/useMe";
import { useAgentResource } from "@/lib/useAgentResource";
import {
  readNotification,
  readAllNotifications,
  readStaffAlert,
  readAllStaffAlerts,
  type NotificationRecord,
  type StaffAlertPage,
  type NotificationPage,
  type StaffAlert,
} from "@/lib/api";
import {
  agentNotificationHref,
  agentNotificationLocation,
  agentNoticeTarget,
  type NotificationLocation,
} from "./agent-notifications";
import WorkspaceNativeSelect from "../../../components/WorkspaceNativeSelect";
import styles from "../../../components/staff-alerts.module.css";

type Notice = {
  id: string;
  title: string;
  message: string;
  path: string | null;
  readAt: string | null;
  time: string;
  alert?: StaffAlert;
  unavailable?: boolean;
};

export default function NotificationsPage() {
  const me = useMe();

  if (!me) {
    return <p role="status">Loading notifications…</p>;
  }

  if (me.account_type !== "employee" || !can(me, "NOTIFICATION_READ")) {
    return <p role="alert">No access to notifications.</p>;
  }

  return (
    <Suspense fallback={<p role="status">Loading notifications…</p>}>
      <AgentNotifications key={me.id} />
    </Suspense>
  );
}

function AgentNotifications() {
  const parsed = agentNotificationLocation(useSearchParams());

  const location: NotificationLocation = parsed ?? {
    view: "alerts",
    page: 1,
    unreadOnly: false,
    scope: "all",
  };

  const received = location.view === "updates";

  const path = received
    ? `/notifications?page=${location.page}&unreadOnly=${location.unreadOnly}`
    : `/staff/alerts?page=${location.page}&unreadOnly=${location.unreadOnly}&scope=${location.scope}`;

  return (
    <NotificationInbox
      key={path}
      path={path}
      location={location}
      invalid={!parsed}
      received={received}
    />
  );
}

function NotificationInbox({
  path,
  location,
  invalid,
  received,
}: {
  path: string;
  location: NotificationLocation;
  invalid: boolean;
  received: boolean;
}) {
  const [revoked, setRevoked] = useState(false);

  const resource = useAgentResource<StaffAlertPage | NotificationPage>(path);

  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");

  const alive = useRef(true),
    pending = useRef(false);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
    };
  }, []);

  function navigate(next: Partial<NotificationLocation>) {
    window.history.pushState(null, "", agentNotificationHref(location, next));
  }

  async function read(item?: Notice) {
    if (pending.current || item?.readAt) {
      return;
    }

    pending.current = true;

    setBusy(true);

    setError("");

    setNotice("");

    try {
      if (received) {
        if (item) {
          await readNotification(item.id);
        } else {
          await readAllNotifications();
        }
      } else {
        if (item?.alert) {
          await readStaffAlert(item.alert);
        } else {
          await readAllStaffAlerts(location.scope);
        }
      }

      if (alive.current) {
        setNotice(
          item
            ? "Notification marked as read."
            : "Notifications marked as read.",
        );

        void resource.refresh();
      }

      window.dispatchEvent(new Event("fp-staff-notifications-read"));
    } catch (failure) {
      if (alive.current) {
        if (
          failure instanceof ApiError &&
          [401, 403, 404].includes(failure.status)
        ) {
          setRevoked(true);
        }

        setError(
          failure instanceof Error
            ? failure.message
            : "Could not mark notifications as read. Try again.",
        );
      }
    } finally {
      pending.current = false;

      if (alive.current) {
        setBusy(false);
      }
    }
  }

  async function load() {
    await resource.refresh();

    if (alive.current) {
      setRevoked(false);
    }
  }

  const data = revoked || resource.error ? null : resource.data;

  const items: Notice[] = !data
    ? []
    : received
      ? (data.items as NotificationRecord[]).map((item) => {
          return {
            id: item.id,
            title: item.title,
            message: item.body,
            path: item.link,
            readAt: item.readAt,
            time: item.createdAt,
          };
        })
      : (data.items as StaffAlert[]).map((item) => {
          return {
            id: item.id,
            title: item.title,
            message: item.message,
            path: item.targetPath,
            readAt: item.readAt,
            time: item.occurredAt,
            alert: item,
            unavailable: item.unavailable,
          };
        });

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className={styles.workspace}>
      <header className={styles.pageHeading}>
        <div>
          <h1 id="notifications-page-title">Notifications</h1>
          <p>
            Open a notice for the exact record and its current authorized
            status.
          </p>
        </div>
        <button
          type="button"
          className={styles.refresh}
          disabled={resource.loading}
          onClick={() => {
            return void load();
          }}
        >
          Refresh notifications
        </button>
      </header>
      <nav className={styles.toolbar} aria-label="Notification views">
        <button
          type="button"
          aria-pressed={!received}
          onClick={() => {
            return navigate({ view: "alerts", page: 1 });
          }}
        >
          Tasks and enrollments
        </button>
        <button
          type="button"
          aria-pressed={received}
          onClick={() => {
            return navigate({ view: "updates", page: 1 });
          }}
        >
          Received updates
        </button>
      </nav>
      <section
        className={styles.inbox}
        aria-label="Notification inbox"
        aria-busy={resource.loading}
      >
        <div className={styles.toolbar}>
          <h2>{received ? "Received updates" : "Tasks and enrollments"}</h2>
          {!received && (
            <label>
              Notification type
              <WorkspaceNativeSelect
                value={location.scope}
                onChange={(event) => {
                  return navigate({
                    scope: event.target.value as NotificationLocation["scope"],
                    page: 1,
                  });
                }}
              >
                <option value="all">All reminders and outcomes</option>
                <option value="tasks">Tasks</option>
                <option value="enrollments">Enrollments</option>
              </WorkspaceNativeSelect>
            </label>
          )}
          <label className={styles.unreadControl}>
            <input
              type="checkbox"
              checked={location.unreadOnly}
              onChange={(event) => {
                return navigate({ unreadOnly: event.target.checked, page: 1 });
              }}
            />
            Unread only
          </label>
          <button
            type="button"
            className={styles.markRead}
            disabled={
              busy ||
              resource.loading ||
              !items.some((item) => {
                return !item.readAt;
              })
            }
            onClick={() => {
              return void read();
            }}
          >
            {busy
              ? "Marking as read…"
              : received
                ? "Mark received updates as read"
                : "Mark this type as read"}
          </button>
        </div>
        <p className={styles.feedHelp}>
          {received
            ? "Application assignments, withdrawal changes and other updates sent to you. An event records what happened; open it to check the current assignment."
            : "Current task reminders and decisions on your enrollment requests. Received updates contains assigned applications and withdrawal changes."}
        </p>
        {invalid && (
          <p className={styles.notice} role="status">
            These notification filters are invalid.{" "}
            <button
              type="button"
              onClick={() => {
                return navigate({
                  view: "alerts",
                  page: 1,
                  unreadOnly: false,
                  scope: "all",
                });
              }}
            >
              Reset filters
            </button>
          </p>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}
        {resource.error || revoked ? (
          <div className={styles.state} role="alert">
            <p>
              {resource.error ||
                "Your notification access changed. Private rows have been cleared."}
            </p>
            <button
              type="button"
              onClick={() => {
                return void load();
              }}
            >
              Retry notifications
            </button>
          </div>
        ) : !data ? (
          <p className={styles.state} role="status">
            Loading notifications…
          </p>
        ) : items.length === 0 ? (
          <div className={styles.state}>
            <h3>No notifications in this view</h3>
            <p>
              Check the other view or turn off Unread only to see read updates.
            </p>
            <button
              type="button"
              onClick={() => {
                return navigate({
                  unreadOnly: false,
                  view: received ? "alerts" : "updates",
                  page: 1,
                });
              }}
            >
              Check the other view
            </button>
          </div>
        ) : (
          <ul className={styles.list}>
            {items.map((item) => {
              const target = agentNoticeTarget(item.path, item.unavailable);

              const body = (
                <>
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                  <small>
                    {item.readAt ? "Read" : "Unread"} ·{" "}
                    <time dateTime={item.time}>
                      {new Date(item.time).toLocaleString("en-PH", {
                        timeZone: "Asia/Manila",
                      })}{" "}
                      PHT
                    </time>
                  </small>
                </>
              );

              return (
                <li key={item.id}>
                  {target ? (
                    <Link
                      className={styles.item}
                      href={target}
                      onClick={() => {
                        return void read(item);
                      }}
                      aria-label={`Open notification: ${item.title}`}
                    >
                      <div>{body}</div>
                    </Link>
                  ) : (
                    <div className={styles.item}>
                      <div>
                        {body}
                        <p>
                          This destination is unavailable in your Agent
                          workspace. Ask your Pioneer Agent or COO to follow up.
                        </p>
                        {!item.readAt && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              return void read(item);
                            }}
                          >
                            Mark this notification as read
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {data && (
          <footer className={styles.pageFooter}>
            <span>
              {data.total} notifications · Page {location.page} of {pages}
            </span>
            <nav aria-label="Notification pages">
              <button
                type="button"
                disabled={location.page <= 1}
                onClick={() => {
                  return navigate({ page: location.page - 1 });
                }}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={location.page >= pages}
                onClick={() => {
                  return navigate({ page: location.page + 1 });
                }}
              >
                Next
              </button>
            </nav>
          </footer>
        )}
      </section>
    </div>
  );
}
