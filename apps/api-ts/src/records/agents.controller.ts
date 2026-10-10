import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { agentListQuerySchema, agentSchema, agentUpdateSchema, type AgentInput, type User } from '@freshphones/contracts';
import { z } from 'zod';
import { CurrentUser, Public, Requires } from '../auth/access';
import { Validate } from '../http';
import { RecordsService } from './records.service';
import { AbusePolicy } from '../abuse/policies';

@Controller('agents')
export class AgentsController {
  constructor(@Inject(RecordsService) private readonly records: RecordsService) {}
  @Get('verify') @Public() @AbusePolicy('agentLookup') verify(@Query(new Validate(z.object({ q: z.string().trim().max(200).default('') }).strict())) query: { q: string }) {
    return this.records.verifyAgent(query.q);
  }
  @Get() @Requires('AGENT_MANAGE') list(@Query(new Validate(agentListQuerySchema)) query: z.infer<typeof agentListQuerySchema>) {
    return this.records.agents(query);
  }
  @Post() @Requires('AGENT_MANAGE') create(@CurrentUser() user: User, @Body(new Validate(agentSchema)) body: AgentInput) {
    return this.records.createAgent(user, body);
  }
  @Get(':id') @Requires('AGENT_MANAGE') detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.records.agent(id);
  }
  @Patch(':id') @Requires('AGENT_MANAGE') update(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(agentUpdateSchema)) body: z.infer<typeof agentUpdateSchema>) {
    return this.records.updateAgent(user, id, body.record, body.version);
  }
}
