// Minimal API client for the Django REST backend (docs/09-tech-stack.md).
// The backend base URL is injected at build/runtime via NEXT_PUBLIC_API_URL.

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Tokens = { access: string; refresh: string };

/** Exchange credentials for JWT access/refresh tokens (SimpleJWT). */
export async function login(
  username: string,
  password: string,
): Promise<Tokens> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new Error(
      "Cannot reach the API. Is the backend running on " + API_URL + "?",
    );
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(data.detail ?? "Invalid username or password.");
  }
  return res.json() as Promise<Tokens>;
}

// ── Authenticated requests ─────────────────────────────────────────────────
import { getTokens } from "./auth";

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getTokens()?.access;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(data.detail ?? `Request failed (${res.status}).`);
  }
  return res.status === 204 ? null : res.json();
}

// ── Payment types & endpoints (M4) ─────────────────────────────────────────
export type PaymentStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "needs_clarification";

export type Payment = {
  id: number;
  client: number;
  batch: number;
  amount: string;
  payment_date: string;
  method: string;
  reference_no: string;
  proof_file: number | null;
  status: PaymentStatus;
  verified_by: number | null;
  created_at: string;
};

export type Paginated<T> = { count: number; next: string | null; results: T[] };

export type Balance = {
  client: number;
  total_due: string;
  verified_paid: string;
  remaining_balance: string;
};

export function listPayments(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/api/payments/${qs ? `?${qs}` : ""}`) as Promise<
    Paginated<Payment>
  >;
}

export function createPayment(body: {
  client: number;
  batch: number;
  amount: string;
  payment_date: string;
  method: string;
  reference_no?: string;
}) {
  return apiFetch("/api/payments/", {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<Payment>;
}

export function decidePayment(id: number, decision: PaymentStatus) {
  return apiFetch(`/api/payments/${id}/verify/`, {
    method: "POST",
    body: JSON.stringify({ decision }),
  }) as Promise<Payment>;
}

/** Attach a private proof file (multipart). */
export async function uploadProof(id: number, file: File) {
  const token = getTokens()?.access;
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/api/payments/${id}/proof/`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error(`Proof upload failed (${res.status}).`);
  return res.json() as Promise<Payment>;
}

export function getProofUrl(id: number) {
  return apiFetch(`/api/payments/${id}/proof-url/`) as Promise<{ url: string }>;
}

export function getBalance(clientId: number) {
  return apiFetch(`/api/clients/${clientId}/balance/`) as Promise<Balance>;
}

// ── Reporting (M7) ─────────────────────────────────────────────────────────
export type DashboardCards = {
  active_batches: number;
  verified_payments: number;
  pending_verification: number;
  verified_total: string;
};

export function getDashboard() {
  return apiFetch("/api/reports/dashboard/") as Promise<DashboardCards>;
}

/** Download the payments report as a file (CSV or XLSX). */
export async function downloadPaymentsExport(
  params: Record<string, string> = {},
  fmt: "csv" | "xlsx" = "csv",
) {
  const token = getTokens()?.access;
  const qs = new URLSearchParams({ ...params, fmt }).toString();
  const res = await fetch(`${API_URL}/api/reports/payments/export/?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Export failed (${res.status}).`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payments.${fmt}`;
  a.click();
  URL.revokeObjectURL(url);
}
