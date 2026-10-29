import type { LoadedReport } from "../app/system/reports/report-view";

export type ChartTone =
  "verified" | "pending" | "accent" | "negative" | "blue" | "muted";

export type BarDatum = {
  label: string;
  value: string | number;
  tone?: ChartTone;
};

export type BarChartModel = {
  title: string;
  note: string;
  unit: "money" | "count";
  rows: BarDatum[];
};

export function barScale(rows: BarDatum[]) {
  const values = rows.map((row) => {
    return Number(row.value);
  });

  const min = Math.min(0, ...values);

  const max = Math.max(0, ...values);

  const span = max - min || 1;

  return {
    zero: min === 0 ? 0 : (-min / span) * 100,
    empty: values.every((value) => {
      return value === 0;
    }),
    rows: values.map((value) => {
      return {
        start: ((Math.min(0, value) - min) / span) * 100,
        width: (Math.abs(value) / span) * 100,
      };
    }),
  };
}

export function chartMaximum(values: number[]) {
  const max = Math.max(0, ...values);

  if (max === 0) {
    return 0;
  }

  const magnitude = 10 ** Math.floor(Math.log10(max));

  const step =
    [1, 2, 2.5, 5, 10].find((value) => {
      return value * magnitude >= max;
    }) ?? 10;

  return step * magnitude;
}

export function reportChartModels(report: LoadedReport): BarChartModel[] {
  if (report.kind === "payments") {
    const data = report.data;

    return [
      {
        title: "Payment status",
        note: "Number of records. Verified records can include subsequently reversed credits.",
        unit: "count",
        rows: [
          { label: "Verified", value: data.verifiedPayments, tone: "verified" },
          {
            label: "Pending review",
            value: data.pendingVerification,
            tone: "pending",
          },
          {
            label: "Needs clarification",
            value: data.needsClarification,
            tone: "accent",
          },
          ...(data.rejectedPayments === undefined
            ? []
            : [
                {
                  label: "Rejected",
                  value: data.rejectedPayments,
                  tone: "negative" as const,
                },
              ]),
        ],
      },
      {
        title: "Collections and pending claims",
        note: "PHP · verified credit includes Finance corrections. Pending claims do not reduce balances.",
        unit: "money",
        rows: [
          {
            label: "Verified collections",
            value: data.verifiedAmount,
            tone: "verified",
          },
          {
            label: "Pending claims",
            value: data.pendingAmount,
            tone: "pending",
          },
        ],
      },
    ];
  }

  if (report.kind === "collections") {
    const data = report.data;

    const batches = "items" in data ? data.items : data.batches;

    const basis =
      "items" in data ? "batches on this page" : "batches in this saved report";

    const ranked = (
      field: "remainingBalance" | "collectedInPeriod",
      tone: ChartTone,
    ) => {
      return [...batches]
        .sort((left, right) => {
          return (
            Number(right[field]) - Number(left[field]) ||
            left.code.localeCompare(right.code)
          );
        })
        .slice(0, 6)
        .map((row) => {
          return { label: row.code, value: row[field], tone };
        });
    };

    return [
      {
        title: "Outstanding balances by batch",
        note: `${"items" in data ? "Current" : "Captured"} overall balances · up to six largest ${basis}.`,
        unit: "money",
        rows: ranked("remainingBalance", "accent"),
      },
      {
        title: "Collections by batch",
        note: `Verified credit in the applied period · up to six largest ${basis}.`,
        unit: "money",
        rows: ranked("collectedInPeriod", "verified"),
      },
    ];
  }

  if (report.kind === "reconciliation") {
    const data = report.data.totals;

    return [
      {
        title: "Verified credit and corrections",
        note: "PHP · signed adjustments are already included in net verified credit.",
        unit: "money",
        rows: [
          ...(data.originalVerifiedAmount === undefined
            ? []
            : [
                {
                  label: "Original verified credit",
                  value: data.originalVerifiedAmount,
                  tone: "blue" as const,
                },
              ]),
          ...(data.adjustmentAmount === undefined
            ? []
            : [
                {
                  label: "Finance adjustments",
                  value: data.adjustmentAmount,
                  tone:
                    Number(data.adjustmentAmount) < 0
                      ? ("negative" as const)
                      : ("blue" as const),
                },
              ]),
          {
            label: "Net verified credit",
            value: data.verifiedAmount,
            tone: "verified",
          },
        ],
      },
      {
        title: "Reconciliation review flags",
        note: "Records can have more than one flag. Flags require review and do not authorize a correction.",
        unit: "count",
        rows: [
          {
            label: "Duplicate references",
            value: data.duplicateReferencePayments,
            tone: "pending",
          },
          {
            label: "Verification audit gaps",
            value: data.unmatchedVerifiedPayments,
            tone: "negative",
          },
          {
            label: "Batch mismatches",
            value: data.batchMismatchPayments,
            tone: "accent",
          },
          {
            label: "Schedule mismatches",
            value: data.scheduleMismatchPayments,
            tone: "blue",
          },
          ...(data.adjustmentAuditGapPayments === undefined
            ? []
            : [
                {
                  label: "Adjustment audit gaps",
                  value: data.adjustmentAuditGapPayments,
                  tone: "negative" as const,
                },
              ]),
        ],
      },
    ];
  }

  if (report.kind === "tasks") {
    const data = report.data;

    return [
      {
        title: "Task progress",
        note: "Number of tasks created in the applied period, grouped by current status.",
        unit: "count",
        rows: [
          { label: "To do", value: data.byStatus.TODO ?? 0, tone: "muted" },
          {
            label: "In progress",
            value: data.byStatus.IN_PROGRESS ?? 0,
            tone: "blue",
          },
          {
            label: "Submitted",
            value: data.byStatus.SUBMITTED ?? 0,
            tone: "accent",
          },
          {
            label: "Completed",
            value: data.byStatus.DONE ?? 0,
            tone: "verified",
          },
        ],
      },
      {
        title: "Submission timing",
        note: "Factual submission timing only; no automatic payroll or disciplinary action.",
        unit: "count",
        rows: [
          {
            label: "Submitted on time",
            value: Math.max(0, data.submitted - data.late),
            tone: "verified",
          },
          { label: "Submitted late", value: data.late, tone: "pending" },
          {
            label: "Not submitted",
            value: Math.max(0, data.total - data.submitted),
            tone: "muted",
          },
        ],
      },
    ];
  }

  const data = report.data;

  const labels: Record<string, string> = {
    CUSTOMER_PORTAL: "Customer portal",
    MESSENGER: "Messenger",
    FACEBOOK: "Facebook",
    PHONE: "Phone",
    WALK_IN: "Walk-in",
    OTHER: "Other",
    UNRECORDED: "Not recorded",
  };

  return [
    {
      title: "Support cases by category",
      note: "Cases created in the applied period · up to eight largest categories.",
      unit: "count",
      rows: [...data.categories]
        .sort((left, right) => {
          return (
            right.total - left.total ||
            left.category.localeCompare(right.category)
          );
        })
        .slice(0, 8)
        .map((row) => {
          return {
            label: row.category,
            value: row.total,
            tone: "accent" as const,
          };
        }),
    },
    ...(data.sources
      ? [
          {
            title: "Where enquiries came from",
            note: "Recorded source of support cases in the applied period.",
            unit: "count" as const,
            rows: [...data.sources]
              .sort((left, right) => {
                return right.total - left.total;
              })
              .map((row) => {
                return {
                  label: labels[row.source] ?? row.source,
                  value: row.total,
                  tone: "blue" as const,
                };
              }),
          },
        ]
      : []),
  ];
}
