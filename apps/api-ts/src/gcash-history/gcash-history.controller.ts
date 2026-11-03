import {
  Body,
  Controller,
  Get,
  HttpCode,
  Header,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import {
  gcashHistoryQuerySchema,
  gcashHistoryReviewSchema,
  gcashHistoryUploadSchema,
  gcashCorrectionSchema,
  gcashArchiveSchema,
  type GcashCorrection,
  type GcashArchive,
  type GcashHistoryQuery,
  type GcashHistoryReview,
  type GcashHistoryUpload,
  type User,
} from "@freshphones/contracts";
import { z } from "zod";
import { CurrentUser, Requires } from "../auth/access";
import { AbusePolicy } from "../abuse/policies";
import { Validate } from "../http";
import type { PrivateUpload } from "../storage/private-storage.service";
import { GcashHistoryService } from "./gcash-history.service";

const pages = z
  .object({ page: z.coerce.number().int().min(1).max(100000).default(1) })
  .strict();

const readingQuery = pages.extend({
  source: z.enum(["current", "original"]).default("current"),
});

@Controller("gcash-history")
export class GcashHistoryController {
  constructor(
    @Inject(GcashHistoryService) private readonly history: GcashHistoryService,
  ) {}

  @Get() @Requires("GCASH_HISTORY_READ") list(
    @CurrentUser() user: User,
    @Query(new Validate(gcashHistoryQuerySchema)) query: GcashHistoryQuery,
  ) {
    return this.history.list(user, query);
  }

  @Post()
  @Requires("GCASH_HISTORY_UPLOAD")
  @AbusePolicy("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 6 },
    }),
  )
  upload(
    @CurrentUser() user: User,
    @Body(new Validate(gcashHistoryUploadSchema)) input: GcashHistoryUpload,
    @UploadedFile() file?: PrivateUpload,
  ) {
    return this.history.upload(user, input, file);
  }

  @Get("submissions/:id/reading")
  @Requires("GCASH_HISTORY_READ")
  @Header("Cache-Control", "private, no-store")
  reading(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Query(new Validate(readingQuery)) query: z.infer<typeof readingQuery>,
  ) {
    return this.history.reading(user, id, query.page, query.source);
  }

  @Post("submissions/:id/corrections")
  @HttpCode(200)
  @Requires("GCASH_HISTORY_REVIEW")
  correct(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(gcashCorrectionSchema)) input: GcashCorrection,
  ) {
    return this.history.correct(user, id, input);
  }

  @Get("submissions/:id/corrections")
  @Header("Cache-Control", "private, no-store")
  @Requires("GCASH_HISTORY_READ")
  corrections(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Query(new Validate(pages)) query: z.infer<typeof pages>,
  ) {
    return this.history.corrections(user, id, query.page);
  }

  @Post(":id/archive")
  @HttpCode(200)
  @Requires("GCASH_HISTORY_REVIEW")
  archive(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(gcashArchiveSchema)) input: GcashArchive,
  ) {
    return this.history.archive(user, id, input);
  }

  @Get("submissions/:id/file")
  @Requires("GCASH_HISTORY_READ")
  @AbusePolicy("download")
  async download(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const file = await this.history.download(user, id);

    response.type("application/pdf");

    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.originalName.replace(/[^\x20-\x7e]|["\\/]/g, "_")}"`,
    );

    response.setHeader("Cache-Control", "private, no-store");

    response.setHeader(
      "Content-Security-Policy",
      "sandbox; default-src 'none'",
    );

    response.send(file.data);
  }

  @Get(":id") @Requires("GCASH_HISTORY_READ") get(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.history.get(user, id);
  }

  @Get(":id/submissions") @Requires("GCASH_HISTORY_READ") submissions(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Query(new Validate(pages)) query: z.infer<typeof pages>,
  ) {
    return this.history.submissions(user, id, query.page);
  }

  @Get(":id/activity")
  @Header("Cache-Control", "private, no-store")
  @Requires("GCASH_HISTORY_READ")
  activity(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Query(new Validate(pages)) query: z.infer<typeof pages>,
  ) {
    return this.history.activity(user, id, query.page);
  }

  @Post(":id/review") @HttpCode(200) @Requires("GCASH_HISTORY_REVIEW") review(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(gcashHistoryReviewSchema)) input: GcashHistoryReview,
  ) {
    return this.history.review(user, id, input);
  }
}
