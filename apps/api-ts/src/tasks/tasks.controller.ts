import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { User } from '@freshphones/contracts';
import { z } from 'zod';
import { CurrentUser, Requires } from '../auth/access';
import { Validate } from '../http';
import type { PrivateUpload } from '../storage/private-storage.service';
import { TasksService } from './tasks.service';

const pageSchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) }).strict();
const taskListSchema = pageSchema.extend({ status: z.enum(['TODO', 'IN_PROGRESS', 'SUBMITTED', 'DONE']).optional() });
const createSchema = z.object({
  title: z.string().trim().min(2).max(200), instructions: z.string().trim().max(5000).default(''),
  assigneeId: z.string().uuid(), priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  deadline: z.string().datetime({ offset: true }),
}).strict();
const versionSchema = z.object({ version: z.number().int().positive() }).strict();
const submitSchema = z.object({ version: z.coerce.number().int().positive(), report: z.string().trim().max(5000).default('') }).strict();
const reviewSchema = z.object({ taskId: z.string().uuid(), version: z.number().int().positive(),
  evaluation: z.string().trim().min(3).max(5000), recommendation: z.string().trim().max(200).default(''),
  decision: z.enum(['NOTED', 'ACTION_RECOMMENDED']) }).strict();

@Controller()
export class TasksController {
  constructor(@Inject(TasksService) private readonly tasks: TasksService) {}

  @Get('tasks/assignees') @Requires('TASK_ASSIGN') assignees(@CurrentUser() user: User) {
    return this.tasks.assignees(user);
  }
  @Get('tasks') list(@CurrentUser() user: User, @Query(new Validate(taskListSchema)) query: z.infer<typeof taskListSchema>) {
    return this.tasks.list(user, query);
  }
  @Get('tasks/:id') detail(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasks.detail(user, id);
  }
  @Post('tasks') @Requires('TASK_ASSIGN') create(@CurrentUser() user: User,
    @Body(new Validate(createSchema)) body: z.infer<typeof createSchema>) {
    return this.tasks.create(user, body);
  }
  @Patch('tasks/:id/start') @HttpCode(200) start(@CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string, @Body(new Validate(versionSchema)) body: z.infer<typeof versionSchema>) {
    return this.tasks.start(user, id, body.version);
  }
  @Post('tasks/:id/submit') @HttpCode(200)
  @UseInterceptors(FileInterceptor('attachment', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  submit(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(submitSchema)) body: z.infer<typeof submitSchema>, @UploadedFile() file?: PrivateUpload) {
    return this.tasks.submit(user, id, body.version, body.report, file);
  }
  @Post('tasks/:id/complete') @Requires('TASK_ASSIGN') @HttpCode(200)
  complete(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(versionSchema)) body: z.infer<typeof versionSchema>) {
    return this.tasks.complete(user, id, body.version);
  }
  @Get('tasks/:id/attachment') async attachment(@CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string, @Res() response: Response) {
    const file = await this.tasks.attachment(user, id);
    response.type(file.mimeType);
    const safeName = file.originalName.replace(/["\\/\r\n]/g, '_');
    response.setHeader('Content-Disposition', `attachment; filename="${safeName.replace(/[^\x20-\x7E]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(safeName)}`);
    response.setHeader('Content-Length', file.data.length);
    response.send(file.data);
  }
  @Get('kpi/queue') @Requires('KPI_REVIEW') queue(@CurrentUser() user: User,
    @Query(new Validate(pageSchema)) query: z.infer<typeof pageSchema>) {
    return this.tasks.kpiQueue(user, query.page);
  }
  @Get('kpi/reviews') @Requires('KPI_REVIEW') reviews(@CurrentUser() user: User,
    @Query(new Validate(pageSchema)) query: z.infer<typeof pageSchema>) {
    return this.tasks.kpiReviews(user, query.page);
  }
  @Post('kpi/reviews') @Requires('KPI_REVIEW') review(@CurrentUser() user: User,
    @Body(new Validate(reviewSchema)) body: z.infer<typeof reviewSchema>) {
    return this.tasks.review(user, body);
  }
}
