import { Controller, Get, Inject, Query } from "@nestjs/common";
import type { User } from "@freshphones/contracts";
import { z } from "zod";
import { CurrentUser, Requires } from "../auth/access";
import { Validate } from "../http";
import { PioneerOverviewService } from "./pioneer-overview.service";

const overviewQuery = z.object({}).strict();

@Controller("pioneer/overview")
export class PioneerOverviewController {
  constructor(
    @Inject(PioneerOverviewService)
    private readonly overview: PioneerOverviewService,
  ) {}

  @Get("team") @Requires("AGENT_NETWORK_READ") team(
    @CurrentUser() user: User,
    @Query(new Validate(overviewQuery)) _query: Record<string, never>,
  ) {
    return this.overview.team(user);
  }

  @Get("tasks") @Requires("TASK_READ") tasks(
    @CurrentUser() user: User,
    @Query(new Validate(overviewQuery)) _query: Record<string, never>,
  ) {
    return this.overview.tasks(user);
  }
}
