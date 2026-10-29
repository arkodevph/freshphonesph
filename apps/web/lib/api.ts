import type {
  Agent,
  AgentInput,
  AssignmentOptions,
  BatchAssignmentInput,
  BatchInput,
  CatalogInput,
  CatalogItem,
  CatalogQuery,
  ClientBalance,
  ClientInput,
  ClientSchedule,
  CollectionReport,
  FinanceAlertPage,
  Page,
  PaymentDuplicateMatch,
  PaymentReport,
  PaymentResultDetail,
  PublicCatalogItem,
  ReceiptScan,
  ReceiptType,
  ReconciliationException,
  ReconciliationReport,
  RecordHistoryEntry,
  ReportAnalysis,
  ChartMonths,
  ExecutiveChartData,
  ReportBatchOption,
  ReportKind,
  InstallmentEarningsReport,
  ReportSnapshot,
  ReportSnapshotInput,
  Role,
  StaffAlert,
  StaffAlertPage,
  StaffAlertReadInput,
  StaffAlertScope,
  StaffEmailDelivery,
  StaffEmailKind,
  StaffEmailSettings,
  StaffEmailStatus,
  StaffEmailTemplate,
  SupportReport,
  SupportSource,
  TaskReport,
  Batch as TsBatch,
  Client as TsClient,
  Payment as TsPayment,
  User,
} from "@freshphones/contracts";
import { API_URL } from "./backend";
import {
  ApiError,
  toBatch,
  toClient,
  toMe,
  toPage,
  toSchedule,
  tsDownload,
  tsRequest,
  tsUpload,
} from "./ts-api";

export const getCatalogItems = (query: CatalogQuery) => {
  const params = new URLSearchParams({ page: String(query.page), q: query.q });

  if (query.visibility) {
    params.set("visibility", query.visibility);
  }

  if (query.availability) {
    params.set("availability", query.availability);
  }

  return tsRequest<Page<CatalogItem>>(`/catalog/items?${params}`);
};

export const getCatalogItem = (id: string) => {
  return tsRequest<CatalogItem>(`/catalog/items/${id}`);
};

export const createCatalogItem = (record: CatalogInput) => {
  return tsRequest<CatalogItem>("/catalog/items", {
    method: "POST",
    body: JSON.stringify(record),
  });
};

export const updateCatalogItem = (
  id: string,
  version: number,
  record: CatalogInput,
) => {
  return tsRequest<CatalogItem>(`/catalog/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ version, record }),
  });
};

export const uploadCatalogPhoto = (item: CatalogItem, file: File) => {
  const body = new FormData();

  body.set("version", String(item.version));

  body.set("image", file);

  return tsUpload<CatalogItem>(`/catalog/items/${item.id}/image`, body);
};

export const removeCatalogPhoto = (item: CatalogItem) => {
  return tsRequest<CatalogItem>(`/catalog/items/${item.id}/image/remove`, {
    method: "POST",
    body: JSON.stringify({ version: item.version }),
  });
};

export async function getPublicCatalog(
  query: { page: number; q?: string; availability?: string },
  signal?: AbortSignal,
): Promise<Page<PublicCatalogItem>> {
  const params = new URLSearchParams({ page: String(query.page) });

  if (query.q) {
    params.set("q", query.q);
  }

  if (query.availability) {
    params.set("availability", query.availability);
  }

  const response = await fetch(`${API_URL}/api/catalog?${params}`, {
    signal,
    cache: "no-store",
    credentials: "omit",
  });

  if (!response.ok) {
    throw new Error("We couldn’t load the current catalog.");
  }

  return response.json();
}

export type {
  Agent,
  AgentInput,
  AssignmentOptions,
  FinanceAlert,
  FinanceAlertPage,
  PaymentResultDetail,
  RecordHistoryEntry,
  StaffAlert,
  StaffAlertPage,
  StaffAlertScope,
} from "@freshphones/contracts";

export { API_URL } from "./backend";

export type RecordId = string | number;

export const getStaffEmailSettings = () => {
  return tsRequest<StaffEmailSettings>("/staff-notification-settings");
};

export const updateStaffEmailTemplate = (template: StaffEmailTemplate) => {
  return tsRequest<StaffEmailTemplate>(
    `/staff-notification-settings/templates/${template.kind}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        version: template.version,
        enabled: template.enabled,
        subject: template.subject,
        body: template.body,
      }),
    },
  );
};

export const updateStaffEmailTiming = (input: {
  version: number;
  dueSoonHours: number;
  overdueHours: number;
}) => {
  return tsRequest<{
    version: number;
    dueSoonHours: number;
    overdueHours: number;
  }>("/staff-notification-settings/timing", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
};

export const getStaffEmailDeliveries = (query: {
  page: number;
  status?: StaffEmailStatus;
  kind?: StaffEmailKind;
}) => {
  const params = new URLSearchParams({ page: String(query.page) });

  if (query.status) {
    params.set("status", query.status);
  }

  if (query.kind) {
    params.set("kind", query.kind);
  }

  return tsRequest<Page<StaffEmailDelivery>>(
    `/staff-notification-settings/deliveries?${params}`,
  );
};

export const retryStaffEmail = (delivery: StaffEmailDelivery) => {
  return tsRequest<{ id: string; status: StaffEmailStatus; version: number }>(
    `/staff-notification-settings/deliveries/${delivery.id}/retry`,
    {
      method: "POST",
      body: JSON.stringify({ version: delivery.version }),
    },
  );
};

export type EditableBatch = TsBatch;

export type EditableClient = TsClient;

export class MfaChallenge extends Error {}

/** Create a Better Auth session using an HTTP-only cookie. */
export async function login(username: string, password: string): Promise<void> {
  const result = await tsRequest<User | { twoFactorRedirect: true }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email: username, password }) },
  );

  if ("twoFactorRedirect" in result) {
    throw new MfaChallenge("Enter your verification code.");
  }
}

// ── Payment types & endpoints (M4) ─────────────────────────────────────────
export type PaymentStatus =
  "pending" | "verified" | "rejected" | "needs_clarification";

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
  recorded_by?: RecordId | null;
  recorded_by_name?: string | null;
  verifier_name?: string | null;
  verified_by: RecordId | null;
  created_at: string;
  updated_at?: string | null;
  verified_at?: string | null;
  version?: number;
  original_amount?: string;
  adjustment_revision?: number;
  adjustments?: import("@freshphones/contracts").PaymentAdjustment[];
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

const toPayment = (payment: TsPayment): Payment => {
  return {
    id: payment.id,
    client: payment.clientId,
    client_name: payment.client.name,
    batch: payment.batchId,
    amount: payment.effectiveAmount ?? payment.amount,
    original_amount: payment.amount,
    adjustment_revision: payment.adjustmentRevision ?? 0,
    adjustments: payment.adjustments ?? [],
    payment_date: payment.paymentDate,
    method: payment.method,
    reference_no: payment.referenceNumber ?? "",
    receipt_time: payment.receiptTime,
    receipt_name: payment.receiptName,
    receipt_phone: payment.receiptPhone,
    proof_file: payment.proofFile?.id ?? null,
    status: payment.status.toLowerCase() as PaymentStatus,
    notes: payment.notes,
    verification_notes: payment.verificationNotes,
    batch_code: payment.client.batch.code,
    recorded_by: payment.recordedBy.id,
    recorded_by_name: payment.recordedBy.name,
    verifier_name: payment.verifier?.name ?? null,
    verified_by: payment.verifier?.id ?? null,
    created_at: payment.createdAt,
    updated_at: payment.updatedAt,
    verified_at: payment.verifiedAt,
    version: payment.version,
    duplicate_reference: payment.duplicateReference,
  };
};

export function adjustPayment(
  id: RecordId,
  input: import("@freshphones/contracts").PaymentAdjustmentInput,
) {
  return tsRequest<TsPayment>(`/payments/${id}/adjustments`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then(toPayment);
}

export function listPayments(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();

  {
    const normalized = new URLSearchParams(params);

    if (normalized.get("status")) {
      normalized.set("status", normalized.get("status")!.toUpperCase());
    }

    return tsRequest<Page<TsPayment>>(`/payments?${normalized}`).then(
      (page) => {
        return toPage(page, toPayment);
      },
    );
  }
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
  return tsRequest<TsPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      clientId: String(body.client),
      amount: body.amount,
      paymentDate: body.payment_date,
      method: body.method,
      referenceNumber: body.reference_no || null,
      receiptTime: body.receipt_time || null,
      receiptName: body.receipt_name || null,
      receiptPhone: body.receipt_phone || null,
    }),
  }).then(toPayment);
}

export function updatePayment(
  id: RecordId,
  version: number,
  body: {
    client: RecordId;
    amount: string;
    payment_date: string;
    method: string;
    reference_no?: string;
    receipt_time?: string;
    receipt_name?: string;
    receipt_phone?: string;
  },
) {
  return tsRequest<TsPayment>(`/payments/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      version,
      record: {
        clientId: String(body.client),
        amount: body.amount,
        paymentDate: body.payment_date,
        method: body.method,
        referenceNumber: body.reference_no || null,
        receiptTime: body.receipt_time || null,
        receiptName: body.receipt_name || null,
        receiptPhone: body.receipt_phone || null,
      },
    }),
  }).then(toPayment);
}

export function scanPaymentReceipt(receipt: File, template: ReceiptType) {
  const body = new FormData();

  body.append("template", template);

  body.append("receipt", receipt);

  return tsUpload<ReceiptScan>("/payments/receipt-scan", body);
}

export function findDuplicatePayments(
  method: string,
  referenceNumber: string,
  excludeId?: RecordId,
) {
  const query = new URLSearchParams({ method, referenceNumber });

  if (excludeId) {
    query.set("excludeId", String(excludeId));
  }

  return tsRequest<PaymentDuplicateMatch[]>(`/payments/duplicates?${query}`);
}

export function decidePayment(
  id: RecordId,
  decision: PaymentStatus,
  version = 1,
  notes = "Finance reviewed",
) {
  return tsRequest<TsPayment>(`/payments/${id}/verify`, {
    method: "POST",
    body: JSON.stringify({ decision: decision.toUpperCase(), version, notes }),
  }).then(toPayment);
}

/** Attach a private proof file (multipart). */
export async function uploadProof(id: RecordId, file: File) {
  const body = new FormData();

  body.append("proof", file);

  return tsUpload<TsPayment>(`/payments/${id}/proof`, body).then(toPayment);
}

export function getProofUrl(id: RecordId) {
  return Promise.resolve({ url: `${API_URL}/api/payments/${id}/proof` });
}

export function getBalance(clientId: RecordId) {
  return tsRequest<ClientBalance>(`/clients/${clientId}/balance`).then(
    (balance) => {
      return {
        client: balance.clientId,
        total_due: balance.totalDue,
        verified_paid: balance.verifiedPaid,
        remaining_balance: balance.remainingBalance,
        pending_amount: balance.pendingAmount,
        overpaid: balance.overpaid,
      };
    },
  );
}

// ── Reporting (M7) ─────────────────────────────────────────────────────────
export function getExecutiveCharts(months: ChartMonths) {
  return tsRequest<ExecutiveChartData>(`/reports/charts?months=${months}`);
}

export type DashboardCards = {
  active_batches: number;
  verified_payments: number;
  pending_verification: number;
  verified_total: string;
};

export function getDashboard() {
  return tsRequest<{
    activeBatches: number;
    verifiedPayments: number;
    pendingVerification: number;
    verifiedAmount: string;
  }>("/reports/dashboard").then((cards) => {
    return {
      active_batches: cards.activeBatches,
      verified_payments: cards.verifiedPayments,
      pending_verification: cards.pendingVerification,
      verified_total: cards.verifiedAmount,
    };
  });
}

export type RecordOverview = {
  activeBatches: number | null;
  clients: number | null;
  readyForRelease: number | null;
  employees: number | null;
};

export const getRecordOverview = () => {
  return tsRequest<RecordOverview>("/overview");
};

export const getFinanceAlerts = (page = 1, unreadOnly = false) => {
  return tsRequest<FinanceAlertPage>(
    `/staff/finance-alerts?${new URLSearchParams({ page: String(page), unreadOnly: String(unreadOnly) })}`,
  );
};

export const readFinanceAlert = (id: string, version: number) => {
  return tsRequest<{ id: string; version: number; readAt: string }>(
    `/staff/finance-alerts/${id}/read`,
    { method: "POST", body: JSON.stringify({ version }) },
  );
};

export const readAllFinanceAlerts = () => {
  return tsRequest<{ updated: number }>("/staff/finance-alerts/read-all", {
    method: "POST",
    body: "{}",
  });
};

export const getStaffAlerts = (
  page = 1,
  unreadOnly = false,
  scope: StaffAlertScope = "all",
) => {
  return tsRequest<StaffAlertPage>(
    `/staff/alerts?${new URLSearchParams({ page: String(page), unreadOnly: String(unreadOnly), scope })}`,
  );
};

export const readStaffAlert = (alert: StaffAlert) => {
  const body: StaffAlertReadInput =
    alert.entity === "payment"
      ? { entity: "payment", version: alert.version }
      : alert.entity === "enrollment"
        ? { entity: "enrollment", version: alert.version }
        : alert.entity === "payment-result"
          ? { entity: "payment-result" }
          : alert.entity === "support"
            ? { entity: "support" }
            : alert.entity === "account"
              ? { entity: "account" }
              : { entity: "task", kind: alert.kind, deadline: alert.deadline };

  return tsRequest<{ id: string; readAt: string }>(
    `/staff/alerts/${alert.id}/read`,
    { method: "POST", body: JSON.stringify(body) },
  );
};

export const readAllStaffAlerts = (scope: StaffAlertScope = "all") => {
  return tsRequest<{ updated: number }>("/staff/alerts/read-all", {
    method: "POST",
    body: JSON.stringify({ scope }),
  });
};

export const getPaymentResult = (id: string) => {
  return tsRequest<PaymentResultDetail>(`/staff/alerts/results/${id}`);
};

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

  return tsRequest<Page<TsBatch>>(`/batches?${qs}`).then((page) => {
    return toPage(page, toBatch);
  });
}

export const getBatchDetails = (id: RecordId) => {
  return tsRequest<TsBatch>(`/batches/${id}`);
};

export const getClientDetails = (id: RecordId) => {
  return tsRequest<TsClient>(`/clients/${id}`);
};

export const getAssignmentOptions = () => {
  return tsRequest<AssignmentOptions>("/records/assignment-options");
};

export const updateBatchAssignments = (
  id: RecordId,
  input: BatchAssignmentInput,
) => {
  return tsRequest<TsBatch>(`/batches/${id}/assignments`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
};

export const getAgentDirectory = (params: Record<string, string> = {}) => {
  return tsRequest<Page<Agent>>(`/agents?${new URLSearchParams(params)}`);
};

export const getDirectoryAgent = (id: string) => {
  return tsRequest<Agent>(`/agents/${id}`);
};

export const addDirectoryAgent = (record: AgentInput) => {
  return tsRequest<Agent>("/agents", {
    method: "POST",
    body: JSON.stringify(record),
  });
};

export const updateDirectoryAgent = (
  id: string,
  version: number,
  record: AgentInput,
) => {
  return tsRequest<Agent>(`/agents/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ version, record }),
  });
};

// Use the version captured when the editor opened; fetching a new version before saving would hide conflicts.
export const updateBatchDetails = (
  id: RecordId,
  version: number,
  record: BatchInput,
) => {
  return tsRequest<TsBatch>(`/batches/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ version, record }),
  });
};

export const updateClientDetails = (
  id: RecordId,
  version: number,
  record: ClientInput,
) => {
  return tsRequest<TsClient>(`/clients/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ version, record }),
  });
};

export const getRecordHistory = (
  kind: "batch" | "client",
  id: RecordId,
  page = 1,
) => {
  return tsRequest<Page<RecordHistoryEntry>>(
    `/${kind === "batch" ? "batches" : "clients"}/${id}/history?page=${page}`,
  );
};

export async function listBatchChoices(): Promise<Batch[]> {
  const batches: Batch[] = [];

  let page = 1;

  while (true) {
    const result = await listBatches({ page: String(page) });

    batches.push(
      ...result.results.filter((batch) => {
        return (
          ["active", "forming"].includes(batch.status) &&
          batch.contract_price !== null
        );
      }),
    );

    if (!result.next) {
      return batches;
    }

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
  const cadence = body.cadence.toUpperCase() as NonNullable<
    BatchInput["cadence"]
  >;

  const endDate = new Date(body.start_date);

  const days = { WEEKLY: 7, SEMIMONTHLY: 15, MONTHLY: 30 }[cadence];

  if (
    !days ||
    !Number.isInteger(body.num_installments) ||
    body.num_installments < 1 ||
    body.num_installments > 600
  ) {
    return Promise.reject(
      new Error("Choose a cadence and 1–600 installments."),
    );
  }

  endDate.setUTCDate(endDate.getUTCDate() + days * body.num_installments);

  return tsRequest<TsBatch>("/batches", {
    method: "POST",
    body: JSON.stringify({
      code: body.batch_number,
      model: body.unit_model,
      status: (
        {
          forming: "PLANNED",
          active: "ACTIVE",
          closed: "COMPLETED",
          cancelled: "CANCELLED",
        } as const
      )[body.status as "forming" | "active" | "closed" | "cancelled"],
      startDate: body.start_date,
      endDate: endDate.toISOString().slice(0, 10),
      contractPrice: body.contract_price,
      installmentCount: body.num_installments,
      cadence,
    }),
  }).then(toBatch);
}

export function listClients(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();

  return tsRequest<Page<TsClient>>(`/clients?${qs}`).then((page) => {
    return toPage(page, toClient);
  });
}

export function createClient(body: {
  batch: RecordId;
  full_name: string;
  contact_email?: string;
  unit_model?: string;
  joined_at: string;
}) {
  return tsRequest<TsClient>("/clients", {
    method: "POST",
    body: JSON.stringify({
      batchId: String(body.batch),
      name: body.full_name,
      email: body.contact_email ?? "",
      phone: "",
      joinedAt: body.joined_at,
      unitModel: body.unit_model,
      status: "ACTIVE",
      releaseStatus: "NOT_READY",
    }),
  }).then(toClient);
}

export function updateClientReleaseStatus(
  id: RecordId,
  releaseStatus: TsClient["releaseStatus"],
) {
  return tsRequest<TsClient>(`/clients/${id}`)
    .then((current) => {
      return tsRequest<TsClient>(`/clients/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          version: current.version,
          record: {
            name: current.name,
            email: current.email,
            phone: current.phone,
            batchId: current.batchId,
            status: current.status,
            releaseStatus,
            unitModel: current.unitModel,
            ...(current.joinedAt ? { joinedAt: current.joinedAt } : {}),
          },
        }),
      });
    })
    .then(toClient);
}

export type ReleaseUpdate = {
  id: string;
  status: string;
  note: string;
  collection_date: string | null;
  updated_at: string;
};

export const getReleaseUpdates = (clientId: RecordId) => {
  return tsRequest<ReleaseUpdate[]>(`/clients/${clientId}/release-updates`);
};

export const addReleaseUpdate = (
  clientId: RecordId,
  body: {
    version: number;
    status: TsClient["releaseStatus"];
    note: string;
    collectionDate?: string | null;
  },
) => {
  return tsRequest<ReleaseUpdate>(`/clients/${clientId}/release-updates`, {
    method: "POST",
    body: JSON.stringify(body),
  });
};

export function getSchedule(clientId: RecordId) {
  return tsRequest<ClientSchedule>(`/clients/${clientId}/schedule`).then(
    toSchedule,
  );
}

// ── Current user (role-aware UI) ───────────────────────────────────────────
export type Me = {
  id: RecordId;
  email: string;
  full_name: string;
  image?: string | null;
  role: string | null;
  employee_id: RecordId | null;
  account_type: "employee" | "customer" | null;
  client_id: RecordId | null;
  permissions: string[];
};

let identityRequest: Promise<Me> | null = null;

export function fetchMe() {
  if (!identityRequest) {
    identityRequest = tsRequest<User>("/auth/me")
      .then(toMe)
      .finally(() => {
        identityRequest = null;
      });
  }

  return identityRequest;
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

  if (user.role !== "CUSTOMER" || !user.clientId) {
    throw new Error("A customer account is required.");
  }

  const { currentMembership } = await import("./membership-selection");

  const clientId = currentMembership(user.id, user.clientId)!;

  const [client, schedule, balance, payments] = await Promise.all([
    tsRequest<TsClient>(`/clients/${clientId}`),
    tsRequest<ClientSchedule>(`/clients/${clientId}/schedule`).catch(
      (error: unknown) => {
        if (error instanceof ApiError && error.status === 409) {
          return null;
        }

        throw error;
      },
    ),
    getBalance(clientId),
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

export type PendingCustomerPayment = {
  id: string;
  amount: string;
  payment_date: string;
  method: string;
  reference_no: string | null;
  recorded_at: string;
};

export const getPendingCustomerPayments = () => {
  return tsRequest<PendingCustomerPayment[]>("/portal/payments/review");
};

// ── Requirements, private documents, and notifications (M3/M5/M10) ────────
export type RequirementType = {
  id: string;
  code: string;
  label: string;
  description: string;
  allowedMimeTypes: string[];
  maxBytes: number;
  customerCanUpload: boolean;
  active: boolean;
  version: number;
};

export type ClientRequirement = {
  id: string | null;
  clientId: string;
  type: RequirementType;
  status: "MISSING" | "SUBMITTED" | "APPROVED" | "NEEDS_CLARIFICATION";
  customerNote: string;
  internalNote?: string;
  version: number;
  documents: {
    id: string;
    revision: number;
    createdAt: string;
    storedFile: {
      id: string;
      originalName: string;
      mimeType: string;
      size: number;
      createdAt: string;
    };
  }[];
  reviews: {
    id: string;
    fromStatus: string;
    toStatus: string;
    customerNote: string;
    internalNote?: string;
    createdAt: string;
    reviewer: { id: string; name: string };
  }[];
};

export function listRequirementTypes() {
  return tsRequest<RequirementType[]>("/requirement-types");
}

export function createRequirementType(
  body: Omit<RequirementType, "id" | "version">,
) {
  return tsRequest<RequirementType>("/requirement-types", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateRequirementType(
  id: string,
  body: Omit<RequirementType, "id" | "version">,
  version: number,
) {
  return tsRequest<RequirementType>(`/requirement-types/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ record: body, version }),
  });
}

export function listClientRequirements(clientId: RecordId) {
  return tsRequest<ClientRequirement[]>(`/clients/${clientId}/requirements`);
}

export function uploadClientDocument(
  clientId: RecordId,
  typeId: string,
  file: File,
) {
  const body = new FormData();

  body.append("document", file);

  return tsUpload<ClientRequirement>(
    `/clients/${clientId}/requirements/${typeId}/upload`,
    body,
  );
}

export function reviewClientRequirement(
  id: string,
  body: {
    status: "APPROVED" | "NEEDS_CLARIFICATION";
    customerNote: string;
    internalNote?: string;
    version: number;
  },
) {
  return tsRequest<ClientRequirement>(`/client-requirements/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ ...body, internalNote: body.internalNote ?? "" }),
  });
}

export function getDocumentUrl(id: string) {
  return `${API_URL}/api/documents/${id}/content`;
}

export type NotificationRecord = {
  id: string;
  eventKey: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPage = Page<NotificationRecord> & { unread: number };

export function listNotifications(unreadOnly = false) {
  return tsRequest<NotificationPage>(`/notifications?unreadOnly=${unreadOnly}`);
}

export function readNotification(id: string) {
  return tsRequest<NotificationRecord>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export function readAllNotifications() {
  return tsRequest<{ updated: number }>("/notifications/read-all", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

// ── Customer Service (M8) ──────────────────────────────────────────────────
export type SupportCase = {
  id: RecordId;
  client: RecordId;
  client_name: string;
  category: string;
  source: Lowercase<SupportSource>;
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

export type SupportMessage = {
  id: string;
  body: string;
  author_type: "customer" | "staff";
  created_at: string;
};

export type SupportCaseDetail = SupportCase & { messages: SupportMessage[] };

export const SUPPORT_STATUSES: [string, string][] = [
  ["open", "Open"],
  ["in_progress", "In progress"],
  ["waiting_for_client", "Waiting for client"],
  ["resolved", "Resolved"],
  ["closed", "Closed"],
];

export const SUPPORT_SOURCES: [Lowercase<SupportSource>, string][] = [
  ["unrecorded", "Unrecorded"],
  ["customer_portal", "Customer portal"],
  ["messenger", "Messenger"],
  ["facebook", "Facebook"],
  ["phone", "Phone"],
  ["walk_in", "Walk-in"],
  ["other", "Other"],
];

export const STAFF_SUPPORT_SOURCES = SUPPORT_SOURCES.filter(([source]) => {
  return source !== "unrecorded" && source !== "customer_portal";
});

export const supportSourceLabel = (source: string) => {
  return (
    SUPPORT_SOURCES.find(([key]) => {
      return key === source.toLowerCase();
    })?.[1] ?? source
  );
};

export type SupportClientOption = {
  id: string;
  name: string;
  batch_code: string;
};

export const searchSupportClients = (query: string) => {
  return tsRequest<SupportClientOption[]>(
    `/support/client-options?q=${encodeURIComponent(query)}`,
  );
};

export const createStaffSupportCase = (body: {
  clientId: string;
  category: string;
  description: string;
  source: Uppercase<Lowercase<SupportSource>>;
}) => {
  return tsRequest<SupportCase>("/support/cases", {
    method: "POST",
    body: JSON.stringify(body),
  });
};

export function listSupportCases(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();

  return tsRequest<Paginated<SupportCase>>(
    `/support/cases${qs ? `?${qs}` : ""}`,
  );
}

export function updateSupportCase(
  id: RecordId,
  body: {
    status?: string;
    resolution?: string;
    assigned_staff?: RecordId | null;
    version?: number;
  },
) {
  return tsRequest<SupportCase>(`/support/cases/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      version: body.version,
      ...(body.status ? { status: body.status.toUpperCase() } : {}),
      ...(body.resolution !== undefined ? { resolution: body.resolution } : {}),
      ...(body.assigned_staff !== undefined
        ? { assignedStaffId: body.assigned_staff }
        : {}),
    }),
  });
}

export function getPortalSupport() {
  return tsRequest<SupportCase[]>("/portal/support");
}

export function createPortalSupport(body: {
  category: string;
  description: string;
}) {
  return tsRequest<SupportCase>("/portal/support", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export const getSupportCaseDetail = (id: RecordId, staff = false) => {
  return tsRequest<SupportCaseDetail>(
    staff ? `/support/cases/${id}` : `/portal/support/${id}`,
  );
};

export const replySupportCase = (
  id: RecordId,
  body: string,
  staff = false,
  needsReply = false,
) => {
  return tsRequest<SupportMessage>(
    staff ? `/support/cases/${id}/replies` : `/portal/support/${id}/replies`,
    {
      method: "POST",
      body: JSON.stringify(staff ? { body, needsReply } : { body }),
    },
  );
};

export type PortalNotification = {
  id: string;
  kind: string;
  title: string;
  message: string;
  targetPath: string | null;
  readAt: string | null;
  createdAt: string;
};

export const getPortalNotifications = () => {
  return tsRequest<PortalNotification[]>("/portal/notifications");
};

export const readPortalNotification = (id: string) => {
  return tsRequest<PortalNotification>(`/portal/notifications/${id}/read`, {
    method: "POST",
  });
};

export const readAllPortalNotifications = () => {
  return tsRequest<{ updated: number }>("/portal/notifications/read-all", {
    method: "POST",
  });
};

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

export const getCustomerDocuments = (clientId?: RecordId) => {
  return tsRequest<DocumentRequirement[]>(
    clientId ? `/clients/${clientId}/documents` : "/portal/documents",
  );
};

export function uploadCustomerDocument(
  key: string,
  file: File,
  clientId?: RecordId,
) {
  const body = new FormData();

  body.append("file", file);

  return tsUpload<CustomerDocument>(
    clientId
      ? `/clients/${clientId}/documents/${key}`
      : `/portal/documents/${key}`,
    body,
  );
}

export const reviewCustomerDocument = (
  id: string,
  status: "APPROVED" | "NEEDS_CLARIFICATION",
  version: number,
  clarification = "",
) => {
  return tsRequest<CustomerDocument>(`/documents/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ status, version, clarification }),
  });
};

export const downloadCustomerDocument = (id: string) => {
  return tsDownload(`/documents/${id}/file`);
};

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
  attachments?: {
    id: RecordId;
    storedFile: { originalName: string; mimeType: string; size: number };
  }[];
};

type TsTask = {
  id: string;
  title: string;
  instructions: string;
  assigneeId: string;
  assignee: { id: string; name: string; role: string };
  creator: { id: string; name: string };
  priority: string;
  deadline: string;
  status: string;
  submittedAt: string | null;
  lateFlag: boolean | null;
  createdAt: string;
  version: number;
  attachments: {
    id: string;
    storedFile: { originalName: string; mimeType: string; size: number };
  }[];
};

const toTask = (task: TsTask): Task => {
  return {
    id: task.id,
    title: task.title,
    instructions: task.instructions,
    assignee: task.assigneeId,
    assignee_name: task.assignee.name,
    creator_name: task.creator.name,
    priority: task.priority.toLowerCase(),
    deadline: task.deadline,
    status: task.status.toLowerCase(),
    submission_timestamp: task.submittedAt,
    late_flag: task.lateFlag,
    created_at: task.createdAt,
    version: task.version,
    attachments: task.attachments,
  };
};

export type StaffMember = { id: RecordId; full_name: string; role: string };

export function listStaff() {
  return tsRequest<{ id: string; name: string; role: string }[]>(
    "/work/staff",
  ).then((items) => {
    return items.map((item) => {
      return {
        id: item.id,
        full_name: item.name,
        role: item.role.toLowerCase(),
      };
    });
  });
}

export function listTasks(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();

  {
    const normalized = new URLSearchParams(params);

    if (normalized.get("status")) {
      normalized.set("status", normalized.get("status")!.toUpperCase());
    }

    return tsRequest<Page<TsTask>>(`/work/tasks?${normalized}`).then((page) => {
      return toPage(page, toTask);
    });
  }
}

export function createTask(body: {
  title: string;
  instructions?: string;
  assignee: RecordId;
  priority: string;
  deadline: string;
}) {
  return tsRequest<TsTask>("/work/tasks", {
    method: "POST",
    body: JSON.stringify({
      title: body.title,
      instructions: body.instructions ?? "",
      assigneeId: String(body.assignee),
      priority: body.priority.toUpperCase(),
      deadline: new Date(body.deadline).toISOString(),
    }),
  }).then(toTask);
}

export function submitTask(id: RecordId, version = 1) {
  return tsRequest<TsTask>(`/work/tasks/${id}/submit`, {
    method: "POST",
    body: JSON.stringify({ version }),
  }).then(toTask);
}

export function getKpiQueue() {
  return tsRequest<TsTask[]>("/work/kpi/queue").then((items) => {
    return items.map(toTask);
  });
}

export function createKpiReview(body: {
  task: RecordId;
  evaluation?: string;
  recommendation?: string;
  decision: string;
}) {
  return tsRequest("/work/kpi/reviews", {
    method: "POST",
    body: JSON.stringify({
      taskId: String(body.task),
      evaluation: body.evaluation ?? "",
      recommendation: body.recommendation ?? "",
      decision: body.decision.toUpperCase(),
    }),
  });
}

export function uploadTaskAttachment(id: RecordId, file: File) {
  const body = new FormData();

  body.append("attachment", file);

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
  attachments?: {
    id: RecordId;
    storedFile: { originalName: string; mimeType: string; size: number };
  }[];
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
  id: string;
  title: string;
  description: string;
  location: string;
  employmentType: string;
  isOpen: boolean;
  version: number;
  _count?: { applicants: number };
};

const toJob = (item: TsJob): JobOpening => {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    location: item.location,
    employment_type: item.employmentType,
    is_open: item.isOpen,
    applicant_count: item._count?.applicants,
    version: item.version,
  };
};

type TsApplicant = {
  id: string;
  jobId: string;
  job?: { id: string; title: string };
  fullName: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  reviewerNotes: string;
  createdAt: string;
  version: number;
  attachments?: {
    id: string;
    storedFile: { originalName: string; mimeType: string; size: number };
  }[];
};

const toApplicant = (item: TsApplicant): Applicant => {
  return {
    id: item.id,
    job: item.jobId,
    job_title: item.job?.title ?? "",
    full_name: item.fullName,
    email: item.email,
    phone: item.phone,
    message: item.message,
    status: item.status.toLowerCase(),
    reviewer_notes: item.reviewerNotes,
    created_at: item.createdAt,
    version: item.version,
    attachments: item.attachments,
  };
};

type TsAgent = {
  id: string;
  fullName: string;
  agentCode: string;
  phone: string;
  active: boolean;
  version: number;
};

const toAgent = (item: TsAgent): AgentRecord => {
  return {
    id: item.id,
    full_name: item.fullName,
    agent_code: item.agentCode,
    phone: item.phone,
    is_active: item.active,
    version: item.version,
  };
};

// public (no auth)
export function getCareers() {
  return tsRequest<
    {
      id: string;
      title: string;
      description: string;
      location: string;
      employmentType: string;
    }[]
  >("/careers").then((items) => {
    return items.map((item) => {
      return {
        ...toJob({ ...item, isOpen: true, version: 1 }),
        is_open: undefined,
        applicant_count: undefined,
      };
    });
  });
}

export function applyToJob(
  body: {
    job: RecordId;
    full_name: string;
    email: string;
    phone?: string;
    message?: string;
    privacyNoticeVersion?: string;
    privacyNoticeAcknowledged?: boolean;
  },
  attachment?: File,
) {
  const form = new FormData();

  form.append("jobId", String(body.job));

  form.append("fullName", body.full_name);

  form.append("email", body.email);

  form.append("phone", body.phone ?? "");

  form.append("message", body.message ?? "");

  if (body.privacyNoticeVersion && body.privacyNoticeAcknowledged) {
    form.append("privacyNoticeVersion", body.privacyNoticeVersion);

    form.append("privacyNoticeAcknowledged", "true");
  }

  if (attachment) {
    form.append("attachment", attachment);
  }

  return tsUpload<{ detail: string }>("/careers/apply", form);
}

export function verifyAgent(q: string) {
  return tsRequest<AgentVerifyResult>(
    `/agents/verify?q=${encodeURIComponent(q)}`,
  );
}

// internal (RECRUITMENT_MANAGE / AGENT_MANAGE)
export function listJobs(params: Record<string, string> | number = {}) {
  const normalized = new URLSearchParams(
    typeof params === "number" ? { page: String(params) } : params,
  );

  if (normalized.get("status")) {
    normalized.set("status", normalized.get("status")!.toUpperCase());
  }

  const query = normalized.size ? `?${normalized}` : "";

  return tsRequest<Page<TsJob>>(`/recruitment/jobs${query}`).then((page) => {
    return toPage(page, toJob);
  });
}

export const getRecruitmentSummary = () => {
  return tsRequest<import("@freshphones/contracts").RecruitmentSummary>(
    "/recruitment/summary",
  );
};

export const getApplicant = (id: RecordId) => {
  return tsRequest<TsApplicant>(`/recruitment/applicants/${id}`).then(
    toApplicant,
  );
};

export const getJob = (id: RecordId) => {
  return tsRequest<TsJob>(`/recruitment/jobs/${id}`).then(toJob);
};

export function createJob(body: Partial<JobOpening> & { title: string }) {
  return tsRequest<TsJob>("/recruitment/jobs", {
    method: "POST",
    body: JSON.stringify({
      title: body.title,
      description: body.description ?? "",
      location: body.location ?? "",
      employmentType: body.employment_type ?? "",
      isOpen: body.is_open ?? true,
    }),
  }).then(toJob);
}

export function updateJob(id: RecordId, body: Partial<JobOpening>) {
  if (!body.version) {
    return Promise.reject(
      new Error("Refresh this job opening before updating it."),
    );
  }

  return tsRequest<TsJob>(`/recruitment/jobs/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      version: body.version,
      record: {
        title: body.title,
        description: body.description ?? "",
        location: body.location ?? "",
        employmentType: body.employment_type ?? "",
        isOpen: body.is_open ?? true,
      },
    }),
  }).then(toJob);
}

export function listApplicants(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();

  {
    const normalized = new URLSearchParams(params);

    if (normalized.get("status")) {
      normalized.set("status", normalized.get("status")!.toUpperCase());
    }

    return tsRequest<Page<TsApplicant>>(
      `/recruitment/applicants?${normalized}`,
    ).then((page) => {
      return toPage(page, toApplicant);
    });
  }
}

export function updateApplicant(
  id: RecordId,
  body: { status?: string; reviewer_notes?: string; version?: number },
) {
  if (!body.version) {
    return Promise.reject(
      new Error("Refresh this applicant before updating it."),
    );
  }

  return tsRequest<TsApplicant>(`/recruitment/applicants/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...(body.status ? { status: body.status.toUpperCase() } : {}),
      ...(body.reviewer_notes !== undefined
        ? { reviewerNotes: body.reviewer_notes }
        : {}),
      version: body.version,
    }),
  }).then(toApplicant);
}

export function listAgents() {
  return getAgentDirectory().then((page) => {
    return toPage(page, (agent) => {
      return {
        id: agent.id,
        full_name: agent.name,
        agent_code: agent.code,
        phone: "",
        is_active: agent.active,
      };
    });
  });
}

export function createAgent(body: {
  full_name: string;
  agent_code: string;
  phone?: string;
  is_active: boolean;
}) {
  return addDirectoryAgent({
    name: body.full_name,
    code: body.agent_code,
    active: body.is_active,
  }).then((agent) => {
    return {
      id: agent.id,
      full_name: agent.name,
      agent_code: agent.code,
      phone: "",
      is_active: agent.active,
    };
  });
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
  hr_confidential_access?: boolean;
  supervisor_id?: string | null;
  agent_profile_id?: string | null;
};

type TsAccount = {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  hrConfidentialAccess: boolean;
  supervisorId?: string | null;
  agentProfileId?: string | null;
  version: number;
  clientId: string | null;
  createdAt: string;
};

const formToApiRole: Record<string, Role> = {
  ceo: "CEO",
  system_admin: "SYSTEM_ADMIN",
  owner: "CEO",
  coo: "COO",
  batch_manager: "BATCH_MANAGER",
  batch_handler: "BATCH_HANDLER",
  csr: "CSR",
  kpi_officer: "KPI_OFFICER",
  operations_coordinator: "OPERATIONS_COORDINATOR",
  pioneer_agent: "PIONEER_AGENT",
  agent: "AGENT",
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

const apiToFormRole = (role: Role) => {
  return role === "RECORDS"
    ? "records_monitoring"
    : role === "OWNER"
      ? "ceo"
      : role.toLowerCase();
};

const toEmployee = (account: TsAccount): Employee => {
  return {
    id: account.id,
    email: account.email,
    full_name: account.name,
    role: apiToFormRole(account.role),
    status: account.active ? "active" : "inactive",
    created_at: account.createdAt,
    version: account.version,
    client_id: account.clientId,
    hr_confidential_access: account.hrConfidentialAccess,
    supervisor_id: account.supervisorId,
    agent_profile_id: account.agentProfileId,
  };
};

export const ROLES: [string, string][] = [
  ["ceo", "Owner / CEO"],
  ["system_admin", "System administrator"],
  ["coo", "COO"],
  ["batch_manager", "Batch Manager"],
  ["hr_payroll", "HR & Payroll Officer"],
  ["finance_officer", "Finance Officer"],
  ["records_monitoring", "Records & Monitoring Officer"],
  ["kpi_officer", "KPI Officer"],
  ["operations_coordinator", "Operations Coordinator & Moderator"],
  ["csr", "CSR"],
  ["pioneer_agent", "Pioneer Agent"],
  ["agent", "Agent"],
  ["batch_handler", "Batch Handler"],
];

export function listEmployees(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params);

  {
    const role = qs.get("role");

    const status = qs.get("status");

    if (role) {
      qs.set("role", formToApiRole[role] ?? role.toUpperCase());
    }

    if (status) {
      qs.set("status", status.toUpperCase());
    }

    return tsRequest<Page<TsAccount>>(`/accounts?${qs}`).then((page) => {
      return toPage(page, toEmployee);
    });
  }
}

export function getEmployee(id: RecordId) {
  return tsRequest<TsAccount>(`/accounts/${id}`).then(toEmployee);
}

export function createEmployee(body: {
  email: string;
  full_name: string;
  role: string;
  password: string;
}) {
  return tsRequest<TsAccount>("/accounts", {
    method: "POST",
    body: JSON.stringify({
      name: body.full_name,
      email: body.email,
      role: formToApiRole[body.role],
      password: body.password,
    }),
  }).then(toEmployee);
}

export function updateEmployee(
  id: RecordId,
  body: {
    role?: string;
    status?: string;
    version?: number;
    hr_confidential_access?: boolean;
    hr_access_reason?: string;
    supervisor_id?: string | null;
    agent_profile_id?: string | null;
  },
) {
  if (!body.version) {
    return Promise.reject(
      new Error("Refresh this account before updating it."),
    );
  }

  return tsRequest<TsAccount>(`/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...(body.role ? { role: formToApiRole[body.role] } : {}),
      ...(body.status ? { active: body.status === "active" } : {}),
      ...(body.hr_confidential_access !== undefined
        ? {
            hrConfidentialAccess: body.hr_confidential_access,
            hrAccessReason: body.hr_access_reason,
          }
        : {}),
      ...(body.supervisor_id !== undefined
        ? { supervisorId: body.supervisor_id }
        : {}),
      ...(body.agent_profile_id !== undefined
        ? { agentProfileId: body.agent_profile_id }
        : {}),
      version: body.version,
    }),
  }).then(toEmployee);
}

export function getEmployeeHrAccessHistory(id: RecordId, page = 1) {
  return tsRequest<Page<import("@freshphones/contracts").HrAccessDecision>>(
    `/accounts/${id}/hr-access-history?page=${page}`,
  );
}

/** Download the payments report as a file (CSV or XLSX). */
export async function downloadPaymentsExport(
  params: Record<string, string> = {},
  fmt: "csv" | "xlsx" = "csv",
) {
  const normalized = new URLSearchParams(params);

  if (normalized.get("status")) {
    normalized.set("status", normalized.get("status")!.toUpperCase());
  }

  return downloadReportExport("payments", fmt, Object.fromEntries(normalized));
}

export function getTaskReport(params: Record<string, string> = {}) {
  return tsRequest<TaskReport>(`/reports/tasks?${new URLSearchParams(params)}`);
}

export function getSupportReport(params: Record<string, string> = {}) {
  return tsRequest<SupportReport>(
    `/reports/support?${new URLSearchParams(params)}`,
  );
}

export const getPaymentReport = (params: Record<string, string> = {}) => {
  return tsRequest<PaymentReport>(
    `/reports/payments?${new URLSearchParams(params)}`,
  );
};

export const getCollectionReport = (params: Record<string, string> = {}) => {
  return tsRequest<CollectionReport>(
    `/reports/collections?${new URLSearchParams(params)}`,
  );
};

export function getInstallmentEarnings(params: Record<string, string>) {
  return tsRequest<InstallmentEarningsReport>(
    `/reports/installment-earnings?${new URLSearchParams(params)}`,
  );
}

export function downloadInstallmentEarnings(
  params: Record<string, string>,
  format: "csv" | "xlsx",
) {
  const query = new URLSearchParams({ ...params, format });

  return downloadReportFile(
    `/reports/installment-earnings/export?${query}`,
    `installment-earnings-${params.groupBy}.${format}`,
  );
}

export const getReconciliationReport = (
  params: Record<string, string> = {},
) => {
  return tsRequest<ReconciliationReport>(
    `/reports/reconciliation?${new URLSearchParams(params)}`,
  );
};

export const getReconciliationExceptions = (
  params: Record<string, string> = {},
) => {
  return tsRequest<Page<ReconciliationException>>(
    `/reports/reconciliation/exceptions?${new URLSearchParams(params)}`,
  );
};

export const getReportBatches = (params: Record<string, string> = {}) => {
  return tsRequest<Page<ReportBatchOption>>(
    `/reports/batches?${new URLSearchParams(params)}`,
  );
};

export const getReportSnapshots = (kind: ReportSnapshot["kind"], page = 1) => {
  return tsRequest<Page<ReportSnapshot>>(
    `/reports/snapshots?${new URLSearchParams({ kind, page: String(page) })}`,
  );
};

export const createReportSnapshot = (input: ReportSnapshotInput) => {
  return tsRequest<ReportSnapshot>("/reports/snapshots", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

export const submitReportAnalysis = (snapshotId: string, body: string) => {
  return tsRequest<ReportAnalysis>(
    `/reports/snapshots/${snapshotId}/analysis`,
    { method: "POST", body: JSON.stringify({ body }) },
  );
};

export async function downloadReportExport(
  kind: ReportKind,
  format: "csv" | "xlsx",
  params: Record<string, string> = {},
) {
  const query = new URLSearchParams({ ...params, kind, format });

  return downloadReportFile(`/reports/export?${query}`, `${kind}.${format}`);
}

async function downloadReportFile(path: string, filename: string) {
  const blob = await tsDownload(path);

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = filename;

  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    link.remove();

    // Keep the object URL alive until the browser has started the download.
    setTimeout(() => {
      return URL.revokeObjectURL(url);
    }, 1000);
  }
}

export const downloadOperationsExport = (
  kind: "tasks" | "support",
  format: "csv" | "xlsx",
  params: Record<string, string> = {},
) => {
  return downloadReportExport(kind, format, params);
};

export * from "./gcash-history";
