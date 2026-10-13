import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  notificationQuerySchema,
  notificationTemplateSchema,
  notificationTemplateUpdateSchema,
  type User,
} from '@freshphones/contracts';
import type { z } from 'zod';
import { CurrentUser, Requires } from '../auth/access';
import { Validate } from '../http';
import { NotificationsService } from './notifications.service';
import { WorkQueueService } from '../jobs/work-queue.service';

@Controller('notifications')
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(WorkQueueService) private readonly queues: WorkQueueService) {}

  @Get() @Requires('NOTIFICATION_READ') list(
    @CurrentUser() user: User,
    @Query(new Validate(notificationQuerySchema)) query: z.infer<typeof notificationQuerySchema>,
  ) {
    return this.notifications.list(user, query.page, query.unreadOnly);
  }

  @Patch(':id/read') @Requires('NOTIFICATION_READ') read(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.markRead(user, id);
  }

  @Post('read-all') @HttpCode(200) @Requires('NOTIFICATION_READ') readAll(@CurrentUser() user: User) {
    return this.notifications.readAll(user);
  }

  @Get('templates/list') @Requires('NOTIFICATION_MANAGE') templates() {
    return this.notifications.templates();
  }

  @Post('templates') @Requires('NOTIFICATION_MANAGE') createTemplate(
    @CurrentUser() user: User,
    @Body(new Validate(notificationTemplateSchema)) body: z.infer<typeof notificationTemplateSchema>,
  ) {
    return this.notifications.createTemplate(user, body);
  }

  @Patch('templates/:id') @Requires('NOTIFICATION_MANAGE') updateTemplate(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(notificationTemplateUpdateSchema)) body: z.infer<typeof notificationTemplateUpdateSchema>,
  ) {
    return this.notifications.updateTemplate(user, id, body.record, body.version);
  }

  @Post('run-reminders') @HttpCode(200) @Requires('NOTIFICATION_MANAGE') reminders() {
    if (this.queues.control) return this.queues.request('operations-reminders');
    return this.notifications.runTaskReminders();
  }

  @Post('deliver') @HttpCode(200) @Requires('NOTIFICATION_MANAGE') deliver() {
    if (this.queues.control) return this.queues.request('reconcile');
    return this.notifications.deliverPending();
  }
}
