import {
  enrollmentApplicationQuerySchema,
  networkRequestsQuery,
} from "@freshphones/contracts";

export type EnrollmentLocation = {
  view: "requests" | "applications" | "form";
  page: number;
  status: string;
  q: string;
  request?: string;
  application?: string;
  new?: "1";
};

export function enrollmentLocation(
  params: Pick<URLSearchParams, "get">,
): EnrollmentLocation | null {
  const view = params.get("view") ?? "requests";

  const open = params.get("new") ?? undefined;

  if (
    !["requests", "applications", "form"].includes(view) ||
    (open !== undefined && open !== "1")
  ) {
    return null;
  }

  const request = params.get("request") ?? undefined;

  const application = params.get("application") ?? undefined;

  const common = networkRequestsQuery.safeParse({
    page: params.get("page") ?? undefined,
    q: params.get("q") ?? undefined,
    requestId: request,
  });

  const intake = enrollmentApplicationQuerySchema.safeParse({
    applicationId: application,
  });

  if (!common.success || !intake.success) {
    return null;
  }

  const selected: EnrollmentLocation["view"] = application
    ? "applications"
    : request
      ? "requests"
      : (view as EnrollmentLocation["view"]);

  const status = params.get("status") ?? "";

  const statuses =
    selected === "applications"
      ? ["RECEIVED", "FORWARDED", "CLOSED"]
      : ["PENDING", "APPROVED", "REJECTED"];

  if (status && !statuses.includes(status)) {
    return null;
  }

  return {
    view: selected,
    page: common.data.page,
    q: common.data.q,
    status,
    ...(request ? { request } : {}),
    ...(application ? { application } : {}),
    ...(open === "1" ? { new: open } : {}),
  };
}

export function enrollmentHref(
  value: EnrollmentLocation,
  next: Partial<EnrollmentLocation> = {},
) {
  const query = new URLSearchParams();

  for (const [key, item] of Object.entries({ ...value, ...next })) {
    if (item !== undefined && item !== "") {
      query.set(key, String(item));
    }
  }

  return `/system/enrollments?${query}`;
}
