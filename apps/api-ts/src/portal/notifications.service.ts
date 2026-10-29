import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { User } from "@freshphones/contracts";
import { Database } from "../database";
import { Prisma } from "../generated/prisma/client";

export async function notifyCustomer(
  tx: Prisma.TransactionClient,
  clientId: string,
  kind: string,
  title: string,
  message: string,
  targetPath?: string,
) {
  const account = await tx.user.findFirst({
    where: {
      member: {
        memberships: { some: { id: clientId, retentionErasedAt: null } },
      },
      role: "CUSTOMER",
    },
    select: { id: true, active: true, clientId: true },
  });

  if (!account?.active) {
    return;
  }

  const path = targetPath
    ? new URL(targetPath, "https://portal.invalid")
    : null;

  if (account.clientId !== clientId) {
    path?.searchParams.set("membership", clientId);
  }

  const notification = await tx.notification.create({
    data: {
      userId: account.id,
      kind,
      title,
      message,
      targetPath: path
        ? `${path.pathname}${path.search}${path.hash}`
        : targetPath,
    },
  });

  await tx.changeEvent.create({
    data: { entity: "notification", recordId: notification.id },
  });
}

@Injectable()
export class NotificationsService {
  constructor(@Inject(Database) private readonly db: Database) {}

  private async scope(user: User): Promise<Prisma.NotificationWhereInput> {
    const primary = await this.db.user.findUnique({
      where: { id: user.id },
      select: { clientId: true },
    });

    return {
      userId: user.id,
      OR: [
        { targetPath: { contains: `membership=${user.clientId}` } },
        ...(primary?.clientId === user.clientId
          ? [
              { targetPath: null },
              { NOT: { targetPath: { contains: "membership=" } } },
            ]
          : []),
      ],
    };
  }

  async list(user: User) {
    if (user.role !== "CUSTOMER") {
      throw new ForbiddenException("Customer account required.");
    }

    return this.db.notification.findMany({
      where: await this.scope(user),
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        kind: true,
        title: true,
        message: true,
        targetPath: true,
        readAt: true,
        createdAt: true,
      },
    });
  }

  async read(user: User, id: string) {
    if (user.role !== "CUSTOMER") {
      throw new ForbiddenException("Customer account required.");
    }

    const result = await this.db.notification.updateMany({
      where: { id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    if (
      !result.count &&
      !(await this.db.notification.findFirst({
        where: { id, userId: user.id },
        select: { id: true },
      }))
    ) {
      throw new NotFoundException("Notification not found.");
    }

    return this.db.notification.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        kind: true,
        title: true,
        message: true,
        targetPath: true,
        readAt: true,
        createdAt: true,
      },
    });
  }

  async readAll(user: User) {
    if (user.role !== "CUSTOMER") {
      throw new ForbiddenException("Customer account required.");
    }

    const result = await this.db.notification.updateMany({
      where: { ...(await this.scope(user)), readAt: null },
      data: { readAt: new Date() },
    });

    return { updated: result.count };
  }
}
