export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100").replace(/\/$/, "");

export function availableRoute(path: string) {
  return ["/system/retention", "/system/catalog", "/system", "/system/records", "/system/clients", "/system/agents", "/system/payments", "/system/reports", "/system/support", "/system/customer-work", "/system/team", "/system/notification-settings", "/system/tasks", "/system/hr-actions", "/system/recruitment"].includes(path);
}
