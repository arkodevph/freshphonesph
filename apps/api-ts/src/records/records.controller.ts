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
  accountListQuerySchema,
  accountUpdateSchema,
  batchSchema,
  batchUpdateSchema,
  batchAssignmentSchema,
  clientSchema,
  clientListQuerySchema,
  batchListQuerySchema,
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
import { z } from 'zod';
type ListQuery = z.infer<typeof listQuerySchema>;
type ClientListQuery = z.infer<typeof clientListQuerySchema>;
type BatchListQuery = z.infer<typeof batchListQuerySchema>;
type AccountListQuery = z.infer<typeof accountListQuerySchema>;
const releaseUpdateSchema = z.object({ version: z.number().int().positive(),
  status: z.enum(['NOT_READY', 'PROCESSING', 'READY', 'RELEASED']),
  note: z.string().trim().max(1000).default(''),
  collectionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
}).strict();
const historyQuerySchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) }).strict();

@Controller()
export class RecordsController {
  constructor(@Inject(RecordsService) private readonly records: RecordsService) {}
  @Get('overview') overview(@CurrentUser() user: User) {
    return this.records.overview(user);
  }
  @Get('batches') @Requires('BATCH_READ') batches(
    @CurrentUser() user: User,
    @Query(new Validate(batchListQuerySchema)) query: BatchListQuery,
  ) {
    return this.records.batches(user, query);
  }
  @Post('batches') @Requires('BATCH_MANAGE') createBatch(
    @CurrentUser() user: User,
    @Body(new Validate(batchSchema)) body: BatchInput,
  ) {
    return this.records.createBatch(user, body);
  }
  @Get('records/assignment-options') @Requires('BATCH_READ') assignmentOptions(@CurrentUser() user: User) {
    return this.records.assignmentOptions(user);
  }
  @Patch('batches/:id/assignments') @Requires('BATCH_MANAGE') assignBatch(@CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string, @Body(new Validate(batchAssignmentSchema)) body: z.infer<typeof batchAssignmentSchema>) {
    return this.records.assignBatch(user, id, body);
  }
  @Get('batches/:id') @Requires('BATCH_READ') batch(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.records.batch(user, id);
  }
  @Get('batches/:id/history') @Requires('BATCH_MANAGE') batchHistory(
    @Param('id', ParseUUIDPipe) id: string, @Query(new Validate(historyQuerySchema)) query: z.infer<typeof historyQuerySchema>,
  ) { return this.records.history('batch', id, query.page); }
  @Patch('batches/:id') @Requires('BATCH_MANAGE') updateBatch(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(batchUpdateSchema)) body: z.infer<typeof batchUpdateSchema>,
  ) {
    return this.records.updateBatch(user, id, body.record, body.version);
  }
  @Get('clients') @Requires('CLIENT_READ') clients(
    @CurrentUser() user: User,
    @Query(new Validate(clientListQuerySchema)) query: ClientListQuery,
  ) {
    return this.records.clients(user, query);
  }
  @Get('clients/:id') client(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.records.client(user, id);
  }
  @Get('clients/:id/history') @Requires('CLIENT_MANAGE') clientHistory(
    @Param('id', ParseUUIDPipe) id: string, @Query(new Validate(historyQuerySchema)) query: z.infer<typeof historyQuerySchema>,
  ) { return this.records.history('client', id, query.page); }
  @Get('clients/:id/release-updates') releaseUpdates(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.records.releaseUpdates(user, id);
  }
  @Post('clients/:id/release-updates') @Requires('CLIENT_MANAGE') addReleaseUpdate(@CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string, @Body(new Validate(releaseUpdateSchema)) body: z.infer<typeof releaseUpdateSchema>) {
    return this.records.addReleaseUpdate(user, id, body);
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
    @Query(new Validate(accountListQuerySchema)) query: AccountListQuery,
  ) {
    return this.records.accounts(query);
  }
  @Post('accounts') @Requires('ACCOUNT_MANAGE') createAccount(
    @CurrentUser() user: User,
    @Body(new Validate(accountSchema)) body: AccountInput,
  ) {
    return this.records.createAccount(user, body);
  }
  @Get('accounts/:id') @Requires('ACCOUNT_MANAGE') account(@Param('id', ParseUUIDPipe) id: string) {
    return this.records.account(id);
  }
  @Patch('accounts/:id') @Requires('ACCOUNT_MANAGE') updateAccount(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(accountUpdateSchema)) body: z.infer<typeof accountUpdateSchema>,
  ) {
    return this.records.updateAccount(user, id, body, body.version);
  }
  @Get('audit') @Requires('AUDIT_READ') audit(
    @Query(new Validate(listQuerySchema)) query: ListQuery,
  ) {
    return this.records.audit(query);
  }
}
