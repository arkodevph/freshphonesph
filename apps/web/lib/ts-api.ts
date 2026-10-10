import type { Batch, Client, ClientSchedule, Page, User } from "@freshphones/contracts";
import { API_URL } from "./backend";

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly retryAfterSeconds?: number) { super(message); }
}

async function responseError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({})) as { message?: string };
  const value = response.headers.get('Retry-After');
  const seconds = value && /^\d+$/.test(value) ? Number(value) : undefined;
  return new ApiError(data.message ?? fallback, response.status,
    seconds !== undefined && Number.isSafeInteger(seconds) && seconds > 0 ? seconds : undefined);
}

let refreshing: Promise<void> | null = null;
async function refreshSession() {
  if (!refreshing) {
    const run = async () => {
      // Keep the existing API facade; Better Auth now checks the shared database session cookie.
      const current = await fetch(`${API_URL}/api/auth/me`, { credentials: "include", cache: "no-store" });
      if (current.ok) return;
      if (current.status !== 401) throw await responseError(current, "Could not check your session.");
      const response = await fetch(`${API_URL}/api/auth/refresh`, { method: "POST", credentials: "include" });
      if (!response.ok) {
        if (response.status === 401 && typeof window !== "undefined")
          window.dispatchEvent(new Event("fp-session-expired"));
        if (response.status === 401) throw new ApiError("Your session expired. Please sign in again.", response.status);
        throw await responseError(response, "Could not check your session.");
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
  if (response.status === 401 && (!path.startsWith('/auth/') || path === '/auth/me')) {
    await refreshSession();
    response = await send();
  }
  if (!response.ok) {
    if (response.status === 412 && typeof window !== 'undefined') window.dispatchEvent(new Event('fp-mfa-required'));
    if (response.status === 428 && typeof window !== 'undefined') window.dispatchEvent(new Event('fp-legal-required'));
    throw await responseError(response, `Request failed (${response.status}).`);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export async function tsUpload<T>(path: string, body: FormData): Promise<T> {
  const send = () => fetch(`${API_URL}/api${path}`, {
    method: "POST", body, credentials: "include", cache: "no-store",
  });
  let response = await send();
  if (response.status === 401) {
    await refreshSession();
    response = await send();
  }
  if (!response.ok) {
    if (response.status === 412 && typeof window !== 'undefined') window.dispatchEvent(new Event('fp-mfa-required'));
    if (response.status === 428 && typeof window !== 'undefined') window.dispatchEvent(new Event('fp-legal-required'));
    throw await responseError(response, `Request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export async function tsDownload(path: string): Promise<Blob> {
  const send = () => fetch(`${API_URL}/api${path}`, { credentials: "include", cache: "no-store" });
  let response = await send();
  if (response.status === 401) {
    await refreshSession();
    response = await send();
  }
  if (!response.ok) {
    if (response.status === 412 && typeof window !== 'undefined') window.dispatchEvent(new Event('fp-mfa-required'));
    if (response.status === 428 && typeof window !== 'undefined') window.dispatchEvent(new Event('fp-legal-required'));
    throw await responseError(response, `Download failed (${response.status}).`);
  }
  return response.blob();
}

export const toMe = (user: User) => ({
  id: user.id, email: user.email, full_name: user.name, role: user.role.toLowerCase(),
  image: user.image ?? null,
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
  version: batch.version, terms_locked: batch.termsLocked,
  handler_name: batch.handler?.name ?? null, agent_name: batch.agent?.name ?? null,
  handler_available: Boolean(batch.handler?.active && batch.handler.role === "CORE_HANDLER"),
  agent_available: Boolean(batch.agent?.active),
});
export const toClient = (client: Client) => ({
  id: client.id, batch: client.batchId, batch_number: client.batch.code,
  full_name: client.name, contact_email: client.email, unit_model: client.unitModel || client.batch.model,
  status: client.status.toLowerCase(), release_status: client.releaseStatus.toLowerCase(),
  version: client.version, joined_at: client.joinedAt ?? "", created_at: client.createdAt,
  contact_phone: client.phone, schedule_issued: client.scheduleIssued,
});
export const toSchedule = (schedule: ClientSchedule) => schedule.items.map((item) => ({
  id: item.id, sequence_no: item.sequenceNo, due_date: item.dueDate, expected_amount: item.expectedAmount,
}));
export function toPage<T, U>(page: Page<T>, map: (item: T) => U) {
  return { count: page.total, next: page.page * page.pageSize < page.total ? String(page.page + 1) : null,
    results: page.items.map(map), page: page.page, page_size: page.pageSize };
}
