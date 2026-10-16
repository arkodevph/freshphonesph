import { after, test } from "node:test";
import assert from "node:assert/strict";
import {
  tsRequest,
  tsUpload,
  tsDownload,
  ApiError,
  toBatch,
  toPage,
} from "../lib/ts-api";

const originalFetch = globalThis.fetch;

after(() => {
  globalThis.fetch = originalFetch;
});

const json = (body: unknown, status = 200) => {
  return Response.json(body, { status });
};

test("concurrent expired requests share one cookie refresh and retry the original reads", async () => {
  let fresh = false;

  let rotations = 0;

  const attempts = new Map<string, number>();

  globalThis.fetch = async (input, options) => {
    const path = new URL(String(input)).pathname;

    assert.equal(options?.credentials, "include");

    assert.equal(new Headers(options?.headers).has("Authorization"), false);

    if (path.endsWith("/auth/me")) {
      return json({}, fresh ? 200 : 401);
    }

    if (path.endsWith("/auth/refresh")) {
      rotations++;

      await new Promise((resolve) => {
        return setTimeout(resolve, 10);
      });

      fresh = true;

      return json({});
    }

    attempts.set(path, (attempts.get(path) ?? 0) + 1);

    return json({ path }, fresh ? 200 : 401);
  };

  const results = await Promise.all([
    tsRequest("/batches"),
    tsRequest("/clients"),
  ]);

  assert.equal(rotations, 1);

  assert.deepEqual(results, [
    { path: "/api/batches" },
    { path: "/api/clients" },
  ]);

  assert.deepEqual([...attempts.values()], [2, 2]);
});

test("failed refresh stops retries, while login failures do not rotate another session", async () => {
  const paths: string[] = [];

  globalThis.fetch = async (input) => {
    paths.push(new URL(String(input)).pathname);

    return json({ message: "Invalid credentials" }, 401);
  };

  await assert.rejects(
    tsRequest("/auth/login", { method: "POST", body: "{}" }),
    (error: unknown) => {
      return error instanceof ApiError && error.status === 401;
    },
  );

  assert.deepEqual(paths, ["/api/auth/login"]);

  paths.length = 0;

  await assert.rejects(tsRequest("/clients"), /session expired/);

  assert.deepEqual(paths, [
    "/api/clients",
    "/api/auth/me",
    "/api/auth/refresh",
  ]);
});

test("permission and validation errors reach the form without refreshing or retrying a write", async () => {
  for (const status of [400, 403, 409, 500]) {
    let requests = 0;

    globalThis.fetch = async () => {
      requests++;

      return json({ message: "Review this record" }, status);
    };

    await assert.rejects(
      tsRequest("/batches", { method: "POST", body: "{}" }),
      (error: unknown) => {
        return (
          error instanceof ApiError &&
          error.status === status &&
          error.message === "Review this record"
        );
      },
    );

    assert.equal(requests, 1);
  }
});

test("the existing UI contract preserves UUIDs, missing plan terms and next-page information", () => {
  const batch = toBatch({
    id: "fd9c9a83-c948-4c80-80d7-03f73a9e3ba9",
    code: "LEGACY",
    model: "Phone",
    status: "PLANNED",
    startDate: "2026-09-01",
    endDate: "2027-03-01",
    contractPrice: null,
    installmentCount: null,
    cadence: null,
    version: 1,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    _count: { clients: 0 },
  });

  assert.equal(batch.id, "fd9c9a83-c948-4c80-80d7-03f73a9e3ba9");

  assert.equal(batch.contract_price, null);

  assert.equal(batch.status, "forming");

  assert.equal(
    toPage({ items: [batch], total: 21, page: 1, pageSize: 20 }, (item) => {
      return item;
    }).next,
    "2",
  );
});

test("rate limits reach reads, uploads and downloads with wait time and never retry a submission or expire the session", async () => {
  let calls = 0;

  globalThis.fetch = async () => {
    calls++;

    return Response.json(
      { message: "Too many requests. Please try again in 60 seconds." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  };

  for (const operation of [
    () => {
      return tsRequest("/agents/verify?q=SYNTHETIC");
    },
    () => {
      return tsUpload("/careers/apply", new FormData());
    },
    () => {
      return tsDownload("/reports/export");
    },
  ]) {
    const before = calls;

    await assert.rejects(operation(), (error) => {
      return (
        error instanceof ApiError &&
        error.status === 429 &&
        error.retryAfterSeconds === 60 &&
        /60 seconds/.test(error.message)
      );
    });

    assert.equal(calls, before + 1);
  }
});

test("rate limiting during session recovery keeps the actual wait message and stops the original write", async () => {
  const paths: string[] = [];

  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname;

    paths.push(path);

    return path.endsWith("/auth/me")
      ? Response.json(
          { message: "Please wait 5 seconds." },
          { status: 429, headers: { "Retry-After": "5" } },
        )
      : json({}, 401);
  };

  await assert.rejects(
    tsRequest("/tasks", { method: "POST", body: "{}" }),
    (error) => {
      return (
        error instanceof ApiError &&
        error.status === 429 &&
        error.retryAfterSeconds === 5 &&
        error.message === "Please wait 5 seconds."
      );
    },
  );

  assert.deepEqual(paths, ["/api/tasks", "/api/auth/me"]);
});

test("uploads and downloads refresh once and retain their body and response type", async () => {
  for (const kind of ["upload", "download"]) {
    const body = new FormData();

    body.set("receipt", "test-receipt");

    let attempts = 0;

    const paths: string[] = [];

    globalThis.fetch = async (input, options) => {
      const path = new URL(String(input)).pathname;

      paths.push(path);

      if (path.endsWith("/auth/me")) {
        return json({}, 401);
      }

      if (path.endsWith("/auth/refresh")) {
        return json({});
      }

      assert.equal(options?.credentials, "include");

      assert.equal(options?.cache, "no-store");

      if (kind === "upload") {
        assert.equal(options?.method, "POST");

        assert.equal(options?.body, body);

        assert.equal(new Headers(options?.headers).has("Content-Type"), false);
      }

      attempts++;

      return attempts === 1
        ? json({}, 401)
        : kind === "upload"
          ? json({ id: "saved-receipt" })
          : new Response("downloaded-document");
    };

    if (kind === "upload") {
      assert.deepEqual(await tsUpload("/receipts", body), {
        id: "saved-receipt",
      });
    } else {
      assert.equal(
        await (await tsDownload("/documents")).text(),
        "downloaded-document",
      );
    }

    const path = kind === "upload" ? "/api/receipts" : "/api/documents";

    assert.deepEqual(paths, [path, "/api/auth/me", "/api/auth/refresh", path]);
  }
});

test("requests, uploads and downloads signal required gates without retrying", async () => {
  const events: string[] = [];

  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      dispatchEvent: (event: Event) => {
        events.push(event.type);
      },
    },
  });

  try {
    for (const [status, event] of [
      [412, "fp-mfa-required"],
      [428, "fp-legal-required"],
    ] as const) {
      for (const operation of [
        () => {
          return tsRequest("/clients");
        },
        () => {
          return tsUpload("/receipts", new FormData());
        },
        () => {
          return tsDownload("/documents");
        },
      ]) {
        let attempts = 0;

        events.length = 0;

        globalThis.fetch = async () => {
          attempts++;

          return json({ message: "Complete the required step" }, status);
        };

        await assert.rejects(operation(), (error: unknown) => {
          return error instanceof ApiError && error.status === status;
        });

        assert.equal(attempts, 1);

        assert.deepEqual(events, [event]);
      }
    }
  } finally {
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});
