import { Controller, Get, Inject, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { User } from '@freshphones/contracts';
import { AuthService } from '../auth/auth.service';
import { allowed, type AuthRequest } from '../auth/access';
import { Database } from '../database';

@Controller('events')
export class RealtimeController {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}
  private async visible(user: User, event: { entity: string; recordId: string }) {
    if (event.entity === 'account')
      return user.id === event.recordId || allowed(user, 'ACCOUNT_MANAGE');
    if (event.entity === 'client')
      return user.clientId === event.recordId || allowed(user, 'CLIENT_READ');
    if (event.entity === 'batch') {
      if (allowed(user, 'BATCH_READ')) return true;
      if (user.role === 'CUSTOMER' && user.clientId)
        return Boolean(
          await this.db.client.findFirst({
            where: { id: user.clientId, batchId: event.recordId },
            select: { id: true },
          }),
        );
    }
    if (event.entity === 'payment') {
      if (allowed(user, 'PAYMENT_READ') && user.role !== 'CUSTOMER') return true;
      if (user.role === 'CUSTOMER' && user.clientId)
        return Boolean(await this.db.payment.findFirst({
          where: { id: event.recordId, clientId: user.clientId, status: 'VERIFIED' },
          select: { id: true },
        }));
    }
    if (event.entity === 'support') {
      if (allowed(user, 'SUPPORT_MANAGE')) return true;
      if (user.role === 'CUSTOMER' && user.clientId)
        return Boolean(await this.db.supportCase.findFirst({ where: { id: event.recordId, clientId: user.clientId }, select: { id: true } }));
    }
    if (event.entity === 'notification')
      return Boolean(await this.db.notification.findFirst({ where: { id: event.recordId, userId: user.id }, select: { id: true } }));
    if (event.entity === 'document') {
      if (user.role === 'OWNER' || user.role === 'RECORDS') return true;
      if (user.role === 'CUSTOMER' && user.clientId)
        return Boolean(await this.db.customerDocument.findFirst({ where: { id: event.recordId, clientId: user.clientId }, select: { id: true } }));
    }
    return false;
  }
  @Get()
  async stream(@Req() request: AuthRequest, @Res() response: Response) {
    // A fresh snapshot on ready/reconnect closes the gap before this cursor.
    let cursor = (await this.db.changeEvent.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0n;
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();
    response.write('retry: 2000\nevent: ready\ndata: {}\n\n');
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let heartbeat = 0;
    const stop = () => {
      closed = true;
      if (timer) clearTimeout(timer);
      if (!response.writableEnded) response.end();
    };
    request.on('close', stop);
    response.on('error', stop);
    const tick = async () => {
      if (closed) return;
      try {
        const { user } = await this.auth.authenticate(request.accessToken);
        const events = await this.db.changeEvent.findMany({
          where: { id: { gt: cursor } },
          orderBy: { id: 'asc' },
          take: 100,
        });
        for (const event of events) {
          if (closed) return;
          if (await this.visible(user, event)) {
            if (
              !response.write(
                `event: change\ndata: ${JSON.stringify({ entity: event.entity, recordId: event.recordId })}\n\n`,
              )
            ) {
              stop();
              return;
            }
          }
          cursor = event.id;
        }
        if (++heartbeat % 15 === 0 && !response.write(': keepalive\n\n')) {
          stop();
          return;
        }
      } catch {
        stop();
        return;
      }
      if (!closed)
        timer = setTimeout(() => {
          void tick();
        }, 1000);
    };
    timer = setTimeout(() => {
      void tick();
    }, 1000);
  }
}
