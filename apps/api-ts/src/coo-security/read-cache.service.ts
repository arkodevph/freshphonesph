import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  type OnModuleDestroy,
} from "@nestjs/common";
import { createHmac } from "node:crypto";
import { CONFIG, type Config } from "../config";
import { Database } from "../database";
import { canonicalJson } from "./request-replay";

const ttlMs = 5000;

const maximumValueBytes = 512 * 1024;

const maximumCacheBytes = 8 * 1024 * 1024;

type Entry = {
  json: string;
  expiresAt: number;
  bytes: number;
  timer?: ReturnType<typeof setTimeout>;
};

/** A disposable read shortcut. Response values exist only in this process's memory. */
@Injectable()
export class CooReadCache implements OnModuleDestroy {
  private readonly entries = new Map<string, Entry>();
  private readonly loads = new Map<string, Promise<unknown>>();
  private bytes = 0;
  private destroyed = false;
  readonly metrics = { hit: 0, miss: 0, coalesced: 0, invalid: 0, expired: 0 };

  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(CONFIG) private readonly config: Config,
  ) {}

  onModuleDestroy() {
    this.destroyed = true;

    for (const key of this.entries.keys()) {
      this.remove(key);
    }

    this.loads.clear();

    this.bytes = 0;
  }

  status() {
    this.expire();

    return {
      mode: "memory",
      ...this.metrics,
      entries: this.entries.size,
      bytes: this.bytes,
      inFlight: this.loads.size,
      maximumTtlMs: ttlMs,
    };
  }

  private remove(key: string) {
    const entry = this.entries.get(key);

    if (entry) {
      clearTimeout(entry.timer);

      this.bytes -= entry.bytes;

      this.entries.delete(key);
    }
  }

  private expire() {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= Date.now()) {
        this.remove(key);

        this.metrics.expired++;
      }
    }
  }

  private remember(key: string, entry: Entry) {
    if (this.destroyed) {
      return;
    }

    this.expire();

    this.remove(key);

    while (
      this.entries.size >= 32 ||
      this.bytes + entry.bytes > maximumCacheBytes
    ) {
      const oldest = this.entries.keys().next().value;

      if (oldest === undefined) {
        return;
      }

      this.remove(oldest);
    }

    this.entries.set(key, entry);

    this.bytes += entry.bytes;

    entry.timer = setTimeout(
      () => {
        if (this.entries.get(key) === entry) {
          this.remove(key);

          this.metrics.expired++;
        }
      },
      Math.max(0, entry.expiresAt - Date.now()),
    );

    entry.timer.unref();
  }

  async read<T>(identity: unknown, load: () => Promise<T>): Promise<T> {
    if (this.destroyed) {
      return load();
    }

    // Revision changes commit with business writes, not rate-limit/session bookkeeping.
    const [version] = await this.db.$queryRaw<
      { revision: string; boot: string; replica: boolean }[]
    >`
      SELECT version::text AS revision, pg_postmaster_start_time()::text AS boot,
        pg_is_in_recovery() AS replica FROM "CooReadRevision" WHERE id = 'global'`;

    if (!version || version.replica) {
      throw new ServiceUnavailableException(
        "Current reads require the primary database.",
      );
    }

    const key = createHmac(
      "sha256",
      this.config.BETTER_AUTH_SECRET ?? this.config.JWT_SECRET!,
    )
      .update(canonicalJson({ schema: "coo-read-v1", version, identity }))
      .digest("hex");

    this.expire();

    const entry = this.entries.get(key);

    if (entry && entry.expiresAt > Date.now()) {
      try {
        const value = JSON.parse(entry.json) as T;

        this.metrics.hit++;

        return value;
      } catch {
        this.metrics.invalid++;

        this.remove(key);
      }
    }

    const pending = this.loads.get(key);

    if (pending) {
      this.metrics.coalesced++;

      const value = await pending;

      return (
        value === undefined ? undefined : JSON.parse(JSON.stringify(value))
      ) as T;
    }

    this.metrics.miss++;

    const fill = async () => {
      const started = Date.now();

      const value = await load();

      const json = JSON.stringify(value);

      const expiresAt =
        started + Math.floor(ttlMs * (0.9 + Math.random() * 0.1));

      if (json !== undefined && expiresAt > Date.now()) {
        const bytes = Buffer.byteLength(json, "utf8");

        if (bytes <= maximumValueBytes) {
          this.remember(key, { json, bytes, expiresAt });
        }
      }

      return value;
    };

    const promise = fill();

    if (this.loads.size < 32) {
      this.loads.set(key, promise);
    }

    try {
      return await promise;
    } finally {
      if (this.loads.get(key) === promise) {
        this.loads.delete(key);
      }
    }
  }
}
