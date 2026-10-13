import { AbusePolicy } from '../abuse/policies';
import { BadRequestException, Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { User } from '@freshphones/contracts';
import { z } from 'zod';
import { CurrentUser, Requires } from '../auth/access';
import { Validate } from '../http';
import { NotificationsService } from './notifications.service';
import { NotificationSettingsService, customerEmailKinds } from './notification-settings.service';
import { EmailDeliveryService } from './email-delivery.service';
import { SupportService } from './support.service';
import { DocumentsService } from './documents.service';
import type { PrivateUpload } from '../storage/private-storage.service';

const createCaseSchema = z.object({ category: z.string().trim().min(1).max(80), description: z.string().trim().min(10).max(5000) }).strict();
const customerReplySchema = z.object({ body: z.string().trim().min(1).max(5000) }).strict();
const staffReplySchema = customerReplySchema.extend({ needsReply: z.boolean().optional() });
const updateCaseSchema = z.object({
  version: z.number().int().positive(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'RESOLVED', 'CLOSED']).optional(),
  resolution: z.string().trim().max(5000).optional(),
  assignedStaffId: z.string().uuid().nullable().optional(),
}).strict().refine((value) => Object.keys(value).some((key) => key !== 'version'), 'Provide a case change.');
const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'NEEDS_CLARIFICATION']),
  clarification: z.string().trim().max(1000).optional(),
  version: z.number().int().positive(),
}).strict();
const templateSchema = z.object({ version: z.number().int().min(0), subject: z.string().trim().min(1).max(180).refine((value) => value.includes('{title}'), 'Subject must include {title}.'),
  body: z.string().trim().min(20).max(2500).refine((value) => value.includes('{message}') && value.includes('{url}'), 'Body must include {message} and {url}.') }).strict();
const reminderSchema = z.object({ version: z.number().int().min(0), reminderDays: z.string().trim().max(100).refine((value) =>
  !value || value.split(',').every((part) => /^\d{1,2}$/.test(part.trim()) && Number(part.trim()) <= 30), 'Use comma-separated whole days from 0 to 30.') }).strict();
const testReminderSchema = z.object({ email: z.string().trim().email().max(254) }).strict();

@Controller()
export class PortalController {
  constructor(
    @Inject(SupportService) private readonly support: SupportService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(NotificationSettingsService) private readonly notificationSettings: NotificationSettingsService,
    @Inject(EmailDeliveryService) private readonly emailDelivery: EmailDeliveryService,
    @Inject(DocumentsService) private readonly documents: DocumentsService,
  ) {}

  @Get('portal/support') mine(@CurrentUser() user: User) { return this.support.mine(user); }
  @Post('portal/support') create(@CurrentUser() user: User, @Body(new Validate(createCaseSchema)) body: z.infer<typeof createCaseSchema>) {
    return this.support.create(user, body);
  }
  @Get('portal/support/:id') myCase(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.support.detail(user, id);
  }
  @Post('portal/support/:id/replies') replyToMyCase(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(customerReplySchema)) body: z.infer<typeof customerReplySchema>) {
    return this.support.reply(user, id, body);
  }
  @Get('support/cases') @Requires('SUPPORT_MANAGE') cases(
    @CurrentUser() user: User, @Query('status') status?: string, @Query('page') rawPage?: string, @Query('case') caseId?: string,
    @Query('source') source?: string,
  ) {
    const page = rawPage === undefined ? 1 : Number(rawPage);
    if (!Number.isInteger(page) || page < 1 || page > 10000) throw new BadRequestException('Invalid page number.');
    if (caseId && !z.string().uuid().safeParse(caseId).success) throw new BadRequestException('Invalid case ID.');
    return this.support.list(user, status?.toUpperCase(), page, caseId, source?.toUpperCase());
  }
  @Get('support/client-options') @Requires('SUPPORT_MANAGE') clientOptions(
    @CurrentUser() user: User, @Query('q') query?: string,
  ) { return this.support.clientOptions(user, query ?? ''); }
  @Get('support/cases/:id') @Requires('SUPPORT_MANAGE') caseDetail(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.support.detail(user, id);
  }
  @Post('support/cases/:id/replies') @Requires('SUPPORT_MANAGE') staffReply(@CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string, @Body(new Validate(staffReplySchema)) body: z.infer<typeof staffReplySchema>) {
    return this.support.reply(user, id, body);
  }
  @Patch('support/cases/:id') @Requires('SUPPORT_MANAGE') update(
    @CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(updateCaseSchema)) body: z.infer<typeof updateCaseSchema>,
  ) { return this.support.update(user, id, body); }

  @Get('portal/notifications') notificationsList(@CurrentUser() user: User) { return this.notifications.list(user); }
  @Post('portal/notifications/read-all') @HttpCode(200) readAllNotifications(@CurrentUser() user: User) {
    return this.notifications.readAll(user);
  }
  @Post('portal/notifications/:id/read') @HttpCode(200) readNotification(
    @CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
  ) { return this.notifications.read(user, id); }

  @Get('customer-notification-settings') @Requires('ACCOUNT_MANAGE') notificationSettingsList() { return this.notificationSettings.list(); }
  @Patch('customer-notification-settings/templates/:kind') @Requires('ACCOUNT_MANAGE') updateEmailTemplate(
    @CurrentUser() user: User, @Param('kind') kind: string, @Body(new Validate(templateSchema)) body: z.infer<typeof templateSchema>,
  ) {
    if (!customerEmailKinds.includes(kind as typeof customerEmailKinds[number])) throw new BadRequestException('Unknown customer email template.');
    return this.notificationSettings.updateTemplate(user, kind as typeof customerEmailKinds[number], body);
  }
  @Patch('customer-notification-settings/reminders') @Requires('ACCOUNT_MANAGE') async updateReminders(
    @CurrentUser() user: User, @Body(new Validate(reminderSchema)) body: z.infer<typeof reminderSchema>,
  ) {
    const updated = await this.notificationSettings.updateReminders(user, body);
    await this.emailDelivery.refreshReminders();
    return updated;
  }
  @AbusePolicy('email')
  @Post('customer-notification-settings/test-reminder') @Requires('ACCOUNT_MANAGE') @HttpCode(200)
  testReminder(@CurrentUser() user: User, @Body(new Validate(testReminderSchema)) body: z.infer<typeof testReminderSchema>) {
    return this.emailDelivery.sendTestReminder(user.id, body.email);
  }

  @Get('portal/documents') myDocuments(@CurrentUser() user: User) { return this.documents.mine(user); }
  @Get('clients/:clientId/documents') clientDocuments(@CurrentUser() user: User, @Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.documents.list(user, clientId);
  }
  @Post('portal/documents/:key')
  @AbusePolicy('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  uploadMine(@CurrentUser() user: User, @Param('key') key: string, @UploadedFile() file?: PrivateUpload) {
    return this.documents.uploadMine(user, key, file);
  }
  @Post('clients/:clientId/documents/:key')
  @AbusePolicy('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  uploadClient(@CurrentUser() user: User, @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('key') key: string, @UploadedFile() file?: PrivateUpload) {
    return this.documents.upload(user, clientId, key, file);
  }
  @Post('documents/:id/review') @HttpCode(200)
  reviewDocument(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(reviewSchema)) body: z.infer<typeof reviewSchema>) {
    return this.documents.review(user, id, body);
  }
  @AbusePolicy('download')
  @Get('documents/:id/file') async readDocument(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response) {
    const file = await this.documents.read(user, id);
    response.type(file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.originalName.replace(/["\\/\r\n]/g, '_')}"`);
    response.setHeader('Content-Length', file.data.length);
    response.send(file.data);
  }
}
