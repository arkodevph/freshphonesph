import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { Redis } from "ioredis";
import {
  assistantConversationStateSchema,
  type AssistantConversation,
  type AssistantConversationState,
} from "@freshphones/contracts";
import { Database } from "../database";
import { CONFIG, type Config } from "../config";
import { Prisma } from "../generated/prisma/client";

@Injectable()
export class AssistantConversationsService implements OnApplicationShutdown {
  private readonly redis: Redis | null;
  private readonly local = new Map<
    string,
    { value: string; expires: number }
  >();
  private readonly loads = new Map<string, Promise<AssistantConversation>>();
  readonly cacheMetrics = {
    hit: 0,
    miss: 0,
    invalid: 0,
    fallback: 0,
    coalesced: 0,
  };

  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(CONFIG) private readonly config: Config,
  ) {
    this.redis = config.REDIS_URL
      ? new Redis(config.REDIS_URL, {
          lazyConnect: true,
          enableOfflineQueue: false,
          maxRetriesPerRequest: 0,
          connectTimeout: 150,
          commandTimeout: 150,
          retryStrategy: () => {
            return null;
          },
        })
      : null;

    this.redis?.on("error", () => {});
  }

  onApplicationShutdown() {
    this.redis?.disconnect();
  }

  list(userId: string) {
    return this.db.assistantConversation.findMany({
      where: { userId },
      select: { id: true, title: true, revision: true, updatedAt: true },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 100,
    });
  }

  async get(userId: string, id: string): Promise<AssistantConversation> {
    // Ownership and current version are read from PostgreSQL before every cache lookup.
    const row = await this.db.assistantConversation.findFirst({
      where: { id, userId },
      select: { id: true, title: true, revision: true, updatedAt: true },
    });

    if (!row) {
      throw new NotFoundException("Conversation not found.");
    }

    const key = `${this.config.REDIS_NAMESPACE ?? "freshphones-local"}:assistant:v1:user:${userId}:conversation:${id}:revision:${row.revision}`;

    const cached = await this.readCache(key);

    if (cached) {
      try {
        const state = assistantConversationStateSchema.parse(
          JSON.parse(cached),
        );

        this.cacheMetrics.hit++;

        return { ...row, updatedAt: row.updatedAt.toISOString(), state };
      } catch {
        this.cacheMetrics.invalid++;

        await this.removeCache(key);
      }
    }

    this.cacheMetrics.miss++;

    const pending = this.loads.get(key);

    if (pending) {
      this.cacheMetrics.coalesced++;

      return pending;
    }

    const load = async (): Promise<AssistantConversation> => {
      const current = await this.db.assistantConversation.findFirst({
        where: { id, userId, revision: row.revision },
      });

      if (!current) {
        throw new ConflictException(
          "Conversation changed. Reopen it to load the latest version.",
        );
      }

      const state = assistantConversationStateSchema.parse(current.state);

      // Immutable revision keys prevent an old concurrent fill from replacing newer data.
      await this.writeCache(key, JSON.stringify(state));

      return { ...row, updatedAt: row.updatedAt.toISOString(), state };
    };

    const request = load().finally(() => {
      this.loads.delete(key);
    });

    this.loads.set(key, request);

    return request;
  }

  async save(
    userId: string,
    id: string,
    revision: number,
    state: AssistantConversationState,
  ) {
    const title = state.questions[0]?.text.slice(0, 100) || "New conversation";

    const payload = state as unknown as Prisma.InputJsonValue;

    if (revision === 0) {
      try {
        const row = await this.db.assistantConversation.create({
          data: { id, userId, title, state: payload },
        });

        return {
          id: row.id,
          title: row.title,
          revision: row.revision,
          updatedAt: row.updatedAt.toISOString(),
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new ConflictException(
            "Conversation already exists. Reopen it before saving.",
          );
        }

        throw error;
      }
    }

    const row = await this.db.$transaction(async (tx) => {
      const updated = await tx.assistantConversation.updateMany({
        where: { id, userId, revision },
        data: { title, state: payload, revision: { increment: 1 } },
      });

      if (!updated.count) {
        throw new ConflictException(
          "Conversation changed in another tab. Reopen it before saving.",
        );
      }

      return tx.assistantConversation.findFirstOrThrow({
        where: { id, userId },
        select: { id: true, title: true, revision: true, updatedAt: true },
      });
    });

    return { ...row, updatedAt: row.updatedAt.toISOString() };
  }

  async remove(userId: string, id: string) {
    await this.db.assistantConversation.deleteMany({ where: { id, userId } });

    return { deleted: true };
  }

  private async readCache(key: string) {
    const shared = await this.cache(async (redis) => {
      return redis.get(key);
    });

    if (shared !== null) {
      return shared;
    }

    const entry = this.local.get(key);

    if (entry && entry.expires > Date.now()) {
      return entry.value;
    }

    this.local.delete(key);

    return null;
  }

  private async removeCache(key: string) {
    this.local.delete(key);

    await this.cache(async (redis) => {
      return redis.del(key);
    });
  }

  private async writeCache(key: string, value: string) {
    for (const [existing, entry] of this.local) {
      if (entry.expires <= Date.now()) {
        this.local.delete(existing);
      }
    }

    this.local.delete(key);

    while (this.local.size >= 16) {
      const oldest = this.local.keys().next().value;

      if (oldest) {
        this.local.delete(oldest);
      }
    }

    // At most 16 payloads / 8 MB serialized UTF-8, plus JavaScript runtime overhead.
    this.local.set(key, {
      value,
      expires: Date.now() + 27000 + Math.floor(Math.random() * 6001),
    });

    await this.cache(async (redis) => {
      return redis.set(key, value, "EX", 270 + Math.floor(Math.random() * 61));
    });
  }

  private async cache<T>(
    operation: (redis: Redis) => Promise<T>,
  ): Promise<T | null> {
    if (!this.redis) {
      return null;
    }

    try {
      if (this.redis.status === "wait") {
        await this.redis.connect();
      }

      if (this.redis.status !== "ready") {
        this.cacheMetrics.fallback++;

        return null;
      }

      return await operation(this.redis);
    } catch {
      this.cacheMetrics.fallback++;

      return null;
    }
  }
}
