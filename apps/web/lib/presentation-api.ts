import { roleSchema, roles } from "@freshphones/contracts";
import {
  demoAccounts,
  demoApplicants,
  demoBalance,
  demoBatches,
  demoClients,
  demoCatalog,
  demoDate,
  demoDocuments,
  demoId,
  demoJobs,
  demoPayments,
  demoSchedule,
  demoSupport,
  demoTasks,
  demoUser,
} from "./presentation-data";
import { PRESENTATION_MESSAGE } from "./presentation";

const cookieName = "freshphones-presentation-role";

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function page<T>(items: T[], query: URLSearchParams) {
  const number = Math.max(1, Number(query.get("page")) || 1);

  const q = (query.get("q") ?? "").toLowerCase();

  const filtered = items.filter((item) => {
    return !q || JSON.stringify(item).toLowerCase().includes(q);
  });

  const results = filtered.slice((number - 1) * 20, number * 20);

  return {
    items: results,
    total: filtered.length,
    page: number,
    pageSize: 20,
    results,
    count: filtered.length,
    next: number * 20 < filtered.length ? String(number + 1) : null,
  };
}

function selected<T extends { id: string }>(items: T[], id: string) {
  const item = items.find((candidate) => {
    return candidate.id === id;
  });

  return item ? json(item) : json({ message: "Sample record not found." }, 404);
}

export async function presentationResponse(
  request: Request,
): Promise<Response> {
  if (process.env.NEXT_PUBLIC_PRESENTATION_MODE !== "true") {
    return json({ message: "Not found." }, 404);
  }

  const url = new URL(request.url);

  const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");

  const query = url.searchParams;

  const roleValue = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => {
      return part.trim();
    })
    .find((part) => {
      return part.startsWith(`${cookieName}=`);
    })
    ?.slice(cookieName.length + 1);

  const role = roleSchema.safeParse(roleValue);

  if (path === "presentation-login" && request.method === "POST") {
    const origin = request.headers.get("origin");

    const host = request.headers.get("host") ?? url.host;

    if (origin && origin !== `${url.protocol}//${host}`) {
      return json({ message: "Request origin is not allowed." }, 403);
    }

    const body = await request.json().catch(() => {
      return null;
    });

    const chosen = roleSchema.safeParse(body?.role);

    if (!chosen.success) {
      return json({ message: "Choose one of the demo roles." }, 400);
    }

    return json({ presentation: true }, 200, {
      "Set-Cookie": `${cookieName}=${chosen.data}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${url.protocol === "https:" ? "; Secure" : ""}`,
    });
  }

  if (path === "auth/logout" && request.method === "POST") {
    return json({ ok: true }, 200, {
      "Set-Cookie": `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    });
  }

  if (path === "auth/refresh") {
    return json(
      { message: "Choose a presentation role to open this workspace." },
      401,
    );
  }

  if (request.method !== "GET") {
    return json({ message: PRESENTATION_MESSAGE }, 409);
  }

  if (path === "catalog") {
    return json(page(demoCatalog, query));
  }

  if (path === "careers") {
    return json(demoJobs);
  }

  if (
    path === "verify" ||
    path === "verify-agent" ||
    path === "agents/verify"
  ) {
    return json({ found: false });
  }

  if (!role.success) {
    return json(
      { message: "Choose a presentation role to open this workspace." },
      401,
    );
  }

  const user = demoUser(role.data);

  const clients =
    user.role === "CUSTOMER"
      ? demoClients.filter((client) => {
          return client.id === user.clientId;
        })
      : demoClients;

  const payments = demoPayments.filter((payment) => {
    return (
      clients.some((client) => {
        return client.id === payment.clientId;
      }) &&
      (!query.get("status") ||
        payment.status === query.get("status")?.toUpperCase()) &&
      (!query.get("clientId") || payment.clientId === query.get("clientId")) &&
      (!query.get("batchId") || payment.batchId === query.get("batchId"))
    );
  });

  const verified = payments.filter((payment) => {
    return payment.status === "VERIFIED";
  });

  const pending = payments.filter((payment) => {
    return payment.status === "PENDING";
  });

  const verifiedAmount = verified
    .reduce((total, payment) => {
      return total + Number(payment.amount);
    }, 0)
    .toFixed(2);

  const pendingAmount = pending
    .reduce((total, payment) => {
      return total + Number(payment.amount);
    }, 0)
    .toFixed(2);

  switch (path) {
    case "auth/me":
      return json(user);
    case "auth/security":
      return json({
        enabled: false,
        required: false,
        sessions: [],
        recoveryCodesRemaining: 0,
      });
    case "legal/status":
      return json({ pending: [], history: [] });
    case "overview":
      return json({
        activeBatches: 1,
        clients: clients.length,
        readyForRelease: 0,
        employees: roles.length - 1,
      });
    case "reports/dashboard":
      return json({
        activeBatches: 1,
        verifiedPayments: verified.length,
        pendingVerification: pending.length,
        verifiedAmount,
      });
    case "batches":
      return json(
        page(
          demoBatches.filter((batch) => {
            return (
              !query.get("status") ||
              batch.status === query.get("status")?.toUpperCase()
            );
          }),
          query,
        ),
      );
    case "clients":
      return json(
        page(
          clients.filter((client) => {
            return (
              !query.get("batchId") || client.batchId === query.get("batchId")
            );
          }),
          query,
        ),
      );
    case "payments":
      return json(page(payments, query));
    case "payments/duplicates":
      return json([]);
    case "accounts":
      return json(
        page(
          demoAccounts.filter((account) => {
            return !query.get("role") || account.role === query.get("role");
          }),
          query,
        ),
      );
    case "agents":
      return json(
        page(
          [
            {
              id: demoId(70),
              name: "Jamie Sample",
              code: "DEMO-AGENT-01",
              active: true,
              version: 1,
              createdAt: demoDate,
              updatedAt: demoDate,
            },
          ],
          query,
        ),
      );
    case "records/assignment-options":
      return json({
        handlers: [
          demoAccounts.find((account) => {
            return account.role === "CORE_HANDLER";
          }),
        ],
        agents: [{ id: demoId(70), name: "Jamie Sample", active: true }],
      });
    case "work/staff":
    case "tasks/assignees":
      return json(
        demoAccounts.filter((account) => {
          return account.role !== "CUSTOMER";
        }),
      );
    case "tasks":
      return json(
        page(
          demoTasks.filter((task) => {
            return !query.get("status") || task.status === query.get("status");
          }),
          query,
        ),
      );
    case "work/tasks":
      return json(
        page(
          demoTasks.map((task) => {
            return {
              ...task,
              assignee: {
                id: task.assigneeId,
                name: task.assigneeName,
                role: "RECORDS",
              },
              creator: demoUser("OWNER"),
              createdAt: demoDate,
              attachments: [],
            };
          }),
          query,
        ),
      );
    case "kpi/queue":
    case "kpi/reviews":
    case "hr-actions":
    case "work/kpi/queue":
    case "inquiries":
      return json(page([], query));
    case "support/cases":
      return json(page(demoSupport, query));
    case "support/client-options":
      return json(
        clients.map((client) => {
          return {
            id: client.id,
            name: client.name,
            batch_code: client.batch.code,
          };
        }),
      );
    case "portal/support":
      return json(demoSupport);
    case "portal/documents":
      return json(demoDocuments);
    case "portal/notifications":
      return json([
        {
          id: demoId(800),
          kind: "payment",
          title: "Sample payment verified",
          message: "Your sample ₱2,000 installment has been verified.",
          targetPath: "/portal/payments",
          readAt: null,
          createdAt: demoDate,
        },
      ]);
    case "portal/payments/review":
      return json(
        pending.map((payment) => {
          return {
            id: payment.id,
            amount: payment.amount,
            payment_date: payment.paymentDate,
            method: payment.method,
            reference_no: payment.referenceNumber,
            recorded_at: payment.createdAt,
          };
        }),
      );
    case "notifications":
      return json({ ...page([], query), unread: 0 });
    case "staff/alerts":
      return json({
        ...page([], query),
        activeCount: 0,
        unreadCount: 0,
        filteredCount: 0,
        filteredUnreadCount: 0,
        taskCount: 0,
        financeCount: 0,
        resultCount: 0,
        supportCount: 0,
        accountCount: 0,
      });
    case "staff/finance-alerts":
      return json({
        ...page([], query),
        unreadCount: 0,
        pendingCount: pending.length,
      });
    case "requirement-types":
      return json([]);
    case "recruitment/jobs":
      return json(page(demoJobs, query));
    case "recruitment/applicants":
      return json(page(demoApplicants, query));
    case "recruitment/summary":
      return json({ jobs: 1, openJobs: 1, applicants: 1, awaitingReview: 1 });
    case "recruitment/agents":
      return json(
        page(
          [
            {
              id: demoId(70),
              fullName: "Jamie Sample",
              agentCode: "DEMO-AGENT-01",
              phone: "",
              active: true,
              version: 1,
            },
          ],
          query,
        ),
      );
    case "catalog/items":
      return json(page(demoCatalog, query));
    case "retention/requests":
    case "retention/holds":
    case "retention/candidates":
    case "staff-notification-settings/deliveries":
    case "reports/snapshots":
    case "reports/reconciliation/exceptions":
      return json(page([], query));
    case "retention/policies":
      return json({ items: [] });
    case "retention/deletion-ledger":
      return json({ items: [] });
    case "reports/batches":
      return json(page(demoBatches, query));
    case "reports/payments":
      return json({
        total: payments.length,
        verifiedPayments: verified.length,
        verifiedAmount,
        pendingVerification: pending.length,
        pendingAmount,
        needsClarification: 0,
        rejectedPayments: 0,
        originalVerifiedAmount: verifiedAmount,
        adjustmentAmount: "0.00",
      });
    case "reports/tasks":
      return json({
        total: demoTasks.length,
        byStatus: { TODO: 2, IN_PROGRESS: 1, SUBMITTED: 0, DONE: 0 },
        submitted: 0,
        late: 0,
        reviewed: 0,
        disclaimer:
          "Fictional presentation data. Human review is required for KPI decisions.",
      });
    case "reports/support":
      return json({
        total: 1,
        open: 1,
        closed: 0,
        categories: [
          {
            category: "Payment inquiry",
            total: 1,
            closed: 0,
            averageTurnaroundHours: null,
          },
        ],
        sources: [{ source: "CUSTOMER_PORTAL", total: 1 }],
      });
    case "reports/collections": {
      const totals = {
        clients: demoClients.length,
        scheduledClients: demoClients.length,
        clientsWithoutSchedule: 0,
        agreedAmount: "88000.00",
        verifiedAmount,
        pendingAmount,
        remainingBalance: (88000 - Number(verifiedAmount)).toFixed(2),
        overpaidAmount: "0.00",
        collectedInPeriod: verifiedAmount,
        verifiedPaymentsInPeriod: verified.length,
        pendingInPeriod: pendingAmount,
        pendingPaymentsInPeriod: pending.length,
      };

      return json({ ...page([], query), totals });
    }
    case "reports/reconciliation": {
      const totals = {
        payments: payments.length,
        verifiedPayments: verified.length,
        pendingPayments: pending.length,
        clarificationPayments: 0,
        rejectedPayments: 0,
        auditedVerifiedPayments: verified.length,
        unmatchedVerifiedPayments: 0,
        paymentsWithFlags: 0,
        duplicateReferencePayments: 0,
        scheduleMismatchPayments: 0,
        batchMismatchPayments: 0,
        verifiedWithoutSchedulePayments: 0,
        recordedAmount: (
          Number(verifiedAmount) + Number(pendingAmount)
        ).toFixed(2),
        verifiedAmount,
        pendingAmount,
        clarificationAmount: "0.00",
        rejectedAmount: "0.00",
        auditedVerifiedAmount: verifiedAmount,
        unmatchedVerifiedAmount: "0.00",
      };

      return json({ ...page([], query), totals });
    }
    case "customer-notification-settings":
      return json({
        reminderDays: "",
        reminderVersion: 1,
        testEmailConfigured: false,
        usingResendTestSender: false,
        templates: [],
      });
    case "staff-notification-settings":
      return json({
        templates: [],
        timingVersion: 1,
        dueSoonHours: 24,
        overdueHours: 24,
        deliveryMode: "local",
      });
    case "operations/customer-work": {
      const kind = query.get("kind") ?? "support";

      const items =
        kind === "support"
          ? [
              {
                id: demoSupport[0].id,
                clientName: demoClients[0].name,
                label: "Payment inquiry",
                status: "IN_PROGRESS",
                waitingSince: demoDate,
                href: "/system/support",
                customerReplied: true,
              },
            ]
          : [];

      return json({ kind, ...page(items, query) });
    }
  }

  const [resource, id, detail] = path.split("/");

  if (resource === "clients") {
    const client = clients.find((item) => {
      return item.id === id;
    });

    if (!client) {
      return json({ message: "Sample client not found." }, 404);
    }

    if (detail === "balance") {
      return json(demoBalance(client));
    }

    if (detail === "schedule") {
      return json(demoSchedule(client));
    }

    if (detail === "documents") {
      return json(demoDocuments);
    }

    if (detail === "requirements" || detail === "release-updates") {
      return json([]);
    }

    if (detail === "history") {
      return json(page([], query));
    }

    if (detail === "statement") {
      return json({
        title: "Sample Statement of Account",
        notice: "Presentation only. Not an official BIR invoice.",
        generatedAt: demoDate,
        balance: demoBalance(client),
        verifiedPayments: demoPayments.filter((payment) => {
          return (
            payment.clientId === client.id && payment.status === "VERIFIED"
          );
        }),
      });
    }

    if (!detail) {
      return json(client);
    }
  }

  if (resource === "batches") {
    return detail === "history"
      ? json(page([], query))
      : selected(demoBatches, id);
  }

  if (resource === "tasks") {
    return selected(demoTasks, id);
  }

  if (resource === "payments" && detail === "confirmation") {
    const payment = payments.find((item) => {
      return item.id === id && item.status === "VERIFIED";
    });

    return payment
      ? json({
          title: "Sample Payment Confirmation",
          notice: "Presentation only. Not an official BIR invoice.",
          generatedAt: demoDate,
          payment,
        })
      : json({ message: "Sample payment not found." }, 404);
  }

  if (resource === "catalog" && id === "items") {
    return selected(demoCatalog, detail);
  }

  if (resource === "agents") {
    return selected(
      [
        {
          id: demoId(70),
          name: "Jamie Sample",
          code: "DEMO-AGENT-01",
          active: true,
          version: 1,
          createdAt: demoDate,
          updatedAt: demoDate,
        },
      ],
      id,
    );
  }

  if (resource === "accounts") {
    return detail === "hr-access-history"
      ? json(page([], query))
      : selected(demoAccounts, id);
  }

  if (resource === "support" && id === "cases") {
    return selected(demoSupport, detail);
  }

  if (resource === "portal" && id === "support") {
    return selected(demoSupport, detail);
  }

  if (resource === "recruitment" && id === "jobs") {
    return selected(demoJobs, detail);
  }

  if (resource === "recruitment" && id === "applicants") {
    return selected(demoApplicants, detail);
  }

  return json(
    {
      message:
        "This feature is not available in the presentation. No live service is connected.",
    },
    404,
  );
}
