import { Body, Controller, Get, Inject, NotFoundException, Param, Post } from '@nestjs/common';
import { legalAcknowledgmentSchema, legalDocumentKeySchema, type User } from '@freshphones/contracts';
import type { z } from 'zod';
import { CurrentUser, LegalExempt, Public } from '../auth/access';
import { Validate } from '../http';
import { LegalService } from './legal.service';

@LegalExempt()
@Controller('legal')
export class LegalController {
  constructor(@Inject(LegalService) private readonly legal: LegalService) {}

  @Public() @Get('documents/:key') document(@Param('key') key: string) {
    const parsed = legalDocumentKeySchema.safeParse(key);
    if (!parsed.success) throw new NotFoundException('Legal document not found.');
    return this.legal.document(parsed.data);
  }

  @Get('status') status(@CurrentUser() user: User) { return this.legal.status(user); }

  @Post('acknowledgments') acknowledge(@CurrentUser() user: User,
    @Body(new Validate(legalAcknowledgmentSchema)) body: z.infer<typeof legalAcknowledgmentSchema>) {
    return this.legal.acknowledge(user, body);
  }
}
