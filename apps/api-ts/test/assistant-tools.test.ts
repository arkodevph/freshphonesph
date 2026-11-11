import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assistantQuestionSchema,
  effectivePermissions,
} from "@freshphones/contracts";
import { assistantPermissions } from "../src/assistant/access";
import { freshphonesInstructions } from "../src/assistant/policy";
import { buildEditBody } from "../src/assistant/edits";

test("follow-up data requests preserve the earlier earnings question", () => {
  assert.equal(
    assistantQuestionSchema.safeParse({
      question: "give me the data here",
      history: [
        { role: "user", content: "show earnings this month" },
        { role: "assistant", content: "Which earnings?" },
      ],
    }).success,
    true,
  );
});

test("connected instructions permit real API tools instead of claiming records are unavailable", () => {
  assert.doesNotMatch(
    freshphonesInstructions,
    /No database, live reports|never checking, retrieving|cannot perform that change from chat/,
  );
});

test("assistant has scoped operational capabilities without changing Owner CEO portal permissions", () => {
  for (const role of ["CEO", "OWNER"] as const) {
    const permissions = [...assistantPermissions];

    for (const permission of [
      "BATCH_CREATE",
      "BATCH_MANAGE",
      "CATALOG_MANAGE",
      "CLIENT_READ",
    ]) {
      assert.ok(
        permissions.includes(permission as (typeof permissions)[number]),
        permission,
      );
    }

    assert.ok(!permissions.includes("PAYMENT_VERIFY"));

    assert.ok(!permissions.includes("ACCOUNT_MANAGE"));

    assert.deepEqual(effectivePermissions({ role }), ["REPORT_VIEW"]);
  }
});

import { answerWithTools } from "../src/assistant/agent";
import { AssistantToolsService } from "../src/assistant/tools.service";
import {
  assistantOperations,
  describeSchema,
} from "../src/assistant/operations";
import { Database } from "../src/database";
import type { Config } from "../src/config";
import type { User, AssistantStreamEvent } from "@freshphones/contracts";

const identity: User = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Synthetic CEO",
  email: "ceo@example.test",
  role: "CEO",
  clientId: null,
  permissions: effectivePermissions({ role: "CEO" }),
};

const request = {
  user: identity,
  sessionId: "synthetic-session",
  headers: { cookie: "private-session-cookie" },
};

const sse = (delta: unknown, finish: string) => {
  return new Response(
    `data: ${JSON.stringify({ choices: [{ delta, finish_reason: finish }] })}\n\ndata: [DONE]\n\n`,
    { headers: { "Content-Type": "text/event-stream" } },
  );
};

const tool = (name: string, args: unknown) => {
  return {
    tool_calls: [
      {
        index: 0,
        id: "call-1",
        function: { name, arguments: JSON.stringify(args) },
      },
    ],
  };
};

test("tool loop fetches earnings for a contextual follow-up before answering with actual numbers", async () => {
  const executor = new AssistantToolsService({} as Database, {} as Config);

  let reads = 0;

  executor.read = async (_request, name, input) => {
    reads++;

    assert.equal(name, "reports.installment_earnings");

    assert.deepEqual(input, {
      query: { year: 2026, frequency: "MONTHLY", period: 11 },
    });

    return {
      totals: { scheduledAmount: "63000.00" },
      dateFrom: "2026-11-01",
      dateTo: "2026-11-30",
    };
  };

  const events: AssistantStreamEvent[] = [];

  let turns = 0;

  for await (const event of answerWithTools(
    {
      question: "give me the data here",
      history: [{ role: "user", content: "earnings this month" }],
    },
    request,
    executor,
    {
      signal: new AbortController().signal,
      apiKey: "synthetic-key",
      fetcher: async (_url, options) => {
        const body = JSON.parse(String(options?.body));

        assert.equal(body.tools.length, 4);

        assert.doesNotMatch(
          JSON.stringify(body),
          /private-session-cookie|synthetic-key/,
        );

        assert.ok(
          body.messages.some((message: { content: string }) => {
            return message.content === "earnings this month";
          }),
        );

        if (turns++ === 0) {
          return sse(
            tool("read_data", {
              operation: "reports.installment_earnings",
              input: {
                query: { year: 2026, frequency: "MONTHLY", period: 11 },
              },
            }),
            "tool_calls",
          );
        }

        assert.match(body.messages.at(-1).content, /63000.00/);

        return sse(
          {
            content:
              "November scheduled installments total ₱63,000.00; this is not collected profit.",
          },
          "stop",
        );
      },
    },
  )) {
    events.push(event);
  }

  assert.equal(reads, 1);

  assert.equal(events.at(-1)?.type, "complete");

  assert.ok(
    events.some((event) => {
      return event.type === "delta";
    }),
  );
});

test("all exposed operations have field documentation and writes cannot use the read tool", async () => {
  const executor = new AssistantToolsService({} as Database, {} as Config);

  for (const operation of assistantOperations) {
    assert.ok(operation.description.length > 20);

    assert.ok(describeSchema(operation.schema));

    assert.doesNotMatch(
      operation.path,
      /auth|accounts|password|verify|finance|hr-actions/,
    );
  }

  await assert.rejects(
    executor.read(request, "catalog.create", {}),
    /must be proposed/,
  );

  assert.throws(() => {
    return executor.operation(identity, "http://example.test");
  }, /not available/);

  assert.throws(() => {
    return executor.operation(identity, "payments.verify");
  }, /not available/);
});

test("a proposed write reaches the user without invoking an API mutation", async () => {
  const executor = new AssistantToolsService({} as Database, {} as Config);

  let proposed = 0;

  executor.propose = async (_request, operation, input) => {
    proposed++;

    return {
      id: "00000000-0000-4000-8000-000000000002",
      operation,
      description: "Create job",
      input: input as Record<string, unknown>,
      expiresAt: new Date().toISOString(),
      status: "pending",
    };
  };

  executor.call = async () => {
    throw new Error("A write must not run in the model loop");
  };

  let turns = 0;

  const events: AssistantStreamEvent[] = [];

  for await (const event of answerWithTools(
    { question: "Create a draft job titled Synthetic support" },
    request,
    executor,
    {
      signal: new AbortController().signal,
      apiKey: "test",
      fetcher: async () => {
        return turns++ === 0
          ? sse(
              tool("propose_change", {
                operation: "jobs.create",
                input: { body: { title: "Synthetic support", isOpen: false } },
              }),
              "tool_calls",
            )
          : sse(
              { content: "Review the draft job and confirm to create it." },
              "stop",
            );
      },
    },
  )) {
    events.push(event);
  }

  assert.equal(proposed, 1);

  const final = events.at(-1);

  assert.equal(final?.type, "complete");

  if (final?.type === "complete") {
    assert.equal(final.reply.actions?.[0].status, "pending");
  }
});

test("partial edits load fresh fields/version and preserve unrequested job details", async () => {
  const executor = new AssistantToolsService({} as Database, {} as Config);

  const id = "00000000-0000-4000-8000-000000000002";

  let reads = 0;

  let proposals = 0;

  executor.read = async (_request, operation, input) => {
    reads++;

    assert.equal(operation, "jobs.detail");

    assert.deepEqual(input, { id });

    return {
      id,
      version: 7,
      title: "Original title",
      description: "Keep these instructions",
      location: "Manila",
      employmentType: "Full time",
      isOpen: true,
      createdAt: "private metadata",
    };
  };

  executor.propose = async (_request, operation, input) => {
    proposals++;

    assert.equal(operation, "jobs.update");

    assert.deepEqual(input, {
      id,
      body: {
        version: 7,
        record: {
          title: "Updated title",
          description: "Keep these instructions",
          location: "Manila",
          employmentType: "Full time",
          isOpen: true,
        },
      },
    });

    return {
      id,
      operation,
      input: input as Record<string, unknown>,
      description: "Review edit",
      status: "pending",
      expiresAt: new Date().toISOString(),
    };
  };

  const action = await executor.proposeEdit(request, "jobs.update", {
    id,
    changes: { title: "Updated title" },
  });

  assert.equal(action.status, "pending");

  assert.equal(reads, 1);

  assert.equal(proposals, 1);
});

test("partial edits reject protected fields, empty changes and unsupported operations before reading", async () => {
  const executor = new AssistantToolsService({} as Database, {} as Config);

  executor.read = async () => {
    throw new Error("must not read");
  };

  const id = "00000000-0000-4000-8000-000000000002";

  for (const changes of [
    { version: 3 },
    { id },
    { role: "SYSTEM_ADMIN" },
    {},
  ]) {
    await assert.rejects(
      executor.proposeEdit(request, "jobs.update", { id, changes }),
      /editable|field|change/i,
    );
  }

  await assert.rejects(
    executor.proposeEdit(request, "jobs.create", {
      id,
      changes: { title: "No" },
    }),
    /partial edit/i,
  );
});

test("partial edits reject unchanged or invalid values and retain nullable optional record fields", async () => {
  const batch = {
    version: 4,
    code: "AB-001",
    model: "iPhone 15",
    status: "PLANNED",
    startDate: "2026-11-01",
    endDate: "2027-11-01",
    contractPrice: null,
    installmentCount: null,
    cadence: null,
    firstDueDate: null,
    monthEnd: false,
  };

  const edited = buildEditBody("records.update_batch", batch, {
    model: "iPhone 16",
  });

  assert.equal(edited.version, 4);

  assert.equal(edited.record.model, "iPhone 16");

  assert.equal(edited.record.code, "AB-001");

  assert.equal(edited.record.firstDueDate, null);

  assert.throws(() => {
    return buildEditBody("records.update_batch", batch, { model: "iPhone 15" });
  }, /No change/);

  assert.throws(() => {
    return buildEditBody("records.update_batch", batch, { status: "INVENTED" });
  });

  assert.deepEqual(
    buildEditBody(
      "support.update",
      { version: 8, status: "OPEN", assignedStaffId: null, resolution: "" },
      { resolution: "Reviewed concern" },
    ),
    {
      version: 8,
      status: "OPEN",
      assignedStaffId: null,
      resolution: "Reviewed concern",
    },
  );
});

test("tool loop follows pagination and dispatches a partial edit as a pending proposal", async () => {
  const executor = new AssistantToolsService({} as Database, {} as Config);

  const id = "00000000-0000-4000-8000-000000000002";

  executor.read = async () => {
    return {
      items: [{ id, title: "Original" }],
      page: 1,
      pageSize: 20,
      total: 21,
    };
  };

  executor.proposeEdit = async (_request, name, input) => {
    assert.equal(name, "jobs.update");

    assert.deepEqual(input, { id, changes: { title: "New title" } });

    return {
      id,
      operation: name,
      input: input as Record<string, unknown>,
      description: "Review title",
      status: "pending",
      expiresAt: new Date().toISOString(),
    };
  };

  let turn = 0;

  let complete;

  for await (const event of answerWithTools(
    { question: "Find the job and rename it to New title" },
    request,
    executor,
    {
      signal: new AbortController().signal,
      apiKey: "synthetic",
      fetcher: async (_url, options) => {
        const body = JSON.parse(String(options?.body));

        if (turn++ === 0) {
          return sse(
            tool("read_data", { operation: "jobs.list", input: { query: {} } }),
            "tool_calls",
          );
        }

        if (turn === 2) {
          assert.deepEqual(
            JSON.parse(body.messages.at(-1).content).pagination,
            { page: 1, pageSize: 20, total: 21, nextPage: 2 },
          );

          return sse(
            tool("propose_edit", {
              operation: "jobs.update",
              input: { id, changes: { title: "New title" } },
            }),
            "tool_calls",
          );
        }

        assert.match(body.messages.at(-1).content, /pending_confirmation/);

        return sse({ content: "Review the title change and confirm." }, "stop");
      },
    },
  )) {
    if (event.type === "complete") {
      complete = event.reply;
    }
  }

  assert.equal(complete?.actions?.[0].status, "pending");
});
