import { Controller, Get, Header, Inject, Query } from '@nestjs/common';
import { reportQuerySchema } from '@freshphones/contracts';
import type { z } from 'zod';
import { Requires } from '../auth/access';
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
}
