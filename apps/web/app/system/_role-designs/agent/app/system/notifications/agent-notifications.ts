import type { StaffAlert } from "@/lib/api";
import { taskIdPattern } from "../tasks/agent-task";

export type NotificationLocation = {
  view: "alerts" | "updates";
  page: number;
  unreadOnly: boolean;
  scope: "all" | "tasks" | "enrollments";
};

export function agentNotificationLocation(
  params: URLSearchParams,
): NotificationLocation | null {
  const view = params.get("view") ?? "alerts",
    page = params.get("page") ?? "1",
    unread = params.get("unreadOnly") ?? "false",
    scope = params.get("scope") ?? "all";

  if (
    !["alerts", "updates"].includes(view) ||
    !/^\d+$/.test(page) ||
    Number(page) < 1 ||
    Number(page) > 10000 ||
    !["true", "false"].includes(unread) ||
    !["all", "tasks", "enrollments"].includes(scope)
  ) {
    return null;
  }

  return {
    view: view as NotificationLocation["view"],
    page: Number(page),
    unreadOnly: unread === "true",
    scope: scope as NotificationLocation["scope"],
  };
}

export function agentNotificationHref(
  current: NotificationLocation,
  next: Partial<NotificationLocation>,
) {
  const value = { ...current, ...next };

  return `/system/notifications?${new URLSearchParams({ view: value.view, page: String(value.page), unreadOnly: String(value.unreadOnly), scope: value.scope })}`;
}

/** A notice is a shortcut; the destination still enforces current record access. */
export function agentNoticeTarget(path: string | null, unavailable = false) {
  if (unavailable || !path?.startsWith("/system/")) {
    return null;
  }

  const url = new URL(path, "https://agent.invalid");

  for (const [route, key] of [
    ["/system/tasks", "task"],
    ["/system/withdrawals", "request"],
    ["/system/enrollments", "request"],
    ["/system/enrollments", "application"],
  ]) {
    const id = url.searchParams.get(key);

    if (url.pathname === route && id && taskIdPattern.test(id)) {
      return `${route}?${new URLSearchParams({ ...(key === "application" ? { view: "applications" } : {}), [key]: id })}`;
    }
  }

  return null;
}

export function agentAlertTarget(alert: StaffAlert) {
  return agentNoticeTarget(alert.targetPath, alert.unavailable);
}
