import { AbusePolicy } from '../abuse/policies';
import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { catalogItemSchema, catalogUpdateSchema, catalogQuerySchema, publicCatalogQuerySchema, catalogImageSchema, type User } from '@freshphones/contracts';
import type { z } from 'zod';
import type { Response } from 'express';
import { CurrentUser, Public, Requires } from '../auth/access';
import { Validate } from '../http';
import type { PrivateUpload } from '../storage/private-storage.service';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}
  @Public() @Get() list(@Query(new Validate(publicCatalogQuerySchema)) query: z.infer<typeof publicCatalogQuerySchema>) {
    return this.catalog.publicList(query);
  }
  @Get('items') @Requires('CATALOG_MANAGE') directory(@CurrentUser() user: User,
    @Query(new Validate(catalogQuerySchema)) query: z.infer<typeof catalogQuerySchema>) { return this.catalog.directory(user, query); }
  @Post('items') @Requires('CATALOG_MANAGE') create(@CurrentUser() user: User,
    @Body(new Validate(catalogItemSchema)) body: z.infer<typeof catalogItemSchema>) { return this.catalog.create(user, body); }
  @Get('items/:id') @Requires('CATALOG_MANAGE') detail(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) { return this.catalog.detail(user, id); }
  @Patch('items/:id') @Requires('CATALOG_MANAGE') update(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(catalogUpdateSchema)) body: z.infer<typeof catalogUpdateSchema>) { return this.catalog.update(user, id, body.version, body.record); }
  @Post('items/:id/image') @Requires('CATALOG_MANAGE')
  @AbusePolicy('upload')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  upload(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(catalogImageSchema)) body: z.infer<typeof catalogImageSchema>, @UploadedFile() file?: PrivateUpload) {
    return this.catalog.upload(user, id, body.version, file);
  }
  @Post('items/:id/image/remove') @Requires('CATALOG_MANAGE') remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(catalogImageSchema)) body: z.infer<typeof catalogImageSchema>) { return this.catalog.clearImage(user, id, body.version); }
  @AbusePolicy('download')
  @Get('items/:id/image') @Requires('CATALOG_MANAGE') async staffImage(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string, @Res() response: Response) {
    this.sendImage(response, await this.catalog.image(id, user));
  }
  @Public() @Get(':id/image') async publicImage(@Param('id', ParseUUIDPipe) id: string, @Res() response: Response) {
    this.sendImage(response, await this.catalog.image(id));
  }
  private sendImage(response: Response, file: { data: Buffer; mimeType: string }) {
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Disposition', 'inline; filename="product-photo"');
    response.type(file.mimeType).send(file.data);
  }
}
