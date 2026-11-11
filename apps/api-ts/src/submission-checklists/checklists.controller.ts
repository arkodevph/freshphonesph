import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import {
  checklistQuerySchema,
  evidenceRequirementUpdateSchema,
  type ChecklistQuery,
  type User,
} from "@freshphones/contracts";
import type { z } from "zod";
import { CurrentUser, Requires } from "../auth/access";
import { Validate } from "../http";
import { SubmissionChecklistsService } from "./checklists.service";

@Controller("submission-checklists")
@Requires("PAYMENT_READ")
export class SubmissionChecklistsController {
  constructor(
    @Inject(SubmissionChecklistsService)
    private readonly checklists: SubmissionChecklistsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: User,
    @Query(new Validate(checklistQuerySchema)) query: ChecklistQuery,
  ) {
    return this.checklists.checklist(user, query);
  }

  @Post(":id")
  @HttpCode(200)
  save(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(evidenceRequirementUpdateSchema))
    input: z.infer<typeof evidenceRequirementUpdateSchema>,
  ) {
    return this.checklists.save(user, id, input.version, input.record);
  }
}
