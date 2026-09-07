import type { Batch, Client, ClientSchedule, Page, User } from "@freshphones/contracts";
import { API_URL } from "./backend";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

let refreshing: Promise<void> | null = null;
async function refreshSession() {
  if (!refreshing) {
    const run = async () => {
      // Another tab may have already rotated the shared cookie while this tab waited.
      const current = await fetch(`${API_URL}/api/auth/me`, { credentials: "include", cache: "no-store" });
      if (current.ok) return;
      if (current.status !== 401) throw new ApiError("Could not check your session.", current.status);
      const response = await fetch(`${API_URL}/api/auth/refresh`, { method: "POST", credentials: "include" });
      if (!response.ok) {
        if (response.status === 401 && typeof window !== "undefined")
          window.dispatchEvent(new Event("fp-session-expired"));
        throw new ApiError("Your session expired. Please sign in again.", response.status);
      }
    };
    refreshing = (typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request("freshphones-session-refresh", run) : run()).then(() => undefined).finally(() => { refreshing = null; });
  }
  return refreshing;
}

export async function tsRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const send = () => fetch(`${API_URL}/api${path}`, {
    ...options, credentials: "include", cache: "no-store",
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
  let response = await send();
  if (response.status === 401 && !["/auth/login", "/auth/logout"].includes(path)) {
    await refreshSession();
    response = await send();
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { message?: string };
    throw new ApiError(data.message ?? `Request failed (${response.status}).`, response.status);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export const toMe = (user: User) => ({
  id: user.id, email: user.email, full_name: user.name, role: user.role.toLowerCase(),
  employee_id: user.role === "CUSTOMER" ? null : user.id,
  account_type: user.role === "CUSTOMER" ? "customer" as const : "employee" as const,
  client_id: user.clientId, permissions: user.permissions,
});
export const toBatch = (batch: Batch) => ({
  id: batch.id, batch_number: batch.code, unit_model: batch.model,
  status: ({ PLANNED: "forming", ACTIVE: "active", COMPLETED: "closed", CANCELLED: "cancelled" })[batch.status],
  contract_price: batch.contractPrice, num_installments: batch.installmentCount,
  cadence: batch.cadence?.toLowerCase() ?? "", start_date: batch.startDate, end_date: batch.endDate,
  member_count: batch._count.clients, created_at: batch.createdAt,
});
export const toClient = (client: Client) => ({
  id: client.id, batch: client.batchId, batch_number: client.batch.code,
  full_name: client.name, contact_email: client.email, unit_model: client.unitModel || client.batch.model,
  status: client.status.toLowerCase(), joined_at: client.joinedAt ?? "", created_at: client.createdAt,
});
export const toSchedule = (schedule: ClientSchedule) => schedule.items.map((item) => ({
  id: item.id, sequence_no: item.sequenceNo, due_date: item.dueDate, expected_amount: item.expectedAmount,
}));
export function toPage<T, U>(page: Page<T>, map: (item: T) => U) {
  return { count: page.total, next: page.page * page.pageSize < page.total ? String(page.page + 1) : null,
    results: page.items.map(map) };
}
