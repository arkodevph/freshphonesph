import * as contracts from "@freshphones/contracts";
import { z } from "zod";
import { assistantPermissions } from "./access";
import type { Permission, User } from "@freshphones/contracts";

export type Operation = {
  name: string;
  method: "GET" | "POST" | "PATCH";
  path: string;
  permissions: Permission[];
  description: string;
  schema: z.ZodTypeAny;
  readOnly: boolean;
};

const empty = z.object({}).strict();

const id = z.string().uuid();

const page = z
  .object({ page: z.coerce.number().int().min(1).max(10000).default(1) })
  .strict();

const target = (schema: z.ZodTypeAny) => {
  return z.object({ id, body: schema }).strict();
};

const query = (schema: z.ZodTypeAny) => {
  return z.object({ query: schema.default({}) }).strict();
};

const record = (schema: z.ZodTypeAny) => {
  return z.object({ body: schema }).strict();
};

const detail = z.object({ id }).strict();

function operation(
  name: string,
  method: Operation["method"],
  path: string,
  permissions: Permission[],
  description: string,
  schema: z.ZodTypeAny,
  readOnly = method === "GET",
): Operation {
  return { name, method, path, permissions, description, schema, readOnly };
}

/** Explicit API allowlist. No model-provided URL, headers, SQL or permissions. */
export const assistantOperations: Operation[] = [
  operation(
    "reports.payments",
    "GET",
    "/reports/payments",
    ["REPORT_VIEW"],
    "Payment counts and amounts by payment date; only verified amounts are collected funds. Optional dateFrom/dateTo, batch and status.",
    query(contracts.reportQuerySchema),
  ),
  operation(
    "reports.collections",
    "GET",
    "/reports/collections",
    ["REPORT_VIEW"],
    "Membership balances, verified credit and batch totals. Filter with query.batchId (UUID), not batch. Balances are current lifetime amounts, not period revenue; for membership counts prefer records.clients total.",
    query(contracts.collectionReportQuerySchema),
  ),
  operation(
    "reports.reconciliation",
    "GET",
    "/reports/reconciliation",
    ["REPORT_VIEW"],
    "Review flags and verification audit evidence, not external bank-statement matching.",
    query(contracts.reconciliationReportQuerySchema),
  ),
  operation(
    "reports.tasks",
    "GET",
    "/reports/tasks",
    ["REPORT_VIEW"],
    "Task outcomes filtered by creation dates; never automatic wage actions.",
    query(contracts.operationsReportQuerySchema),
  ),
  operation(
    "reports.support",
    "GET",
    "/reports/support",
    ["REPORT_VIEW"],
    "Support counts for cases created in the date range.",
    query(contracts.operationsReportQuerySchema),
  ),
  operation(
    "reports.installment_earnings",
    "GET",
    "/reports/installment-earnings",
    ["REPORT_VIEW"],
    "Scheduled installments, not verified collections or profit. For this month use Manila current year, frequency MONTHLY, period=current month. groupBy batches or members; paginated rows and overall totals.",
    query(contracts.installmentEarningsQuerySchema),
  ),
  operation(
    "reports.batches",
    "GET",
    "/reports/batches",
    ["REPORT_VIEW"],
    "Resolve batch IDs and labels for reporting filters. Pass the returned UUID as batchId to reports.collections or records.clients.",
    query(contracts.reportBatchQuerySchema),
  ),
  operation(
    "records.batches",
    "GET",
    "/batches",
    ["BATCH_READ"],
    "Search batches by q, status and page. Returns IDs and current versions.",
    query(contracts.batchListQuerySchema),
  ),
  operation(
    "records.batch",
    "GET",
    "/batches/:id",
    ["BATCH_READ"],
    "Read exact batch and current version before editing.",
    detail,
  ),
  operation(
    "records.assignment_options",
    "GET",
    "/records/assignment-options",
    ["BATCH_READ"],
    "Look up eligible agent IDs and staff assignments. Do not invent IDs.",
    empty,
  ),
  operation(
    "records.create_batch",
    "POST",
    "/batches",
    ["BATCH_CREATE"],
    "Create a batch. Ask for required model, status, start/end dates and agent; server generates code. Optional installment terms must be complete.",
    record(contracts.batchCreateSchema),
  ),
  operation(
    "records.update_batch",
    "PATCH",
    "/batches/:id",
    ["BATCH_MANAGE"],
    "Edit a batch using its exact current version and full record; preserve fields not requested. Archive via supported status, never delete financial history.",
    target(contracts.batchUpdateSchema),
  ),
  operation(
    "records.clients",
    "GET",
    "/clients",
    ["CLIENT_READ"],
    "List scoped client memberships. Filter with query.batchId (UUID), q, status and page. The response total is the full matching membership count, not items.length. Memberships are not necessarily unique people or login accounts.",
    query(contracts.clientListQuerySchema),
  ),
  operation(
    "records.batch_memberships",
    "GET",
    "/clients",
    ["CLIENT_READ"],
    "Get the exact current membership count for ONE resolved batch UUID, across ALL statuses. Only query.batchId is required; no status or dates. Returns total, not people/accounts or page length. Resolve the UUID with records.batches or reports.batches first.",
    z.object({ query: z.object({ batchId: id }).strict() }).strict(),
  ),
  operation(
    "records.client",
    "GET",
    "/clients/:id",
    ["CLIENT_READ"],
    "Read a client membership, balance and version. Personal contact data is private.",
    detail,
  ),
  operation(
    "records.schedule",
    "GET",
    "/clients/:id/schedule",
    ["CLIENT_READ"],
    "Read the chosen membership's issued installment schedule.",
    detail,
  ),
  operation(
    "records.create_client",
    "POST",
    "/clients",
    ["CLIENT_MANAGE", "ENROLLMENT_REVIEW"],
    "Create a client membership in an existing batch. Required personal details must come from the user.",
    record(contracts.clientSchema),
  ),
  operation(
    "records.update_client",
    "PATCH",
    "/clients/:id",
    ["CLIENT_MANAGE"],
    "Edit membership details with current version/full record; balances cannot be directly edited.",
    target(contracts.clientUpdateSchema),
  ),
  operation(
    "agents.list",
    "GET",
    "/agents",
    ["AGENT_MANAGE"],
    "Search private agent directory and IDs.",
    query(contracts.agentListQuerySchema),
  ),
  operation(
    "agents.detail",
    "GET",
    "/agents/:id",
    ["AGENT_MANAGE"],
    "Read agent details and version before edits.",
    detail,
  ),
  operation(
    "agents.create",
    "POST",
    "/agents",
    ["AGENT_MANAGE"],
    "Add an agent profile, not a login or access grant.",
    record(contracts.agentSchema),
  ),
  operation(
    "agents.update",
    "PATCH",
    "/agents/:id",
    ["AGENT_MANAGE"],
    "Edit or deactivate an agent using full record/current version.",
    target(contracts.agentUpdateSchema),
  ),
  operation(
    "catalog.list",
    "GET",
    "/catalog/items",
    ["CATALOG_MANAGE"],
    "Fetch catalog listings and their current availability, published visibility and installment terms. Optional query.q, visibility (PUBLISHED or HIDDEN), availability and page. Follow pagination for all listings; availability is a listing status, not a numeric stock count.",
    query(contracts.catalogQuerySchema),
  ),
  operation(
    "catalog.detail",
    "GET",
    "/catalog/items/:id",
    ["CATALOG_MANAGE"],
    "Read a catalog item's current terms and version.",
    detail,
  ),
  operation(
    "catalog.create",
    "POST",
    "/catalog/items",
    ["CATALOG_MANAGE"],
    "Create a catalog item with explicitly provided terms; no invented prices.",
    record(contracts.catalogItemSchema),
  ),
  operation(
    "catalog.update",
    "PATCH",
    "/catalog/items/:id",
    ["CATALOG_MANAGE"],
    "Edit prices, terms or publication with full record/current version. Unpublish rather than erase historical agreements.",
    target(contracts.catalogUpdateSchema),
  ),
  operation(
    "catalog.remove_image",
    "POST",
    "/catalog/items/:id/image/remove",
    ["CATALOG_MANAGE"],
    "Delete a catalog photo with current item version; does not delete the listing.",
    target(contracts.catalogImageSchema),
  ),
  operation(
    "tasks.list",
    "GET",
    "/work/tasks",
    ["TASK_READ"],
    "Search task records in the user's staff scope.",
    query(contracts.listQuerySchema),
  ),
  operation(
    "tasks.staff",
    "GET",
    "/work/staff",
    ["TASK_READ"],
    "Find eligible staff IDs for task assignment.",
    empty,
  ),
  operation(
    "tasks.create",
    "POST",
    "/work/tasks",
    ["TASK_ASSIGN"],
    "Create an assigned task with user-provided title, instructions, deadline and priority.",
    record(contracts.taskSchema),
  ),
  operation(
    "support.queue",
    "GET",
    "/operations/customer-work",
    ["SUPPORT_MANAGE"],
    "Read paginated customer support queue.",
    query(
      z
        .object({
          kind: z.literal("support").default("support"),
          page: z.coerce.number().int().min(1).default(1),
        })
        .strict(),
    ),
  ),
  operation(
    "support.detail",
    "GET",
    "/support/cases/:id",
    ["SUPPORT_MANAGE"],
    "Read the selected support case, messages and current version.",
    detail,
  ),
  operation(
    "support.update",
    "PATCH",
    "/support/cases/:id",
    ["SUPPORT_MANAGE"],
    "Edit case status, assignment or resolution with its current version.",
    target(contracts.supportUpdateSchema),
  ),
  operation(
    "support.create",
    "POST",
    "/support/cases",
    ["SUPPORT_CREATE", "SUPPORT_MANAGE"],
    "Record a customer support concern and its actual source.",
    record(contracts.supportCreateSchema),
  ),
  operation(
    "jobs.list",
    "GET",
    "/recruitment/jobs",
    ["RECRUITMENT_MANAGE"],
    "Search job openings. Does not expose confidential applicants.",
    query(contracts.jobOpeningListQuerySchema),
  ),
  operation(
    "jobs.detail",
    "GET",
    "/recruitment/jobs/:id",
    ["RECRUITMENT_MANAGE"],
    "Read a job opening and current version.",
    detail,
  ),
  operation(
    "jobs.create",
    "POST",
    "/recruitment/jobs",
    ["RECRUITMENT_MANAGE"],
    "Create a job opening from supplied details.",
    record(contracts.jobOpeningSchema),
  ),
  operation(
    "jobs.update",
    "PATCH",
    "/recruitment/jobs/:id",
    ["RECRUITMENT_MANAGE"],
    "Edit or close a job opening with current version/full record.",
    target(contracts.jobOpeningUpdateSchema),
  ),
  operation(
    "retention.candidates",
    "GET",
    "/retention/candidates",
    ["RETENTION_MANAGE"],
    "List deletion candidates under existing retention policy and holds.",
    query(contracts.retentionQuerySchema),
  ),
  operation(
    "retention.preview",
    "POST",
    "/retention/preview",
    ["RETENTION_MANAGE"],
    "Read-only preview of the exact records affected by erasure. Must precede a deletion request.",
    record(contracts.retentionTargetSchema),
    true,
  ),
  operation(
    "retention.policies",
    "GET",
    "/retention/policies",
    ["RETENTION_MANAGE"],
    "Read active retention periods, basis, approval and backup/external-copy obligations.",
    empty,
  ),
  operation(
    "retention.holds",
    "GET",
    "/retention/holds",
    ["RETENTION_MANAGE"],
    "Read legal holds that can block a deletion.",
    query(page),
  ),
  operation(
    "retention.requests",
    "GET",
    "/retention/requests",
    ["RETENTION_MANAGE"],
    "Read existing deletion requests and their approved state.",
    query(page),
  ),
  operation(
    "retention.request",
    "POST",
    "/retention/requests",
    ["RETENTION_MANAGE"],
    "Create a retention deletion request from its exact preview. Does not approve or erase records.",
    record(contracts.retentionRequestSchema),
  ),
];

export function operationsFor(
  user: Pick<User, "role" | "hrConfidentialAccess">,
) {
  const permissions = ["CEO", "OWNER"].includes(user.role)
    ? assistantPermissions
    : contracts.effectivePermissions(user);

  return assistantOperations.filter((operation) => {
    return operation.permissions.every((permission) => {
      return permissions.includes(permission);
    });
  });
}

/** Human/model documentation only; execution always validates the original Zod schema. */
export function describeSchema(schema: z.ZodTypeAny): unknown {
  const def = schema._def;

  switch (def.typeName) {
    case "ZodEffects":
      return describeSchema(def.schema);
    case "ZodOptional":
      return { optional: true, schema: describeSchema(def.innerType) };
    case "ZodDefault":
      return {
        optional: true,
        default: def.defaultValue(),
        schema: describeSchema(def.innerType),
      };
    case "ZodNullable":
      return { nullable: true, schema: describeSchema(def.innerType) };
    case "ZodObject":
      return {
        type: "object",
        fields: Object.fromEntries(
          Object.entries(def.shape()).map(([key, value]) => {
            return [key, describeSchema(value as z.ZodTypeAny)];
          }),
        ),
        unknownKeys: def.unknownKeys,
      };
    case "ZodEnum":
      return { type: "enum", values: def.values };
    case "ZodLiteral":
      return { const: def.value };
    case "ZodArray":
      return {
        type: "array",
        items: describeSchema(def.type),
        min: def.minLength?.value,
        max: def.maxLength?.value,
      };
    case "ZodUnion":
      return { alternatives: def.options.map(describeSchema) };
    case "ZodRecord":
      return { type: "object", values: describeSchema(def.valueType) };
    default:
      return {
        type: def.typeName.replace("Zod", "").toLowerCase(),
        checks: def.checks?.map((check: Record<string, unknown>) => {
          return {
            ...check,
            ...(check.regex instanceof RegExp
              ? { regex: check.regex.source }
              : {}),
          };
        }),
      };
  }
}
