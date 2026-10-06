import type { Agent, AgentInput, AssignmentOptions, BatchAssignmentInput, Batch as TsBatch, BatchInput, Client as TsClient, ClientInput, ClientBalance, ClientSchedule, FinanceAlertPage, Page, Payment as TsPayment, PaymentDuplicateMatch, PaymentResultDetail, ReceiptScan, ReceiptType, RecordHistoryEntry, Role, StaffAlert, StaffAlertPage, StaffAlertReadInput, StaffAlertScope, User } from "@freshphones/contracts";
import { API_URL, TYPESCRIPT_API } from "./backend";
import type { StaffEmailDelivery, StaffEmailKind, StaffEmailSettings, StaffEmailStatus, StaffEmailTemplate } from "@freshphones/contracts";
import { ApiError, tsDownload, tsRequest, tsUpload, toBatch, toClient, toMe, toPage, toSchedule } from "./ts-api";
export { API_URL } from "./backend";
export type RecordId = string | number;
export const getStaffEmailSettings = () => tsRequest<StaffEmailSettings>("/staff-notification-settings");
export const updateStaffEmailTemplate = (template: StaffEmailTemplate) => tsRequest<StaffEmailTemplate>(`/staff-notification-settings/templates/${template.kind}`, {
  method: "PATCH", body: JSON.stringify({ version: template.version, enabled: template.enabled, subject: template.subject, body: template.body }),
});
export const updateStaffEmailTiming = (input: { version: number; dueSoonHours: number; overdueHours: number }) => tsRequest<{ version: number; dueSoonHours: number; overdueHours: number }>("/staff-notification-settings/timing", { method: "PATCH", body: JSON.stringify(input) });
export const getStaffEmailDeliveries = (query: { page: number; status?: StaffEmailStatus; kind?: StaffEmailKind }) => {
  const params = new URLSearchParams({ page: String(query.page) });
  if (query.status) params.set("status", query.status);
  if (query.kind) params.set("kind", query.kind);
  return tsRequest<Page<StaffEmailDelivery>>(`/staff-notification-settings/deliveries?${params}`);
};
export const retryStaffEmail = (delivery: StaffEmailDelivery) => tsRequest<{ id: string; status: StaffEmailStatus; version: number }>(`/staff-notification-settings/deliveries/${delivery.id}/retry`, {
  method: "POST", body: JSON.stringify({ version: delivery.version }),
});
export type EditableBatch = TsBatch;
export type EditableClient = TsClient;
export type { Agent, AgentInput, AssignmentOptions, FinanceAlert, FinanceAlertPage, PaymentResultDetail, RecordHistoryEntry, StaffAlert, StaffAlertPage, StaffAlertScope } from "@freshphones/contracts";

export type Tokens = { access: string; refresh: string };

/** Exchange credentials for JWT access/refresh tokens (SimpleJWT). */
export async function login(
  username: string,
  password: string,
): Promise<Tokens | null> {
  if (TYPESCRIPT_API) {
    await tsRequest<User>("/auth/login", { method: "POST", body: JSON.stringify({ email: username, password }) });
    return null;
  }
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
  if (TYPESCRIPT_API) throw new Error("This section is not available yet.");
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
  id: RecordId;
  client: RecordId;
  client_name?: string;
  batch: RecordId;
  amount: string;
  payment_date: string;
  method: string;
  reference_no: string;
  receipt_time?: string | null;
  receipt_name?: string | null;
  receipt_phone?: string | null;
  proof_file: RecordId | null;
  status: PaymentStatus;
  notes?: string | null;
  verification_notes?: string | null;
  batch_code?: string | null;
  recorded_by_name?: string | null;
  verifier_name?: string | null;
  verified_by: RecordId | null;
  created_at: string;
  updated_at?: string | null;
  verified_at?: string | null;
  version?: number;
  duplicate_reference?: boolean;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  results: T[];
  page?: number;
  page_size?: number;
};

export type Balance = {
  client: RecordId;
  total_due: string;
  verified_paid: string;
  remaining_balance: string;
  pending_amount?: string;
  overpaid?: string;
};

const toPayment = (payment: TsPayment): Payment => ({
  id: payment.id, client: payment.clientId, client_name: payment.client.name,
  batch: payment.batchId, amount: payment.amount, payment_date: payment.paymentDate,
  method: payment.method, reference_no: payment.referenceNumber ?? "",
  receipt_time: payment.receiptTime, receipt_name: payment.receiptName,
  receipt_phone: payment.receiptPhone,
  proof_file: payment.proofFile?.id ?? null,
  status: payment.status.toLowerCase() as PaymentStatus,
  notes: payment.notes, verification_notes: payment.verificationNotes,
  batch_code: payment.client.batch.code,
  recorded_by_name: payment.recordedBy.name,
  verifier_name: payment.verifier?.name ?? null,
  verified_by: payment.verifier?.id ?? null, created_at: payment.createdAt,
  updated_at: payment.updatedAt, verified_at: payment.verifiedAt,
  version: payment.version, duplicate_reference: payment.duplicateReference,
});

export function listPayments(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  if (TYPESCRIPT_API) {
    const normalized = new URLSearchParams(params);
    if (normalized.get("status")) normalized.set("status", normalized.get("status")!.toUpperCase());
    return tsRequest<Page<TsPayment>>(`/payments?${normalized}`).then((page) => toPage(page, toPayment));
  }
  return apiFetch(`/api/payments/${qs ? `?${qs}` : ""}`) as Promise<
    Paginated<Payment>
  >;
}

export function createPayment(body: {
  client: RecordId;
  batch?: RecordId;
  amount: string;
  payment_date: string;
  method: string;
  reference_no?: string;
  receipt_time?: string;
  receipt_name?: string;
  receipt_phone?: string;
}) {
  if (TYPESCRIPT_API) return tsRequest<TsPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({ clientId: String(body.client), amount: body.amount,
      paymentDate: body.payment_date, method: body.method,
      referenceNumber: body.reference_no || null,
      receiptTime: body.receipt_time || null, receiptName: body.receipt_name || null,
      receiptPhone: body.receipt_phone || null }),
  }).then(toPayment);
  return apiFetch("/api/payments/", {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<Payment>;
}

export function updatePayment(id: RecordId, version: number, body: {
  client: RecordId;
  amount: string;
  payment_date: string;
  method: string;
  reference_no?: string;
  receipt_time?: string;
  receipt_name?: string;
  receipt_phone?: string;
}) {
  if (!TYPESCRIPT_API) return Promise.reject(new Error("Payment correction is available in the TypeScript workflow."));
  return tsRequest<TsPayment>(`/payments/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ version, record: {
      clientId: String(body.client), amount: body.amount, paymentDate: body.payment_date,
      method: body.method, referenceNumber: body.reference_no || null,
      receiptTime: body.receipt_time || null, receiptName: body.receipt_name || null,
      receiptPhone: body.receipt_phone || null,
    } }),
  }).then(toPayment);
}

export function scanPaymentReceipt(receipt: File, template: ReceiptType) {
  if (!TYPESCRIPT_API) return Promise.reject(new Error("Receipt scanning requires the TypeScript API."));
  const body = new FormData();
  body.append("template", template);
  body.append("receipt", receipt);
  return tsUpload<ReceiptScan>("/payments/receipt-scan", body);
}

export function findDuplicatePayments(method: string, referenceNumber: string, excludeId?: RecordId) {
  if (!TYPESCRIPT_API) return Promise.resolve([] as PaymentDuplicateMatch[]);
  const query = new URLSearchParams({ method, referenceNumber });
  if (excludeId) query.set('excludeId', String(excludeId));
  return tsRequest<PaymentDuplicateMatch[]>(`/payments/duplicates?${query}`);
}

export function decidePayment(id: RecordId, decision: PaymentStatus, version = 1, notes = "Finance reviewed") {
  if (TYPESCRIPT_API) return tsRequest<TsPayment>(`/payments/${id}/verify`, {
    method: "POST",
    body: JSON.stringify({ decision: decision.toUpperCase(), version, notes }),
  }).then(toPayment);
  return apiFetch(`/api/payments/${id}/verify/`, {
    method: "POST",
    body: JSON.stringify({ decision }),
  }) as Promise<Payment>;
}

/** Attach a private proof file (multipart). */
export async function uploadProof(id: RecordId, file: File) {
  if (TYPESCRIPT_API) {
    const body = new FormData();
    body.append("proof", file);
    return tsUpload<TsPayment>(`/payments/${id}/proof`, body).then(toPayment);
  }
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

export function getProofUrl(id: RecordId) {
  if (TYPESCRIPT_API) return Promise.resolve({ url: `${API_URL}/api/payments/${id}/proof` });
  return apiFetch(`/api/payments/${id}/proof-url/`) as Promise<{ url: string }>;
}

export function getBalance(clientId: RecordId) {
  if (TYPESCRIPT_API) return tsRequest<ClientBalance>(`/clients/${clientId}/balance`).then((balance) => ({
    client: balance.clientId, total_due: balance.totalDue, verified_paid: balance.verifiedPaid,
    remaining_balance: balance.remainingBalance, pending_amount: balance.pendingAmount,
    overpaid: balance.overpaid,
  }));
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
  if (TYPESCRIPT_API) return tsRequest<{
    activeBatches: number; verifiedPayments: number; pendingVerification: number; verifiedAmount: string;
  }>("/reports/dashboard").then((cards) => ({
    active_batches: cards.activeBatches, verified_payments: cards.verifiedPayments,
    pending_verification: cards.pendingVerification, verified_total: cards.verifiedAmount,
  }));
  return apiFetch("/api/reports/dashboard/") as Promise<DashboardCards>;
}
export type RecordOverview = { activeBatches: number | null; clients: number | null; readyForRelease: number | null; employees: number | null };
export const getRecordOverview = () => tsRequest<RecordOverview>("/overview");
export const getFinanceAlerts = (page = 1, unreadOnly = false) =>
  tsRequest<FinanceAlertPage>(`/staff/finance-alerts?${new URLSearchParams({ page: String(page), unreadOnly: String(unreadOnly) })}`);
export const readFinanceAlert = (id: string, version: number) =>
  tsRequest<{ id: string; version: number; readAt: string }>(`/staff/finance-alerts/${id}/read`, { method: "POST", body: JSON.stringify({ version }) });
export const readAllFinanceAlerts = () => tsRequest<{ updated: number }>("/staff/finance-alerts/read-all", { method: "POST", body: "{}" });
export const getStaffAlerts = (page = 1, unreadOnly = false, scope: StaffAlertScope = "all") =>
  tsRequest<StaffAlertPage>(`/staff/alerts?${new URLSearchParams({ page: String(page), unreadOnly: String(unreadOnly), scope })}`);
export const readStaffAlert = (alert: StaffAlert) => {
  const body: StaffAlertReadInput = alert.entity === "payment" ? { entity: "payment", version: alert.version }
    : alert.entity === "payment-result" ? { entity: "payment-result" }
    : alert.entity === "support" ? { entity: "support" }
    : alert.entity === "account" ? { entity: "account" }
    : { entity: "task", kind: alert.kind, deadline: alert.deadline };
  return tsRequest<{ id: string; readAt: string }>(`/staff/alerts/${alert.id}/read`, { method: "POST", body: JSON.stringify(body) });
};
export const readAllStaffAlerts = (scope: StaffAlertScope = "all") =>
  tsRequest<{ updated: number }>("/staff/alerts/read-all", { method: "POST", body: JSON.stringify({ scope }) });
export const getPaymentResult = (id: string) => tsRequest<PaymentResultDetail>(`/staff/alerts/results/${id}`);

// ── Records: batches + clients (M3) ────────────────────────────────────────
export type Batch = {
  id: RecordId;
  batch_number: string;
  unit_model: string;
  status: string;
  contract_price: string | null;
  num_installments: number | null;
  cadence: string;
  start_date: string;
  end_date: string | null;
  member_count: number;
  created_at: string;
  version?: number;
  terms_locked?: boolean;
  handler_name?: string | null;
  agent_name?: string | null;
  handler_available?: boolean;
  agent_available?: boolean;
};

export type ClientRecord = {
  id: RecordId;
  batch: RecordId;
  batch_number: string;
  full_name: string;
  contact_email: string;
  unit_model: string;
  status: string;
  joined_at: string;
  created_at: string;
  release_status?: string;
  version?: number;
  contact_phone?: string;
  schedule_issued?: boolean;
};

export type ScheduleItem = {
  id: RecordId;
  sequence_no: number;
  due_date: string;
  expected_amount: string;
};

export function listBatches(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  if (TYPESCRIPT_API)
    return tsRequest<Page<TsBatch>>(`/batches?${qs}`).then((page) => toPage(page, toBatch));
  return apiFetch(`/api/batches/?${qs}`) as Promise<Paginated<Batch>>;
}

export const getBatchDetails = (id: RecordId) => tsRequest<TsBatch>(`/batches/${id}`);
export const getClientDetails = (id: RecordId) => tsRequest<TsClient>(`/clients/${id}`);
export const getAssignmentOptions = () => tsRequest<AssignmentOptions>("/records/assignment-options");
export const updateBatchAssignments = (id: RecordId, input: BatchAssignmentInput) =>
  tsRequest<TsBatch>(`/batches/${id}/assignments`, { method: "PATCH", body: JSON.stringify(input) });
export const getAgentDirectory = (params: Record<string, string> = {}) => tsRequest<Page<Agent>>(`/agents?${new URLSearchParams(params)}`);
export const getDirectoryAgent = (id: string) => tsRequest<Agent>(`/agents/${id}`);
export const addDirectoryAgent = (record: AgentInput) => tsRequest<Agent>("/agents", { method: "POST", body: JSON.stringify(record) });
export const updateDirectoryAgent = (id: string, version: number, record: AgentInput) =>
  tsRequest<Agent>(`/agents/${id}`, { method: "PATCH", body: JSON.stringify({ version, record }) });
// Use the version captured when the editor opened; fetching a new version before saving would hide conflicts.
export const updateBatchDetails = (id: RecordId, version: number, record: BatchInput) =>
  tsRequest<TsBatch>(`/batches/${id}`, { method: "PATCH", body: JSON.stringify({ version, record }) });
export const updateClientDetails = (id: RecordId, version: number, record: ClientInput) =>
  tsRequest<TsClient>(`/clients/${id}`, { method: "PATCH", body: JSON.stringify({ version, record }) });
export const getRecordHistory = (kind: "batch" | "client", id: RecordId, page = 1) =>
  tsRequest<Page<RecordHistoryEntry>>(`/${kind === "batch" ? "batches" : "clients"}/${id}/history?page=${page}`);

export async function listBatchChoices(): Promise<Batch[]> {
  if (!TYPESCRIPT_API) return (await listBatches()).results;
  const batches: Batch[] = [];
  let page = 1;
  while (true) {
    const result = await listBatches({ page: String(page) });
    batches.push(...result.results.filter((batch) => ["active", "forming"].includes(batch.status) && batch.contract_price !== null));
    if (!result.next) return batches;
    page++;
  }
}

export function createBatch(body: {
  batch_number: string;
  unit_model: string;
  status: string;
  contract_price: string;
  num_installments: number;
  cadence: string;
  start_date: string;
}) {
  if (TYPESCRIPT_API) {
    const cadence = body.cadence.toUpperCase() as NonNullable<BatchInput["cadence"]>;
    const endDate = new Date(body.start_date);
    const days = { WEEKLY: 7, SEMIMONTHLY: 15, MONTHLY: 30 }[cadence];
    if (!days || !Number.isInteger(body.num_installments) || body.num_installments < 1 || body.num_installments > 600)
      return Promise.reject(new Error("Choose a cadence and 1–600 installments."));
    endDate.setUTCDate(endDate.getUTCDate() + days * body.num_installments);
    return tsRequest<TsBatch>("/batches", { method: "POST", body: JSON.stringify({
      code: body.batch_number, model: body.unit_model,
      status: ({ forming: "PLANNED", active: "ACTIVE", closed: "COMPLETED", cancelled: "CANCELLED" } as const)[body.status as "forming" | "active" | "closed" | "cancelled"],
      startDate: body.start_date, endDate: endDate.toISOString().slice(0, 10),
      contractPrice: body.contract_price, installmentCount: body.num_installments, cadence,
    }) }).then(toBatch);
  }
  return apiFetch("/api/batches/", {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<Batch>;
}

export function listClients(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  if (TYPESCRIPT_API)
    return tsRequest<Page<TsClient>>(`/clients?${qs}`).then((page) => toPage(page, toClient));
  return apiFetch(`/api/clients/${qs ? `?${qs}` : ""}`) as Promise<
    Paginated<ClientRecord>
  >;
}

export function createClient(body: {
  batch: RecordId;
  full_name: string;
  contact_email?: string;
  unit_model?: string;
  joined_at: string;
}) {
  if (TYPESCRIPT_API) return tsRequest<TsClient>("/clients", {
    method: "POST", body: JSON.stringify({
      batchId: String(body.batch), name: body.full_name, email: body.contact_email ?? "",
      phone: "", joinedAt: body.joined_at, unitModel: body.unit_model,
      status: "ACTIVE", releaseStatus: "NOT_READY",
    }),
  }).then(toClient);
  return apiFetch("/api/clients/", {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<ClientRecord>;
}

export function updateClientReleaseStatus(id: RecordId, releaseStatus: TsClient["releaseStatus"]) {
  if (!TYPESCRIPT_API) return Promise.reject(new Error("Release updates require the TypeScript API."));
  return tsRequest<TsClient>(`/clients/${id}`).then((current) => tsRequest<TsClient>(`/clients/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ version: current.version, record: {
      name: current.name, email: current.email, phone: current.phone, batchId: current.batchId,
      status: current.status, releaseStatus, unitModel: current.unitModel,
      ...(current.joinedAt ? { joinedAt: current.joinedAt } : {}),
    } }),
  })).then(toClient);
}
export type ReleaseUpdate = { id: string; status: string; note: string; collection_date: string | null; updated_at: string };
export const getReleaseUpdates = (clientId: RecordId) => tsRequest<ReleaseUpdate[]>(`/clients/${clientId}/release-updates`);
export const addReleaseUpdate = (clientId: RecordId, body: { version: number; status: TsClient["releaseStatus"]; note: string; collectionDate?: string | null }) =>
  tsRequest<ReleaseUpdate>(`/clients/${clientId}/release-updates`, { method: "POST", body: JSON.stringify(body) });

export function getSchedule(clientId: RecordId) {
  if (TYPESCRIPT_API)
    return tsRequest<ClientSchedule>(`/clients/${clientId}/schedule`).then(toSchedule);
  return apiFetch(`/api/clients/${clientId}/schedule/`) as Promise<ScheduleItem[]>;
}

// ── Current user (role-aware UI) ───────────────────────────────────────────
export type Me = {
  id: RecordId;
  email: string;
  full_name: string;
  role: string | null;
  employee_id: RecordId | null;
  account_type: "employee" | "customer" | null;
  client_id: RecordId | null;
  permissions: string[];
};

export function fetchMe() {
  if (TYPESCRIPT_API) return tsRequest<User>("/auth/me").then(toMe);
  return apiFetch("/api/auth/me/") as Promise<Me>;
}

// ── Customer portal (M5) ───────────────────────────────────────────────────
export type PortalSummary = {
  full_name: string;
  batch_number: string;
  unit_model: string;
  status: string;
  total_due: string | null;
  verified_paid: string | null;
  remaining_balance: string | null;
  release_status?: string;
  joined_at?: string | null;
  batch_start_date?: string | null;
  batch_end_date?: string | null;
};

export async function getPortalRecords(paymentPage = 1) {
  const user = await tsRequest<User>("/auth/me");
  if (user.role !== "CUSTOMER" || !user.clientId) throw new Error("A customer account is required.");
  const [client, schedule, balance, payments] = await Promise.all([
    tsRequest<TsClient>(`/clients/${user.clientId}`),
    tsRequest<ClientSchedule>(`/clients/${user.clientId}/schedule`).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 409) return null;
      throw error;
    }),
    getBalance(user.clientId),
    listPayments({ status: "verified", page: String(paymentPage) }),
  ]);
  return { client, schedule, balance, payments };
}

export type PortalScheduleItem = {
  sequence_no: number;
  due_date: string;
  expected_amount: string;
  paid_applied: string;
  status: string;
};

export function getPortalSummary() {
  return apiFetch("/api/portal/summary/") as Promise<PortalSummary>;
}

export function getPortalSchedule() {
  return apiFetch("/api/portal/schedule/") as Promise<PortalScheduleItem[]>;
}

export function getPortalPayments() {
  return apiFetch("/api/portal/payments/") as Promise<Payment[]>;
}
export type PendingCustomerPayment = { id: string; amount: string; payment_date: string; method: string; reference_no: string | null; recorded_at: string };
export const getPendingCustomerPayments = () => tsRequest<PendingCustomerPayment[]>("/portal/payments/review");

export function createPortalAccount(clientId: number, body: { email: string; password: string }) {
  return apiFetch(`/api/clients/${clientId}/portal-account/`, {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<{ detail: string }>;
}

// ── Requirements, private documents, and notifications (M3/M5/M10) ────────
export type RequirementType = {
  id: string; code: string; label: string; description: string;
  allowedMimeTypes: string[]; maxBytes: number; customerCanUpload: boolean;
  active: boolean; version: number;
};
export type ClientRequirement = {
  id: string | null; clientId: string; type: RequirementType;
  status: "MISSING" | "SUBMITTED" | "APPROVED" | "NEEDS_CLARIFICATION";
  customerNote: string; internalNote?: string; version: number;
  documents: {
    id: string; revision: number; createdAt: string;
    storedFile: { id: string; originalName: string; mimeType: string; size: number; createdAt: string };
  }[];
  reviews: {
    id: string; fromStatus: string; toStatus: string; customerNote: string;
    internalNote?: string; createdAt: string; reviewer: { id: string; name: string };
  }[];
};

export function listRequirementTypes() {
  return tsRequest<RequirementType[]>("/requirement-types");
}
export function createRequirementType(body: Omit<RequirementType, "id" | "version">) {
  return tsRequest<RequirementType>("/requirement-types", { method: "POST", body: JSON.stringify(body) });
}
export function updateRequirementType(id: string, body: Omit<RequirementType, "id" | "version">, version: number) {
  return tsRequest<RequirementType>(`/requirement-types/${id}`, {
    method: "PATCH", body: JSON.stringify({ record: body, version }),
  });
}
export function listClientRequirements(clientId: RecordId) {
  return tsRequest<ClientRequirement[]>(`/clients/${clientId}/requirements`);
}
export function uploadClientDocument(clientId: RecordId, typeId: string, file: File) {
  const body = new FormData(); body.append("document", file);
  return tsUpload<ClientRequirement>(`/clients/${clientId}/requirements/${typeId}/upload`, body);
}
export function reviewClientRequirement(id: string, body: {
  status: "APPROVED" | "NEEDS_CLARIFICATION"; customerNote: string; internalNote?: string; version: number;
}) {
  return tsRequest<ClientRequirement>(`/client-requirements/${id}/review`, {
    method: "POST", body: JSON.stringify({ ...body, internalNote: body.internalNote ?? "" }),
  });
}
export function getDocumentUrl(id: string) {
  return `${API_URL}/api/documents/${id}/content`;
}

export type NotificationRecord = {
  id: string; eventKey: string; title: string; body: string; link: string | null;
  readAt: string | null; createdAt: string;
};
export type NotificationPage = Page<NotificationRecord> & { unread: number };
export function listNotifications(unreadOnly = false) {
  return tsRequest<NotificationPage>(`/notifications?unreadOnly=${unreadOnly}`);
}
export function readNotification(id: string) {
  return tsRequest<NotificationRecord>(`/notifications/${id}/read`, { method: "PATCH" });
}
export function readAllNotifications() {
  return tsRequest<{ updated: number }>("/notifications/read-all", { method: "POST", body: JSON.stringify({}) });
}


// ── Customer Service (M8) ──────────────────────────────────────────────────
export type SupportCase = {
  id: RecordId;
  client: RecordId;
  client_name: string;
  category: string;
  description: string;
  assigned_staff: RecordId | null;
  assigned_staff_name?: string | null;
  status: string;
  resolution: string;
  date_received: string;
  closed_date: string | null;
  turnaround_hours: number | null;
  version?: number;
  last_message?: { by_customer: boolean; created_at: string } | null;
};
export type SupportMessage = { id: string; body: string; author_type: "customer" | "staff"; created_at: string };
export type SupportCaseDetail = SupportCase & { messages: SupportMessage[] };

export const SUPPORT_STATUSES: [string, string][] = [
  ["open", "Open"],
  ["in_progress", "In progress"],
  ["waiting_for_client", "Waiting for client"],
  ["resolved", "Resolved"],
  ["closed", "Closed"],
];

export function listSupportCases(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  if (TYPESCRIPT_API) return tsRequest<Paginated<SupportCase>>(`/support/cases${qs ? `?${qs}` : ""}`);
  return apiFetch(`/api/support/cases/${qs ? `?${qs}` : ""}`) as Promise<
    Paginated<SupportCase>
  >;
}

export function updateSupportCase(id: RecordId, body: { status?: string; resolution?: string; assigned_staff?: RecordId | null; version?: number }) {
  if (TYPESCRIPT_API) return tsRequest<SupportCase>(`/support/cases/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      version: body.version,
      ...(body.status ? { status: body.status.toUpperCase() } : {}),
      ...(body.resolution !== undefined ? { resolution: body.resolution } : {}),
      ...(body.assigned_staff !== undefined ? { assignedStaffId: body.assigned_staff } : {}),
    }),
  });
  return apiFetch(`/api/support/cases/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }) as Promise<SupportCase>;
}

export function getPortalSupport() {
  if (TYPESCRIPT_API) return tsRequest<SupportCase[]>("/portal/support");
  return apiFetch("/api/portal/support/") as Promise<SupportCase[]>;
}

export function createPortalSupport(body: { category: string; description: string }) {
  if (TYPESCRIPT_API) return tsRequest<SupportCase>("/portal/support", { method: "POST", body: JSON.stringify(body) });
  return apiFetch("/api/portal/support/", {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<SupportCase>;
}
export const getSupportCaseDetail = (id: RecordId, staff = false) =>
  tsRequest<SupportCaseDetail>(staff ? `/support/cases/${id}` : `/portal/support/${id}`);
export const replySupportCase = (id: RecordId, body: string, staff = false, needsReply = false) =>
  tsRequest<SupportMessage>(staff ? `/support/cases/${id}/replies` : `/portal/support/${id}/replies`, {
    method: "POST", body: JSON.stringify(staff ? { body, needsReply } : { body }),
  });

export type PortalNotification = {
  id: string;
  kind: string;
  title: string;
  message: string;
  targetPath: string | null;
  readAt: string | null;
  createdAt: string;
};
export const getPortalNotifications = () => tsRequest<PortalNotification[]>("/portal/notifications");
export const readPortalNotification = (id: string) => tsRequest<PortalNotification>(`/portal/notifications/${id}/read`, { method: "POST" });
export const readAllPortalNotifications = () => tsRequest<{ updated: number }>("/portal/notifications/read-all", { method: "POST" });

export type CustomerDocument = {
  id: string;
  requirementKey: string;
  status: "SUBMITTED" | "APPROVED" | "NEEDS_CLARIFICATION";
  fileName: string;
  mimeType: string;
  size: number;
  clarification: string;
  version: number;
  uploadedAt: string;
  reviewedAt: string | null;
};
export type DocumentRequirement = {
  key: string;
  label: string;
  description: string;
  status: CustomerDocument["status"] | "MISSING";
  latest: CustomerDocument | null;
  history: CustomerDocument[];
};
export const getCustomerDocuments = (clientId?: RecordId) => tsRequest<DocumentRequirement[]>(
  clientId ? `/clients/${clientId}/documents` : "/portal/documents",
);
export function uploadCustomerDocument(key: string, file: File, clientId?: RecordId) {
  const body = new FormData();
  body.append("file", file);
  return tsUpload<CustomerDocument>(clientId ? `/clients/${clientId}/documents/${key}` : `/portal/documents/${key}`, body);
}
export const reviewCustomerDocument = (id: string, status: "APPROVED" | "NEEDS_CLARIFICATION", version: number, clarification = "") =>
  tsRequest<CustomerDocument>(`/documents/${id}/review`, { method: "POST", body: JSON.stringify({ status, version, clarification }) });
export const downloadCustomerDocument = (id: string) => tsDownload(`/documents/${id}/file`);

// ── Employee Tasks & KPI (M6) ──────────────────────────────────────────────
export type Task = {
  id: RecordId;
  title: string;
  instructions: string;
  assignee: RecordId;
  assignee_name: string;
  creator_name: string;
  priority: string;
  deadline: string;
  status: string;
  submission_timestamp: string | null;
  late_flag: boolean | null;
  created_at: string;
  version?: number;
  attachments?: { id: RecordId; storedFile: { originalName: string; mimeType: string; size: number } }[];
};

type TsTask = {
  id: string; title: string; instructions: string; assigneeId: string;
  assignee: { id: string; name: string; role: string };
  creator: { id: string; name: string }; priority: string; deadline: string;
  status: string; submittedAt: string | null; lateFlag: boolean | null;
  createdAt: string; version: number;
  attachments: { id: string; storedFile: { originalName: string; mimeType: string; size: number } }[];
};
const toTask = (task: TsTask): Task => ({
  id: task.id, title: task.title, instructions: task.instructions,
  assignee: task.assigneeId, assignee_name: task.assignee.name,
  creator_name: task.creator.name, priority: task.priority.toLowerCase(),
  deadline: task.deadline, status: task.status.toLowerCase(),
  submission_timestamp: task.submittedAt, late_flag: task.lateFlag,
  created_at: task.createdAt, version: task.version, attachments: task.attachments,
});

export type StaffMember = { id: RecordId; full_name: string; role: string };

export function listStaff() {
  if (TYPESCRIPT_API) return tsRequest<{ id: string; name: string; role: string }[]>("/work/staff")
    .then((items) => items.map((item) => ({ id: item.id, full_name: item.name, role: item.role.toLowerCase() })));
  return apiFetch("/api/staff/") as Promise<StaffMember[]>;
}

export function listTasks(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  if (TYPESCRIPT_API) {
    const normalized = new URLSearchParams(params);
    if (normalized.get("status")) normalized.set("status", normalized.get("status")!.toUpperCase());
    return tsRequest<Page<TsTask>>(`/work/tasks?${normalized}`).then((page) => toPage(page, toTask));
  }
  return apiFetch(`/api/tasks/${qs ? `?${qs}` : ""}`) as Promise<Paginated<Task>>;
}

export function createTask(body: {
  title: string;
  instructions?: string;
  assignee: RecordId;
  priority: string;
  deadline: string;
}) {
  if (TYPESCRIPT_API) return tsRequest<TsTask>("/work/tasks", {
    method: "POST",
    body: JSON.stringify({
      title: body.title, instructions: body.instructions ?? "", assigneeId: String(body.assignee),
      priority: body.priority.toUpperCase(), deadline: new Date(body.deadline).toISOString(),
    }),
  }).then(toTask);
  return apiFetch("/api/tasks/", {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<Task>;
}

export function submitTask(id: RecordId, version = 1) {
  if (TYPESCRIPT_API) return tsRequest<TsTask>(`/work/tasks/${id}/submit`, {
    method: "POST", body: JSON.stringify({ version }),
  }).then(toTask);
  return apiFetch(`/api/tasks/${id}/submit/`, { method: "POST" }) as Promise<Task>;
}

export function getKpiQueue() {
  if (TYPESCRIPT_API) return tsRequest<TsTask[]>("/work/kpi/queue").then((items) => items.map(toTask));
  return apiFetch("/api/kpi/queue/") as Promise<Task[]>;
}

export function createKpiReview(body: {
  task: RecordId;
  evaluation?: string;
  recommendation?: string;
  decision: string;
}) {
  if (TYPESCRIPT_API) return tsRequest("/work/kpi/reviews", {
    method: "POST", body: JSON.stringify({
      taskId: String(body.task), evaluation: body.evaluation ?? "",
      recommendation: body.recommendation ?? "", decision: body.decision.toUpperCase(),
    }),
  });
  return apiFetch("/api/kpi/reviews/", {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<unknown>;
}

export function uploadTaskAttachment(id: RecordId, file: File) {
  const body = new FormData(); body.append("attachment", file);
  return tsUpload<TsTask>(`/work/tasks/${id}/attachments`, body).then(toTask);
}

export function getTaskAttachmentUrl(id: RecordId) {
  return `${API_URL}/api/work/task-attachments/${id}/content`;
}

// ── Recruitment & Agent Verification (M9) ──────────────────────────────────
export type JobOpening = {
  id: RecordId;
  title: string;
  description: string;
  location: string;
  employment_type: string;
  is_open?: boolean;
  applicant_count?: number;
  version?: number;
};

export type Applicant = {
  id: RecordId;
  job: RecordId | null;
  job_title: string;
  full_name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  reviewer_notes: string;
  created_at: string;
  version?: number;
  attachments?: { id: RecordId; storedFile: { originalName: string; mimeType: string; size: number } }[];
};

export type AgentRecord = {
  id: RecordId;
  full_name: string;
  agent_code: string;
  phone: string;
  is_active: boolean;
  version?: number;
};

export type AgentVerifyResult =
  | { found: false }
  | { found: true; full_name: string; agent_code: string; is_active: boolean };

type TsJob = {
  id: string; title: string; description: string; location: string; employmentType: string;
  isOpen: boolean; version: number; _count?: { applicants: number };
};
const toJob = (item: TsJob): JobOpening => ({
  id: item.id, title: item.title, description: item.description, location: item.location,
  employment_type: item.employmentType, is_open: item.isOpen,
  applicant_count: item._count?.applicants, version: item.version,
});
type TsApplicant = {
  id: string; jobId: string; job?: { id: string; title: string }; fullName: string;
  email: string; phone: string; message: string; status: string; reviewerNotes: string;
  createdAt: string; version: number;
  attachments?: { id: string; storedFile: { originalName: string; mimeType: string; size: number } }[];
};
const toApplicant = (item: TsApplicant): Applicant => ({
  id: item.id, job: item.jobId, job_title: item.job?.title ?? "", full_name: item.fullName,
  email: item.email, phone: item.phone, message: item.message,
  status: item.status.toLowerCase(), reviewer_notes: item.reviewerNotes,
  created_at: item.createdAt, version: item.version, attachments: item.attachments,
});
type TsAgent = { id: string; fullName: string; agentCode: string; phone: string; active: boolean; version: number };
const toAgent = (item: TsAgent): AgentRecord => ({
  id: item.id, full_name: item.fullName, agent_code: item.agentCode,
  phone: item.phone, is_active: item.active, version: item.version,
});

// public (no auth)
export function getCareers() {
  if (TYPESCRIPT_API) return tsRequest<{ id: string; title: string; description: string; location: string; employmentType: string }[]>("/careers")
    .then((items) => items.map((item) => ({ ...toJob({ ...item, isOpen: true, version: 1 }), is_open: undefined, applicant_count: undefined })));
  return apiFetch("/api/careers/") as Promise<JobOpening[]>;
}
export function applyToJob(body: {
  job: RecordId;
  full_name: string;
  email: string;
  phone?: string;
  message?: string;
}, attachment?: File) {
  if (TYPESCRIPT_API) {
    const form = new FormData();
    form.append("jobId", String(body.job)); form.append("fullName", body.full_name);
    form.append("email", body.email); form.append("phone", body.phone ?? "");
    form.append("message", body.message ?? "");
    if (attachment) form.append("attachment", attachment);
    return tsUpload<{ detail: string }>("/careers/apply", form);
  }
  return apiFetch("/api/careers/apply/", {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<{ detail: string }>;
}
export function verifyAgent(q: string) {
  if (TYPESCRIPT_API) return tsRequest<AgentVerifyResult>(`/agents/verify?q=${encodeURIComponent(q)}`);
  return apiFetch(`/api/agents/verify/?q=${encodeURIComponent(q)}`) as Promise<AgentVerifyResult>;
}

// internal (RECRUITMENT_MANAGE / AGENT_MANAGE)
export function listJobs() {
  if (TYPESCRIPT_API) return tsRequest<Page<TsJob>>("/recruitment/jobs").then((page) => toPage(page, toJob));
  return apiFetch("/api/recruitment/jobs/") as Promise<Paginated<JobOpening>>;
}
export function createJob(body: Partial<JobOpening> & { title: string }) {
  if (TYPESCRIPT_API) return tsRequest<TsJob>("/recruitment/jobs", { method: "POST", body: JSON.stringify({
    title: body.title, description: body.description ?? "", location: body.location ?? "",
    employmentType: body.employment_type ?? "", isOpen: body.is_open ?? true,
  }) }).then(toJob);
  return apiFetch("/api/recruitment/jobs/", { method: "POST", body: JSON.stringify(body) }) as Promise<JobOpening>;
}
export function updateJob(id: RecordId, body: Partial<JobOpening>) {
  if (TYPESCRIPT_API) {
    if (!body.version) return Promise.reject(new Error("Refresh this job opening before updating it."));
    return tsRequest<TsJob>(`/recruitment/jobs/${id}`, { method: "PATCH", body: JSON.stringify({
      version: body.version,
      record: { title: body.title, description: body.description ?? "", location: body.location ?? "",
        employmentType: body.employment_type ?? "", isOpen: body.is_open ?? true },
    }) }).then(toJob);
  }
  return apiFetch(`/api/recruitment/jobs/${id}/`, { method: "PATCH", body: JSON.stringify(body) }) as Promise<JobOpening>;
}
export function listApplicants(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  if (TYPESCRIPT_API) {
    const normalized = new URLSearchParams(params);
    if (normalized.get("status")) normalized.set("status", normalized.get("status")!.toUpperCase());
    return tsRequest<Page<TsApplicant>>(`/recruitment/applicants?${normalized}`).then((page) => toPage(page, toApplicant));
  }
  return apiFetch(`/api/recruitment/applicants/${qs ? `?${qs}` : ""}`) as Promise<Paginated<Applicant>>;
}
export function updateApplicant(id: RecordId, body: { status?: string; reviewer_notes?: string; version?: number }) {
  if (TYPESCRIPT_API) {
    if (!body.version) return Promise.reject(new Error("Refresh this applicant before updating it."));
    return tsRequest<TsApplicant>(`/recruitment/applicants/${id}`, { method: "PATCH", body: JSON.stringify({
      ...(body.status ? { status: body.status.toUpperCase() } : {}),
      ...(body.reviewer_notes !== undefined ? { reviewerNotes: body.reviewer_notes } : {}),
      version: body.version,
    }) }).then(toApplicant);
  }
  return apiFetch(`/api/recruitment/applicants/${id}/`, { method: "PATCH", body: JSON.stringify(body) }) as Promise<Applicant>;
}
export function listAgents() {
  if (TYPESCRIPT_API) return getAgentDirectory().then((page) => toPage(page, (agent) => ({ id: agent.id,
    full_name: agent.name, agent_code: agent.code, phone: "", is_active: agent.active })));
  return apiFetch("/api/agents/") as Promise<Paginated<AgentRecord>>;
}
export function createAgent(body: { full_name: string; agent_code: string; phone?: string; is_active: boolean }) {
  if (TYPESCRIPT_API) return addDirectoryAgent({ name: body.full_name, code: body.agent_code, active: body.is_active })
    .then((agent) => ({ id: agent.id, full_name: agent.name, agent_code: agent.code, phone: "", is_active: agent.active }));
  return apiFetch("/api/agents/", { method: "POST", body: JSON.stringify(body) }) as Promise<AgentRecord>;
}

export function getApplicantAttachmentUrl(id: RecordId) {
  return `${API_URL}/api/applicant-attachments/${id}/content`;
}

// ── Users & roles admin (M2) ───────────────────────────────────────────────
export type Employee = {
  id: RecordId;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
  version?: number;
  client_id?: string | null;
};

type TsAccount = {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  version: number;
  clientId: string | null;
  createdAt: string;
};

const legacyToTsRole: Record<string, Role> = {
  owner: "OWNER",
  coo: "COO",
  general_manager: "GENERAL_MANAGER",
  hr_payroll: "HR_PAYROLL",
  finance_officer: "FINANCE_OFFICER",
  records_monitoring: "RECORDS",
  analytics: "ANALYTICS",
  cs_head: "CS_HEAD",
  cs_team: "CS_TEAM",
  core_handler: "CORE_HANDLER",
  customer: "CUSTOMER",
};

const tsToLegacyRole = (role: Role) => role === "RECORDS" ? "records_monitoring" : role.toLowerCase();
const toEmployee = (account: TsAccount): Employee => ({
  id: account.id,
  email: account.email,
  full_name: account.name,
  role: tsToLegacyRole(account.role),
  status: account.active ? "active" : "inactive",
  created_at: account.createdAt,
  version: account.version,
  client_id: account.clientId,
});

export const ROLES: [string, string][] = [
  ["owner", "Owner"],
  ["coo", "COO"],
  ["general_manager", "General Manager"],
  ["hr_payroll", "HR / Payroll"],
  ["finance_officer", "Finance Officer"],
  ["records_monitoring", "Records & Monitoring"],
  ["analytics", "Analytics"],
  ["cs_head", "Customer Service Head"],
  ["cs_team", "Customer Service Team"],
  ["core_handler", "Core Team / Handler"],
];

export function listEmployees(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params);
  if (TYPESCRIPT_API) {
    const role = qs.get("role");
    const status = qs.get("status");
    if (role) qs.set("role", legacyToTsRole[role] ?? role.toUpperCase());
    if (status) qs.set("status", status.toUpperCase());
    return tsRequest<Page<TsAccount>>(`/accounts?${qs}`).then((page) => toPage(page, toEmployee));
  }
  const suffix = qs.size ? `?${qs}` : "";
  return apiFetch(`/api/employees/${suffix}`) as Promise<Paginated<Employee>>;
}
export function getEmployee(id: RecordId) {
  if (TYPESCRIPT_API) return tsRequest<TsAccount>(`/accounts/${id}`).then(toEmployee);
  return apiFetch(`/api/employees/${id}/`) as Promise<Employee>;
}

export function createEmployee(body: {
  email: string;
  full_name: string;
  role: string;
  password: string;
}) {
  if (TYPESCRIPT_API) return tsRequest<TsAccount>("/accounts", {
    method: "POST",
    body: JSON.stringify({
      name: body.full_name,
      email: body.email,
      role: legacyToTsRole[body.role],
      password: body.password,
    }),
  }).then(toEmployee);
  return apiFetch("/api/employees/", {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<Employee>;
}

export function updateEmployee(id: RecordId, body: { role?: string; status?: string; version?: number }) {
  if (TYPESCRIPT_API) {
    if (!body.version) return Promise.reject(new Error("Refresh this account before updating it."));
    return tsRequest<TsAccount>(`/accounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...(body.role ? { role: legacyToTsRole[body.role] } : {}),
        ...(body.status ? { active: body.status === "active" } : {}),
        version: body.version,
      }),
    }).then(toEmployee);
  }
  return apiFetch(`/api/employees/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ role: body.role, status: body.status }),
  }) as Promise<Employee>;
}

/** Download the payments report as a file (CSV or XLSX). */
export async function downloadPaymentsExport(
  params: Record<string, string> = {},
  fmt: "csv" | "xlsx" = "csv",
) {
  if (TYPESCRIPT_API) {
    if (fmt !== "csv") throw new Error("The TypeScript report currently supports CSV export.");
    const normalized = new URLSearchParams(params);
    if (normalized.get("status")) normalized.set("status", normalized.get("status")!.toUpperCase());
    const response = await fetch(`${API_URL}/api/reports/payments/export?${normalized}`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error(`Export failed (${response.status}).`);
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url; link.download = "payments.csv"; link.click(); URL.revokeObjectURL(url);
    return;
  }
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

export function getTaskReport(params: Record<string, string> = {}) {
  return tsRequest<{ total: number; byStatus: Record<string, number>; submitted: number; late: number; reviewed: number; disclaimer: string }>(`/reports/tasks?${new URLSearchParams(params)}`);
}
export function getSupportReport(params: Record<string, string> = {}) {
  return tsRequest<{ total: number; open: number; closed: number; categories: { category: string; total: number; closed: number; averageTurnaroundHours: number | null }[] }>(`/reports/support?${new URLSearchParams(params)}`);
}
export async function downloadOperationsExport(kind: "tasks" | "support", format: "csv" | "xlsx", params: Record<string, string> = {}) {
  const query = new URLSearchParams({ ...params, kind, format });
  const response = await fetch(`${API_URL}/api/reports/export?${query}`, { credentials: "include" });
  if (!response.ok) throw new Error(`Export failed (${response.status}).`);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a"); link.href = url; link.download = `${kind}.${format}`; link.click();
  URL.revokeObjectURL(url);
}
