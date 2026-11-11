import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Inject,
  Param,
  ParseUUIDPipe,
  Put,
  ForbiddenException,
} from "@nestjs/common";
import {
  assistantConversationWriteSchema,
  type User,
} from "@freshphones/contracts";
import { z } from "zod";
import { CurrentUser, Requires } from "../auth/access";
import { AbusePolicy } from "../abuse/policies";
import { Validate } from "../http";
import { AssistantConversationsService } from "./conversations.service";

@Controller("assistant/conversations")
@Requires("REPORT_VIEW")
@AbusePolicy("accountRead")
export class AssistantConversationsController {
  constructor(
    @Inject(AssistantConversationsService)
    private readonly conversations: AssistantConversationsService,
  ) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  list(@CurrentUser() user: User) {
    this.requireExecutive(user);

    return this.conversations.list(user.id);
  }

  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  get(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    this.requireExecutive(user);

    return this.conversations.get(user.id, id);
  }

  @Put(":id")
  @AbusePolicy("accountWrite")
  @Header("Cache-Control", "private, no-store")
  save(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(assistantConversationWriteSchema))
    body: z.infer<typeof assistantConversationWriteSchema>,
  ) {
    this.requireExecutive(user);

    if (body.accountId !== user.id) {
      throw new ForbiddenException(
        "The active account changed. Reopen Fresh AI.",
      );
    }

    return this.conversations.save(user.id, id, body.revision, body.state);
  }

  @Delete(":id")
  @AbusePolicy("accountWrite")
  @Header("Cache-Control", "private, no-store")
  remove(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    this.requireExecutive(user);

    return this.conversations.remove(user.id, id);
  }

  private requireExecutive(user: User) {
    if (!["CEO", "OWNER"].includes(user.role)) {
      throw new ForbiddenException(
        "Fresh AI is available to the Owner / CEO workspace.",
      );
    }
  }
}
