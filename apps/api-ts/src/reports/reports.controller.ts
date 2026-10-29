import { AbusePolicy } from "../abuse/policies";
import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import {
  collectionReportQuerySchema,
  installmentEarningsQuerySchema,
  installmentEarningsExportSchema,
  executiveChartQuerySchema,
  reconciliationReportQuerySchema,
  operationsReportQuerySchema,
  reportAnalysisSchema,
  reportBatchQuerySchema,
  reportExportQuerySchema,
  reportHistoryQuerySchema,
  reportQuerySchema,
  reportSnapshotSchema,
  type User,
} from "@freshphones/contracts";
import type { Response } from "express";
import type { z } from "zod";
import { CurrentUser, Requires, ReportFamily } from "../auth/access";
import { Validate } from "../http";
import { ReportsService } from "./reports.service";

type ReportQuery = z.infer<typeof reportQuerySchema>;

@AbusePolicy("expensive")
@Controller("reports")
export class ReportsController {
  constructor(
    @Inject(ReportsService) private readonly reports: ReportsService,
  ) {}

  @Get("charts") @Requires("REPORT_VIEW") @ReportFamily("PAYMENTS") charts(
    @Query(new Validate(executiveChartQuerySchema))
    query: z.infer<typeof executiveChartQuerySchema>,
  ) {
    return this.reports.charts(query.months);
  }

  @Get("dashboard")
  @Requires("REPORT_VIEW")
  @ReportFamily("PAYMENTS")
  dashboard(@Query(new Validate(reportQuerySchema)) query: ReportQuery) {
    return this.reports.dashboard(query);
  }

  @Get("installment-earnings")
  @Requires("REPORT_VIEW")
  @ReportFamily("COLLECTIONS")
  installmentEarnings(
    @Query(new Validate(installmentEarningsQuerySchema))
    query: z.infer<typeof installmentEarningsQuerySchema>,
  ) {
    return this.reports.installmentEarnings(query);
  }

  @Get("installment-earnings/export")
  @Requires("REPORT_VIEW")
  @ReportFamily("COLLECTIONS")
  async installmentEarningsExport(
    @Query(new Validate(installmentEarningsExportSchema))
    query: z.infer<typeof installmentEarningsExportSchema>,
    @Res() response: Response,
  ) {
    const { format, ...filters } = query;

    const data = await this.reports.installmentEarningsExport(filters, format);

    response.type(
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv; charset=utf-8",
    );

    response.setHeader(
      "Content-Disposition",
      `attachment; filename="installment-earnings-${query.groupBy}.${format}"`,
    );

    response.send(data);
  }

  @Get("payments") @Requires("REPORT_VIEW") @ReportFamily("PAYMENTS") payments(
    @Query(new Validate(reportQuerySchema)) query: ReportQuery,
  ) {
    return this.reports.paymentReport(query);
  }

  @Get("batches") @Requires("REPORT_VIEW") @ReportFamily("COLLECTIONS") batches(
    @Query(new Validate(reportBatchQuerySchema))
    query: z.infer<typeof reportBatchQuerySchema>,
  ) {
    return this.reports.batchOptions(query);
  }

  @Get("collections")
  @Requires("REPORT_VIEW")
  @ReportFamily("COLLECTIONS")
  collections(
    @Query(new Validate(collectionReportQuerySchema))
    query: z.infer<typeof collectionReportQuerySchema>,
  ) {
    return this.reports.collectionReport(query);
  }

  @Get("payments/export")
  @Requires("REPORT_VIEW")
  @Header("Content-Disposition", 'attachment; filename="payments.csv"')
  @Header("Content-Type", "text/csv; charset=utf-8")
  @ReportFamily("PAYMENTS")
  async paymentExport(
    @Query(new Validate(reportQuerySchema)) query: ReportQuery,
  ) {
    return this.reports.paymentCsv(query);
  }

  @Get("reconciliation")
  @Requires("REPORT_VIEW")
  @ReportFamily("RECONCILIATION")
  reconciliation(
    @Query(new Validate(reconciliationReportQuerySchema))
    query: z.infer<typeof reconciliationReportQuerySchema>,
  ) {
    return this.reports.reconciliationReport(query);
  }

  @Get("reconciliation/exceptions")
  @Requires("REPORT_VIEW")
  @ReportFamily("RECONCILIATION")
  reconciliationExceptions(
    @CurrentUser() user: User,
    @Query(new Validate(reconciliationReportQuerySchema))
    query: z.infer<typeof reconciliationReportQuerySchema>,
  ) {
    return this.reports.reconciliationExceptions(user, query);
  }

  @Get("tasks") @Requires("REPORT_VIEW") @ReportFamily("TASKS") tasks(
    @Query(new Validate(operationsReportQuerySchema))
    query: z.infer<typeof operationsReportQuerySchema>,
  ) {
    return this.reports.taskReport(query);
  }

  @Get("support") @Requires("REPORT_VIEW") @ReportFamily("SUPPORT") support(
    @Query(new Validate(operationsReportQuerySchema))
    query: z.infer<typeof operationsReportQuerySchema>,
  ) {
    return this.reports.supportReport(query);
  }

  @Get("export") @Requires("REPORT_VIEW") @ReportFamily("query") async export(
    @Query(new Validate(reportExportQuerySchema))
    query: z.infer<typeof reportExportQuerySchema>,
    @Res() response: Response,
  ) {
    const { kind, format, ...filters } = query;

    const data = await this.reports.export(kind, format, filters);

    response.type(
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv; charset=utf-8",
    );

    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${kind}.${format}"`,
    );

    response.send(data);
  }

  @Post("snapshots") @Requires("REPORT_WRITE") snapshot(
    @CurrentUser() user: User,
    @Body(new Validate(reportSnapshotSchema))
    body: z.infer<typeof reportSnapshotSchema>,
  ) {
    return this.reports.createSnapshot(user, body);
  }

  @Post("snapshots/:id/analysis") @Requires("REPORT_WRITE") submitAnalysis(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(reportAnalysisSchema))
    body: z.infer<typeof reportAnalysisSchema>,
  ) {
    return this.reports.submitAnalysis(user, id, body.body);
  }

  @Get("snapshots") @Requires("REPORT_VIEW") snapshots(
    @CurrentUser() user: User,
    @Query(new Validate(reportHistoryQuerySchema))
    query: z.infer<typeof reportHistoryQuerySchema>,
  ) {
    return this.reports.snapshots(user, query);
  }
}
