import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@freshphones/contracts';
import { Database } from '../database';
import { Prisma } from '../generated/prisma/client';

export async function notifyCustomer(
  tx: Prisma.TransactionClient,
  clientId: string,
  kind: string,
  title: string,
  message: string,
  targetPath?: string,
) {
  const account = await tx.user.findUnique({ where: { clientId }, select: { id: true, active: true } });
  if (!account?.active) return;
  const notification = await tx.notification.create({ data: { userId: account.id, kind, title, message, targetPath } });
  await tx.changeEvent.create({ data: { entity: 'notification', recordId: notification.id } });
}

@Injectable()
export class NotificationsService {
  constructor(@Inject(Database) private readonly db: Database) {}

  async list(user: User) {
    if (user.role !== 'CUSTOMER') throw new ForbiddenException('Customer account required.');
    return this.db.notification.findMany({
      where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50,
      select: { id: true, kind: true, title: true, message: true, targetPath: true, readAt: true, createdAt: true },
    });
  }

  async read(user: User, id: string) {
    if (user.role !== 'CUSTOMER') throw new ForbiddenException('Customer account required.');
    const result = await this.db.notification.updateMany({
      where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() },
    });
    if (!result.count && !await this.db.notification.findFirst({ where: { id, userId: user.id }, select: { id: true } }))
      throw new NotFoundException('Notification not found.');
    return this.db.notification.findUniqueOrThrow({ where: { id }, select: {
      id: true, kind: true, title: true, message: true, targetPath: true, readAt: true, createdAt: true,
    } });
  }
}
