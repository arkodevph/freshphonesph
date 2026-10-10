import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CONFIG, readConfig, type Config } from './config';
import { Database } from './database';
import { AuthService } from './auth/auth.service';
import { PrivateStorageService } from './storage/private-storage.service';
import { RetentionService } from './retention/retention.service';
import { EmailDeliveryService } from './portal/email-delivery.service';
import { NotificationSettingsService } from './portal/notification-settings.service';
import { StaffEmailService } from './staff/staff-email.service';
import { NotificationsService } from './notifications/notifications.service';
import { WorkQueueService } from './jobs/work-queue.service';
import { BackgroundWorkerService } from './jobs/background-worker.service';

@Module({})
class WorkerModule {}

export async function createWorkerApp(config: Config = readConfig()) {
  if (!config.REDIS_URL) throw new Error('Workers require REDIS_URL.');
  const app = await NestFactory.createApplicationContext({ module: WorkerModule,
    providers: [{ provide: CONFIG, useValue: config }, Database, AuthService, PrivateStorageService,
      RetentionService, EmailDeliveryService, NotificationSettingsService, StaffEmailService,
      NotificationsService, WorkQueueService, BackgroundWorkerService],
  }, { logger: config.NODE_ENV === 'test' ? false : ['log', 'warn', 'error'] });
  app.enableShutdownHooks();
  return app;
}
