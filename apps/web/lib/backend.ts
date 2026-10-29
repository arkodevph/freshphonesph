import { PRESENTATION_MODE } from "./presentation";

export const API_URL = PRESENTATION_MODE
  ? ""
  : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100").replace(
      /\/$/,
      "",
    );

export function availableRoute(path: string) {
  return [
    "/system/retention",
    "/system/catalog",
    "/system/inquiries",
    "/system",
    "/system/personnel",
    "/system/agent-network",
    "/system/enrollments",
    "/system/records",
    "/system/clients",
    "/system/agents",
    "/system/payments",
    "/system/gcash-history",
    "/system/reports",
    "/system/support",
    "/system/customer-work",
    "/system/team",
    "/system/notification-settings",
    "/system/tasks",
    "/system/hr-actions",
    "/system/recruitment",
  ].includes(path);
}
