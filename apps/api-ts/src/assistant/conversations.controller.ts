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
  Patch,
  Post,
  ForbiddenException,
} from "@nestjs/common";
import {
  assistantConversationWriteSchema,
  assistantConversationMetadataSchema,
  assistantProjectWriteSchema,
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
      throw new ForbiddenException("The active account changed. Reopen Cloud.");
    }

    return this.conversations.save(user.id, id, body.revision, body.state);
  }

  @Patch(":id")
  @AbusePolicy("accountWrite")
  @Header("Cache-Control", "private, no-store")
  metadata(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(assistantConversationMetadataSchema))
    body: z.infer<typeof assistantConversationMetadataSchema>,
  ) {
    this.requireExecutive(user);

    if (body.accountId !== user.id) {
      throw new ForbiddenException("The active account changed. Reopen Cloud.");
    }

    return this.conversations.metadata(user.id, id, body);
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
        "Cloud is available to the Owner / CEO workspace.",
      );
    }
  }
}

@Controller("assistant/projects")
@Requires("REPORT_VIEW")
@AbusePolicy("accountRead")
export class AssistantProjectsController {
  constructor(
    @Inject(AssistantConversationsService)
    private readonly conversations: AssistantConversationsService,
  ) {}

  private executive(user: User, accountId?: string) {
    if (
      !["CEO", "OWNER"].includes(user.role) ||
      (accountId && accountId !== user.id)
    ) {
      throw new ForbiddenException(
        "Reopen Cloud with the correct Owner / CEO account.",
      );
    }
  }

  @Get()
  @Header("Cache-Control", "private, no-store")
  list(@CurrentUser() user: User) {
    this.executive(user);

    return this.conversations.projects(user.id);
  }

  @Post()
  @AbusePolicy("accountWrite")
  create(
    @CurrentUser() user: User,
    @Body(new Validate(assistantProjectWriteSchema))
    body: z.infer<typeof assistantProjectWriteSchema>,
  ) {
    this.executive(user, body.accountId);

    return this.conversations.createProject(user.id, body.name);
  }

  @Patch(":id")
  @AbusePolicy("accountWrite")
  rename(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(
      new Validate(
        assistantProjectWriteSchema.extend({
          revision: z.number().int().positive(),
        }),
      ),
    )
    body: z.infer<typeof assistantProjectWriteSchema> & { revision: number },
  ) {
    this.executive(user, body.accountId);

    return this.conversations.renameProject(
      user.id,
      id,
      body.name,
      body.revision,
    );
  }

  @Delete(":id")
  @AbusePolicy("accountWrite")
  remove(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    this.executive(user);

    return this.conversations.removeProject(user.id, id);
  }
}
