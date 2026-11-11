import { test } from "node:test";
import assert from "node:assert/strict";
import { consumeAssistantStream } from "../lib/assistant-stream";

const response = (events: unknown[]) => {
  return new Response(
    new ReadableStream({
      start(c) {
        for (const event of events) {
          c.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        }

        c.close();
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );
};

test("assistant client delivers text before completion and rejects incomplete or error streams", async () => {
  const events: string[] = [];

  await consumeAssistantStream(
    response([
      { type: "status", label: "Preparing" },
      { type: "delta", text: "Hello" },
      { type: "complete", reply: { paragraphs: ["Hello"] } },
    ]),
    (e) => {
      return events.push(e.type);
    },
  );

  assert.deepEqual(events, ["status", "delta", "complete"]);

  await assert.rejects(
    consumeAssistantStream(
      response([{ type: "delta", text: "Partial" }]),
      () => {},
    ),
    /before the answer was complete/,
  );

  await assert.rejects(
    consumeAssistantStream(
      response([{ type: "error", message: "Connection interrupted" }]),
      () => {},
    ),
    /Connection interrupted/,
  );

  await assert.rejects(
    consumeAssistantStream(
      response([{ type: "delta", text: { bad: true } }]),
      () => {},
    ),
    /invalid response event/,
  );

  await assert.rejects(
    consumeAssistantStream(new Response("{}"), () => {}),
    /could not start/,
  );
});
