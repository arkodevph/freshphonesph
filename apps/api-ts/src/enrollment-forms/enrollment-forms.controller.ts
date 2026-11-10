import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  enrollmentApplicationAssignSchema,
  enrollmentApplicationCloseSchema,
  enrollmentApplicationForwardSchema,
  enrollmentApplicationQuerySchema,
  enrollmentFormPublishSchema,
  enrollmentFormUpdateSchema,
  enrollmentPublicSubmissionSchema,
  type EnrollmentApplicationForward,
  type EnrollmentApplicationQuery,
  type EnrollmentFormUpdate,
  type EnrollmentPublicSubmission,
  type User,
} from "@freshphones/contracts";
import { CurrentUser, Public, Requires } from "../auth/access";
import { AbusePolicy } from "../abuse/policies";
import { Validate } from "../http";
import { EnrollmentFormsService } from "./enrollment-forms.service";

@Controller()
export class EnrollmentFormsController {
  constructor(
    @Inject(EnrollmentFormsService)
    private readonly forms: EnrollmentFormsService,
  ) {}

  @Public()
  @Get("public/enrollment-form")
  @AbusePolicy("publicRead")
  published() {
    return this.forms.published();
  }

  @Public()
  @Post("public/enrollment-applications")
  @AbusePolicy("application")
  submit(
    @Body(new Validate(enrollmentPublicSubmissionSchema))
    input: EnrollmentPublicSubmission,
  ) {
    return this.forms.submit(input);
  }

  @Get("enrollment/form")
  @Requires("ENROLLMENT_FORM_MANAGE")
  config(@CurrentUser() user: User) {
    return this.forms.config(user);
  }

  @Patch("enrollment/form")
  @Requires("ENROLLMENT_FORM_MANAGE")
  updateConfig(
    @CurrentUser() user: User,
    @Body(new Validate(enrollmentFormUpdateSchema)) input: EnrollmentFormUpdate,
  ) {
    return this.forms.updateConfig(user, input);
  }

  @Post("enrollment/form/publish")
  @HttpCode(200)
  @Requires("ENROLLMENT_FORM_MANAGE")
  publish(
    @CurrentUser() user: User,
    @Body(new Validate(enrollmentFormPublishSchema)) input: { version: number },
  ) {
    return this.forms.publish(user, input.version);
  }

  @Get("enrollment/applications")
  @Requires("ENROLLMENT_APPLICATION_READ")
  applications(
    @CurrentUser() user: User,
    @Query(new Validate(enrollmentApplicationQuerySchema))
    query: EnrollmentApplicationQuery,
  ) {
    return this.forms.applications(user, query);
  }

  @Get("enrollment/applications/:id")
  @Requires("ENROLLMENT_APPLICATION_READ")
  application(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.forms.application(user, id);
  }

  @Post("enrollment/applications/:id/forward")
  @HttpCode(200)
  @Requires("ENROLLMENT_APPLICATION_MANAGE")
  forward(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(enrollmentApplicationForwardSchema))
    input: EnrollmentApplicationForward,
  ) {
    return this.forms.forward(user, id, input);
  }

  @Post("enrollment/applications/:id/close")
  @HttpCode(200)
  @Requires("ENROLLMENT_APPLICATION_MANAGE")
  close(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(enrollmentApplicationCloseSchema))
    input: { version: number; reason: string },
  ) {
    return this.forms.close(user, id, input);
  }

  @Post("enrollment/applications/:id/assign")
  @HttpCode(200)
  @Requires("ENROLLMENT_APPLICATION_MANAGE")
  assign(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(enrollmentApplicationAssignSchema))
    input: { version: number; agentId: string },
  ) {
    return this.forms.assign(user, id, input);
  }
}
