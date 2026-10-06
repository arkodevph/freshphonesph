import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  recruitmentAgentSchema,
  recruitmentAgentUpdateSchema,
  applicantSchema,
  applicantUpdateSchema,
  jobOpeningSchema,
  jobOpeningUpdateSchema,
  listQuerySchema,
  type User,
} from '@freshphones/contracts';
import type { Response } from 'express';
import type { z } from 'zod';
import { CurrentUser, Public, Requires } from '../auth/access';
import { Validate } from '../http';
import type { PrivateUpload } from '../storage/private-storage.service';
import { RecruitmentService } from './recruitment.service';

@Controller()
export class RecruitmentController {
  constructor(@Inject(RecruitmentService) private readonly recruitment: RecruitmentService) {}

  @Public() @Get('careers') careers() { return this.recruitment.careers(); }

  @Public() @Post('careers/apply')
  @UseInterceptors(FileInterceptor('attachment', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  apply(
    @Body(new Validate(applicantSchema)) body: z.infer<typeof applicantSchema>,
    @UploadedFile() file?: PrivateUpload,
  ) { return this.recruitment.apply(body, file); }

  @Public() @Get('recruitment/agents/verify') verify(@Query('q') query = '') {
    return this.recruitment.verifyAgent(query);
  }

  @Get('recruitment/jobs') @Requires('RECRUITMENT_MANAGE') jobs(@Query('page') page = '1') {
    return this.recruitment.jobs(Math.max(1, Number.parseInt(page, 10) || 1));
  }

  @Post('recruitment/jobs') @Requires('RECRUITMENT_MANAGE') createJob(
    @CurrentUser() user: User,
    @Body(new Validate(jobOpeningSchema)) body: z.infer<typeof jobOpeningSchema>,
  ) { return this.recruitment.createJob(user, body); }

  @Patch('recruitment/jobs/:id') @Requires('RECRUITMENT_MANAGE') updateJob(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(jobOpeningUpdateSchema)) body: z.infer<typeof jobOpeningUpdateSchema>,
  ) { return this.recruitment.updateJob(user, id, body.record, body.version); }

  @Get('recruitment/applicants') @Requires('RECRUITMENT_MANAGE') applicants(
    @Query(new Validate(listQuerySchema)) query: z.infer<typeof listQuerySchema>,
  ) { return this.recruitment.applicants(query); }

  @Patch('recruitment/applicants/:id') @Requires('RECRUITMENT_MANAGE') updateApplicant(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(applicantUpdateSchema)) body: z.infer<typeof applicantUpdateSchema>,
  ) { return this.recruitment.updateApplicant(user, id, body); }

  @Get('applicant-attachments/:id/content') @Requires('RECRUITMENT_MANAGE') async attachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const file = await this.recruitment.applicantAttachment(id);
    response.type(file.mimeType);
    response.setHeader('Content-Disposition', `inline; filename="${file.originalName.replace(/["\\\r\n]/g, '_')}"`);
    response.send(file.data);
  }

  @Get('recruitment/agents') @Requires('AGENT_MANAGE') agents(
    @Query(new Validate(listQuerySchema)) query: z.infer<typeof listQuerySchema>,
  ) { return this.recruitment.agents(query); }

  @Post('recruitment/agents') @Requires('AGENT_MANAGE') createAgent(
    @CurrentUser() user: User,
    @Body(new Validate(recruitmentAgentSchema)) body: z.infer<typeof recruitmentAgentSchema>,
  ) { return this.recruitment.createAgent(user, body); }

  @Patch('recruitment/agents/:id') @Requires('AGENT_MANAGE') updateAgent(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(recruitmentAgentUpdateSchema)) body: z.infer<typeof recruitmentAgentUpdateSchema>,
  ) { return this.recruitment.updateAgent(user, id, body.record, body.version); }
}
