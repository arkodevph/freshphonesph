import { businessRole, roleSchema } from "@freshphones/contracts";

/** Compatibility names select the same business role without changing permissions. */
export function workspaceDesignRole(role?: string | null) {
  const parsed = roleSchema.safeParse(
    role?.toLowerCase() === "records_monitoring"
      ? "RECORDS"
      : role?.toUpperCase(),
  );

  if (!parsed.success || parsed.data === "CUSTOMER") {
    return null;
  }

  return businessRole(parsed.data).toLowerCase();
}
