import { effectivePermissions, roleSchema } from "@freshphones/contracts";

export const workspacePermissions: Record<string, readonly string[]> = {
  "/system/records": ["BATCH_READ"],
  "/system/clients": ["CLIENT_READ"],
  "/system/agents": ["AGENT_MANAGE"],
  "/system/catalog": ["CATALOG_MANAGE"],
  "/system/payments": ["PAYMENT_READ"],
  "/system/gcash-history": ["GCASH_HISTORY_READ"],
  "/system/reports": ["REPORT_VIEW"],
  "/system/team": ["ACCOUNT_MANAGE"],
  "/system/personnel": ["STAFF_READ"],
  "/system/agent-network": ["AGENT_NETWORK_READ"],
  "/system/enrollments": [
    "ENROLLMENT_SUBMIT",
    "ENROLLMENT_REVIEW",
    "AGENT_NETWORK_READ",
  ],
  "/system/tasks": ["TASK_READ"],
  "/system/hr-actions": ["HR_CONFIDENTIAL"],
  "/system/support": ["SUPPORT_MANAGE"],
  "/system/inquiries": ["SUPPORT_MANAGE"],
  "/system/customer-work": [
    "SUPPORT_MANAGE",
    "PAYMENT_VERIFY",
    "DOCUMENT_REVIEW",
  ],
  "/system/recruitment": ["RECRUITMENT_MANAGE"],
  "/system/notification-settings": ["NOTIFICATION_MANAGE"],
  "/system/retention": ["RETENTION_MANAGE"],
};

/** Navigation and direct page visits share a policy; the API enforces it independently. */
export function canOpenWorkspace(
  role: string | null | undefined,
  pathname: string,
  permissions?: readonly string[],
) {
  if (!role || role.toLowerCase() === "customer") {
    return false;
  }

  if (pathname === "/system") {
    return true;
  }

  const parsed = roleSchema.safeParse(
    role === "records_monitoring" ? "RECORDS" : role.toUpperCase(),
  );

  const grants =
    role.toUpperCase() === "OWNER"
      ? effectivePermissions({ role: "OWNER" })
      : (permissions ??
        (parsed.success ? effectivePermissions({ role: parsed.data }) : []));

  return (workspacePermissions[pathname] ?? []).some((permission) => {
    return grants.includes(permission);
  });
}
