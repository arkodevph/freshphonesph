import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  businessRole,
  type Permission,
  type User,
  type WithdrawalCase,
  type WithdrawalCreateInput,
  type WithdrawalDecisionInput,
  type WithdrawalNoteInput,
  type WithdrawalPayoutInput,
  type WithdrawalPolicyInput,
  type WithdrawalQuery,
  type WithdrawalRefundInput,
  type WithdrawalReplacementInput,
  type WithdrawalResubmitInput,
} from "@freshphones/contracts";
import { Database } from "../database";
import { Prisma } from "../generated/prisma/client";
import { allowed } from "../auth/access";
import { safeUser } from "../auth/auth.service";
import { batchScope } from "../records/scope";
import { notifyCustomer } from "../portal/notifications.service";
import {
  replacementItems,
  restartPolicy,
  withdrawalFinancials,
} from "./withdrawal-tools";

export const openWithdrawalStatuses = [
  "AWAITING_AGENT",
  "AWAITING_COO",
  "CHANGES_REQUESTED",
  "APPROVED",
];

export function withdrawalScope(
  user: User,
): Prisma.WithdrawalRequestWhereInput {
  const role = businessRole(user.role);

  if (role === "CUSTOMER") {
    return {
      clientId: user.clientId ?? "00000000-0000-0000-0000-000000000000",
      client: {
        member: { account: { id: user.id, active: true, role: "CUSTOMER" } },
      },
    };
  }

  if (["COO", "FINANCE_OFFICER", "SYSTEM_ADMIN"].includes(role)) {
    return {};
  }

  if (["AGENT", "BATCH_MANAGER"].includes(role)) {
    return { client: { batch: batchScope(user) } };
  }

  return { id: "00000000-0000-0000-0000-000000000000" };
}

export async function withdrawalEvent(
  tx: Prisma.TransactionClient,
  user: User,
  id: string,
  action: string,
  note: string,
  internal = false,
  data?: unknown,
) {
  await tx.withdrawalEvent.create({
    data: {
      withdrawalId: id,
      actorId: user.id,
      action,
      note,
      internal,
      ...(data ? { data: JSON.parse(JSON.stringify(data)) } : {}),
    },
  });

  await tx.auditEntry.create({
    data: {
      actorId: user.id,
      entity: "withdrawal_request",
      recordId: id,
      action: `withdrawal.${action}`,
      after: {
        note,
        internal,
        ...(data ? { data: JSON.parse(JSON.stringify(data)) } : {}),
      },
    },
  });

  await tx.changeEvent.create({
    data: { entity: "withdrawal_request", recordId: id },
  });
}

export async function withdrawalNotify(
  tx: Prisma.TransactionClient,
  id: string,
) {
  const row = await tx.withdrawalRequest.findUniqueOrThrow({
    where: { id },
    include: {
      client: {
        include: {
          batch: { include: { agent: { include: { account: true } } } },
        },
      },
    },
  });

  const batch = row.client.batch;

  const ids: string[] = [];

  if (
    row.status === "AWAITING_AGENT" &&
    batch.agent?.active &&
    batch.agent.account?.active &&
    batch.agent.account.role === "AGENT"
  ) {
    ids.push(batch.agent.account.id);
  }

  if (row.status === "AWAITING_COO") {
    ids.push(
      ...(
        await tx.user.findMany({
          where: { role: "COO", active: true },
          select: { id: true },
        })
      ).map((x) => {
        return x.id;
      }),
    );
  }

  if (row.refundStatus === "APPROVED") {
    ids.push(
      ...(
        await tx.user.findMany({
          where: { role: "FINANCE_OFFICER", active: true },
          select: { id: true },
        })
      ).map((x) => {
        return x.id;
      }),
    );
  }

  for (const recipientId of new Set(ids)) {
    await tx.staffNotification.create({
      data: {
        recipientId,
        eventKey: "withdrawal.updated",
        title: "Withdrawal request updated",
        body: "Open the request to review its current status.",
        link: `/system/withdrawals?request=${id}`,
        dedupeKey: `withdrawal:${id}:${row.version}:${recipientId}`,
      },
    });
  }

  await notifyCustomer(
    tx,
    row.clientId,
    "withdrawal",
    "Withdrawal request updated",
    row.status === "REPLACED"
      ? "Your approved replacement has joined. Your refund decision and payout status are tracked separately."
      : "Open your withdrawal request for its current decision and refund status. Installments continue until a replacement joins.",
    `/portal/withdrawals?request=${id}&membership=${row.clientId}`,
  );
}

@Injectable()
export class WithdrawalsService {
  constructor(@Inject(Database) private readonly db: Database) {}

  private write<T>(
    user: User,
    permission: Permission,
    run: (tx: Prisma.TransactionClient, current: User) => Promise<T>,
  ) {
    return this.db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;

        const current = await tx.user.findUnique({ where: { id: user.id } });

        if (!current?.active || !allowed(current, permission)) {
          throw new ForbiddenException("Your withdrawal access has changed.");
        }

        return run(tx, { ...safeUser(current), clientId: user.clientId });
      },
      { timeout: 20000 },
    );
  }

  private async row(
    tx: Prisma.TransactionClient,
    user: User,
    id: string,
    version?: number,
  ) {
    const row = await tx.withdrawalRequest.findFirst({
      where: { id, ...withdrawalScope(user) },
      include: { client: { include: { batch: true } } },
    });

    if (!row) {
      throw new NotFoundException("Withdrawal request not found.");
    }

    if (version !== undefined && row.version !== version) {
      throw new ConflictException(
        "This withdrawal changed. Load its latest details before saving; your draft has not been applied.",
      );
    }

    return row;
  }

  private async view(
    tx: Prisma.TransactionClient,
    user: User,
    id: string,
  ): Promise<WithdrawalCase> {
    const row = await this.row(tx, user, id);

    const customer = user.role === "CUSTOMER";

    const [financial, events, payouts] = await Promise.all([
      withdrawalFinancials(tx, row.clientId),
      tx.withdrawalEvent.findMany({
        where: { withdrawalId: id, ...(customer ? { internal: false } : {}) },
        include: { actor: { select: { id: true, name: true } } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      tx.withdrawalPayout.findMany({
        where: { withdrawalId: id },
        include: { recordedBy: { select: { id: true, name: true } } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    ]);

    const refundPaid = payouts.reduce((sum, x) => {
      return sum.add(x.amount);
    }, new Prisma.Decimal(0));

    const approved = ["APPROVED", "REPLACED"].includes(row.status);

    return {
      id: row.id,
      clientId: row.clientId,
      memberName: row.client.name,
      batch: {
        id: row.client.batch.id,
        code: row.client.batch.code,
        model: row.client.batch.model,
      },
      reason: row.reason,
      status: row.status as WithdrawalCase["status"],
      version: row.version,
      agentNote: customer ? null : row.agentNote,
      decisionNote: row.decisionNote,
      submittedAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      decidedAt: row.decidedAt?.toISOString() ?? null,
      replacedAt: row.replacedAt?.toISOString() ?? null,
      replacementClientId: customer ? null : row.replacementClientId,
      replacementEnrollmentId: customer ? null : row.replacementEnrollmentId,
      replacementMode: row.replacementMode as WithdrawalCase["replacementMode"],
      consultationNote: customer ? null : row.consultationNote,
      replacementNote: customer ? null : row.replacementNote,
      restartPlan: customer
        ? null
        : (row.restartPlan as WithdrawalCase["restartPlan"]),
      refundStatus: row.refundStatus as WithdrawalCase["refundStatus"],
      refundAmount: row.refundAmount?.toFixed(2) ?? null,
      refundTargetDate:
        row.refundTargetDate?.toISOString().slice(0, 10) ?? null,
      refundNote: row.refundNote,
      refundPaid: refundPaid.toFixed(2),
      refundRemaining: row.refundAmount
        ? row.refundAmount.sub(refundPaid).toFixed(2)
        : null,
      duesContinue:
        row.status !== "REPLACED" && row.client.replacementCompletedAt === null,
      financial: {
        originalDue: financial.originalDue,
        releasedDue: financial.releasedDue,
        totalDue: financial.totalDue,
        verifiedPaid: financial.verifiedPaid,
        remaining: financial.remaining,
      },
      actions: {
        forward:
          allowed(user, "WITHDRAWAL_AGENT_REVIEW") &&
          row.status === "AWAITING_AGENT",
        decide:
          allowed(user, "WITHDRAWAL_DECIDE") && row.status === "AWAITING_COO",
        refund: allowed(user, "WITHDRAWAL_REFUND_DECIDE") && approved,
        policy: allowed(user, "WITHDRAWAL_DECIDE") && row.status === "APPROVED",
        proposeReplacement:
          allowed(user, "WITHDRAWAL_AGENT_REVIEW") &&
          row.status === "APPROVED" &&
          Boolean(row.replacementMode),
        viewReplacementEnrollment:
          Boolean(row.replacementEnrollmentId) &&
          (allowed(user, "ENROLLMENT_SUBMIT") ||
            allowed(user, "ENROLLMENT_REVIEW") ||
            allowed(user, "AGENT_NETWORK_READ")),
        payout:
          allowed(user, "WITHDRAWAL_REFUND_PAY") &&
          approved &&
          row.refundStatus === "APPROVED" &&
          Boolean(row.refundAmount?.gt(refundPaid)),
        resubmit: customer && row.status === "CHANGES_REQUESTED",
        cancel:
          customer &&
          ["AWAITING_AGENT", "CHANGES_REQUESTED"].includes(row.status),
      },
      events: events.map((x) => {
        return {
          id: x.id,
          action: x.action,
          note: x.note,
          actor: customer
            ? { id: "", name: x.actorId === user.id ? "You" : "Staff" }
            : x.actor,
          createdAt: x.createdAt.toISOString(),
        };
      }),
      payouts: payouts.map((x) => {
        return {
          id: x.id,
          amount: x.amount.toFixed(2),
          paymentDate: x.paymentDate.toISOString().slice(0, 10),
          method: x.method,
          reference: x.reference,
          note: x.note,
          recordedBy: customer ? { id: "", name: "Finance" } : x.recordedBy,
          createdAt: x.createdAt.toISOString(),
        };
      }),
    };
  }

  async list(user: User, query: WithdrawalQuery) {
    return this.db.$transaction(
      async (tx) => {
        const where: Prisma.WithdrawalRequestWhereInput = {
          AND: [
            withdrawalScope(user),
            ...(query.status ? [{ status: query.status }] : []),
            ...(query.clientId ? [{ clientId: query.clientId }] : []),
            ...(query.q
              ? [
                  {
                    OR: [
                      {
                        client: {
                          name: {
                            contains: query.q,
                            mode: "insensitive" as const,
                          },
                        },
                      },
                      {
                        client: {
                          batch: {
                            code: {
                              contains: query.q,
                              mode: "insensitive" as const,
                            },
                          },
                        },
                      },
                    ],
                  },
                ]
              : []),
          ],
        };

        const [rows, total] = await Promise.all([
          tx.withdrawalRequest.findMany({
            where,
            select: { id: true },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 20,
            skip: (query.page - 1) * 20,
          }),
          tx.withdrawalRequest.count({ where }),
        ]);

        const items = [];

        for (const row of rows) {
          items.push(await this.view(tx, user, row.id));
        }

        return { items, total, page: query.page, pageSize: 20 };
      },
      { isolationLevel: "RepeatableRead", timeout: 20000 },
    );
  }

  async get(user: User, id: string) {
    return this.db.$transaction(
      (tx) => {
        return this.view(tx, user, id);
      },
      { isolationLevel: "RepeatableRead" },
    );
  }

  async eligibility(user: User) {
    if (!user.clientId) {
      return [];
    }

    const client = await this.db.client.findFirst({
      where: {
        id: user.clientId ?? "",
        retentionErasedAt: null,
        member: { account: { id: user.id, active: true, role: "CUSTOMER" } },
      },
      include: { batch: true },
    });

    if (!client) {
      return [];
    }

    const active = await this.db.withdrawalRequest.findFirst({
      where: { clientId: client.id, status: { in: openWithdrawalStatuses } },
      select: { id: true },
    });

    const reason = client.replacementCompletedAt
      ? "This membership has already been replaced."
      : client.releaseStatus === "RELEASED"
        ? "This unit has already been released; contact your Agent."
        : !["PLANNED", "ACTIVE"].includes(client.batch.status)
          ? "This batch is closed; contact your Agent."
          : active
            ? "An open withdrawal request already exists for this membership."
            : null;

    return [
      {
        clientId: client.id,
        memberName: client.name,
        batchCode: client.batch.code,
        eligible: !reason,
        reason,
        activeRequestId: active?.id ?? null,
      },
    ];
  }

  create(user: User, input: WithdrawalCreateInput) {
    return this.write(user, "WITHDRAWAL_SUBMIT", async (tx, current) => {
      const existing = await tx.withdrawalRequest.findUnique({
        where: { submissionId: input.submissionId },
      });

      if (existing) {
        if (
          existing.requesterId !== current.id ||
          existing.clientId !== input.clientId ||
          existing.reason !== input.reason
        ) {
          throw new ConflictException(
            "This submission reference was already used.",
          );
        }

        return this.view(tx, current, existing.id);
      }

      if (input.clientId !== current.clientId) {
        throw new NotFoundException("Choose your own current membership.");
      }

      const client = await tx.client.findFirst({
        where: {
          id: input.clientId,
          retentionErasedAt: null,
          member: {
            account: { id: current.id, role: "CUSTOMER", active: true },
          },
        },
        include: {
          batch: { include: { agent: { include: { account: true } } } },
        },
      });

      if (
        !client ||
        client.replacementCompletedAt ||
        client.releaseStatus === "RELEASED" ||
        !["PLANNED", "ACTIVE"].includes(client.batch.status)
      ) {
        throw new ConflictException(
          "This membership is not eligible for a new withdrawal request. Contact your Agent.",
        );
      }

      if (
        !client.batch.agent?.active ||
        !client.batch.agent.account?.active ||
        client.batch.agent.account.role !== "AGENT"
      ) {
        throw new ConflictException(
          "Your batch needs an active assigned Agent before you submit. Contact support.",
        );
      }

      if (
        await tx.withdrawalRequest.count({
          where: {
            clientId: client.id,
            status: { in: openWithdrawalStatuses },
          },
        })
      ) {
        throw new ConflictException(
          "An open withdrawal request already exists for this membership.",
        );
      }

      const row = await tx.withdrawalRequest.create({
        data: {
          submissionId: input.submissionId,
          clientId: client.id,
          requesterId: current.id,
          reason: input.reason,
        },
      });

      await withdrawalEvent(tx, current, row.id, "submitted", input.reason);

      await withdrawalNotify(tx, row.id);

      return this.view(tx, current, row.id);
    });
  }

  forward(user: User, id: string, input: WithdrawalNoteInput) {
    return this.write(user, "WITHDRAWAL_AGENT_REVIEW", async (tx, current) => {
      const row = await this.row(tx, current, id, input.version);

      if (row.requesterId === current.id) {
        throw new ForbiddenException("You cannot review your own withdrawal.");
      }

      if (row.status !== "AWAITING_AGENT") {
        throw new ConflictException(
          "Only a request awaiting Agent review can be forwarded.",
        );
      }

      await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: "AWAITING_COO",
          agentNote: input.note,
          agentReviewedById: current.id,
          reviewedAt: new Date(),
          version: { increment: 1 },
        },
      });

      await withdrawalEvent(tx, current, id, "forwarded", input.note, true);

      await withdrawalEvent(
        tx,
        current,
        id,
        "agent_reviewed",
        "Your Agent reviewed the request and forwarded it to the COO.",
      );

      await withdrawalNotify(tx, id);

      return this.view(tx, current, id);
    });
  }

  decide(user: User, id: string, input: WithdrawalDecisionInput) {
    return this.write(user, "WITHDRAWAL_DECIDE", async (tx, current) => {
      const row = await this.row(tx, current, id, input.version);

      if (
        row.requesterId === current.id ||
        row.agentReviewedById === current.id
      ) {
        throw new ForbiddenException(
          "A different authorized reviewer must decide this withdrawal.",
        );
      }

      if (row.status !== "AWAITING_COO") {
        throw new ConflictException(
          "The Agent must forward this request before a COO decision.",
        );
      }

      await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: input.decision,
          decisionNote: input.note,
          decidedAt: new Date(),
          version: { increment: 1 },
        },
      });

      await withdrawalEvent(
        tx,
        current,
        id,
        input.decision.toLowerCase(),
        input.note,
      );

      await withdrawalNotify(tx, id);

      return this.view(tx, current, id);
    });
  }

  resubmit(user: User, id: string, input: WithdrawalResubmitInput) {
    return this.write(user, "WITHDRAWAL_SUBMIT", async (tx, current) => {
      const row = await this.row(tx, current, id, input.version);

      if (row.status !== "CHANGES_REQUESTED") {
        throw new ConflictException(
          "Only a request needing changes can be resubmitted.",
        );
      }

      await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: "AWAITING_AGENT",
          reason: input.reason,
          agentNote: null,
          agentReviewedById: null,
          reviewedAt: null,
          decisionNote: null,
          decidedAt: null,
          version: { increment: 1 },
        },
      });

      await withdrawalEvent(tx, current, id, "resubmitted", input.reason);

      await withdrawalNotify(tx, id);

      return this.view(tx, current, id);
    });
  }

  cancel(user: User, id: string, input: WithdrawalNoteInput) {
    return this.write(user, "WITHDRAWAL_SUBMIT", async (tx, current) => {
      const row = await this.row(tx, current, id, input.version);

      if (!["AWAITING_AGENT", "CHANGES_REQUESTED"].includes(row.status)) {
        throw new ConflictException(
          "A request already under COO review cannot be cancelled here; contact your Agent.",
        );
      }

      await tx.withdrawalRequest.update({
        where: { id },
        data: { status: "CANCELLED", version: { increment: 1 } },
      });

      await withdrawalEvent(tx, current, id, "cancelled", input.note);

      return this.view(tx, current, id);
    });
  }

  refund(user: User, id: string, input: WithdrawalRefundInput) {
    return this.write(user, "WITHDRAWAL_REFUND_DECIDE", async (tx, current) => {
      const row = await this.row(tx, current, id, input.version);

      if (!["APPROVED", "REPLACED"].includes(row.status)) {
        throw new ConflictException(
          "Approve the withdrawal before recording its refund decision.",
        );
      }

      const paid = await tx.withdrawalPayout.aggregate({
        where: { withdrawalId: id },
        _sum: { amount: true },
        _count: true,
      });

      if (
        paid._count &&
        (input.decision !== "APPROVED" ||
          !input.amount ||
          paid._sum.amount!.gt(input.amount))
      ) {
        throw new ConflictException(
          "A paid refund cannot be reset or reduced below its recorded payouts.",
        );
      }

      await tx.withdrawalRequest.update({
        where: { id },
        data: {
          refundStatus: input.decision,
          refundAmount: input.amount,
          refundTargetDate: input.targetDate
            ? new Date(input.targetDate)
            : null,
          refundNote: input.note,
          version: { increment: 1 },
        },
      });

      await withdrawalEvent(
        tx,
        current,
        id,
        "refund_decision",
        input.note,
        false,
        {
          decision: input.decision,
          amount: input.amount,
          targetDate: input.targetDate,
        },
      );

      await withdrawalNotify(tx, id);

      return this.view(tx, current, id);
    });
  }

  policy(user: User, id: string, input: WithdrawalPolicyInput) {
    return this.write(user, "WITHDRAWAL_DECIDE", async (tx, current) => {
      const row = await this.row(tx, current, id, input.version);

      if (row.status !== "APPROVED") {
        throw new ConflictException(
          "Replacement terms require an approved withdrawal awaiting replacement.",
        );
      }

      const financial = await withdrawalFinancials(tx, row.clientId);

      if (financial.pendingClaims) {
        throw new ConflictException(
          "Resolve pending or clarification payment claims before agreeing replacement terms.",
        );
      }

      const items = replacementItems(
        input.mode,
        restartPolicy(input),
        financial,
      );

      if (
        !items.length ||
        !items.some((x) => {
          return Number(x.expectedAmount) > 0;
        })
      ) {
        throw new ConflictException(
          "There are no unpaid installments to continue. Agree a new plan instead.",
        );
      }

      if (row.replacementEnrollmentId) {
        await tx.enrollmentRequest.updateMany({
          where: { id: row.replacementEnrollmentId, status: "PENDING" },
          data: {
            status: "REJECTED",
            reason:
              "The COO superseded these replacement terms. Submit a new request with the current policy.",
            reviewedById: current.id,
            reviewedAt: new Date(),
            version: { increment: 1 },
          },
        });

        await tx.changeEvent.create({
          data: {
            entity: "enrollment_request",
            recordId: row.replacementEnrollmentId,
          },
        });
      }

      await tx.withdrawalRequest.update({
        where: { id },
        data: {
          replacementMode: input.mode,
          restartPlan: restartPolicy(input) ?? Prisma.DbNull,
          consultationNote: input.consultationNote,
          replacementNote: input.note,
          policyFingerprint: financial.fingerprint,
          policyVersion: { increment: 1 },
          version: { increment: 1 },
        },
      });

      await withdrawalEvent(
        tx,
        current,
        id,
        "replacement_policy",
        input.note + "\nCEO consultation: " + input.consultationNote,
        true,
        { mode: input.mode, restartPlan: restartPolicy(input) },
      );

      return this.view(tx, current, id);
    });
  }

  async preview(user: User, id: string) {
    if (user.role === "CUSTOMER") {
      throw new ForbiddenException(
        "Replacement details are available to authorized staff only.",
      );
    }

    return this.db.$transaction(
      async (tx) => {
        const row = await this.row(tx, user, id);

        const financial = await withdrawalFinancials(tx, row.clientId);

        const items = replacementItems(
          row.replacementMode,
          row.restartPlan,
          financial,
        );

        const needsPolicyRefresh = Boolean(
          row.policyFingerprint &&
          row.policyFingerprint !== financial.fingerprint,
        );

        return {
          version: row.version,
          mode: row.replacementMode,
          totalDue: items
            .reduce((sum, x) => {
              return sum.add(x.expectedAmount);
            }, new Prisma.Decimal(0))
            .toFixed(2),
          items,
          verifiedPaid: financial.verifiedPaid,
          pendingClaims: financial.pendingClaims,
          needsPolicyRefresh,
          blockedReason:
            row.status !== "APPROVED"
              ? "This withdrawal is not awaiting replacement."
              : financial.pendingClaims
                ? "Resolve pending or clarification payment claims first."
                : !row.replacementMode
                  ? "The COO must record replacement terms first."
                  : needsPolicyRefresh
                    ? "The financial record changed. Ask the COO to review and save the terms again."
                    : null,
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }

  propose(user: User, id: string, input: WithdrawalReplacementInput) {
    return this.write(user, "WITHDRAWAL_AGENT_REVIEW", async (tx, current) => {
      const row = await this.row(tx, current, id);

      const replay = await tx.enrollmentRequest.findUnique({
        where: { submissionId: input.submissionId },
      });

      if (replay) {
        const saved = replay.applicant as Record<string, unknown>;

        if (
          replay.submittedById !== current.id ||
          saved.withdrawalId !== id ||
          saved.name !== input.name ||
          saved.email !== input.email.toLowerCase() ||
          saved.phone !== input.phone ||
          saved.memberId !== input.memberId
        ) {
          throw new ConflictException(
            "This enrollment reference was already used.",
          );
        }

        return this.view(tx, current, id);
      }

      if (row.version !== input.version) {
        throw new ConflictException(
          "This withdrawal changed. Load its latest details before submitting a replacement.",
        );
      }

      if (row.status !== "APPROVED" || !row.replacementMode) {
        throw new ConflictException(
          "The COO must approve withdrawal and replacement terms first.",
        );
      }

      const financial = await withdrawalFinancials(tx, row.clientId);

      if (
        financial.pendingClaims ||
        financial.fingerprint !== row.policyFingerprint
      ) {
        throw new ConflictException(
          "The payment record changed. Ask the COO to refresh the replacement terms.",
        );
      }

      if (input.memberId) {
        const member = await tx.client.findFirst({
          where: {
            memberId: input.memberId,
            retentionErasedAt: null,
            batch: batchScope(current),
          },
          select: { name: true, email: true, phone: true },
        });

        if (
          !member ||
          member.name !== input.name ||
          member.email !== input.email.toLowerCase() ||
          member.phone !== input.phone
        ) {
          throw new NotFoundException(
            "Select an existing member from your assigned batches using their current details.",
          );
        }

        if (
          await tx.client.count({
            where: { memberId: input.memberId, batchId: row.client.batchId },
          })
        ) {
          throw new ConflictException(
            "This person already has a membership in this batch.",
          );
        }
      }

      const applicant = {
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone,
        ...(input.memberId ? { memberId: input.memberId } : {}),
        withdrawalId: id,
        policyVersion: row.policyVersion,
        fingerprint: financial.fingerprint,
      };

      if (
        row.replacementEnrollmentId &&
        (await tx.enrollmentRequest.count({
          where: { id: row.replacementEnrollmentId, status: "PENDING" },
        }))
      ) {
        throw new ConflictException(
          "A replacement enrollment is already awaiting Manager approval.",
        );
      }

      const request = await tx.enrollmentRequest.create({
        data: {
          submissionId: input.submissionId,
          submittedById: current.id,
          batchId: row.client.batchId,
          applicant,
        },
      });

      await tx.withdrawalRequest.update({
        where: { id },
        data: {
          replacementEnrollmentId: request.id,
          version: { increment: 1 },
        },
      });

      await withdrawalEvent(
        tx,
        current,
        id,
        "replacement_proposed",
        "Replacement enrollment submitted for the assigned Manager's approval.",
        true,
        { enrollmentId: request.id },
      );

      await tx.changeEvent.create({
        data: { entity: "enrollment_request", recordId: request.id },
      });

      const reviewers = await tx.user.findMany({
        where: {
          active: true,
          OR: [
            { role: "COO" },
            ...(row.client.batch.managerId
              ? [
                  {
                    id: row.client.batch.managerId,
                    role: {
                      in: [
                        "BATCH_MANAGER",
                        "GENERAL_MANAGER",
                      ] as User["role"][],
                    },
                  },
                ]
              : []),
          ],
        },
        select: { id: true },
      });

      for (const reviewer of reviewers) {
        await tx.staffNotification.create({
          data: {
            recipientId: reviewer.id,
            eventKey: "enrollment.submitted",
            title: "Replacement enrollment awaiting review",
            body: "Open the enrollment request to review its agreed terms.",
            link: `/system/enrollments?request=${request.id}`,
            dedupeKey: `enrollment:${request.id}:${reviewer.id}`,
          },
        });
      }

      return this.view(tx, current, id);
    });
  }

  payout(user: User, id: string, input: WithdrawalPayoutInput) {
    return this.write(user, "WITHDRAWAL_REFUND_PAY", async (tx, current) => {
      if (current.role !== "FINANCE_OFFICER") {
        throw new ForbiddenException(
          "Only Finance can record an external refund payout.",
        );
      }

      const row = await this.row(tx, current, id);

      const existing = await tx.withdrawalPayout.findUnique({
        where: { requestId: input.requestId },
      });

      if (existing) {
        if (
          existing.withdrawalId !== id ||
          existing.recordedById !== current.id ||
          !existing.amount.equals(input.amount) ||
          existing.paymentDate.toISOString().slice(0, 10) !==
            input.paymentDate ||
          existing.method !== input.method.toUpperCase() ||
          existing.reference !== input.reference.toUpperCase() ||
          existing.note !== input.note
        ) {
          throw new ConflictException(
            "This payout reference was already used for different details.",
          );
        }

        return this.view(tx, current, id);
      }

      if (row.version !== input.version) {
        throw new ConflictException(
          "This withdrawal changed. Load the latest refund decision before recording payment.",
        );
      }

      if (
        !["APPROVED", "REPLACED"].includes(row.status) ||
        row.refundStatus !== "APPROVED" ||
        !row.refundAmount
      ) {
        throw new ConflictException(
          "A COO-approved refund amount is required first.",
        );
      }

      if (
        input.paymentDate >
        new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)
      ) {
        throw new BadRequestException(
          "An actual refund payment cannot be dated in the future.",
        );
      }

      const sum = await tx.withdrawalPayout.aggregate({
        where: { withdrawalId: id },
        _sum: { amount: true },
      });

      if (
        (sum._sum.amount ?? new Prisma.Decimal(0))
          .add(input.amount)
          .gt(row.refundAmount)
      ) {
        throw new ConflictException(
          "This payment exceeds the remaining approved refund.",
        );
      }

      if (
        await tx.withdrawalPayout.count({
          where: {
            method: input.method.toUpperCase(),
            reference: input.reference.toUpperCase(),
          },
        })
      ) {
        throw new ConflictException(
          "This external refund reference was already recorded.",
        );
      }

      await tx.withdrawalPayout.create({
        data: {
          requestId: input.requestId,
          withdrawalId: id,
          amount: input.amount,
          paymentDate: new Date(input.paymentDate),
          method: input.method.toUpperCase(),
          reference: input.reference.toUpperCase(),
          note: input.note,
          recordedById: current.id,
        },
      });

      await tx.withdrawalRequest.update({
        where: { id },
        data: { version: { increment: 1 } },
      });

      await withdrawalEvent(tx, current, id, "refund_paid", input.note, false, {
        amount: input.amount,
        paymentDate: input.paymentDate,
        method: input.method.toUpperCase(),
        reference: input.reference.toUpperCase(),
      });

      await withdrawalNotify(tx, id);

      return this.view(tx, current, id);
    });
  }
}
