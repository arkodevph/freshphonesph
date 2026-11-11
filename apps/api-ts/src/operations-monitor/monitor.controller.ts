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
import { z } from "zod";
import {
  monitorFollowUpSchema,
  monitorPolicySchema,
  monitorQuerySchema,
  monitorSourceSchema,
  type User,
} from "@freshphones/contracts";
import { CurrentUser, Requires } from "../auth/access";
import { Validate } from "../http";
import { OperationsMonitorService } from "./monitor.service";

@Controller("operations/monitor")
@Requires("OPERATIONS_MONITOR")
export class OperationsMonitorController {
  constructor(
    @Inject(OperationsMonitorService)
    private readonly monitor: OperationsMonitorService,
  ) {}
  @Get()
  list(
    @CurrentUser() user: User,
    @Query(new Validate(monitorQuerySchema))
    query: z.infer<typeof monitorQuerySchema>,
  ) {
    return this.monitor.list(user, query);
  }
  @Post("policy")
  @HttpCode(200)
  policy(
    @CurrentUser() user: User,
    @Body(new Validate(monitorPolicySchema))
    input: z.infer<typeof monitorPolicySchema>,
  ) {
    return this.monitor.setPolicy(user, input);
  }
  @Get(":source/:id")
  detail(
    @CurrentUser() user: User,
    @Param("source", new Validate(monitorSourceSchema))
    source: z.infer<typeof monitorSourceSchema>,
    @Param("id", ParseUUIDPipe) id: string,
    @Query(
      new Validate(
        z
          .object({
            page: z.coerce.number().int().min(1).max(10000).default(1),
          })
          .strict(),
      ),
    )
    query: { page: number },
  ) {
    return this.monitor.detail(user, source, id, query.page);
  }
  @Post(":source/:id/follow-up")
  @HttpCode(200)
  followUp(
    @CurrentUser() user: User,
    @Param("source", new Validate(monitorSourceSchema))
    source: z.infer<typeof monitorSourceSchema>,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(monitorFollowUpSchema))
    input: z.infer<typeof monitorFollowUpSchema>,
  ) {
    return this.monitor.followUp(user, source, id, input);
  }
}
