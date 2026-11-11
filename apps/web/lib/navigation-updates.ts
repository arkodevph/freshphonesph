export type LiveRecordChange = { entity: string; recordId: string };

export function parseLiveRecordChange(data: unknown): LiveRecordChange | null {
  if (typeof data !== "string") {
    return null;
  }

  try {
    const value: unknown = JSON.parse(data);

    if (
      value &&
      typeof value === "object" &&
      "entity" in value &&
      typeof value.entity === "string" &&
      value.entity &&
      "recordId" in value &&
      typeof value.recordId === "string" &&
      value.recordId
    ) {
      return { entity: value.entity, recordId: value.recordId };
    }
  } catch {
    return null;
  }

  return null;
}

const routes: Readonly<Record<string, readonly string[]>> = {
  payment: ["/system/payments", "/system/reports", "/system"],
  "payment-result": ["/system/payments"],
  task: ["/system/tasks", "/system/reports", "/system"],
  support: [
    "/system/support",
    "/system/customer-work",
    "/system/reports",
    "/system",
  ],
  "support-alert": ["/system/support", "/system/customer-work"],
  client: ["/system/clients", "/system/records"],
  member: ["/system/clients"],
  batch: ["/system/records", "/system/reports", "/system"],
  agent: ["/system/agents", "/system/agent-network", "/system/recruitment"],
  account: ["/system/personnel", "/system/team"],
  "account-alert": ["/system/team"],
  applicant: ["/system/recruitment"],
  job_opening: ["/system/recruitment"],
  catalog: ["/system/catalog"],
  enrollment_request: ["/system/enrollments", "/system/agent-network"],
  withdrawal_request: ["/system/withdrawals"],
  "gcash-history": ["/system/gcash-history"],
  "operations-monitor": ["/system/operations-monitor"],
  hr_action_request: ["/system/hr-actions"],
  document: ["/system/clients", "/system/records"],
  retention: ["/system/retention"],
};

export function navigationUpdateRoutes(entity: string): readonly string[] {
  return Object.hasOwn(routes, entity) ? routes[entity] : [];
}

export function isCurrentNavigationRoute(href: string, pathname: string) {
  return (
    href === pathname || (href !== "/system" && pathname.startsWith(`${href}/`))
  );
}

export function addNavigationUpdates(
  current: readonly string[],
  change: LiveRecordChange | undefined,
  allowed: readonly string[],
  pathname: string,
  visible: boolean,
) {
  if (!change) {
    return current;
  }

  const next = new Set(current);

  for (const href of navigationUpdateRoutes(change.entity)) {
    if (
      allowed.includes(href) &&
      (!visible || !isCurrentNavigationRoute(href, pathname))
    ) {
      next.add(href);
    }
  }

  return next.size === current.length ? current : [...next];
}
