import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@freshphones/contracts';
import { allowed, requireCurrentUser } from '../auth/access';
import { Database } from '../database';
import { Prisma, type HrActionStatus } from '../generated/prisma/client';

const include = {
  review: { select: { decision: true, factualEvidence: true, evaluation: true, recommendation: true,
    task: { select: { id: true, title: true, assignee: { select: { id: true, name: true } } } } } },
  proposedBy: { select: { name: true } },
  decidedBy: { select: { name: true } },
} satisfies Prisma.HrActionRequestInclude;
type Row = Prisma.HrActionRequestGetPayload<{ include: typeof include }>;
const pageSize = 20;
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

function view(row: Row) {
  return {
    id: row.id, reviewId: row.reviewId, taskId: row.review.task.id,
    taskTitle: row.review.task.title, employeeId: row.review.task.assignee.id,
    employeeName: row.review.task.assignee.name,
    factualEvidence: row.review.factualEvidence, evaluation: row.review.evaluation,
    recommendation: row.review.recommendation,
    proposedAction: row.proposedAction, rationale: row.rationale,
    proposedByName: row.proposedBy.name, createdAt: row.createdAt.toISOString(),
    status: row.status, decisionReason: row.decisionReason,
    decidedByName: row.decidedBy?.name ?? null, decidedAt: row.decidedAt?.toISOString() ?? null,
    version: row.version,
  };
}

@Injectable()
export class HrActionsService {
  constructor(@Inject(Database) private readonly db: Database) {}

  private async current(user: User) {
    return requireCurrentUser(this.db, user, 'HR_CONFIDENTIAL');
  }

  async list(user: User, query: { page: number; status?: HrActionStatus }) {
    const current = await this.current(user);
    const where: Prisma.HrActionRequestWhereInput = {
      ...(current.role === 'OWNER' ? {} : { proposedById: current.id }),
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, count] = await this.db.$transaction([
      this.db.hrActionRequest.findMany({ where, include, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * pageSize, take: pageSize }),
      this.db.hrActionRequest.count({ where }),
    ]);
    return { results: rows.map(view), count, page: query.page, pageSize };
  }

  async eligibleReviews(user: User, page: number) {
    const current = await this.current(user);
    if (!['HR_PAYROLL', 'COO'].includes(current.role)) throw new ForbiddenException('Only approved HR or COO staff may submit requests.');
    const where: Prisma.KpiReviewWhereInput = {
      decision: 'ACTION_RECOMMENDED',
      hrActionRequests: { none: { status: { in: ['PENDING', 'APPROVED'] } } },
    };
    const [rows, count] = await this.db.$transaction([
      this.db.kpiReview.findMany({ where, select: { id: true, factualEvidence: true, evaluation: true,
        recommendation: true, createdAt: true, task: { select: { id: true, title: true,
          assignee: { select: { id: true, name: true } } } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
      this.db.kpiReview.count({ where }),
    ]);
    return { results: rows.map((row) => ({
      id: row.id, taskId: row.task.id, taskTitle: row.task.title,
      employeeId: row.task.assignee.id, employeeName: row.task.assignee.name,
      factualEvidence: row.factualEvidence, evaluation: row.evaluation,
      recommendation: row.recommendation, reviewedAt: row.createdAt.toISOString(),
    })), count, page, pageSize };
  }

  async create(user: User, input: { reviewId: string; proposedAction: string; rationale: string }) {
    if (!['HR_PAYROLL', 'COO'].includes(user.role)) throw new ForbiddenException('Only approved HR or COO staff may submit requests.');
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current?.active || !['HR_PAYROLL', 'COO'].includes(current.role) || !allowed(current, 'HR_CONFIDENTIAL'))
        throw new ForbiddenException('Your confidential HR access has changed.');
      const review = await tx.kpiReview.findUnique({ where: { id: input.reviewId } });
      if (!review) throw new NotFoundException('KPI review not found.');
      if (review.decision !== 'ACTION_RECOMMENDED') throw new ConflictException('This review has no recommended action.');
      if (await tx.hrActionRequest.findFirst({ where: { reviewId: review.id, status: { in: ['PENDING', 'APPROVED'] } } }))
        throw new ConflictException('This review already has a pending or approved request.');
      const row = await tx.hrActionRequest.create({ data: {
        reviewId: review.id, proposedById: current.id,
        proposedAction: input.proposedAction, rationale: input.rationale,
      }, include });
      await tx.auditEntry.create({ data: { actorId: current.id, entity: 'hr_action_request',
        recordId: row.id, action: 'hr_action.requested', after: json(view(row)) } });
      await tx.changeEvent.create({ data: { entity: 'hr_action_request', recordId: row.id } });
      return view(row);
    });
  }

  async decide(user: User, id: string, input: { version: number; decision: 'APPROVED' | 'REJECTED'; reason: string }) {
    if (user.role !== 'OWNER') throw new ForbiddenException('Only the Owner may decide HR action requests.');
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current?.active || current.role !== 'OWNER') throw new ForbiddenException('Your Owner access has changed.');
      const before = await tx.hrActionRequest.findUnique({ where: { id }, include });
      if (!before) throw new NotFoundException('HR action request not found.');
      if (before.version !== input.version) throw new ConflictException('This request changed. Refresh before deciding.');
      if (before.status !== 'PENDING') throw new ConflictException('This request has already been decided.');
      const changed = await tx.hrActionRequest.updateMany({ where: { id, version: input.version, status: 'PENDING' }, data: {
        status: input.decision, decidedById: current.id, decisionReason: input.reason,
        decidedAt: new Date(), version: { increment: 1 },
      } });
      if (!changed.count) throw new ConflictException('This request changed. Refresh before deciding.');
      const row = await tx.hrActionRequest.findUniqueOrThrow({ where: { id }, include });
      await tx.auditEntry.create({ data: { actorId: current.id, entity: 'hr_action_request', recordId: id,
        action: input.decision === 'APPROVED' ? 'hr_action.approved' : 'hr_action.rejected',
        before: json(view(before)), after: json(view(row)) } });
      await tx.changeEvent.create({ data: { entity: 'hr_action_request', recordId: id } });
      return view(row);
    });
  }
}
