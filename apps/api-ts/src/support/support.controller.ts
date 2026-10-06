import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { listQuerySchema, supportCreateSchema, supportUpdateSchema, type User } from '@freshphones/contracts';
import type { z } from 'zod';
import { CurrentUser, Requires } from '../auth/access';
import { Validate } from '../http';
import { SupportService } from './support.service';

@Controller('support/cases')
export class SupportController {
  constructor(@Inject(SupportService) private readonly support: SupportService) {}

  @Post() @Requires('SUPPORT_CREATE') create(
    @CurrentUser() user: User,
    @Body(new Validate(supportCreateSchema)) body: z.infer<typeof supportCreateSchema>,
  ) { return this.support.create(user, body); }

}
