import { Controller, Get, Inject } from '@nestjs/common';
import { Requires } from '../auth/access';
import { Database } from '../database';
import { WorkQueueService } from './work-queue.service';
import { AbuseService } from '../abuse/abuse.service';

@Controller('operations')
export class OperationsController {
  constructor(@Inject(WorkQueueService) private readonly queues: WorkQueueService, @Inject(Database) private readonly db: Database,
    @Inject(AbuseService) private readonly abuse: AbuseService) {}
  @Get() @Requires('ACCOUNT_MANAGE') async status() {
    return { ...await this.queues.status(), rateLimits: this.abuse.status(), unpublishedEvents: await this.db.changeEvent.count({ where: { publishedAt: null } }),
      failedDeliveries: { customer: await this.db.notification.count({ where: { emailStatus: 'FAILED' } }),
        staff: await this.db.staffEmail.count({ where: { status: 'FAILED' } }),
        operations: await this.db.notificationDelivery.count({ where: { status: 'FAILED', attempts: { gte: 5 } } }),
        files: await this.db.retentionFileJob.count({ where: { status: 'FAILED', attempts: { gte: 5 } } }) } };
  }
}
