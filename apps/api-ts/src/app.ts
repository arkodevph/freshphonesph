import 'reflect-metadata';
import { Controller, Get, Inject, Module, ServiceUnavailableException } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { CONFIG, readConfig, type Config } from './config';
import { Database } from './database';
import { Errors } from './http';
import { AccessGuard, Public } from './auth/access';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { RecordsController } from './records/records.controller';
import { AgentsController } from './records/agents.controller';
import { RecordsService } from './records/records.service';
import { RealtimeController } from './realtime/realtime.controller';
import { FinanceController } from './finance/finance.controller';
import { FinanceAlertsController } from './finance/finance-alerts.controller';
import { FinanceAlertsService } from './finance/finance-alerts.service';
import { FinanceService } from './finance/finance.service';
import { ReceiptService } from './finance/receipt.service';
import { PrivateStorageService } from './storage/private-storage.service';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { PortalController } from './portal/portal.controller';
import { SupportService } from './portal/support.service';
import { NotificationsService } from './portal/notifications.service';
import { EmailDeliveryService } from './portal/email-delivery.service';
import { NotificationSettingsService } from './portal/notification-settings.service';
import { DocumentsService } from './portal/documents.service';
import { CustomerWorkController } from './portal/customer-work.controller';
import { CustomerWorkService } from './portal/customer-work.service';
import { TasksController } from './tasks/tasks.controller';
import { TasksService } from './tasks/tasks.service';
import { StaffAlertsController } from './staff/staff-alerts.controller';
import { StaffAlertsService } from './staff/staff-alerts.service';
import { StaffEmailController } from './staff/staff-email.controller';
import { StaffEmailService } from './staff/staff-email.service';

import { DocumentsController as RequirementsController } from './documents/documents.controller';
import { DocumentsService as RequirementsService } from './documents/documents.service';
import { NotificationsController as OperationsNotificationsController } from './notifications/notifications.controller';
import { NotificationsService as OperationsNotificationsService } from './notifications/notifications.service';
import { RecruitmentController } from './recruitment/recruitment.controller';
import { RecruitmentService } from './recruitment/recruitment.service';
import { SupportController as OperationsSupportController } from './support/support.controller';
import { SupportService as OperationsSupportService } from './support/support.service';
import { WorkController } from './work/work.controller';
import { WorkService } from './work/work.service';

@Controller('health')
class HealthController {
  constructor(@Inject(Database) private readonly db: Database) {}
  @Public() @Get() async health() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected' };
    } catch {
      throw new ServiceUnavailableException('Database unavailable.');
    }
  }
}
@Module({})
class AppModule {}

export async function createApp(config: Config = readConfig()) {
  const app = await NestFactory.create(
    {
      module: AppModule,
      controllers: [HealthController, AuthController, RecordsController, AgentsController, FinanceController, FinanceAlertsController, ReportsController, RealtimeController, PortalController, CustomerWorkController, TasksController, StaffAlertsController, StaffEmailController, RequirementsController, OperationsNotificationsController, RecruitmentController, WorkController, OperationsSupportController],
      providers: [
        { provide: CONFIG, useValue: config },
        Database,
        AuthService,
        RecordsService,
        FinanceService,
        FinanceAlertsService,
        ReceiptService,
        PrivateStorageService,
        ReportsService,
        SupportService,
        NotificationsService,
        NotificationSettingsService,
        EmailDeliveryService,
        DocumentsService,
        CustomerWorkService,
        TasksService,
        StaffAlertsService,
        StaffEmailService,
        RequirementsService,
        OperationsNotificationsService,
        RecruitmentService,
        WorkService,
        OperationsSupportService,
        { provide: APP_GUARD, useClass: AccessGuard },
      ],
    },
    { logger: config.NODE_ENV === 'test' ? false : ['log', 'warn', 'error'] },
  );
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.headers.origin;
      if ((origin && origin !== config.WEB_ORIGIN) || (!origin && req.headers.cookie)) {
        res.status(403).json({ message: 'Request origin is not allowed.' });
        return;
      }
    }
    next();
  });
  app.enableCors({
    origin: config.WEB_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  });
  app.useGlobalFilters(new Errors());
  app.enableShutdownHooks();
  return app;
}
