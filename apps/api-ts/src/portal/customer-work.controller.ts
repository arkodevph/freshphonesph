import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import type { User } from '@freshphones/contracts';
import { CurrentUser } from '../auth/access';
import { CustomerWorkService, type CustomerWorkKind } from './customer-work.service';

@Controller()
export class CustomerWorkController {
  constructor(@Inject(CustomerWorkService) private readonly work: CustomerWorkService) {}

  @Get('operations/customer-work') list(@CurrentUser() user: User, @Query('kind') kind?: string, @Query('page') rawPage?: string) {
    if (!kind || !['support', 'documents', 'payments'].includes(kind)) throw new BadRequestException('Invalid work queue.');
    return this.work.list(user, kind as CustomerWorkKind, rawPage === undefined ? 1 : Number(rawPage));
  }
}
