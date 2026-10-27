import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  InquiryInput,
  InquiryQuery,
  InquiryStatus,
  User,
} from "@freshphones/contracts";
import { requireCurrentUser } from "../auth/access";
import { Database } from "../database";
import type { Prisma } from "../generated/prisma/client";

const selection = {
  id: true,
  name: true,
  phone: true,
  email: true,
  deviceName: true,
  message: true,
  status: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class InquiriesService {
  constructor(@Inject(Database) private readonly db: Database) {}

  async submit(input: InquiryInput) {
    const { contactAcknowledged, ...data } = input;

    // A stable submission ID makes retries safe after an uncertain network response.
    return this.db.$transaction(async (tx) => {
      const created = await tx.deviceInquiry.createMany({
        data,
        skipDuplicates: true,
      });

      const inquiry = await tx.deviceInquiry.findUniqueOrThrow({
        where: { submissionId: input.submissionId },
      });

      if (
        Object.entries(data).some(([key, value]) => {
          return inquiry[key as keyof typeof data] !== value;
        })
      ) {
        throw new ConflictException(
          "This submission was already sent. Close and reopen the form to send a new inquiry.",
        );
      }

      if (created.count) {
        await tx.changeEvent.create({
          data: { entity: "device_inquiry", recordId: inquiry.id },
        });
      }

      // Public responses never expose contact information or staff notes.
      return { reference: inquiry.id };
    });
  }

  async list(user: User, query: InquiryQuery) {
    await requireCurrentUser(this.db, user, "SUPPORT_MANAGE");

    const where: Prisma.DeviceInquiryWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: ["name", "phone", "email", "deviceName"].map((key) => {
              return {
                [key]: { contains: query.q, mode: "insensitive" },
              };
            }),
          }
        : {}),
    };

    const [items, total] = await this.db.$transaction([
      this.db.deviceInquiry.findMany({
        where,
        select: selection,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * 20,
        take: 20,
      }),
      this.db.deviceInquiry.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: 20 };
  }

  async update(
    user: User,
    id: string,
    input: { status: InquiryStatus; version: number },
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;

      await requireCurrentUser(tx, user, "SUPPORT_MANAGE");

      const previous = await tx.deviceInquiry.findUnique({ where: { id } });

      if (!previous) {
        throw new NotFoundException("Inquiry not found.");
      }

      const changed = await tx.deviceInquiry.updateMany({
        where: { id, version: input.version },
        data: { status: input.status, version: { increment: 1 } },
      });

      if (!changed.count) {
        throw new ConflictException(
          "This inquiry changed. Refresh and try again.",
        );
      }

      await tx.auditEntry.create({
        data: {
          actorId: user.id,
          action: "device_inquiry.updated",
          entity: "device_inquiry",
          recordId: id,
          before: { status: previous.status },
          after: { status: input.status },
        },
      });

      await tx.changeEvent.create({
        data: { entity: "device_inquiry", recordId: id },
      });

      return tx.deviceInquiry.findUniqueOrThrow({
        where: { id },
        select: selection,
      });
    });
  }
}
