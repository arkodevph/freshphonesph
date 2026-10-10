import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import type { User } from '@freshphones/contracts';
import { z } from 'zod';
import { CurrentUser, Requires } from '../auth/access';
import { Validate } from '../http';
import { HrActionsService } from './hr-actions.service';

const page = z.coerce.number().int().min(1).max(100000).default(1);
const listQuery = z.object({ page, status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional() }).strict();
const eligibleQuery = z.object({ page }).strict();
const proposal = z.object({
  reviewId: z.string().uuid(),
  proposedAction: z.string().trim().min(3).max(500),
  rationale: z.string().trim().min(10).max(5000),
}).strict();
const decision = z.object({
  version: z.number().int().positive(),
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().trim().min(10).max(5000),
}).strict();

@Controller('hr-actions')
@Requires('HR_CONFIDENTIAL')
export class HrActionsController {
  constructor(@Inject(HrActionsService) private readonly actions: HrActionsService) {}

  @Get() list(@CurrentUser() user: User, @Query(new Validate(listQuery)) query: z.infer<typeof listQuery>) {
    return this.actions.list(user, query);
  }

  @Get('eligible-reviews') eligible(@CurrentUser() user: User, @Query(new Validate(eligibleQuery)) query: z.infer<typeof eligibleQuery>) {
    return this.actions.eligibleReviews(user, query.page);
  }

  @Post() create(@CurrentUser() user: User, @Body(new Validate(proposal)) body: z.infer<typeof proposal>) {
    return this.actions.create(user, body);
  }

  @Post(':id/decision') @HttpCode(200)
  decide(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(decision)) body: z.infer<typeof decision>) {
    return this.actions.decide(user, id, body);
  }
}
