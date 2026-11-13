import {
  Inject,
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { Database } from "../database";

/** Retention of durable retry outcomes is separate from the ephemeral response cache. */
@Injectable()
export class CooReplayMaintenance implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private cleaning = false;
  constructor(@Inject(Database) private readonly db: Database) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      return void this.scrub();
    }, 60_000);

    this.timer.unref();

    void this.scrub();
  }
  onModuleDestroy() {
    clearInterval(this.timer);
  }
  private async scrub() {
    if (this.cleaning) {
      return;
    }

    this.cleaning = true;

    try {
      await this.db.$executeRaw`UPDATE "CooRequestReplay" SET result = NULL
        WHERE ("actorId", "keyHash") IN (
          SELECT "actorId", "keyHash" FROM "CooRequestReplay"
          WHERE "expiresAt" <= statement_timestamp() AND result IS NOT NULL
          ORDER BY "expiresAt" LIMIT 100
        )`;
    } catch {
      // Cleanup failure never permits an old key to execute a command twice.
    } finally {
      this.cleaning = false;
    }
  }
}
