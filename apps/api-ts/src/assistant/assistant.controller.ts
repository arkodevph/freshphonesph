import { redactModelText } from "./guardrails";
import {
  Body,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  Controller,
  ForbiddenException,
  Inject,
  Logger,
  Post,
  Res,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { Response } from "express";
import {
  assistantQuestionSchema,
  isAssistantReportRequest,
  type AssistantStreamEvent,
  type AssistantQuestion,
  type User,
} from "@freshphones/contracts";
import type { AuthRequest } from "../auth/access";
import { z } from "zod";
import { AssistantToolsService } from "./tools.service";
import { answerWithTools } from "./agent";
import { operationsFor, describeSchema } from "./operations";
import { CurrentUser, Requires } from "../auth/access";
import { AbusePolicy } from "../abuse/policies";
import { Validate } from "../http";
import { answerWithOpenRouter } from "./openrouter";
import { ReportsService } from "../reports/reports.service";
import { answerReportBrief } from "./report-brief";
import { streamFreshphones } from "./stream";

@Controller("assistant")
@AbusePolicy("expensive")
export class AssistantController {
  constructor(
    @Inject(ReportsService) private readonly reports?: ReportsService,
    @Inject(AssistantToolsService)
    private readonly tools?: AssistantToolsService,
  ) {}

  @Post("questions")
  @Requires("REPORT_VIEW")
  answer(
    @CurrentUser() user: User,
    @Body(new Validate(assistantQuestionSchema)) input: AssistantQuestion,
    @Req() request?: AuthRequest,
  ) {
    // Match the existing owner-only workspace independently of REPORT_VIEW.
    if (!["CEO", "OWNER"].includes(user.role)) {
      throw new ForbiddenException(
        "Cloud is available to the Owner / CEO workspace.",
      );
    }

    if (
      isAssistantReportRequest(input.question) &&
      /\b(all reports|company|business|operations)\b/i.test(input.question) &&
      !/\b(month|year|week|today|yesterday|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(
        input.question,
      )
    ) {
      if (!this.reports) {
        throw new ServiceUnavailableException(
          "Report summaries are unavailable.",
        );
      }

      return answerReportBrief(user, input, this.reports);
    }

    if (this.tools && request) {
      return this.connectedAnswer(input, request);
    }

    return answerWithOpenRouter(input);
  }

  @Post("questions/stream")
  @Requires("REPORT_VIEW")
  async stream(
    @CurrentUser() user: User,
    @Body(new Validate(assistantQuestionSchema)) input: AssistantQuestion,
    @Res() response: Response,
    @Req() request?: AuthRequest,
  ) {
    if (!["CEO", "OWNER"].includes(user.role)) {
      throw new ForbiddenException(
        "Cloud is available to the Owner / CEO workspace.",
      );
    }

    const controller = new AbortController();

    const close = () => {
      return controller.abort();
    };

    response.on("close", close);

    response.status(200).set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    });

    response.flushHeaders();

    const send = (event: AssistantStreamEvent) => {
      if (!controller.signal.aborted) {
        response.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    };

    try {
      if (
        isAssistantReportRequest(input.question) &&
        /\b(all reports|company|business|operations)\b/i.test(input.question) &&
        !/\b(month|year|week|today|yesterday|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(
          input.question,
        )
      ) {
        send({ type: "status", label: "Reading your reports" });

        if (!this.reports) {
          throw new Error("Reports unavailable");
        }

        send({
          type: "complete",
          reply: await answerReportBrief(user, input, this.reports),
        });
      } else {
        send({ type: "status", label: "Preparing your answer" });

        for await (const event of this.tools && request
          ? answerWithTools(input, request, this.tools, {
              signal: controller.signal,
            })
          : streamFreshphones(input, { signal: controller.signal })) {
          send(event);
        }
      }
    } catch (error) {
      Logger.warn(
        {
          event: "assistant_stream_failed",
          reason: error instanceof Error ? error.name : "Unknown",
          message: redactModelText(
            error instanceof Error ? error.message : "Unknown failure",
          ).slice(0, 300),
        },
        "AssistantController",
      );

      send({
        type: "error",
        message:
          "The answer was interrupted. Please try again. Any text already received is kept below.",
      });
    } finally {
      response.off("close", close);

      if (!response.writableEnded) {
        response.end();
      }
    }
  }

  @Get("capabilities")
  @Requires("REPORT_VIEW")
  capabilities(@CurrentUser() user: User) {
    this.requireExecutive(user);

    return {
      operations: operationsFor(user).map(({ schema, ...operation }) => {
        return { ...operation, inputSchema: describeSchema(schema) };
      }),
    };
  }

  @Post("actions/:id/decision")
  @Requires("REPORT_VIEW")
  decide(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(
      new Validate(
        z.object({ decision: z.enum(["confirm", "cancel"]) }).strict(),
      ),
    )
    body: { decision: "confirm" | "cancel" },
    @Req() request: AuthRequest,
  ) {
    this.requireExecutive(user);

    if (!this.tools) {
      throw new ServiceUnavailableException("API tools are unavailable.");
    }

    return this.tools.decide(request, id, body.decision);
  }

  private requireExecutive(user: User) {
    if (!["CEO", "OWNER"].includes(user.role)) {
      throw new ForbiddenException(
        "Cloud is available to the Owner / CEO workspace.",
      );
    }
  }

  private async connectedAnswer(
    input: AssistantQuestion,
    request: AuthRequest,
  ) {
    for await (const event of answerWithTools(input, request, this.tools!, {
      signal: new AbortController().signal,
    })) {
      if (event.type === "complete") {
        return event.reply;
      }
    }

    throw new ServiceUnavailableException("The answer was incomplete.");
  }
}
