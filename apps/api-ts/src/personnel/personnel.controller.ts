import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import {
  passwordSchema,
  personnelListSchema,
  personnelRejectionSchema,
  personnelSubmissionSchema,
  type PersonnelListQuery,
  type PersonnelSubmission,
  type User,
} from "@freshphones/contracts";
import { z } from "zod";
import { CurrentUser, Requires } from "../auth/access";
import { Validate } from "../http";
import { PersonnelService } from "./personnel.service";

const enrollmentSchema = z
  .object({
    version: z.number().int().positive(),
    password: passwordSchema,
    agentProfileId: z.string().uuid().optional(),
  })
  .strict();

@Controller("personnel/onboarding")
@Requires("HR_CONFIDENTIAL")
export class PersonnelController {
  constructor(
    @Inject(PersonnelService) private readonly personnel: PersonnelService,
  ) {}

  @Get() list(
    @CurrentUser() user: User,
    @Query(new Validate(personnelListSchema)) query: PersonnelListQuery,
  ) {
    return this.personnel.list(user, query);
  }

  @Get("options") options(@CurrentUser() user: User) {
    return this.personnel.options(user);
  }

  @Get(":id/history") history(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.personnel.history(user, id);
  }

  @Post() submit(
    @CurrentUser() user: User,
    @Body(new Validate(personnelSubmissionSchema)) input: PersonnelSubmission,
  ) {
    return this.personnel.submit(user, input);
  }

  @Post(":id/enroll")
  @Requires("HR_CONFIDENTIAL", "ACCOUNT_MANAGE")
  enroll(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(enrollmentSchema))
    input: z.infer<typeof enrollmentSchema>,
  ) {
    return this.personnel.enroll(user, id, input);
  }

  @Post(":id/reject")
  @Requires("HR_CONFIDENTIAL", "ACCOUNT_MANAGE")
  reject(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(personnelRejectionSchema))
    input: z.infer<typeof personnelRejectionSchema>,
  ) {
    return this.personnel.reject(user, id, input);
  }
}
