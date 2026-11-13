import { SubmissionChecklistsController } from "./submission-checklists/checklists.controller";
import { SubmissionChecklistsService } from "./submission-checklists/checklists.service";
import { OperationsMonitorController } from "./operations-monitor/monitor.controller";
import { OperationsMonitorService } from "./operations-monitor/monitor.service";
import { AssistantConversationsService } from "./assistant/conversations.service";
import {
  AssistantConversationsController,
  AssistantProjectsController,
} from "./assistant/conversations.controller";
import { WithdrawalsController } from "./withdrawals/withdrawals.controller";
import { assistantCallContext } from "./assistant/access";
import { AssistantToolsService } from "./assistant/tools.service";
import { AssistantController } from "./assistant/assistant.controller";
import { WithdrawalsService } from "./withdrawals/withdrawals.service";
import { RoleWorkspaceController } from "./records/role-workspace.controller";
import { RoleWorkspaceService } from "./records/role-workspace.service";
import "reflect-metadata";
import {
  Controller,
  Get,
  HttpException,
  Inject,
  Module,
  ServiceUnavailableException,
} from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR, NestFactory } from "@nestjs/core";
import { cooRequestContext } from "./coo-security/request-replay";
import { CooReadCache } from "./coo-security/read-cache.service";
import { CooReplayMaintenance } from "./coo-security/replay-maintenance.service";
import { CooReadCacheInterceptor } from "./coo-security/read-cache.interceptor";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import type { Request, Response, NextFunction } from "express";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { CONFIG, readConfig, type Config } from "./config";
import { Database } from "./database";
import { CatalogController } from "./catalog/catalog.controller";
import { CatalogService } from "./catalog/catalog.service";
import { EnrollmentFormsController } from "./enrollment-forms/enrollment-forms.controller";
import { EnrollmentFormsService } from "./enrollment-forms/enrollment-forms.service";
import { InquiriesController } from "./inquiries/inquiries.controller";
import { InquiriesService } from "./inquiries/inquiries.service";
import { RetentionController } from "./retention/retention.controller";
import { RetentionService } from "./retention/retention.service";
import { Errors } from "./http";
import { AccessGuard, Public } from "./auth/access";
import { AuthService } from "./auth/auth.service";
import { AuthController } from "./auth/auth.controller";
import { DashController } from "./auth/dash.controller";
import { allowsBrowserWrite, browserOrigins } from "./auth/browser-origins";
import { RecordsController } from "./records/records.controller";
import { AgentsController } from "./records/agents.controller";
import { RecordsService } from "./records/records.service";
import { GcashHistoryController } from "./gcash-history/gcash-history.controller";
import { GcashPdfService } from "./gcash-history/gcash-pdf.service";
import { GcashHistoryService } from "./gcash-history/gcash-history.service";
import { RealtimeController } from "./realtime/realtime.controller";
import { FinanceController } from "./finance/finance.controller";
import { FinanceAlertsController } from "./finance/finance-alerts.controller";
import { FinanceAlertsService } from "./finance/finance-alerts.service";
import { FinanceService } from "./finance/finance.service";
import { ReceiptService } from "./finance/receipt.service";
import { PrivateStorageService } from "./storage/private-storage.service";
import { ReportsController } from "./reports/reports.controller";
import { ReportsService } from "./reports/reports.service";
import { PortalController } from "./portal/portal.controller";
import { SupportService } from "./portal/support.service";
import { NotificationsService } from "./portal/notifications.service";
import { EmailDeliveryService } from "./portal/email-delivery.service";
import { NotificationSettingsService } from "./portal/notification-settings.service";
import { DocumentsService } from "./portal/documents.service";
import { CustomerWorkController } from "./portal/customer-work.controller";
import { CustomerWorkService } from "./portal/customer-work.service";
import { TasksController } from "./tasks/tasks.controller";
import { TasksService } from "./tasks/tasks.service";
import { HrActionsController } from "./hr-actions/hr-actions.controller";
import { HrActionsService } from "./hr-actions/hr-actions.service";
import { LegalController } from "./legal/legal.controller";
import { LegalService } from "./legal/legal.service";
import { StaffAlertsController } from "./staff/staff-alerts.controller";
import { StaffAlertsService } from "./staff/staff-alerts.service";
import { StaffEmailController } from "./staff/staff-email.controller";
import { StaffEmailService } from "./staff/staff-email.service";
import { RedisEventsService } from "./redis/redis-events.service";
import { WorkQueueService } from "./jobs/work-queue.service";
import { OperationsController } from "./jobs/operations.controller";
import { AbuseService } from "./abuse/abuse.service";
import { AccountAbuseGuard, PublicAbuseGuard } from "./abuse/abuse.guard";
import { AbusePolicy, addressGroup } from "./abuse/policies";
import { DocumentsController as RequirementsController } from "./documents/documents.controller";
import { DocumentsService as RequirementsService } from "./documents/documents.service";
import { NotificationsController as OperationsNotificationsController } from "./notifications/notifications.controller";
import { NotificationsService as OperationsNotificationsService } from "./notifications/notifications.service";
import { RecruitmentController } from "./recruitment/recruitment.controller";
import { RecruitmentService } from "./recruitment/recruitment.service";
import { SupportController as OperationsSupportController } from "./support/support.controller";
import { SupportService as OperationsSupportService } from "./support/support.service";
import { WorkController } from "./work/work.controller";
import { WorkService } from "./work/work.service";

@Controller("health")
@AbusePolicy("health")
class HealthController {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(WorkQueueService) private readonly queues: WorkQueueService,
  ) {}
  @Public() @Get("redis") async redisHealth() {
    const status = await this.queues.status();

    if (
      status.mode !== "redis" ||
      status.redis !== "connected" ||
      status.worker !== "running"
    ) {
      throw new ServiceUnavailableException(
        "Redis or background workers unavailable.",
      );
    }

    return { status: "ok", redis: status.redis, worker: status.worker };
  }
  @Public() @Get() async health() {
    try {
      await this.db.$queryRaw`SELECT 1`;

      return { status: "ok", database: "connected" };
    } catch {
      throw new ServiceUnavailableException("Database unavailable.");
    }
  }
}

@Module({})
class AppModule {}

export async function createApp(config: Config = readConfig()) {
  const app = await NestFactory.create<NestExpressApplication>(
    {
      module: AppModule,
      controllers: [
        SubmissionChecklistsController,
        OperationsMonitorController,
        AssistantController,
        AssistantConversationsController,
        AssistantProjectsController,
        OperationsController,
        RetentionController,
        CatalogController,
        InquiriesController,
        EnrollmentFormsController,
        HealthController,
        AuthController,
        DashController,
        LegalController,
        RecordsController,
        RoleWorkspaceController,
        WithdrawalsController,
        GcashHistoryController,
        AgentsController,
        FinanceController,
        FinanceAlertsController,
        ReportsController,
        RealtimeController,
        PortalController,
        CustomerWorkController,
        TasksController,
        HrActionsController,
        StaffAlertsController,
        StaffEmailController,
        RequirementsController,
        OperationsNotificationsController,
        RecruitmentController,
        WorkController,
        OperationsSupportController,
      ],
      providers: [
        SubmissionChecklistsService,
        OperationsMonitorService,
        AssistantToolsService,
        AssistantConversationsService,
        AbuseService,
        CooReadCache,
        CooReplayMaintenance,
        RedisEventsService,
        WorkQueueService,
        CatalogService,
        InquiriesService,
        EnrollmentFormsService,
        RetentionService,
        { provide: CONFIG, useValue: config },
        Database,
        AuthService,
        LegalService,
        RecordsService,
        RoleWorkspaceService,
        WithdrawalsService,
        GcashHistoryService,
        GcashPdfService,
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
        HrActionsService,
        StaffAlertsService,
        StaffEmailService,
        RequirementsService,
        OperationsNotificationsService,
        RecruitmentService,
        WorkService,
        OperationsSupportService,
        { provide: APP_GUARD, useClass: PublicAbuseGuard },
        { provide: APP_GUARD, useClass: AccessGuard },
        { provide: APP_GUARD, useClass: AccountAbuseGuard },
        { provide: APP_INTERCEPTOR, useClass: CooReadCacheInterceptor },
      ],
    },
    { logger: config.NODE_ENV === "test" ? false : ["log", "warn", "error"] },
  );

  app.setGlobalPrefix("api");

  app
    .getHttpAdapter()
    .getInstance()
    .set(
      "trust proxy",
      config.TRUSTED_PROXY_CIDRS?.split(",").map((entry) => {
        return entry.trim();
      }) ?? false,
    );

  app.use(helmet());

  app.enableCors({
    origin: browserOrigins(config),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Membership-Id", "Idempotency-Key"],
    exposedHeaders: ["Retry-After", "Idempotency-Replayed"],
    preflightContinue: true,
  });

  // Runs before body parsing and authentication, including for unknown routes.
  const abuse = app.get(AbuseService);

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "no-store");

    try {
      const health =
        ["GET", "HEAD"].includes(req.method) &&
        /^\/api\/health(?:\/redis)?\/?$/i.test(req.path);

      await abuse.consume(
        health ? "health" : "ingress",
        `ingress-ip:${addressGroup(req.ip)}`,
        res,
      );

      if (req.method === "OPTIONS") {
        res.sendStatus(204);

        return;
      }

      next();
    } catch (error) {
      res
        .status(error instanceof HttpException ? error.getStatus() : 503)
        .json({
          message:
            error instanceof HttpException
              ? error.message
              : "Request protection is temporarily unavailable. Try again shortly.",
        });
    }
  });

  app.use(cookieParser());

  app.useBodyParser("json", { limit: "512kb" });

  app.use(assistantCallContext);

  app.use(cooRequestContext(config));

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "no-store");

    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.headers.origin;

      if (
        !allowsBrowserWrite(
          config,
          origin,
          Boolean(req.headers.cookie),
          req.method,
          req.path,
        )
      ) {
        res.status(403).json({ message: "Request origin is not allowed." });

        return;
      }
    }

    next();
  });

  app.useGlobalFilters(new Errors());

  app.enableShutdownHooks();

  return app;
}
