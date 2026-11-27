import {
  networkRequestsQuery,
  withdrawalQuerySchema,
  type WithdrawalCase,
  type WithdrawalQuery,
} from "@freshphones/contracts";
import { tsRequest } from "@/lib/ts-api";

export type AgentWithdrawalLocation = Pick<
  WithdrawalQuery,
  "page" | "q" | "status"
> & { request?: string };

export function agentWithdrawalLocation(
  params: Pick<URLSearchParams, "get">,
): AgentWithdrawalLocation | null {
  const query = withdrawalQuerySchema.safeParse({
    page: params.get("page") ?? undefined,
    q: params.get("q") ?? undefined,
    status: params.get("status") || undefined,
  });

  const selection = networkRequestsQuery.safeParse({
    requestId: params.get("request") ?? undefined,
  });

  return query.success && selection.success
    ? {
        page: query.data.page,
        q: query.data.q,
        status: query.data.status,
        request: selection.data.requestId,
      }
    : null;
}

export function agentWithdrawalHref(
  location: AgentWithdrawalLocation,
  next: Partial<AgentWithdrawalLocation> = {},
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries({ ...location, ...next })) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  return `/system/withdrawals?${params}`;
}

export function withdrawalCommand(
  id: string,
  action: "forward" | "replacement-request",
  input: object,
) {
  const body = JSON.stringify(input);

  const key = crypto.randomUUID();

  return () => {
    return tsRequest<WithdrawalCase>(
      `/withdrawals/${encodeURIComponent(id)}/${action}`,
      { method: "POST", headers: { "Idempotency-Key": key }, body },
    );
  };
}
