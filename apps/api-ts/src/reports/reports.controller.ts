import { Body, Controller, Get, Header, Inject, Post, Query, Res } from '@nestjs/common';
import { reportExportQuerySchema, reportQuerySchema, reportSnapshotSchema, type User } from '@freshphones/contracts';
import type { Response } from 'express';
import type { z } from 'zod';
import { CurrentUser, Requires } from '../auth/access';
import { Validate } from '../http';
import { ReportsService } from './reports.service';

type ReportQuery = z.infer<typeof reportQuerySchema>;

@Controller('reports')
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reports: ReportsService) {}

  @Get('dashboard') @Requires('REPORT_VIEW') dashboard(
    @Query(new Validate(reportQuerySchema)) query: ReportQuery,
  ) {
    return this.reports.dashboard(query);
  }

  @Get('payments/export') @Requires('REPORT_VIEW')
  @Header('Content-Disposition', 'attachment; filename="payments.csv"')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async paymentExport(@Query(new Validate(reportQuerySchema)) query: ReportQuery) {
    return this.reports.paymentCsv(query);
  }

  @Get('tasks') @Requires('REPORT_VIEW') tasks(
    @Query(new Validate(reportQuerySchema)) query: ReportQuery,
  ) { return this.reports.taskReport(query); }

  @Get('support') @Requires('REPORT_VIEW') support(
    @Query(new Validate(reportQuerySchema)) query: ReportQuery,
  ) { return this.reports.supportReport(query); }

  @Get('export') @Requires('REPORT_VIEW') async export(
    @Query(new Validate(reportExportQuerySchema)) query: z.infer<typeof reportExportQuerySchema>,
    @Res() response: Response,
  ) {
    const { kind, format, ...filters } = query;
    const data = await this.reports.export(kind, format, filters);
    response.type(format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="${kind}.${format}"`);
    response.send(data);
  }

  @Post('snapshots') @Requires('REPORT_VIEW') snapshot(
    @CurrentUser() user: User,
    @Body(new Validate(reportSnapshotSchema)) body: z.infer<typeof reportSnapshotSchema>,
  ) { return this.reports.createSnapshot(user, body); }

  @Get('snapshots') @Requires('REPORT_VIEW') snapshots(@Query('page') page = '1') {
    return this.reports.snapshots(Math.max(1, Number.parseInt(page, 10) || 1));
  }
}
