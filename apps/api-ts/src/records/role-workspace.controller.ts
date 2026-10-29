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
import { z } from "zod";
import type { User } from "@freshphones/contracts";
import { CurrentUser, Requires, RequiresAny } from "../auth/access";
import { Validate } from "../http";
import { RoleWorkspaceService } from "./role-workspace.service";

const querySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
    requestId: z.string().uuid().optional(),
  })
  .strict();

const submitSchema = z
  .object({
    submissionId: z.string().uuid(),
    batchId: z.string().uuid(),
    memberId: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(100),
    email: z.union([z.string().email(), z.literal("")]).transform((value) => {
      return value.toLowerCase();
    }),
    phone: z
      .string()
      .trim()
      .regex(/^$|^[+0-9 ()-]{7,25}$/),
  })
  .strict()
  .refine(
    (input) => {
      return Boolean(input.memberId) || input.phone.length > 0;
    },
    { message: "Enter a contact number for a new member.", path: ["phone"] },
  );

const reviewSchema = z
  .object({
    version: z.number().int().positive(),
    decision: z.enum(["APPROVED", "REJECTED"]),
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();

@Controller()
export class RoleWorkspaceController {
  @Get("enrollment/members") @Requires("ENROLLMENT_SUBMIT") members(
    @CurrentUser() user: User,
    @Query(
      new Validate(z.object({ q: z.string().trim().min(2).max(100) }).strict()),
    )
    query: { q: string },
  ) {
    return this.workspace.memberOptions(user, query.q);
  }
  constructor(
    @Inject(RoleWorkspaceService)
    private readonly workspace: RoleWorkspaceService,
  ) {}
  @Get("staff/directory") @Requires("STAFF_READ") staff(
    @CurrentUser() user: User,
  ) {
    return this.workspace.staff(user);
  }
  @Get("access/assignment-options") @Requires("ACCOUNT_MANAGE") options(
    @CurrentUser() user: User,
  ) {
    return this.workspace.assignmentOptions(user);
  }
  @Get("agent-network") @Requires("AGENT_NETWORK_READ") network(
    @CurrentUser() user: User,
  ) {
    return this.workspace.network(user);
  }
  @Get("enrollment/batches") @Requires("ENROLLMENT_SUBMIT") batches(
    @CurrentUser() user: User,
  ) {
    return this.workspace.enrollmentBatches(user);
  }
  @Get("enrollment/requests")
  @RequiresAny("ENROLLMENT_SUBMIT", "ENROLLMENT_REVIEW", "AGENT_NETWORK_READ")
  list(
    @CurrentUser() user: User,
    @Query(new Validate(querySchema)) query: z.infer<typeof querySchema>,
  ) {
    return this.workspace.enrollments(
      user,
      query.page,
      query.status,
      query.requestId,
    );
  }
  @Post("enrollment/requests") @Requires("ENROLLMENT_SUBMIT") submit(
    @CurrentUser() user: User,
    @Body(new Validate(submitSchema)) body: z.infer<typeof submitSchema>,
  ) {
    return this.workspace.submit(user, body);
  }
  @Post("enrollment/requests/:id/review") @Requires("ENROLLMENT_REVIEW") review(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(reviewSchema)) body: z.infer<typeof reviewSchema>,
  ) {
    return this.workspace.review(user, id, body);
  }
  @Get("support/customer-lookup") @Requires("SUPPORT_MANAGE") lookup(
    @Query(
      new Validate(z.object({ q: z.string().trim().min(2).max(100) }).strict()),
    )
    query: {
      q: string;
    },
  ) {
    return this.workspace.supportLookup(query.q);
  }
}
