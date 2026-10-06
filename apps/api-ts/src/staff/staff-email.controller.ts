import { BadRequestException, Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { staffEmailKinds, staffEmailQuerySchema, staffEmailRetrySchema, staffEmailTemplateSchema, staffEmailTimingSchema, type StaffEmailKind, type User } from '@freshphones/contracts';
import type { z } from 'zod';
import { CurrentUser, Requires } from '../auth/access';
import { Validate } from '../http';
import { StaffEmailService } from './staff-email.service';

@Controller('staff-notification-settings')
@Requires('ACCOUNT_MANAGE')
export class StaffEmailController {
  constructor(@Inject(StaffEmailService) private readonly emails: StaffEmailService) {}
  @Get() settings(@CurrentUser() user: User) { return this.emails.settings(user); }
  @Patch('templates/:kind') template(@CurrentUser() user: User, @Param('kind') kind: string,
    @Body(new Validate(staffEmailTemplateSchema)) input: z.infer<typeof staffEmailTemplateSchema>) {
    if (!staffEmailKinds.includes(kind as StaffEmailKind)) throw new BadRequestException('Unknown staff email template.');
    return this.emails.updateTemplate(user, kind as StaffEmailKind, input);
  }
  @Patch('timing') timing(@CurrentUser() user: User, @Body(new Validate(staffEmailTimingSchema)) input: z.infer<typeof staffEmailTimingSchema>) {
    return this.emails.updateTiming(user, input);
  }
  @Get('deliveries') deliveries(@CurrentUser() user: User, @Query(new Validate(staffEmailQuerySchema)) query: z.infer<typeof staffEmailQuerySchema>) {
    return this.emails.deliveries(user, query);
  }
  @Post('deliveries/:id/retry') @HttpCode(200) retry(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(staffEmailRetrySchema)) input: z.infer<typeof staffEmailRetrySchema>) {
    return this.emails.retry(user, id, input.version);
  }
}
