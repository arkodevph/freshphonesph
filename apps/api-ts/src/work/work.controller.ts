import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  kpiReviewSchema,
  listQuerySchema,
  taskProgressSchema,
  taskSchema,
  taskSubmissionSchema,
  type User,
} from '@freshphones/contracts';
import type { Response } from 'express';
import type { z } from 'zod';
import { CurrentUser, Requires } from '../auth/access';
import { Validate } from '../http';
import type { PrivateUpload } from '../storage/private-storage.service';
import { WorkService } from './work.service';

@Controller()
export class WorkController {
  constructor(@Inject(WorkService) private readonly work: WorkService) {}

  @Get('staff') @Requires('TASK_READ') staff() { return this.work.staff(); }

  @Get('tasks') @Requires('TASK_READ') tasks(
    @CurrentUser() user: User,
    @Query(new Validate(listQuerySchema)) query: z.infer<typeof listQuerySchema>,
  ) { return this.work.tasks(user, query); }

  @Post('tasks') @Requires('TASK_ASSIGN') create(
    @CurrentUser() user: User,
    @Body(new Validate(taskSchema)) body: z.infer<typeof taskSchema>,
  ) { return this.work.create(user, body); }

  @Patch('tasks/:id/progress') @Requires('TASK_SUBMIT') progress(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(taskProgressSchema)) body: z.infer<typeof taskProgressSchema>,
  ) { return this.work.progress(user, id, body.status, body.version); }

  @Post('tasks/:id/submit') @Requires('TASK_SUBMIT') submit(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(taskSubmissionSchema)) body: z.infer<typeof taskSubmissionSchema>,
  ) { return this.work.submit(user, id, body.version); }

  @Post('tasks/:id/attachments') @Requires('TASK_SUBMIT')
  @UseInterceptors(FileInterceptor('attachment', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  attach(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: PrivateUpload,
  ) { return this.work.attach(user, id, file); }

  @Get('task-attachments/:id/content') @Requires('TASK_READ') async attachment(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const file = await this.work.attachment(user, id);
    response.type(file.mimeType);
    response.setHeader('Content-Disposition', `inline; filename="${file.originalName.replace(/["\\\r\n]/g, '_')}"`);
    response.send(file.data);
  }

  @Get('kpi/queue') @Requires('KPI_REVIEW') queue() { return this.work.kpiQueue(); }

  @Post('kpi/reviews') @Requires('KPI_REVIEW') review(
    @CurrentUser() user: User,
    @Body(new Validate(kpiReviewSchema)) body: z.infer<typeof kpiReviewSchema>,
  ) { return this.work.review(user, body); }
}
