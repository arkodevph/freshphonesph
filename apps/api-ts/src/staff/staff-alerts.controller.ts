import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { staffAlertQuerySchema, staffAlertReadAllSchema, staffAlertReadSchema, type User } from '@freshphones/contracts';
import type { z } from 'zod';
import { CurrentUser } from '../auth/access';
import { Validate } from '../http';
import { StaffAlertsService } from './staff-alerts.service';

@Controller('staff/alerts')
export class StaffAlertsController {
  constructor(@Inject(StaffAlertsService) private readonly alerts: StaffAlertsService) {}
  @Get() list(@CurrentUser() user: User, @Query(new Validate(staffAlertQuerySchema)) query: z.infer<typeof staffAlertQuerySchema>) {
    return this.alerts.list(user, query);
  }
  @Get('results/:id') result(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.alerts.result(user, id);
  }
  @Post('read-all') @HttpCode(200) readAll(@CurrentUser() user: User,
    @Body(new Validate(staffAlertReadAllSchema)) body: z.infer<typeof staffAlertReadAllSchema>) { return this.alerts.readAll(user, body.scope); }
  @Post(':id/read') @HttpCode(200) read(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(staffAlertReadSchema)) body: z.infer<typeof staffAlertReadSchema>) { return this.alerts.read(user, id, body); }
}
