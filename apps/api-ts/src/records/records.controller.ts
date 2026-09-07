import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  accountSchema,
  accountUpdateSchema,
  batchSchema,
  batchUpdateSchema,
  clientSchema,
  clientUpdateSchema,
  listQuerySchema,
  type AccountInput,
  type BatchInput,
  type ClientInput,
  type User,
} from '@freshphones/contracts';
import { CurrentUser, Requires } from '../auth/access';
import { Validate } from '../http';
import { RecordsService } from './records.service';
import type { z } from 'zod';
type ListQuery = z.infer<typeof listQuerySchema>;

@Controller()
export class RecordsController {
  constructor(@Inject(RecordsService) private readonly records: RecordsService) {}
  @Get('overview') overview(@CurrentUser() user: User) {
    return this.records.overview(user);
  }
  @Get('batches') @Requires('BATCH_READ') batches(
    @Query(new Validate(listQuerySchema)) query: ListQuery,
  ) {
    return this.records.batches(query);
  }
  @Post('batches') @Requires('BATCH_MANAGE') createBatch(
    @CurrentUser() user: User,
    @Body(new Validate(batchSchema)) body: BatchInput,
  ) {
    return this.records.createBatch(user, body);
  }
  @Patch('batches/:id') @Requires('BATCH_MANAGE') updateBatch(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(batchUpdateSchema)) body: z.infer<typeof batchUpdateSchema>,
  ) {
    return this.records.updateBatch(user, id, body.record, body.version);
  }
  @Get('clients') @Requires('CLIENT_READ') clients(
    @Query(new Validate(listQuerySchema)) query: ListQuery,
  ) {
    return this.records.clients(query);
  }
  @Get('clients/:id') client(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.records.client(user, id);
  }
  @Post('clients') @Requires('CLIENT_MANAGE') createClient(
    @CurrentUser() user: User,
    @Body(new Validate(clientSchema)) body: ClientInput,
  ) {
    return this.records.createClient(user, body);
  }
  @Get('clients/:id/schedule') schedule(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.records.schedule(user, id);
  }
  @Post('clients/:id/schedule') @Requires('CLIENT_MANAGE') issueSchedule(
    @CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.records.issueSchedule(user, id);
  }
  @Patch('clients/:id') @Requires('CLIENT_MANAGE') updateClient(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(clientUpdateSchema)) body: z.infer<typeof clientUpdateSchema>,
  ) {
    return this.records.updateClient(user, id, body.record, body.version);
  }
  @Get('accounts') @Requires('ACCOUNT_MANAGE') accounts(
    @Query(new Validate(listQuerySchema)) query: ListQuery,
  ) {
    return this.records.accounts(query);
  }
  @Post('accounts') @Requires('ACCOUNT_MANAGE') createAccount(
    @CurrentUser() user: User,
    @Body(new Validate(accountSchema)) body: AccountInput,
  ) {
    return this.records.createAccount(user, body);
  }
  @Patch('accounts/:id') @Requires('ACCOUNT_MANAGE') updateAccount(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(accountUpdateSchema)) body: z.infer<typeof accountUpdateSchema>,
  ) {
    return this.records.updateAccount(user, id, body.active, body.version);
  }
  @Get('audit') @Requires('AUDIT_READ') audit(
    @Query(new Validate(listQuerySchema)) query: ListQuery,
  ) {
    return this.records.audit(query);
  }
}
