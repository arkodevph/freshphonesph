import {
  networkAgentsQuery,
  networkBatchesQuery,
  networkRequestsQuery,
} from "@freshphones/contracts";

export function networkFilters(params: Pick<URLSearchParams, "get">) {
  const view = params.get("view") === "batches" ? "batches" : "agents";

  const schema = view === "agents" ? networkAgentsQuery : networkBatchesQuery;

  const result = schema.safeParse({
    page: params.get("page") ?? undefined,
    q: params.get("q") ?? undefined,
    sort: params.get("sort") ?? undefined,
  });

  return { view, result } as const;
}

export function requestFilters(
  params: Pick<URLSearchParams, "get">,
  requestId?: string,
) {
  return networkRequestsQuery.safeParse({
    page: params.get("page") ?? undefined,
    q: params.get("q") ?? undefined,
    sort: params.get("sort") ?? undefined,
    status: params.get("status") || undefined,
    agentId: params.get("agentId") || undefined,
    requestId: requestId || undefined,
  });
}

export function queryString(
  values: Record<string, string | number | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  return params.toString();
}

/** A return link carries only recognized network state, never an arbitrary URL. */
export function safeNetworkReturn(value: string | null) {
  if (!value || !value.startsWith("/system/agent-network")) {
    return "/system/agent-network";
  }

  const url = new URL(value, "https://local.invalid");

  if (
    url.origin !== "https://local.invalid" ||
    url.pathname !== "/system/agent-network"
  ) {
    return "/system/agent-network";
  }

  const parsed = networkFilters(url.searchParams);

  if (!parsed.result.success) {
    return "/system/agent-network";
  }

  const params = new URLSearchParams({
    ...Object.fromEntries(
      Object.entries(parsed.result.data).map(([key, value]) => {
        return [key, String(value)];
      }),
    ),
    view: parsed.view,
  });

  const agent = url.searchParams.get("agent");

  if (agent && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(agent)) {
    params.set("agent", agent);
  }

  return `/system/agent-network?${params}`;
}

export function changeQuery(
  changes: Record<string, string | number | null>,
  replace = false,
) {
  const params = new URLSearchParams(window.location.search);

  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }

  const href = `${window.location.pathname}${params.size ? `?${params}` : ""}`;

  window.history[replace ? "replaceState" : "pushState"](null, "", href);
}
