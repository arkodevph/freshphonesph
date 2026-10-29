import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  GcashHistoryQuery,
  GcashReadingSummary,
  GcashHistoryReview,
  GcashHistoryUpload,
  Permission,
  User,
} from "@freshphones/contracts";
import { gcashReadingSchema } from "@freshphones/contracts";
import { GcashPdfService } from "./gcash-pdf.service";
import { Database } from "../database";
import { Prisma } from "../generated/prisma/client";
import { allowed, requireCurrentUser } from "../auth/access";
import { safeUser } from "../auth/auth.service";
import { batchScope } from "../records/scope";
import {
  PrivateStorageService,
  type PrivateUpload,
} from "../storage/private-storage.service";

const pdfPolicy = {
  allowedMimeTypes: ["application/pdf"],
  maxBytes: 10 * 1024 * 1024,
  label: "GCash history PDF",
};

const submissionInclude = {
  file: { select: { originalName: true, size: true } },
  uploadedBy: { select: { id: true, name: true } },
  reviewedBy: { select: { id: true, name: true } },
} as const;

const historyInclude = {
  batch: { select: { id: true, code: true } },
  submissions: {
    include: submissionInclude,
    orderBy: { revision: "desc" },
    take: 1,
  },
} as const;

type Submission = Prisma.GcashHistorySubmissionGetPayload<{
  include: typeof submissionInclude;
}>;

type History = Prisma.GcashHistoryGetPayload<{
  include: typeof historyInclude;
}>;

const submissionView = (row: Submission) => {
  return {
    id: row.id,
    reading: (row.readingSummary as GcashReadingSummary | null) ?? null,
    revision: row.revision,
    status: row.status,
    fileName: row.file.originalName,
    size: row.file.size,
    note: row.note,
    reviewNote: row.reviewNote,
    uploadedBy: row.uploadedBy,
    submittedAt: row.submittedAt.toISOString(),
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
};

const historyView = (row: History) => {
  return {
    id: row.id,
    batch: row.batch,
    periodStart: row.periodStart.toISOString().slice(0, 10),
    periodEnd: row.periodEnd.toISOString().slice(0, 10),
    status: row.status,
    version: row.version,
    revision: row.revision,
    current: submissionView(row.submissions[0]),
  };
};

const json = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value));
};

@Injectable()
export class GcashHistoryService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(GcashPdfService) private readonly pdf: GcashPdfService,
    @Inject(PrivateStorageService)
    private readonly storage: PrivateStorageService,
  ) {}

  private async write<T>(
    user: User,
    permission: Permission,
    run: (tx: Prisma.TransactionClient, current: User) => Promise<T>,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;

      const current = await tx.user.findUnique({ where: { id: user.id } });

      if (!current?.active || !allowed(current, permission)) {
        throw new ForbiddenException("Your access has changed.");
      }

      return run(tx, safeUser(current));
    });
  }

  async list(user: User, query: GcashHistoryQuery) {
    user = await requireCurrentUser(this.db, user, "GCASH_HISTORY_READ");

    const where: Prisma.GcashHistoryWhereInput = {
      batch: {
        AND: [
          batchScope(user),
          ...(query.q
            ? [{ code: { contains: query.q, mode: "insensitive" as const } }]
            : []),
        ],
      },
      ...(query.batchId ? { batchId: query.batchId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.db.$transaction(
      [
        this.db.gcashHistory.findMany({
          where,
          include: historyInclude,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (query.page - 1) * 20,
          take: 20,
        }),
        this.db.gcashHistory.count({ where }),
      ],
      { isolationLevel: "RepeatableRead" },
    );

    return {
      items: items.map(historyView),
      total,
      page: query.page,
      pageSize: 20,
    };
  }

  async get(user: User, id: string) {
    user = await requireCurrentUser(this.db, user, "GCASH_HISTORY_READ");

    const row = await this.db.gcashHistory.findFirst({
      where: { id, batch: batchScope(user) },
      include: historyInclude,
    });

    if (!row) {
      throw new NotFoundException("GCash history not found.");
    }

    return historyView(row);
  }

  async submissions(user: User, id: string, page: number) {
    user = await requireCurrentUser(this.db, user, "GCASH_HISTORY_READ");

    const where = { historyId: id, history: { batch: batchScope(user) } };

    return this.db.$transaction(
      async (tx) => {
        if (
          !(await tx.gcashHistory.findFirst({
            where: { id, batch: batchScope(user) },
            select: { id: true },
          }))
        ) {
          throw new NotFoundException("GCash history not found.");
        }

        const items = await tx.gcashHistorySubmission.findMany({
          where,
          include: submissionInclude,
          orderBy: { revision: "desc" },
          skip: (page - 1) * 20,
          take: 20,
        });

        const total = await tx.gcashHistorySubmission.count({ where });

        return { items: items.map(submissionView), total, page, pageSize: 20 };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }

  async upload(user: User, input: GcashHistoryUpload, upload?: PrivateUpload) {
    user = await requireCurrentUser(this.db, user, "GCASH_HISTORY_UPLOAD");

    if (
      !(await this.db.batch.findFirst({
        where: { id: input.batchId, ...batchScope(user) },
        select: { id: true },
      }))
    ) {
      throw new NotFoundException("Batch not found.");
    }

    const file = this.storage.validateDocument(upload, pdfPolicy);

    if (
      file.size !== file.buffer.length ||
      !file.buffer.subarray(-1024).includes(Buffer.from("%%EOF"))
    ) {
      throw new BadRequestException(
        "Upload a complete PDF exported from GCash.",
      );
    }

    const reading = await this.pdf.read(file.buffer, input.password);

    if (
      reading.rows.some((row) => {
        return row.date < input.periodStart || row.date > input.periodEnd;
      })
    ) {
      reading.warnings.push(
        "Some extracted dates fall outside the selected covered period. Check the dates against the PDF.",
      );

      reading.status = "PARTIAL";
    }

    const readingSummary: GcashReadingSummary = {
      status: reading.status,
      method: reading.method,
      pages: reading.pages,
      transactionCount: reading.transactionCount,
      warningCount: reading.warnings.length,
    };

    const storageKey = await this.storage.saveDocument(file, pdfPolicy);

    try {
      return await this.write(
        user,
        "GCASH_HISTORY_UPLOAD",
        async (tx, current) => {
          if (
            !(await tx.batch.findFirst({
              where: { id: input.batchId, ...batchScope(current) },
              select: { id: true },
            }))
          ) {
            throw new NotFoundException("Batch not found.");
          }

          const period = {
            batchId: input.batchId,
            periodStart: new Date(input.periodStart),
            periodEnd: new Date(input.periodEnd),
          };

          const before = await tx.gcashHistory.findUnique({
            where: { batchId_periodStart_periodEnd: period },
            include: historyInclude,
          });

          if (
            before
              ? before.version !== input.expectedVersion ||
                before.status !== "NEEDS_CLARIFICATION"
              : input.expectedVersion !== 0
          ) {
            throw new ConflictException(
              "This period already has a submission or has changed. Load its latest review before submitting a correction.",
            );
          }

          const stored = await tx.storedFile.create({
            data: {
              storageKey,
              originalName:
                file.originalname
                  .replace(/[\x00-\x1f\x7f\\/]/g, "_")
                  .slice(0, 255) || "gcash-history.pdf",
              mimeType: "application/pdf",
              size: file.size,
              uploadedById: current.id,
            },
          });

          const history = before
            ? await tx.gcashHistory.update({
                where: { id: before.id },
                data: {
                  status: "SUBMITTED",
                  revision: { increment: 1 },
                  version: { increment: 1 },
                },
              })
            : await tx.gcashHistory.create({ data: period });

          await tx.gcashHistorySubmission.create({
            data: {
              historyId: history.id,
              revision: history.revision,
              fileId: stored.id,
              uploadedById: current.id,
              note: input.note,
              readingSummary: json(readingSummary),
              reading: { create: { data: json(reading) } },
            },
          });

          const after = await tx.gcashHistory.findUniqueOrThrow({
            where: { id: history.id },
            include: historyInclude,
          });

          await this.audit(
            tx,
            current,
            history.id,
            before ? "resubmitted" : "submitted",
            before ? historyView(before) : null,
            historyView(after),
          );

          return historyView(after);
        },
      );
    } catch (error) {
      await this.storage.remove(storageKey);

      throw error;
    }
  }

  async review(user: User, id: string, input: GcashHistoryReview) {
    return this.write(user, "GCASH_HISTORY_REVIEW", async (tx, current) => {
      const before = await tx.gcashHistory.findUnique({
        where: { id },
        include: historyInclude,
      });

      if (!before) {
        throw new NotFoundException("GCash history not found.");
      }

      if (before.version !== input.version || before.status !== "SUBMITTED") {
        throw new ConflictException(
          "This submission has changed. Load its latest state before reviewing.",
        );
      }

      if (before.submissions[0].uploadedById === current.id) {
        throw new ForbiddenException(
          "Another Records reviewer must review this submission.",
        );
      }

      await tx.gcashHistorySubmission.update({
        where: { id: before.submissions[0].id },
        data: {
          status: input.status,
          reviewNote: input.note,
          reviewedById: current.id,
          reviewedAt: new Date(),
        },
      });

      const after = await tx.gcashHistory.update({
        where: { id },
        data: { status: input.status, version: { increment: 1 } },
        include: historyInclude,
      });

      await this.audit(
        tx,
        current,
        id,
        "reviewed",
        historyView(before),
        historyView(after),
      );

      return historyView(after);
    });
  }

  async reading(user: User, id: string, page: number) {
    user = await requireCurrentUser(this.db, user, "GCASH_HISTORY_READ");

    const row = await this.db.gcashHistorySubmission.findFirst({
      where: { id, history: { batch: batchScope(user) } },
      select: { reading: { select: { data: true } } },
    });

    if (!row?.reading) {
      throw new NotFoundException(
        "This upload has no extracted transaction table. Review the original PDF.",
      );
    }

    const { rows, ...metadata } = gcashReadingSchema.parse(row.reading.data);

    return {
      ...metadata,
      items: rows.slice((page - 1) * 25, page * 25),
      total: rows.length,
      page,
      pageSize: 25,
    };
  }

  async download(user: User, id: string) {
    user = await requireCurrentUser(this.db, user, "GCASH_HISTORY_READ");

    const row = await this.db.gcashHistorySubmission.findFirst({
      where: { id, history: { batch: batchScope(user) } },
      include: { file: true },
    });

    if (!row) {
      throw new NotFoundException("GCash PDF not found.");
    }

    return {
      data: await this.storage.read(row.file.storageKey),
      originalName: row.file.originalName,
    };
  }

  private async audit(
    tx: Prisma.TransactionClient,
    user: User,
    id: string,
    action: string,
    before: unknown,
    after: unknown,
  ) {
    await tx.auditEntry.create({
      data: {
        actorId: user.id,
        entity: "gcash-history",
        recordId: id,
        action: `gcash_history.${action}`,
        ...(before ? { before: json(before) } : {}),
        after: json(after),
      },
    });

    await tx.changeEvent.create({
      data: { entity: "gcash-history", recordId: id },
    });
  }
}
