import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { effectivePermissions } from "@freshphones/contracts";
import { AssistantToolsService } from "../src/assistant/tools.service";
import { operationsFor } from "../src/assistant/operations";
import { Database } from "../src/database";
import type { Config } from "../src/config";
import type { User } from "@freshphones/contracts";

const user: User = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Synthetic CEO",
  email: "ceo@example.test",
  role: "CEO",
  clientId: null,
  permissions: effectivePermissions({ role: "CEO" }),
};

const request = {
  user,
  sessionId: "test-session",
  headers: { cookie: "synthetic-session" },
};

test("raw tool dispatch cannot execute an unconfirmed write or a forged operation", async () => {
  const tools = new AssistantToolsService({} as Database, {} as Config);

  await assert.rejects(
    tools.call(request, tools.operation(user, "jobs.create"), {
      body: { title: "Must not create", isOpen: false },
    }),
    /confirm/i,
  );

  const allowed = tools.operation(user, "jobs.list");

  await assert.rejects(
    tools.call(request, { ...allowed, path: "/accounts" }, {}),
    /allowlist/i,
  );
});

test("chat cannot approve or execute irreversible retention actions", () => {
  const operations = operationsFor(user).map((operation) => {
    return operation.name;
  });

  assert.ok(operations.includes("retention.preview"));

  assert.ok(operations.includes("retention.request"));

  assert.ok(!operations.includes("retention.decision"));

  assert.ok(!operations.includes("retention.execute"));
});

import {
  AssistantRunBudget,
  assertSafeQuestion,
  readToolResponse,
  serializeModelData,
} from "../src/assistant/guardrails";
import { answerWithTools } from "../src/assistant/agent";
import { answerWithOpenRouter } from "../src/assistant/openrouter";
import { streamFreshphones } from "../src/assistant/stream";

const syntheticSecret = "sk-synthetic-credential-for-regression-only";

async function drain(events: AsyncIterable<unknown>) {
  for await (const event of events) {
    void event;
  }
}

function modelResponse(delta: unknown, finish: string) {
  return new Response(
    `data: ${JSON.stringify({ choices: [{ delta, finish_reason: finish }] })}\n\ndata: [DONE]\n\n`,
  );
}

test("credential minimization covers nested fields, environment values and free-text credentials", () => {
  process.env.FRESH_AI_TEST_SECRET = "synthetic-environment-credential";

  try {
    const text = serializeModelData({
      safe: "visible record",
      nested: [{ password_hash: "private-hash", accessToken: "private-token" }],
      note: `${syntheticSecret} password=hunter-example Bearer synthetic-bearer-value`,
      env: process.env.FRESH_AI_TEST_SECRET,
    });

    assert.match(text, /visible record/);

    assert.doesNotMatch(
      text,
      /private-hash|private-token|hunter-example|sk-synthetic|synthetic-bearer|synthetic-environment/,
    );

    assert.throws(() => {
      return assertSafeQuestion(`Please use ${syntheticSecret}`);
    }, /Remove/);
  } finally {
    delete process.env.FRESH_AI_TEST_SECRET;
  }
});

test("all provider entry points reject credential-bearing questions before a model call", async () => {
  let fetches = 0;

  const fetcher: typeof fetch = async () => {
    fetches++;

    throw new Error("must not fetch");
  };

  const input = { question: `Use ${syntheticSecret}` };

  const options = {
    apiKey: "synthetic",
    fetcher,
    signal: new AbortController().signal,
  };

  await assert.rejects(answerWithOpenRouter(input, options), /Remove/);

  await assert.rejects(drain(streamFreshphones(input, options)), /Remove/);

  await assert.rejects(
    drain(
      answerWithTools(
        input,
        request,
        new AssistantToolsService({} as Database, {} as Config),
        options,
      ),
    ),
    /Remove/,
  );

  assert.equal(fetches, 0);
});

test("tool budget enforces calls, shared deadline, per-result truncation and aggregate bytes", () => {
  const budget = new AssistantRunBudget(new AbortController().signal);

  for (let i = 0; i < 24; i++) {
    budget.toolCall();
  }

  assert.throws(() => {
    return budget.toolCall();
  }, /tool limit/);

  const text = budget.result({ data: "界".repeat(30_000) });

  assert.equal(JSON.parse(text).truncated, true);

  assert.ok(Buffer.byteLength(text) < 30_000);

  const bytes = new AssistantRunBudget(new AbortController().signal);

  for (let i = 0; i < 4; i++) {
    bytes.result("a".repeat(29_000));
  }

  assert.throws(() => {
    return bytes.result("a".repeat(29_000));
  }, /data limit/);

  const controller = new AbortController();

  const aborted = new AssistantRunBudget(controller.signal);

  controller.abort();

  assert.throws(() => {
    return aborted.toolCall();
  }, /abort/i);
});

test("oversized API responses cancel consumption before JSON parsing", async () => {
  let cancelled = false;

  const response = new Response(
    new ReadableStream({
      pull(controller) {
        controller.enqueue(new Uint8Array(600_000));
      },
      cancel() {
        cancelled = true;
      },
    }),
  );

  await assert.rejects(readToolResponse(response), /too much data/);

  assert.equal(cancelled, true);

  assert.deepEqual(await readToolResponse(new Response('{"ok":true}')), {
    ok: true,
  });
});

test("history and live tool data are redacted in actual provider payloads", async () => {
  const executor = new AssistantToolsService({} as Database, {} as Config);

  executor.read = async () => {
    return {
      title: "Visible",
      api_key: "private-fixture",
      note: syntheticSecret,
    };
  };

  let turn = 0;

  await drain(
    answerWithTools(
      {
        question: "List jobs",
        history: [{ role: "user", content: syntheticSecret }],
      },
      request,
      executor,
      {
        signal: new AbortController().signal,
        apiKey: "synthetic",
        fetcher: async (_url, options) => {
          const payload = String(options?.body);

          assert.doesNotMatch(payload, /sk-synthetic|private-fixture/);

          if (turn++ === 0) {
            return modelResponse(
              {
                tool_calls: [
                  {
                    index: 0,
                    id: "call",
                    function: {
                      name: "read_data",
                      arguments: JSON.stringify({
                        operation: "jobs.list",
                        input: {},
                      }),
                    },
                  },
                ],
              },
              "tool_calls",
            );
          }

          assert.match(payload, /Visible/);

          return modelResponse({ content: "Jobs listed." }, "stop");
        },
      },
    ),
  );

  assert.equal(turn, 2);
});

test("the model loop stops before dispatching its 25th tool call", async () => {
  const executor = new AssistantToolsService({} as Database, {} as Config);

  let reads = 0;

  executor.read = async () => {
    reads++;

    return {};
  };

  await assert.rejects(
    drain(
      answerWithTools({ question: "List jobs" }, request, executor, {
        signal: new AbortController().signal,
        apiKey: "synthetic",
        fetcher: async () => {
          return modelResponse(
            {
              tool_calls: Array.from({ length: 4 }, (_, index) => {
                return {
                  index,
                  id: `call-${index}`,
                  function: {
                    name: "read_data",
                    arguments: JSON.stringify({
                      operation: "jobs.list",
                      input: {},
                    }),
                  },
                };
              }),
            },
            "tool_calls",
          );
        },
      }),
    ),
    /tool limit/,
  );

  assert.equal(reads, 24);
});
