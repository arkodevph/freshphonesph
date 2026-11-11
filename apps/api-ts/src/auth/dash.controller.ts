import { Controller, Get, Inject, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { AbusePolicy } from "../abuse/policies";
import { Public } from "./access";
import { AuthService } from "./auth.service";

@Controller("auth/dash")
@AbusePolicy("auth")
export class DashController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  // Dash verifies its own signed JWT and API-key hash. Business writes stay in
  // the existing facade, where role changes and financial actions are audited.
  @Public()
  @Get([
    "config",
    "list-users",
    "user-stats",
    "user-graph-data",
    "user-retention-data",
  ])
  async read(@Req() req: Request, @Res() res: Response) {
    const result = await this.auth.dashRead(req);

    res.setHeader("Cache-Control", "no-store");

    res.type(result.headers.get("content-type") ?? "application/json");

    res.status(result.status).send(await result.text());
  }
}
