import {
  roleLabels,
  rolePermissions,
  roles,
  type Batch,
  type Client,
  type ClientSchedule,
  type CatalogItem,
  type Payment,
  type Role,
  type User,
} from "@freshphones/contracts";
import type { Task } from "../app/system/tasks/task-view";

export const demoDate = "2026-10-22T02:00:00.000Z";

export function demoId(number: number) {
  return `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
}

export function demoUser(role: Role): User {
  return {
    id: demoId(100 + roles.indexOf(role === "OWNER" ? "CEO" : role)),
    name: role === "CUSTOMER" ? "Alex Sample" : `Demo ${roleLabels[role]}`,
    email: `${role.toLowerCase()}@example.com`,
    image: null,
    role,
    permissions: [...rolePermissions[role]],
    clientId: role === "CUSTOMER" ? demoId(10) : null,
    hrConfidentialAccess: role === "SYSTEM_ADMIN",
  };
}

export const demoAccounts = roles.map((role) => {
  return {
    ...demoUser(role),
    active: true,
    version: 1,
    createdAt: demoDate,
  };
});

export const demoBatches: Batch[] = [
  {
    id: demoId(1),
    code: "DEMO-IP15-01",
    model: "iPhone 15 128GB",
    status: "ACTIVE",
    startDate: "2026-10-01",
    endDate: "2027-01-21",
    contractPrice: "32000.00",
    installmentCount: 16,
    cadence: "WEEKLY",
    handler: { ...demoUser("CORE_HANDLER"), active: true },
    agent: { id: demoId(70), name: "Jamie Sample", active: true },
    termsLocked: true,
    version: 1,
    createdAt: demoDate,
    updatedAt: demoDate,
    _count: { clients: 2 },
  },
  {
    id: demoId(2),
    code: "DEMO-IPAD-02",
    model: "iPad 10th Generation 64GB",
    status: "PLANNED",
    startDate: "2026-11-01",
    endDate: "2027-02-21",
    contractPrice: "24000.00",
    installmentCount: 12,
    cadence: "WEEKLY",
    handler: null,
    agent: null,
    termsLocked: false,
    version: 1,
    createdAt: demoDate,
    updatedAt: demoDate,
    _count: { clients: 1 },
  },
];

export const demoClients: Client[] = [
  "Alex Sample",
  "Casey Example",
  "Riley Demo",
].map((name, index) => {
  const batch = demoBatches[index === 2 ? 1 : 0];

  return {
    id: demoId(10 + index),
    name,
    email: `customer${index + 1}@example.com`,
    phone: "",
    batchId: batch.id,
    batch,
    unitModel: batch.model,
    status: "ACTIVE",
    releaseStatus: "NOT_READY",
    joinedAt: batch.startDate,
    scheduleIssued: true,
    account: { id: demoId(110 + index) },
    version: 1,
    createdAt: demoDate,
    updatedAt: demoDate,
  };
});

export const demoPayments: Payment[] = demoClients.flatMap((client, index) => {
  return [0, 1, 2].map((installment) => {
    const verified = installment < 2;

    return {
      id: demoId(200 + index * 10 + installment),
      clientId: client.id,
      batchId: client.batchId,
      scheduleItemId: demoId(300 + index * 20 + installment),
      client: { ...client, batch: client.batch },
      amount: "2000.00",
      effectiveAmount: "2000.00",
      adjustmentRevision: 0,
      adjustments: [],
      paymentDate: `2026-10-${String(1 + installment * 7).padStart(2, "0")}`,
      method: "GCASH",
      referenceNumber: `DEMO-${index + 1}-${installment + 1}`,
      receiptTime: null,
      receiptName: null,
      receiptPhone: null,
      notes: "Fictional presentation payment. No money was collected.",
      verificationNotes: verified ? "Sample Finance review" : null,
      status: verified ? "VERIFIED" : "PENDING",
      duplicateReference: false,
      version: 1,
      recordedBy: demoUser("RECORDS"),
      verifier: verified ? demoUser("FINANCE_OFFICER") : null,
      proofFile: null,
      createdAt: demoDate,
      updatedAt: demoDate,
      verifiedAt: verified ? demoDate : null,
    };
  });
});

export function demoBalance(client: Client) {
  const payments = demoPayments.filter((payment) => {
    return payment.clientId === client.id;
  });

  const sum = (status: string) => {
    return payments
      .filter((payment) => {
        return payment.status === status;
      })
      .reduce((total, payment) => {
        return total + Number(payment.amount);
      }, 0);
  };

  const total = Number(
    demoBatches.find((batch) => {
      return batch.id === client.batchId;
    })?.contractPrice ?? 0,
  );

  return {
    clientId: client.id,
    totalDue: total.toFixed(2),
    verifiedPaid: sum("VERIFIED").toFixed(2),
    remainingBalance: (total - sum("VERIFIED")).toFixed(2),
    pendingAmount: sum("PENDING").toFixed(2),
    overpaid: "0.00",
  };
}

export function demoSchedule(client: Client): ClientSchedule {
  const index = demoClients.findIndex((item) => {
    return item.id === client.id;
  });

  const batch = demoBatches.find((item) => {
    return item.id === client.batchId;
  })!;

  return {
    clientId: client.id,
    totalDue: batch.contractPrice!,
    items: Array.from({ length: batch.installmentCount! }, (_, installment) => {
      const date = new Date(`${batch.startDate}T00:00:00Z`);

      date.setUTCDate(date.getUTCDate() + installment * 7);

      return {
        id: demoId(300 + index * 20 + installment),
        sequenceNo: installment + 1,
        dueDate: date.toISOString().slice(0, 10),
        expectedAmount: "2000.00",
        paidApplied: installment < 2 ? "2000.00" : "0.00",
        status: installment < 2 ? "PAID" : "UPCOMING",
      };
    }),
  };
}

export const demoTasks: Task[] = [
  "Review this week's payment records",
  "Confirm customer release requirements",
  "Prepare the collection summary",
].map((title, index) => {
  return {
    id: demoId(400 + index),
    title,
    instructions:
      "Presentation task. Review the sample records and coordinate with the responsible team.",
    assigneeId: demoUser("RECORDS").id,
    assigneeName: demoUser("RECORDS").name,
    creatorName: demoUser("SYSTEM_ADMIN").name,
    priority: index === 0 ? "HIGH" : "MEDIUM",
    deadline: "2026-10-30T09:00:00.000Z",
    status: index === 0 ? "IN_PROGRESS" : "TODO",
    report: "",
    submittedAt: null,
    lateFlag: null,
    attachment: null,
    reviewed: false,
    review: null,
    version: 1,
  };
});

export const demoSupport = [
  {
    id: demoId(500),
    client: demoClients[0].id,
    client_name: demoClients[0].name,
    category: "Payment inquiry",
    source: "customer_portal",
    description:
      "Could you explain the next installment on my sample schedule?",
    assigned_staff: demoUser("CS_TEAM").id,
    assigned_staff_name: demoUser("CS_TEAM").name,
    status: "in_progress",
    resolution: "",
    date_received: demoDate,
    closed_date: null,
    turnaround_hours: null,
    version: 1,
    last_message: { by_customer: true, created_at: demoDate },
    messages: [
      {
        id: demoId(501),
        body: "Happy to help. Your next sample installment is ₱2,000.",
        author_type: "staff",
        created_at: demoDate,
      },
    ],
  },
];

export const demoJobs = [
  {
    id: demoId(600),
    title: "Customer Service Associate",
    description:
      "Help customers with installment schedules, records and support inquiries. Fictional opening for the presentation.",
    location: "Philippines",
    employmentType: "Full-time",
    isOpen: true,
    version: 1,
    _count: { applicants: 1 },
  },
];

export const demoApplicants = [
  {
    id: demoId(610),
    jobId: demoJobs[0].id,
    job: demoJobs[0],
    fullName: "Taylor Example",
    email: "applicant@example.com",
    phone: "",
    message: "Fictional application for the presentation.",
    status: "NEW",
    reviewerNotes: "",
    createdAt: demoDate,
    version: 1,
    attachments: [],
  },
];

export const demoDocuments = [
  {
    key: "PHOTO_ID",
    label: "Proof of identity",
    description:
      "Sample requirement. File uploads are disabled in this presentation.",
    status: "MISSING",
    latest: null,
    history: [],
  },
];

export const demoCatalog: CatalogItem[] = [
  {
    id: demoId(900),
    code: "DEMO-IPHONE-13",
    name: "iPhone 13 128GB",
    condition: "PRE_OWNED",
    dailyAmount: "99.00",
    availability: "AVAILABLE",
    description:
      "Fictional listing for the presentation. Contact the business for actual pricing and availability.",
    published: true,
    sortOrder: 1,
    imageAsset: "iphone-13",
    installmentPlan: null,
    version: 1,
    hasImage: false,
    updatedAt: demoDate,
  },
];
