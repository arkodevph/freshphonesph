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
} from "@nestjs/common";
import {
  inquirySchema,
  inquiryQuerySchema,
  inquiryUpdateSchema,
  type InquiryInput,
  type InquiryQuery,
  type InquiryStatus,
  type User,
} from "@freshphones/contracts";
import { CurrentUser, Public, Requires } from "../auth/access";
import { AbusePolicy } from "../abuse/policies";
import { Validate } from "../http";
import { InquiriesService } from "./inquiries.service";

@Controller("inquiries")
export class InquiriesController {
  constructor(
    @Inject(InquiriesService) private readonly inquiries: InquiriesService,
  ) {}
  @Public() @Post() @AbusePolicy("application") submit(
    @Body(new Validate(inquirySchema)) body: InquiryInput,
  ) {
    return this.inquiries.submit(body);
  }
  @Get() @Requires("SUPPORT_MANAGE") list(
    @CurrentUser() user: User,
    @Query(new Validate(inquiryQuerySchema)) query: InquiryQuery,
  ) {
    return this.inquiries.list(user, query);
  }
  @Patch(":id") @Requires("SUPPORT_MANAGE") update(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(inquiryUpdateSchema))
    body: { status: InquiryStatus; version: number },
  ) {
    return this.inquiries.update(user, id, body);
  }
}
