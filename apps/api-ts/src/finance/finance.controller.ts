import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  paymentCorrectionSchema,
  paymentDecisionSchema,
  paymentDuplicateQuerySchema,
  paymentListQuerySchema,
  paymentSchema,
  type PaymentInput,
  type User,
} from '@freshphones/contracts';
import type { z } from 'zod';
import { CurrentUser, Requires } from '../auth/access';
import { Validate } from '../http';
import { FinanceService } from './finance.service';
import { ReceiptService } from './receipt.service';
import type { PrivateUpload } from '../storage/private-storage.service';

type ReceiptUpload = { buffer: Buffer; mimetype: string; size: number };

@Controller()
export class FinanceController {
  constructor(
    @Inject(FinanceService) private readonly finance: FinanceService,
    @Inject(ReceiptService) private readonly receipts: ReceiptService,
  ) {}

  @Post('payments/receipt-scan') @HttpCode(200) @Requires('PAYMENT_RECORD')
  @UseInterceptors(FileInterceptor('receipt', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  scanReceipt(@Body('template') template: string, @UploadedFile() file?: ReceiptUpload) {
    return this.receipts.scan(template, file);
  }

  @Post('payments/:id/proof') @Requires('PAYMENT_RECORD')
  @UseInterceptors(FileInterceptor('proof', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  attachProof(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: PrivateUpload,
  ) {
    return this.finance.attachProof(user, id, file);
  }

  @Get('payments/:id/proof') @Requires('PAYMENT_READ') async proof(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const proof = await this.finance.proof(user, id);
    response.type(proof.mimeType);
    response.setHeader('Content-Disposition', `inline; filename="${proof.originalName.replace(/["\\\r\n]/g, '_')}"`);
    response.setHeader('Content-Length', proof.data.length);
    response.send(proof.data);
  }

  @Get('payments') @Requires('PAYMENT_READ') payments(
    @CurrentUser() user: User,
    @Query(new Validate(paymentListQuerySchema)) query: z.infer<typeof paymentListQuerySchema>,
  ) {
    return this.finance.payments(user, query);
  }

  @Get('payments/duplicates') @Requires('PAYMENT_RECORD') duplicateMatches(
    @CurrentUser() user: User,
    @Query(new Validate(paymentDuplicateQuerySchema)) query: z.infer<typeof paymentDuplicateQuerySchema>,
  ) {
    return this.finance.duplicateMatches(user, query.method, query.referenceNumber, query.excludeId);
  }

  @Get('portal/payments/review') pendingForCustomer(@CurrentUser() user: User) {
    return this.finance.customerPending(user);
  }

  @Get('payments/summary') @Requires('PAYMENT_READ') summary(@CurrentUser() user: User) {
    return this.finance.summary(user);
  }

  @Post('payments') @Requires('PAYMENT_RECORD') create(
    @CurrentUser() user: User,
    @Body(new Validate(paymentSchema)) body: PaymentInput,
  ) {
    return this.finance.create(user, body);
  }

  @Patch('payments/:id') @Requires('PAYMENT_RECORD') correct(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(paymentCorrectionSchema)) body: z.infer<typeof paymentCorrectionSchema>,
  ) {
    return this.finance.correct(user, id, body.record, body.version);
  }

  @Post('payments/:id/verify') @HttpCode(200) @Requires('PAYMENT_VERIFY') decide(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new Validate(paymentDecisionSchema)) body: z.infer<typeof paymentDecisionSchema>,
  ) {
    return this.finance.decide(user, id, body.decision, body.notes, body.version);
  }

  @Get('clients/:id/balance') @Requires('PAYMENT_READ') balance(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.finance.balance(user, id);
  }

  @Get('clients/:id/statement') @Requires('PAYMENT_READ') statement(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.finance.statement(user, id);
  }

  @Get('payments/:id/confirmation') @Requires('PAYMENT_READ') confirmation(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.finance.confirmation(user, id);
  }
}
