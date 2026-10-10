import { NotFoundException } from '@nestjs/common';
import type { z } from 'zod';
import type {
  applicantListQuerySchema,
  jobOpeningListQuerySchema,
  RecruitmentSummary,
} from '@freshphones/contracts';
import type { Database } from '../database';
import { Prisma } from '../generated/prisma/client';

export const applicantInclude = {
  job: { select: { id: true, title: true } },
  reviewer: { select: { id: true, name: true } },
  attachments: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: {
      storedFile: {
        select: { id: true, originalName: true, mimeType: true, size: true },
      },
    },
  },
} satisfies Prisma.ApplicantInclude;
const jobInclude = { _count: { select: { applicants: true } } } as const;

export function jobs(
  db: Database,
  query: z.infer<typeof jobOpeningListQuerySchema>,
) {
  const where: Prisma.JobOpeningWhereInput = {
    ...(query.status ? { isOpen: query.status === 'OPEN' } : {}),
    ...(query.q
      ? {
          OR: ['title', 'description', 'location', 'employmentType'].map(
            (field) => ({
              [field]: { contains: query.q, mode: 'insensitive' as const },
            }),
          ),
        }
      : {}),
  };
  return db.$transaction(
    async (tx) => {
      const [items, total] = await Promise.all([
        tx.jobOpening.findMany({
          where,
          include: jobInclude,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * 20,
          take: 20,
        }),
        tx.jobOpening.count({ where }),
      ]);
      return { items, total, page: query.page, pageSize: 20 };
    },
    { isolationLevel: 'RepeatableRead' },
  );
}
export function applicants(
  db: Database,
  query: z.infer<typeof applicantListQuerySchema>,
) {
  const where: Prisma.ApplicantWhereInput = {
    retentionErasedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.jobId ? { jobId: query.jobId } : {}),
    ...(query.q
      ? {
          OR: [
            { fullName: { contains: query.q, mode: 'insensitive' } },
            { email: { contains: query.q, mode: 'insensitive' } },
            { job: { title: { contains: query.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
  return db.$transaction(
    async (tx) => {
      const [items, total] = await Promise.all([
        tx.applicant.findMany({
          where,
          include: applicantInclude,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * 20,
          take: 20,
        }),
        tx.applicant.count({ where }),
      ]);
      return { items, total, page: query.page, pageSize: 20 };
    },
    { isolationLevel: 'RepeatableRead' },
  );
}
export async function applicant(db: Prisma.TransactionClient, id: string) {
  const row = await db.applicant.findUnique({
    where: { id },
    include: applicantInclude,
  });
  if (!row || row.retentionErasedAt) throw new NotFoundException('Applicant not found.');
  return row;
}
export async function job(db: Prisma.TransactionClient, id: string) {
  const row = await db.jobOpening.findUnique({
    where: { id },
    include: jobInclude,
  });
  if (!row) throw new NotFoundException('Job opening not found.');
  return row;
}
export function summary(db: Database): Promise<RecruitmentSummary> {
  return db.$transaction(
    async (tx) => {
      const [jobs, openJobs, applicants, awaitingReview] = await Promise.all([
        tx.jobOpening.count(),
        tx.jobOpening.count({ where: { isOpen: true } }),
        tx.applicant.count({ where: { retentionErasedAt: null } }),
        tx.applicant.count({
          where: { status: { in: ['RECEIVED', 'REVIEWING'] } },
        }),
      ]);
      return { jobs, openJobs, applicants, awaitingReview };
    },
    { isolationLevel: 'RepeatableRead' },
  );
}
