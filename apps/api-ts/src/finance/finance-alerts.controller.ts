import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { financeAlertQuerySchema, financeAlertReadSchema, type User } from '@freshphones/contracts';
import type { z } from 'zod';
import { CurrentUser, Requires } from '../auth/access';
import { Validate } from '../http';
import { FinanceAlertsService } from './finance-alerts.service';

@Controller('staff/finance-alerts')
@Requires('PAYMENT_VERIFY')
export class FinanceAlertsController {
  constructor(@Inject(FinanceAlertsService) private readonly alerts: FinanceAlertsService) {}
  @Get() list(@CurrentUser() user: User, @Query(new Validate(financeAlertQuerySchema)) query: z.infer<typeof financeAlertQuerySchema>) {
    return this.alerts.list(user, query);
  }
  @Post('read-all') @HttpCode(200) readAll(@CurrentUser() user: User) { return this.alerts.readAll(user); }
  @Post(':id/read') @HttpCode(200) read(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(financeAlertReadSchema)) body: z.infer<typeof financeAlertReadSchema>) {
    return this.alerts.read(user, id, body.version);
  }
}
