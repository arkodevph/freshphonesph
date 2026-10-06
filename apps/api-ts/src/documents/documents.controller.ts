import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  requirementReviewSchema,
  requirementTypeSchema,
  requirementTypeUpdateSchema,
  type User,
} from '@freshphones/contracts';
import type { Response } from 'express';
import type { z } from 'zod';
import { CurrentUser, Requires } from '../auth/access';
import { Validate } from '../http';
import type { PrivateUpload } from '../storage/private-storage.service';
import { DocumentsService } from './documents.service';

@Controller()
export class DocumentsController {
  constructor(@Inject(DocumentsService) private readonly documents: DocumentsService) {}

  @Get('requirement-types') @Requires('DOCUMENT_READ') types(@CurrentUser() user: User) {
    return this.documents.types(user);
  }

  @Post('requirement-types') @Requires('REQUIREMENT_MANAGE') createType(
    @CurrentUser() user: User,
    @Body(new Validate(requirementTypeSchema)) body: z.infer<typeof requirementTypeSchema>,
  ) {
    return this.documents.createType(user, body);
  }

  @Patch('requirement-types/:id') @Requires('REQUIREMENT_MANAGE') updateType(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(requirementTypeUpdateSchema)) body: z.infer<typeof requirementTypeUpdateSchema>,
  ) {
    return this.documents.updateType(user, id, body.record, body.version);
  }

  @Get('clients/:clientId/requirements') @Requires('DOCUMENT_READ') requirements(
    @CurrentUser() user: User,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.documents.requirements(user, clientId);
  }

  @Post('clients/:clientId/requirements/:typeId/upload') @Requires('DOCUMENT_UPLOAD')
  @UseInterceptors(FileInterceptor('document', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  upload(
    @CurrentUser() user: User,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('typeId', ParseUUIDPipe) typeId: string,
    @UploadedFile() file?: PrivateUpload,
  ) {
    return this.documents.upload(user, clientId, typeId, file);
  }

  @Post('client-requirements/:id/review') @Requires('DOCUMENT_REVIEW') review(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(requirementReviewSchema)) body: z.infer<typeof requirementReviewSchema>,
  ) {
    return this.documents.review(user, id, body);
  }

  @Get('documents/:id/content') @Requires('DOCUMENT_READ') async content(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const file = await this.documents.content(user, id);
    response.type(file.mimeType);
    response.setHeader('Content-Disposition', `inline; filename="${file.originalName.replace(/["\\\r\n]/g, '_')}"`);
    response.setHeader('Content-Length', file.data.length);
    response.send(file.data);
  }
}
