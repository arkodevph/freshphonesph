import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { retentionDecisionSchema, retentionExecuteSchema, retentionHoldSchema, retentionPolicyApprovalSchema,
  retentionPolicySchema, retentionQuerySchema, retentionReleaseSchema, retentionRequestSchema, retentionTargetSchema, retentionFollowupSchema, type User } from '@freshphones/contracts';
import { z } from 'zod';
import { CurrentUser, Requires } from '../auth/access';
import { Validate } from '../http';
import { RetentionService } from './retention.service';
const pageSchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) }).strict();
@Controller('retention') @Requires('RETENTION_MANAGE')
export class RetentionController {
  constructor(@Inject(RetentionService) private readonly retention: RetentionService) {}
  @Get('deletion-ledger') ledger(@CurrentUser() user: User) { return this.retention.deletionLedger(user); }
  @Post('requests/:id/followup') followup(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(retentionFollowupSchema)) body: z.infer<typeof retentionFollowupSchema>) { return this.retention.confirmFollowup(user, id, body); }
  @Get('policies') policies(@CurrentUser() user: User) { return this.retention.policies(user); }
  @Post('policies') createPolicy(@CurrentUser() user: User, @Body(new Validate(retentionPolicySchema)) body: z.infer<typeof retentionPolicySchema>) { return this.retention.createPolicy(user, body); }
  @Post('policies/:id/approve') activate(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(retentionPolicyApprovalSchema)) body: z.infer<typeof retentionPolicyApprovalSchema>) { return this.retention.activatePolicy(user, id, body.approvalReference); }
  @Get('candidates') candidates(@CurrentUser() user: User, @Query(new Validate(retentionQuerySchema)) query: z.infer<typeof retentionQuerySchema>) { return this.retention.candidates(user, query); }
  @Post('preview') preview(@CurrentUser() user: User, @Body(new Validate(retentionTargetSchema)) body: z.infer<typeof retentionTargetSchema>) { return this.retention.preview(user, body); }
  @Get('requests') requests(@CurrentUser() user: User, @Query(new Validate(pageSchema)) query: z.infer<typeof pageSchema>) { return this.retention.requests(user, query.page); }
  @Post('requests') request(@CurrentUser() user: User, @Body(new Validate(retentionRequestSchema)) body: z.infer<typeof retentionRequestSchema>) { return this.retention.request(user, body); }
  @Post('requests/:id/decision') decide(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(retentionDecisionSchema)) body: z.infer<typeof retentionDecisionSchema>) { return this.retention.decide(user, id, body); }
  @Post('requests/:id/execute') execute(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(retentionExecuteSchema)) body: z.infer<typeof retentionExecuteSchema>) { return this.retention.execute(user, id, body); }
  @Post('requests/:id/retry-files') retry(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(z.object({}).strict())) _body: Record<string, never>) { return this.retention.purge(user, id); }
  @Get('holds') holds(@CurrentUser() user: User, @Query(new Validate(pageSchema)) query: z.infer<typeof pageSchema>) { return this.retention.holds(user, query.page); }
  @Post('holds') hold(@CurrentUser() user: User, @Body(new Validate(retentionHoldSchema)) body: z.infer<typeof retentionHoldSchema>) { return this.retention.hold(user, body); }
  @Post('holds/:id/release') release(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(retentionReleaseSchema)) body: z.infer<typeof retentionReleaseSchema>) { return this.retention.releaseHold(user, id, body.reason); }
}
